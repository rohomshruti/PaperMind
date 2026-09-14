from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SourceCitation(BaseModel):
    paper: str = Field(..., description="Name of the PDF paper file")
    page: int = Field(..., description="1-indexed page number of the cited content")

class PaperInfo(BaseModel):
    id: str = Field(..., description="Unique ID of the paper")
    filename: str = Field(..., description="Original PDF file name")
    pages: int = Field(..., description="Total pages in the PDF")
    chunks: int = Field(..., description="Total text chunks indexed in FAISS")
    upload_date: str = Field(..., description="ISO formatted upload timestamp")
    file_size: int = Field(..., description="File size in bytes")

class UploadResponse(BaseModel):
    papers: List[PaperInfo]
    total_uploaded: int
    message: str

class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message text")

class ChatRequest(BaseModel):
    question: str = Field(..., description="User query about papers")
    history: Optional[List[ChatMessage]] = Field(default_factory=list, description="Recent conversation history")
    paper_ids: Optional[List[str]] = Field(default=None, description="Optional list of paper IDs to restrict context")

class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]

class SummarySections(BaseModel):
    research_problem: str = Field(default="Not found", description="Core problem addressed")
    objective: str = Field(default="Not found", description="Primary goal or hypothesis")
    dataset: str = Field(default="Not found", description="Data / benchmarks used")
    methodology: str = Field(default="Not found", description="Proposed technical approach")
    model_algorithm: str = Field(default="Not found", description="Models, architectures, or algorithms used")
    results: str = Field(default="Not found", description="Key empirical findings and metrics")
    limitations: str = Field(default="Not found", description="Reported shortcomings or assumptions")
    conclusion: str = Field(default="Not found", description="Final conclusions and future work")

class SummaryResponse(BaseModel):
    paper_id: str
    filename: str
    summary: SummarySections
    sources: List[SourceCitation]

class CompareRequest(BaseModel):
    paper_ids: List[str] = Field(..., min_length=2, description="At least two paper IDs to compare")

class CompareRow(BaseModel):
    paper: str
    dataset: str
    method: str
    model: str
    result: str

class CompareResponse(BaseModel):
    table: List[CompareRow]
    ai_comparison: str
    sources: List[SourceCitation]

class DashboardStats(BaseModel):
    total_papers: int
    total_chunks: int
    questions_asked: int
    rag_status: str

class HealthResponse(BaseModel):
    status: str
    app: str
    rag_status: str
    version: str
