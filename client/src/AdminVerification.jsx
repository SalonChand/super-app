import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { BadgeCheck, X, ChevronLeft, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Settings } from 'lucide-react';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

function formatTime(d) {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const TYPE_CONFIG = {
    blue:   { color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30',     label: 'Blue',   desc: 'General — ID proof required' },
    yellow: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', label: 'Yellow', desc: 'Celebrity / Public figure' },
    green:  { color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/30',   label: 'Green',  desc: 'Politician / Government' },
    red:    { color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30',       label: 'Red',    desc: 'Official / Platform staff' },
};
const STATUS_CONFIG = {
    pending:  { color: 'text-yellow-400', Icon: Clock,        label: 'Pending' },
    approved: { color: 'text-green-400',  Icon: CheckCircle2, label: 'Approved' },
    denied:   { color: 'text-red-400',    Icon: XCircle,      label: 'Denied' },
};

export default function AdminVerification() {
    const adminId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const username = localStorage.getItem('username');
    const loginUsername = localStorage.getItem('loginUsername');

    const [requests, setRequests] = useState([]);
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('pending');
    const [typeFilter, setTypeFilter] = useState('all');
    const [actionId, setActionId] = useState(null);
    const [actionType, setActionType] = useState('blue');
    const [actionReason, setActionReason] = useState('');
    const [actionMsg, setActionMsg] = useState({});
    const [showSlotEditor, setShowSlotEditor] = useState(false);
    const [editSlot, setEditSlot] = useState({});
    const [slotMsg, setSlotMsg] = useState('');

    const loadData = async () => {
        setLoading(true); setError('');
        try {
            const [reqRes, slotRes] = await Promise.all([
                axios.get(`${BACKEND_URL}/api/admin/verification-requests?adminId=${adminId}`),
                axios.get(`${BACKEND_URL}/api/admin/verification-slots?adminId=${adminId}`).catch(() => ({ data: [] })),
            ]);
            if (Array.isArray(reqRes.data)) setRequests(reqRes.data);
            else setError(reqRes.data?.error || 'Access denied.');
            if (Array.isArray(slotRes.data)) setSlots(slotRes.data);
        } catch(e) { setError(e?.response?.data?.error || 'Could not load.'); }
        setLoading(false);
    };

    useEffect(() => {
        const isAdmin = userRole === 'superadmin' || loginUsername === 'superadmin' || username === 'superadmin' || adminId === '1';
        if (!isAdmin) {
            setError('Access denied.'); setLoading(false); return;
        }
        loadData();
    }, []);

    const handleAction = async (userId, approved, vt) => {
        const type = vt || actionType;
        setActionMsg(prev => ({ ...prev, [userId]: 'Processing...' }));
        try {
            const res = await axios.post(`${BACKEND_URL}/api/admin/verify-user`, {
                adminId, userId, approved, verify_type: type,
                reason: actionReason || (approved ? TYPE_CONFIG[type]?.desc : 'Request denied'),
            });
            if (res.data?.success) {
                setActionMsg(prev => ({ ...prev, [userId]: approved ? '✅ ' + TYPE_CONFIG[type]?.label + ' badge granted!' : '❌ Denied' }));
                setActionId(null); setActionReason(''); setActionType('blue');
                setTimeout(() => { loadData(); setActionMsg(prev => { const n={...prev}; delete n[userId]; return n; }); }, 1800);
            } else setActionMsg(prev => ({ ...prev, [userId]: '❌ ' + (res.data?.error || 'Error') }));
        } catch(e) { setActionMsg(prev => ({ ...prev, [userId]: '❌ ' + (e?.response?.data?.error || 'Network error') })); }
    };

    const saveSlot = async (type) => {
        const val = parseInt(editSlot[type]);
        if (isNaN(val) || val < 0) { setSlotMsg('Invalid number'); return; }
        setSlotMsg('Saving...');
        try {
            await axios.put(`${BACKEND_URL}/api/admin/verification-slots`, { adminId, type, total_slots: val });
            setSlotMsg('✅ Saved!'); loadData();
            setTimeout(() => setSlotMsg(''), 2000);
        } catch(e) { setSlotMsg('❌ Failed'); }
    };

    const blueSlot = slots.find(s => s.type === 'blue');
    const blueUsed = blueSlot?.used_slots || 0;
    const blueTotal = blueSlot?.total_slots || 50;
    const blueRemaining = blueTotal - blueUsed;

    const filtered = requests.filter(r =>
        (filter === 'all' || r.status === filter) &&
        (typeFilter === 'all' || (r.verify_type || 'blue') === typeFilter)
    );
    const counts = {
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        denied: requests.filter(r => r.status === 'denied').length,
    };

    if (error) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle size={48} className="text-red-400 mb-4"/>
            <h2 className="text-white font-bold text-xl mb-2">Access Denied</h2>
            <p className="text-zinc-400 text-sm">{error}</p>
            <Link to="/" className="mt-6 text-blue-400 text-sm hover:underline">Go Home</Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-black pb-24">
            <div className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
                <Link to="/settings" className="text-zinc-400 hover:text-white transition"><ChevronLeft size={24}/></Link>
                <BadgeCheck size={22} className="text-yellow-400"/>
                <h1 className="text-white font-bold text-lg flex-1">Verification Panel</h1>
                <button onClick={() => setShowSlotEditor(!showSlotEditor)} className={`p-1 transition ${showSlotEditor ? 'text-yellow-400' : 'text-zinc-400 hover:text-white'}`}><Settings size={18}/></button>
                <button onClick={loadData} className="text-zinc-400 hover:text-white transition p-1"><RefreshCw size={18} className={loading ? 'animate-spin' : ''}/></button>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

                <div className="bg-zinc-900 border border-blue-500/30 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <BadgeCheck size={18} className="text-blue-400"/>
                            <span className="text-white font-bold text-sm">Blue Badge Giveaway</span>
                        </div>
                        <span className={`text-sm font-bold ${blueRemaining <= 5 ? 'text-red-400' : 'text-blue-400'}`}>{blueRemaining}/{blueTotal} left</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100,(blueUsed/blueTotal)*100)}%` }}/>
                    </div>
                    <p className="text-zinc-500 text-xs mt-1">{blueUsed} claimed · {blueRemaining === 0 ? '🔒 Giveaway closed' : `${blueRemaining} spots open`}</p>
                </div>

                {showSlotEditor && (
                    <div className="bg-zinc-900 border border-yellow-500/30 rounded-2xl p-4 space-y-3">
                        <h3 className="text-white font-bold text-sm flex items-center gap-2"><Settings size={14} className="text-yellow-400"/> Adjust Blue Badge Slots</h3>
                        {['blue'].map(type => {
                            const s = slots.find(sl => sl.type === type);
                            return (
                                <div key={type} className="flex items-center gap-3">
                                    <BadgeCheck size={14} className={TYPE_CONFIG[type].color}/>
                                    <span className="text-zinc-300 text-sm flex-1">{TYPE_CONFIG[type].label}</span>
                                    <span className="text-zinc-500 text-xs">{s?.used_slots || 0} used</span>
                                    <input type="number" min="0"
                                        value={editSlot[type] !== undefined ? editSlot[type] : (s?.total_slots || 50)}
                                        onChange={e => setEditSlot(p => ({ ...p, [type]: e.target.value }))}
                                        className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-white text-sm text-center outline-none focus:border-yellow-500"/>
                                    <button onClick={() => saveSlot(type)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-3 py-1 rounded-lg text-xs">Save</button>
                                </div>
                            );
                        })}
                        {slotMsg && <p className={`text-xs ${slotMsg.startsWith('✅') ? 'text-green-400' : slotMsg.startsWith('❌') ? 'text-red-400' : 'text-zinc-400'}`}>{slotMsg}</p>}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
                        <button key={type} onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${typeFilter === type ? cfg.bg + ' ring-1 ring-white/20' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}>
                            <BadgeCheck size={15} className={cfg.color}/>
                            <div>
                                <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
                                <p className="text-zinc-500 text-xs leading-tight">{cfg.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                    {[['all','All',requests.length],['pending','Pending',counts.pending],['approved','Approved',counts.approved],['denied','Denied',counts.denied]].map(([val,label,count]) => (
                        <button key={val} onClick={() => setFilter(val)}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition ${filter === val ? 'bg-yellow-500 border-yellow-400 text-black' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
                            {label}
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === val ? 'bg-black/20' : 'bg-zinc-800'}`}>{count}</span>
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center py-16"><RefreshCw size={28} className="animate-spin mx-auto mb-3 text-zinc-600"/></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-zinc-600"><BadgeCheck size={36} className="mx-auto mb-3 opacity-30"/><p>No {filter === 'all' ? '' : filter} requests</p></div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(req => {
                            const vtype = req.verify_type || 'blue';
                            const tcfg = TYPE_CONFIG[vtype] || TYPE_CONFIG.blue;
                            const scfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                            const { Icon } = scfg;
                            const isActing = actionId === req.user_id;
                            return (
                                <div key={req.user_id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                                    <div className="flex items-center gap-3 p4">
                                        <Link to={`/profile/${req.user_id}`} className="w-11 h-11 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0 ml-4 mt-4">
                                            {req.profile_pic_url ? <img src={req.profile_pic_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-white font-bold">{req.username?.charAt(0).toUpperCase()}</div>}
                                        </Link>
                                        <div className="flex-1 min-w-0 pt-4">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <Link to={`/profile/${req.user_id}`} className="text-white font-bold hover:underline text-sm">{req.username}</Link>
                                                {!!req.is_verified && <BadgeCheck size={13} className={TYPE_CONFIG[req.verify_type || 'blue']?.color || 'text-blue-400'}/>}
                                                <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${tcfg.bg} ${tcfg.color}`}>{tcfg.label}</span>
                                            </div>
                                            <p className="text-zinc-500 text-xs">{formatTime(req.created_at)}</p>
                                        </div>
                                        <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-zinc-800 mr-4 mt-4 ${scfg.color}`}>
                                            <Icon size={10}/>{scfg.label}
                                        </div>
                                    </div>

                                    {req.reason && (
                                        <div className="px-4 pb-2 pt-2">
                                            <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">Their reason</p>
                                            <p className="text-zinc-300 text-sm bg-zinc-950 rounded-xl p-3 border border-zinc-800">{req.reason}</p>
                                        </div>
                                    )}
                                    {req.proof_url && (
                                        <div className="px-4 pb-2">
                                            <a href={req.proof_url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline">🔗 View submitted proof</a>
                                        </div>
                                    )}
                                    {actionMsg[req.user_id] && (
                                        <div className="px-4 pb-3">
                                            <p className={`text-sm font-semibold text-center py-2 rounded-xl border border-zinc-800 bg-zinc-950 ${actionMsg[req.user_id].startsWith('✅') ? 'text-green-400' : actionMsg[req.user_id].startsWith('❌') ? 'text-red-400' : 'text-zinc-400'}`}>{actionMsg[req.user_id]}</p>
                                        </div>
                                    )}

                                    {req.status === 'pending' && !actionMsg[req.user_id] && (
                                        <div className="px-4 pb-4">
                                            {isActing ? (
                                                <div className="space-y-2">
                                                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Badge type</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
                                                            <button key={type} onClick={() => setActionType(type)}
                                                                className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm font-semibold transition ${actionType === type ? `${cfg.bg} ${cfg.color}` : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}>
                                                                <BadgeCheck size={13} className={actionType === type ? cfg.color : 'text-zinc-600'}/>{cfg.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <input value={actionReason} onChange={e => setActionReason(e.target.value)}
                                                        placeholder={`Reason (e.g. ${TYPE_CONFIG[actionType]?.desc})`}
                                                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-yellow-500"/>
                                                    {actionType === 'blue' && blueRemaining <= 10 && (
                                                        <p className={`text-xs text-center font-semibold ${blueRemaining === 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                                                            {blueRemaining === 0 ? '⚠️ No blue slots left!' : `⚠️ Only ${blueRemaining} blue slots remaining`}
                                                        </p>
                                                    )}
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleAction(req.user_id, true, actionType)}
                                                            className={`flex-1 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5 border ${tcfg.bg} ${tcfg.color} ${tcfg.bg.replace('bg-','border-').replace('/10','/50')}`}>
                                                            <BadgeCheck size={14}/> Approve {actionType}
                                                        </button>
                                                        <button onClick={() => handleAction(req.user_id, false, actionType)}
                                                            className="flex-1 bg-red-700/30 hover:bg-red-700/50 border border-red-700/40 text-red-400 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1">
                                                            <XCircle size={14}/> Deny
                                                        </button>
                                                        <button onClick={() => { setActionId(null); setActionReason(''); }} className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-xl"><X size={16}/></button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={() => { setActionId(req.user_id); setActionType(req.verify_type || 'blue'); setActionReason(''); }}
                                                    className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-semibold py-2 rounded-xl text-sm">
                                                    Review Request
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {req.status !== 'pending' && !actionMsg[req.user_id] && (
                                        <div className="px-4 pb-4 flex gap-2">
                                            {req.status === 'denied' && (
                                                <button onClick={() => { setActionId(req.user_id); setActionType(req.verify_type || 'blue'); }}
                                                    className="flex-1 bg-green-700/30 hover:bg-green-700/50 border border-green-700/40 text-green-400 font-semibold py-2 rounded-xl text-sm">
                                                    ↩ Approve Instead
                                                </button>
                                            )}
                                            {req.status === 'approved' && (
                                                <button onClick={() => handleAction(req.user_id, false, req.verify_type)}
                                                    className="flex-1 bg-red-700/30 hover:bg-red-700/50 border border-red-700/40 text-red-400 font-semibold py-2 rounded-xl text-sm">
                                                    Revoke Badge
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
