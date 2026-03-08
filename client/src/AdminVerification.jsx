import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { BadgeCheck, X, ChevronLeft, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

function formatTime(dateString) {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const STATUS_CONFIG = {
    pending:  { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30', Icon: Clock,         label: 'Pending' },
    approved: { color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30',   Icon: CheckCircle2,  label: 'Approved' },
    denied:   { color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30',        Icon: XCircle,       label: 'Denied' },
};

export default function AdminVerification() {
    const adminId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionId, setActionId] = useState(null); // userId being acted on
    const [approveReason, setApproveReason] = useState('');
    const [filter, setFilter] = useState('pending'); // 'all' | 'pending' | 'approved' | 'denied'
    const [actionMsg, setActionMsg] = useState({});

    const loadRequests = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await axios.get(`${BACKEND_URL}/api/admin/verification-requests?adminId=${adminId}`);
            if (Array.isArray(res.data)) setRequests(res.data);
            else setError(res.data?.error || 'Access denied.');
        } catch(e) {
            setError(e?.response?.data?.error || 'Could not load requests.');
        }
        setLoading(false);
    };

    useEffect(() => {
        if (username !== 'superadmin') { setError('Access denied. Superadmin only.'); setLoading(false); return; }
        loadRequests();
    }, []);

    const handleAction = async (userId, approved) => {
        setActionMsg(prev => ({ ...prev, [userId]: 'Processing...' }));
        try {
            const res = await axios.post(`${BACKEND_URL}/api/admin/verify-user`, {
                adminId,
                userId,
                approved,
                reason: approved ? (approveReason || 'Verified by admin') : 'Request denied',
            });
            if (res.data?.success) {
                setActionMsg(prev => ({ ...prev, [userId]: approved ? '✅ Approved!' : '❌ Denied' }));
                setApproveReason('');
                setActionId(null);
                setTimeout(() => {
                    loadRequests();
                    setActionMsg(prev => { const n = {...prev}; delete n[userId]; return n; });
                }, 1500);
            } else {
                setActionMsg(prev => ({ ...prev, [userId]: res.data?.error || 'Error.' }));
            }
        } catch(e) {
            setActionMsg(prev => ({ ...prev, [userId]: e?.response?.data?.error || 'Network error.' }));
        }
    };

    const filtered = requests.filter(r => filter === 'all' || r.status === filter);
    const counts = { pending: requests.filter(r => r.status === 'pending').length, approved: requests.filter(r => r.status === 'approved').length, denied: requests.filter(r => r.status === 'denied').length };

    if (error) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle size={48} className="text-red-400 mb-4"/>
            <h2 className="text-white font-bold text-xl mb-2">Access Denied</h2>
            <p className="text-zinc-400 text-sm">{error}</p>
            <Link to="/" className="mt-6 text-blue-400 text-sm hover:underline">← Go Home</Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-black pb-20">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
                <Link to="/settings" className="text-zinc-400 hover:text-white transition">
                    <ChevronLeft size={24}/>
                </Link>
                <BadgeCheck size={22} className="text-blue-400"/>
                <h1 className="text-white font-bold text-lg flex-1">Verification Requests</h1>
                <button onClick={loadRequests} className="text-zinc-400 hover:text-white transition p-1">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''}/>
                </button>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-4">
                {/* Count pills */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                    {[['all', 'All', requests.length], ['pending', 'Pending', counts.pending], ['approved', 'Approved', counts.approved], ['denied', 'Denied', counts.denied]].map(([val, label, count]) => (
                        <button key={val} onClick={() => setFilter(val)}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition ${filter === val ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
                            {label}
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === val ? 'bg-white/20' : 'bg-zinc-800'}`}>{count}</span>
                        </button>
                    ))}
                </div>

                {/* Requests list */}
                {loading ? (
                    <div className="text-center py-16 text-zinc-500">
                        <RefreshCw size={32} className="animate-spin mx-auto mb-3 opacity-40"/>
                        <p>Loading requests...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-zinc-600">
                        <BadgeCheck size={40} className="mx-auto mb-3 opacity-30"/>
                        <p className="font-medium">No {filter === 'all' ? '' : filter} requests</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(req => {
                            const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                            const { color, bg, Icon, label } = cfg;
                            const isActing = actionId === req.user_id;
                            return (
                                <div key={req.user_id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                                    {/* User row */}
                                    <div className="flex items-center gap-3 p-4">
                                        <Link to={`/profile/${req.user_id}`} className="w-12 h-12 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0">
                                            {req.profile_pic_url
                                                ? <img src={req.profile_pic_url} className="w-full h-full object-cover"/>
                                                : <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">{req.username?.charAt(0).toUpperCase()}</div>}
                                        </Link>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <Link to={`/profile/${req.user_id}`} className="text-white font-bold hover:underline">{req.username}</Link>
                                                {req.is_verified ? <BadgeCheck size={15} className="text-blue-400"/> : null}
                                            </div>
                                            <p className="text-zinc-500 text-xs">{formatTime(req.created_at)}</p>
                                        </div>
                                        <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${bg} ${color}`}>
                                            <Icon size={11}/>
                                            {label}
                                        </div>
                                    </div>

                                    {/* Reason */}
                                    {req.reason && (
                                        <div className="px-4 pb-3">
                                            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Their reason</p>
                                            <p className="text-zinc-300 text-sm bg-zinc-950 rounded-xl p-3 border border-zinc-800 leading-relaxed">
                                                {req.reason}
                                            </p>
                                        </div>
                                    )}

                                    {/* Action feedback */}
                                    {actionMsg[req.user_id] && (
                                        <div className="px-4 pb-3">
                                            <p className="text-sm font-semibold text-center py-2 bg-zinc-950 rounded-xl border border-zinc-800"
                                                style={{color: actionMsg[req.user_id].startsWith('✅') ? '#4ade80' : actionMsg[req.user_id].startsWith('❌') ? '#f87171' : '#a1a1aa'}}>
                                                {actionMsg[req.user_id]}
                                            </p>
                                        </div>
                                    )}

                                    {/* Actions — only for pending */}
                                    {req.status === 'pending' && !actionMsg[req.user_id] && (
                                        <div className="px-4 pb-4">
                                            {isActing ? (
                                                <div className="space-y-2">
                                                    <input
                                                        value={approveReason}
                                                        onChange={e => setApproveReason(e.target.value)}
                                                        placeholder="Verification reason (e.g. Public Figure, Creator...)"
                                                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleAction(req.user_id, true)}
                                                            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-xl text-sm transition flex items-center justify-center gap-1">
                                                            <CheckCircle2 size={15}/> Approve
                                                        </button>
                                                        <button onClick={() => handleAction(req.user_id, false)}
                                                            className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold py-2 rounded-xl text-sm transition flex items-center justify-center gap-1">
                                                            <XCircle size={15}/> Deny
                                                        </button>
                                                        <button onClick={() => setActionId(null)}
                                                            className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-xl transition">
                                                            <X size={16}/>
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={() => { setActionId(req.user_id); setApproveReason(''); }}
                                                    className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-semibold py-2 rounded-xl text-sm transition">
                                                    Review Request
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Re-action for already processed */}
                                    {req.status !== 'pending' && !actionMsg[req.user_id] && (
                                        <div className="px-4 pb-4 flex gap-2">
                                            {req.status === 'denied' && (
                                                <button onClick={() => handleAction(req.user_id, true)}
                                                    className="flex-1 bg-green-700/40 hover:bg-green-700/60 border border-green-700/50 text-green-400 font-semibold py-2 rounded-xl text-sm transition">
                                                    ↩ Approve Instead
                                                </button>
                                            )}
                                            {req.status === 'approved' && (
                                                <button onClick={() => handleAction(req.user_id, false)}
                                                    className="flex-1 bg-red-700/30 hover:bg-red-700/50 border border-red-700/40 text-red-400 font-semibold py-2 rounded-xl text-sm transition">
                                                    Revoke Verification
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
