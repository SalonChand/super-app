import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Flag, Trash2, UserX, CheckCircle, RefreshCw, BadgeCheck, ExternalLink, AlertTriangle, Clock, Eye } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

const CATEGORY_LABELS = {
    harassment:     { emoji: '😡', label: 'Harassment or Bullying' },
    hate_speech:    { emoji: '🚫', label: 'Hate Speech' },
    spam:           { emoji: '🗑️', label: 'Spam or Fake Account' },
    sexual_content: { emoji: '🔞', label: 'Inappropriate Sexual Content' },
    violence:       { emoji: '⚠️', label: 'Violence or Threats' },
    misinformation: { emoji: '📢', label: 'Misinformation' },
    privacy:        { emoji: '🔒', label: 'Privacy Violation' },
    scam:           { emoji: '💸', label: 'Scam or Fraud' },
    other:          { emoji: '📋', label: 'Other' },
};

export default function AdminReports() {
    const adminId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const loginUsername = localStorage.getItem('loginUsername');
    const isAdmin = userRole === 'superadmin' || loginUsername === 'superadmin' || adminId === '1';
    const navigate = useNavigate();

    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionMsg, setActionMsg] = useState({});
    const [expanded, setExpanded] = useState(null);

    const msg = (id, text) => {
        setActionMsg(p => ({ ...p, [id]: text }));
        setTimeout(() => setActionMsg(p => { const n = {...p}; delete n[id]; return n; }), 3000);
    };

    useEffect(() => { if (isAdmin) load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/api/admin/reports?adminId=${adminId}`);
            setReports(res.data || []);
        } catch(e) {}
        setLoading(false);
    };

    const dismiss = async (reportId) => {
        msg(reportId, 'Dismissing...');
        try {
            await axios.post(`${BACKEND_URL}/api/admin/reports/${reportId}/dismiss`, { adminId });
            setReports(p => p.filter(r => r.id !== reportId));
        } catch(e) { msg(reportId, '❌ Failed'); }
    };

    const resolve = async (reportId) => {
        try {
            await axios.post(`${BACKEND_URL}/api/admin/reports/${reportId}/resolve`, { adminId });
            setReports(p => p.filter(r => r.id !== reportId));
        } catch(e) {}
    };

    const deactivateUser = async (report) => {
        msg(report.id, 'Deactivating...');
        try {
            await axios.post(`${BACKEND_URL}/api/admin/users/${report.reported_user_id}/deactivate`, { adminId, deactivate: true });
            await axios.post(`${BACKEND_URL}/api/admin/reports/${report.id}/resolve`, { adminId });
            setReports(p => p.filter(r => r.id !== report.id));
            msg(report.id, '✅ User deactivated');
        } catch(e) { msg(report.id, '❌ Failed'); }
    };

    if (!isAdmin) return <div className="min-h-screen bg-black flex items-center justify-center"><p className="text-red-400">Access Denied</p></div>;

    return (
        <div className="min-h-screen bg-black pb-24">
            <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
                <Link to="/admin" className="text-zinc-400 hover:text-white"><ChevronLeft size={24}/></Link>
                <Flag size={18} className="text-orange-400"/>
                <h1 className="text-white font-bold text-lg flex-1">Reports</h1>
                <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2.5 py-1 rounded-full font-bold">{reports.length} pending</span>
                <button onClick={load} className="text-zinc-400 hover:text-white p-1"><RefreshCw size={18} className={loading ? 'animate-spin' : ''}/></button>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
                {loading && <div className="text-center py-16 text-zinc-500">Loading reports...</div>}
                {!loading && reports.length === 0 && (
                    <div className="text-center py-16">
                        <CheckCircle size={40} className="mx-auto mb-3 text-green-500 opacity-50"/>
                        <p className="text-zinc-400 font-semibold">All clear! No pending reports.</p>
                    </div>
                )}

                {reports.map(report => {
                    const cat = CATEGORY_LABELS[report.reason_category] || CATEGORY_LABELS.other;
                    const isExpanded = expanded === report.id;
                    return (
                        <div key={report.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                            <div className="p-4">
                                {/* Category + time */}
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold bg-red-500/15 border border-red-500/30 text-red-400 px-2.5 py-1 rounded-full">
                                        {cat.emoji} {cat.label}
                                    </span>
                                    <span className="text-zinc-600 text-[10px] flex items-center gap-1">
                                        <Clock size={9}/> {new Date(report.created_at).toLocaleString()}
                                    </span>
                                </div>

                                {/* Reporter → Reported */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {report.reporter_pic
                                            ? <img src={report.reporter_pic} className="w-8 h-8 rounded-full object-cover flex-shrink-0"/>
                                            : <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{report.reporter_username?.[0]?.toUpperCase()}</div>
                                        }
                                        <div className="min-w-0">
                                            <p className="text-zinc-500 text-[10px]">Reported by</p>
                                            <p className="text-white text-xs font-semibold truncate">@{report.reporter_username}</p>
                                        </div>
                                    </div>
                                    <AlertTriangle size={16} className="text-red-500 flex-shrink-0"/>
                                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                        <div className="min-w-0 text-right">
                                            <p className="text-zinc-500 text-[10px]">Against</p>
                                            <p className="text-white text-xs font-bold truncate flex items-center gap-1 justify-end">
                                                @{report.reported_username}
                                                {report.reported_is_verified == 1 && <BadgeCheck size={11} className="text-blue-400"/>}
                                            </p>
                                        </div>
                                        {report.reported_pic
                                            ? <img src={report.reported_pic} className="w-8 h-8 rounded-full object-cover flex-shrink-0"/>
                                            : <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{report.reported_username?.[0]?.toUpperCase()}</div>
                                        }
                                    </div>
                                </div>

                                {/* Description */}
                                {report.description && (
                                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 mb-3">
                                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Description</p>
                                        <p className={`text-zinc-300 text-sm leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>{report.description}</p>
                                        {report.description?.length > 120 && (
                                            <button onClick={() => setExpanded(isExpanded ? null : report.id)} className="text-zinc-500 hover:text-white text-xs mt-1 transition">
                                                {isExpanded ? '▲ Show less' : '▼ Show more'}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Proof */}
                                {report.proof_url ? (
                                    <a href={report.proof_url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-blue-400 text-xs bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2 hover:bg-blue-500/20 transition mb-3">
                                        <ExternalLink size={12}/> <span className="truncate">View Evidence / Proof Link</span>
                                    </a>
                                ) : (
                                    <p className="text-zinc-600 text-xs mb-3 italic">No evidence link provided</p>
                                )}

                                {actionMsg[report.id] && <p className="text-center text-xs font-bold text-green-400 mb-2">{actionMsg[report.id]}</p>}

                                {/* Actions */}
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => navigate(`/admin/users/${report.reported_user_id}/profile`)}
                                        className="flex items-center justify-center gap-1 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold hover:bg-zinc-700 transition">
                                        <Eye size={12}/> Profile
                                    </button>
                                    <button onClick={() => dismiss(report.id)}
                                        className="flex items-center justify-center gap-1 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-bold hover:bg-zinc-700 transition">
                                        <CheckCircle size={12}/> Dismiss
                                    </button>
                                    <button onClick={() => deactivateUser(report)}
                                        className="flex items-center justify-center gap-1 py-2 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 text-xs font-bold hover:bg-red-500/25 transition">
                                        <UserX size={12}/> Deactivate
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
