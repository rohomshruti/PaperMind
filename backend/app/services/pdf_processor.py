import pymupdf as fitz  # PyMuPDF
from typing import List, Dict, Tuple
import os

class PDFProcessingError(Exception):
    """Custom exception raised when a PDF cannot be processed."""
    pass

class PDFProcessor:
    """Extracts text from PDF documents using PyMuPDF while preserving page numbers."""

    @staticmethod
    def extract_text_from_file(file_path: str) -> Tuple[List[Dict[str, any]], int]:
        """
        Extracts text from a saved PDF file on disk.
        
        Args:
            file_path: Absolute or relative path to the PDF file.
            
        Returns:
            Tuple of (pages_data, total_pages) where pages_data is a list of
            dicts with 'page' (1-indexed int) and 'text' (cleaned string).
            
        Raises:
            PDFProcessingError: If the file is invalid, empty, or unreadable.
        """
        if not os.path.exists(file_path):
            raise PDFProcessingError(f"PDF file not found: {file_path}")

        try:
            doc = fitz.open(file_path)
        except Exception as e:
            raise PDFProcessingError(f"Failed to open PDF document. It may be corrupt or encrypted: {str(e)}")

        try:
            total_pages = len(doc)
            if total_pages == 0:
                raise PDFProcessingError("The uploaded PDF has 0 pages.")

            pages_data = []
            total_extracted_chars = 0

            for page_index in range(total_pages):
                page_number = page_index + 1
                page = doc[page_index]
                page_text = page.get_text("text") or ""
                
                # Clean whitespace but preserve layout readability
                cleaned_text = page_text.strip()
                if cleaned_text:
                    total_extracted_chars += len(cleaned_text)
                    pages_data.append({
                        "page": page_number,
                        "text": cleaned_text
                    })

            if total_extracted_chars == 0:
                raise PDFProcessingError(
                    "The PDF does not contain extractable digital text. "
                    "It may consist of scanned images without OCR."
                )

            return pages_data, total_pages

        finally:
            doc.close()
