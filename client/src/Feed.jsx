import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageCircle, Heart, Share, User, Send, Plus, X, Music, Type, Wand2, Eye, Paintbrush, Undo, MoreHorizontal, Edit2, Trash2, Check, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom'; 
import './index.css'; 

const BACKEND_URL = `http://${window.location.hostname}:5000`;
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

    const fetchData = () => {
        axios.get(`${BACKEND_URL}/api/posts?userId=${userId || 0}`).then((res) => { if (Array.isArray(res.data)) setPosts(res.data); }).catch(err => console.error(err));
        if (userId) { axios.get(`${BACKEND_URL}/api/users/${userId}`).then(res => { if(!res.data.error) setCurrentUserInfo(res.data); }).catch(err => console.error(err)); }
        axios.get(`${BACKEND_URL}/api/stories?userId=${userId || 0}`).then(res => { if (Array.isArray(res.data)) setStories(res.data); }).catch(err => console.error(err));
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
            
            {viewingPostImage && ( <div className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center animate-fade-in" onClick={() => setViewingPostImage(null)}><button className="absolute top-4 right-4 text-white bg-zinc-800 rounded-full p-2 hover:bg-zinc-700 transition"><X size={24} /></button><img src={viewingPostImage} className="max-w-full max-h-full object-contain p-4" onClick={(e) => e.stopPropagation()} /></div> )}
            
            {showStoryEditor && (
                <div className="fixed inset-0 z-[110] bg-zinc-950 flex flex-col">
                    <div className="p-4 flex justify-between items-center bg-black/50 absolute top-0 w-full z-30 pointer-events-none">
                        <button onClick={closeStoryEditor} className="pointer-events-auto text-white bg-black/50 p-2 rounded-full hover:bg-zinc-800"><X size={24}/></button>
                        <button onClick={uploadFinalStory} className="pointer-events-auto bg-blue-600 text-white font-bold px-6 py-2 rounded-full shadow-lg shadow-blue-600/50 hover:bg-blue-500">Share Story</button>
                    </div>
                    <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
                        {draftFile.type.startsWith('video') ? ( <video src={draftPreviewUrl} className="w-full h-full object-contain" style={{ filter: draftFilter }} autoPlay muted loop /> ) : ( <><img src={draftPreviewUrl} className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ filter: draftFilter }} /><canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} onTouchCancel={stopDrawing} className={`absolute inset-0 w-full h-full z-20 ${isDrawingMode ? 'cursor-crosshair' : 'pointer-events-none'}`} /></> )}
                        {draftCaption && <div className="absolute top-1/2 left-0 w-full text-center px-4 z-10 pointer-events-none"><span className="bg-black/60 text-white text-2xl font-bold py-2 px-4 rounded-xl leading-tight backdrop-blur-md inline-block">{draftCaption}</span></div>}
                        {draftSong !== "No Music" && <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm font-bold py-1.5 px-4 rounded-full backdrop-blur-md flex items-center gap-2 z-10 pointer-events-none"><Music size={14} className="text-pink-500" /> {draftSong}</div>}
                    </div>
                    <div className="bg-zinc-950 border-t border-zinc-800 p-4 space-y-4 relative z-30">
                        {!draftFile.type.startsWith('video') && (
                            <div className="flex items-center gap-3 overflow-x-auto pb-2 border-b border-zinc-800" style={{ scrollbarWidth: 'none' }}>
                                <button onClick={() => setIsDrawingMode(!isDrawingMode)} className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 flex-shrink-0 transition ${isDrawingMode ? 'bg-red-500 text-white shadow-lg shadow-red-500/40' : 'bg-zinc-800 text-zinc-300'}`}><Paintbrush size={16} /> {isDrawingMode ? "Drawing On" : "Draw"}</button>
                                {isDrawingMode && DRAW_COLORS.map(c => (<button key={c} onClick={() => setDrawColor(c)} className="w-8 h-8 rounded-full border-2 transition-transform flex-shrink-0 hover:scale-110" style={{ backgroundColor: c, borderColor: drawColor === c ? 'white' : 'transparent' }}></button>))}
                                {isDrawingMode && (<button onClick={clearCanvas} className="p-2 ml-auto text-zinc-400 hover:text-white transition bg-zinc-800 rounded-full"><Undo size={18}/></button>)}
                            </div>
                        )}
                        <div className="flex items-center bg-zinc-900 rounded-xl p-2 px-4"><Type size={20} className="text-zinc-500 mr-2" /><input type="text" value={draftCaption} onChange={(e)=>setDraftCaption(e.target.value)} placeholder="Add a caption..." className="bg-transparent text-white w-full outline-none" /></div>
                        <div className="flex items-center gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}><Wand2 size={20} className="text-zinc-500 flex-shrink-0" />{STORY_FILTERS.map(f => <button key={f.name} onClick={() => setDraftFilter(f.value)} className={`px-4 py-1.5 rounded-full text-sm font-medium flex-shrink-0 transition ${draftFilter === f.value ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>{f.name}</button>)}</div>
                        <div className="flex items-center gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}><Music size={20} className="text-zinc-500 flex-shrink-0" />{SONG_LIST.map(s => <button key={s} onClick={() => setDraftSong(s)} className={`px-4 py-1.5 rounded-full text-sm font-medium flex-shrink-0 transition ${draftSong === s ? 'bg-pink-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>{s}</button>)}</div>
                    </div>
                </div>
            )}

            {viewingStory && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col justify-between">
                    <div className="absolute top-0 left-0 w-full pt-2 px-2 z-20 flex gap-1"><div className="h-1 bg-white/30 w-full rounded-full overflow-hidden"><div className={`h-full bg-white ${viewingStory.media_type === 'image' ? 'animate-story-bar' : ''}`} style={viewingStory.media_type === 'video' ? { width: `${videoProgress}%`, transition: 'width 0.1s linear' } : {}} onAnimationEnd={viewingStory.media_type === 'image' ? goToNextStory : undefined}></div></div></div>
                    <div className="p-4 pt-6 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-10 absolute w-full top-0">
                        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800">{viewingStory.profile_pic_url ? <img src={`${BACKEND_URL}${viewingStory.profile_pic_url}`} className="w-full h-full object-cover" /> : <User className="m-auto mt-2 text-zinc-500" />}</div><div><h3 className="text-white font-bold drop-shadow-md">{viewingStory.username}</h3><p className="text-xs text-zinc-300 drop-shadow-md">{formatTimeFriendly(viewingStory.created_at)}</p></div></div>
                        <button onClick={() => setViewingStory(null)} className="text-white bg-black/50 p-2 rounded-full hover:bg-zinc-800 transition"><X size={24} /></button>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center -z-10">
                        <div className="absolute inset-y-0 left-0 w-1/4 z-10 cursor-pointer" onClick={() => setViewingStory(null)}></div><div className="absolute inset-y-0 right-0 w-3/4 z-10 cursor-pointer" onClick={goToNextStory}></div>
                        {viewingStory.media_type === 'video' ? <video src={`${BACKEND_URL}/api/stream/${viewingStory.media_url.split('/').pop()}`} className="w-full h-full object-cover" style={{ filter: viewingStory.filter_class }} autoPlay onTimeUpdate={handleVideoTimeUpdate} onEnded={goToNextStory} playsInline /> : <img src={`${BACKEND_URL}${viewingStory.media_url}`} className="w-full h-full object-cover" style={{ filter: viewingStory.filter_class }} />}
                    </div>
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-0 pb-28 pt-24"><div className="flex justify-center">{viewingStory.song_name && <div className="bg-black/50 text-white text-sm font-bold py-1.5 px-4 rounded-full flex items-center gap-2 backdrop-blur-md"><Music size={14} className="text-pink-400" /> {viewingStory.song_name}</div>}</div><div className="flex justify-center px-4">{viewingStory.caption && <span className="bg-black/50 text-white text-2xl font-bold py-2 px-4 rounded-xl leading-tight backdrop-blur-md inline-block text-center mb-4">{viewingStory.caption}</span>}</div></div>
                    <div className="absolute bottom-0 w-full z-20">
                        {viewingStory.user_id == userId ? ( <div className="p-6 bg-gradient-to-t from-black via-black/80 to-transparent flex justify-center items-center gap-8"><div className="flex flex-col items-center"><Heart size={28} className="text-pink-500 fill-pink-500 mb-1 drop-shadow-md" /><span className="text-white font-bold">{viewingStory.like_count || 0} Likes</span></div><div className="flex flex-col items-center"><Eye size={28} className="text-blue-400 mb-1 drop-shadow-md" /><span className="text-white font-bold">{viewingStory.view_count || 0} Views</span></div></div> ) : ( <div className="p-4 bg-gradient-to-t from-black/90 to-transparent flex gap-4 items-center"><form onSubmit={(e) => handleStoryReply(e, viewingStory.user_id)} className="flex-1"><input type="text" value={storyReply} onChange={(e)=>setStoryReply(e.target.value)} placeholder={`Reply to ${viewingStory.username}...`} className="w-full bg-black/40 border border-zinc-500 rounded-full py-3 px-5 text-white placeholder-zinc-300 outline-none focus:border-white transition backdrop-blur-md" /></form><button onClick={() => handleStoryLike(viewingStory.id)} className="p-3"><Heart size={32} className={`transition-all hover:scale-110 ${viewingStory.user_liked ? 'fill-pink-500 text-pink-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]' : 'text-white drop-shadow-md'}`} /></button></div> )}
                    </div>
                </div>
            )}

            <div className="p-4 border-b border-zinc-800 flex gap-4 overflow-x-auto items-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {userId && (
                    <>
                        <input type="file" accept="image/*, video/mp4, video/webm" ref={storyInputRef} onChange={startStoryDraft} className="hidden" />
                        <div onClick={() => storyInputRef.current.click()} className="w-24 h-36 flex-shrink-0 rounded-2xl bg-zinc-900 border border-zinc-800 relative flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:border-zinc-600 transition group">
                            {currentUserInfo?.profile_pic_url && <img src={`${BACKEND_URL}${currentUserInfo.profile_pic_url}`} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition duration-300" />}
                            <div className="z-10 bg-blue-600 rounded-full p-2 mb-2 shadow-[0_0_10px_rgba(37,99,235,0.5)]"><Plus size={20} className="text-white"/></div>
                            <span className="z-10 text-xs font-bold text-white drop-shadow-md">Add Story</span>
                        </div>
                    </>
                )}
                {uniqueStories.map((story) => {
                    const isSeen = Number(story.user_has_viewed) > 0;
                    return (
                        <div key={`story-${story.id}`} onClick={() => openStoryViewer(story.user_id)} className={`w-24 h-36 flex-shrink-0 rounded-2xl relative cursor-pointer overflow-hidden ring-2 ring-offset-2 ring-offset-black group transition-all duration-500 ${isSeen ? 'ring-zinc-600 opacity-60 hover:opacity-100' : 'ring-blue-500'}`}>
                            {story.media_type === 'video' ? <video src={`${BACKEND_URL}/api/stream/${story.media_url.split('/').pop()}`} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" style={{ filter: story.filter_class }} autoPlay muted loop playsInline /> : <img src={`${BACKEND_URL}${story.media_url}`} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" style={{ filter: story.filter_class }} />}
                            <div className="absolute top-2 left-2 w-8 h-8 rounded-full border-2 border-transparent bg-zinc-800 overflow-hidden shadow-lg z-10">{story.profile_pic_url ? <img src={`${BACKEND_URL}${story.profile_pic_url}`} className="w-full h-full object-cover" /> : <User size={16} className="m-auto mt-1 text-zinc-500" />}</div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
                            <span className="absolute bottom-2 left-2 right-2 text-xs text-white font-medium truncate drop-shadow-md z-10">{story.username}</span>
                        </div>
                    );
                })}
            </div>

            <div>
                {posts.length === 0 && <p className="text-center text-zinc-500 mt-10">No posts yet.</p>}
                {posts.map((post) => (
                    <div key={post.id} className="p-4 border-b border-zinc-800 hover:bg-zinc-950/30 transition flex gap-4">
                        <Link to={`/profile/${post.user_id}`} className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden border border-zinc-700">{post.profile_pic_url ? <img src={`${BACKEND_URL}${post.profile_pic_url}`} className="w-full h-full object-cover" /> : <span className="text-xl text-zinc-500 font-bold">{post.username.charAt(0).toUpperCase()}</span>}</Link>
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

                            {post.image_url && <img onClick={() => setViewingPostImage(`${BACKEND_URL}${post.image_url}`)} src={`${BACKEND_URL}${post.image_url}`} className="rounded-2xl border border-zinc-800 max-h-[500px] w-auto object-cover mb-3 cursor-pointer hover:opacity-90 transition"/>}
                            
                            <div className="flex justify-between items-center text-zinc-500 mt-2 max-w-sm pr-10">
                                <div className="flex items-center gap-1 group"><button onClick={() => handleLike(post.id)} className={`flex items-center gap-2 transition ${post.user_liked === 1 ? 'text-pink-600' : 'hover:text-pink-500'}`}><div className="p-2 rounded-full group-hover:bg-pink-500/10"><Heart size={18} className={post.user_liked === 1 ? "fill-pink-600" : ""} /></div></button><span onClick={() => toggleLikes(post.id)} className="text-sm font-medium hover:text-pink-500 hover:underline cursor-pointer">{post.like_count > 0 ? post.like_count : ''}</span></div>
                                <div className="flex items-center gap-1 group"><button onClick={() => toggleComments(post.id)} className="flex items-center gap-2 hover:text-blue-500 transition"><div className="p-2 rounded-full group-hover:bg-blue-500/10"><MessageCircle size={18} /></div></button><span onClick={() => toggleComments(post.id)} className="text-sm font-medium hover:text-blue-500 hover:underline cursor-pointer">{post.comment_count > 0 ? post.comment_count : ''}</span></div>
                                <button className="flex items-center gap-2 hover:text-blue-500 group transition"><div className="p-2 rounded-full group-hover:bg-blue-500/10"><Share size={18} /></div></button>
                            </div>
                            
                            {/* Comments and Likes panels remain exactly the same below... */}
                            {activeLikesPostId === post.id && (
                                <div className="mt-3 pt-3 border-t border-zinc-800 animate-fade-in"><h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Liked by</h4><div className="flex flex-wrap gap-2">{likesData[post.id]?.length === 0 && <p className="text-sm text-zinc-500">No likes yet.</p>}{likesData[post.id]?.map(user => (<Link key={user.id} to={`/profile/${user.id}`} className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800 hover:bg-zinc-800 transition">{user.profile_pic_url ? <img src={`${BACKEND_URL}${user.profile_pic_url}`} className="w-5 h-5 rounded-full object-cover" /> : <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-white">{user.username.charAt(0).toUpperCase()}</div>}<span className="text-sm text-zinc-300">{user.username}</span></Link>))}</div></div>
                            )}

                            {activeCommentPostId === post.id && (
                                <div className="mt-3 pt-3 border-t border-zinc-800 animate-fade-in">
                                    <form onSubmit={(e) => submitComment(e, post.id)} className="flex gap-3 mb-4"><div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">{currentUserInfo?.profile_pic_url ? <img src={`${BACKEND_URL}${currentUserInfo.profile_pic_url}`} className="w-full h-full object-cover" /> : <User size={16} className="m-auto mt-2 text-zinc-500" />}</div><div className="w-full flex bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden focus-within:border-blue-500 transition"><input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Post your reply..." className="w-full bg-transparent px-4 py-2 text-sm text-white outline-none placeholder-zinc-500" /><button type="submit" disabled={!newComment.trim()} className="px-4 text-blue-500 hover:text-blue-400 disabled:opacity-50"><Send size={16} /></button></div></form>
                                    <div className="space-y-4">{commentsData[post.id] && commentsData[post.id].map(comment => (<div key={comment.id} className="flex gap-3"><Link to={`/profile/${comment.user_id}`} className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">{comment.profile_pic_url ? <img src={`${BACKEND_URL}${comment.profile_pic_url}`} className="w-full h-full object-cover" /> : <User size={16} className="m-auto mt-2 text-zinc-500" />}</Link><div className="bg-zinc-900/50 p-3 rounded-2xl rounded-tl-sm w-full border border-zinc-800/50"><div className="flex items-center gap-2 mb-1"><Link to={`/profile/${comment.user_id}`} className="font-bold text-white text-sm hover:underline">{comment.username}</Link><span className="text-zinc-600 text-xs">{formatTimeFriendly(comment.created_at)}</span></div><p className="text-zinc-200 text-sm">{comment.content}</p></div></div>))}</div>
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