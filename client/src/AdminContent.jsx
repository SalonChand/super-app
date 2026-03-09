import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, MessageSquareX, Trash2, RefreshCw, Search, Image, Film, MessageCircle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

export default function AdminContent() {
    const adminId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const loginUsername = localStorage.getItem('loginUsername');
    const isAdmin = userRole === 'superadmin' || loginUsername === 'superadmin' || adminId === '1';

    const [tab, setTab] = useState('posts');
    const [posts, setPosts] = useState([]);
    const [reels, setReels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [actionMsg, setActionMsg] = useState({});

    const msg = (id, text) => {
        setActionMsg(p => ({ ...p, [id]: text }));
        setTimeout(() => setActionMsg(p => { const n={...p}; delete n[id]; return n; }), 2000);
    };

    const loadContent = async () => {
        setLoading(true);
        try {
            const [postsRes, reelsRes] = await Promise.all([
                axios.get(`${BACKEND_URL}/api/admin/all-posts?adminId=${adminId}`),
                axios.get(`${BACKEND_URL}/api/admin/all-reels?adminId=${adminId}`),
            ]);
            setPosts(postsRes.data || []);
            setReels(reelsRes.data || []);
        } catch(e) {}
        setLoading(false);
    };

    useEffect(() => { if (isAdmin) loadContent(); }, []);

    const deletePost = async (postId) => {
        msg(postId, 'Deleting...');
        try {
            await axios.delete(`${BACKEND_URL}/api/admin/posts/${postId}`, { data: { adminId } });
            setPosts(p => p.filter(post => post.id !== postId));
            msg(postId, '✅ Deleted');
        } catch(e) { msg(postId, '❌ Failed'); }
    };

    const deleteReel = async (reelId) => {
        msg('r'+reelId, 'Deleting...');
        try {
            await axios.delete(`${BACKEND_URL}/api/admin/reels/${reelId}`, { data: { adminId } });
            setReels(p => p.filter(r => r.id !== reelId));
        } catch(e) { msg('r'+reelId, '❌ Failed'); }
    };

    const filteredPosts = posts.filter(p => p.username?.toLowerCase().includes(search.toLowerCase()) || p.content?.toLowerCase().includes(search.toLowerCase()));
    const filteredReels = reels.filter(r => r.username?.toLowerCase().includes(search.toLowerCase()));

    const formatTime = (d) => {
        if (!d) return '';
        return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-black pb-24">
            <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
                <Link to="/admin" className="text-zinc-400 hover:text-white transition"><ChevronLeft size={24}/></Link>
                <MessageSquareX size={20} className="text-red-400"/>
                <h1 className="text-white font-bold text-lg flex-1">Content Moderation</h1>
                <button onClick={loadContent} className="text-zinc-400 hover:text-white p-1"><RefreshCw size={18} className={loading ? 'animate-spin' : ''}/></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800 bg-zinc-950">
                {[['posts', Image, 'Posts', posts.length], ['reels', Film, 'Reels', reels.length]].map(([id, Icon, label, count]) => (
                    <button key={id} onClick={() => setTab(id)}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${tab === id ? 'border-red-400 text-red-400' : 'border-transparent text-zinc-500 hover:text-white'}`}>
                        <Icon size={15}/> {label} <span className="bg-zinc-800 text-zinc-400 text-xs px-1.5 py-0.5 rounded-full">{count}</span>
                    </button>
                ))}
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by username or content..."
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-zinc-500 outline-none focus:border-red-500/50"/>
                </div>

                {loading ? <div className="text-center py-16 text-zinc-500">Loading...</div> : tab === 'posts' ? (
                    filteredPosts.length === 0 ? <div className="text-center py-16 text-zinc-600">No posts found</div> :
                    filteredPosts.map(post => (
                        <div key={post.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                            <div className="flex items-start gap-3 p-4">
                                {post.profile_pic_url
                                    ? <img src={post.profile_pic_url} className="w-9 h-9 rounded-full object-cover flex-shrink-0"/>
                                    : <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{post.username?.[0]?.toUpperCase()}</div>
                                }
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold text-sm">{post.username}</p>
                                    <p className="text-zinc-500 text-xs">{formatTime(post.created_at)}</p>
                                    {post.content && <p className="text-zinc-300 text-sm mt-1 line-clamp-2">{post.content}</p>}
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-zinc-600 text-xs">❤️ {post.like_count || 0}</span>
                                        <span className="text-zinc-600 text-xs"><MessageCircle size={10} className="inline"/> {post.comment_count || 0}</span>
                                    </div>
                                </div>
                                {post.image_url && <img src={post.image_url} className="w-14 h-14 rounded-xl object-cover flex-shrink-0"/>}
                            </div>
                            {actionMsg[post.id] && <p className="text-xs text-center py-1.5 text-red-400 bg-red-500/5">{actionMsg[post.id]}</p>}
                            <div className="px-4 pb-4">
                                <button onClick={() => deletePost(post.id)}
                                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition">
                                    <Trash2 size={13}/> Delete Post
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    filteredReels.length === 0 ? <div className="text-center py-16 text-zinc-600">No reels found</div> :
                    filteredReels.map(reel => (
                        <div key={reel.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                            <div className="flex items-center gap-3 p-4">
                                {reel.profile_pic_url
                                    ? <img src={reel.profile_pic_url} className="w-9 h-9 rounded-full object-cover flex-shrink-0"/>
                                    : <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{reel.username?.[0]?.toUpperCase()}</div>
                                }
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold text-sm">{reel.username}</p>
                                    <p className="text-zinc-500 text-xs">{formatTime(reel.created_at)}</p>
                                    <span className="text-zinc-600 text-xs">❤️ {reel.like_count || 0} likes</span>
                                </div>
                                <Film size={20} className="text-zinc-600 flex-shrink-0"/>
                            </div>
                            {actionMsg['r'+reel.id] && <p className="text-xs text-center py-1.5 text-red-400 bg-red-500/5">{actionMsg['r'+reel.id]}</p>}
                            <div className="px-4 pb-4">
                                <button onClick={() => deleteReel(reel.id)}
                                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition">
                                    <Trash2 size={13}/> Delete Reel
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
