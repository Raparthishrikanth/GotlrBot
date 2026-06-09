import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS
from database import engine, Base
from routers import document, chat

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Try to automatically create tables.
# Under Postgres, Django migrations will create them.
# Under local SQLite, this ensures tables are available immediately on startup.
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
except Exception as e:
    logger.warning(f"Could not automatically initialize tables (expected if using Django migrations first): {e}")

app = FastAPI(
    title="GotlrBot AI Document Chatbot Services",
    description="Microservice handling document upload, parsing, OCR, chunk embeddings, FAISS indices, and Gemini/OpenRouter completions.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(document.router)
app.include_router(chat.router)

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "GotlrBot AI Document Chatbot Services API",
        "endpoints": ["/documents", "/chats", "/docs"]
    }
