import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageCircle, Heart, Share, User, Send, Plus, X, Music, Type, Wand2, Eye, Paintbrush, Undo, MoreHorizontal, Edit2, Trash2, Check, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom'; 
import './index.css';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';
const EMPTY_ARRAY = new Array();

const STORY_FILTERS =[{ name: 'Normal', value: 'none' }, { name: 'Clarendon', value: 'contrast(1.2) saturate(1.3) sepia(0.2) hue-rotate(-10deg)' }, { name: 'Gingham', value: 'brightness(1.1) contrast(1.1) sepia(0.3) hue-rotate(-20deg)' }, { name: 'Moon', value: 'grayscale(100%) contrast(1.2) brightness(1.1)' }, { name: 'Warm', value: 'sepia(0.5) saturate(1.5) contrast(1.1)' }, { name: 'Neon', value: 'hue-rotate(90deg) saturate(2) contrast(1.2)' }];
const SONG_LIST =["No Music", "Lo-Fi Beats 🎵", "Trending Hits 🔥", "Chill Vibes 🎧", "Gym Motivation 💪"];
const DRAW_COLORS =['#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#000000'];

function formatTimeFriendly(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString); const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today at ${timeStr}`; if (isYesterday) return `Yesterday at ${timeStr}`; return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
}

function Feed() {
    const[posts, setPosts] = useState(EMPTY_ARRAY);
    const[currentUserInfo, setCurrentUserInfo] = useState(null);
    const[activeCommentPostId, setActiveCommentPostId] = useState(null);
    const[commentsData, setCommentsData] = useState({});
    const[newComment, setNewComment] = useState('');
    const[activeLikesPostId, setActiveLikesPostId] = useState(null);
    const[likesData, setLikesData] = useState({});
    const userId = localStorage.getItem('userId');
    const[viewingPostImage, setViewingPostImage] = useState(null);

    // 🔥 NEW: POST EDIT & DELETE STATES 🔥
    const [menuOpenPostId, setMenuOpenPostId] = useState(null);
    const[editingPostId, setEditingPostId] = useState(null);
    const [editContent, setEditContent] = useState('');

    const[stories, setStories] = useState([]);
    const[viewingStory, setViewingStory] = useState(null); 
    const[storyReply, setStoryReply] = useState(''); 
    const[videoProgress, setVideoProgress] = useState(0); 
    
    const storyInputRef = useRef(null);
    const[draftFile, setDraftFile] = useState(null);
    const[draftPreviewUrl, setDraftPreviewUrl] = useState(null);
    const [draftCaption, setDraftCaption] = useState('');
    const [draftFilter, setDraftFilter] = useState(STORY_FILTERS[0].value);
    const [draftSong, setDraftSong] = useState(SONG_LIST[0]);
    const [showStoryEditor, setShowStoryEditor] = useState(false);

    const canvasRef = useRef(null);
    const[isDrawingMode, setIsDrawingMode] = useState(false);
    const [drawColor, setDrawColor] = useState('#ef4444');
    const isDrawing = useRef(false);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const fetchData = async () => {
        setIsRefreshing(true);
        try {
            const [postsRes, storiesRes, userRes] = await Promise.all([
                axios.get(`${BACKEND_URL}/api/posts?userId=${userId || 0}`),
                axios.get(`${BACKEND_URL}/api/stories?userId=${userId || 0}`),
                userId ? axios.get(`${BACKEND_URL}/api/users/${userId}`) : Promise.resolve(null)
            ]);
            if (Array.isArray(postsRes.data)) setPosts(postsRes.data);
            if (Array.isArray(storiesRes.data)) setStories(storiesRes.data);
            if (userRes && userRes.data && !userRes.data.error) setCurrentUserInfo(userRes.data);
        } catch (err) { console.error(err); } finally { setIsRefreshing(false); }
    };
    useEffect(fetchData, EMPTY_ARRAY);

    const viewDeps = Array.of(viewingStory ? viewingStory.id : null);
    useEffect(() => {
        if (viewingStory && userId) {
            axios.post(`${BACKEND_URL}/api/stories/${viewingStory.id}/view`, { userId: userId }).catch(err => console.error(err));
            setStories(prevStories => prevStories.map(s => s.user_id === viewingStory.user_id ? { ...s, user_has_viewed: 1 } : s));
        }
    }, viewDeps);

    const goToNextStory = () => {
        setVideoProgress(0); 
        const currentIndex = stories.findIndex(s => s.id === viewingStory.id);
        if (currentIndex !== -1 && currentIndex + 1 < stories.length) setViewingStory(stories[currentIndex + 1]);
        else setViewingStory(null); 
    };

    const handleVideoTimeUpdate = (e) => { setVideoProgress((e.target.currentTime / e.target.duration) * 100); };

    // 🔥 NEW: POST ACTIONS (EDIT, DELETE, COPY LINK) 🔥
    const deletePost = async (postId) => {
        if (window.confirm("Are you sure you want to delete this post?")) {
            try {
                await axios.delete(`${BACKEND_URL}/api/posts/${postId}`);
                setPosts(posts.filter(p => p.id !== postId));
            } catch (e) { console.error(e); }
        }
    };

    const saveEdit = async (postId) => {
        try {
            await axios.put(`${BACKEND_URL}/api/posts/${postId}`, { content: editContent });
            setPosts(posts.map(p => p.id === postId ? { ...p, content: editContent } : p));
            setEditingPostId(null);
        } catch (e) { console.error(e); }
    };

    const copyPostLink = (postId) => {
        navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
        alert("Link copied to clipboard!");
        setMenuOpenPostId(null);
    };

    const handleLike = async (postId) => {
        if (!userId) return alert("Please log in!");
        setPosts(posts.map(p => p.id === postId ? { ...p, user_liked: p.user_liked ? 0 : 1, like_count: p.like_count + (p.user_liked ? -1 : 1) } : p));
        try { await axios.post(`${BACKEND_URL}/api/posts/${postId}/like`, { userId }); } catch (err) { fetchData(); }
    };
    const toggleLikes = async (postId) => {
        if (activeLikesPostId === postId) { setActiveLikesPostId(null); } else {
            setActiveLikesPostId(postId); setActiveCommentPostId(null); 
            try { const res = await axios.get(`${BACKEND_URL}/api/posts/${postId}/likes`); if(Array.isArray(res.data)) setLikesData(prev => ({ ...prev,[postId]: res.data })); } catch (err) { console.error(err); }
        }
    };
    const toggleComments = async (postId) => {
        if (activeCommentPostId === postId) { setActiveCommentPostId(null); } else {
            setActiveCommentPostId(postId); setActiveLikesPostId(null);
            try { const res = await axios.get(`${BACKEND_URL}/api/posts/${postId}/comments`); if(Array.isArray(res.data)) setCommentsData(prev => ({ ...prev, [postId]: res.data })); } catch (err) { console.error(err); }
        }
    };
    const submitComment = async (e, postId) => {
        e.preventDefault(); if (!newComment.trim() || !userId) return;
        try {
            await axios.post(`${BACKEND_URL}/api/posts/${postId}/comment`, { userId, content: newComment });
            setNewComment('');
            const res = await axios.get(`${BACKEND_URL}/api/posts/${postId}/comments`); if(Array.isArray(res.data)) setCommentsData(prev => ({ ...prev, [postId]: res.data }));
            setPosts(posts.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p));
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (showStoryEditor && draftFile && !draftFile.type.startsWith('video') && canvasRef.current) {
            const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
            canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 5;
        }
    }, [showStoryEditor, draftFile]);

    const startDrawing = (e) => { if (!isDrawingMode) return; isDrawing.current = true; const ctx = canvasRef.current.getContext('2d'); ctx.strokeStyle = drawColor; ctx.beginPath(); const { offsetX, offsetY } = getCoordinates(e); ctx.moveTo(offsetX, offsetY); };
    const draw = (e) => { if (!isDrawing.current || !isDrawingMode) return; const ctx = canvasRef.current.getContext('2d'); const { offsetX, offsetY } = getCoordinates(e); ctx.lineTo(offsetX, offsetY); ctx.stroke(); };
    const stopDrawing = () => { isDrawing.current = false; };
    const getCoordinates = (e) => { const canvas = canvasRef.current; const rect = canvas.getBoundingClientRect(); if (e.touches && e.touches.length > 0) { return { offsetX: e.touches[0].clientX - rect.left, offsetY: e.touches[0].clientY - rect.top }; } return { offsetX: e.nativeEvent.offsetX, offsetY: e.nativeEvent.offsetY }; };
    const clearCanvas = () => { if (canvasRef.current) { const ctx = canvasRef.current.getContext('2d'); ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); } };

    const startStoryDraft = (e) => { const file = e.target.files[0]; if (file) { setDraftFile(file); setDraftPreviewUrl(URL.createObjectURL(file)); setShowStoryEditor(true); setIsDrawingMode(false); } };
    const closeStoryEditor = () => { setShowStoryEditor(false); setDraftFile(null); setDraftPreviewUrl(null); setDraftCaption(''); setDraftFilter(STORY_FILTERS[0].value); setDraftSong(SONG_LIST[0]); if (storyInputRef.current) storyInputRef.current.value = ''; };
    const uploadFinalStory = async () => {
        const formData = new FormData(); formData.append('user_id', userId);
        if (canvasRef.current && !draftFile.type.startsWith('video')) {
            const mergeCanvas = document.createElement('canvas'); const mergeCtx = mergeCanvas.getContext('2d'); const img = new Image(); img.src = draftPreviewUrl;
            await new Promise(resolve => {
                img.onload = () => {
                    mergeCanvas.width = canvasRef.current.width; mergeCanvas.height = canvasRef.current.height;
                    mergeCtx.filter = draftFilter;
                    const scale = Math.max(mergeCanvas.width / img.width, mergeCanvas.height / img.height);
                    const x = (mergeCanvas.width / 2) - (img.width / 2) * scale; const y = (mergeCanvas.height / 2) - (img.height / 2) * scale;
                    mergeCtx.drawImage(img, x, y, img.width * scale, img.height * scale);
                    mergeCtx.filter = 'none'; mergeCtx.drawImage(canvasRef.current, 0, 0); resolve();
                };
            });
            const blob = await new Promise(resolve => mergeCanvas.toBlob(resolve, 'image/jpeg', 0.9));
            formData.append('media', blob, 'story.jpg'); formData.append('filter_class', 'none'); 
        } else { formData.append('media', draftFile); if (draftFilter !== 'none') formData.append('filter_class', draftFilter); }
        if (draftCaption.trim()) formData.append('caption', draftCaption); if (draftSong !== 'No Music') formData.append('song_name', draftSong);
        try { await axios.post(`${BACKEND_URL}/api/stories`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); closeStoryEditor(); fetchData(); } catch (err) { console.error(err); }
    };

    const handleStoryLike = async (storyId) => {
        if (!userId) return;
        setStories(stories.map(s => s.id === storyId ? { ...s, user_liked: s.user_liked ? 0 : 1, like_count: s.like_count + (s.user_liked ? -1 : 1) } : s));
        setViewingStory(prev => ({ ...prev, user_liked: prev.user_liked ? 0 : 1, like_count: prev.like_count + (prev.user_liked ? -1 : 1) }));
        try { await axios.post(`${BACKEND_URL}/api/stories/${storyId}/like`, { userId }); } catch (err) { fetchData(); }
    };
    const handleStoryReply = async (e, storyOwnerId) => {
        e.preventDefault(); if (!storyReply.trim() || !userId) return;
        try { await axios.post(`${BACKEND_URL}/api/messages/send`, { senderId: userId, receiverId: storyOwnerId, content: `Replying to your story: "${storyReply}"` }); setStoryReply(''); alert("Reply sent to their Messages!"); } catch (error) { console.error(error); }
    };

    const uniqueStories = new Array(); const seenUsers = new Set();
    if (Array.isArray(stories)) {
        stories.forEach(s => { if(!seenUsers.has(s.user_id)) { uniqueStories.push(s); seenUsers.add(s.user_id); } });
        uniqueStories.sort((a, b) => Number(a.user_has_viewed) > 0 ? 1 : -1);
    }
    const openStoryViewer = (user_id) => { setVideoProgress(0); setViewingStory(stories.find(s => s.user_id === user_id)); };

    return (
        <div className="w-full animate-fade-in pb-20 sm:pb-0 overflow-hidden relative">

            <div>
                {posts.length === 0 && <p className="text-center text-zinc-500 mt-10">No posts yet.</p>}
                {posts.map((post) => (
                    <div key={post.id} className="p-4 border-b border-zinc-800 hover:bg-zinc-950/30 transition flex gap-4">
                        <Link to={`/profile/${post.user_id}`} className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden border border-zinc-700">{post.profile_pic_url ? <img src={`${post.profile_pic_url}`} className="w-full h-full object-cover" /> : <span className="text-xl text-zinc-500 font-bold">{post.username.charAt(0).toUpperCase()}</span>}</Link>
                        <div className="w-full min-w-0">
                            
                            {/* 🔥 THE POST HEADER W/ MORE OPTIONS MENU 🔥 */}
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Link to={`/profile/${post.user_id}`} className="font-bold text-white hover:underline truncate">{post.username}</Link><span className="text-zinc-500 text-sm truncate">@{post.username.toLowerCase()}</span><span className="text-zinc-600 text-sm hidden sm:inline">·</span><span className="text-zinc-500 text-xs w-full sm:w-auto">{formatTimeFriendly(post.created_at)}</span>
                                </div>
                                
                                {/* 3 Dots Menu Button */}
                                <div className="relative">
                                    <button onClick={() => setMenuOpenPostId(menuOpenPostId === post.id ? null : post.id)} className="text-zinc-500 hover:text-white p-1 rounded-full transition">
                                        <MoreHorizontal size={18} />
                                    </button>
                                    
                                    {menuOpenPostId === post.id && (
                                        <div className="absolute right-0 mt-2 w-32 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                                            <button onClick={() => copyPostLink(post.id)} className="w-full text-left px-4 py-2 hover:bg-zinc-700 text-white flex items-center gap-2 text-sm"><LinkIcon size={14}/> Copy Link</button>
                                            
                                            {/* Only show Edit/Delete if you own the post! */}
                                            {post.user_id == userId && (
                                                <>
                                                    <button onClick={() => { setEditingPostId(post.id); setEditContent(post.content); setMenuOpenPostId(null); }} className="w-full text-left px-4 py-2 hover:bg-zinc-700 text-white flex items-center gap-2 text-sm"><Edit2 size={14}/> Edit</button>
                                                    <button onClick={() => { deletePost(post.id); setMenuOpenPostId(null); }} className="w-full text-left px-4 py-2 hover:bg-zinc-700 text-red-500 flex items-center gap-2 text-sm border-t border-zinc-700"><Trash2 size={14}/> Delete</button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 🔥 EDITING MODE vs VIEWING MODE 🔥 */}
                            {editingPostId === post.id ? (
                                <div className="mt-2 mb-3">
                                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition" rows="3" />
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button onClick={() => setEditingPostId(null)} className="text-zinc-400 hover:text-white px-4 py-1.5 rounded-full text-sm font-bold transition">Cancel</button>
                                        <button onClick={() => saveEdit(post.id)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 transition"><Check size={16}/> Save</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-zinc-100 text-[15px] leading-normal break-words whitespace-pre-wrap mb-3">{post.content}</p>
                            )}

                            {post.image_url && <img onClick={() => setViewingPostImage(`${post.image_url}`)} src={`${post.image_url}`} className="rounded-2xl border border-zinc-800 max-h-[500px] w-auto object-cover mb-3 cursor-pointer hover:opacity-90 transition"/>}
                            
                            <div className="flex justify-between items-center text-zinc-500 mt-2 max-w-sm pr-10">
                                <div className="flex items-center gap-1 group"><button onClick={() => handleLike(post.id)} className={`flex items-center gap-2 transition ${post.user_liked === 1 ? 'text-pink-600' : 'hover:text-pink-500'}`}><div className="p-2 rounded-full group-hover:bg-pink-500/10"><Heart size={18} className={post.user_liked === 1 ? "fill-pink-600" : ""} /></div></button><span onClick={() => toggleLikes(post.id)} className="text-sm font-medium hover:text-pink-500 hover:underline cursor-pointer">{post.like_count > 0 ? post.like_count : ''}</span></div>
                                <div className="flex items-center gap-1 group"><button onClick={() => toggleComments(post.id)} className="flex items-center gap-2 hover:text-blue-500 transition"><div className="p-2 rounded-full group-hover:bg-blue-500/10"><MessageCircle size={18} /></div></button><span onClick={() => toggleComments(post.id)} className="text-sm font-medium hover:text-blue-500 hover:underline cursor-pointer">{post.comment_count > 0 ? post.comment_count : ''}</span></div>
                                <button className="flex items-center gap-2 hover:text-blue-500 group transition"><div className="p-2 rounded-full group-hover:bg-blue-500/10"><Share size={18} /></div></button>
                            </div>
                            
                            {/* Comments and Likes panels remain exactly the same below... */}
                            {activeLikesPostId === post.id && (
                                <div className="mt-3 pt-3 border-t border-zinc-800 animate-fade-in"><h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Liked by</h4><div className="flex flex-wrap gap-2">{likesData[post.id]?.length === 0 && <p className="text-sm text-zinc-500">No likes yet.</p>}{likesData[post.id]?.map(user => (<Link key={user.id} to={`/profile/${user.id}`} className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800 hover:bg-zinc-800 transition">{user.profile_pic_url ? <img src={`${user.profile_pic_url}`} className="w-5 h-5 rounded-full object-cover" /> : <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-white">{user.username.charAt(0).toUpperCase()}</div>}<span className="text-sm text-zinc-300">{user.username}</span></Link>))}</div></div>
                            )}

                            {activeCommentPostId === post.id && (
                                <div className="mt-3 pt-3 border-t border-zinc-800 animate-fade-in">
                                    <form onSubmit={(e) => submitComment(e, post.id)} className="flex gap-3 mb-4"><div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">{currentUserInfo?.profile_pic_url ? <img src={`${currentUserInfo.profile_pic_url}`} className="w-full h-full object-cover" /> : <User size={16} className="m-auto mt-2 text-zinc-500" />}</div><div className="w-full flex bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden focus-within:border-blue-500 transition"><input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Post your reply..." className="w-full bg-transparent px-4 py-2 text-sm text-white outline-none placeholder-zinc-500" /><button type="submit" disabled={!newComment.trim()} className="px-4 text-blue-500 hover:text-blue-400 disabled:opacity-50"><Send size={16} /></button></div></form>
                                    <div className="space-y-4">{commentsData[post.id] && commentsData[post.id].map(comment => (<div key={comment.id} className="flex gap-3"><Link to={`/profile/${comment.user_id}`} className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">{comment.profile_pic_url ? <img src={`${comment.profile_pic_url}`} className="w-full h-full object-cover" /> : <User size={16} className="m-auto mt-2 text-zinc-500" />}</Link><div className="bg-zinc-900/50 p-3 rounded-2xl rounded-tl-sm w-full border border-zinc-800/50"><div className="flex items-center gap-2 mb-1"><Link to={`/profile/${comment.user_id}`} className="font-bold text-white text-sm hover:underline">{comment.username}</Link><span className="text-zinc-600 text-xs">{formatTimeFriendly(comment.created_at)}</span></div><p className="text-zinc-200 text-sm">{comment.content}</p></div></div>))}</div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Feed;