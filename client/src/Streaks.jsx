import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Flame, User, BadgeCheck, Send, Trophy, Zap, Clock, AlertTriangle, ChevronRight, X, Check, Users, Video, RefreshCw } from 'lucide-react';

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
    if (count >= 365) return { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', glow: 'shadow-yellow-500/30' };
    if (count >= 100) return { text: 'text-cyan-400',   bg: 'bg-cyan-500/20',   border: 'border-cyan-500/40',   glow: 'shadow-cyan-500/30' };
    if (count >= 50)  return { text: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/40', glow: 'shadow-orange-500/30' };
    if (count >= 14)  return { text: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/40', glow: 'shadow-purple-500/30' };
    if (count >= 7)   return { text: 'text-blue-400',   bg: 'bg-blue-500/20',   border: 'border-blue-500/40',   glow: 'shadow-blue-500/30' };
    return               { text: 'text-red-400',    bg: 'bg-red-500/20',    border: 'border-red-500/40',    glow: 'shadow-red-500/30' };
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

// ─── Send Streak Snap Modal ────────────────────────────────────────────────
function SendSnapModal({ friend, onClose, onSent }) {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [phase, setPhase] = useState('idle'); // idle | recording | preview
    const [timeLeft, setTimeLeft] = useState(10);
    const [videoBlob, setVideoBlob] = useState(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
    const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
    const videoRef = useRef(null);
    const previewRef = useRef(null);
    const recorderRef = useRef(null);
    const streamRef = useRef(null);
    const timerRef = useRef(null);
    const chunksRef = useRef([]);
    const mimeRef = useRef('');
    const facingRef = useRef('user');
    const userId = localStorage.getItem('userId');

    const quickMessages = [
        '🔥 Keeping our streak alive!',
        '⚡ Streak check!',
        '👋 Hey! Don\'t let it die!',
        '🌟 Daily streak snap!',
        '💪 We got this!',
    ];

    useEffect(() => {
        return () => {
            clearInterval(timerRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
        };
    }, []);

    // Once phase becomes 'recording', attach stream to video element
    useEffect(() => {
        if (phase === 'recording' && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
        }
    }, [phase]);

    // Once phase becomes 'preview', set preview src
    useEffect(() => {
        if (phase === 'preview' && previewRef.current && videoPreviewUrl) {
            previewRef.current.src = videoPreviewUrl;
            previewRef.current.play().catch(() => {});
        }
    }, [phase, videoPreviewUrl]);

    const startRecording = async (facing = facingRef.current) => {
        try {
            // Stop existing stream if any
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            });
            streamRef.current = stream;

            // Pick best supported mime type
            const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4', '']
                .find(t => t === '' || MediaRecorder.isTypeSupported(t));
            mimeRef.current = mime;

            chunksRef.current = [];
            const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
            recorderRef.current = recorder;

            recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                const actualType = mimeRef.current || 'video/webm';
                const blob = new Blob(chunksRef.current, { type: actualType });
                const url = URL.createObjectURL(blob);
                setVideoBlob(blob);
                setVideoPreviewUrl(url);
                setPhase('preview');
            };

            recorder.start(100);
            setPhase('recording');
            setTimeLeft(10);

            let t = 10;
            timerRef.current = setInterval(() => {
                t--;
                setTimeLeft(t);
                if (t <= 0) stopRecording();
            }, 1000);
        } catch (e) {
            alert('Camera access denied. Please allow camera & microphone permission and try again.');
        }
    };

    const flipCamera = async () => {
        const newFacing = facingRef.current === 'user' ? 'environment' : 'user';
        facingRef.current = newFacing;
        setFacingMode(newFacing);

        // Stop recorder cleanly without triggering preview
        clearInterval(timerRef.current);
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.onstop = null; // prevent preview from triggering
            recorderRef.current.stop();
        }
        chunksRef.current = [];

        // Restart with new camera
        await startRecording(newFacing);
    };

    const stopRecording = () => {
        clearInterval(timerRef.current);
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop(); // onstop will fire async and set phase='preview'
        }
    };

    const discardVideo = () => {
        if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
        setVideoBlob(null);
        setVideoPreviewUrl(null);
        setPhase('idle');
    };

    const send = async (msg) => {
        setSending(true);
        try {
            const formData = new FormData();
            formData.append('fromUserId', userId);
            formData.append('toUserId', friend.friend_id);
            if (videoBlob) {
                const ext = mimeRef.current.includes('mp4') ? 'mp4' : 'webm';
                formData.append('media', videoBlob, `snap.${ext}`);
            } else {
                formData.append('message', msg || message || '🔥 Streak snap!');
            }
            await axios.post(`${BACKEND_URL}/api/streaks/snap`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onSent();
            onClose();
        } catch (e) {
            alert('Failed to send. Try again.');
        }
        setSending(false);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/85 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                            <Flame size={15} className="text-orange-400"/>
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm">Send Streak Snap</p>
                            <p className="text-zinc-500 text-xs">to @{friend.username}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white p-1"><X size={20}/></button>
                </div>

                <div className="px-4 py-4 space-y-3">
                    {/* Friend info */}
                    <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
                        <div className="w-11 h-11 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
                            {friend.profile_pic_url
                                ? <img src={friend.profile_pic_url} className="w-full h-full object-cover"/>
                                : <div className="w-full h-full flex items-center justify-center"><User size={18} className="text-zinc-500"/></div>}
                        </div>
                        <div className="flex-1">
                            <p className="text-white font-bold text-sm">{friend.username}</p>
                            <p className="text-orange-400 text-xs font-bold">{getStreakEmoji(friend.streak_count)} {friend.streak_count} day streak</p>
                        </div>
                    </div>

                    {/* ── IDLE: show record button ── */}
                    {phase === 'idle' && (
                        <button onClick={startRecording}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-zinc-900 border border-zinc-700 hover:border-orange-500/50 hover:bg-orange-500/5 rounded-2xl text-white font-bold text-sm transition">
                            <Video size={18} className="text-orange-400"/> Record a 10s Video Snap
                        </button>
                    )}

                    {/* ── RECORDING: live camera viewfinder ── */}
                    {phase === 'recording' && (
                        <div className="relative rounded-2xl overflow-hidden bg-zinc-900 aspect-[3/4]">
                            <video ref={videoRef} autoPlay muted playsInline
                                className="w-full h-full object-cover"
                                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}/>
                            {/* Timer */}
                            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 rounded-full px-2.5 py-1">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
                                <span className="text-white text-xs font-bold">{timeLeft}s</span>
                            </div>
                            {/* Flip camera button */}
                            <button onClick={flipCamera}
                                className="absolute top-3 right-3 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition">
                                <RefreshCw size={16} className="text-white"/>
                            </button>
                            {/* Stop button */}
                            <button onClick={stopRecording}
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500 hover:bg-red-400 text-white font-bold px-6 py-2.5 rounded-full text-sm transition">
                                Stop
                            </button>
                        </div>
                    )}

                    {/* ── PREVIEW: show recorded video ── */}
                    {phase === 'preview' && (
                        <div className="space-y-2">
                            <div className="relative rounded-2xl overflow-hidden bg-zinc-900 aspect-[3/4]">
                                <video ref={previewRef} autoPlay loop playsInline controls
                                    className="w-full h-full object-cover"/>
                                <div className="absolute top-3 left-3 bg-orange-500/80 rounded-full px-2.5 py-1">
                                    <span className="text-white text-xs font-bold">📹 Preview</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={discardVideo}
                                    className="flex-1 py-2.5 bg-zinc-900 border border-zinc-700 hover:border-red-500/40 text-zinc-400 hover:text-red-400 rounded-xl text-sm font-bold transition">
                                    Discard
                                </button>
                                <button onClick={() => send()} disabled={sending}
                                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                                    {sending
                                        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                        : <><Send size={14}/> Send Video</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Text snaps (hidden during recording/preview) ── */}
                    {phase !== 'recording' && (
                        <>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-px bg-zinc-800"/>
                                <span className="text-zinc-600 text-xs">or send a text snap</span>
                                <div className="flex-1 h-px bg-zinc-800"/>
                            </div>
                            <div className="flex flex-col gap-2">
                                {quickMessages.map((msg, i) => (
                                    <button key={i} onClick={() => send(msg)} disabled={sending}
                                        className="text-left px-4 py-3 bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 hover:bg-orange-500/5 rounded-xl text-sm text-white transition disabled:opacity-50">
                                        {msg}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 pt-1">
                                <input value={message} onChange={e => setMessage(e.target.value)}
                                    placeholder="Or type a custom message..."
                                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-600 outline-none focus:border-orange-500/50"/>
                                <button onClick={() => send(message)} disabled={!message.trim() || sending}
                                    className="bg-orange-500 hover:bg-orange-400 text-white font-bold px-4 rounded-xl transition disabled:opacity-40">
                                    <Send size={16}/>
                                </button>
                            </div>
                        </>
                    )}
                </div>
                <div className="h-4"/>
            </div>
        </div>
    );
}
// ─── Main Streaks Page ─────────────────────────────────────────────────────
export default function Streaks({ themeColor }) {
    const userId = localStorage.getItem('userId');
    const [streaks, setStreaks] = useState([]);
    const [incoming, setIncoming] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [myLongest, setMyLongest] = useState(0);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('streaks'); // 'streaks' | 'leaderboard'
    const [sendTo, setSendTo] = useState(null);
    const [sentIds, setSentIds] = useState(new Set());

    const load = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const [streaksRes, incomingRes, lbRes] = await Promise.all([
                axios.get(`${BACKEND_URL}/api/streaks/${userId}`),
                axios.get(`${BACKEND_URL}/api/streaks/incoming/${userId}`),
                axios.get(`${BACKEND_URL}/api/streaks/leaderboard/${userId}`),
            ]);
            const s = Array.isArray(streaksRes.data) ? streaksRes.data : [];
            setStreaks(s);
            setIncoming(Array.isArray(incomingRes.data) ? incomingRes.data : []);
            setLeaderboard(Array.isArray(lbRes.data) ? lbRes.data : []);
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
                                <div key={snap.id} className="bg-gradient-to-r from-yellow-500/10 to-orange-500/5 border border-yellow-500/30 rounded-2xl p-3 flex flex-col gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
                                            {snap.profile_pic_url
                                                ? <img src={snap.profile_pic_url} className="w-full h-full object-cover"/>
                                                : <div className="w-full h-full flex items-center justify-center"><User size={16} className="text-zinc-500"/></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-bold truncate">{snap.username}</p>
                                            {snap.media_type === 'video'
                                                ? <p className="text-orange-400 text-xs flex items-center gap-1"><Video size={11}/> Sent a video snap</p>
                                                : <p className="text-zinc-400 text-xs truncate">{snap.message}</p>}
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button onClick={() => respondToSnap(snap.id, true)}
                                                className="w-8 h-8 bg-green-500/20 border border-green-500/40 rounded-full flex items-center justify-center hover:bg-green-500/30 transition">
                                                <Check size={14} className="text-green-400"/>
                                            </button>
                                            <button onClick={() => respondToSnap(snap.id, false)}
                                                className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center hover:bg-zinc-700 transition">
                                                <X size={14} className="text-zinc-400"/>
                                            </button>
                                        </div>
                                    </div>
                                    {/* Video player for video snaps */}
                                    {snap.media_type === 'video' && snap.media_url && (
                                        <video src={snap.media_url} controls playsInline
                                            className="w-full rounded-xl max-h-52 bg-black object-cover"/>
                                    )}
                                </div>
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
                                                    <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${risk ? 'border-red-500/60' : colors.border}`}>
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
                                                        onClick={() => setSendTo(streak)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-bold text-xs transition ${
                                                            risk
                                                                ? 'bg-red-500 border-red-500 text-white hover:bg-red-400 shadow-lg shadow-red-500/30 animate-pulse'
                                                                : `${colors.bg} ${colors.border} ${colors.text} hover:opacity-80`
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
            </div>

            {/* Send snap modal */}
            {sendTo && (
                <SendSnapModal
                    friend={sendTo}
                    onClose={() => setSendTo(null)}
                    onSent={() => {
                        setSentIds(prev => new Set([...prev, sendTo.friend_id]));
                        load();
                    }}
                />
            )}
        </div>
    );
}
