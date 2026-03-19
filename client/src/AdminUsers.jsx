import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Users, Trash2, UserX, UserCheck, ShieldOff, RefreshCw, Search, BadgeCheck, X, Eye, DollarSign, Check, XCircle } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

const BADGE_TYPES = [
    { type: 'blue',   label: 'Blue',   desc: 'Verified Account', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/40' },
    { type: 'yellow', label: 'Yellow', desc: 'Celebrity',        color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/40' },
    { type: 'green',  label: 'Green',  desc: 'Politician',       color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/40' },
    { type: 'red',    label: 'Red',    desc: 'Platform Owner',   color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/40' },
];

const BADGE_COLOR = { blue: 'text-blue-400', yellow: 'text-yellow-400', green: 'text-green-400', red: 'text-red-500' };

export default function AdminUsers() {
    const adminId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const loginUsername = localStorage.getItem('loginUsername');
    const isAdmin = userRole === 'superadmin' || loginUsername === 'superadmin' || adminId === '1';

    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [actionMsg, setActionMsg] = useState({});
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [badgePickerUserId, setBadgePickerUserId] = useState(null);
    const [activeTab, setActiveTab] = useState('users');
    const [monoApps, setMonoApps] = useState([]);
    const [monoLoading, setMonoLoading] = useState(false);
    const [monoAction, setMonoAction] = useState({});
    const [monoNote, setMonoNote] = useState({});
    const [monoTag, setMonoTag] = useState({});
    const [expandedApp, setExpandedApp] = useState(null);

    const loadMonoApps = async () => {
        setMonoLoading(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/api/admin/monetization?adminId=${adminId}`);
            setMonoApps(res.data || []);
        } catch(e) {}
        setMonoLoading(false);
    };

    const handleMonoDecision = async (userId, action) => {
        setMonoAction(p => ({...p, [userId]: 'loading'}));
        try {
            await axios.post(`${BACKEND_URL}/api/admin/monetization/${userId}`, {
                adminId, action,
                creator_tag: monoTag[userId] || 'Creator',
                admin_note: monoNote[userId] || ''
            });
            setMonoApps(p => p.map(a => a.user_id === userId ? {...a, status: action === 'approve' ? 'approved' : 'rejected', is_monetized: action === 'approve' ? 1 : 0} : a));
        } catch(e) {}
        setMonoAction(p => ({...p, [userId]: null}));
    };
    const [error, setError] = useState('');

    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/api/admin/users?adminId=${adminId}`);
            setUsers(res.data || []);
        } catch(e) { setError('Failed to load users'); }
        setLoading(false);
    };

    useEffect(() => { if (isAdmin) loadUsers(); else setError('Access denied.'); }, []);

    const msg = (userId, text) => {
        setActionMsg(p => ({ ...p, [userId]: text }));
        setTimeout(() => setActionMsg(p => { const n={...p}; delete n[userId]; return n; }), 2500);
    };

    const isVerified = (user) => user.is_verified == 1 || user.is_verified === true;

    const handleDeactivate = async (user) => {
        const deactivate = user.is_active !== 0;
        msg(user.id, 'Processing...');
        try {
            const res = await axios.post(`${BACKEND_URL}/api/admin/users/${user.id}/deactivate`, { adminId, deactivate });
            if (res.data?.success) {
                setUsers(p => p.map(u => u.id === user.id ? { ...u, is_active: deactivate ? 0 : 1 } : u));
                msg(user.id, deactivate ? '⛔ Deactivated' : '✅ Reactivated');
            }
        } catch(e) { msg(user.id, '❌ Failed'); }
    };

    const handleDelete = async (userId) => {
        try {
            await axios.delete(`${BACKEND_URL}/api/admin/users/${userId}`, { data: { adminId } });
            setUsers(p => p.filter(u => u.id !== userId));
            setConfirmDelete(null);
        } catch(e) { alert('Failed to delete'); }
    };

    const handleGiveBadge = async (userId, badgeType) => {
        msg(userId, 'Granting badge...');
        try {
            await axios.post(`${BACKEND_URL}/api/admin/verify-user`, {
                adminId, userId, approved: true, verify_type: badgeType,
                reason: BADGE_TYPES.find(b => b.type === badgeType)?.desc || 'Admin granted'
            });
            setUsers(p => p.map(u => u.id === userId ? { ...u, is_verified: 1, verify_type: badgeType } : u));
            msg(userId, `✅ ${BADGE_TYPES.find(b => b.type === badgeType)?.label} badge granted!`);
            setBadgePickerUserId(null);
        } catch(e) { msg(userId, '❌ Failed'); }
    };

    const handleRemoveBadge = async (userId) => {
        msg(userId, 'Removing...');
        try {
            await axios.post(`${BACKEND_URL}/api/admin/users/${userId}/unverify`, { adminId });
            setUsers(p => p.map(u => u.id === userId ? { ...u, is_verified: 0, verify_type: null } : u));
            msg(userId, '✅ Badge removed');
            setBadgePickerUserId(null);
        } catch(e) { msg(userId, '❌ Failed'); }
    };

    const handleDeletePosts = async (userId) => {
        if (!window.confirm('Delete ALL posts from this user?')) return;
        try {
            await axios.delete(`${BACKEND_URL}/api/admin/users/${userId}/posts`, { data: { adminId } });
            setUsers(p => p.map(u => u.id === userId ? { ...u, post_count: 0 } : u));
            msg(userId, '✅ Posts deleted');
        } catch(e) { msg(userId, '❌ Failed'); }
    };

    const filtered = users.filter(u =>
        u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-black pb-24">
            <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
                <Link to="/admin" className="text-zinc-400 hover:text-white transition"><ChevronLeft size={24}/></Link>
                <Users size={20} className="text-blue-400"/>
                <h1 className="text-white font-bold text-lg flex-1">User Management</h1>
                <button onClick={loadUsers} className="text-zinc-400 hover:text-white p-1"><RefreshCw size={18} className={loading ? 'animate-spin' : ''}/></button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-zinc-800 bg-zinc-950">
                <button onClick={() => setActiveTab('users')} className={`flex-1 py-3 text-sm font-bold border-b-2 flex items-center justify-center gap-2 transition ${activeTab === 'users' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500'}`}>
                    <Users size={14}/> Users
                </button>
                <button onClick={() => setActiveTab('monetization')} className={`flex-1 py-3 text-sm font-bold border-b-2 flex items-center justify-center gap-2 transition ${activeTab === 'monetization' ? 'border-yellow-500 text-white' : 'border-transparent text-zinc-500'}`}>
                    <DollarSign size={14}/> Monetize
                    {monoApps.filter(a => a.status === 'pending').length > 0 && (
                        <span className="bg-yellow-500 text-black text-xs font-black px-1.5 py-0.5 rounded-full">{monoApps.filter(a => a.status === 'pending').length}</span>
                    )}
                </button>
            </div>

            {activeTab === 'users' && (
            <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
                {error ? <p className="text-red-400 text-center py-10">{error}</p> : <>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, username or email..."
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-zinc-500 outline-none focus:border-blue-500/50"/>
                    </div>

                    <p className="text-zinc-600 text-xs px-1">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>

                    {loading ? <div className="text-center py-16 text-zinc-500">Loading...</div> :
                        filtered.map(user => (
                            <div key={user.id} className={`bg-zinc-900 border rounded-2xl overflow-hidden transition-all ${user.is_active == 0 ? 'border-red-500/30' : badgePickerUserId === user.id ? 'border-blue-500/30' : 'border-zinc-800'}`}>

                                {/* User info */}
                                <div className="flex items-center gap-3 p-4">
                                    {user.profile_pic_url
                                        ? <img src={user.profile_pic_url} className="w-11 h-11 rounded-full object-cover flex-shrink-0"/>
                                        : <div className="w-11 h-11 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold flex-shrink-0">{user.display_name?.[0]?.toUpperCase()}</div>
                                    }
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-white font-bold text-sm truncate">{user.display_name}</p>
                                            {isVerified(user) && <BadgeCheck size={14} className={BADGE_COLOR[user.verify_type] || 'text-blue-400'}/>}
                                        </div>
                                        <p className="text-zinc-500 text-xs">@{user.username}</p>
                                        <p className="text-zinc-600 text-xs">{user.post_count} posts · {user.friend_count} friends</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                        {isVerified(user) && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border
                                                ${BADGE_TYPES.find(b => b.type === user.verify_type)?.bg || 'bg-blue-500/10'}
                                                ${BADGE_TYPES.find(b => b.type === user.verify_type)?.border || 'border-blue-500/40'}
                                                ${BADGE_COLOR[user.verify_type] || 'text-blue-400'}`}>
                                                ✓ {user.verify_type || 'blue'}
                                            </span>
                                        )}
                                        {user.is_active == 0 && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Deactivated</span>}
                                    </div>
                                </div>

                                {/* Status message */}
                                {actionMsg[user.id] && (
                                    <p className={`text-xs text-center py-1.5 font-semibold
                                        ${actionMsg[user.id].startsWith('✅') ? 'text-green-400 bg-green-500/5'
                                        : actionMsg[user.id].startsWith('⛔') ? 'text-orange-400 bg-orange-500/5'
                                        : 'text-zinc-400 bg-zinc-800/50'}`}>
                                        {actionMsg[user.id]}
                                    </p>
                                )}

                                {/* Badge Picker Panel */}
                                {badgePickerUserId === user.id && (
                                    <div className="mx-4 mb-3 bg-zinc-950 border border-zinc-700 rounded-2xl p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                <BadgeCheck size={12}/> Assign Badge
                                            </p>
                                            <button onClick={() => setBadgePickerUserId(null)} className="text-zinc-600 hover:text-white transition">
                                                <X size={13}/>
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {BADGE_TYPES.map(b => {
                                                const isActive = isVerified(user) && user.verify_type === b.type;
                                                return (
                                                    <button key={b.type} onClick={() => handleGiveBadge(user.id, b.type)}
                                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition
                                                            ${isActive ? `${b.bg} ${b.border}` : 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800'}`}>
                                                        <BadgeCheck size={16} className={b.color}/>
                                                        <div className="min-w-0 flex-1">
                                                            <p className={`text-xs font-bold ${b.color}`}>{b.label}</p>
                                                            <p className="text-[10px] text-zinc-500 truncate">{b.desc}</p>
                                                        </div>
                                                        {isActive && <span className="text-[9px] font-bold text-zinc-400 flex-shrink-0">ON</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {isVerified(user) && (
                                            <button onClick={() => handleRemoveBadge(user.id)}
                                                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition">
                                                <ShieldOff size={13}/> Remove Badge Entirely
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                                    <button onClick={() => navigate(`/admin/users/${user.id}/profile`)}
                                        className="col-span-2 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition">
                                        <Eye size={13}/> View Full Profile & Private Info
                                    </button>
                                    <button onClick={() => handleDeactivate(user)}
                                        className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition
                                            ${user.is_active != 0
                                                ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20'
                                                : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'}`}>
                                        {user.is_active != 0 ? <><UserX size={13}/> Deactivate</> : <><UserCheck size={13}/> Reactivate</>}
                                    </button>

                                    <button onClick={() => setBadgePickerUserId(badgePickerUserId === user.id ? null : user.id)}
                                        className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition
                                            ${badgePickerUserId === user.id
                                                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                                                : isVerified(user)
                                                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}>
                                        <BadgeCheck size={13}/>
                                        {isVerified(user) ? 'Change Badge' : 'Give Badge'}
                                    </button>

                                    <button onClick={() => handleDeletePosts(user.id)}
                                        className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-700 transition">
                                        <Trash2 size={13}/> Delete Posts
                                    </button>

                                    <button onClick={() => setConfirmDelete(user.id)}
                                        className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 transition">
                                        <Trash2 size={13}/> Delete Account
                                    </button>
                                </div>
                            </div>
                        ))
                    }
                </>}
            </div>

            {/* Delete confirm modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
                    <div className="bg-zinc-900 border border-red-500/40 rounded-2xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto"><Trash2 size={22} className="text-red-400"/></div>
                        <h2 className="text-white font-bold text-lg text-center">Delete Account?</h2>
                        <p className="text-zinc-400 text-sm text-center">This permanently deletes the user and all their data. Cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-white text-sm font-semibold">Cancel</button>
                            <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
            )}

            {/* Monetization Tab */}
            {activeTab === 'monetization' && (
                <div className="p-4 space-y-3 max-w-2xl mx-auto">
                    {monoLoading ? (
                        <div className="text-center py-12 text-zinc-500 text-sm">Loading applications...</div>
                    ) : monoApps.length === 0 ? (
                        <div className="text-center py-12 text-zinc-600">
                            <DollarSign size={32} className="mx-auto mb-3 opacity-30"/>
                            <p className="font-semibold text-sm">No monetization applications yet</p>
                        </div>
                    ) : monoApps.map(app => (
                        <div key={app.user_id} className={`bg-zinc-900/60 border rounded-2xl overflow-hidden ${app.status === 'pending' ? 'border-yellow-500/30' : app.status === 'approved' ? 'border-green-500/30' : 'border-zinc-800'}`}>
                            <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setExpandedApp(expandedApp === app.user_id ? null : app.user_id)}>
                                <div className="w-11 h-11 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
                                    {app.profile_pic_url ? <img src={app.profile_pic_url} className="w-full h-full object-cover"/> : <span className="flex items-center justify-center h-full text-white font-bold">{app.username?.charAt(0).toUpperCase()}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold text-sm">{app.username}</p>
                                    <p className="text-zinc-500 text-xs">{app.email}</p>
                                    <p className="text-zinc-600 text-xs mt-0.5">Applied {new Date(app.applied_at).toLocaleDateString()}</p>
                                </div>
                                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : app.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {app.status.toUpperCase()}
                                </span>
                            </div>
                            {expandedApp === app.user_id && (
                                <div className="px-4 pb-4 border-t border-zinc-800 pt-3 space-y-3">
                                    <div className="grid grid-cols-3 gap-2">
                                        {[{label:'Posts',value:app.post_count},{label:'Likes',value:app.total_likes},{label:'Followers',value:app.follower_count}].map(s => (
                                            <div key={s.label} className="bg-zinc-800/60 rounded-xl p-2.5 text-center">
                                                <p className="text-white font-black text-sm">{s.value || 0}</p>
                                                <p className="text-zinc-500 text-xs">{s.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <Link to={`/admin/users/${app.user_id}/profile`} className="flex items-center gap-2 text-sky-400 text-sm font-semibold hover:text-sky-300 transition">
                                        <Eye size={14}/> View Full Profile & Stats
                                    </Link>
                                    {app.status === 'pending' && (
                                        <div className="space-y-2">
                                            <input value={monoTag[app.user_id] || ''} onChange={e => setMonoTag(p => ({...p, [app.user_id]: e.target.value}))}
                                                placeholder="Creator tag (e.g. Top Creator)"
                                                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-yellow-500/60"/>
                                            <textarea value={monoNote[app.user_id] || ''} onChange={e => setMonoNote(p => ({...p, [app.user_id]: e.target.value}))}
                                                placeholder="Note to user (shown on rejection)..." rows={2}
                                                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm outline-none resize-none"/>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleMonoDecision(app.user_id, 'approve')} disabled={monoAction[app.user_id] === 'loading'}
                                                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition text-sm disabled:opacity-50">
                                                    <Check size={15}/> Approve
                                                </button>
                                                <button onClick={() => handleMonoDecision(app.user_id, 'reject')} disabled={monoAction[app.user_id] === 'loading'}
                                                    className="flex-1 flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl transition text-sm disabled:opacity-50">
                                                    <XCircle size={15}/> Reject
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
