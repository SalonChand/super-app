import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Users, Trash2, UserX, UserCheck, ShieldOff, RefreshCw, Search, BadgeCheck, X } from 'lucide-react';
import axios from 'axios';

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

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [actionMsg, setActionMsg] = useState({});
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [badgePickerUserId, setBadgePickerUserId] = useState(null);
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
                            <div key={user.id} className={`bg-zinc-900 border rounded-2xl overflow-hidden transition-all ${!user.is_active ? 'border-red-500/30' : badgePickerUserId === user.id ? 'border-blue-500/30' : 'border-zinc-800'}`}>

                                {/* User info */}
                                <div className="flex items-center gap-3 p-4">
                                    {user.profile_pic_url
                                        ? <img src={user.profile_pic_url} className="w-11 h-11 rounded-full object-cover flex-shrink-0"/>
                                        : <div className="w-11 h-11 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold flex-shrink-0">{user.display_name?.[0]?.toUpperCase()}</div>
                                    }
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-white font-bold text-sm truncate">{user.display_name}</p>
                                            {user.is_verified && <BadgeCheck size={14} className={BADGE_COLOR[user.verify_type] || 'text-blue-400'}/>}
                                        </div>
                                        <p className="text-zinc-500 text-xs">@{user.username}</p>
                                        <p className="text-zinc-600 text-xs">{user.post_count} posts · {user.friend_count} friends</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                        {user.is_verified && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border
                                                ${BADGE_TYPES.find(b => b.type === user.verify_type)?.bg || 'bg-blue-500/10'}
                                                ${BADGE_TYPES.find(b => b.type === user.verify_type)?.border || 'border-blue-500/40'}
                                                ${BADGE_COLOR[user.verify_type] || 'text-blue-400'}`}>
                                                ✓ {user.verify_type || 'blue'}
                                            </span>
                                        )}
                                        {!user.is_active && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Deactivated</span>}
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
                                            <button onClick={() => setBadgePickerUserId(null)} className="text-zinc-600 hover:text-white transition p-0.5">
                                                <X size={13}/>
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {BADGE_TYPES.map(b => {
                                                const isActive = user.is_verified && user.verify_type === b.type;
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
                                        {user.is_verified && (
                                            <button onClick={() => handleRemoveBadge(user.id)}
                                                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition">
                                                <ShieldOff size={13}/> Remove Badge Entirely
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                                    <button onClick={() => handleDeactivate(user)}
                                        className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition
                                            ${user.is_active !== 0
                                                ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20'
                                                : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'}`}>
                                        {user.is_active !== 0 ? <><UserX size={13}/> Deactivate</> : <><UserCheck size={13}/> Reactivate</>}
                                    </button>

                                    <button onClick={() => setBadgePickerUserId(badgePickerUserId === user.id ? null : user.id)}
                                        className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition
                                            ${badgePickerUserId === user.id
                                                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                                                : user.is_verified
                                                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}>
                                        <BadgeCheck size={13}/>
                                        {user.is_verified ? 'Change Badge' : 'Give Badge'}
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
    );
}
