import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Flag, Trash2, UserX, CheckCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

export default function AdminReports() {
    const adminId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const loginUsername = localStorage.getItem('loginUsername');
    const isAdmin = userRole === 'superadmin' || loginUsername === 'superadmin' || adminId === '1';
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionMsg, setActionMsg] = useState({});

    const load = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/api/admin/reports?adminId=${adminId}`);
            setReports(res.data || []);
        } catch(e) {}
        setLoading(false);
    };

    useEffect(() => { if (isAdmin) load(); }, []);

    const msg = (id, text) => {
        setActionMsg(p => ({ ...p, [id]: text }));
        setTimeout(() => setActionMsg(p => { const n={...p}; delete n[id]; return n; }), 2500);
    };

    const dismiss = async (reportId) => {
        try {
            await axios.post(`${BACKEND_URL}/api/admin/reports/${reportId}/dismiss`, { adminId });
            setReports(p => p.filter(r => r.id !== reportId));
        } catch(e) { msg(reportId, '❌ Failed'); }
    };

    const deleteContent = async (report) => {
        msg(report.id, 'Deleting...');
        try {
            if (report.post_id) await axios.delete(`${BACKEND_URL}/api/admin/posts/${report.post_id}`, { data: { adminId } });
            await axios.post(`${BACKEND_URL}/api/admin/reports/${report.id}/dismiss`, { adminId });
            setReports(p => p.filter(r => r.id !== report.id));
        } catch(e) { msg(report.id, '❌ Failed'); }
    };

    const formatTime = (d) => d ? new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';

    return (
        <div className="min-h-screen bg-black pb-24">
            <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
                <Link to="/admin" className="text-zinc-400 hover:text-white transition"><ChevronLeft size={24}/></Link>
                <Flag size={20} className="text-orange-400"/>
                <h1 className="text-white font-bold text-lg flex-1">Reports</h1>
                <button onClick={load} className="text-zinc-400 hover:text-white p-1"><RefreshCw size={18} className={loading ? 'animate-spin' : ''}/></button>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
                {loading ? <div className="text-center py-16 text-zinc-500">Loading reports...</div> :
                reports.length === 0 ? (
                    <div className="text-center py-20">
                        <CheckCircle size={40} className="mx-auto text-green-500/40 mb-3"/>
                        <p className="text-zinc-500 font-semibold">All clear!</p>
                        <p className="text-zinc-600 text-sm">No pending reports</p>
                    </div>
                ) : reports.map(report => (
                    <div key={report.id} className="bg-zinc-900 border border-orange-500/20 rounded-2xl overflow-hidden">
                        <div className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Report #{report.id}</span>
                                <span className="text-zinc-600 text-xs">{formatTime(report.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Flag size={13} className="text-orange-400 flex-shrink-0"/>
                                <p className="text-zinc-300 text-sm"><span className="text-white font-semibold">{report.reporter_username}</span> reported <span className="text-white font-semibold">{report.reported_username || 'content'}</span></p>
                            </div>
                            {report.reason && <p className="text-zinc-400 text-sm bg-zinc-950 rounded-xl px-3 py-2 border border-zinc-800">"{report.reason}"</p>}
                        </div>
                        {actionMsg[report.id] && <p className="text-xs text-center py-1.5 text-orange-400 bg-orange-500/5">{actionMsg[report.id]}</p>}
                        <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                            <button onClick={() => dismiss(report.id)}
                                className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition">
                                <CheckCircle size={13}/> Dismiss
                            </button>
                            <button onClick={() => deleteContent(report)}
                                className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 transition">
                                <Trash2 size={13}/> Delete Content
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
