import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { 
  Bot, MessageSquare, FileText, User as UserIcon, LogOut, Plus, 
  Trash2, Send, Upload, Clipboard, Trash, RefreshCw, CheckCircle, 
  AlertTriangle, Settings, HelpCircle, ShieldAlert, ArrowLeft, Edit
} from 'lucide-react';

import { useAuth, FASTAPI_API_URL } from '../context/AuthContext';

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Navigation tabs: 'chat', 'documents', 'profile'
  const [activeTab, setActiveTab] = useState('chat');
  
  // Chats State
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [renamingChatId, setRenamingChatId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  
  // Documents State
  const [documents, setDocuments] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // UI Loaders
  const [chatLoading, setChatLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Load Chats and Documents
  useEffect(() => {
    fetchChats();
    fetchDocuments();
  }, []);

  // Poll documents if any is in 'processing' status to check when it turns 'active'
  useEffect(() => {
    const hasProcessing = documents.some(doc => doc.status === 'processing');
    if (hasProcessing) {
      const interval = setInterval(() => {
        fetchDocuments();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [documents]);

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChatId) {
      fetchMessages(activeChatId);
    } else {
      setMessages([]);
    }
  }, [activeChatId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChats = async () => {
    try {
      const res = await axios.get(`${FASTAPI_API_URL}/chats/`);
      setChats(res.data);
      if (res.data.length > 0 && !activeChatId) {
        setActiveChatId(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch chats:", err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${FASTAPI_API_URL}/documents/`);
      setDocuments(res.data);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    }
  };

  const fetchMessages = async (chatId) => {
    setChatLoading(true);
    try {
      const res = await axios.get(`${FASTAPI_API_URL}/chats/${chatId}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleCreateChat = async () => {
    setActionLoading(true);
    try {
      const res = await axios.post(`${FASTAPI_API_URL}/chats/`, { title: "New Conversation" });
      setChats([res.data, ...chats]);
      setActiveChatId(res.data.id);
      setActiveTab('chat');
    } catch (err) {
      console.error("Failed to create chat:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenameChat = async (chatId) => {
    if (!renameValue.trim()) return;
    try {
      const res = await axios.put(`${FASTAPI_API_URL}/chats/${chatId}`, { title: renameValue });
      setChats(chats.map(c => c.id === chatId ? { ...c, title: res.data.title } : c));
      setRenamingChatId(null);
    } catch (err) {
      console.error("Failed to rename chat:", err);
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!window.confirm("Are you sure you want to delete this chat history?")) return;
    try {
      await axios.delete(`${FASTAPI_API_URL}/chats/${chatId}`);
      const updatedChats = chats.filter(c => c.id !== chatId);
      setChats(updatedChats);
      if (activeChatId === chatId) {
        setActiveChatId(updatedChats.length > 0 ? updatedChats[0].id : null);
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChatId) return;

    const query = messageInput;
    setMessageInput('');

    // Append user message immediately
    const tempUserMsg = {
      id: Date.now(),
      sender: 'user',
      content: query,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    // Append placeholder AI response while waiting
    const tempAiMsg = {
      id: Date.now() + 1,
      sender: 'ai',
      content: 'Thinking...',
      timestamp: new Date().toISOString(),
      isPending: true
    };
    setMessages(prev => [...prev, tempAiMsg]);

    try {
      const res = await axios.post(`${FASTAPI_API_URL}/chats/${activeChatId}/messages`, { content: query });
      // Replace pending message with exact response
      setMessages(prev => prev.map(m => m.isPending ? res.data.ai_message : m));
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages(prev => prev.map(m => m.isPending ? {
        id: Date.now() + 2,
        sender: 'ai',
        content: "I encountered an error generating a response. Please check if a document has been successfully processed, or check the system logs.",
        sources: []
      } : m));
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadProgress("Uploading...");
    const formData = new FormData();
    formData.append("file", uploadFile);

    try {
      await axios.post(`${FASTAPI_API_URL}/documents/upload-document`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadProgress("Upload successful! Document processing in background.");
      setUploadFile(null);
      fetchDocuments();
      setTimeout(() => setUploadProgress(""), 4000);
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadProgress(err.response?.data?.detail || "Upload failed. Verify file type.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm("Delete this document? It will be removed from the AI RAG database context.")) return;
    try {
      await axios.delete(`${FASTAPI_API_URL}/documents/${docId}`);
      setDocuments(documents.filter(d => d.id !== docId));
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  return (
    <div className="h-screen flex bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* 1. Sidebar Navigation */}
      <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Sidebar Header Logo */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <LinkToLanding logout={logout} />
          </div>

          {/* Navigation Items */}
          <div className="p-4 space-y-1">
            <button 
              onClick={() => setActiveTab('chat')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'chat' ? 'bg-sky-600/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <MessageSquare className="h-5 w-5" />
              <span>AI Chat Assistant</span>
            </button>
            <button 
              onClick={() => setActiveTab('documents')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'documents' ? 'bg-sky-600/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <FileText className="h-5 w-5" />
              <span>Document Manager</span>
              {documents.length > 0 && (
                <span className="ml-auto bg-slate-800 text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {documents.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('profile')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'profile' ? 'bg-sky-600/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <UserIcon className="h-5 w-5" />
              <span>My Settings</span>
            </button>

            {user?.profile?.role === 'admin' && (
              <button 
                onClick={() => navigate('/admin-analytics')} 
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 transition"
              >
                <ShieldAlert className="h-5 w-5" />
                <span>Admin Analytics</span>
              </button>
            )}
          </div>

          {/* Conversations Section (Visible only during Chat tab) */}
          {activeTab === 'chat' && (
            <div className="p-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conversations</span>
                <button 
                  onClick={handleCreateChat} 
                  disabled={actionLoading}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                  title="Create New Conversation"
                >
                  <Plus className="h-4.5 w-4.5" />
                </button>
              </div>

              {chats.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm">No conversations. Click "+" to start.</div>
              ) : (
                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                  {chats.map((c) => (
                    <div 
                      key={c.id} 
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition ${activeChatId === c.id ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                    >
                      {renamingChatId === c.id ? (
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => handleRenameChat(c.id)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRenameChat(c.id)}
                          className="bg-slate-900 text-white px-2 py-0.5 rounded border border-slate-700 w-full focus:outline-none focus:ring-1 focus:ring-sky-500"
                          autoFocus
                        />
                      ) : (
                        <button 
                          onClick={() => { setActiveChatId(c.id); setActiveTab('chat'); }}
                          className="truncate text-left flex-1"
                        >
                          {c.title}
                        </button>
                      )}

                      <div className="hidden group-hover:flex items-center gap-1">
                        <button 
                          onClick={() => { setRenamingChatId(c.id); setRenameValue(c.title); }}
                          className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                          title="Rename Chat"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteChat(c.id)}
                          className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
                          title="Delete Chat"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Footer Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 truncate">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center font-extrabold text-white text-sm shrink-0">
                {user?.username?.substring(0, 2).toUpperCase() || "US"}
              </div>
              <div className="truncate">
                <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.profile?.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button 
              onClick={logout} 
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition" 
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Window */}
      <main className="flex-1 flex flex-col bg-slate-950 relative">
        
        {/* Tab 1: AI Chat Assistant */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Chat Area Header */}
            <div className="px-6 py-4 bg-slate-900/40 border-b border-slate-900 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {chats.find(c => c.id === activeChatId)?.title || "AI Assistant"}
                </h2>
                <p className="text-xs text-slate-500">RAG-augmented responses referencing active document schemas</p>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-xs px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-md text-slate-400">
                  Embeddings Active
                </span>
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {chatLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-2">
                    <RefreshCw className="h-8 w-8 text-sky-500 animate-spin mx-auto" />
                    <p className="text-slate-500 text-sm">Loading message log history...</p>
                  </div>
                </div>
              ) : !activeChatId ? (
                <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto space-y-4">
                  <div className="p-4 bg-slate-900 rounded-3xl border border-slate-800">
                    <MessageSquare className="h-10 w-10 text-sky-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Start a Conversation</h3>
                  <p className="text-slate-500 text-sm">Create a chat thread in the sidebar or upload documents to query custom data records.</p>
                  <button 
                    onClick={handleCreateChat}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 rounded-xl font-semibold transition"
                  >
                    Create Conversation Thread
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto space-y-4">
                  <div className="p-4 bg-slate-900 rounded-3xl border border-slate-800">
                    <Bot className="h-10 w-10 text-sky-400 animate-float" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Ask GotlrBot Anything</h3>
                  <p className="text-slate-500 text-sm">Type your query below. The AI will look up context across all processed documents and provide source-backed answers.</p>
                  {documents.length === 0 && (
                    <div className="bg-yellow-950/40 border border-yellow-700/30 p-4 rounded-xl text-yellow-200 text-xs flex items-start gap-3 text-left">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
                      <div>
                        <strong>No documents uploaded yet!</strong> Upload documents in the file manager so the AI can find matching paragraphs.
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                messages.map((m) => (
                  <div 
                    key={m.id} 
                    className={`flex gap-4 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.sender !== 'user' && (
                      <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 font-bold shrink-0">
                        <Bot className="h-5 w-5" />
                      </div>
                    )}
                    
                    <div className={`max-w-[70%] rounded-2xl px-5 py-4 border ${m.sender === 'user' ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
                      <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                        {m.isPending ? (
                          <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <RefreshCw className="h-4 w-4 animate-spin" /> Thinking...
                          </div>
                        ) : (
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        )}
                      </div>
                      
                      {/* Citations / Sources details */}
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-800/80">
                          <p className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-2">Sources referenced:</p>
                          <div className="flex flex-wrap gap-2">
                            {m.sources.map((src, sIdx) => (
                              <span key={sIdx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 rounded-lg text-xs border border-slate-800 text-slate-300 font-medium">
                                <FileText className="h-3 w-3 text-slate-500" />
                                <span className="truncate max-w-[150px]">{src.filename}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {m.sender === 'user' && (
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white font-bold shrink-0">
                        {user?.username?.substring(0,2).toUpperCase()}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            {activeChatId && (
              <div className="p-6 bg-slate-900/30 border-t border-slate-900">
                <form onSubmit={handleSendMessage} className="relative flex items-center bg-slate-900 border border-slate-800 rounded-2xl focus-within:ring-2 focus-within:ring-sky-500 transition duration-200">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={documents.length === 0 ? "Upload documents first to start chatting..." : "Ask a question about your documents..."}
                    className="flex-1 bg-transparent px-5 py-4 text-sm text-white placeholder-slate-500 focus:outline-none"
                  />
                  <button 
                    type="submit" 
                    disabled={!messageInput.trim()}
                    className="p-3 mr-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-lg transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
                <p className="text-center text-[10px] text-slate-600 mt-2.5">
                  AI responses are formulated using semantic vector match calculations. Always check facts against core sources.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Document Manager */}
        {activeTab === 'documents' && (
          <div className="flex-1 p-8 overflow-y-auto max-w-5xl mx-auto w-full space-y-8">
            <div>
              <h2 className="text-3xl font-extrabold text-white">Document Manager</h2>
              <p className="text-slate-400 mt-1">Upload and manage source documents for your AI context database.</p>
            </div>

            {/* Uploader Box */}
            <form onSubmit={handleFileUpload} className="glass-panel p-8 rounded-2xl border border-slate-800 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Upload className="h-6 w-6 text-sky-400" />
                <h3 className="text-lg font-bold text-white">Upload New Files</h3>
              </div>
              <p className="text-slate-400 text-sm">Supported formats: PDF, DOCX, TXT, CSV, or JPEG/PNG Images. File size limit: 30MB.</p>
              
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl py-10 px-4 bg-slate-900/20 hover:bg-slate-900/40 hover:border-slate-700 transition duration-200 relative">
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="file-upload-input"
                />
                <div className="text-center space-y-2 pointer-events-none">
                  <FileText className="h-10 w-10 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">
                    {uploadFile ? uploadFile.name : "Drag & drop files here, or click to browse"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {uploadFile ? `${(uploadFile.size / 1024 / 1024).toFixed(2)} MB` : "Files will be parsed and vectorized on the fly"}
                  </p>
                </div>
              </div>

              {uploadProgress && (
                <div className="text-sm text-sky-400 font-semibold flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> {uploadProgress}
                </div>
              )}

              <div className="flex justify-end gap-3">
                {uploadFile && (
                  <button 
                    type="button" 
                    onClick={() => setUploadFile(null)}
                    className="px-5 py-2.5 bg-slate-850 hover:bg-slate-800 rounded-xl text-sm transition"
                  >
                    Clear File
                  </button>
                )}
                <button 
                  type="submit" 
                  disabled={!uploadFile || isUploading}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  Upload & Process
                </button>
              </div>
            </form>

            {/* Document List Table */}
            <div className="glass-panel overflow-hidden rounded-2xl border border-slate-800">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Indexed Files ({documents.length})</h3>
                <button 
                  onClick={fetchDocuments}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                  title="Reload files status"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No documents found. Upload your first document above.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="px-6 py-4">Filename</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Upload Date</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-900/30 transition">
                          <td className="px-6 py-4 font-medium text-white max-w-[250px] truncate">{doc.filename}</td>
                          <td className="px-6 py-4 uppercase text-xs font-semibold text-slate-500">{doc.file_type}</td>
                          <td className="px-6 py-4 text-xs text-slate-500">{new Date(doc.upload_date).toLocaleString()}</td>
                          <td className="px-6 py-4">
                            {doc.status === 'processing' && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-yellow-400 font-semibold bg-yellow-950/40 px-2.5 py-1 rounded-full">
                                <RefreshCw className="h-3 w-3 animate-spin" /> Processing
                              </span>
                            )}
                            {doc.status === 'active' && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/40 px-2.5 py-1 rounded-full">
                                <CheckCircle className="h-3 w-3" /> Ready
                              </span>
                            )}
                            {doc.status === 'error' && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-red-400 font-semibold bg-red-950/40 px-2.5 py-1 rounded-full">
                                <AlertTriangle className="h-3 w-3" /> Indexing Error
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition"
                              title="Delete Document"
                            >
                              <Trash className="h-4.5 w-4.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Settings/Profile */}
        {activeTab === 'profile' && (
          <div className="flex-1 p-8 overflow-y-auto max-w-3xl mx-auto w-full space-y-8">
            <div>
              <h2 className="text-3xl font-extrabold text-white">Account Settings</h2>
              <p className="text-slate-400 mt-1">Manage user preferences and check API usage statistics.</p>
            </div>

            <div className="glass-panel p-8 rounded-2xl border border-slate-800 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center font-extrabold text-white text-2xl shadow-xl shadow-sky-500/10">
                  {user?.username?.substring(0, 2).toUpperCase() || "US"}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{user?.username}</h3>
                  <p className="text-slate-400 text-sm">{user?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-6">
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Account Tier</p>
                  <p className="text-lg font-bold text-white capitalize mt-1">
                    {user?.profile?.role.replace('_', ' ') || 'Free Tier'}
                  </p>
                </div>
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total API Requests</p>
                  <p className="text-lg font-bold text-sky-400 mt-1">
                    {user?.profile?.api_usage_count || 0} calls
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-6 flex justify-between">
                <button 
                  onClick={logout} 
                  className="px-6 py-2.5 bg-red-950/60 border border-red-500/40 text-red-200 hover:text-white rounded-xl text-sm font-semibold transition"
                >
                  Logout from Account
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Internal Navigation helper
function LinkToLanding({ logout }) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-xl shadow-md">
        <Bot className="h-5 w-5 text-white" />
      </div>
      <span className="font-extrabold text-lg tracking-tight text-white">GotlrBot</span>
    </div>
  );
}
