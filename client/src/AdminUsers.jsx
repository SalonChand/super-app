import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Users, Trash2, UserX, UserCheck, ShieldOff, RefreshCw, Search } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

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

    const handleUnverify = async (userId) => {
        try {
            await axios.post(`${BACKEND_URL}/api/admin/users/${userId}/unverify`, { adminId });
            setUsers(p => p.map(u => u.id === userId ? { ...u, is_verified: 0, verify_type: null } : u));
            msg(userId, '✅ Badge removed');
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
                            <div key={user.id} className={`bg-zinc-900 border rounded-2xl overflow-hidden ${!user.is_active ? 'border-red-500/30' : 'border-zinc-800'}`}>
                                <div className="flex items-center gap-3 p-4">
                                    {user.profile_pic_url
                                        ? <img src={user.profile_pic_url} className="w-11 h-11 rounded-full object-cover flex-shrink-0"/>
                                        : <div className="w-11 h-11 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold flex-shrink-0">{user.display_name?.[0]?.toUpperCase()}</div>
                                    }
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-bold text-sm truncate">{user.display_name}</p>
                                        <p className="text-zinc-500 text-xs">@{user.username}</p>
                                        <p className="text-zinc-600 text-xs">{user.post_count} posts · {user.friend_count} friends</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {user.is_verified && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">✓ {user.verify_type || 'blue'}</span>}
                                        {!user.is_active && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Deactivated</span>}
                                    </div>
                                </div>

                                {actionMsg[user.id] && <p className={`text-xs text-center py-1.5 font-semibold ${actionMsg[user.id].startsWith('✅') ? 'text-green-400 bg-green-500/5' : actionMsg[user.id].startsWith('⛔') ? 'text-orange-400 bg-orange-500/5' : 'text-red-400 bg-red-500/5'}`}>{actionMsg[user.id]}</p>}

                                <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                                    <button onClick={() => handleDeactivate(user)}
                                        className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition ${user.is_active !== 0 ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20' : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'}`}>
                                        {user.is_active !== 0 ? <><UserX size={13}/> Deactivate</> : <><UserCheck size={13}/> Reactivate</>}
                                    </button>
                                    {user.is_verified
                                        ? <button onClick={() => handleUnverify(user.id)} className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-700 transition"><ShieldOff size={13}/> Remove Badge</button>
                                        : <button onClick={() => handleDeletePosts(user.id)} className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-700 transition"><Trash2 size={13}/> Delete Posts</button>
                                    }
                                    <button onClick={() => setConfirmDelete(user.id)}
                                        className="col-span-2 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 transition">
                                        <Trash2 size={13}/> Delete Account Permanently
                                    </button>
                                </div>
                            </div>
                        ))
                    }
                </>}
            </div>

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
