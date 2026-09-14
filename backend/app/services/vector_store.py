import os
import json
import logging
from typing import List, Dict, Optional, Any
import numpy as np
import faiss

logger = logging.getLogger(__name__)

# Base directory for data
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
FAISS_DIR = os.path.join(DATA_DIR, "faiss")
METADATA_DIR = os.path.join(DATA_DIR, "metadata")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")

FAISS_INDEX_PATH = os.path.join(FAISS_DIR, "index.faiss")
CHUNKS_METADATA_PATH = os.path.join(METADATA_DIR, "chunks.json")
PAPERS_METADATA_PATH = os.path.join(METADATA_DIR, "papers.json")
STATS_PATH = os.path.join(METADATA_DIR, "stats.json")

DIMENSION = 384  # all-MiniLM-L6-v2 embedding dimension

class VectorStore:
    """
    Manages the FAISS vector index and metadata storage for PaperMind.
    Provides local persistence so restarting the application retains all data.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(VectorStore, cls).__new__(cls)
            cls._instance._init_store()
        return cls._instance

    def _init_store(self):
        os.makedirs(FAISS_DIR, exist_ok=True)
        os.makedirs(METADATA_DIR, exist_ok=True)
        os.makedirs(UPLOADS_DIR, exist_ok=True)

        self.index: Optional[faiss.Index] = None
        self.chunks: List[Dict[str, Any]] = []
        self.papers: Dict[str, Dict[str, Any]] = {}
        self.questions_asked: int = 0

        self._load_from_disk()

    def _load_from_disk(self):
        """Loads FAISS index and metadata files if they exist on disk."""
        # Load papers
        if os.path.exists(PAPERS_METADATA_PATH):
            try:
                with open(PAPERS_METADATA_PATH, "r", encoding="utf-8") as f:
                    self.papers = json.load(f)
                logger.info(f"Loaded {len(self.papers)} papers from {PAPERS_METADATA_PATH}")
            except Exception as e:
                logger.error(f"Error loading papers metadata: {e}")
                self.papers = {}
        else:
            self.papers = {}

        # Load chunks
        if os.path.exists(CHUNKS_METADATA_PATH):
            try:
                with open(CHUNKS_METADATA_PATH, "r", encoding="utf-8") as f:
                    self.chunks = json.load(f)
                logger.info(f"Loaded {len(self.chunks)} chunks from {CHUNKS_METADATA_PATH}")
            except Exception as e:
                logger.error(f"Error loading chunks metadata: {e}")
                self.chunks = []
        else:
            self.chunks = []

        # Load stats
        if os.path.exists(STATS_PATH):
            try:
                with open(STATS_PATH, "r", encoding="utf-8") as f:
                    stats_data = json.load(f)
                    self.questions_asked = stats_data.get("questions_asked", 0)
            except Exception as e:
                logger.error(f"Error loading stats: {e}")
                self.questions_asked = 0

        # Load FAISS index
        if os.path.exists(FAISS_INDEX_PATH) and len(self.chunks) > 0:
            try:
                self.index = faiss.read_index(FAISS_INDEX_PATH)
                logger.info(f"Loaded FAISS index with {self.index.ntotal} vectors.")
            except Exception as e:
                logger.error(f"Error reading FAISS index: {e}. Reinitializing empty index.")
                self.index = faiss.IndexFlatIP(DIMENSION)
        else:
            self.index = faiss.IndexFlatIP(DIMENSION)

    def _save_to_disk(self):
        """Persists FAISS index and metadata files to disk."""
        try:
            # Save papers
            with open(PAPERS_METADATA_PATH, "w", encoding="utf-8") as f:
                json.dump(self.papers, f, indent=2, ensure_ascii=False)

            # Save chunks
            with open(CHUNKS_METADATA_PATH, "w", encoding="utf-8") as f:
                json.dump(self.chunks, f, indent=2, ensure_ascii=False)

            # Save stats
            with open(STATS_PATH, "w", encoding="utf-8") as f:
                json.dump({"questions_asked": self.questions_asked}, f, indent=2)

            # Save FAISS index
            if self.index is not None:
                faiss.write_index(self.index, FAISS_INDEX_PATH)
            logger.info("Successfully persisted vector store and metadata to disk.")
        except Exception as e:
            logger.error(f"Failed to persist vector store to disk: {e}")
            raise

    def add_paper_data(
        self,
        paper_info: Dict[str, Any],
        chunks: List[Dict[str, Any]],
        embeddings: np.ndarray
    ):
        """
        Adds paper metadata, chunk metadata, and embedding vectors into the FAISS index.
        """
        if embeddings.shape[0] != len(chunks):
            raise ValueError(f"Mismatch: {embeddings.shape[0]} embeddings for {len(chunks)} chunks")

        # Save to papers dictionary
        self.papers[paper_info["id"]] = paper_info

        # Add vectors to FAISS
        if self.index is None:
            self.index = faiss.IndexFlatIP(DIMENSION)

        # FAISS requires float32 contiguous array
        vectors = np.ascontiguousarray(embeddings, dtype=np.float32)
        self.index.add(vectors)

        # Append chunks
        self.chunks.extend(chunks)

        # Persist to disk
        self._save_to_disk()
        logger.info(f"Added paper {paper_info['filename']} with {len(chunks)} chunks. Index total: {self.index.ntotal}")

    def search(
        self,
        query_vector: np.ndarray,
        top_k: int = 5,
        paper_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Searches FAISS for the most similar chunks.
        Supports filtering by specific paper_ids.
        """
        if self.index is None or self.index.ntotal == 0 or len(self.chunks) == 0:
            return []

        # Prepare query vector
        q_vec = np.ascontiguousarray(query_vector.reshape(1, -1), dtype=np.float32)

        # If filtering is required, search more candidate chunks to ensure top_k after filter
        fetch_k = min(self.index.ntotal, top_k * 5 if paper_ids else top_k)
        scores, indices = self.index.search(q_vec, fetch_k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.chunks):
                continue
            chunk = self.chunks[idx]
            if paper_ids and chunk.get("paper_id") not in paper_ids:
                continue

            results.append({
                **chunk,
                "score": float(score)
            })

            if len(results) >= top_k:
                break

        return results

    def get_chunks_by_paper(self, paper_id: str) -> List[Dict[str, Any]]:
        """Returns all chunks belonging to a specific paper."""
        return [c for c in self.chunks if c.get("paper_id") == paper_id]

    def get_paper(self, paper_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves metadata for a paper by ID."""
        return self.papers.get(paper_id)

    def get_all_papers(self) -> List[Dict[str, Any]]:
        """Returns a list of all indexed papers."""
        return list(self.papers.values())

    def delete_paper(self, paper_id: str) -> bool:
        """
        Deletes a paper, removes its PDF and chunks, rebuilds FAISS index,
        and saves updated state to disk.
        """
        if paper_id not in self.papers:
            return False

        paper_info = self.papers[paper_id]
        filename = paper_info.get("filename")

        # 1. Remove PDF from uploads directory
        if filename:
            pdf_path = os.path.join(UPLOADS_DIR, f"{paper_id}_{filename}")
            if os.path.exists(pdf_path):
                try:
                    os.remove(pdf_path)
                except Exception as e:
                    logger.warning(f"Could not remove PDF file {pdf_path}: {e}")

        # 2. Filter remaining chunks
        remaining_chunks = [c for c in self.chunks if c.get("paper_id") != paper_id]

        # 3. Delete from papers metadata
        del self.papers[paper_id]

        # 4. Rebuild FAISS index from remaining chunks
        self.chunks = remaining_chunks
        self.index = faiss.IndexFlatIP(DIMENSION)

        if len(self.chunks) > 0:
            from app.services.embeddings import embedding_service
            chunk_texts = [c["text"] for c in self.chunks]
            new_embeddings = embedding_service.embed_batch(chunk_texts)
            vectors = np.ascontiguousarray(new_embeddings, dtype=np.float32)
            self.index.add(vectors)

        # 5. Save changes
        self._save_to_disk()
        logger.info(f"Deleted paper {paper_id} ({filename}). Remaining papers: {len(self.papers)}")
        return True

    def increment_questions_asked(self):
        """Increments the count of questions asked for dashboard statistics."""
        self.questions_asked += 1
        try:
            with open(STATS_PATH, "w", encoding="utf-8") as f:
                json.dump({"questions_asked": self.questions_asked}, f, indent=2)
        except Exception:
            pass

    def get_stats(self) -> Dict[str, Any]:
        """Returns dashboard metrics."""
        return {
            "total_papers": len(self.papers),
            "total_chunks": len(self.chunks),
            "questions_asked": self.questions_asked,
            "rag_status": "Online" if self.index is not None else "Ready"
        }

# Global vector store instance
vector_store = VectorStore()
