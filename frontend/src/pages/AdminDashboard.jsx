import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, FileText, MessageSquare, Activity, ShieldAlert, ArrowLeft, 
  UserMinus, UserCheck, Trash2, Key, RefreshCw, AlertTriangle, Info 
} from 'lucide-react';
import { useAuth, DJANGO_API_URL } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (user && user.profile?.role !== 'admin' && !user.is_staff) {
      navigate('/dashboard');
    }
  }, [user]);

  // Admin Data State
  const [metrics, setMetrics] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [documentsList, setDocumentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Reload trigger
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    fetchAdminData();
  }, [reloadKey]);

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch SaaS metrics
      const metricsRes = await axios.get(`${DJANGO_API_URL}/admin/analytics/`);
      setMetrics(metricsRes.data);

      // Fetch all users list
      const usersRes = await axios.get(`${DJANGO_API_URL}/admin/users/`);
      setUsersList(usersRes.data);

      // Fetch all documents list
      const docsRes = await axios.get(`${DJANGO_API_URL}/admin/documents/`);
      setDocumentsList(docsRes.data);
    } catch (err) {
      console.error("Failed to load admin dashboard statistics:", err);
      setError("Failed to fetch admin metrics. Please make sure Django backend is running and you are logged in as an administrator.");
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action, extraPayload = {}) => {
    if (action === 'delete' && !window.confirm("Permanently delete this user account?")) return;
    try {
      const res = await axios.post(`${DJANGO_API_URL}/admin/users/${userId}/`, { action, ...extraPayload });
      alert(res.data.message || "User action completed successfully.");
      setReloadKey(prev => prev + 1);
    } catch (err) {
      console.error("User action failed:", err);
      alert(err.response?.data?.error || "Action failed.");
    }
  };

  const handleResetPassword = (userId) => {
    const newPassword = window.prompt("Enter new password for this user:");
    if (newPassword) {
      handleUserAction(userId, 'reset_password', { password: newPassword });
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm("Remove document? It will delete the file and clean vectors from vector indexes.")) return;
    try {
      await axios.delete(`${DJANGO_API_URL}/admin/documents/${docId}/`);
      alert("Document deleted successfully.");
      setReloadKey(prev => prev + 1);
    } catch (err) {
      console.error("Document deletion failed:", err);
      alert("Failed to delete document.");
    }
  };

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-10 w-10 text-sky-500 animate-spin mx-auto" />
          <p className="text-slate-400">Loading SaaS admin metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-8">
      {/* Header bar */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <ShieldAlert className="h-8 w-8 text-sky-500" /> Admin Control Panel
              </h1>
              <p className="text-slate-400 mt-1">Platform analytics, user suspension dashboard, and document monitoring controls.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => setReloadKey(prev => prev + 1)}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 rounded-xl text-sm font-semibold border border-slate-800 transition flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Refresh Data
          </button>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto mb-8 bg-red-950/60 border border-red-500/40 p-4 rounded-xl flex items-start gap-3 text-red-200">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
          <div>
            <strong>Error Loading Data</strong>
            <p className="text-sm text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {metrics && (
        <div className="max-w-7xl mx-auto space-y-10">
          {/* KPI Metrics row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Users</p>
                <p className="text-3xl font-extrabold text-white mt-2">{metrics.metrics.totalUsers}</p>
                <p className="text-xs text-emerald-400 mt-1">+{metrics.metrics.growthLastWeek} this week</p>
              </div>
              <div className="p-4 bg-sky-950/30 rounded-xl text-sky-400">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active Users</p>
                <p className="text-3xl font-extrabold text-white mt-2">{metrics.metrics.activeUsers}</p>
                <p className="text-xs text-slate-500 mt-1">Status accounts active</p>
              </div>
              <div className="p-4 bg-sky-950/30 rounded-xl text-sky-400">
                <Activity className="h-6 w-6" />
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Documents</p>
                <p className="text-3xl font-extrabold text-white mt-2">{metrics.metrics.totalDocuments}</p>
                <p className="text-xs text-slate-500 mt-1">Vector mapped sources</p>
              </div>
              <div className="p-4 bg-indigo-950/30 rounded-xl text-indigo-400">
                <FileText className="h-6 w-6" />
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Chats</p>
                <p className="text-3xl font-extrabold text-white mt-2">{metrics.metrics.totalChats}</p>
                <p className="text-xs text-slate-500 mt-1">Active conversation sessions</p>
              </div>
              <div className="p-4 bg-purple-950/30 rounded-xl text-purple-400">
                <MessageSquare className="h-6 w-6" />
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total API Usage</p>
                <p className="text-3xl font-extrabold text-white mt-2">{metrics.metrics.totalApiCalls}</p>
                <p className="text-xs text-slate-500 mt-1">Calls logged on FastAPI</p>
              </div>
              <div className="p-4 bg-emerald-950/30 rounded-xl text-emerald-400">
                <Activity className="h-6 w-6 animate-pulse" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* User List and Actions */}
            <div className="glass-panel rounded-2xl border border-slate-800 lg:col-span-2 overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">Platform Users ({usersList.length})</h3>
                <p className="text-xs text-slate-500">View user registration dates, roles, and toggles to suspend profiles.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Username</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">API Requests</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {usersList.map((usr) => (
                      <tr key={usr.id} className="hover:bg-slate-900/20 transition">
                        <td className="px-6 py-4 font-semibold text-white">{usr.username}</td>
                        <td className="px-6 py-4 text-xs text-slate-400">{usr.email || "N/A"}</td>
                        <td className="px-6 py-4 capitalize text-xs font-semibold text-slate-500">{usr.role.replace('_', ' ')}</td>
                        <td className="px-6 py-4 text-xs text-sky-400 font-bold">{usr.api_usage_count}</td>
                        <td className="px-6 py-4">
                          {usr.is_active ? (
                            <span className="text-xs text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded-full font-bold">Active</span>
                          ) : (
                            <span className="text-xs text-red-400 bg-red-950/40 px-2.5 py-0.5 rounded-full font-bold">Suspended</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                          {usr.is_active ? (
                            <button 
                              onClick={() => handleUserAction(usr.id, 'suspend')}
                              className="p-1.5 bg-yellow-950/60 border border-yellow-800/40 rounded text-yellow-400 hover:text-white"
                              title="Suspend User"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleUserAction(usr.id, 'activate')}
                              className="p-1.5 bg-emerald-950/60 border border-emerald-800/40 rounded text-emerald-400 hover:text-white"
                              title="Activate User"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button 
                            onClick={() => handleResetPassword(usr.id)}
                            className="p-1.5 bg-slate-800 border border-slate-700 rounded text-slate-300 hover:text-white"
                            title="Reset Password"
                          >
                            <Key className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => handleUserAction(usr.id, 'delete')}
                            className="p-1.5 bg-red-950/60 border border-red-800/40 rounded text-red-400 hover:text-white"
                            title="Delete User"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Document Moderation */}
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">System Documents ({documentsList.length})</h3>
                <p className="text-xs text-slate-500">Monitor all files uploaded by platform members and clean vector mappings.</p>
              </div>

              <div className="divide-y divide-slate-850 max-h-[500px] overflow-y-auto">
                {documentsList.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">No documents found.</div>
                ) : (
                  documentsList.map((doc) => (
                    <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-900/10 transition">
                      <div className="truncate max-w-[70%]">
                        <p className="text-sm font-semibold text-white truncate" title={doc.filename}>{doc.filename}</p>
                        <p className="text-[10px] text-slate-500 mt-1">Uploaded by: <span className="text-slate-400 font-medium">@{doc.username}</span></p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] px-2 py-0.5 bg-slate-900 text-slate-500 font-bold uppercase rounded border border-slate-850">
                          {doc.file_type}
                        </span>
                        <button 
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition"
                          title="Moderate and delete file"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* System status details */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-start gap-4">
            <Info className="h-6 w-6 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white text-sm">System Administration Overview</h4>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">
                Both Django and FastAPI services are executing endpoints mapped to standard database structures. 
                For advanced features (such as configuring mail transfer credentials or API host configurations), please use the native <a href="http://localhost:8000/admin/" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">Django Admin Console Panel</a> directly.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
