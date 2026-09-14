import os
import uuid
import shutil
from datetime import datetime
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, status

from app.models.schemas import PaperInfo, UploadResponse, SummaryResponse, DashboardStats
from app.services.pdf_processor import PDFProcessor, PDFProcessingError
from app.services.chunker import TextChunker
from app.services.embeddings import embedding_service
from app.services.vector_store import vector_store, UPLOADS_DIR
from app.services.rag import rag_pipeline

router = APIRouter(prefix="/papers", tags=["Papers"])
chunker = TextChunker()

@router.post("/upload", response_model=UploadResponse)
async def upload_papers(files: List[UploadFile] = File(...)):
    """
    Upload one or multiple PDF research papers.
    Extracts text, preserves page numbers, chunks text, generates embeddings,
    and indexes into the FAISS vector database.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided for upload."
        )

    processed_papers: List[PaperInfo] = []
    errors = []

    for file in files:
        original_filename = file.filename or "paper.pdf"
        if not original_filename.lower().endswith(".pdf"):
            errors.append(f"'{original_filename}' is not a valid PDF file. Only .pdf files are accepted.")
            continue

        paper_id = uuid.uuid4().hex[:8]
        saved_filename = f"{paper_id}_{original_filename}"
        saved_path = os.path.join(UPLOADS_DIR, saved_filename)

        try:
            # 1. Save PDF locally
            with open(saved_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            file_size = os.path.getsize(saved_path)

            # 2. Extract text per page
            pages_data, total_pages = PDFProcessor.extract_text_from_file(saved_path)

            # 3. Chunk text preserving page and paper metadata
            chunks = chunker.chunk_paper(
                paper_id=paper_id,
                filename=original_filename,
                pages_data=pages_data
            )

            if not chunks:
                raise PDFProcessingError("No extractable chunks found in document.")

            # 4. Generate embeddings
            chunk_texts = [c["text"] for c in chunks]
            embeddings = embedding_service.embed_batch(chunk_texts)

            # 5. Store in FAISS & metadata
            upload_date = datetime.utcnow().isoformat() + "Z"
            paper_info_dict = {
                "id": paper_id,
                "filename": original_filename,
                "pages": total_pages,
                "chunks": len(chunks),
                "upload_date": upload_date,
                "file_size": file_size
            }

            vector_store.add_paper_data(
                paper_info=paper_info_dict,
                chunks=chunks,
                embeddings=embeddings
            )

            processed_papers.append(PaperInfo(**paper_info_dict))

        except PDFProcessingError as pe:
            if os.path.exists(saved_path):
                try:
                    os.remove(saved_path)
                except Exception:
                    pass
            errors.append(f"Error processing '{original_filename}': {str(pe)}")
        except Exception as e:
            if os.path.exists(saved_path):
                try:
                    os.remove(saved_path)
                except Exception:
                    pass
            errors.append(f"Unexpected error processing '{original_filename}': {str(e)}")

    if not processed_papers and errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="; ".join(errors)
        )

    msg = f"Successfully processed and indexed {len(processed_papers)} paper(s)."
    if errors:
        msg += f" (Warnings: {'; '.join(errors)})"

    return UploadResponse(
        papers=processed_papers,
        total_uploaded=len(processed_papers),
        message=msg
    )

@router.get("", response_model=List[PaperInfo])
async def list_papers():
    """Returns a list of all indexed research papers."""
    papers_data = vector_store.get_all_papers()
    return [PaperInfo(**p) for p in papers_data]

@router.delete("/{paper_id}")
async def delete_paper(paper_id: str):
    """
    Deletes a paper, removes its vectors from FAISS,
    deletes its metadata and physical PDF file.
    """
    success = vector_store.delete_paper(paper_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paper with ID '{paper_id}' not found."
        )
    return {"success": True, "message": f"Paper '{paper_id}' deleted successfully."}

@router.post("/{paper_id}/summary", response_model=SummaryResponse)
async def get_paper_summary(paper_id: str):
    """
    Generates an 8-section structured summary for a research paper
    using RAG context and Gemini LLM.
    """
    try:
        summary_result = rag_pipeline.generate_paper_summary(paper_id)
        return summary_result
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(re))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Summary generation error: {str(e)}")

@router.get("/stats/dashboard", response_model=DashboardStats)
async def get_dashboard_stats():
    """Returns metrics for the PaperMind dashboard."""
    stats = vector_store.get_stats()
    return DashboardStats(**stats)
