import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db, Chat, Message, DocumentChunk, Document
from auth import get_current_user, User, increment_api_usage
from services.rag import perform_vector_search, call_llm

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chats", tags=["Chats"])

class ChatCreate(BaseModel):
    title: Optional[str] = "New Chat"

class MessageCreate(BaseModel):
    content: str

class ChatUpdate(BaseModel):
    title: str


@router.post("/")
def create_chat(payload: ChatCreate = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    increment_api_usage(current_user.id, db)
    
    chat_uuid = uuid.uuid4()
    db_chat = Chat(
        id=chat_uuid,
        user_id=current_user.id,
        title=payload.title
    )
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    
    return {
        "id": str(db_chat.id),
        "title": db_chat.title,
        "created_at": db_chat.created_at
    }


@router.get("/")
def get_chats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    increment_api_usage(current_user.id, db)
    
    chats = db.query(Chat).filter(Chat.user_id == current_user.id).order_by(Chat.created_at.desc()).all()
    return [
        {
            "id": str(c.id),
            "title": c.title,
            "created_at": c.created_at
        } for c in chats
    ]


@router.put("/{chat_id}")
def rename_chat(chat_id: str, payload: ChatUpdate = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    increment_api_usage(current_user.id, db)
    
    chat = db.query(Chat).filter(Chat.id == uuid.UUID(chat_id), Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found.")
        
    chat.title = payload.title
    db.commit()
    db.refresh(chat)
    
    return {
        "id": str(chat.id),
        "title": chat.title,
        "created_at": chat.created_at
    }


@router.delete("/{chat_id}")
def delete_chat(chat_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    increment_api_usage(current_user.id, db)
    
    chat = db.query(Chat).filter(Chat.id == uuid.UUID(chat_id), Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found.")
        
    db.delete(chat)
    db.commit()
    return {"message": "Chat and messages deleted successfully."}


@router.get("/{chat_id}/messages")
def get_chat_messages(chat_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    increment_api_usage(current_user.id, db)
    
    chat = db.query(Chat).filter(Chat.id == uuid.UUID(chat_id), Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found.")
        
    messages = db.query(Message).filter(Message.chat_id == uuid.UUID(chat_id)).order_by(Message.timestamp.asc()).all()
    return [
        {
            "id": m.id,
            "sender": m.sender,
            "content": m.content,
            "timestamp": m.timestamp,
            "sources": m.sources
        } for m in messages
    ]


@router.post("/{chat_id}/messages")
def post_message(
    chat_id: str,
    payload: MessageCreate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    increment_api_usage(current_user.id, db)
    
    # Verify Chat belongs to user
    chat = db.query(Chat).filter(Chat.id == uuid.UUID(chat_id), Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    user_query = payload.content.strip()
    if not user_query:
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")

    # 1. Fetch chunks belonging to active documents of this user
    chunks = db.query(DocumentChunk).join(Document).filter(
        Document.user_id == current_user.id,
        Document.status == 'active'
    ).all()

    # If no active documents exist, proceed without context retrieval
    search_results = []
    sources = []
    if chunks:
        # Convert chunk database objects to input format for vector search
        chunks_data = [
            {
                "id": chunk.id,
                "text": chunk.chunk_text,
                "embedding": chunk.vector_embedding,
                "filename": chunk.document.filename
            } for chunk in chunks if chunk.vector_embedding
        ]

        if chunks_data:
            # Search top 4 matches
            search_results = perform_vector_search(user_query, chunks_data, top_k=4)
            # Compile citation references (filter duplicates)
            seen_files = set()
            for res in search_results:
                filename = res["chunk"]["filename"]
                if filename not in seen_files:
                    sources.append({
                        "filename": filename,
                        "score": round(res["score"], 4)
                    })
                    seen_files.add(filename)

    # 2. Build system instruction wrapping retrieved knowledge
    system_prompt = (
        "You are an expert, helpful AI assistant. You answer user queries based on the documents they uploaded. "
        "Your responses should be clean, highly structured, well-formatted markdown with lists, bold text, or code block segments when appropriate. "
        "Cite the document name (e.g., [DocumentName.pdf]) whenever you refer to information retrieved from a specific file. "
        "If you do not know the answer, say that you don't know, but try to give general guidance while clearly separating document-supported content.\n\n"
    )

    if search_results:
        system_prompt += "Context from user documents:\n"
        for idx, res in enumerate(search_results):
            system_prompt += f"--- DOCUMENT SOURCE ({idx + 1}): {res['chunk']['filename']} ---\n"
            system_prompt += f"{res['chunk']['text']}\n"
            system_prompt += f"---------------------------------------------------\n\n"
    else:
        system_prompt += "No documents have been uploaded or processed yet. Politely inform the user to upload documents in the sidebar/document manager if they want to query specific content.\n"

    # 3. Retrieve chat history (last 8 messages)
    history_records = db.query(Message).filter(Message.chat_id == uuid.UUID(chat_id)).order_by(Message.timestamp.desc()).limit(8).all()
    # Reverse to restore chronological order
    chat_history = [
        {"sender": rec.sender, "content": rec.content} for rec in reversed(history_records)
    ]

    # 4. Invoke LLM (Gemini or OpenRouter API)
    ai_response_content = call_llm(system_prompt, user_query, chat_history)

    # 5. Save User message to DB
    user_msg = Message(
        chat_id=uuid.UUID(chat_id),
        sender="user",
        content=user_query,
        sources=[]
    )
    db.add(user_msg)

    # 6. Save AI message to DB
    ai_msg = Message(
        chat_id=uuid.UUID(chat_id),
        sender="ai",
        content=ai_response_content,
        sources=sources
    )
    db.add(ai_msg)
    db.commit()

    db.refresh(user_msg)
    db.refresh(ai_msg)

    return {
        "user_message": {
            "id": user_msg.id,
            "sender": user_msg.sender,
            "content": user_msg.content,
            "timestamp": user_msg.timestamp
        },
        "ai_message": {
            "id": ai_msg.id,
            "sender": ai_msg.sender,
            "content": ai_msg.content,
            "timestamp": ai_msg.timestamp,
            "sources": ai_msg.sources
        }
    }
