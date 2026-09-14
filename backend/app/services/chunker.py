import re
import os
from typing import List, Dict

class TextChunker:
    """
    Chunks document text preserving document metadata and page numbers.
    Configurable chunk size and overlap.
    """

    def __init__(
        self,
        chunk_size: int = None,
        chunk_overlap: int = None
    ):
        # Read from environment variables if not provided
        self.chunk_size = chunk_size or int(os.getenv("CHUNK_SIZE", 600))
        self.chunk_overlap = chunk_overlap or int(os.getenv("CHUNK_OVERLAP", 100))
        
        if self.chunk_overlap >= self.chunk_size:
            self.chunk_overlap = max(0, self.chunk_size // 5)

    def _split_text(self, text: str) -> List[str]:
        """
        Splits a block of text into chunks of roughly self.chunk_size
        with self.chunk_overlap, attempting to split at sentence or paragraph boundaries.
        """
        if len(text) <= self.chunk_size:
            return [text]

        chunks = []
        start = 0
        text_length = len(text)

        while start < text_length:
            end = start + self.chunk_size

            if end >= text_length:
                chunks.append(text[start:].strip())
                break

            # Try to break cleanly at paragraph break, sentence end, or punctuation
            sub = text[start:end]
            break_point = -1

            # Check for double newline (paragraph boundary)
            para_pos = sub.rfind("\n\n")
            if para_pos > self.chunk_size * 0.5:
                break_point = para_pos + 2
            else:
                # Check for sentence endings: . ! ? followed by space or newline
                sentence_matches = list(re.finditer(r'[\.\!\?]\s', sub))
                if sentence_matches:
                    last_match = sentence_matches[-1]
                    if last_match.end() > self.chunk_size * 0.4:
                        break_point = last_match.end()
                
                # If no sentence break found, try single newline
                if break_point == -1:
                    newline_pos = sub.rfind("\n")
                    if newline_pos > self.chunk_size * 0.4:
                        break_point = newline_pos + 1

                # If still none, try space
                if break_point == -1:
                    space_pos = sub.rfind(" ")
                    if space_pos > self.chunk_size * 0.3:
                        break_point = space_pos + 1

            # Fallback to hard cut if no suitable delimiter found
            if break_point == -1:
                break_point = self.chunk_size

            chunk = text[start:start + break_point].strip()
            if chunk:
                chunks.append(chunk)

            # Move forward accounting for overlap
            step = break_point - self.chunk_overlap
            if step <= 0:
                step = break_point  # Prevent infinite loop
            start += step

        return chunks

    def chunk_paper(
        self,
        paper_id: str,
        filename: str,
        pages_data: List[Dict[str, any]]
    ) -> List[Dict[str, any]]:
        """
        Chunks the extracted text of a research paper page by page.
        
        Args:
            paper_id: Unique identifier for the paper.
            filename: Original PDF filename.
            pages_data: List of dicts with 'page' and 'text'.
            
        Returns:
            List of chunk dicts with chunk_id, paper_id, filename, page, and text.
        """
        all_chunks = []
        global_chunk_index = 0

        for page_info in pages_data:
            page_num = page_info["page"]
            page_text = page_info["text"]

            page_chunks = self._split_text(page_text)
            for chunk_str in page_chunks:
                if not chunk_str:
                    continue
                global_chunk_index += 1
                chunk_obj = {
                    "chunk_id": f"{paper_id}_p{page_num}_c{global_chunk_index}",
                    "paper_id": paper_id,
                    "filename": filename,
                    "page": page_num,
                    "text": chunk_str
                }
                all_chunks.append(chunk_obj)

        return all_chunks
