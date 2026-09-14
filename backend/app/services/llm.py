import os
import logging
from typing import List, Dict, Optional
import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a research paper assistant. Answer the user's question using only the "
    "provided research-paper context. Do not invent facts. If the requested information "
    "is not present in the context, say that the information could not be found in the "
    "uploaded research papers."
)

class LLMService:
    """
    Service wrapper for Google Gemini REST API.
    Uses pure HTTP requests to avoid native grpc DLL / Windows AppLocker conflicts.
    Default model: gemini-3.6-flash.
    """

    def __init__(self):
        self._api_key = None
        self._model_name = os.getenv("GEMINI_MODEL", "gemini-3.6-flash").strip()
        self._refresh_key()

    def _refresh_key(self):
        # Always reload from environment / .env
        load_dotenv(override=True)
        self._api_key = os.getenv("GEMINI_API_KEY", "").strip()

    def is_configured(self) -> bool:
        """Returns True if a non-empty API key is present."""
        self._refresh_key()
        return bool(self._api_key)

    def _call_gemini(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Helper to invoke Gemini via Google Generative Language v1beta REST API."""
        self._refresh_key()
        if not self._api_key:
            return "Gemini API key is not configured. Please add your GEMINI_API_KEY in backend/.env to enable AI answers."

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self._model_name}:generateContent?key={self._api_key}"
        
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2
            }
        }
        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        try:
            resp = requests.post(url, json=payload, timeout=45)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
                return "I could not find this information in the uploaded research papers."

            # Handle errors from Google API
            err_data = resp.json().get("error", {})
            err_msg = err_data.get("message", resp.text)
            err_code = err_data.get("code", resp.status_code)
            logger.error(f"Gemini API returned error {err_code}: {err_msg}")

            if "API_KEY_INVALID" in err_msg or err_code == 400:
                return "Invalid Gemini API Key. Please verify your GEMINI_API_KEY in backend/.env."
            elif "RESOURCE_EXHAUSTED" in err_msg or err_code == 429:
                return "Gemini API quota exceeded. Please try again in a few moments."
            elif err_code == 404:
                return f"Gemini model '{self._model_name}' not available. Please verify model name."
            return f"Gemini API error: {err_msg}"

        except requests.RequestException as req_err:
            logger.error(f"Network error contacting Gemini API: {req_err}")
            return f"Network error communicating with Gemini AI: {str(req_err)}"
        except Exception as e:
            logger.error(f"Unexpected error in Gemini service: {e}")
            return f"Error communicating with Gemini AI: {str(e)}"

    def generate_rag_answer(
        self,
        question: str,
        context_text: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Generates an answer to a question using the retrieved research paper context.
        """
        if not self.is_configured():
            return (
                "Gemini API key is not configured. Please add your GEMINI_API_KEY in backend/.env "
                "to enable AI answers."
            )

        if not context_text or not context_text.strip():
            return "I could not find this information in the uploaded research papers."

        # Format conversational context
        history_str = ""
        if conversation_history:
            recent_turns = conversation_history[-4:]
            formatted_turns = []
            for msg in recent_turns:
                role = "User" if msg.get("role") == "user" else "Assistant"
                formatted_turns.append(f"{role}: {msg.get('content', '')}")
            if formatted_turns:
                history_str = "Conversation history:\n" + "\n".join(formatted_turns) + "\n\n"

        prompt = (
            f"{history_str}"
            f"Research Paper Context:\n{context_text}\n\n"
            f"User Question: {question}\n\n"
            "Instructions:\n"
            "- Answer using strictly the research paper context provided above.\n"
            "- Do not extrapolate or hallucinate facts.\n"
            "- If the context does not contain the answer, reply exactly:\n"
            "'I could not find this information in the uploaded research papers.'"
        )

        return self._call_gemini(prompt=prompt, system_instruction=SYSTEM_PROMPT)

    def generate_structured_content(self, prompt: str) -> str:
        """
        Generates raw response from Gemini for custom prompts (e.g. summary or comparison).
        """
        if not self.is_configured():
            return "Gemini API key is not configured in backend/.env."

        return self._call_gemini(prompt=prompt)

# Global LLM instance
llm_service = LLMService()
