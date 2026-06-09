# GotlrBot - AI Document Chatbot & RAG SaaS Platform

GotlrBot is a full-stack, enterprise-grade AI chatbot SaaS platform where users can upload documents and chat instantly with an AI assistant that answers questions with semantic context and source citation, built using **React.js**, **Django REST Framework**, **FastAPI**, and **PostgreSQL**.

---

## 🌟 Tech Stack & Architecture

- **Frontend**: React (Vite) + Tailwind CSS + Lucide Icons + React Router + Axios
- **Backend Auth & Admin Panel**: Django REST Framework + SimpleJWT
- **Backend AI, Parsing & RAG**: FastAPI + SQLAlchemy + SentenceTransformers (`all-MiniLM-L6-v2` local embeddings) + FAISS (in-memory dynamic index) + Google Gemini API (or OpenRouter)
- **Database**: PostgreSQL (shares tables between Django and FastAPI services)
- **OCR Engine**: Tesseract OCR (for scanned PDF/Image text extraction)

```
GotlrBot/
├── docker-compose.yml       # Orchestrates all service containers
├── .env.example             # Configuration keys template
├── .env                     # Local settings loaded by backends
├── backend/
│   ├── django_app/          # DRF Authentication & Django Admin Panel (Port 8000)
│   └── fastapi_app/         # FastAPI AI, File parsing & RAG service (Port 8001)
└── frontend/                # React dashboard application (Port 5173)
```

---

## 🚀 Getting Started with Docker Compose

Running the entire platform with PostgreSQL, Django, FastAPI, and React in a unified container grid takes just a few steps:

### 1. Configure the Environment
Copy the example environment file:
```bash
cp .env.example .env
```
Open `.env` and fill in your **Google Gemini API Key**:
```env
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere
```
*(Get a free tier API Key from [Google AI Studio](https://aistudio.google.com/))*

### 2. Run the Container Grid
Execute the build command:
```bash
docker-compose up --build
```
This will:
- Set up a **PostgreSQL** database container.
- Build and run the **Django Auth & Admin** service.
- Build and run the **FastAPI AI** service.
- Pre-cache the **SentenceTransformer** embedding models in the FastAPI layer (dimension 384).
- Build and run the **React frontend** Vite server.

### 3. Open the Web App
Open your browser and navigate to:
- **Frontend App**: `http://localhost:5173`
- **FastAPI Documentation (Swagger)**: `http://localhost:8001/docs`
- **Django Admin Portal**: `http://localhost:8000/admin`

---

## 🚢 Production Deployment

For deploying the platform to a production environment (such as an AWS EC2 instance, DigitalOcean Droplet, VPS, etc.), you can run the production-optimized container grid:

### 1. Build and Run Production Containers
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```
This builds and launches:
- **Nginx Web Server (Frontend)**: Serves the static compiled React production build on port `80` with proper client-side SPA routing (rewriting unmatched requests to `index.html`).
- **Gunicorn WSGI Server (Django)**: Runs Django on port `8000` via Gunicorn rather than the development server.
- **FastAPI AI Server**: Runs FastAPI on port `8001` with multiple Uvicorn workers enabled.
- **PostgreSQL Database**: Configured on port `5432` with volume persistence.

### 2. Overriding Backend URLs
If your frontend needs to talk to APIs on external domain names (e.g. `https://api.gotlrbot.com` instead of localhost), you can pass build arguments to Docker:
```bash
VITE_DJANGO_API_URL=https://django-api.domain.com/api VITE_FASTAPI_API_URL=https://fastapi-api.domain.com docker-compose -f docker-compose.prod.yml up --build -d
```

---

## 🛠️ Running Locally (Without Docker)

If you prefer to run services outside of Docker containers:

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL server (optional; falls back automatically to a shared `db.sqlite3` file if no PG credentials are present in `.env`)
- Tesseract OCR binary installed on your path (for image OCR text extraction support)

### 1. Set Up the Shared Database & Django (Port 8000)
```bash
cd backend/django_app
python -m venv venv
# Windows: venv\Scripts\activate | Unix: source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
# Create your admin user
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

### 2. Set Up FastAPI AI Service (Port 8001)
```bash
cd backend/fastapi_app
python -m venv venv
# Windows: venv\Scripts\activate | Unix: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001
```

### 3. Set Up React Frontend (Port 5173)
```bash
cd frontend
npm install
npm run dev
```

---

## 🔑 Key Features Walkthrough

### 1. Registration & Custom Account Roles
- Create a new account at `http://localhost:5173/register`.
- Choose your **Account Tier / Role**:
  - **Free User**: Access to basic chat RAG features.
  - **Admin**: Grants access to the **Admin Analytics** dashboard interface.

### 2. Drag & Drop Document Manager
- Click on **Document Manager** in the dashboard sidebar.
- Upload any supported files (e.g. PDF, Word, TXT, CSV, JPEG, PNG).
- Files will show `Processing` state as FastAPI parses text, splits characters, encodes sentence embeddings, and saves records.
- Status shifts to `Ready` when indexing is complete.

### 3. Semantic RAG Chat Interface
- Create a conversation in the sidebar by clicking `+`.
- Enter queries like: *"Summarize the uploaded financial CSV table"* or *"Explain section 4.2 in the PDF file."*
- FastAPI builds an **in-memory FAISS index** for user documents, performs Cosine similarity lookups, formats contexts, and calls the Gemini model.
- Responses render as clean Markdown with clickable references highlighting which file the response content originated from.

### 4. Admin Portal & User Suspension
- Log in with an **Admin** user.
- Click the **Admin Analytics** button in the sidebar.
- Review platform-wide statistics: total users, active storage files, total chats created, and live API usage call limits.
- Actions:
  - **Suspend/Activate Accounts**: Disable active login session permissions.
  - **Moderate Files**: Delete inappropriate files from database indices.
  - **Reset Passwords**: Re-assign user passwords directly from the dashboard.
- You can also access full administrative database overrides via Django Admin at `http://localhost:8000/admin`.
