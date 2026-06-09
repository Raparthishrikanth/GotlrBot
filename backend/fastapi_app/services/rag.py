import os
import logging
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
import requests

from config import (
    GEMINI_API_KEY,
    OPENROUTER_API_KEY,
    LLM_PROVIDER,
    EMBEDDING_MODEL_NAME
)

logger = logging.getLogger(__name__)

# Lazy load the sentence transformer model to keep startup fast
_embedding_model = None

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        logger.info(f"Loading SentenceTransformer model: {EMBEDDING_MODEL_NAME}...")
        # Local cached download, dimension is 384
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _embedding_model


def split_text(text: str, chunk_size: int = 800, overlap: int = 150) -> list[str]:
    """
    Splits text into chunks of roughly chunk_size characters with overlap.
    """
    if not text:
        return []
    
    # Split text into paragraphs or sentences first
    paragraphs = text.split("\n")
    chunks = []
    current_chunk = []
    current_length = 0

    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        
        # If a single paragraph is larger than chunk_size, split by sentences/spaces
        if len(paragraph) > chunk_size:
            words = paragraph.split(" ")
            temp_chunk = []
            temp_len = 0
            for word in words:
                if temp_len + len(word) + 1 > chunk_size:
                    chunks.append(" ".join(temp_chunk))
                    # Keep some overlap
                    temp_chunk = temp_chunk[-int(overlap/10):] if overlap > 0 else []
                    temp_len = sum(len(w) + 1 for w in temp_chunk)
                temp_chunk.append(word)
                temp_len += len(word) + 1
            if temp_chunk:
                chunks.append(" ".join(temp_chunk))
            continue

        if current_length + len(paragraph) + 1 > chunk_size:
            chunks.append("\n".join(current_chunk))
            # Keep overlap by keeping some lines
            overlap_chars = 0
            overlap_lines = []
            for line in reversed(current_chunk):
                if overlap_chars + len(line) < overlap:
                    overlap_lines.insert(0, line)
                    overlap_chars += len(line)
                else:
                    break
            current_chunk = overlap_lines
            current_length = sum(len(l) + 1 for l in current_chunk)

        current_chunk.append(paragraph)
        current_length += len(paragraph) + 1

    if current_chunk:
        chunks.append("\n".join(current_chunk))

    return [c.strip() for c in chunks if c.strip()]


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Generates local vector embeddings for a list of texts.
    """
    if not texts:
        return []
    model = get_embedding_model()
    embeddings = model.encode(texts, show_progress_bar=False)
    return embeddings.tolist()


def perform_vector_search(query: str, chunks_data: list[dict], top_k: int = 4) -> list[dict]:
    """
    Performs vector similarity search on a dynamic list of chunks using FAISS.
    chunks_data: List of dicts containing {"id": id, "text": text, "embedding": [floats]}
    """
    if not chunks_data:
        return []

    # Get query embedding
    model = get_embedding_model()
    query_emb = model.encode([query], show_progress_bar=False)[0]

    # Dimension size
    dimension = len(chunks_data[0]["embedding"])
    
    # Initialize FAISS index
    index = faiss.IndexFlatL2(dimension)
    
    # Extract and build matrix
    embeddings_matrix = np.array([item["embedding"] for item in chunks_data], dtype='float32')
    index.add(embeddings_matrix)

    # Run search
    query_matrix = np.array([query_emb], dtype='float32')
    distances, indices = index.search(query_matrix, min(top_k, len(chunks_data)))

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx != -1:
            results.append({
                "chunk": chunks_data[idx],
                "score": float(dist)
            })
    return results


def call_llm(system_prompt: str, user_prompt: str, chat_history: list[dict] = None) -> str:
    """
    Invokes the selected LLM provider (Gemini or OpenRouter) with appropriate contexts.
    """
    if LLM_PROVIDER == 'gemini':
        return _call_gemini(system_prompt, user_prompt, chat_history)
    elif LLM_PROVIDER == 'openrouter':
        return _call_openrouter(system_prompt, user_prompt, chat_history)
    else:
        # Fallback to local or demo answer if nothing is configured
        return "I apologize, but no LLM Provider has been configured. Please verify your environment settings."


def _call_gemini(system_prompt: str, user_prompt: str, chat_history: list[dict] = None) -> str:
    if not GEMINI_API_KEY or "your_google_gemini_api_key" in GEMINI_API_KEY:
        logger.warning("Gemini API key is not configured. Returning local demo response.")
        return ("**[DEMO RESPONSE - API Key Missing]**\n\nTo see live responses, please configure a valid `GEMINI_API_KEY` in your `.env` file.\n\n"
                "Here is how your custom context would be utilized:\n"
                f"- **System Prompt Context**:\n```\n{system_prompt[:200]}...\n```\n"
                f"- **User Prompt Query**: \"{user_prompt}\"")
    
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        
        # Format conversation context
        full_context = f"System Instruction:\n{system_prompt}\n\n"
        if chat_history:
            full_context += "Previous Conversation:\n"
            for msg in chat_history:
                role = "User" if msg["sender"] == "user" else "Assistant"
                full_context += f"{role}: {msg['content']}\n"
            full_context += "\n"
        
        full_context += f"User Query: {user_prompt}\nAssistant:"

        # Try multiple model names for robust fallback
        model_names = [
            'gemini-2.5-flash', 
            'gemini-2.0-flash', 
            'gemini-3.5-flash', 
            'gemini-flash-latest', 
            'gemini-pro-latest',
            'gemini-1.5-flash', 
            'gemini-pro'
        ]
        response = None
        last_error = None

        for model_name in model_names:
            try:
                logger.info(f"Attempting to generate content using model: {model_name}...")
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(full_context)
                if response and response.text:
                    logger.info(f"Successfully generated response using model: {model_name}")
                    return response.text
            except Exception as inner_e:
                logger.warning(f"Model {model_name} failed: {inner_e}")
                last_error = inner_e
                continue

        # If all fallback models failed, raise the last encountered error
        if last_error:
            raise last_error

    except Exception as e:
        logger.error(f"Gemini API failure: {e}")
        return f"Error communicating with Gemini: {str(e)}"


def _call_openrouter(system_prompt: str, user_prompt: str, chat_history: list[dict] = None) -> str:
    if not OPENROUTER_API_KEY or "your_openrouter_api_key" in OPENROUTER_API_KEY:
        return "[OpenRouter API Key Missing] Please set the key in your .env file."
    
    try:
        # Format messages
        messages = [{"role": "system", "content": system_prompt}]
        if chat_history:
            for msg in chat_history:
                messages.append({
                    "role": "user" if msg["sender"] == "user" else "assistant",
                    "content": msg["content"]
                })
        messages.append({"role": "user", "content": user_prompt})

        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "google/gemini-2.5-flash", # Use free model if available
                "messages": messages
            },
            timeout=30
        )
        if response.status_code == 200:
            return response.json()["choices"][0]["message"]["content"]
        else:
            return f"OpenRouter API Error (Status {response.status_code}): {response.text}"
    except Exception as e:
        logger.error(f"OpenRouter API failure: {e}")
        return f"Error communicating with OpenRouter: {str(e)}"
