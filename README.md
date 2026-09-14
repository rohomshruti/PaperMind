# PaperMind — AI Research Paper Assistant

PaperMind is a real full-stack Retrieval-Augmented Generation (RAG) web application engineered to help researchers, students, and engineers rapidly digest, analyze, query, and compare academic research papers. Users can upload multiple PDF research papers, index their contents into a local vector database, ask nuanced questions with page-accurate citations, generate 8-section structured summaries, and perform multi-paper comparative analysis.

---

## Problem Statement

Reading and cross-referencing multiple academic papers is time-consuming and cognitively demanding. Researchers often need answers to specific questions across several papers—such as *"Which dataset was used?"*, *"What model architecture was proposed?"*, or *"What accuracy did they report compared to Paper B?"*. Traditional keyword search fails to capture semantic meaning, while standard LLMs suffer from hallucinations and lack grounding in the specific papers you are studying.

**PaperMind solves this by implementing a genuine local RAG pipeline**:
- Ingests multiple PDF papers without sending entire documents to an LLM.
- Chunks text while strictly preserving document IDs and page numbers.
- Computes high-dimensional semantic embeddings locally using `sentence-transformers/all-MiniLM-L6-v2`.
- Performs similarity search using a persistent local FAISS vector index.
- Grounded generation with Google Gemini with strict anti-hallucination prompts and source citations.

---

## Key Features

- 📑 **Multi-PDF Upload & Processing**: Batch upload research papers with real-time text extraction (via PyMuPDF) and chunk-indexing status indicators.
- 🔍 **Real RAG Chat**: Conversational interface with session history, suggested sample questions, and page-level source citations (`📄 paper.pdf — Page X`).
- 🎯 **Paper-Specific or Multi-Paper Filtering**: Query across all uploaded papers simultaneously or isolate the context to a single document.
- 📋 **Structured 8-Section Summary**: Automatically generates comprehensive breakdowns (Research Problem, Objective, Dataset, Methodology, Model / Algorithm, Results, Limitations, Conclusion).
- ⚖️ **Multi-Paper Comparison**: Side-by-side comparison matrix (Paper | Dataset | Method | Model | Result) plus an AI synthesized comparative narrative.
- 📊 **Simple Dashboard**: Immediate overview of Total Papers, Total Chunks, Questions Asked, and RAG status.
- 💾 **Local Persistence**: Vector index and metadata are saved locally on disk, ensuring data persists across application restarts.
- 🎨 **Student-Project-Appropriate Clean UI**: Built exclusively with plain CSS (CSS variables, Flexbox, Grid) — zero heavy CSS frameworks.

---

## Tech Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: JavaScript (ES Modules)
- **Styling**: Plain CSS (`index.css`, modular component stylesheets, CSS variables)
- **HTTP Client**: Axios
- **Icons**: React Icons (Lucide)
- **Strictly No**: Tailwind CSS, Bootstrap, Material UI, Chakra UI, or any CSS framework.

### Backend
- **Language**: Python 3.11
- **Web Framework**: FastAPI & Uvicorn
- **Data Validation**: Pydantic v2
- **PDF Extraction**: PyMuPDF (`fitz`)
- **Text Chunking**: Configurable character chunker with paragraph and sentence boundary preservation
- **Embeddings**: `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors)
- **Vector Database**: FAISS (`faiss-cpu`) with Inner Product / Cosine Similarity
- **LLM**: Google Gemini API via `google-generativeai`
- **Configuration**: `python-dotenv`
- **Metadata**: JSON persistence (No SQL database required)

---

## RAG Architecture

```
Research Paper PDFs
        ↓
PyMuPDF Text Extraction (Page-by-page)
        ↓
Text Chunking (Size: 600 chars, Overlap: 100 chars, Preserves Page #)
        ↓
Sentence Transformer Embeddings (all-MiniLM-L6-v2)
        ↓
FAISS Vector Database (Saved locally to disk)
        ↓
User Question
        ↓
Question Embedding (all-MiniLM-L6-v2)
        ↓
FAISS Similarity Search (Top-k Chunks)
        ↓
Relevant Context Chunks + Citation Metadata
        ↓
Gemini LLM (Prompt with strict grounding instruction)
        ↓
Answer + Page-Level Sources
```

### How RAG Works in Beginner-Friendly Terms
1. **Document Ingestion**: When you upload a PDF, PyMuPDF opens each page, extracts the text, and associates it with its exact page number.
2. **Chunking**: Long academic papers are divided into smaller, bite-sized passages (~600 characters) while keeping paragraph and sentence boundaries intact. Each chunk remembers which paper and page it came from.
3. **Embedding**: An open-source neural network (`all-MiniLM-L6-v2`) converts each text chunk into an array of 384 numbers (an embedding vector) that captures its semantic meaning.
4. **Vector Storage (FAISS)**: These numbers are indexed into a FAISS vector index on disk.
5. **Retrieval**: When you ask *"What dataset was used?"*, PaperMind converts your query into an embedding vector and finds the closest chunks in FAISS using cosine similarity.
6. **Augmented Generation**: The retrieved chunks and their page numbers are provided to Gemini with a strict system instruction: *"Answer using ONLY this context. If not present, state that you could not find the information."*
7. **Citations**: The system returns the generated answer alongside verifiable citations (`paper.pdf — Page 5`).

---

## Project Structure

```
PaperMind/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI entry point, CORS, and health check
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── papers.py            # Upload, list, delete, summary, stats
│   │   │   ├── chat.py              # RAG Q&A endpoint
│   │   │   └── comparison.py        # Multi-paper comparative analysis
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── pdf_processor.py     # PyMuPDF text extraction per page
│   │   │   ├── chunker.py           # Text chunker preserving page metadata
│   │   │   ├── embeddings.py        # Singleton all-MiniLM-L6-v2 service
│   │   │   ├── vector_store.py      # Local FAISS index & metadata storage
│   │   │   ├── rag.py               # RAG pipeline orchestration
│   │   │   └── llm.py               # Gemini API wrapper with strict prompts
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py           # Pydantic request & response models
│   │   └── data/                    # Persistent local storage (auto-created)
│   │       ├── uploads/             # Stored PDF papers
│   │       ├── faiss/               # index.faiss file
│   │       └── metadata/            # papers.json, chunks.json, stats.json
│   ├── requirements.txt
│   ├── .env.example
│   └── .env                         # API keys & config (git ignored)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx / Navbar.css
│   │   │   ├── Sidebar.jsx / Sidebar.css
│   │   │   ├── Dashboard.jsx / Dashboard.css
│   │   │   ├── UploadZone.jsx / UploadZone.css
│   │   │   ├── PaperList.jsx / PaperList.css
│   │   │   ├── Chat.jsx / Chat.css
│   │   │   ├── ChatMessage.jsx / ChatMessage.css
│   │   │   ├── SourceCard.jsx / SourceCard.css
│   │   │   ├── Summary.jsx / Summary.css
│   │   │   └── Comparison.jsx / Comparison.css
│   │   ├── services/
│   │   │   └── api.js               # Axios client
│   │   ├── App.jsx / App.css
│   │   ├── index.css                # Plain CSS variables and design system
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── README.md
└── .gitignore
```

---

## Environment Variables

In `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=8000
HOST=127.0.0.1
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CHUNK_SIZE=600
CHUNK_OVERLAP=100
```

> **Note**: Obtain a free Gemini API key from [Google AI Studio](https://aistudio.google.com/). If `GEMINI_API_KEY` is not provided, the UI displays an informative alert reminding you to configure your key.

---

## Installation & Running (Windows PowerShell)

### Step 1: Clone or Navigate to the Project
```powershell
cd PaperMind
```

### Step 2: Set Up and Start Backend
Open a PowerShell terminal:

```powershell
cd backend

python -m venv .venv

.venv\Scripts\activate

python -m pip install -r requirements.txt

# Copy example environment file and add your GEMINI_API_KEY
Copy-Item .env.example .env

# Run FastAPI with Uvicorn
python -m uvicorn app.main:app --reload
```

- **Backend URL**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **Health Check**: `http://127.0.0.1:8000/health`

### Step 3: Set Up and Start Frontend
Open **another PowerShell terminal**:

```powershell
cd frontend

npm install

npm run dev
```

- **Frontend URL**: `http://127.0.0.1:5173`

---

## API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Check backend & RAG pipeline operational status |
| `GET` | `/papers/stats/dashboard` | Returns total papers, total chunks, questions asked, and RAG status |
| `POST` | `/papers/upload` | Upload one or multiple PDF files (`multipart/form-data`) |
| `GET` | `/papers` | List all indexed research papers with pages and chunk counts |
| `DELETE` | `/papers/{paper_id}` | Delete a paper, rebuild FAISS index, and clean metadata |
| `POST` | `/chat` | RAG Q&A with conversational history and source citations |
| `POST` | `/papers/{paper_id}/summary` | Generate 8-section structured breakdown for a paper |
| `POST` | `/papers/compare` | Multi-paper comparison matrix and synthesized AI analysis |

---

## Example Questions to Try in Chat

- *"What dataset was used for training and evaluation?"*
- *"What methodology was proposed?"*
- *"Which model architecture was implemented?"*
- *"What accuracy or evaluation metrics were achieved?"*
- *"What are the limitations mentioned by the authors?"*
- *"What problem does the paper aim to solve?"*
- *"What future work was suggested in the conclusion?"*
- *"Compare the methodologies of the uploaded papers."*

---

## Future Improvements

- **Hybrid Search**: Combine BM25 keyword matching with dense FAISS vectors for improved retrieval of exact chemical formulas or dataset acronyms.
- **OCR Integration**: Add Tesseract OCR for scanned PDF papers without an embedded text layer.
- **PDF Viewer with Highlighting**: Integrated PDF viewer that scrolls to and highlights the cited passage upon clicking a source card.
- **Export Reports**: Download summary and comparison matrices as Markdown or PDF reports.
