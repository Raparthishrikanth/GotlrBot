import os
import uuid
import shutil
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from pathlib import Path

from database import get_db, Document, DocumentChunk
from auth import get_current_user, User, increment_api_usage
from services.parser import extract_text
from services.rag import split_text, generate_embeddings
from config import STORAGE_DIR

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["Documents"])

SUPPORTED_EXTENSIONS = {'.pdf', '.docx', '.txt', '.csv', '.png', '.jpg', '.jpeg'}

def process_document_background(doc_id: str, file_path: str, file_extension: str, db_session_factory):
    """
    Background job to parse text, chunk, embed, and store in vector database.
    Using a separate session to prevent connection sharing issues.
    """
    db: Session = db_session_factory()
    try:
        doc = db.query(Document).filter(Document.id == uuid.UUID(doc_id)).first()
        if not doc:
            logger.error(f"Document {doc_id} not found in DB during background processing.")
            return

        logger.info(f"Extracting text from {file_path} ({file_extension})...")
        extracted_text = extract_text(file_path, file_extension)

        if not extracted_text.strip():
            raise Exception("No text content could be extracted from this document.")

        logger.info(f"Splitting text into chunks...")
        chunks = split_text(extracted_text)
        if not chunks:
            raise Exception("Document splitting returned zero chunks.")

        logger.info(f"Generating embeddings for {len(chunks)} chunks...")
        embeddings = generate_embeddings(chunks)

        logger.info("Saving chunks to database...")
        for chunk_text, emb in zip(chunks, embeddings):
            db_chunk = DocumentChunk(
                document_id=uuid.UUID(doc_id),
                chunk_text=chunk_text,
                vector_embedding=emb
            )
            db.add(db_chunk)

        doc.status = 'active'
        db.commit()
        logger.info(f"Document {doc_id} successfully parsed and indexed.")

    except Exception as e:
        logger.error(f"Error processing document {doc_id}: {e}")
        try:
            doc = db.query(Document).filter(Document.id == uuid.UUID(doc_id)).first()
            if doc:
                doc.status = 'error'
                db.commit()
        except Exception as db_e:
            logger.error(f"Failed to set document status to error: {db_e}")
    finally:
        db.close()


@router.post("/upload-document")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    increment_api_usage(current_user.id, db)
    
    file_path = Path(file.filename)
    extension = file_path.suffix.lower()
    
    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported types: {', '.join(SUPPORTED_EXTENSIONS)}"
        )

    # Generate unique filename to avoid conflict
    unique_filename = f"{uuid.uuid4()}{extension}"
    upload_dir = STORAGE_DIR / "uploads"
    dest_path = upload_dir / unique_filename

    # Save uploaded file to disk
    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to write file to disk: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded file to server storage.")

    # Create Document record with status 'processing'
    doc_uuid = uuid.uuid4()
    db_doc = Document(
        id=doc_uuid,
        user_id=current_user.id,
        filename=file.filename,
        file_type=extension.strip('.'),
        file_path=str(dest_path),
        status='processing'
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    # Run heavy parsing task in background to keep API responsive
    from database import SessionLocal
    background_tasks.add_task(
        process_document_background,
        str(doc_uuid),
        str(dest_path),
        extension,
        SessionLocal
    )

    return {
        "message": "Document uploaded and processing has started in the background.",
        "document": {
            "id": str(db_doc.id),
            "filename": db_doc.filename,
            "file_type": db_doc.file_type,
            "status": db_doc.status
        }
    }


@router.get("/")
def get_documents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    increment_api_usage(current_user.id, db)
    docs = db.query(Document).filter(Document.user_id == current_user.id).order_by(Document.upload_date.desc()).all()
    
    return [
        {
            "id": str(doc.id),
            "filename": doc.filename,
            "file_type": doc.file_type,
            "upload_date": doc.upload_date,
            "status": doc.status
        } for doc in docs
    ]


@router.delete("/{doc_id}")
def delete_document(doc_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    increment_api_usage(current_user.id, db)
    
    doc = db.query(Document).filter(Document.id == uuid.UUID(doc_id), Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Remove physical file
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            logger.warning(f"Could not delete file from storage: {e}")

    # Chunks are deleted automatically via cascade delete in SQL constraints
    db.delete(doc)
    db.commit()

    return {"message": "Document and all its vector indices deleted successfully."}
