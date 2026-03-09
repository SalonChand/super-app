import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
// 🔥 BUG FIX: EVERY SINGLE ICON IS NOW IMPORTED PERFECTLY! 🔥
import { ThumbsUp, MessageCircle, Share, Camera, X, Clapperboard, Volume2, VolumeX, Play, MoreHorizontal, Plus, Send, User, Music, ChevronDown, BadgeCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';
let globalMuteState = true; 

const ReelVideo = ({ reel, userId, currentUserInfo, onLike, onDuet }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const[isMuted, setIsMuted] = useState(globalMuteState); 
    
    // Comment Panel States
    const[showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');

    // 🔥 Mobile Video Streaming URL 🔥
    const videoFileName = reel.video_url.split('/').pop();
    const streamUrl = `${BACKEND_URL}/api/stream/${videoFileName}`;

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.defaultMuted = true;
            videoRef.current.muted = isMuted;
            videoRef.current.setAttribute('playsinline', '');
            videoRef.current.setAttribute('webkit-playsinline', '');
        }
    }, [isMuted]);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsMuted(globalMuteState);
                if (videoRef.current) {
                    videoRef.current.muted = globalMuteState;
                    videoRef.current.currentTime = 0; 
                    const playPromise = videoRef.current.play();
                    if (playPromise !== undefined) {
                        playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
                    }
                }
            } else {
                if (videoRef.current) {
                    videoRef.current.pause();
                    setIsPlaying(false);
                    setShowComments(false);
                }
            }
        }, { threshold: 0.6 }); 

        if (videoRef.current) observer.observe(videoRef.current);
        return () => observer.disconnect();
    }, []);

    const handleScreenTap = (e) => {
        e.stopPropagation(); 
        if (showComments) { setShowComments(false); return; }
        
        if (videoRef.current) {
            if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); } 
            else { videoRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error(e)); }
        }
    };

    const toggleMute = (e) => {
        e.stopPropagation();
        const newState = !isMuted;
        setIsMuted(newState);
        globalMuteState = newState; 
        if (videoRef.current) videoRef.current.muted = newState;
    };

    const handleShare = (e) => {
        e.stopPropagation();
        if (navigator.share) {
            navigator.share({ title: 'Check out this Reel!', url: window.location.href }).catch(console.error);
        } else { alert("Link copied!"); }
    };

    const handleSave = async (e) => {
        e.stopPropagation();
        try {
            const a = document.createElement('a');
            a.href = streamUrl;
            a.download = `reel_${reel.id}.mp4`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch(err) { alert('Could not save video. Try long-pressing the video instead.'); }
    };

    const handleOpenComments = async (e) => {
        e.stopPropagation();
        setShowComments(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/api/posts/${reel.id}/comments`);
            setComments(res.data);
        } catch (err) { console.error(err); }
    };

    const submitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !userId) return;
        try {
            await axios.post(`${BACKEND_URL}/api/posts/${reel.id}/comment`, { userId, content: newComment });
            setNewComment('');
            const res = await axios.get(`${BACKEND_URL}/api/posts/${reel.id}/comments`);
            setComments(res.data);
        } catch (err) { console.error(err); }
    };

    return (
        <div className="w-full h-[calc(100dvh-60px)] sm:h-screen snap-start relative bg-black overflow-hidden flex flex-col justify-end group">
            
            {/* The Video Layer */}
            <div className="absolute inset-0 z-0 cursor-pointer" onClick={handleScreenTap}>
                <video 
                    ref={videoRef}
                    src={streamUrl} 
                    className="w-full h-full object-cover"
                    loop playsInline autoPlay muted={isMuted} preload="auto"
                />
            </div>

            <button onClick={toggleMute} className="absolute top-20 right-4 z-40 bg-black/40 p-2 rounded-full text-white backdrop-blur-md hover:bg-black/60 transition shadow-lg">
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            {!isPlaying && !showComments && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="bg-black/50 p-5 rounded-full backdrop-blur-md shadow-2xl">
                        <Play size={40} className="text-white ml-2 opacity-90 fill-white" />
                    </div>
                </div>
            )}

            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10"></div>

            {/* 🔥 BOTTOM LAYOUT (Facebook Style) 🔥 */}
            <div className="relative z-30 w-full flex justify-between items-end p-4 pb-6 pointer-events-none">
                
                {/* ⬅️ BOTTOM LEFT: User Info */}
                <div className="w-[80%] pointer-events-auto flex flex-col gap-3 pb-2">
                    <div className="flex items-center gap-2">
                        <Link to={`/profile/${reel.user_id}`} className="w-10 h-10 rounded-full border border-zinc-500 bg-zinc-800 overflow-hidden shadow-lg hover:opacity-80 transition">
                            {reel.profile_pic_url ? <img src={`${reel.profile_pic_url}`} className="w-full h-full object-cover" alt="Profile" /> : <div className="flex items-center justify-center h-full text-white font-bold">{reel.username.charAt(0).toUpperCase()}</div>}
                        </Link>
                        
                        <Link to={`/profile/${reel.user_id}`} className="text-white font-bold text-[16px] hover:underline drop-shadow-md">
                            {reel.username}
                        </Link>
                        
                        {reel.user_id != userId && (
                            <>
                                <span className="text-white font-bold text-xs drop-shadow-md mx-0.5">•</span>
                                <button className="text-blue-400 font-semibold text-[15px] drop-shadow-md hover:text-blue-300 transition">Follow</button>
                            </>
                        )}
                    </div>
                    {reel.caption && <p className="text-white text-[15px] drop-shadow-md leading-snug line-clamp-2 mt-1">{reel.caption}</p>}
                    {reel.song_name && (
                        <div className="flex items-center gap-1.5 mt-1.5 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 w-fit">
                            <Music size={11} className="text-white animate-spin" style={{animationDuration:'3s'}}/>
                            <span className="text-white text-xs font-medium truncate max-w-[140px]">{reel.song_name}</span>
                        </div>
                    )}
                </div>

                {/* ➡️ BOTTOM RIGHT: Action Buttons Stack */}
                <div className="flex flex-col items-center gap-6 pointer-events-auto flex-shrink-0 pb-2">
                    
                    <div className="flex flex-col items-center gap-1 cursor-pointer group" onClick={(e) => { e.stopPropagation(); onLike(reel.id); }}>
                        <button className={`transition drop-shadow-lg ${reel.user_liked === 1 ? 'text-blue-500' : 'text-white hover:text-zinc-300'}`}>
                            <ThumbsUp size={30} className={reel.user_liked === 1 ? "fill-blue-500" : ""} />
                        </button>
                        <span className="text-white text-sm font-semibold drop-shadow-md">{reel.like_count > 0 ? reel.like_count : 'Like'}</span>
                    </div>

                    <div className="flex flex-col items-center gap-1 cursor-pointer group" onClick={handleOpenComments}>
                        <button className="text-white hover:text-zinc-300 transition drop-shadow-lg">
                            <MessageCircle size={30} />
                        </button>
                        <span className="text-white text-sm font-semibold drop-shadow-md">Comment</span>
                    </div>

                    <div className="flex flex-col items-center gap-1 cursor-pointer group" onClick={handleShare}>
                        <button className="text-white hover:text-zinc-300 transition drop-shadow-lg">
                            <Share size={30} />
                        </button>
                        <span className="text-white text-sm font-semibold drop-shadow-md">Share</span>
                    </div>

                    {/* Save to device */}
                    <div className="flex flex-col items-center gap-1 cursor-pointer group" onClick={handleSave}>
                        <button className="text-white hover:text-zinc-300 transition drop-shadow-lg text-2xl">⬇️</button>
                        <span className="text-white text-sm font-semibold drop-shadow-md">Save</span>
                    </div>

                    {/* Duet */}
                    {reel.user_id != userId && (
                        <div className="flex flex-col items-center gap-1 cursor-pointer group" onClick={(e) => { e.stopPropagation(); onDuet && onDuet(reel); }}>
                            <button className="text-white hover:text-zinc-300 transition drop-shadow-lg text-2xl">🎭</button>
                            <span className="text-white text-sm font-semibold drop-shadow-md">Duet</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 🔥 SLIDE-UP COMMENT PANEL 🔥 */}
            {showComments && (
                <div className="absolute bottom-0 left-0 w-full h-[60%] bg-zinc-950 rounded-t-3xl z-40 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-slide-up border-t border-zinc-800">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950 rounded-t-3xl">
                        <h3 className="text-white font-bold mx-auto">Comments</h3>
                        <button onClick={() => setShowComments(false)} className="text-zinc-400 hover:text-white absolute right-4"><X size={24}/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {comments.length === 0 ? <p className="text-center text-zinc-500 mt-4">Be the first to comment!</p> : null}
                        {comments.map(c => (
                            <div key={c.id} className="flex gap-3">
                                <Link to={`/profile/${c.user_id}`} className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
                                    {c.profile_pic_url ? <img src={`${c.profile_pic_url}`} className="w-full h-full object-cover" /> : <User size={16} className="m-auto mt-2 text-zinc-500" />}
                                </Link>
                                <div className="flex-1">
                                    <p className="text-zinc-400 text-xs font-bold mb-0.5">{c.username}</p>
                                    <p className="text-white text-sm leading-snug">{c.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={submitComment} className="p-3 border-t border-zinc-800 bg-zinc-950 flex gap-3 pb-8 sm:pb-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
                            {currentUserInfo?.profile_pic_url ? <img src={`${currentUserInfo.profile_pic_url}`} className="w-full h-full object-cover" /> : <User size={20} className="m-auto mt-2.5 text-zinc-500" />}
                        </div>
                        <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 text-white outline-none focus:border-blue-500 transition" />
                        <button type="submit" disabled={!newComment.trim()} className="bg-blue-600 text-white p-2.5 rounded-full disabled:opacity-50"><Send size={18} /></button>
                    </form>
                </div>
            )}
        </div>
    );
};

// ==================================================
// MAIN PAGE COMPONENT
// ==================================================

// Colored verified badge based on verify_type
function VerifiedBadge({ isVerified, verifyType, size = 14 }) {
    if (!isVerified) return null;
    const titles = { red: 'Platform Owner', green: 'Verified Politician', yellow: 'Verified Celebrity', blue: 'Verified Account' };
    const t = verifyType || 'blue';
    const title = titles[t] || titles.blue;
    const colors = { red: 'text-red-500', green: 'text-green-500', yellow: 'text-yellow-400', blue: 'text-blue-400' };
    const style = t === 'red' ? { filter: 'drop-shadow(0 0 3px rgba(239,68,68,0.7))' } : {};
    return <BadgeCheck size={size} className={`flex-shrink-0 ${colors[t] || colors.blue}`} title={title} style={style}/>;
}

function Reels() {
    const[reels, setReels] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const[videoFile, setVideoFile] = useState(null);
    const [caption, setCaption] = useState('');
    const userId = localStorage.getItem('userId');
    const fileInputRef = useRef(null);
    const duetFileRef = useRef(null);
    const[currentUserInfo, setCurrentUserInfo] = useState(null);
    // Duet state
    const [duetTarget, setDuetTarget] = useState(null); // reel being dueted
    const [duetFile, setDuetFile] = useState(null);
    const [duetCaption, setDuetCaption] = useState('');
    const [showDuetModal, setShowDuetModal] = useState(false);
    const [songName, setSongName] = useState('');
    const [showMusicPicker, setShowMusicPicker] = useState(false);
    const PRESET_SONGS = [
        { name: 'No Music', url: null },
        { name: '🎵 Trending Beat', url: null },
        { name: '🔥 Viral Sound', url: null },
        { name: '✨ Chill Vibes', url: null },
        { name: '💃 Dance Mode', url: null },
        { name: '🌙 Night Drive', url: null },
    ];

    const [isRefreshing, setIsRefreshing] = useState(false);
    const loadReels = async () => {
        setIsRefreshing(true);
        try {
            const requests = [axios.get(`${BACKEND_URL}/api/reels?userId=${userId}`)];
            if (userId) requests.push(axios.get(`${BACKEND_URL}/api/users/${userId}`));
            const [reelsRes, userRes] = await Promise.all(requests);
            if (Array.isArray(reelsRes.data)) setReels(reelsRes.data);
            if (userRes) setCurrentUserInfo(userRes.data);
        } catch (err) { console.error("Error fetching reels:", err); } finally { setIsRefreshing(false); }
    };

    useEffect(() => { loadReels(); }, []);

    const handleLike = async (reelId) => {
        if (!userId) return alert("Please log in to like videos!");
        setReels(reels.map(r => r.id === reelId ? { 
            ...r, 
            user_liked: r.user_liked ? 0 : 1, 
            like_count: r.like_count + (r.user_liked ? -1 : 1) 
        } : r));
        try { await axios.post(`${BACKEND_URL}/api/reels/${reelId}/like`, { userId }); } catch (err) { loadReels(); }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) { setVideoFile(file); setShowUploadModal(true); }
    };

    const uploadReel = async () => {
        if (!videoFile) return;
        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('video', videoFile);
        formData.append('caption', caption);
        if (songName && songName !== 'No Music') formData.append('song_name', songName);
        try {
            setUploading(true);
            await axios.post(`${BACKEND_URL}/api/reels`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setUploading(false); setShowUploadModal(false); setVideoFile(null); setCaption(''); setSongName(''); loadReels(); 
        } catch (error) { console.error(error); setUploading(false); alert("Upload failed."); }
    };

    const handleDuet = (reel) => {
        if (!userId) return alert("Please log in to create duets!");
        setDuetTarget(reel);
        setShowDuetModal(true);
        setDuetCaption(`Duet with @${reel.username}`);
    };

    const uploadDuet = async () => {
        if (!duetFile || !duetTarget) return;
        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('video', duetFile);
        formData.append('caption', duetCaption);
        try {
            setUploading(true);
            await axios.post(`${BACKEND_URL}/api/reels/${duetTarget.id}/duet`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setUploading(false); setShowDuetModal(false); setDuetFile(null); setDuetTarget(null); loadReels();
            alert('🎭 Duet posted!');
        } catch(e) { console.error(e); setUploading(false); alert("Duet upload failed."); }
    };

    return (
        <div className="w-full relative bg-black h-[calc(100dvh-60px)] sm:h-screen overflow-hidden">
            
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-50 pointer-events-none">
                <h2 className="text-white font-extrabold text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Watch</h2>
                <input type="file" accept="video/mp4, video/webm, video/quicktime" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                <button onClick={() => fileInputRef.current.click()} className="pointer-events-auto cursor-pointer bg-black/40 backdrop-blur-md text-white p-2.5 rounded-full border border-zinc-600 hover:bg-black/60 transition shadow-lg">
                    <Camera size={24} />
                </button>
            </div>

            {showUploadModal && (
                <div className="fixed inset-0 z-[120] bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in">
                    <button onClick={() => { setShowUploadModal(false); setVideoFile(null); }} className="absolute top-4 right-4 text-white bg-zinc-800 rounded-full p-2 hover:bg-zinc-700 transition"><X size={24} /></button>
                    <h2 className="text-2xl font-bold text-white mb-6">New Short Video</h2>
                    <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl">
                        <div className="aspect-[9/16] bg-black rounded-xl mb-4 overflow-hidden border border-zinc-700 relative">
                            <video src={URL.createObjectURL(videoFile)} className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline />
                        </div>
                        <input type="text" value={caption} onChange={(e)=>setCaption(e.target.value)} placeholder="Write a catchy caption..." className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white placeholder-zinc-500 mb-4 outline-none focus:border-blue-500 transition" />
                        {/* Music picker */}
                        <div className="mb-4">
                            <button onClick={() => setShowMusicPicker(!showMusicPicker)}
                                className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white hover:border-zinc-500 transition">
                                <div className="flex items-center gap-2">
                                    <Music size={16} className="text-purple-400"/>
                                    <span className="text-sm">{songName || 'Add Music'}</span>
                                </div>
                                <ChevronDown size={16} className={`text-zinc-400 transition-transform ${showMusicPicker ? 'rotate-180' : ''}`} />
                            </button>
                            {showMusicPicker && (
                                <div className="mt-1 bg-zinc-950 border border-zinc-700 rounded-xl overflow-hidden shadow-xl">
                                    {PRESET_SONGS.map(song => (
                                        <button key={song.name} onClick={() => { setSongName(song.name === 'No Music' ? '' : song.name); setShowMusicPicker(false); }}
                                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-800 transition flex items-center gap-2 ${songName === song.name ? 'text-purple-400 font-bold' : 'text-zinc-300'}`}>
                                            {songName === (song.name === 'No Music' ? '' : song.name) && <span className="text-purple-400">✓</span>}
                                            {song.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={uploadReel} disabled={uploading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-500 transition disabled:opacity-50">
                            {uploading ? "Uploading..." : "Share Video"}
                        </button>
                    </div>
                </div>
            )}

            <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {reels.length === 0 ? (
                    <div className="h-full w-full flex flex-col items-center justify-center text-zinc-500">
                        <Clapperboard size={56} className="mb-4 opacity-40" />
                        <p className="font-medium text-lg">No videos yet.</p>
                        <p className="text-sm">Be the first to upload!</p>
                    </div>
                ) : (
                    reels.map(reel => (
                        <ReelVideo key={reel.id} reel={reel} userId={userId} currentUserInfo={currentUserInfo} onLike={handleLike} onDuet={handleDuet} />
                    ))
                )}
            </div>

            {/* Duet Modal */}
            {showDuetModal && duetTarget && (
                <div className="fixed inset-0 z-[120] bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in">
                    <button onClick={() => { setShowDuetModal(false); setDuetFile(null); setDuetTarget(null); }} className="absolute top-4 right-4 text-white bg-zinc-800 rounded-full p-2"><X size={24}/></button>
                    <h2 className="text-2xl font-bold text-white mb-2">🎭 Create Duet</h2>
                    <p className="text-zinc-400 text-sm mb-6">Recording alongside <span className="text-white font-bold">@{duetTarget.username}</span></p>
                    <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl">
                        {/* Original video preview */}
                        <div className="aspect-video bg-black rounded-xl mb-4 overflow-hidden border border-zinc-700">
                            <video src={`${BACKEND_URL}/api/stream/${duetTarget.video_url.split('/').pop()}`} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                        </div>
                        <input type="file" ref={duetFileRef} accept="video/*" className="hidden" onChange={e => { if (e.target.files[0]) setDuetFile(e.target.files[0]); }} />
                        {duetFile ? (
                            <div className="mb-4">
                                <div className="aspect-video bg-black rounded-xl overflow-hidden border border-zinc-700 mb-2">
                                    <video src={URL.createObjectURL(duetFile)} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                                </div>
                                <p className="text-zinc-400 text-sm text-center">Your video ✓</p>
                            </div>
                        ) : (
                            <button onClick={() => duetFileRef.current.click()} className="w-full border-2 border-dashed border-zinc-600 rounded-xl p-6 text-zinc-400 hover:border-zinc-400 hover:text-zinc-200 transition mb-4 text-center">
                                <span className="text-3xl block mb-2">🎬</span>
                                <span className="text-sm font-medium">Tap to record your side</span>
                            </button>
                        )}
                        <input value={duetCaption} onChange={e => setDuetCaption(e.target.value)} placeholder="Caption..." className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white placeholder-zinc-500 mb-4 outline-none focus:border-blue-500 transition text-sm" />
                        <button onClick={uploadDuet} disabled={!duetFile || uploading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-500 transition disabled:opacity-50">
                            {uploading ? "Uploading..." : "🎭 Post Duet"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Reels;