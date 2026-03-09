import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Zap, Megaphone, Pin, VolumeX, Ghost, Send, Trash2, RefreshCw, Search, CheckCircle, X, Clock, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

const BROADCAST_TYPES = [
    { value: 'info',    label: '📢 Announcement', color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30' },
    { value: 'warning', label: '⚠️ Warning',       color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
    { value: 'success', label: '✅ Good News',      color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/30' },
    { value: 'urgent',  label: '🚨 Urgent',         color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30' },
];

export default function AdminPowers() {
    const adminId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const loginUsername = localStorage.getItem('loginUsername');
    const isAdmin = userRole === 'superadmin' || loginUsername === 'superadmin' || adminId === '1';

    const [tab, setTab] = useState('broadcast');

    // Broadcast
    const [broadcasts, setBroadcasts] = useState([]);
    const [bTitle, setBTitle] = useState('');
    const [bMessage, setBMessage] = useState('');
    const [bType, setBType] = useState('info');
    const [bSending, setBSending] = useState(false);
    const [bMsg, setBMsg] = useState('');

    // Pin post
    const [pinPostId, setPinPostId] = useState('');
    const [pinnedPost, setPinnedPost] = useState(null);
    const [pinMsg, setPinMsg] = useState('');
    const [pinLoading, setPinLoading] = useState(false);

    // Users (silence + shadowban)
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [silenceDays, setSilenceDays] = useState({});
    const [userMsg, setUserMsg] = useState({});

    const setMsg = (id, text) => {
        setUserMsg(p => ({ ...p, [id]: text }));
        setTimeout(() => setUserMsg(p => { const n = {...p}; delete n[id]; return n; }), 2500);
    };

    useEffect(() => {
        if (!isAdmin) return;
        loadBroadcasts();
        loadPinnedPost();
    }, []);

    useEffect(() => {
        if (tab === 'silence' || tab === 'shadowban') loadUsers();
    }, [tab]);

    const loadBroadcasts = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/api/admin/broadcasts?adminId=${adminId}`);
            setBroadcasts(res.data || []);
        } catch(e) {}
    };

    const loadPinnedPost = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/api/posts?userId=${adminId}`);
            const pinned = (res.data || []).find(p => p.is_pinned_global);
            setPinnedPost(pinned || null);
        } catch(e) {}
    };

    const loadUsers = async () => {
        if (users.length > 0) return;
        setUsersLoading(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/api/admin/users?adminId=${adminId}`);
            setUsers(res.data || []);
        } catch(e) {}
        setUsersLoading(false);
    };

    const sendBroadcast = async () => {
        if (!bTitle.trim() || !bMessage.trim()) { setBMsg('⚠️ Title and message required'); return; }
        setBSending(true); setBMsg('Sending to all users...');
        try {
            await axios.post(`${BACKEND_URL}/api/admin/broadcast`, { adminId, title: bTitle, message: bMessage, type: bType });
            setBMsg('✅ Broadcast sent to all users!');
            setBTitle(''); setBMessage(''); setBType('info');
            loadBroadcasts();
        } catch(e) { setBMsg('❌ Failed to send'); }
        setBSending(false);
        setTimeout(() => setBMsg(''), 3000);
    };

    const deleteBroadcast = async (id) => {
        try {
            await axios.delete(`${BACKEND_URL}/api/admin/broadcasts/${id}`, { data: { adminId } });
            setBroadcasts(p => p.filter(b => b.id !== id));
        } catch(e) {}
    };

    const pinPost = async () => {
        if (!pinPostId.trim()) return;
        setPinLoading(true); setPinMsg('Pinning...');
        try {
            await axios.post(`${BACKEND_URL}/api/admin/posts/${pinPostId}/pin`, { adminId });
            setPinMsg('✅ Post pinned to top of all feeds!');
            setPinPostId('');
            loadPinnedPost();
        } catch(e) { setPinMsg('❌ Failed — check post ID'); }
        setPinLoading(false);
        setTimeout(() => setPinMsg(''), 3000);
    };

    const unpinPost = async () => {
        if (!pinnedPost) return;
        try {
            await axios.post(`${BACKEND_URL}/api/admin/posts/${pinnedPost.id}/unpin`, { adminId });
            setPinnedPost(null);
            setPinMsg('✅ Post unpinned');
            setTimeout(() => setPinMsg(''), 2000);
        } catch(e) {}
    };

    const silenceUser = async (userId, days) => {
        setMsg(userId, 'Processing...');
        try {
            await axios.post(`${BACKEND_URL}/api/admin/users/${userId}/silence`, { adminId, days: parseInt(days) });
            setUsers(p => p.map(u => u.id === userId ? { ...u, silenced_until: days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null } : u));
            setMsg(userId, days > 0 ? `🔇 Silenced for ${days} day${days > 1 ? 's' : ''}` : '✅ Silence removed');
        } catch(e) { setMsg(userId, '❌ Failed'); }
    };

    const toggleShadowban = async (user) => {
        const newVal = !user.shadowbanned;
        setMsg(user.id, 'Processing...');
        try {
            await axios.post(`${BACKEND_URL}/api/admin/users/${user.id}/shadowban`, { adminId, shadowban: newVal });
            setUsers(p => p.map(u => u.id === user.id ? { ...u, shadowbanned: newVal } : u));
            setMsg(user.id, newVal ? '👻 Shadowbanned' : '✅ Shadowban removed');
        } catch(e) { setMsg(user.id, '❌ Failed'); }
    };

    const isSilenced = (user) => user.silenced_until && new Date(user.silenced_until) > new Date();

    const filteredUsers = users.filter(u =>
        u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.display_name?.toLowerCase().includes(userSearch.toLowerCase())
    );

    const tabs = [
        { id: 'broadcast', icon: Megaphone, label: 'Broadcast',  color: 'text-blue-400',   active: 'border-blue-400 text-blue-400' },
        { id: 'pin',       icon: Pin,       label: 'Pin Post',   color: 'text-yellow-400', active: 'border-yellow-400 text-yellow-400' },
        { id: 'silence',   icon: VolumeX,   label: 'Silence',    color: 'text-orange-400', active: 'border-orange-400 text-orange-400' },
        { id: 'shadowban', icon: Ghost,      label: 'Shadowban',  color: 'text-purple-400', active: 'border-purple-400 text-purple-400' },
    ];

    if (!isAdmin) return <div className="min-h-screen bg-black flex items-center justify-center"><p className="text-red-400 font-bold">Access Denied</p></div>;

    return (
        <div className="min-h-screen bg-black pb-24">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
                <Link to="/admin" className="text-zinc-400 hover:text-white transition"><ChevronLeft size={24}/></Link>
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-500/30 to-red-500/30 border border-yellow-500/40 flex items-center justify-center">
                    <Zap size={14} className="text-yellow-400"/>
                </div>
                <h1 className="text-white font-bold text-lg flex-1">Admin Powers</h1>
            </div>

            {/* Tab Bar */}
            <div className="flex border-b border-zinc-800 bg-zinc-950 overflow-x-auto">
                {tabs.map(({ id, icon: Icon, label, active }) => (
                    <button key={id} onClick={() => setTab(id)}
                        className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 flex-shrink-0 transition ${tab === id ? active : 'border-transparent text-zinc-500 hover:text-white'}`}>
                        <Icon size={14}/> {label}
                    </button>
                ))}
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

                {/* ===== BROADCAST TAB ===== */}
                {tab === 'broadcast' && (
                    <>
                        <div className="bg-zinc-900 border border-blue-500/20 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Megaphone size={16} className="text-blue-400"/>
                                <p className="text-white font-bold text-sm">Send Announcement</p>
                                <p className="text-zinc-500 text-xs ml-auto">All users notified</p>
                            </div>

                            {/* Type selector */}
                            <div className="grid grid-cols-2 gap-2">
                                {BROADCAST_TYPES.map(t => (
                                    <button key={t.value} onClick={() => setBType(t.value)}
                                        className={`text-xs font-semibold py-2 px-3 rounded-xl border transition text-left ${bType === t.value ? t.bg + ' ' + t.color : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            <input value={bTitle} onChange={e => setBTitle(e.target.value)}
                                placeholder="Title (e.g. App Update, New Feature...)"
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-500 outline-none focus:border-blue-500/50"/>

                            <textarea value={bMessage} onChange={e => setBMessage(e.target.value)}
                                placeholder="Write your message to all users..."
                                rows={3}
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-500 outline-none focus:border-blue-500/50 resize-none"/>

                            {bMsg && <p className={`text-xs font-semibold text-center ${bMsg.startsWith('✅') ? 'text-green-400' : bMsg.startsWith('❌') ? 'text-red-400' : 'text-zinc-400'}`}>{bMsg}</p>}

                            <button onClick={sendBroadcast} disabled={bSending}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition disabled:opacity-50">
                                <Send size={15}/> {bSending ? 'Sending...' : 'Send to All Users'}
                            </button>
                        </div>

                        {/* Broadcast history */}
                        {broadcasts.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider px-1">Recent Broadcasts</p>
                                {broadcasts.map(b => {
                                    const bt = BROADCAST_TYPES.find(t => t.value === b.type) || BROADCAST_TYPES[0];
                                    return (
                                        <div key={b.id} className={`rounded-2xl border p-4 ${bt.bg}`}>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-bold text-sm ${bt.color}`}>{b.title}</p>
                                                    <p className="text-zinc-300 text-xs mt-1">{b.message}</p>
                                                    <p className="text-zinc-600 text-[10px] mt-1">{new Date(b.created_at).toLocaleString()}</p>
                                                </div>
                                                <button onClick={() => deleteBroadcast(b.id)} className="text-zinc-600 hover:text-red-400 transition flex-shrink-0 p-1">
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* ===== PIN POST TAB ===== */}
                {tab === 'pin' && (
                    <>
                        {/* Currently pinned */}
                        {pinnedPost && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Pin size={14} className="text-yellow-400 fill-yellow-400"/>
                                    <p className="text-yellow-400 font-bold text-xs uppercase tracking-wider">Currently Pinned</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-semibold text-sm">@{pinnedPost.username}</p>
                                        <p className="text-zinc-400 text-xs mt-1 line-clamp-2">{pinnedPost.content}</p>
                                        <p className="text-zinc-600 text-[10px] mt-1">Post ID: {pinnedPost.id}</p>
                                    </div>
                                    {pinnedPost.image_url && <img src={pinnedPost.image_url} className="w-14 h-14 rounded-xl object-cover flex-shrink-0"/>}
                                </div>
                                <button onClick={unpinPost} className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition">
                                    <X size={13}/> Unpin This Post
                                </button>
                            </div>
                        )}

                        <div className="bg-zinc-900 border border-yellow-500/20 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Pin size={16} className="text-yellow-400"/>
                                <p className="text-white font-bold text-sm">Pin a Post Globally</p>
                            </div>
                            <p className="text-zinc-500 text-xs">The pinned post appears at the very top of everyone's feed with a 📌 badge.</p>
                            <div className="flex gap-2">
                                <input value={pinPostId} onChange={e => setPinPostId(e.target.value)}
                                    placeholder="Enter Post ID..."
                                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-500 outline-none focus:border-yellow-500/50"/>
                                <button onClick={pinPost} disabled={pinLoading || !pinPostId.trim()}
                                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 rounded-xl transition disabled:opacity-50 text-sm">
                                    {pinLoading ? '...' : 'Pin'}
                                </button>
                            </div>
                            <p className="text-zinc-600 text-xs">💡 Find the Post ID by looking at the URL or post analytics</p>
                            {pinMsg && <p className={`text-xs font-semibold text-center ${pinMsg.startsWith('✅') ? 'text-green-400' : pinMsg.startsWith('❌') ? 'text-red-400' : 'text-zinc-400'}`}>{pinMsg}</p>}
                        </div>
                    </>
                )}

                {/* ===== SILENCE TAB ===== */}
                {tab === 'silence' && (
                    <>
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <VolumeX size={15} className="text-orange-400"/>
                                <p className="text-orange-400 font-bold text-sm">Silence a User</p>
                            </div>
                            <p className="text-zinc-500 text-xs">Silenced users cannot create posts, comments or reels for the set duration. They can still view content and send messages.</p>
                        </div>

                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                            <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                                placeholder="Search users..."
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-zinc-500 outline-none focus:border-orange-500/50"/>
                        </div>

                        {usersLoading ? <div className="text-center py-10 text-zinc-500">Loading users...</div> : (
                            <div className="space-y-2">
                                {filteredUsers.map(user => (
                                    <div key={user.id} className={`bg-zinc-900 border rounded-2xl p-4 space-y-3 ${isSilenced(user) ? 'border-orange-500/30' : 'border-zinc-800'}`}>
                                        <div className="flex items-center gap-3">
                                            {user.profile_pic_url
                                                ? <img src={user.profile_pic_url} className="w-10 h-10 rounded-full object-cover flex-shrink-0"/>
                                                : <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold flex-shrink-0">{user.display_name?.[0]?.toUpperCase()}</div>}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-bold text-sm truncate">{user.display_name}</p>
                                                <p className="text-zinc-500 text-xs">@{user.username}</p>
                                                {isSilenced(user) && (
                                                    <p className="text-orange-400 text-xs flex items-center gap-1 mt-0.5">
                                                        <Clock size={10}/> Silenced until {new Date(user.silenced_until).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                            {isSilenced(user) && <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30 flex-shrink-0">🔇 Silenced</span>}
                                        </div>
                                        {userMsg[user.id] && <p className="text-xs text-center font-semibold text-orange-400">{userMsg[user.id]}</p>}
                                        <div className="flex gap-2">
                                            {[1, 3, 7, 30].map(d => (
                                                <button key={d} onClick={() => silenceUser(user.id, d)}
                                                    className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition">
                                                    {d}d
                                                </button>
                                            ))}
                                            {isSilenced(user) && (
                                                <button onClick={() => silenceUser(user.id, 0)}
                                                    className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition">
                                                    Lift
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ===== SHADOWBAN TAB ===== */}
                {tab === 'shadowban' && (
                    <>
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Ghost size={15} className="text-purple-400"/>
                                <p className="text-purple-400 font-bold text-sm">Shadowban a User</p>
                            </div>
                            <p className="text-zinc-500 text-xs">Shadowbanned users can still post and use the app normally — but their posts are invisible to everyone else. They won't know they're banned.</p>
                        </div>

                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                            <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                                placeholder="Search users..."
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-zinc-500 outline-none focus:border-purple-500/50"/>
                        </div>

                        {usersLoading ? <div className="text-center py-10 text-zinc-500">Loading users...</div> : (
                            <div className="space-y-2">
                                {filteredUsers.map(user => (
                                    <div key={user.id} className={`bg-zinc-900 border rounded-2xl p-4 ${user.shadowbanned ? 'border-purple-500/30' : 'border-zinc-800'}`}>
                                        <div className="flex items-center gap-3">
                                            {user.profile_pic_url
                                                ? <img src={user.profile_pic_url} className="w-10 h-10 rounded-full object-cover flex-shrink-0"/>
                                                : <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold flex-shrink-0">{user.display_name?.[0]?.toUpperCase()}</div>}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-bold text-sm truncate">{user.display_name}</p>
                                                <p className="text-zinc-500 text-xs">@{user.username} · {user.post_count} posts</p>
                                            </div>
                                            {user.shadowbanned
                                                ? <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/30 flex-shrink-0">👻 Shadowbanned</span>
                                                : null}
                                        </div>
                                        {userMsg[user.id] && <p className="text-xs text-center font-semibold mt-2 text-purple-400">{userMsg[user.id]}</p>}
                                        <button onClick={() => toggleShadowban(user)}
                                            className={`mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition
                                                ${user.shadowbanned
                                                    ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                                                    : 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20'}`}>
                                            <Ghost size={13}/>
                                            {user.shadowbanned ? 'Remove Shadowban' : 'Shadowban This User'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
