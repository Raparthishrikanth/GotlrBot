from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, Uuid
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import datetime
from config import DATABASE_URL

# Setup SQLAlchemy engine and sessions
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# SQLAlchemy models mapping exactly to Django's database schema
class User(Base):
    __tablename__ = "auth_user"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(150), unique=True, index=True)
    email = Column(String(254), unique=True)
    password = Column(String(128))
    is_active = Column(Boolean, default=True)
    is_staff = Column(Boolean, default=False)
    date_joined = Column(DateTime, default=datetime.datetime.utcnow)

    profile = relationship("Profile", back_populates="user", uselist=False)
    documents = relationship("Document", back_populates="user")
    chats = relationship("Chat", back_populates="user")


class Profile(Base):
    __tablename__ = "core_profile"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("auth_user.id"), unique=True)
    role = Column(String(20), default="free_user")
    api_usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="profile")


class Document(Base):
    __tablename__ = "core_document"

    id = Column(Uuid, primary_key=True, index=True) # UUID representation
    user_id = Column(Integer, ForeignKey("auth_user.id"))
    filename = Column(String(255))
    file_type = Column(String(50))
    file_path = Column(String(512))
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(20), default="processing")

    user = relationship("User", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "core_documentchunk"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Uuid, ForeignKey("core_document.id"))
    chunk_text = Column(Text)
    vector_embedding = Column(JSON, nullable=True) # Stored as float array

    document = relationship("Document", back_populates="chunks")


class Chat(Base):
    __tablename__ = "core_chat"

    id = Column(Uuid, primary_key=True, index=True) # UUID
    user_id = Column(Integer, ForeignKey("auth_user.id"))
    title = Column(String(255), default="New Chat")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "core_message"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Uuid, ForeignKey("core_chat.id"))
    sender = Column(String(10)) # 'user' or 'ai'
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    sources = Column(JSON, default=list) # List of metadata details

    chat = relationship("Chat", back_populates="messages")


# DB dependency helper
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
