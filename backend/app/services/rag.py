import json
import logging
import re
from typing import List, Dict, Tuple, Optional, Any

from app.services.embeddings import embedding_service
from app.services.vector_store import vector_store
from app.services.llm import llm_service

logger = logging.getLogger(__name__)

class RAGPipeline:
    """
    Coordinates Embedding, FAISS Vector Retrieval, and Gemini LLM Generation.
    Provides Q&A, Paper Summarization, and Multi-Paper Comparison.
    """

    def answer_question(
        self,
        question: str,
        history: Optional[List[Dict[str, str]]] = None,
        paper_ids: Optional[List[str]] = None
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Executes real RAG for a user question.
        Returns (answer_string, list_of_sources).
        """
        # 1. Embed user query
        query_vec = embedding_service.embed_text(question)

        # 2. Retrieve top-k relevant chunks
        top_k = 5
        retrieved_chunks = vector_store.search(query_vec, top_k=top_k, paper_ids=paper_ids)

        if not retrieved_chunks:
            return (
                "I could not find this information in the uploaded research papers.",
                []
            )

        # 3. Format context string
        context_parts = []
        sources_seen = set()
        sources = []

        for chunk in retrieved_chunks:
            paper_name = chunk.get("filename", "Unknown")
            page_num = chunk.get("page", 1)
            chunk_text = chunk.get("text", "").strip()

            context_parts.append(
                f"[Source: {paper_name}, Page: {page_num}]\n{chunk_text}"
            )

            src_key = (paper_name, page_num)
            if src_key not in sources_seen:
                sources_seen.add(src_key)
                sources.append({"paper": paper_name, "page": page_num})

        context_str = "\n\n---\n\n".join(context_parts)

        # 4. Generate answer with Gemini
        answer = llm_service.generate_rag_answer(
            question=question,
            context_text=context_str,
            conversation_history=history
        )

        # 5. Track metric
        vector_store.increment_questions_asked()

        return answer, sources

    def generate_paper_summary(self, paper_id: str) -> Dict[str, Any]:
        """
        Generates an 8-section structured summary for a specific paper using RAG context.
        """
        paper_info = vector_store.get_paper(paper_id)
        if not paper_info:
            raise ValueError(f"Paper with ID '{paper_id}' not found.")

        filename = paper_info.get("filename", "Paper")
        paper_chunks = vector_store.get_chunks_by_paper(paper_id)

        if not paper_chunks:
            raise ValueError(f"No indexed text found for paper '{filename}'.")

        # Gather relevant chunks across key sections (intro, method, results, conclusion)
        # Using targeted queries to retrieve relevant chunks for each section
        target_queries = [
            "research problem background introduction",
            "objective goal purpose",
            "dataset benchmark data collection",
            "methodology approach proposed method framework",
            "model architecture algorithm technique",
            "results evaluation performance metrics accuracy",
            "limitations challenges assumptions future work",
            "conclusion summary findings"
        ]

        collected_chunks = []
        collected_ids = set()
        sources_seen = set()
        sources = []

        for q in target_queries:
            q_vec = embedding_service.embed_text(q)
            results = vector_store.search(q_vec, top_k=2, paper_ids=[paper_id])
            for r in results:
                cid = r.get("chunk_id")
                if cid not in collected_ids:
                    collected_ids.add(cid)
                    collected_chunks.append(r)
                    src_key = (r.get("filename"), r.get("page"))
                    if src_key not in sources_seen:
                        sources_seen.add(src_key)
                        sources.append({"paper": r.get("filename"), "page": r.get("page")})

        # Also include the very first 2 chunks (usually abstract/intro) and last chunk
        if len(paper_chunks) > 0:
            for c in paper_chunks[:2]:
                if c.get("chunk_id") not in collected_ids:
                    collected_ids.add(c.get("chunk_id"))
                    collected_chunks.append(c)
                    src_key = (c.get("filename"), c.get("page"))
                    if src_key not in sources_seen:
                        sources_seen.add(src_key)
                        sources.append({"paper": c.get("filename"), "page": c.get("page")})

        context_text = "\n\n---\n\n".join([
            f"[Page {c['page']}]: {c['text']}" for c in collected_chunks
        ])

        prompt = f"""
You are an expert research assistant. Read the provided excerpt from the research paper "{filename}" and generate a structured summary.
Extract the information for each of the following 8 sections strictly based on the context:
1. Research Problem
2. Objective
3. Dataset
4. Methodology
5. Model / Algorithm
6. Results
7. Limitations
8. Conclusion

If any section's information is not mentioned in the context, write "Not found". Do not invent facts.

Context:
{context_text}

Respond in ONLY valid JSON with this exact schema:
{{
  "research_problem": "...",
  "objective": "...",
  "dataset": "...",
  "methodology": "...",
  "model_algorithm": "...",
  "results": "...",
  "limitations": "...",
  "conclusion": "..."
}}
"""
        if not llm_service.is_configured():
            raise RuntimeError(
                "Gemini API key is not configured. Please add your GEMINI_API_KEY in backend/.env to generate AI summaries."
            )

        response_text = llm_service.generate_structured_content(prompt)
        if response_text.startswith("Error") or "API key is not configured" in response_text:
            raise RuntimeError(response_text)
        
        # Parse JSON
        summary_dict = self._extract_json(response_text)
        if not summary_dict:
            summary_dict = {
                "research_problem": "Not found",
                "objective": "Not found",
                "dataset": "Not found",
                "methodology": "Not found",
                "model_algorithm": "Not found",
                "results": "Not found",
                "limitations": "Not found",
                "conclusion": "Not found"
            }

        return {
            "paper_id": paper_id,
            "filename": filename,
            "summary": summary_dict,
            "sources": sources
        }

    def compare_papers(self, paper_ids: List[str]) -> Dict[str, Any]:
        """
        Extracts key dimensions (Dataset, Method, Model, Result) for multiple papers
        and produces an AI synthesis comparing them.
        """
        if not llm_service.is_configured():
            raise RuntimeError(
                "Gemini API key is not configured. Please add your GEMINI_API_KEY in backend/.env to compare research papers."
            )

        table_rows = []
        all_sources = []
        sources_seen = set()
        papers_info = []

        for pid in paper_ids:
            paper_info = vector_store.get_paper(pid)
            if not paper_info:
                continue

            fname = paper_info.get("filename", "Unknown")
            
            # Retrieve relevant chunks for dataset, method, model, results
            query_vec = embedding_service.embed_text("dataset methodology proposed model architecture results accuracy")
            chunks = vector_store.search(query_vec, top_k=4, paper_ids=[pid])
            
            for c in chunks:
                src_key = (c.get("filename"), c.get("page"))
                if src_key not in sources_seen:
                    sources_seen.add(src_key)
                    all_sources.append({"paper": c.get("filename"), "page": c.get("page")})

            context = "\n".join([f"[Page {c['page']}]: {c['text']}" for c in chunks])

            prompt = f"""
Extract key facts from this excerpt of the paper "{fname}".
Identify:
1. Dataset (e.g., PlantVillage, ImageNet, Custom survey, etc.)
2. Method (e.g., Transfer Learning, Reinforcement Learning, Qualitative analysis, etc.)
3. Model (e.g., CNN, ResNet-50, Transformer, etc.)
4. Result (e.g., 92.5% accuracy, 0.85 F1-score, etc.)

If any information is not present in the excerpt, write "Not found". Do not guess or invent data.

Context:
{context}

Respond in ONLY valid JSON:
{{
  "dataset": "...",
  "method": "...",
  "model": "...",
  "result": "..."
}}
"""
            extracted_json = self._extract_json(llm_service.generate_structured_content(prompt))
            if not extracted_json:
                extracted_json = {
                    "dataset": "Not found",
                    "method": "Not found",
                    "model": "Not found",
                    "result": "Not found"
                }

            row = {
                "paper": fname,
                "dataset": extracted_json.get("dataset", "Not found"),
                "method": extracted_json.get("method", "Not found"),
                "model": extracted_json.get("model", "Not found"),
                "result": extracted_json.get("result", "Not found")
            }
            table_rows.append(row)
            papers_info.append(f"Paper: {fname}\n- Dataset: {row['dataset']}\n- Method: {row['method']}\n- Model: {row['model']}\n- Result: {row['result']}")

        # Generate comparative synthesis using Gemini
        papers_summary_text = "\n\n".join(papers_info)
        comparison_prompt = f"""
You are an expert research analyst. Based on the extracted factual summaries of the following uploaded research papers, write a concise, professional comparison (2-3 paragraphs).
Compare their problem areas, datasets, methodologies, models, and empirical results.
Do not invent facts beyond the provided details. If a value is 'Not found', acknowledge that it wasn't specified in the retrieved sections.

Papers details:
{papers_summary_text}

Provide a clear AI Comparison highlighting key differences, relative strengths, and performance contrasts.
"""
        ai_comparison = llm_service.generate_structured_content(comparison_prompt)
        if not ai_comparison:
            ai_comparison = "Comparison summary could not be generated."

        return {
            "table": table_rows,
            "ai_comparison": ai_comparison,
            "sources": all_sources
        }

    def _extract_json(self, text: str) -> Optional[Dict[str, Any]]:
        """Safely parses JSON from LLM output, extracting code blocks if present."""
        if not text:
            return None
        # Remove ```json ... ``` wrapper if present
        clean_text = re.sub(r"^```json\s*", "", text.strip(), flags=re.MULTILINE)
        clean_text = re.sub(r"^```\s*", "", clean_text, flags=re.MULTILINE)
        clean_text = re.sub(r"```$", "", clean_text.strip(), flags=re.MULTILINE)
        try:
            return json.loads(clean_text)
        except Exception:
            # Try to match the first JSON object
            match = re.search(r"(\{.*\})", clean_text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except Exception:
                    pass
        return None

# Global RAG Pipeline instance
rag_pipeline = RAGPipeline()
