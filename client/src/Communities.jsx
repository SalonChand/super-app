import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Globe, Plus, MessageSquare, Image as ImageIcon, Send, X, Users, Heart, User, MessageCircle, UserPlus, Share } from 'lucide-react';

const BACKEND_URL = `http://${window.location.hostname}:5000`;
const EMPTY_ARRAY = new Array();

function formatTimeFriendly(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString); const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today at ${timeStr}`; if (isYesterday) return `Yesterday at ${timeStr}`; return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
}

function Communities({ themeColor }) {
    const userId = localStorage.getItem('userId');
    const [communities, setCommunities] = useState([]);
    const [activeCommunity, setActiveCommunity] = useState(null); 
    const [posts, setPosts] = useState([]);
    const [friends, setFriends] = useState([]);
    
    // Create Community States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCommName, setNewCommName] = useState('');
    const [newCommDesc, setNewCommDesc] = useState('');

    // Invite States
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [invitedFriends, setInvitedFriends] = useState({});

    // Post to Community States
    const [newPostContent, setNewPostContent] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);

    // Interaction States
    const [activeCommentPostId, setActiveCommentPostId] = useState(null);
    const [commentsData, setCommentsData] = useState({});
    const [newComment, setNewComment] = useState('');
    const [viewingImage, setViewingImage] = useState(null);

    const loadCommunities = () => {
        axios.get(`${BACKEND_URL}/api/communities?userId=${userId}`).then(res => setCommunities(res.data)).catch(err => console.error(err));
    };

    const loadFriends = () => {
        axios.get(`${BACKEND_URL}/api/friends/list/${userId}`).then(res => setFriends(res.data)).catch(err => console.error(err));
    };

    useEffect(() => {
        loadCommunities();
        loadFriends();
    }, EMPTY_ARRAY);

    const loadCommunityPosts = (commId) => {
        axios.get(`${BACKEND_URL}/api/communities/${commId}/posts?userId=${userId}`).then(res => setPosts(res.data)).catch(err => console.error(err));
    };

    const handleOpenCommunity = (comm) => {
        setActiveCommunity(comm);
        loadCommunityPosts(comm.id);
    };

    const handleCreateCommunity = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${BACKEND_URL}/api/communities`, { name: newCommName, description: newCommDesc, creator_id: userId });
            setShowCreateModal(false); setNewCommName(''); setNewCommDesc('');
            loadCommunities();
        } catch (err) { alert("Failed to create. Name might be taken!"); }
    };

    const handleJoinCommunity = async (commId) => {
        setCommunities(communities.map(c => c.id === commId ? { ...c, is_member: 1, member_count: c.member_count + 1 } : c));
        setActiveCommunity(prev => ({ ...prev, is_member: 1, member_count: prev.member_count + 1 }));
        try { await axios.post(`${BACKEND_URL}/api/communities/${commId}/join`, { userId }); } catch (err) { loadCommunities(); }
    };

    const handleLeaveCommunity = async (commId) => {
        setCommunities(communities.map(c => c.id === commId ? { ...c, is_member: 0, member_count: c.member_count - 1 } : c));
        setActiveCommunity(prev => ({ ...prev, is_member: 0, member_count: prev.member_count - 1 }));
        try { await axios.post(`${BACKEND_URL}/api/communities/${commId}/leave`, { userId }); } catch (err) { loadCommunities(); }
    };

    const handleInviteFriend = async (friendId) => {
        setInvitedFriends(prev => ({ ...prev, [friendId]: true }));
        try {
            await axios.post(`${BACKEND_URL}/api/communities/${activeCommunity.id}/invite`, {
                senderId: userId,
                receiverId: friendId,
                commName: activeCommunity.name
            });
        } catch (err) { console.error("Failed to invite."); }
    };

    // POST CREATION
    const handleImageSelect = (e) => { const file = e.target.files[0]; if (file) { setSelectedImage(file); setPreviewUrl(URL.createObjectURL(file)); } };
    const removeImage = () => { setSelectedImage(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; };
    const handlePostToCommunity = async (e) => {
        e.preventDefault();
        if (!newPostContent.trim() && !selectedImage) return;
        const formData = new FormData();
        formData.append('user_id', userId); formData.append('content', newPostContent);
        if (selectedImage) formData.append('image', selectedImage);
        try {
            await axios.post(`${BACKEND_URL}/api/communities/${activeCommunity.id}/posts`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setNewPostContent(''); removeImage(); loadCommunityPosts(activeCommunity.id);
        } catch (err) { console.error(err); }
    };

    // POST INTERACTIONS
    const handleLike = async (postId) => {
        setPosts(posts.map(p => p.id === postId ? { ...p, user_liked: p.user_liked ? 0 : 1, like_count: p.like_count + (p.user_liked ? -1 : 1) } : p));
        try { await axios.post(`${BACKEND_URL}/api/community_posts/${postId}/like`, { userId }); } catch (err) { loadCommunityPosts(activeCommunity.id); }
    };

    const toggleComments = async (postId) => {
        if (activeCommentPostId === postId) { setActiveCommentPostId(null); } else {
            setActiveCommentPostId(postId);
            try { const res = await axios.get(`${BACKEND_URL}/api/community_posts/${postId}/comments`); setCommentsData(prev => ({ ...prev, [postId]: res.data })); } catch (err) { console.error(err); }
        }
    };

    const submitComment = async (e, postId) => {
        e.preventDefault(); if (!newComment.trim()) return;
        try {
            await axios.post(`${BACKEND_URL}/api/community_posts/${postId}/comment`, { userId, content: newComment });
            setNewComment('');
            const res = await axios.get(`${BACKEND_URL}/api/community_posts/${postId}/comments`); setCommentsData(prev => ({ ...prev, [postId]: res.data }));
            setPosts(posts.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p));
        } catch (err) { console.error(err); }
    };


    // ==========================================
    // VIEW: INSIDE A SPECIFIC COMMUNITY
    // ==========================================
    if (activeCommunity) {
        // The creator is automatically a member by database rules, but we explicitly check here for UI speed.
        const isMember = activeCommunity.is_member === 1 || activeCommunity.creator_id == userId;

        return (
            <div className="w-full bg-black min-h-screen pb-20 sm:pb-0 animate-fade-in relative">
                
                {viewingImage && (
                    <div className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center animate-fade-in" onClick={() => setViewingImage(null)}>
                        <button className="absolute top-4 right-4 text-white bg-zinc-800 rounded-full p-2 hover:bg-zinc-700 transition"><X size={24} /></button>
                        <img src={viewingImage} className="max-w-full max-h-full object-contain p-4" onClick={(e) => e.stopPropagation()} />
                    </div>
                )}

                {/* INVITE MODAL */}
                {showInviteModal && (
                    <div className="fixed inset-0 z-[120] bg-black/90 flex flex-col items-center justify-center p-4 animate-fade-in">
                        <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
                            <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-4">
                                <h3 className="text-white font-bold text-xl">Invite Friends</h3>
                                <button onClick={() => setShowInviteModal(false)} className="text-zinc-400 hover:text-white"><X size={20}/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3">
                                {friends.length === 0 ? <p className="text-zinc-500 text-sm text-center">You have no friends to invite yet.</p> : (
                                    friends.map(friend => (
                                        <div key={friend.id} className="flex items-center justify-between bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800">
                                                    {friend.profile_pic_url ? <img src={`${BACKEND_URL}${friend.profile_pic_url}`} className="w-full h-full object-cover" /> : <User className="m-auto mt-2 text-zinc-500" />}
                                                </div>
                                                <span className="text-white font-bold text-sm">{friend.username}</span>
                                            </div>
                                            <button 
                                                onClick={() => handleInviteFriend(friend.id)}
                                                disabled={invitedFriends[friend.id]}
                                                className={`text-xs font-bold py-1.5 px-4 rounded-full transition ${invitedFriends[friend.id] ? 'bg-zinc-800 text-zinc-500' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                                            >
                                                {invitedFriends[friend.id] ? "Invited" : "Invite"}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="p-4 border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-10 flex justify-between items-center backdrop-blur-md">
                    <div className="flex flex-col max-w-[70%]">
                        <h2 className="text-2xl font-black text-white truncate" style={{ color: themeColor }}>/{activeCommunity.name}</h2>
                        <p className="text-xs text-zinc-500 flex items-center gap-1"><Users size={12}/> {activeCommunity.member_count} Members</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowInviteModal(true)} className="text-zinc-300 hover:text-white p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition" title="Invite Friends"><UserPlus size={20}/></button>
                        <button onClick={() => {setActiveCommunity(null); loadCommunities();}} className="text-zinc-400 hover:text-white p-2 rounded-full bg-zinc-900 transition"><X size={20}/></button>
                    </div>
                </div>

                <div className="p-4 border-b border-zinc-800 bg-zinc-900/30 flex flex-col gap-4">
                    <p className="text-zinc-300 text-sm leading-relaxed">{activeCommunity.description}</p>
                    
                    {/* MEMBERSHIP TOGGLE */}
                    {activeCommunity.creator_id == userId ? (
                        <div className="w-fit border border-blue-900/50 bg-blue-900/20 text-blue-400 font-bold py-1.5 px-6 rounded-full text-sm">Owner</div>
                    ) : isMember ? (
                        <button onClick={() => handleLeaveCommunity(activeCommunity.id)} className="w-fit border border-zinc-700 text-zinc-300 font-bold py-1.5 px-6 rounded-full hover:bg-zinc-800 transition text-sm">Leave Community</button>
                    ) : (
                        <button onClick={() => handleJoinCommunity(activeCommunity.id)} className="w-fit text-white font-bold py-1.5 px-6 rounded-full hover:opacity-90 transition text-sm" style={{ backgroundColor: themeColor }}>Join Community</button>
                    )}
                </div>

                {/* Post Creator Box */}
                {isMember ? (
                    <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
                        <form onSubmit={handlePostToCommunity} className="w-full">
                            <textarea className="w-full bg-transparent text-lg text-white placeholder-zinc-500 outline-none resize-none overflow-hidden" value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} placeholder={`Post to /${activeCommunity.name}...`} rows="2" />
                            {previewUrl && <div className="relative mt-2 mb-2 w-fit"><img src={previewUrl} className="max-h-48 rounded-2xl object-cover border border-zinc-700" /><button type="button" onClick={removeImage} className="absolute top-2 right-2 bg-black/70 p-1 rounded-full hover:bg-black transition"><X size={14} className="text-white" /></button></div>}
                            <div className="flex justify-between items-center mt-2 border-t border-zinc-800 pt-3">
                                <div className="flex gap-4" style={{ color: themeColor }}><input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" /><button type="button" onClick={() => fileInputRef.current.click()} className="hover:bg-zinc-800 p-2 rounded-full transition"><ImageIcon size={20} /></button></div>
                                <button type="submit" disabled={!newPostContent.trim() && !selectedImage} className="text-white font-bold py-1.5 px-5 rounded-full transition disabled:opacity-50" style={{ backgroundColor: themeColor }}>Post</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="p-6 text-center text-zinc-500 border-b border-zinc-800 bg-zinc-950/30">
                        Join this community to post and comment!
                    </div>
                )}

                {/* THE FEED */}
                <div className="pb-10">
                    {posts.length === 0 ? <p className="text-center text-zinc-500 p-10">No posts in this community yet.</p> : (
                        posts.map(post => (
                            <div key={post.id} className="p-4 border-b border-zinc-800 hover:bg-zinc-950/50 transition">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800">
                                        {post.profile_pic_url ? <img src={`${BACKEND_URL}${post.profile_pic_url}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-zinc-500 text-xs">{post.username.charAt(0).toUpperCase()}</div>}
                                    </div>
                                    <Link to={`/profile/${post.user_id}`} className="text-sm font-bold text-white hover:underline">{post.username}</Link>
                                    <span className="text-xs text-zinc-600">• {formatTimeFriendly(post.created_at)}</span>
                                </div>
                                <p className="text-zinc-200 text-[15px] mb-3 leading-relaxed break-words whitespace-pre-wrap">{post.content}</p>
                                {post.image_url && <img onClick={() => setViewingImage(`${BACKEND_URL}${post.image_url}`)} src={`${BACKEND_URL}${post.image_url}`} className="rounded-xl border border-zinc-800 max-h-80 w-auto object-cover cursor-pointer hover:opacity-90 transition"/>}
                                
                                {/* ACTION BUTTONS */}
                                <div className="flex items-center justify-between text-zinc-500 mt-2 max-w-sm pr-4">
                                    <div className="flex items-center gap-1 group cursor-pointer" onClick={() => isMember && handleLike(post.id)}>
                                        <button className={`flex items-center gap-2 transition ${post.user_liked === 1 ? 'text-pink-600' : (isMember ? 'hover:text-pink-500' : 'cursor-not-allowed')}`}><div className="p-2 rounded-full group-hover:bg-pink-500/10"><Heart size={18} className={post.user_liked === 1 ? "fill-pink-600" : ""} /></div></button>
                                        <span className="text-sm font-medium hover:underline hover:text-pink-500">{post.like_count > 0 ? post.like_count : ''}</span>
                                    </div>
                                    <div className="flex items-center gap-1 group cursor-pointer" onClick={() => toggleComments(post.id)}>
                                        <button className="flex items-center gap-2 hover:text-blue-500 transition"><div className="p-2 rounded-full group-hover:bg-blue-500/10"><MessageCircle size={18} /></div></button>
                                        <span className="text-sm font-medium hover:underline hover:text-blue-500">{post.comment_count > 0 ? post.comment_count : ''}</span>
                                    </div>
                                    <button className="flex items-center gap-2 hover:text-blue-500 group transition"><div className="p-2 rounded-full group-hover:bg-blue-500/10"><Share size={18} /></div></button>
                                </div>

                                {/* COMMENTS DROP DOWN */}
                                {activeCommentPostId === post.id && (
                                    <div className="mt-3 pt-3 border-t border-zinc-800 animate-fade-in">
                                        {isMember && (
                                            <form onSubmit={(e) => submitComment(e, post.id)} className="flex gap-3 mb-4">
                                                <div className="w-full flex bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden focus-within:border-blue-500 transition">
                                                    <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Post your reply..." className="w-full bg-transparent px-4 py-2 text-sm text-white outline-none placeholder-zinc-500" />
                                                    <button type="submit" disabled={!newComment.trim()} className="px-4 text-blue-500 hover:text-blue-400 disabled:opacity-50"><Send size={16} /></button>
                                                </div>
                                            </form>
                                        )}
                                        <div className="space-y-4">
                                            {commentsData[post.id] && commentsData[post.id].map(comment => (
                                                <div key={comment.id} className="flex gap-3">
                                                    <Link to={`/profile/${comment.user_id}`} className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
                                                        {comment.profile_pic_url ? <img src={`${BACKEND_URL}${comment.profile_pic_url}`} className="w-full h-full object-cover" /> : <User size={16} className="m-auto mt-2 text-zinc-500" />}
                                                    </Link>
                                                    <div className="bg-zinc-900/50 p-3 rounded-2xl rounded-tl-sm w-full border border-zinc-800/50">
                                                        <div className="flex items-center gap-2 mb-1"><Link to={`/profile/${comment.user_id}`} className="font-bold text-white text-sm hover:underline">{comment.username}</Link><span className="text-zinc-600 text-xs">{formatTimeFriendly(comment.created_at)}</span></div>
                                                        <p className="text-zinc-200 text-sm">{comment.content}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    // ==========================================
    // VIEW: COMMUNITIES HUB (LIST OF ALL GROUPS)
    // ==========================================
    return (
        <div className="w-full bg-black min-h-screen pb-20 sm:pb-0 animate-fade-in relative">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-10 flex justify-between items-center backdrop-blur-md">
                <h2 className="text-2xl font-bold text-white">Communities</h2>
                <button onClick={() => setShowCreateModal(true)} className="p-2 rounded-full text-white transition hover:scale-105 shadow-lg" style={{ backgroundColor: themeColor }}><Plus size={20}/></button>
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 z-[120] bg-black/90 flex flex-col items-center justify-center p-4 animate-fade-in">
                    <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 text-white bg-zinc-800 rounded-full p-2"><X size={24} /></button>
                    <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">Create Community</h2>
                        <form onSubmit={handleCreateCommunity} className="space-y-4">
                            <input type="text" placeholder="Community Name (no spaces)" value={newCommName} onChange={(e) => setNewCommName(e.target.value.replace(/\s+/g, ''))} required className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white outline-none focus:border-blue-500" />
                            <textarea placeholder="What is this community about?" value={newCommDesc} onChange={(e) => setNewCommDesc(e.target.value)} required rows="3" className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white outline-none focus:border-blue-500 resize-none" />
                            <button type="submit" className="w-full text-white font-bold py-3 rounded-xl transition" style={{ backgroundColor: themeColor }}>Create Group</button>
                        </form>
                    </div>
                </div>
            )}

            <div className="p-4 space-y-3">
                {communities.length === 0 ? <p className="text-zinc-500 text-center mt-10">No communities exist yet. Be the first to create one!</p> : (
                    communities.map(comm => (
                        <div key={comm.id} onClick={() => handleOpenCommunity(comm)} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 cursor-pointer hover:bg-zinc-800 transition group flex items-center justify-between shadow-sm">
                            <div className="flex-1 min-w-0 pr-4">
                                <h3 className="text-lg font-black text-white group-hover:underline truncate" style={{ color: themeColor }}>/{comm.name}</h3>
                                <p className="text-zinc-400 text-sm mt-1 line-clamp-2">{comm.description}</p>
                                <div className="flex items-center gap-4 mt-3">
                                    <p className="text-zinc-600 text-xs flex items-center gap-1"><Users size={12}/> {comm.member_count} Members</p>
                                    <p className="text-zinc-600 text-xs flex items-center gap-1"><MessageSquare size={12}/> {comm.post_count} Posts</p>
                                </div>
                            </div>
                            <Globe size={40} className={`transition ${comm.is_member === 1 || comm.creator_id == userId ? 'text-blue-500' : 'text-zinc-700 group-hover:text-zinc-500'}`} />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Communities;