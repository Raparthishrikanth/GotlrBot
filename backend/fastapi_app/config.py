import os
from pathlib import Path
from dotenv import load_dotenv

# Base Directory pointing to workspace root
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load environment variables from parent folder .env
dotenv_path = BASE_DIR / '.env'
if dotenv_path.exists():
    load_dotenv(dotenv_path)
else:
    load_dotenv()

# Service Configuration
SECRET_KEY = os.getenv('FASTAPI_SECRET_KEY', 'django-insecure-some-very-secret-and-long-key-for-saas')
ALGORITHM = "HS256"

# Database Configuration
# Direct connection string via DATABASE_URL or build it using individual fields
db_url = os.getenv('DATABASE_URL')
db_name = os.getenv('POSTGRES_DB')

if db_url:
    DATABASE_URL = db_url
elif db_name:
    DATABASE_URL = f"postgresql://{os.getenv('POSTGRES_USER', 'gotlr_user')}:{os.getenv('POSTGRES_PASSWORD', 'gotlr_password')}@{os.getenv('POSTGRES_HOST', 'db')}:{os.getenv('POSTGRES_PORT', '5432')}/{db_name}"
else:
    # Use the same sqlite database file as Django if local
    DATABASE_URL = f"sqlite:///{BASE_DIR}/backend/django_app/db.sqlite3"

# LLM Providers
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
LLM_PROVIDER = os.getenv('LLM_PROVIDER', 'gemini')
EMBEDDING_MODEL_NAME = os.getenv('EMBEDDING_MODEL_NAME', 'all-MiniLM-L6-v2')

# Storage Directory for uploaded files & FAISS indices
STORAGE_DIR = Path(os.getenv('STORAGE_DIR', './storage_data'))
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
(STORAGE_DIR / "uploads").mkdir(parents=True, exist_ok=True)
(STORAGE_DIR / "indices").mkdir(parents=True, exist_ok=True)

# CORS
CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')
