import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageCircle, Heart, Share, User, Send, Plus, X, Music, Type, Wand2, Eye, Paintbrush, Undo, MoreHorizontal, Edit2, Trash2, Check, Link as LinkIcon, Bookmark, Globe, Users, EyeOff, Star, ExternalLink, ChevronLeft, ChevronRight as ChevronRightIcon, BarChart2, BadgeCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import './index.css';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

// Carousel post component
function CarouselPost({ images, onImageClick }) {
    const [idx, setIdx] = useState(0);
    const prev = (e) => { e.stopPropagation(); setIdx(i => Math.max(0, i - 1)); };
    const next = (e) => { e.stopPropagation(); setIdx(i => Math.min(images.length - 1, i + 1)); };
    return (
        <div className="relative mb-3 bg-zinc-900/40 rounded-2xl overflow-hidden select-none">
            <img src={images[idx]} onClick={() => onImageClick(images[idx])} className="max-h-[500px] w-full object-contain cursor-pointer hover:opacity-95 transition rounded-2xl" />
            {idx > 0 && <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition backdrop-blur-sm"><ChevronLeft size={18}/></button>}
            {idx < images.length - 1 && <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition backdrop-blur-sm"><ChevronRightIcon size={18}/></button>}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white scale-125' : 'bg-white/40'}`}/>)}
            </div>
            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">{idx+1}/{images.length}</div>
        </div>
    );
}
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

// Returns colored BadgeCheck based on verify_type
function VerifiedBadge({ isVerified, verifyType, size = 14 }) {
    if (!isVerified) return null;
    const titles = { red: 'Platform Owner', green: 'Verified Politician', yellow: 'Verified Celebrity', blue: 'Verified Account' };
    const t = verifyType || 'blue';
    const title = titles[t] || titles.blue;
    const colors = { red: 'text-yellow-400', green: 'text-green-500', yellow: 'text-yellow-300', blue: 'text-blue-400' };
    const style = t === 'red' ? { filter: 'drop-shadow(0 0 4px rgba(234,179,8,0.8))' } : {};
    return <BadgeCheck size={size} className={`flex-shrink-0 ${colors[t] || colors.blue}`} title={title} style={style}/>;
}

function Feed({ onlineUsers = new Set() }) {
    const[posts, setPosts] = useState([]);
    const[savedPosts, setSavedPosts] = useState(new Set());
    const[currentUserInfo, setCurrentUserInfo] = useState(null);
    const[activeCommentPostId, setActiveCommentPostId] = useState(null);
    const[commentsData, setCommentsData] = useState({});
    const[newComment, setNewComment] = useState('');
    const[activeLikesPostId, setActiveLikesPostId] = useState(null);
    const[likesData, setLikesData] = useState({});
    const userId = localStorage.getItem('userId');
    const[viewingPostImage, setViewingPostImage] = useState(null);
    const[hashtagView, setHashtagView] = useState(null); // { tag, posts }
    const[hashtagLoading, setHashtagLoading] = useState(false);
    const[postAvatarMenu, setPostAvatarMenu] = useState(null); // { postId, userId, username, storyId }

    // 🔥 NEW: POST EDIT & DELETE STATES 🔥
    const [menuOpenPostId, setMenuOpenPostId] = useState(null);
    const[editingPostId, setEditingPostId] = useState(null);
    const [editContent, setEditContent] = useState('');

    const[stories, setStories] = useState([]);
    const[viewingStory, setViewingStory] = useState(null); 
    const[viewingStoryList, setViewingStoryList] = useState([]); // all stories for current user
    const[viewingStoryIndex, setViewingStoryIndex] = useState(0);
    const[storyReply, setStoryReply] = useState(''); 
    const[videoProgress, setVideoProgress] = useState(0);
    const[editingStory, setEditingStory] = useState(null); // { id, caption }
    const[storyMenuOpen, setStoryMenuOpen] = useState(false);
    
    const storyInputRef = useRef(null);
    const[draftFile, setDraftFile] = useState(null);
    const[draftPreviewUrl, setDraftPreviewUrl] = useState(null);
    const [draftCaption, setDraftCaption] = useState('');
    const [draftFilter, setDraftFilter] = useState(STORY_FILTERS[0].value);
    const [draftSong, setDraftSong] = useState(SONG_LIST[0]);
    const [showStoryEditor, setShowStoryEditor] = useState(false);
    const [storyVisibility, setStoryVisibility] = useState('public');
    const [visibleToFriends, setVisibleToFriends] = useState([]);
    const [friendsList, setFriendsList] = useState([]);

    const canvasRef = useRef(null);
    const[isDrawingMode, setIsDrawingMode] = useState(false);
    const [drawColor, setDrawColor] = useState('#ef4444');
    const isDrawing = useRef(false);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [feedPage, setFeedPage] = useState(0);
    const [hasMorePosts, setHasMorePosts] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const feedEndRef = useRef(null);
    const [sharingToStory, setSharingToStory] = useState(null); // { post }
    const [storyShareCaption, setStoryShareCaption] = useState('');
    const openHashtag = async (tag) => {
        setHashtagLoading(true);
        setHashtagView({ tag, posts: [] });
        try {
            const res = await axios.get(`${BACKEND_URL}/api/hashtags/${tag}?userId=${userId||0}`);
            setHashtagView({ tag, posts: res.data });
        } catch(e) {}
        setHashtagLoading(false);
    };

    const renderPostText = (text) => {
        if (!text) return null;
        const parts = text.split(/(#[\w]+|@[\w]+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('#')) {
                return <span key={i} onClick={() => openHashtag(part.slice(1))} className="text-blue-400 hover:text-blue-300 cursor-pointer font-medium hover:underline">{part}</span>;
            } else if (part.startsWith('@')) {
                return <span key={i} onClick={() => navigate(`/search?q=${part.slice(1)}`)} className="text-blue-400 hover:text-blue-300 cursor-pointer font-medium hover:underline">{part}</span>;
            }
            return part;
        });
    };

    const fetchData = async () => {
        setIsRefreshing(true);
        // Fetch each independently so one failure doesn't block the others
        try {
            const postsRes = await axios.get(`${BACKEND_URL}/api/posts?userId=${userId || 0}&page=0`);
            const data = postsRes.data;
            const arr = Array.isArray(data) ? data : (data.posts || []);
            setPosts(arr);
            setFeedPage(0);
            setHasMorePosts(Array.isArray(data) ? arr.length === 20 : (data.hasMore ?? false));
        } catch (err) { console.error('Posts error:', err); }
        try {
            if (userId) {
                const bmRes = await axios.get(`${BACKEND_URL}/api/bookmarks/${userId}`);
                if (Array.isArray(bmRes.data)) setSavedPosts(new Set(bmRes.data.map(p => p.id)));
            }
        } catch (err) {}
        try {
            const storiesRes = await axios.get(`${BACKEND_URL}/api/stories?userId=${userId || 0}`);
            if (Array.isArray(storiesRes.data)) setStories(storiesRes.data);
        } catch (err) { console.error('Stories error:', err); }
        try {
            if (userId) {
                const userRes = await axios.get(`${BACKEND_URL}/api/users/${userId}`);
                if (userRes.data && !userRes.data.error) setCurrentUserInfo(userRes.data);
            }
        } catch (err) { console.error('User error:', err); }
        try {
            if (userId) {
                const friendsRes = await axios.get(`${BACKEND_URL}/api/friends/list/${userId}`);
                if (Array.isArray(friendsRes.data)) setFriendsList(friendsRes.data);
            }
        } catch (err) { console.error('Friends error:', err); }
        setIsRefreshing(false);
    };
    const loadMorePosts = async () => {
        if (loadingMore || !hasMorePosts) return;
        setLoadingMore(true);
        try {
            const nextPage = feedPage + 1;
            const res = await axios.get(`${BACKEND_URL}/api/posts?userId=${userId || 0}&page=${nextPage}`);
            const data = res.data;
            const newPosts = Array.isArray(data) ? data : (data.posts || []);
            setPosts(prev => [...prev, ...newPosts]);
            setFeedPage(nextPage);
            setHasMorePosts(Array.isArray(data) ? newPosts.length === 20 : (data.hasMore ?? false));
        } catch(e) {}
        setLoadingMore(false);
    };

    useEffect(() => { fetchData(); }, []);

    // Track post views when feed loads
    useEffect(() => {
        if (!userId || !posts.length) return;
        posts.forEach(post => {
            if (post.user_id != userId) {
                axios.post(`${BACKEND_URL}/api/posts/${post.id}/view`, { userId }).catch(() => {});
            }
        });
    }, [posts.length]);

        useEffect(() => {
        if (viewingStory && userId) {
            axios.post(`${BACKEND_URL}/api/stories/${viewingStory.id}/view`, { userId: userId }).catch(err => console.error(err));
            setStories(prevStories => prevStories.map(s => s.user_id === viewingStory.user_id ? { ...s, user_has_viewed: 1 } : s));
        }
    }, [viewingStory?.id]);

    const goToNextStory = () => {
        setVideoProgress(0);
        const nextIndex = viewingStoryIndex + 1;
        if (nextIndex < viewingStoryList.length) {
            setViewingStoryIndex(nextIndex);
            setViewingStory(viewingStoryList[nextIndex]);
        } else setViewingStory(null);
    };
    const goToPrevStory = () => {
        setVideoProgress(0);
        const prevIndex = viewingStoryIndex - 1;
        if (prevIndex >= 0) {
            setViewingStoryIndex(prevIndex);
            setViewingStory(viewingStoryList[prevIndex]);
        }
    };
    const deleteStory = async (storyId) => {
        if (!window.confirm('Delete this story?')) return;
        try {
            await axios.delete(`${BACKEND_URL}/api/stories/${storyId}`, { data: { userId } });
            setStories(prev => prev.filter(s => s.id !== storyId));
            goToNextStory();
        } catch(e) { console.error(e); }
    };
    const saveStoryCaption = async () => {
        if (!editingStory) return;
        try {
            await axios.put(`${BACKEND_URL}/api/stories/${editingStory.id}`, { userId, caption: editingStory.caption });
            setStories(prev => prev.map(s => s.id === editingStory.id ? { ...s, caption: editingStory.caption } : s));
            setViewingStory(prev => ({ ...prev, caption: editingStory.caption }));
            setEditingStory(null);
        } catch(e) { console.error(e); }
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

    const handleBookmark = async (postId) => {
        if (!userId) return;
        setSavedPosts(prev => { const n = new Set(prev); prev.has(postId) ? n.delete(postId) : n.add(postId); return n; });
        try { await axios.post(`${BACKEND_URL}/api/bookmarks`, { userId, postId }); } catch(e) {}
    };

    const submitShareToStory = async () => {
        if (!sharingToStory) return;
        const post = sharingToStory;
        const text = storyShareCaption || `"${post.content?.slice(0, 80)}${post.content?.length > 80 ? '...' : ''}" — @${post.username}`;
        try {
            const fd = new FormData();
            fd.append('user_id', userId);
            fd.append('caption', text);
            fd.append('media_type', 'text');
            if (post.image_url) {
                // Fetch image and attach as blob
                const imgRes = await fetch(post.image_url);
                const blob = await imgRes.blob();
                fd.append('media', blob, 'shared.jpg');
            } else {
                // Create a tiny placeholder blob
                const blob = new Blob(['shared'], { type: 'text/plain' });
                fd.append('media', blob, 'shared.txt');
            }
            fd.append('filter_class', 'none');
            fd.append('visibility', 'public');
            fd.append('shared_post_id', post.id);
            await axios.post(`${BACKEND_URL}/api/stories`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setSharingToStory(null);
            setStoryShareCaption('');
            alert('✅ Shared to your story!');
        } catch(e) { alert('Failed to share. Try again.'); }
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
    const closeStoryEditor = () => { setShowStoryEditor(false); setDraftFile(null); setDraftPreviewUrl(null); setDraftCaption(''); setDraftFilter(STORY_FILTERS[0].value); setDraftSong(SONG_LIST[0]); setStoryVisibility('public'); setVisibleToFriends([]); if (storyInputRef.current) storyInputRef.current.value = ''; };
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
        if (draftCaption.trim()) formData.append('caption', draftCaption); if (draftSong !== 'No Music') formData.append('song_name', draftSong); formData.append('visibility', storyVisibility); if (storyVisibility === 'selected' && visibleToFriends.length > 0) formData.append('visible_to', JSON.stringify(visibleToFriends));
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
    const openStoryViewer = (user_id) => {
        const userStories = stories.filter(s => s.user_id === user_id);
        if (!userStories.length) return;
        setViewingStoryList(userStories);
        setViewingStoryIndex(0);
        setViewingStory(userStories[0]);
        setVideoProgress(0);
        setStoryMenuOpen(false);
    };

    return (
        <div className="w-full animate-fade-in pb-20 sm:pb-0 overflow-hidden relative">
            {/* ===== HASHTAG VIEW ===== */}
            {hashtagView && (
                <div style={{position:'fixed',inset:0,zIndex:9000,background:'rgba(0,0,0,0.97)',overflowY:'auto'}} className="animate-fade-in">
                    <div className="max-w-xl mx-auto pt-4 pb-20">
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 sticky top-0 bg-black z-10">
                            <button onClick={() => setHashtagView(null)} className="text-zinc-400 hover:text-white transition"><X size={22}/></button>
                            <div>
                                <h2 className="text-white font-bold text-lg">#{hashtagView.tag}</h2>
                                <p className="text-zinc-500 text-xs">{hashtagView.posts.length} posts</p>
                            </div>
                        </div>
                        {hashtagLoading && <p className="text-zinc-500 text-center py-10 animate-pulse">Loading...</p>}
                        {!hashtagLoading && hashtagView.posts.length === 0 && <p className="text-zinc-500 text-center py-10">No posts with #{hashtagView.tag} yet.</p>}
                        {hashtagView.posts.map(post => (
                            <div key={post.id} className="p-4 border-b border-zinc-800">
                                <div className="flex items-center gap-3 mb-2">
                                    <Link to={`/profile/${post.user_id}`} onClick={() => setHashtagView(null)} className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 flex items-center justify-center">
                                        {post.profile_pic_url ? <img src={post.profile_pic_url} className="w-full h-full object-cover" /> : <span className="text-zinc-400 font-bold text-sm">{post.username.charAt(0).toUpperCase()}</span>}
                                    </Link>
                                    <div><div className="flex items-center gap-1"><Link to={`/profile/${post.user_id}`} onClick={() => setHashtagView(null)} className="text-white font-bold text-sm hover:underline">{post.username}</Link>{<VerifiedBadge isVerified={!!post.is_verified} verifyType={post.verify_type} size={13}/>}</div><p className="text-zinc-500 text-xs">{new Date(post.created_at).toLocaleDateString()}</p></div>
                                </div>
                                <p className="text-zinc-100 text-sm leading-relaxed whitespace-pre-wrap break-words">{renderPostText(post.content)}</p>
                                {post.image_url && <img src={post.image_url} className="mt-2 rounded-xl w-full max-h-64 object-cover" />}
                                <div className="flex gap-4 mt-2 text-zinc-500 text-xs"><span>❤️ {post.like_count}</span><span>💬 {post.comment_count}</span></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== STORY VIEWER MODAL ===== */}
            {viewingStory && (
                <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
                    {/* Left/Right tap zones */}
                    <div className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer" onClick={goToPrevStory} />
                    <div className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer" onClick={goToNextStory} />

                    <div className="relative w-full max-w-sm h-full max-h-[90vh] flex flex-col">
                        {/* Multi-segment progress bars */}
                        <div className="absolute top-2 left-0 right-0 flex gap-1 px-2 z-30">
                            {viewingStoryList.map((s, i) => (
                                <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                                    <div className="h-full bg-white rounded-full transition-all duration-100"
                                        style={{ width: i < viewingStoryIndex ? '100%' : i === viewingStoryIndex ? (viewingStory.media_type === 'video' ? `${videoProgress}%` : '100%') : '0%' }} />
                                </div>
                            ))}
                        </div>

                        {/* Header */}
                        <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-4 z-30">
                            <Link to={`/profile/${viewingStory.user_id}`} className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white">
                                    {viewingStory.profile_pic_url ? <img src={viewingStory.profile_pic_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-white text-xs font-bold">{viewingStory.username?.charAt(0).toUpperCase()}</div>}
                                </div>
                                <span className="text-white text-sm font-bold">{viewingStory.username}</span>
                            </Link>
                            <div className="flex items-center gap-2">
                                {/* Edit/Delete menu for own stories */}
                                {viewingStory.user_id == userId && (
                                    <div className="relative z-40">
                                        <button onClick={(e) => { e.stopPropagation(); setStoryMenuOpen(p => !p); }} className="text-white p-1"><MoreHorizontal size={20} /></button>
                                        {storyMenuOpen && (
                                            <div className="absolute right-0 top-8 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden w-36" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => { setEditingStory({ id: viewingStory.id, caption: viewingStory.caption || '' }); setStoryMenuOpen(false); }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-zinc-800 text-white text-sm flex items-center gap-2"><Edit2 size={14}/> Edit Caption</button>
                                                <button onClick={() => { deleteStory(viewingStory.id); setStoryMenuOpen(false); }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-zinc-800 text-red-400 text-sm flex items-center gap-2 border-t border-zinc-700"><Trash2 size={14}/> Delete</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <button onClick={() => { setViewingStory(null); setStoryMenuOpen(false); }} className="text-white"><X size={22} /></button>
                            </div>
                        </div>

                        {/* Media */}
                        <div className="flex-1 flex items-center justify-center bg-black" style={{ filter: viewingStory.filter_css || 'none' }}>
                            {viewingStory.media_type === 'video'
                                ? <video key={viewingStory.id} src={viewingStory.media_url} autoPlay className="w-full h-full object-contain" onTimeUpdate={handleVideoTimeUpdate} onEnded={goToNextStory} />
                                : <img key={viewingStory.id} src={viewingStory.media_url} className="w-full h-full object-contain" />
                            }
                        </div>

                        {/* Edit caption inline */}
                        {editingStory && editingStory.id === viewingStory.id && (
                            <div className="absolute bottom-20 left-4 right-4 z-40 flex gap-2" onClick={e => e.stopPropagation()}>
                                <input value={editingStory.caption} onChange={e => setEditingStory(p => ({...p, caption: e.target.value}))}
                                    placeholder="Add a caption..." className="flex-1 bg-black/70 text-white placeholder-white/50 rounded-full px-4 py-2 text-sm outline-none border border-white/20" autoFocus />
                                <button onClick={saveStoryCaption} className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">Save</button>
                                <button onClick={() => setEditingStory(null)} className="text-white/60 px-2 text-sm">✕</button>
                            </div>
                        )}

                        {/* Caption */}
                        {viewingStory.caption && !editingStory && <div className="absolute bottom-20 left-4 right-4 text-white text-center text-sm font-medium drop-shadow z-10">{viewingStory.caption}</div>}

                        {/* Like + Reply */}
                        <div className="absolute bottom-4 left-0 right-0 flex items-center gap-2 px-4 z-30">
                            <button onClick={(e) => { e.stopPropagation(); handleStoryLike(viewingStory.id); }} className={`flex items-center gap-1 ${viewingStory.user_liked ? 'text-pink-500' : 'text-white'}`}>
                                <Heart size={20} className={viewingStory.user_liked ? 'fill-pink-500' : ''} />
                                <span className="text-xs">{viewingStory.like_count > 0 ? viewingStory.like_count : ''}</span>
                            </button>
                            <form onSubmit={(e) => handleStoryReply(e, viewingStory.user_id)} className="flex-1 flex gap-2" onClick={e => e.stopPropagation()}>
                                <input value={storyReply} onChange={e => setStoryReply(e.target.value)} placeholder="Reply..." className="flex-1 bg-white/20 text-white placeholder-white/60 rounded-full px-3 py-1.5 text-sm outline-none" />
                                <button type="submit" className="text-white"><Send size={18} /></button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== STORY EDITOR MODAL ===== */}
            {showStoryEditor && draftPreviewUrl && (
                <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
                    <div className="relative w-full max-w-sm">
                        <button onClick={closeStoryEditor} className="absolute top-2 right-2 z-10 text-white bg-black/50 rounded-full p-1"><X size={20} /></button>
                        <div className="relative rounded-xl overflow-hidden border border-zinc-700 mb-3" style={{ filter: draftFilter }}>
                            {draftFile?.type?.startsWith('video')
                                ? <video src={draftPreviewUrl} className="w-full max-h-80 object-cover" controls />
                                : <img src={draftPreviewUrl} className="w-full max-h-80 object-cover" />
                            }
                            {isDrawingMode && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-crosshair"
                                onMouseDown={e => { isDrawing.current = true; const r = canvasRef.current.getBoundingClientRect(); const ctx = canvasRef.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top); }}
                                onMouseMove={e => { if (!isDrawing.current) return; const r = canvasRef.current.getBoundingClientRect(); const ctx = canvasRef.current.getContext('2d'); ctx.strokeStyle = drawColor; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineTo(e.clientX - r.left, e.clientY - r.top); ctx.stroke(); }}
                                onMouseUp={() => { isDrawing.current = false; }}
                            />}
                        </div>
                        {/* Filters */}
                        <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                            {STORY_FILTERS.map(f => <button key={f.name} onClick={() => setDraftFilter(f.value)} className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border ${draftFilter === f.value ? 'border-blue-500 text-blue-400' : 'border-zinc-700 text-zinc-400'}`}>{f.name}</button>)}
                        </div>
                        {/* Song */}
                        <select value={draftSong} onChange={e => setDraftSong(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm mb-2 outline-none">
                            {SONG_LIST.map(s => <option key={s}>{s}</option>)}
                        </select>
                        {/* Caption */}
                        <input value={draftCaption} onChange={e => setDraftCaption(e.target.value)} placeholder="Add a caption..." className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm mb-3 outline-none" />
                        {/* Draw tools */}
                        <div className="flex gap-2 mb-3 items-center">
                            <button onClick={() => setIsDrawingMode(!isDrawingMode)} className={`p-2 rounded-full border ${isDrawingMode ? 'border-blue-500 text-blue-400' : 'border-zinc-700 text-zinc-400'}`}><Paintbrush size={16} /></button>
                            {DRAW_COLORS.map(c => <button key={c} onClick={() => setDrawColor(c)} style={{ background: c }} className={`w-6 h-6 rounded-full border-2 ${drawColor === c ? 'border-white' : 'border-transparent'}`} />)}
                            <button onClick={() => { const ctx = canvasRef.current?.getContext('2d'); if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); }} className="p-2 rounded-full border border-zinc-700 text-zinc-400 ml-auto"><Undo size={16} /></button>
                        </div>
                        {/* Visibility Picker */}
                        <div className="mb-3">
                            <p className="text-zinc-400 text-xs mb-2 font-medium uppercase tracking-wider">Who can see this?</p>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                {[
                                    { value: 'public', label: '🌍 Everyone' },
                                    { value: 'friends', label: '👥 Friends Only' },
                                    { value: 'only_me', label: '🔒 Only Me' },
                                    { value: 'selected', label: '✅ Selected' },
                                ].map(opt => (
                                    <button key={opt.value} onClick={() => setStoryVisibility(opt.value)}
                                        className={`py-2 px-3 rounded-xl text-sm font-medium border transition ${storyVisibility === opt.value ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            {storyVisibility === 'selected' && (
                                <div className="max-h-32 overflow-y-auto space-y-1 bg-zinc-900 rounded-xl p-2 border border-zinc-700">
                                    <p className="text-zinc-500 text-xs mb-1 px-1">Select friends:</p>
                                    {friendsList.length === 0 && <p className="text-zinc-600 text-xs px-1">No friends yet.</p>}
                                    {friendsList.map(f => (
                                        <label key={f.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-zinc-800">
                                            <input type="checkbox" checked={visibleToFriends.includes(f.id)}
                                                onChange={e => setVisibleToFriends(prev => e.target.checked ? [...prev, f.id] : prev.filter(id => id !== f.id))}
                                                className="accent-blue-500 w-4 h-4" />
                                            <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0">
                                                {f.profile_pic_url ? <img src={f.profile_pic_url} className="w-full h-full object-cover" /> : <span className="text-xs text-white flex items-center justify-center h-full">{f.username?.charAt(0).toUpperCase()}</span>}
                                            </div>
                                            <span className="text-white text-sm">{f.username}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={uploadFinalStory} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-full transition">Post Story</button>
                    </div>
                </div>
            )}

            {/* ===== STORIES ROW ===== */}
            <div className="flex gap-3 overflow-x-auto px-4 py-3 border-b border-zinc-800 no-scrollbar">
                {/* Add Story button */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer" onClick={() => storyInputRef.current?.click()}>
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border-2 border-dashed border-zinc-600 flex items-center justify-center hover:border-blue-500 transition">
                        <Plus size={22} className="text-zinc-400" />
                    </div>
                    <span className="text-xs text-zinc-500 truncate w-14 text-center">Your Story</span>
                </div>
                <input ref={storyInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={startStoryDraft} />
                {/* Story bubbles */}
                {uniqueStories.map(story => (
                    <div key={story.user_id} className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer" onClick={() => openStoryViewer(story.user_id)}>
                        <div className="relative">
                            <div className={`w-14 h-14 rounded-full overflow-hidden border-2 ${story.user_has_viewed ? 'border-zinc-600' : 'border-blue-500'} p-0.5`}>
                                <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                                    {story.profile_pic_url ? <img src={story.profile_pic_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">{story.username?.charAt(0).toUpperCase()}</div>}
                                </div>
                            </div>
                            {onlineUsers.has(String(story.user_id)) && story.show_active_status && (
                                <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-black shadow-[0_0_6px_rgba(74,222,128,0.7)]"></div>
                            )}
                        </div>
                        <span className="text-xs text-zinc-400 truncate w-14 text-center">{story.username}</span>
                    </div>
                ))}
            </div>

            {/* ===== POSTS ===== */}
            <div>
                {/* ===== SHARE TO STORY MODAL ===== */}
                {sharingToStory && (
                    <div className="fixed inset-0 z-[200] bg-black/80 flex items-end sm:items-center justify-center animate-fade-in p-4">
                        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-sm p-5 shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-bold text-lg">Share to Story</h3>
                                <button onClick={() => setSharingToStory(null)} className="text-zinc-400 hover:text-white"><X size={20}/></button>
                            </div>
                            {/* Post preview */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-7 h-7 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
                                        {sharingToStory.profile_pic_url ? <img src={sharingToStory.profile_pic_url} className="w-full h-full object-cover"/> : <span className="flex items-center justify-center h-full text-xs font-bold text-white">{sharingToStory.username?.charAt(0).toUpperCase()}</span>}
                                    </div>
                                    <span className="text-white text-sm font-bold">{sharingToStory.username}</span>
                                </div>
                                <p className="text-zinc-300 text-sm line-clamp-3">{sharingToStory.content}</p>
                                {sharingToStory.image_url && <img src={sharingToStory.image_url} className="w-full rounded-xl mt-2 max-h-32 object-cover"/>}
                            </div>
                            <input
                                type="text"
                                value={storyShareCaption}
                                onChange={e => setStoryShareCaption(e.target.value)}
                                placeholder="Add a caption to your story..."
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 transition mb-4"
                            />
                            <button onClick={submitShareToStory} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-2xl transition">
                                Share to Story ✨
                            </button>
                        </div>
                    </div>
                )}

                {/* Image lightbox modal */}
                {viewingPostImage && (
                    <div style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.97)',display:'flex',alignItems:'center',justifyContent:'center'}} onClick={() => setViewingPostImage(null)}>
                        <button style={{position:'absolute',top:'16px',right:'16px',background:'rgba(39,39,42,0.9)',border:'none',borderRadius:'50%',padding:'8px',cursor:'pointer',zIndex:10}} onClick={() => setViewingPostImage(null)}><X size={22} color="white" /></button>
                        <img src={viewingPostImage} onClick={e => e.stopPropagation()}
                            style={{maxWidth:'95vw', maxHeight:'92vh', objectFit:'contain', borderRadius:'16px', boxShadow:'0 25px 50px rgba(0,0,0,0.8)', display:'block', margin:'auto'}} />
                    </div>
                )}

                {/* Avatar popup menu (story / profile) */}
                {postAvatarMenu && (
                    <div className="fixed inset-0 z-[100]" onClick={() => setPostAvatarMenu(null)}>
                        <div className="absolute bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden w-48"
                            style={{ top: postAvatarMenu.y, left: postAvatarMenu.x }}
                            onClick={e => e.stopPropagation()}>
                            {postAvatarMenu.storyId && (
                                <button onClick={() => { setViewingStory(stories.find(s => s.user_id == postAvatarMenu.userId)); setPostAvatarMenu(null); }}
                                    className="w-full text-left px-4 py-3 hover:bg-zinc-800 text-white flex items-center gap-3 text-sm font-medium transition">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div> View Story
                                </button>
                            )}
                            <Link to={`/profile/${postAvatarMenu.userId}`} onClick={() => setPostAvatarMenu(null)}
                                className="w-full text-left px-4 py-3 hover:bg-zinc-800 text-white flex items-center gap-3 text-sm font-medium transition block">
                                <div className="w-2 h-2 rounded-full bg-zinc-400"></div> View Profile
                            </Link>
                        </div>
                    </div>
                )}

                {posts.length === 0 && <p className="text-center text-zinc-500 mt-10">No posts yet.</p>}
                {posts.map((post) => (
                    <div key={post.id} className="p-4 border-b border-zinc-800 hover:bg-zinc-950/30 transition flex gap-4">
                        {(() => { const userStory = stories.find(s => s.user_id == post.user_id); const hasStory = !!userStory; const viewed = userStory?.user_has_viewed; return (
    <div className="relative flex-shrink-0" style={{width: '48px', height: '48px'}}>
        <button onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setPostAvatarMenu({ postId: post.id, userId: post.user_id, username: post.username, storyId: hasStory, x: rect.left, y: rect.bottom + 8 }); }}
            className={"w-12 h-12 rounded-full flex items-center justify-center overflow-hidden transition " + (hasStory ? ("p-0.5 " + (viewed ? "bg-zinc-500" : "bg-gradient-to-tr from-blue-500 to-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)]")) : "bg-zinc-800 border border-zinc-700")}>
            <div className={"w-full h-full rounded-full overflow-hidden flex items-center justify-center " + (hasStory ? "border-2 border-black" : "")}>
                {post.profile_pic_url ? <img src={`${post.profile_pic_url}`} className="w-full h-full object-cover" /> : <span className="text-xl text-zinc-500 font-bold">{post.username.charAt(0).toUpperCase()}</span>}
            </div>
        </button>
        {onlineUsers.has(String(post.user_id)) && post.show_active_status && (
            <span style={{position:'absolute', bottom:'1px', right:'1px', width:'11px', height:'11px', background:'#4ade80', borderRadius:'50%', border:'2px solid #09090b', boxShadow:'0 0 6px rgba(74,222,128,0.9)', zIndex:20, display:'block'}}></span>
        )}
    </div>
); })()}
                        <div className="w-full min-w-0">
                            
                            {/* 🔥 THE POST HEADER W/ MORE OPTIONS MENU 🔥 */}
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-1"><Link to={`/profile/${post.user_id}`} className="font-bold text-white hover:underline truncate">{post.username}</Link>{<VerifiedBadge isVerified={!!post.is_verified} verifyType={post.verify_type} size={14}/>}</div>
                                        {post.co_author_username && post.co_author_status === 'accepted' && <><span className="text-zinc-600 text-xs">with</span><Link to={`/profile/${post.co_author_id}`} className="font-bold text-yellow-300 text-sm hover:underline">& {post.co_author_username}</Link></>}
                                        <span className="text-zinc-500 text-sm truncate">@{post.username.toLowerCase()}</span>
                                        {post.visibility && post.visibility !== 'public' && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{post.visibility === 'friends' ? '👥' : post.visibility === 'close_friends' ? '⭐' : '🔒'}</span>}
                                        <span className="text-zinc-600 text-sm hidden sm:inline">·</span><span className="text-zinc-500 text-xs w-full sm:w-auto">{formatTimeFriendly(post.created_at)}</span>
                                        {post.tagged_users && (() => { try { const tags = JSON.parse(post.tagged_users); return tags.length > 0 ? <span className="text-blue-400 text-xs w-full">👥 with {tags.length} friend{tags.length>1?'s':''}</span> : null; } catch(e) { return null; } })()}
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
                                <p className="text-zinc-100 text-[15px] leading-normal break-words whitespace-pre-wrap mb-3">{renderPostText(post.content)}</p>
                            )}

                            {/* Carousel or single image */}
                            {(() => {
                                const imgs = (() => { try { return post.images ? JSON.parse(post.images) : null; } catch(e) { return null; } })();
                                const allImgs = imgs && imgs.length > 1 ? imgs : (post.image_url ? [post.image_url] : null);
                                if (!allImgs) return null;
                                if (allImgs.length === 1) {
                                    return <div className="w-full flex justify-center mb-3 bg-zinc-900/40 rounded-2xl overflow-hidden"><img onClick={() => setViewingPostImage(allImgs[0])} src={allImgs[0]} className="max-h-[500px] w-full object-contain cursor-pointer hover:opacity-95 transition rounded-2xl" /></div>;
                                }
                                // Multi-image carousel
                                return <CarouselPost images={allImgs} onImageClick={setViewingPostImage} />;
                            })()}
                            
                            <div className="flex justify-between items-center text-zinc-500 mt-2 max-w-sm pr-10">
                                <div className="flex items-center gap-1 group"><button onClick={() => handleLike(post.id)} className={`flex items-center gap-2 transition ${post.user_liked === 1 ? 'text-pink-600' : 'hover:text-pink-500'}`}><div className="p-2 rounded-full group-hover:bg-pink-500/10"><Heart size={18} className={post.user_liked === 1 ? "fill-pink-600" : ""} /></div></button><span onClick={() => toggleLikes(post.id)} className="text-sm font-medium hover:text-pink-500 hover:underline cursor-pointer">{post.like_count > 0 ? post.like_count : ''}</span></div>
                                <div className="flex items-center gap-1 group"><button onClick={() => toggleComments(post.id)} className="flex items-center gap-2 hover:text-blue-500 transition"><div className="p-2 rounded-full group-hover:bg-blue-500/10"><MessageCircle size={18} /></div></button><span onClick={() => toggleComments(post.id)} className="text-sm font-medium hover:text-blue-500 hover:underline cursor-pointer">{post.comment_count > 0 ? post.comment_count : ''}</span></div>
                                <button onClick={() => { setSharingToStory(post); setStoryShareCaption(''); }} className="flex items-center gap-2 hover:text-blue-500 group transition"><div className="p-2 rounded-full group-hover:bg-blue-500/10"><Share size={18} /></div></button>
                                <button onClick={() => handleBookmark(post.id)} className={`flex items-center transition group ${savedPosts.has(post.id) ? 'text-yellow-400' : 'hover:text-yellow-400'}`}><div className="p-2 rounded-full group-hover:bg-yellow-400/10"><Bookmark size={18} className={savedPosts.has(post.id) ? 'fill-yellow-400' : ''} /></div></button>
                            </div>
                            
                            {/* Comments and Likes panels remain exactly the same below... */}
                            {activeLikesPostId === post.id && (
                                <div className="mt-3 pt-3 border-t border-zinc-800 animate-fade-in"><h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Liked by</h4><div className="flex flex-wrap gap-2">{likesData[post.id]?.length === 0 && <p className="text-sm text-zinc-500">No likes yet.</p>}{likesData[post.id]?.map(user => (<Link key={user.id} to={`/profile/${user.id}`} className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800 hover:bg-zinc-800 transition">{user.profile_pic_url ? <img src={`${user.profile_pic_url}`} className="w-5 h-5 rounded-full object-cover" /> : <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-white">{user.username.charAt(0).toUpperCase()}</div>}<span className="text-sm text-zinc-300 flex items-center gap-1">{user.username}<VerifiedBadge isVerified={!!user.is_verified} verifyType={user.verify_type} size={12}/></span></Link>))}</div></div>
                            )}

                            {activeCommentPostId === post.id && (
                                <div className="mt-3 pt-3 border-t border-zinc-800 animate-fade-in">
                                    <form onSubmit={(e) => submitComment(e, post.id)} className="flex gap-3 mb-4"><div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">{currentUserInfo?.profile_pic_url ? <img src={`${currentUserInfo.profile_pic_url}`} className="w-full h-full object-cover" /> : <User size={16} className="m-auto mt-2 text-zinc-500" />}</div><div className="w-full flex bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden focus-within:border-blue-500 transition"><input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Post your reply..." className="w-full bg-transparent px-4 py-2 text-sm text-white outline-none placeholder-zinc-500" /><button type="submit" disabled={!newComment.trim()} className="px-4 text-blue-500 hover:text-blue-400 disabled:opacity-50"><Send size={16} /></button></div></form>
                                    <div className="space-y-4">{commentsData[post.id] && commentsData[post.id].map(comment => (<div key={comment.id} className="flex gap-3"><Link to={`/profile/${comment.user_id}`} className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">{comment.profile_pic_url ? <img src={`${comment.profile_pic_url}`} className="w-full h-full object-cover" /> : <User size={16} className="m-auto mt-2 text-zinc-500" />}</Link><div className="bg-zinc-900/50 p-3 rounded-2xl rounded-tl-sm w-full border border-zinc-800/50"><div className="flex items-center gap-2 mb-1"><div className="flex items-center gap-1"><Link to={`/profile/${comment.user_id}`} className="font-bold text-white text-sm hover:underline">{comment.username}</Link>{<VerifiedBadge isVerified={!!comment.is_verified} verifyType={comment.verify_type} size={12}/>}</div><span className="text-zinc-600 text-xs">{formatTimeFriendly(comment.created_at)}</span></div><p className="text-zinc-200 text-sm">{comment.content}</p></div></div>))}</div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {/* Load more */}
                {hasMorePosts && (
                    <div className="flex justify-center py-6">
                        <button onClick={loadMorePosts} disabled={loadingMore}
                            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white text-sm font-semibold px-6 py-2.5 rounded-full transition disabled:opacity-50">
                            {loadingMore ? <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin"/> : null}
                            {loadingMore ? 'Loading…' : 'Load more posts'}
                        </button>
                    </div>
                )}
                {!hasMorePosts && posts.length > 0 && (
                    <p className="text-center text-zinc-700 text-xs py-8">You're all caught up ✓</p>
                )}
            </div>
        </div>
    );
}

export default Feed;