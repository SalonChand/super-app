import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Flame, User, BadgeCheck, Send, Trophy, Zap, Clock, X, Check, Users, SwitchCamera, ChevronRight, AlertTriangle } from 'lucide-react';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

function VerifiedBadge({ isVerified, verifyType, size = 13 }) {
    if (!isVerified) return null;
    const colors = { red: 'text-red-500', green: 'text-green-500', yellow: 'text-yellow-400', blue: 'text-blue-400' };
    const t = verifyType || 'blue';
    return <BadgeCheck size={size} className={`flex-shrink-0 ${colors[t] || colors.blue}`} />;
}

function getStreakEmoji(count) {
    if (count >= 365) return '👑';
    if (count >= 100) return '💎';
    if (count >= 50)  return '🔥';
    if (count >= 14)  return '⚡';
    if (count >= 7)   return '✨';
    if (count >= 3)   return '🌟';
    return '🔥';
}

function getStreakColor(count) {
    if (!count || count === 0) return { text: 'text-zinc-500', bg: 'bg-zinc-800', border: 'border-zinc-700', glow: 'shadow-zinc-700/30' };
    if (count >= 365) return { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', glow: 'shadow-yellow-500/30' };
    if (count >= 100) return { text: 'text-cyan-400',   bg: 'bg-cyan-500/20',   border: 'border-cyan-500/40',   glow: 'shadow-cyan-500/30' };
    if (count >= 50)  return { text: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/40', glow: 'shadow-orange-500/30' };
    if (count >= 14)  return { text: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/40', glow: 'shadow-purple-500/30' };
    if (count >= 7)   return { text: 'text-blue-400',   bg: 'bg-blue-500/20',   border: 'border-blue-500/40',   glow: 'shadow-blue-500/30' };
    return               { text: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/40', glow: 'shadow-orange-500/30' };
}

function hoursLeft(lastInteraction) {
    if (!lastInteraction) return 24;
    const diff = Date.now() - new Date(lastInteraction).getTime();
    const hoursUsed = diff / (1000 * 60 * 60);
    return Math.max(0, Math.round(24 - hoursUsed));
}

function isAtRisk(lastInteraction) {
    if (!lastInteraction) return false;
    const hours = hoursLeft(lastInteraction);
    return hours > 0 && hours <= 4;
}

// ─── Fullscreen Snap Viewer ────────────────────────────────────────────────
function SnapViewer({ snap, onClose, onAccept, onDismiss }) {
    const videoRef = useRef(null);
    const [videoError, setVideoError] = useState(false);
    const [loading, setLoading] = useState(true);

    // Log snap data for debugging
    useEffect(() => {
        console.log('[SnapViewer] snap data:', JSON.stringify(snap));
    }, []);

    useEffect(() => {
        if (snap.media_type === 'video' && videoRef.current) {
            videoRef.current.play().catch(e => console.log('[SnapViewer] play error:', e));
        }
    }, []);

    return (
        <div className="fixed inset-0 z-[300] bg-black flex flex-col">
            {/* Fullscreen media */}
            <div className="relative flex-1 overflow-hidden">
                {snap.media_type === 'video' && snap.media_url ? (
                    <>
                        <video ref={videoRef}
                            src={snap.media_url}
                            autoPlay loop playsInline controls={videoError}
                            onLoadStart={() => setLoading(true)}
                            onCanPlay={() => setLoading(false)}
                            onError={(e) => { console.log('[SnapViewer] video error:', e); setVideoError(true); setLoading(false); }}
                            className="w-full h-full object-contain bg-black"/>
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"/>
                            </div>
                        )}
                        {videoError && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center px-6">
                                <p className="text-red-400 text-sm font-bold mb-2">⚠️ Video failed to load</p>
                                <a href={snap.media_url} target="_blank" rel="noreferrer"
                                    className="text-orange-400 underline text-xs">Open in browser</a>
                            </div>
                        )}
                    </>
                ) : snap.media_url && snap.media_type === 'image' ? (
                    <img src={snap.media_url} className="w-full h-full object-contain bg-black" alt="snap"/>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center px-8 bg-gradient-to-br from-orange-900/30 to-black">
                        <div className="w-20 h-20 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mb-6">
                            <Flame size={36} className="text-orange-400"/>
                        </div>
                        <p className="text-white text-2xl font-bold text-center leading-tight">{snap.message || '🔥'}</p>
                    </div>
                )}

                {/* Sender info overlay — top */}
                <div className="absolute top-0 left-0 right-0 flex items-center gap-3 p-4 pt-10"
                    style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}>
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-orange-500 flex-shrink-0">
                        {snap.profile_pic_url
                            ? <img src={snap.profile_pic_url} className="w-full h-full object-cover"/>
                            : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><User size={16} className="text-zinc-500"/></div>}
                    </div>
                    <div className="flex-1">
                        <p className="text-white font-bold text-sm">{snap.username}</p>
                        <p className="text-zinc-300 text-xs">
                            {snap.media_type === 'video' ? '📹 Video snap' : '💬 Text snap'}
                        </p>
                    </div>
                    <button onClick={onClose}
                        className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center">
                        <X size={18} className="text-white"/>
                    </button>
                </div>

                {/* Actions — bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-6 pb-12 flex items-center justify-center gap-6"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                    {snap.isSent ? (
                        // Sent snap — just show who it was sent to
                        <div className="flex flex-col items-center gap-2">
                            <div className={`px-4 py-2 rounded-full border text-sm font-bold ${snap.is_read ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-zinc-800 border-zinc-600 text-zinc-300'}`}>
                                {snap.is_read ? '✓ Seen by ' + snap.username : '• Delivered to ' + snap.username}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Dismiss */}
                            <button onClick={onDismiss} className="flex flex-col items-center gap-1.5">
                                <div className="w-14 h-14 rounded-full bg-zinc-800/80 border border-zinc-600 flex items-center justify-center backdrop-blur-sm">
                                    <X size={24} className="text-zinc-300"/>
                                </div>
                                <span className="text-zinc-400 text-xs font-bold">Dismiss</span>
                            </button>
                            {/* Accept */}
                            <button onClick={onAccept} className="flex flex-col items-center gap-1.5">
                                <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/50">
                                    <Flame size={28} className="text-white"/>
                                </div>
                                <span className="text-orange-400 text-xs font-bold">Accept 🔥</span>
                            </button>
                            {/* Reply */}
                            <button onClick={onClose} className="flex flex-col items-center gap-1.5">
                                <div className="w-14 h-14 rounded-full bg-zinc-800/80 border border-zinc-600 flex items-center justify-center backdrop-blur-sm">
                                    <Send size={20} className="text-zinc-300"/>
                                </div>
                                <span className="text-zinc-400 text-xs font-bold">Reply</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Fullscreen Camera Page ────────────────────────────────────────────────
function CameraPage({ friends, onClose, onSent }) {
    const [phase, setPhase] = useState('camera');   // camera | preview | sending
    const [facingMode, setFacingMode] = useState('user');
    const [recording, setRecording] = useState(false);
    const [progress, setProgress] = useState(0);     // 0–100 for ring
    const [videoBlob, setVideoBlob] = useState(null);
    const [videoUrl, setVideoUrl] = useState(null);
    const [selectedFriends, setSelectedFriends] = useState(new Set());
    const [sentIds, setSentIds] = useState(new Set());
    const [sendingAll, setSendingAll] = useState(false);

    const videoRef = useRef(null);
    const previewRef = useRef(null);
    const streamRef = useRef(null);
    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const mimeRef = useRef('');
    const progressRef = useRef(null);
    const maxDuration = 10000; // 10s max
    const startTimeRef = useRef(null);
    const userId = localStorage.getItem('userId');

    // Start camera on mount
    useEffect(() => {
        openCamera(facingMode);
        return () => {
            stopStream();
            if (videoUrl) URL.revokeObjectURL(videoUrl);
        };
    }, []);

    // Attach stream to video element whenever phase is camera
    useEffect(() => {
        if (phase === 'camera' && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
        }
    }, [phase]);

    // Attach blob to preview
    useEffect(() => {
        if (phase === 'preview' && previewRef.current && videoUrl) {
            previewRef.current.src = videoUrl;
            previewRef.current.play().catch(() => {});
        }
    }, [phase, videoUrl]);

    const stopStream = () => {
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    };

    const openCamera = async (facing) => {
        stopStream();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.muted = true;
                videoRef.current.play().catch(() => {});
            }
        } catch (e) {
            alert('Camera permission denied. Please allow access and try again.');
            onClose();
        }
    };

    const flipCamera = async () => {
        const next = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(next);
        await openCamera(next);
    };

    // ── Hold to record ──────────────────────────────────────────
    const startHoldRecord = useCallback(() => {
        if (!streamRef.current || recording) return;
        const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4', '']
            .find(t => t === '' || MediaRecorder.isTypeSupported(t));
        mimeRef.current = mime;
        chunksRef.current = [];

        const recorder = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : {});
        recorderRef.current = recorder;
        recorder.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data); };
        recorder.onstop = () => {
            stopStream();
            const type = mimeRef.current || 'video/webm';
            const blob = new Blob(chunksRef.current, { type });
            const url = URL.createObjectURL(blob);
            setVideoBlob(blob);
            setVideoUrl(url);
            setPhase('preview');
        };

        recorder.start(100);
        setRecording(true);
        setProgress(0);
        startTimeRef.current = Date.now();

        // Animate progress ring
        const tick = () => {
            const elapsed = Date.now() - startTimeRef.current;
            const pct = Math.min((elapsed / maxDuration) * 100, 100);
            setProgress(pct);
            if (pct < 100) {
                progressRef.current = requestAnimationFrame(tick);
            } else {
                stopHoldRecord();
            }
        };
        progressRef.current = requestAnimationFrame(tick);
    }, [recording, facingMode]);

    const stopHoldRecord = useCallback(() => {
        cancelAnimationFrame(progressRef.current);
        setRecording(false);
        setProgress(0);
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
        }
    }, []);

    // Touch & mouse events
    const handlePressStart = (e) => { e.preventDefault(); startHoldRecord(); };
    const handlePressEnd = (e) => { e.preventDefault(); if (recording) stopHoldRecord(); };

    // ── Friend picker send ──────────────────────────────────────
    const toggleFriend = (id) => {
        setSelectedFriends(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const sendToSelected = async () => {
        if (selectedFriends.size === 0) return;
        setSendingAll(true);
        const ext = mimeRef.current?.includes('mp4') ? 'mp4' : 'webm';
        for (const friendId of selectedFriends) {
            if (sentIds.has(friendId)) continue;
            try {
                const fd = new FormData();
                fd.append('fromUserId', userId);
                fd.append('toUserId', friendId);
                fd.append('media', videoBlob, `snap.${ext}`);
                await axios.post(`${BACKEND_URL}/api/streaks/snap`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                setSentIds(prev => new Set([...prev, friendId]));
            } catch (e) {}
        }
        setSendingAll(false);
        onSent();
        onClose();
    };

    const retake = () => {
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        setVideoBlob(null);
        setVideoUrl(null);
        setSelectedFriends(new Set());
        setSentIds(new Set());
        setPhase('camera');
        openCamera(facingMode);
    };

    // ── CAMERA PHASE ─────────────────────────────────────────────
    if (phase === 'camera') return (
        <div className="fixed inset-0 z-[300] bg-black flex flex-col">
            {/* Viewfinder */}
            <div className="relative flex-1 overflow-hidden">
                <video ref={videoRef} autoPlay muted playsInline
                    className="w-full h-full object-cover"
                    style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}/>

                {/* Top bar */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-10">
                    <button onClick={onClose}
                        className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                        <X size={20} className="text-white"/>
                    </button>
                    <div className="bg-black/50 rounded-full px-3 py-1.5 backdrop-blur-sm">
                        <p className="text-white text-xs font-bold">Hold to record · 10s max</p>
                    </div>
                    <button onClick={flipCamera}
                        className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                        <SwitchCamera size={20} className="text-white"/>
                    </button>
                </div>
            </div>

            {/* Bottom controls */}
            <div className="bg-black flex flex-col items-center pb-12 pt-6 gap-2">
                {recording && (
                    <p className="text-red-400 text-xs font-bold animate-pulse mb-1">● Recording... release to stop</p>
                )}

                {/* Hold-to-record button */}
                <div className="relative flex items-center justify-center w-24 h-24"
                    onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
                    onTouchStart={handlePressStart} onTouchEnd={handlePressEnd}>

                    {/* Progress ring SVG */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 96 96">
                        <circle cx="48" cy="48" r="44" fill="none" stroke="#27272a" strokeWidth="4"/>
                        <circle cx="48" cy="48" r="44" fill="none" stroke="#f97316" strokeWidth="4"
                            strokeDasharray={`${2 * Math.PI * 44}`}
                            strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
                            strokeLinecap="round"
                            style={{ transition: recording ? 'none' : 'stroke-dashoffset 0.3s ease' }}/>
                    </svg>

                    {/* Inner button */}
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all select-none ${
                        recording ? 'bg-red-500 scale-90' : 'bg-white scale-100 active:scale-90'
                    }`}>
                        {recording
                            ? <div className="w-5 h-5 bg-white rounded-sm"/>
                            : <div className="w-6 h-6 rounded-full border-4 border-orange-500"/>}
                    </div>
                </div>
            </div>
        </div>
    );

    // ── PREVIEW + FRIEND PICKER PHASE ────────────────────────────
    if (phase === 'preview') return (
        <div className="fixed inset-0 z-[300] bg-black flex flex-col">
            {/* Video preview - top half */}
            <div className="relative flex-1 overflow-hidden">
                <video ref={previewRef} autoPlay loop playsInline
                    className="w-full h-full object-cover"/>

                {/* Top bar */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-10">
                    <button onClick={retake}
                        className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                        <X size={20} className="text-white"/>
                    </button>
                    <div className="bg-black/50 rounded-full px-3 py-1.5 backdrop-blur-sm">
                        <p className="text-white text-xs font-bold">📹 Preview</p>
                    </div>
                    <div className="w-10"/>
                </div>
            </div>

            {/* Friend picker - bottom sheet */}
            <div className="bg-zinc-950 border-t border-zinc-800 max-h-[55vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
                    <div>
                        <p className="text-white font-bold text-sm">Send to friends</p>
                        <p className="text-zinc-500 text-xs">{selectedFriends.size} selected</p>
                    </div>
                    <button
                        onClick={sendToSelected}
                        disabled={selectedFriends.size === 0 || sendingAll}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-bold px-5 py-2 rounded-full text-sm transition">
                        {sendingAll
                            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                            : <><Send size={14}/> Send</>}
                    </button>
                </div>

                {/* Friends grid */}
                <div className="overflow-y-auto flex-1 p-3">
                    {friends.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500 text-sm">No friends yet</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                            {friends.map(f => {
                                const selected = selectedFriends.has(f.friend_id);
                                const sent = sentIds.has(f.friend_id);
                                const colors = getStreakColor(f.streak_count);
                                return (
                                    <button key={f.friend_id}
                                        onClick={() => !sent && toggleFriend(f.friend_id)}
                                        className={`flex items-center gap-3 p-3 rounded-2xl border transition text-left ${
                                            sent ? 'bg-green-500/10 border-green-500/30' :
                                            selected ? 'bg-orange-500/10 border-orange-500/50' :
                                            'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                                        }`}>
                                        {/* Avatar */}
                                        <div className="relative flex-shrink-0">
                                            <div className={`w-11 h-11 rounded-full overflow-hidden border-2 ${selected ? 'border-orange-500' : 'border-zinc-700'}`}>
                                                {f.profile_pic_url
                                                    ? <img src={f.profile_pic_url} className="w-full h-full object-cover"/>
                                                    : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><User size={16} className="text-zinc-500"/></div>}
                                            </div>
                                            {f.streak_count > 0 && (
                                                <div className={`absolute -bottom-1 -right-1 ${colors.bg} border ${colors.border} rounded-full px-1 py-0.5 flex items-center gap-0.5`}>
                                                    <span className="text-[8px]">{getStreakEmoji(f.streak_count)}</span>
                                                    <span className={`text-[8px] font-black ${colors.text}`}>{f.streak_count}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Name + streak */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1">
                                                <p className="text-white font-bold text-sm truncate">{f.username}</p>
                                                <VerifiedBadge isVerified={!!f.is_verified} verifyType={f.verify_type}/>
                                            </div>
                                            <p className={`text-xs ${f.streak_count > 0 ? colors.text : 'text-zinc-500'}`}>
                                                {f.streak_count > 0 ? `${getStreakEmoji(f.streak_count)} ${f.streak_count} day streak` : 'Start a streak!'}
                                            </p>
                                        </div>

                                        {/* Checkbox */}
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition ${
                                            sent ? 'bg-green-500 border-green-500' :
                                            selected ? 'bg-orange-500 border-orange-500' :
                                            'border-zinc-600'
                                        }`}>
                                            {(selected || sent) && <Check size={12} className="text-white"/>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return null;
}
// ─── Main Streaks Page ─────────────────────────────────────────────────────
export default function Streaks({ themeColor }) {
    const userId = localStorage.getItem('userId');
    const [streaks, setStreaks] = useState([]);
    const [incoming, setIncoming] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [myLongest, setMyLongest] = useState(0);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('streaks'); // 'streaks' | 'leaderboard' | 'inbox'
    const [cameraOpen, setCameraOpen] = useState(false);
    const [sentIds, setSentIds] = useState(new Set());
    const [viewingSnap, setViewingSnap] = useState(null);
    const [sent, setSent] = useState([]);

    const load = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const [streaksRes, incomingRes, lbRes, sentRes] = await Promise.all([
                axios.get(`${BACKEND_URL}/api/streaks/${userId}`),
                axios.get(`${BACKEND_URL}/api/streaks/incoming/${userId}`),
                axios.get(`${BACKEND_URL}/api/streaks/leaderboard/${userId}`),
                axios.get(`${BACKEND_URL}/api/streaks/sent/${userId}`),
            ]);
            const s = Array.isArray(streaksRes.data) ? streaksRes.data : [];
            setStreaks(s);
            setIncoming(Array.isArray(incomingRes.data) ? incomingRes.data : []);
            setLeaderboard(Array.isArray(lbRes.data) ? lbRes.data : []);
            setSent(Array.isArray(sentRes.data) ? sentRes.data : []);
            setMyLongest(s.reduce((max, r) => Math.max(max, r.streak_count || 0), 0));
        } catch (e) {}
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const respondToSnap = async (snapId, accept) => {
        try {
            await axios.post(`${BACKEND_URL}/api/streaks/respond`, { snapId, userId, accept });
            load();
        } catch (e) {}
    };

    const atRiskCount = streaks.filter(s => isAtRisk(s.last_interaction)).length;

    return (
        <div className="w-full bg-black min-h-screen pb-20 sm:pb-0 animate-fade-in">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                            <Flame size={18} className="text-orange-400"/>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white leading-none">Streaks</h2>
                            <p className="text-zinc-500 text-xs mt-0.5">Keep the fire alive 🔥</p>
                        </div>
                    </div>
                    {myLongest > 0 && (
                        <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full px-3 py-1">
                            <Trophy size={11} className="text-orange-400"/>
                            <span className="text-orange-400 text-xs font-bold">Best: {myLongest}d</span>
                        </div>
                    )}
                    <button onClick={() => setCameraOpen(true)}
                        className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 hover:bg-orange-400 transition">
                        <SwitchCamera size={17} className="text-white"/>
                    </button>
                </div>

                {/* Alert bar */}
                {atRiskCount > 0 && (
                    <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                        <AlertTriangle size={14} className="text-red-400 flex-shrink-0 animate-pulse"/>
                        <p className="text-red-400 text-xs font-semibold">
                            {atRiskCount} streak{atRiskCount > 1 ? 's' : ''} at risk! Send a snap now to save {atRiskCount > 1 ? 'them' : 'it'}.
                        </p>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800 bg-zinc-950/60 sticky top-[73px] z-10">
                {[['streaks', Flame, 'My Streaks'], ['leaderboard', Trophy, 'Leaderboard']].map(([id, Icon, label]) => (
                    <button key={id} onClick={() => setTab(id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${tab === id ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
                        <Icon size={14}/> {label}
                    </button>
                ))}
                <button onClick={() => setTab('inbox')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition relative ${tab === 'inbox' ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
                    <Zap size={14}/>
                    Snaps
                    {incoming.length > 0 && (
                        <span className="absolute top-2 right-4 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-black flex items-center justify-center">
                            {incoming.length}
                        </span>
                    )}
                </button>
            </div>

            <div className="p-4 space-y-4">
                {/* Incoming snaps */}
                {incoming.length > 0 && (
                    <div>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Zap size={12} className="text-yellow-400"/> Incoming Streak Snaps
                        </p>
                        <div className="space-y-2">
                            {incoming.map(snap => (
                                <button key={snap.id}
                                    onClick={() => setViewingSnap(snap)}
                                    className="w-full bg-gradient-to-r from-yellow-500/10 to-orange-500/5 border border-yellow-500/30 rounded-2xl p-3 flex items-center gap-3 hover:border-orange-500/50 transition text-left">
                                    {/* Avatar with play indicator */}
                                    <div className="relative flex-shrink-0">
                                        <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden border-2 border-orange-500/60">
                                            {snap.profile_pic_url
                                                ? <img src={snap.profile_pic_url} className="w-full h-full object-cover"/>
                                                : <div className="w-full h-full flex items-center justify-center"><User size={16} className="text-zinc-500"/></div>}
                                        </div>
                                        {/* Video/text indicator badge */}
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center border-2 border-zinc-950">
                                            <span className="text-[9px]">{snap.media_type === 'video' ? '📹' : '💬'}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-bold truncate">{snap.username}</p>
                                        <p className="text-orange-400 text-xs">
                                            {snap.media_type === 'video' ? 'Tap to watch video snap 👀' : `"${snap.message?.slice(0, 40) || 'Tap to view'}"`}
                                        </p>
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center flex-shrink-0">
                                        <Flame size={16} className="text-orange-400"/>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {tab === 'streaks' && (
                    <>
                        {loading ? (
                            <div className="space-y-3">
                                {[1,2,3].map(i => (
                                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex-shrink-0"/>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 bg-zinc-800 rounded w-1/3"/>
                                            <div className="h-2 bg-zinc-800 rounded w-1/2"/>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : streaks.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
                                    <Flame size={36} className="text-orange-400 opacity-50"/>
                                </div>
                                <p className="text-white font-bold text-lg mb-2">No Friends Yet</p>
                                <p className="text-zinc-500 text-sm max-w-xs mx-auto">Add friends to start building streaks with them!</p>
                                <Link to="/friends" className="inline-flex items-center gap-2 mt-4 bg-orange-500 hover:bg-orange-400 text-white font-bold px-5 py-2.5 rounded-full transition text-sm">
                                    <Users size={15}/> Find Friends
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* Sort: at-risk first, then by streak count */}
                                {[...streaks]
                                    .sort((a, b) => {
                                        const aRisk = isAtRisk(a.last_interaction) ? 1 : 0;
                                        const bRisk = isAtRisk(b.last_interaction) ? 1 : 0;
                                        if (bRisk !== aRisk) return bRisk - aRisk;
                                        return b.streak_count - a.streak_count;
                                    })
                                    .map(streak => {
                                        const colors = getStreakColor(streak.streak_count);
                                        const risk = isAtRisk(streak.last_interaction);
                                        const hours = hoursLeft(streak.last_interaction);
                                        const sent = sentIds.has(streak.friend_id);
                                        return (
                                            <div key={streak.friend_id}
                                                className={`flex items-center gap-3 bg-zinc-900 border rounded-2xl p-3.5 transition ${risk ? 'border-red-500/40 bg-red-500/5' : 'border-zinc-800 hover:border-zinc-700'}`}>
                                                {/* Avatar */}
                                                <Link to={`/profile/${streak.friend_id}`} className="relative flex-shrink-0">
                                                    <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${risk ? 'border-red-500/60' : streak.streak_count > 0 ? colors.border : 'border-zinc-700'}`}>
                                                        {streak.profile_pic_url
                                                            ? <img src={streak.profile_pic_url} className="w-full h-full object-cover"/>
                                                            : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><User size={18} className="text-zinc-500"/></div>}
                                                    </div>
                                                    {/* Streak count badge */}
                                                    {streak.streak_count > 0 && <div className={`absolute -bottom-1 -right-1 ${colors.bg} border ${colors.border} rounded-full px-1.5 py-0.5 flex items-center gap-0.5`}>
                                                        <span className="text-[9px]">{getStreakEmoji(streak.streak_count)}</span>
                                                        <span className={`text-[9px] font-black ${colors.text}`}>{streak.streak_count}</span>
                                                    </div>}
                                                </Link>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <p className="text-white font-bold text-sm truncate">{streak.username}</p>
                                                        <VerifiedBadge isVerified={!!streak.is_verified} verifyType={streak.verify_type}/>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={`text-xs font-bold ${streak.streak_count > 0 ? colors.text : 'text-zinc-500'}`}>
                                                            {streak.streak_count > 0 ? `${getStreakEmoji(streak.streak_count)} ${streak.streak_count} day streak` : '🤝 Start a streak!'}
                                                        </span>
                                                        {risk ? (
                                                            <span className="flex items-center gap-0.5 text-red-400 text-[10px] font-bold animate-pulse">
                                                                <Clock size={9}/> {hours}h left!
                                                            </span>
                                                        ) : streak.i_sent ? (
                                                            <span className="text-green-400 text-[10px] font-bold">✓ Snap sent</span>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                {/* Action */}
                                                {sent ? (
                                                    <div className="flex items-center gap-1 bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1.5">
                                                        <Check size={12} className="text-green-400"/>
                                                        <span className="text-green-400 text-xs font-bold">Sent!</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setCameraOpen(true)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-bold text-xs transition ${
                                                            risk
                                                                ? 'bg-red-500 border-red-500 text-white hover:bg-red-400 shadow-lg shadow-red-500/30 animate-pulse'
                                                                : streak.streak_count > 0
                                                                ? `${colors.bg} ${colors.border} ${colors.text} hover:opacity-80`
                                                                : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-orange-500/50 hover:text-orange-400'
                                                        }`}>
                                                        <Flame size={12}/>
                                                        {risk ? 'Save!' : 'Snap'}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </>
                )}

                {tab === 'leaderboard' && (
                    <div className="space-y-2">
                        <p className="text-zinc-500 text-xs">Longest active streaks among your friends</p>
                        {leaderboard.length === 0 ? (
                            <div className="text-center py-12 text-zinc-500">No streak data yet.</div>
                        ) : leaderboard.map((entry, i) => {
                            const colors = getStreakColor(entry.streak_count);
                            const medals = ['🥇', '🥈', '🥉'];
                            return (
                                <Link key={entry.friend_id} to={`/profile/${entry.friend_id}`}
                                    className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 hover:border-zinc-700 transition">
                                    <span className="text-xl w-7 text-center flex-shrink-0">
                                        {i < 3 ? medals[i] : <span className="text-zinc-500 text-sm font-bold">{i+1}</span>}
                                    </span>
                                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-zinc-700">
                                        {entry.profile_pic_url
                                            ? <img src={entry.profile_pic_url} className="w-full h-full object-cover"/>
                                            : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><User size={16} className="text-zinc-500"/></div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                            <p className="text-white font-bold text-sm truncate">{entry.username}</p>
                                            <VerifiedBadge isVerified={!!entry.is_verified} verifyType={entry.verify_type}/>
                                        </div>
                                        <p className={`text-xs font-bold ${colors.text}`}>{getStreakEmoji(entry.streak_count)} {entry.streak_count} days with you</p>
                                    </div>
                                    <ChevronRight size={16} className="text-zinc-600 flex-shrink-0"/>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {tab === 'inbox' && (
                    <div className="space-y-5">
                        {/* Received */}
                        <div>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Zap size={12} className="text-yellow-400"/> Received
                                {incoming.length > 0 && <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{incoming.length} new</span>}
                            </p>
                            {incoming.length === 0 ? (
                                <div className="text-center py-8 bg-zinc-900 border border-zinc-800 rounded-2xl">
                                    <p className="text-3xl mb-2">📭</p>
                                    <p className="text-zinc-400 text-sm font-bold">No new snaps</p>
                                    <p className="text-zinc-600 text-xs mt-1">When friends send you snaps, they'll appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {incoming.map(snap => (
                                        <button key={snap.id} onClick={() => setViewingSnap(snap)}
                                            className="w-full flex items-center gap-3 bg-gradient-to-r from-orange-500/10 to-yellow-500/5 border border-orange-500/30 rounded-2xl p-3 hover:border-orange-500/60 transition text-left">
                                            <div className="relative flex-shrink-0">
                                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-500">
                                                    {snap.profile_pic_url
                                                        ? <img src={snap.profile_pic_url} className="w-full h-full object-cover"/>
                                                        : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><User size={16} className="text-zinc-400"/></div>}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-orange-500 border-2 border-zinc-950 flex items-center justify-center">
                                                    <span className="text-[9px]">{snap.media_type === 'video' ? '📹' : '💬'}</span>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-bold text-sm truncate">{snap.username}</p>
                                                <p className="text-orange-300 text-xs">{snap.media_type === 'video' ? '👀 Tap to watch video snap' : `💬 "${snap.message?.slice(0,35) || 'Text snap'}"`}</p>
                                            </div>
                                            <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/40 flex-shrink-0">
                                                <Flame size={16} className="text-white"/>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Sent */}
                        <div>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Send size={12} className="text-zinc-400"/> Sent
                            </p>
                            {sent.length === 0 ? (
                                <div className="text-center py-8 bg-zinc-900 border border-zinc-800 rounded-2xl">
                                    <p className="text-3xl mb-2">📤</p>
                                    <p className="text-zinc-400 text-sm font-bold">No sent snaps</p>
                                    <p className="text-zinc-600 text-xs mt-1">Snaps you send will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {sent.map(snap => (
                                        <button key={snap.id} onClick={() => setViewingSnap({ ...snap, isSent: true })}
                                            className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-3 hover:border-zinc-600 transition text-left">
                                            <div className="relative flex-shrink-0">
                                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-zinc-700">
                                                    {snap.profile_pic_url
                                                        ? <img src={snap.profile_pic_url} className="w-full h-full object-cover"/>
                                                        : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><User size={16} className="text-zinc-400"/></div>}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-zinc-700 border-2 border-zinc-950 flex items-center justify-center">
                                                    <span className="text-[9px]">{snap.media_type === 'video' ? '📹' : '💬'}</span>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-bold text-sm truncate">To: {snap.username}</p>
                                                <p className="text-zinc-500 text-xs">{snap.media_type === 'video' ? '📹 Video snap' : `💬 "${snap.message?.slice(0,35) || 'Text snap'}"`}</p>
                                                {!snap.media_url && snap.media_type === 'video' && (
                                                    <p className="text-red-400 text-[10px]">⚠️ Upload may have failed</p>
                                                )}
                                            </div>
                                            <div className={`text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0 ${snap.is_read ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-zinc-500 border-zinc-700 bg-zinc-800'}`}>
                                                {snap.is_read ? '✓ Seen' : '• Sent'}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Fullscreen snap viewer */}
            {viewingSnap && (
                <SnapViewer
                    snap={viewingSnap}
                    onClose={() => setViewingSnap(null)}
                    onAccept={async () => {
                        await respondToSnap(viewingSnap.id, true);
                        setViewingSnap(null);
                    }}
                    onDismiss={async () => {
                        await respondToSnap(viewingSnap.id, false);
                        setViewingSnap(null);
                    }}
                />
            )}

            {/* Fullscreen camera */}
            {cameraOpen && (
                <CameraPage
                    friends={streaks}
                    onClose={() => setCameraOpen(false)}
                    onSent={() => { load(); }}
                />
            )}
        </div>
    );
}
