from fastapi import APIRouter, HTTPException, status
from app.models.schemas import ChatRequest, ChatResponse, SourceCitation
from app.services.rag import rag_pipeline
from app.services.vector_store import vector_store

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("", response_model=ChatResponse)
async def chat_with_papers(request: ChatRequest):
    """
    Asks a question about uploaded research papers using the RAG pipeline.
    Returns the generated answer based strictly on retrieved chunks along with
    page-level source citations.
    """
    if not request.question or not request.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty."
        )

    # Convert Pydantic history objects to plain dicts
    history_dicts = [m.model_dump() for m in request.history] if request.history else []

    try:
        answer, sources = rag_pipeline.answer_question(
            question=request.question.strip(),
            history=history_dicts,
            paper_ids=request.paper_ids
        )

        citation_objs = [SourceCitation(**s) for s in sources]
        return ChatResponse(answer=answer, sources=citation_objs)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error querying research papers: {str(e)}"
        )
