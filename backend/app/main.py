import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.models.schemas import HealthResponse
from app.routes.papers import router as papers_router
from app.routes.chat import router as chat_router
from app.routes.comparison import router as comparison_router
from app.services.vector_store import vector_store

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("PaperMind")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("PaperMind RAG Backend is initializing...")
    stats = vector_store.get_stats()
    logger.info(f"Loaded existing index: {stats['total_papers']} papers, {stats['total_chunks']} chunks.")
    yield
    logger.info("PaperMind RAG Backend is shutting down.")

app = FastAPI(
    title="PaperMind — AI Research Paper Assistant",
    description="Full-stack RAG Backend for Research Paper Analysis, Q&A, Summarization, and Comparison.",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [origin.strip() for origin in origins_str.split(",") if origin.strip()]

# In development allow origins including localhost:5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(papers_router)
app.include_router(chat_router)
app.include_router(comparison_router)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint to verify backend and RAG status."""
    stats = vector_store.get_stats()
    return HealthResponse(
        status="ok",
        app="PaperMind",
        rag_status=stats.get("rag_status", "Online"),
        version="1.0.0"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )
