from fastapi import APIRouter, HTTPException, status
from app.models.schemas import CompareRequest, CompareResponse, CompareRow, SourceCitation
from app.services.rag import rag_pipeline
from app.services.vector_store import vector_store

router = APIRouter(prefix="/papers", tags=["Comparison"])

@router.post("/compare", response_model=CompareResponse)
async def compare_papers(request: CompareRequest):
    """
    Compares two or more research papers across Dataset, Method, Model, and Results.
    Provides a structured comparison table and an AI comparison synthesis.
    """
    if len(request.paper_ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least two paper IDs are required for comparison."
        )

    # Check existence
    for pid in request.paper_ids:
        if not vector_store.get_paper(pid):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Paper with ID '{pid}' does not exist."
            )

    try:
        result = rag_pipeline.compare_papers(request.paper_ids)
        table_rows = [CompareRow(**row) for row in result["table"]]
        sources = [SourceCitation(**src) for src in result["sources"]]

        return CompareResponse(
            table=table_rows,
            ai_comparison=result["ai_comparison"],
            sources=sources
        )
    except RuntimeError as re:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(re)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error comparing papers: {str(e)}"
        )
