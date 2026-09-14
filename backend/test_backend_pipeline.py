import sys
import os
import pymupdf as fitz
import numpy as np

# Ensure app package is findable
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.pdf_processor import PDFProcessor
from app.services.chunker import TextChunker
from app.services.embeddings import embedding_service
from app.services.vector_store import vector_store
from app.services.rag import rag_pipeline
from app.services.llm import llm_service

def create_sample_paper(filepath: str, title: str, dataset_name: str, model_name: str, accuracy_str: str):
    """Creates a realistic multi-page PDF research paper for testing."""
    doc = fitz.open()

    # Page 1: Title, Abstract, Problem, Objective
    page1 = doc.new_page()
    text1 = f"""
Research Paper: {title}
Authors: Research Team A, DeepMind & Partner Labs
Published: 2024

1. Abstract
This paper addresses high-accuracy automated visual identification in agricultural diagnostics.
We formulate an end-to-end framework capable of real-time multi-spectral feature classification.

2. Research Problem
Early diagnosis of leaf blight remains a critical challenge for crop yields globally. Manual visual
inspection is subjective, error-prone, and time-intensive across large farms.

3. Objective
The primary objective of this work is to establish a lightweight and resilient deep neural architecture
that achieves state-of-the-art diagnostic performance under varying illumination and noise.
"""
    page1.insert_text((50, 50), text1, fontsize=11)

    # Page 2: Dataset, Methodology, Model
    page2 = doc.new_page()
    text2 = f"""
4. Dataset
Experiments were conducted using the {dataset_name} benchmark dataset containing 54,306 images
spanning 14 crop species and 38 disease categories. All images were pre-processed with color balance
and random horizontal flips for data augmentation.

5. Methodology
We propose a staged transfer learning methodology with multi-scale feature pyramids.
Images are passed through specialized convolutional blocks with residual skip connections.

6. Model / Algorithm
The core model architecture implemented is {model_name} initialized with pre-trained weights.
We employ the AdamW optimizer with cosine learning rate decay and a cross-entropy loss function.
"""
    page2.insert_text((50, 50), text2, fontsize=11)

    # Page 3: Results, Limitations, Conclusion
    page3 = doc.new_page()
    text3 = f"""
7. Results
The proposed {model_name} achieved a top-1 test classification accuracy of {accuracy_str}
and an F1-score of 0.93. The inference latency was measured at 14.2 milliseconds per frame on an edge device.

8. Limitations
A key limitation of the current study is the reliance on laboratory-controlled lighting in part of
the benchmark dataset. Further testing under natural weather variations is necessary.

9. Conclusion
In conclusion, {title} establishes that {model_name} trained on {dataset_name} provides robust,
high-precision automated classification suitable for field deployment. Future work includes
deploying on drones and mobile devices.
"""
    page3.insert_text((50, 50), text3, fontsize=11)

    doc.save(filepath)
    doc.close()
    print(f"Generated test PDF: {filepath}")

def run_verification():
    print("=== Starting PaperMind Backend Verification ===")
    
    test_pdf_path = os.path.abspath("test_crop_paper.pdf")
    create_sample_paper(
        filepath=test_pdf_path,
        title="Deep Neural Networks for Crop Disease Identification",
        dataset_name="PlantVillage",
        model_name="ResNet-50",
        accuracy_str="94.6%"
    )

    # 1. Test PDFProcessor
    print("\n1. Testing PDFProcessor...")
    pages_data, total_pages = PDFProcessor.extract_text_from_file(test_pdf_path)
    print(f"-> Extracted {len(pages_data)} pages, total_pages={total_pages}")
    assert total_pages == 3, f"Expected 3 pages, got {total_pages}"
    assert "PlantVillage" in pages_data[1]["text"], "Expected PlantVillage in page 2 text"
    print("[OK] PDFProcessor successfully extracted text and preserved page numbers.")

    # 2. Test TextChunker
    print("\n2. Testing TextChunker...")
    chunker = TextChunker(chunk_size=400, chunk_overlap=80)
    chunks = chunker.chunk_paper(
        paper_id="test001",
        filename="test_crop_paper.pdf",
        pages_data=pages_data
    )
    print(f"-> Created {len(chunks)} chunks.")
    assert len(chunks) > 0, "Expected at least 1 chunk"
    assert chunks[0]["paper_id"] == "test001"
    assert chunks[0]["page"] == 1
    print("[OK] TextChunker successfully generated metadata-preserving chunks.")

    # 3. Test EmbeddingService
    print("\n3. Testing EmbeddingService (all-MiniLM-L6-v2)...")
    texts = [c["text"] for c in chunks]
    embeddings = embedding_service.embed_batch(texts)
    print(f"-> Embeddings shape: {embeddings.shape}")
    assert embeddings.shape == (len(chunks), 384), f"Unexpected embedding shape: {embeddings.shape}"
    print("[OK] EmbeddingService loaded model and produced 384-d normalized vectors.")

    # 4. Test VectorStore FAISS
    print("\n4. Testing FAISS Vector Store...")
    paper_info = {
        "id": "test001",
        "filename": "test_crop_paper.pdf",
        "pages": total_pages,
        "chunks": len(chunks),
        "upload_date": "2026-09-10T10:00:00Z",
        "file_size": os.path.getsize(test_pdf_path)
    }
    vector_store.add_paper_data(paper_info, chunks, embeddings)
    
    # Query FAISS
    q_vec = embedding_service.embed_text("What dataset was used for training?")
    results = vector_store.search(q_vec, top_k=3)
    print(f"-> Top search result: Document '{results[0]['filename']}', Page {results[0]['page']}")
    print(f"-> Snippet: {results[0]['text'][:100]}...")
    assert any("PlantVillage" in r["text"] for r in results), "Expected PlantVillage in top results"
    print("[OK] FAISS Vector Store indexed vectors and retrieved relevant chunks with cosine similarity.")

    # 5. Test RAG Pipeline retrieval & prompt
    print("\n5. Testing RAG Pipeline Q&A...")
    answer, sources = rag_pipeline.answer_question("What dataset was used?")
    print(f"-> Sources returned: {sources}")
    print(f"-> Answer: {answer}")
    assert len(sources) > 0, "Expected at least one source citation"
    print("[OK] RAG Pipeline retrieved sources and generated answer.")

    # 6. Cleanup test paper
    print("\n6. Testing Paper Deletion from FAISS and metadata...")
    deleted = vector_store.delete_paper("test001")
    assert deleted is True, "Failed to delete test paper"
    print(f"-> Papers remaining: {len(vector_store.get_all_papers())}")
    print("[OK] Paper deletion and FAISS index rebuild verified.")

    # Clean up file
    if os.path.exists(test_pdf_path):
        os.remove(test_pdf_path)

    print("\n=== ALL BACKEND TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_verification()
