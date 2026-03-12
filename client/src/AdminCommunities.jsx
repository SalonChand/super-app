import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Users, Trash2, RefreshCw, Search, Edit2, Check, X, Crown, Shield, UserX, MessageSquare, Hash, Globe, ChevronRight, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

const ROLE_CONFIG = {
    admin:     { label: 'Admin',     color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/40', icon: Crown },
    moderator: { label: 'Mod',       color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/40',     icon: Shield },
    member:    { label: 'Member',    color: 'text-zinc-400',   bg: 'bg-zinc-800 border-zinc-700',            icon: Users },
};

export default function AdminCommunities() {
    const adminId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const loginUsername = localStorage.getItem('loginUsername');
    const username = localStorage.getItem('username');
    const isAdmin = userRole === 'superadmin' || loginUsername === 'superadmin' || username === 'superadmin' || adminId === '1';

    const [communities, setCommunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null); // selected community
    const [tab, setTab] = useState('members'); // members | posts | edit
    const [members, setMembers] = useState([]);
    const [posts, setPosts] = useState([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [postsLoading, setPostsLoading] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editSaving, setEditSaving] = useState(false);
    const [editMsg, setEditMsg] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [actionMsg, setActionMsg] = useState({});
    const [memberSearch, setMemberSearch] = useState('');

    const msg = (id, text) => {
        setActionMsg(p => ({ ...p, [id]: text }));
        setTimeout(() => setActionMsg(p => { const n = {...p}; delete n[id]; return n; }), 2500);
    };

    useEffect(() => { if (isAdmin) load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/api/admin/communities?adminId=${adminId}`);
            setCommunities(res.data || []);
        } catch(e) {}
        setLoading(false);
    };

    const selectCommunity = async (comm) => {
        setSelected(comm);
        setTab('members');
        setEditName(comm.name);
        setEditDesc(comm.description || '');
        loadMembers(comm.id);
    };

    const loadMembers = async (id) => {
        setMembersLoading(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/api/admin/communities/${id}/members?adminId=${adminId}`);
            setMembers(res.data || []);
        } catch(e) {}
        setMembersLoading(false);
    };

    const loadPosts = async (id) => {
        setPostsLoading(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/api/admin/communities/${id}/posts?adminId=${adminId}`);
            setPosts(res.data || []);
        } catch(e) {}
        setPostsLoading(false);
    };

    const switchTab = (t) => {
        setTab(t);
        if (t === 'posts' && posts.length === 0) loadPosts(selected.id);
    };

    const saveEdit = async () => {
        if (!editName.trim()) return;
        setEditSaving(true); setEditMsg('');
        try {
            await axios.put(`${BACKEND_URL}/api/admin/communities/${selected.id}`, { adminId, name: editName, description: editDesc });
            setCommunities(p => p.map(c => c.id === selected.id ? { ...c, name: editName, description: editDesc } : c));
            setSelected(p => ({ ...p, name: editName, description: editDesc }));
            setEditMsg('✅ Saved!');
        } catch(e) { setEditMsg('❌ Failed'); }
        setEditSaving(false);
        setTimeout(() => setEditMsg(''), 2500);
    };

    const deleteCommunity = async (id) => {
        try {
            await axios.delete(`${BACKEND_URL}/api/admin/communities/${id}`, { data: { adminId } });
            setCommunities(p => p.filter(c => c.id !== id));
            setConfirmDelete(null);
            setSelected(null);
        } catch(e) { alert('Failed to delete'); }
    };

    const deletePost = async (postId) => {
        try {
            await axios.delete(`${BACKEND_URL}/api/admin/communities/${selected.id}/posts/${postId}`, { data: { adminId } });
            setPosts(p => p.filter(p => p.id !== postId));
        } catch(e) {}
    };

    const kickMember = async (userId) => {
        msg(userId, 'Removing...');
        try {
            await axios.delete(`${BACKEND_URL}/api/admin/communities/${selected.id}/members/${userId}`, { data: { adminId } });
            setMembers(p => p.filter(m => m.id !== userId));
        } catch(e) { msg(userId, '❌ Failed'); }
    };

    const changeRole = async (userId, role) => {
        msg(userId, 'Updating...');
        try {
            await axios.post(`${BACKEND_URL}/api/admin/communities/${selected.id}/members/${userId}/role`, { adminId, role });
            setMembers(p => p.map(m => m.id === userId ? { ...m, role } : m));
            msg(userId, `✅ Role set to ${role}`);
        } catch(e) { msg(userId, '❌ Failed'); }
    };

    const filtered = communities.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.creator_name?.toLowerCase().includes(search.toLowerCase())
    );

    const filteredMembers = members.filter(m =>
        m.display_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.username?.toLowerCase().includes(memberSearch.toLowerCase())
    );

    if (!isAdmin) return <div className="min-h-screen bg-black flex items-center justify-center"><p className="text-red-400">Access Denied</p></div>;

    return (
        <div className="flex flex-col h-[calc(100dvh-70px)] sm:h-screen bg-black overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
                {selected
                    ? <button onClick={() => setSelected(null)} className="text-zinc-400 hover:text-white transition"><ChevronLeft size={24}/></button>
                    : <Link to="/admin" className="text-zinc-400 hover:text-white transition"><ChevronLeft size={24}/></Link>
                }
                <Globe size={18} className="text-green-400"/>
                <h1 className="text-white font-bold text-lg flex-1 truncate">
                    {selected ? selected.name : 'Community Control'}
                </h1>
                {!selected && <button onClick={load} className="text-zinc-400 hover:text-white p-1"><RefreshCw size={18} className={loading ? 'animate-spin' : ''}/></button>}
                {selected && (
                    <button onClick={() => setConfirmDelete(selected.id)}
                        className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-xl hover:bg-red-500/20 transition">
                        <Trash2 size={12}/> Delete
                    </button>
                )}
            </div>

            {/* Community List */}
            {!selected && (
                <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search communities..."
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-zinc-500 outline-none focus:border-green-500/50"/>
                    </div>
                    <p className="text-zinc-600 text-xs px-1">{filtered.length} communities</p>
                    {loading
                        ? <div className="text-center py-16 text-zinc-500">Loading...</div>
                        : filtered.map(comm => (
                            <button key={comm.id} onClick={() => selectCommunity(comm)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3 hover:border-zinc-700 transition text-left">
                                {comm.banner_url
                                    ? <img src={comm.banner_url} className="w-12 h-12 rounded-xl object-cover flex-shrink-0"/>
                                    : <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                                        <Globe size={20} className="text-green-400"/>
                                      </div>
                                }
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold text-sm truncate">{comm.name}</p>
                                    <p className="text-zinc-500 text-xs truncate">{comm.description || 'No description'}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-zinc-600 text-[10px] flex items-center gap-1"><Users size={10}/> {comm.member_count}</span>
                                        <span className="text-zinc-600 text-[10px] flex items-center gap-1"><MessageSquare size={10}/> {comm.post_count}</span>
                                        <span className="text-zinc-600 text-[10px] flex items-center gap-1"><Hash size={10}/> {comm.channel_count}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <p className="text-zinc-600 text-[10px]">by {comm.creator_name}</p>
                                    <ChevronRight size={14} className="text-zinc-600"/>
                                </div>
                            </button>
                        ))
                    }
                </div>
            )}

            {/* Community Detail */}
            {selected && (
                <>
                    {/* Stats bar */}
                    <div className="grid grid-cols-3 gap-0 border-b border-zinc-800">
                        {[['Members', selected.member_count, Users], ['Posts', selected.post_count, MessageSquare], ['Channels', selected.channel_count, Hash]].map(([label, val, Icon]) => (
                            <div key={label} className="flex flex-col items-center py-3 border-r border-zinc-800 last:border-r-0">
                                <p className="text-white font-bold text-base">{val || 0}</p>
                                <p className="text-zinc-500 text-[10px] flex items-center gap-1"><Icon size={9}/> {label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-zinc-800">
                        {[['members','👥 Members'], ['posts','📝 Posts'], ['edit','✏️ Edit']].map(([id, label]) => (
                            <button key={id} onClick={() => switchTab(id)}
                                className={`flex-1 py-3 text-xs font-bold border-b-2 transition ${tab === id ? 'border-green-400 text-green-400' : 'border-transparent text-zinc-500 hover:text-white'}`}>
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">

                        {/* MEMBERS TAB */}
                        {tab === 'members' && (
                            <>
                                <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                                    placeholder="Search members..."
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-500 outline-none focus:border-green-500/50"/>
                                {membersLoading
                                    ? <div className="text-center py-10 text-zinc-500">Loading...</div>
                                    : filteredMembers.map(member => {
                                        const rc = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;
                                        const RoleIcon = rc.icon;
                                        return (
                                            <div key={member.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    {member.profile_pic_url
                                                        ? <img src={member.profile_pic_url} className="w-10 h-10 rounded-full object-cover flex-shrink-0"/>
                                                        : <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold flex-shrink-0">{member.display_name?.[0]?.toUpperCase()}</div>
                                                    }
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-bold text-sm truncate">{member.display_name}</p>
                                                        <p className="text-zinc-500 text-xs">@{member.username}</p>
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border flex items-center gap-1 ${rc.bg} ${rc.color}`}>
                                                        <RoleIcon size={9}/> {rc.label}
                                                    </span>
                                                </div>
                                                {actionMsg[member.id] && <p className="text-xs text-center font-semibold text-green-400">{actionMsg[member.id]}</p>}
                                                <div className="grid grid-cols-3 gap-2">
                                                    {['admin','moderator','member'].map(r => (
                                                        <button key={r} onClick={() => changeRole(member.id, r)}
                                                            className={`py-1.5 rounded-xl text-[10px] font-bold border transition ${member.role === r ? (ROLE_CONFIG[r]?.bg + ' ' + ROLE_CONFIG[r]?.color) : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:bg-zinc-700'}`}>
                                                            {r.charAt(0).toUpperCase() + r.slice(1)}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button onClick={() => kickMember(member.id)}
                                                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition">
                                                    <UserX size={13}/> Kick from Community
                                                </button>
                                            </div>
                                        );
                                    })
                                }
                            </>
                        )}

                        {/* POSTS TAB */}
                        {tab === 'posts' && (
                            postsLoading
                                ? <div className="text-center py-10 text-zinc-500">Loading...</div>
                                : posts.length === 0
                                    ? <div className="text-center py-12 text-zinc-600"><MessageSquare size={32} className="mx-auto mb-2 opacity-30"/><p className="text-sm">No posts yet</p></div>
                                    : posts.map(post => (
                                        <div key={post.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                {post.profile_pic_url
                                                    ? <img src={post.profile_pic_url} className="w-7 h-7 rounded-full object-cover"/>
                                                    : <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs font-bold">{post.username?.[0]?.toUpperCase()}</div>
                                                }
                                                <p className="text-zinc-300 text-xs font-bold">@{post.username}</p>
                                                <p className="text-zinc-600 text-[10px] ml-auto">{new Date(post.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <p className="text-zinc-300 text-sm mb-2 line-clamp-3">{post.content}</p>
                                            {post.image_url && <img src={post.image_url} className="w-full rounded-xl object-cover max-h-40 mb-2"/>}
                                            <div className="flex items-center justify-between">
                                                <div className="flex gap-3">
                                                    <span className="text-zinc-500 text-xs">❤️ {post.like_count}</span>
                                                    <span className="text-zinc-500 text-xs">💬 {post.comment_count}</span>
                                                </div>
                                                <button onClick={() => deletePost(post.id)}
                                                    className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-xl hover:bg-red-500/20 transition">
                                                    <Trash2 size={11}/> Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))
                        )}

                        {/* EDIT TAB */}
                        {tab === 'edit' && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
                                <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><Edit2 size={12}/> Edit Community</p>
                                <div className="space-y-2">
                                    <label className="text-zinc-500 text-xs">Community Name</label>
                                    <input value={editName} onChange={e => setEditName(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50"/>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-zinc-500 text-xs">Description</label>
                                    <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3}
                                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50 resize-none"/>
                                </div>
                                {editMsg && <p className={`text-xs font-bold text-center ${editMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{editMsg}</p>}
                                <button onClick={saveEdit} disabled={editSaving}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/20 border border-green-500/40 text-green-300 font-bold text-sm hover:bg-green-500/30 transition disabled:opacity-50">
                                    <Check size={14}/> {editSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                                <div className="border-t border-zinc-800 pt-3">
                                    <p className="text-zinc-500 text-xs mb-2">Created by <span className="text-white font-semibold">{selected.creator_name}</span> · ID: {selected.id}</p>
                                    <button onClick={() => setConfirmDelete(selected.id)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/20 transition">
                                        <Trash2 size={14}/> Delete Community Permanently
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Confirm Delete Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
                    <div className="bg-zinc-900 border border-red-500/40 rounded-2xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto"><AlertTriangle size={22} className="text-red-400"/></div>
                        <h2 className="text-white font-bold text-lg text-center">Delete Community?</h2>
                        <p className="text-zinc-400 text-sm text-center">This permanently deletes the community, all its posts, members and channels. Cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-white text-sm font-semibold">Cancel</button>
                            <button onClick={() => deleteCommunity(confirmDelete)} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
