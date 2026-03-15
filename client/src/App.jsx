import React, { useState, useEffect, useRef } from 'react';

import axios from 'axios';

import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';

import { Home, LogIn, UserPlus, Users, Menu, MessageCircle, User, Settings as SettingsIcon, Search as SearchIcon, Clapperboard, Globe, X, Bell, Phone, PhoneOff, Video, Mic, MicOff, Camera, CameraOff, ShoppingBag, Flame } from 'lucide-react';

import { io } from 'socket.io-client'; 

import Register from './Register'; 

import Login from './Login';

import Feed from './Feed';

import Chat from './Chat';

import Profile from './Profile'; 

import Friends from './Friends'; 

import Settings from './Settings';

import Search from './Search';

import Reels from './Reels'; 

import Communities from './Communities'; 

import Notifications from './Notifications'; 

import CreatePost from './CreatePost';

import UserDashboard from './UserDashboard';

import AdminVerification from './AdminVerification';

import AdminDashboard from './AdminDashboard';

import AdminUsers from './AdminUsers';
import AdminUserProfile from './AdminUserProfile';

import AdminContent from './AdminContent';

import AdminAnalytics from './AdminAnalytics';

import AdminReports from './AdminReports';

import AdminAppSettings from './AdminAppSettings';
import AdminMarketplace from './AdminMarketplace';
import AdminPowers from './AdminPowers';
import AdminCommunities from './AdminCommunities';
import Streaks from './Streaks';

import Marketplace from './Marketplace';





class ErrorBoundary extends React.Component {

  constructor(props) { super(props); this.state = { hasError: false, error: null }; }

  static getDerivedStateFromError(error) { return { hasError: true, error }; }

  componentDidCatch(error, info) { console.error('App crashed:', error, info); }

  render() {

    if (this.state.hasError) {

      return (

        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">

          <div className="text-red-500 text-6xl mb-4">⚠️</div>

          <h1 className="text-white text-2xl font-bold mb-2">Something went wrong</h1>

          <p className="text-zinc-500 mb-6">A page crashed. Your data is safe.</p>

          <button onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}

            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-full transition">

            Go Home

          </button>

        </div>

      );

    }

    return this.props.children;

  }

}



const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

if (!window._superAppSocket) {

    try {

        window._superAppSocket = io(BACKEND_URL, {

            autoConnect: true,

            reconnection: true,

            reconnectionAttempts: 10,

            reconnectionDelay: 2000,

            timeout: 10000,

        });

        window._superAppSocket.on('connect_error', () => {});

        window._superAppSocket.on('error', () => {});

    } catch(e) {

        window._superAppSocket = { emit: () => {}, on: () => {}, off: () => {} };

    }

}

const globalSocket = window._superAppSocket;

function SplashScreen() {

    return (

        <div className="fixed inset-0 z-[999] bg-black flex flex-col items-center justify-center animate-fade-out" style={{ animationDelay: '1.5s', animationFillMode: 'forwards' }}>

            <img src="/logo.png" alt="SuperApp" className="w-24 h-24 rounded-2xl object-cover animate-pulse shadow-[0_0_40px_rgba(59,130,246,0.6)]" />

            <h1 className="text-white font-extrabold text-3xl mt-4 tracking-tight text-blue-500">SuperApp</h1>

            <p className="text-zinc-500 text-sm font-medium mt-2 tracking-widest uppercase">From Nepal</p>

        </div>

    );

}



function urlBase64ToUint8Array(base64String) {

  const padding = '='.repeat((4 - base64String.length % 4) % 4);

  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);

  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }

  return outputArray;

}



let audioCtx = null;

const unlockAudio = () => { if (!audioCtx) { const AudioContext = window.AudioContext || window.webkitAudioContext; audioCtx = new AudioContext(); } if (audioCtx.state === 'suspended') { audioCtx.resume(); } document.removeEventListener('click', unlockAudio); };

if (typeof document !== 'undefined') { document.addEventListener('click', unlockAudio); }

const playNotificationSound = () => { try { if (!audioCtx) return; const osc = audioCtx.createOscillator(); const gainNode = audioCtx.createGain(); osc.connect(gainNode); gainNode.connect(audioCtx.destination); osc.type = 'sine'; osc.frequency.setValueAtTime(800, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1); gainNode.gain.setValueAtTime(0, audioCtx.currentTime); gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.05); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3); osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.3); } catch (e) { } };



// 🔔 RINGING SOUND for incoming calls

let ringInterval = null;

const startRinging = () => {

    stopRinging();

    ringInterval = setInterval(() => {

        try {

            if (!audioCtx) return;

            const osc = audioCtx.createOscillator();

            const gainNode = audioCtx.createGain();

            osc.connect(gainNode); gainNode.connect(audioCtx.destination);

            osc.type = 'sine';

            osc.frequency.setValueAtTime(480, audioCtx.currentTime);

            osc.frequency.setValueAtTime(480, audioCtx.currentTime + 0.4);

            osc.frequency.setValueAtTime(0, audioCtx.currentTime + 0.5);

            gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);

            gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime + 0.4);

            gainNode.gain.setValueAtTime(0, audioCtx.currentTime + 0.5);

            osc.start(audioCtx.currentTime);

            osc.stop(audioCtx.currentTime + 0.5);

        } catch(e) {}

    }, 1200);

};

const stopRinging = () => { if (ringInterval) { clearInterval(ringInterval); ringInterval = null; } };



function ProtectedRoute({ children }) { const currentUserId = localStorage.getItem('userId'); if (!currentUserId) return <Navigate to="/login" replace />; return children; }

function PublicRoute({ children }) { const currentUserId = localStorage.getItem('userId'); if (currentUserId) return <Navigate to="/" replace />; return children; }



function NavItem({ to, icon: Icon, label, badgeCount, themeColor, onClick, showLabelAlways }) {

  const location = useLocation();

  const isActive = location.pathname === to;

  return (

    <Link to={to} onClick={onClick} className="flex items-center gap-4 p-3 rounded-xl transition-colors text-xl font-medium w-fit xl:w-full relative" style={{ backgroundColor: isActive ? `${themeColor}20` : 'transparent', color: isActive ? themeColor : '#a1a1aa' }}>

      <div className="relative">

          <Icon size={28} />

          {badgeCount > 0 && <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md animate-pulse">{badgeCount > 9 ? '9+' : badgeCount}</span>}

      </div>

      <span className={"block"}>{label}</span>

    </Link>

  );

}



// ============================================================

// GLOBAL CALL MANAGER - Handles ALL WebRTC on every page

// ============================================================

function CallManager({ currentUserId, startCallRef }) {

    const remoteAudioRef = React.useRef(null);

    const remoteVideoRef = React.useRef(null);

    const myVideoRef = React.useRef(null);

    const peerConnectionRef = React.useRef(null);

    const pendingIce = React.useRef([]);

    const callTargetRef = React.useRef(null);

    const myStreamRef = React.useRef(null);

    const remoteStreamRef = React.useRef(new MediaStream());

    const callStartTimeRef = React.useRef(null);

    const [audioBlocked, setAudioBlocked] = React.useState(false);



    const playRemoteAudio = () => {

        if (!remoteAudioRef.current) return;

        remoteAudioRef.current.srcObject = remoteStreamRef.current;

        remoteAudioRef.current.volume = 1.0;

        remoteAudioRef.current.play().then(() => { setAudioBlocked(false); }).catch(e => {

            console.warn('play blocked:', e);

            setAudioBlocked(true);

        });

    };

    const unlockAudio = () => {

        if (!remoteAudioRef.current) return;

        remoteAudioRef.current.play().then(() => { setAudioBlocked(false); }).catch(() => {});

    };



    const [incomingCall, setIncomingCall] = React.useState(null);

    const [activeCall, setActiveCall] = React.useState(null);

    const [callStatus, setCallStatus] = React.useState('');

    const [micOn, setMicOn] = React.useState(true);

    const [camOn, setCamOn] = React.useState(true);



    const stopAllMedia = () => {

        if (myStreamRef.current) { myStreamRef.current.getTracks().forEach(t => t.stop()); myStreamRef.current = null; }

        if (peerConnectionRef.current) { peerConnectionRef.current.close(); peerConnectionRef.current = null; }

        remoteStreamRef.current = new MediaStream();

        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    };



    const createPC = (targetId) => {

        callTargetRef.current = targetId;

        const pc = new RTCPeerConnection({

            iceServers: [

                { urls: 'stun:stun.l.google.com:19302' },

                { urls: 'stun:stun1.l.google.com:19302' },

                { urls: 'stun:stun2.l.google.com:19302' },

                { urls: 'stun:stun3.l.google.com:19302' },

                { urls: 'stun:stun4.l.google.com:19302' },

                { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },

                { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },

                { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },

                { urls: 'turn:openrelay.metered.ca:80?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },

            ],

            iceCandidatePoolSize: 10,

        });

        pc.onicecandidate = (e) => {

            if (e.candidate) globalSocket.emit('ice_candidate', { to: callTargetRef.current, candidate: e.candidate });

        };

        pc.ontrack = (e) => {

            // Add track to our persistent remoteStream

            if (!remoteStreamRef.current.getTrackById(e.track.id)) {

                remoteStreamRef.current.addTrack(e.track);

            }

            // Always reassign srcObject so the audio element reflects current tracks

            if (remoteAudioRef.current) {

                remoteAudioRef.current.srcObject = remoteStreamRef.current;

            }

            playRemoteAudio();

            if (remoteVideoRef.current && e.track.kind === 'video') {

                remoteVideoRef.current.srcObject = remoteStreamRef.current;

                remoteVideoRef.current.play().catch(()=>{});

            }

            // Also retry when track becomes active

            e.track.onunmute = () => { playRemoteAudio(); };

        };

        pc.oniceconnectionstatechange = () => {

            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {

                setCallStatus('connected');

                setTimeout(playRemoteAudio, 300); // retry play after connection

            }

        };

        return pc;

    };



    const hangUp = React.useCallback((notify = true) => {

        stopRinging();

        const duration = callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0;

        if (notify && callTargetRef.current) globalSocket.emit('end_call', { to: callTargetRef.current, from: currentUserId, ...(duration > 0 && { duration }) });

        callStartTimeRef.current = null;

        stopAllMedia();

        setActiveCall(null); setCallStatus(''); setIncomingCall(null); setAudioBlocked(false);

        callTargetRef.current = null; pendingIce.current = [];

    }, [currentUserId]);



    const startCall = React.useCallback(async (target, isVideo) => {

        stopRinging(); pendingIce.current = [];

        setActiveCall({ targetId: target.id, targetName: target.username, isVideo, isCaller: true });

        setCallStatus('ringing');

        startRinging();

        try {

            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: isVideo });

            myStreamRef.current = stream;

            if (myVideoRef.current) myVideoRef.current.srcObject = stream;

            const pc = createPC(target.id); peerConnectionRef.current = pc;

            stream.getTracks().forEach(t => pc.addTrack(t, stream));

            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: isVideo });

            await pc.setLocalDescription(offer);

            const callerName = localStorage.getItem('username') || 'Someone';

            globalSocket.emit('call_user', { userToCall: target.id, signalData: offer, from: currentUserId, callerName, isVideo });

        } catch (err) {

            stopRinging(); setActiveCall(null); setCallStatus('');

            if (err.name === 'NotAllowedError') alert('Microphone/Camera permission denied. Allow access in browser settings.');

            else alert('Could not start call: ' + err.message);

        }

    }, [currentUserId]);



    // Expose startCall via ref so App can pass it to Chat

    React.useEffect(() => { if (startCallRef) startCallRef.current = startCall; }, [startCall]);



    const answerCall = async () => {

        if (!incomingCall) return;

        stopRinging(); pendingIce.current = [];

        const caller = incomingCall;

        setActiveCall({ targetId: caller.from, targetName: caller.callerName, isVideo: caller.isVideo, isCaller: false });

        setCallStatus('connected'); setIncomingCall(null);

        callStartTimeRef.current = Date.now();

        try {

            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: caller.isVideo });

            myStreamRef.current = stream;

            if (myVideoRef.current) myVideoRef.current.srcObject = stream;

            const pc = createPC(caller.from); peerConnectionRef.current = pc;

            stream.getTracks().forEach(t => pc.addTrack(t, stream));

            await pc.setRemoteDescription(new RTCSessionDescription(caller.signal));

            for (const c of pendingIce.current) { try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch(e) {} }

            pendingIce.current = [];

            const answer = await pc.createAnswer();

            await pc.setLocalDescription(answer);

            globalSocket.emit('answer_call', { signal: answer, to: caller.from });

            // Play audio - we're inside a user gesture (button tap) so autoplay is allowed

            setTimeout(playRemoteAudio, 300);

        } catch (err) {

            hangUp(true);

            alert('Could not answer call: ' + err.message);

        }

    };



    React.useEffect(() => {

        if (!currentUserId) return;

        const onIncoming = (data) => { setIncomingCall(data); startRinging(); };

        const onAccepted = async (signal) => {

            stopRinging(); setCallStatus('connected');

            callStartTimeRef.current = Date.now();

            if (peerConnectionRef.current) {

                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));

                for (const c of pendingIce.current) { try { await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch(e) {} }

                pendingIce.current = [];

            }

            setTimeout(playRemoteAudio, 500);

        };

        const onIce = async (candidate) => {

            if (peerConnectionRef.current?.remoteDescription) {

                try { await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e) {}

            } else { pendingIce.current.push(candidate); }

        };

        const onEnded = () => hangUp(false);

        globalSocket.on('incoming_call', onIncoming);

        globalSocket.on('call_accepted', onAccepted);

        globalSocket.on('ice_candidate', onIce);

        globalSocket.on('call_ended', onEnded);

        return () => {

            globalSocket.off('incoming_call', onIncoming);

            globalSocket.off('call_accepted', onAccepted);

            globalSocket.off('ice_candidate', onIce);

            globalSocket.off('call_ended', onEnded);

        };

    }, [currentUserId]);



    const toggleMic = () => { const t = myStreamRef.current?.getAudioTracks()[0]; if (t) { t.enabled = !t.enabled; setMicOn(t.enabled); } };

    const toggleCam = () => { const t = myStreamRef.current?.getVideoTracks()[0]; if (t) { t.enabled = !t.enabled; setCamOn(t.enabled); } };



    return (

        <>

            <audio ref={remoteAudioRef} autoPlay playsInline style={{ position:'absolute', width:0, height:0, opacity:0 }} />



            {incomingCall && !activeCall && (

                <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">

                    <div className="w-28 h-28 rounded-full bg-zinc-800 border-4 border-green-500 flex items-center justify-center mb-6 shadow-[0_0_60px_rgba(34,197,94,0.4)] animate-pulse">

                        <User size={50} className="text-zinc-300" />

                    </div>

                    <h2 className="text-white text-3xl font-bold mb-2">{incomingCall.callerName}</h2>

                    <p className="text-zinc-400 mb-2 uppercase tracking-widest text-sm">Incoming {incomingCall.isVideo ? "Video" : "Voice"} Call</p>

                    <p className="text-zinc-600 text-xs mb-12 animate-pulse">ringing...</p>

                    <div className="flex gap-16">

                        <div className="flex flex-col items-center gap-2">

                            <button onClick={() => { stopRinging(); globalSocket.emit("decline_call", { to: incomingCall.from }); setIncomingCall(null); }}

                                className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/50 hover:scale-110 transition">

                                <PhoneOff className="text-white" size={32} />

                            </button>

                            <span className="text-zinc-400 text-sm">Decline</span>

                        </div>

                        <div className="flex flex-col items-center gap-2">

                            <button onClick={answerCall}

                                className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50 animate-bounce hover:scale-110 transition">

                                {incomingCall.isVideo ? <Video className="text-white" size={32} /> : <Phone className="text-white" size={32} />}

                            </button>

                            <span className="text-zinc-400 text-sm">Accept</span>

                        </div>

                    </div>

                </div>

            )}



            {activeCall && (

                <div className="fixed inset-0 z-[300] bg-zinc-950 flex flex-col">

                    <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">

                        {activeCall.isVideo && <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />}

                        {callStatus === 'ringing' && (

                            <div className="flex flex-col items-center z-10">

                                <div className="w-32 h-32 bg-zinc-800 rounded-full flex items-center justify-center mb-4 border-4 border-blue-500 animate-pulse shadow-[0_0_40px_rgba(59,130,246,0.4)]">

                                    <User size={50} className="text-zinc-300" />

                                </div>

                                <h2 className="text-white text-2xl font-bold">{activeCall.targetName}</h2>

                                <p className="text-zinc-400 animate-pulse mt-2">Calling...</p>

                            </div>

                        )}

                        {callStatus === 'connected' && !activeCall.isVideo && (

                            <div className="flex flex-col items-center z-10">

                                <div className="w-32 h-32 bg-zinc-800 rounded-full flex items-center justify-center mb-4 border-2 border-green-500">

                                    <User size={50} className="text-zinc-300" />

                                </div>

                                <h2 className="text-white text-2xl font-bold">{activeCall.targetName}</h2>

                                <p className="text-green-400 animate-pulse mt-2">Connected</p>

                            </div>

                        )}

                        {audioBlocked && callStatus === 'connected' && (

                            <button onClick={unlockAudio} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-yellow-500 text-black font-bold px-5 py-2 rounded-full text-sm shadow-lg animate-pulse">

                                🔇 Tap to enable audio

                            </button>

                        )}

                        {activeCall.isVideo && (

                            <div className="absolute top-6 right-4 w-28 h-40 bg-zinc-900 rounded-xl overflow-hidden border-2 border-zinc-700 shadow-2xl z-20">

                                <video ref={myVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />

                            </div>

                        )}

                    </div>

                    <div className="h-28 bg-zinc-900 border-t border-zinc-800 flex items-center justify-center gap-6">

                        <button onClick={toggleMic} className={"w-14 h-14 rounded-full flex items-center justify-center transition " + (micOn ? "bg-zinc-800 text-white" : "bg-white text-black")}>

                            {micOn ? <Mic size={24} /> : <MicOff size={24} />}

                        </button>

                        <button onClick={() => hangUp(true)} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30 hover:scale-105 transition">

                            <PhoneOff size={28} />

                        </button>

                        {activeCall.isVideo && (

                            <button onClick={toggleCam} className={"w-14 h-14 rounded-full flex items-center justify-center transition " + (camOn ? "bg-zinc-800 text-white" : "bg-white text-black")}>

                                {camOn ? <Camera size={24} /> : <CameraOff size={24} />}

                            </button>

                        )}

                    </div>

                </div>

            )}

        </>

    );

}





function AppContent() {

  const currentUserId = localStorage.getItem('userId');

  const[currentUser, setCurrentUser] = useState(null);

  const [liveAccentColor, setLiveAccentColor] = useState(null);

  const location = useLocation();

  const[mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [badges, setBadges] = useState({ unread_messages: 0, pending_requests: 0, total_notifications: 0 });

  const[showSplash, setShowSplash] = useState(true);



  const startCallRef = useRef(null);

  const [toasts, setToasts] = useState([]);

  const [onlineUsers, setOnlineUsers] = useState(new Set());



  const userThemeColor = liveAccentColor || currentUser?.theme_color || '#3b82f6';



  // Listen for live accent color changes from Settings

  useEffect(() => {

      const handler = (e) => setLiveAccentColor(e.detail.color);

      window.addEventListener('theme_color_changed', handler);

      return () => window.removeEventListener('theme_color_changed', handler);

  }, []);



  const fetchBadges = () => {

      if (currentUserId) {

          axios.get(`${BACKEND_URL}/api/activity/${currentUserId}`).then(res => setBadges(res.data)).catch(e => console.error(e));

      }

  };



  const addToast = (toast) => {

      const id = Date.now();

      setToasts(prev => [...prev.slice(-3), { ...toast, id }]); // max 4 toasts

      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);

  };

  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));



// 🔥 FIX: We wipe the red dot badge visually, but do NOT delete the database history!

  const clearNotifications = () => { 

      setBadges(prev => ({ ...prev, total_notifications: 0 })); 

  };  const clearChatBadge = () => { setBadges(prev => ({ ...prev, unread_messages: 0 })); };

  const clearFriendsBadge = () => { setBadges(prev => ({ ...prev, pending_requests: 0 })); };



  const subscribeToPush = async () => {

      if ('serviceWorker' in navigator && 'PushManager' in window) {

          try {

              const reg = await navigator.serviceWorker.ready;

              const vapidRes = await axios.get(`${BACKEND_URL}/api/vapidPublicKey`);

              const convertedVapidKey = urlBase64ToUint8Array(vapidRes.data);

              const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: convertedVapidKey });

              await axios.post(`${BACKEND_URL}/api/subscribe`, { userId: currentUserId, subscription: subscription });

          } catch (e) {}

      }

  };



  useEffect(() => {

      if (currentUserId) {

          try { globalSocket.emit('join_private_room', currentUserId); } catch(e) {}

          // Fetch initial online users

          axios.get(`${BACKEND_URL}/api/online`).then(res => {

              setOnlineUsers(new Set(res.data.map(u => String(u.userId))));

          }).catch(() => {});

          const handleNotification = (data) => {

              playNotificationSound();

              axios.get(`${BACKEND_URL}/api/activity/${currentUserId}`)

                  .then(res => setBadges(res.data)).catch(() => {});

              // Show toast if it's a new message from someone else (data has senderName)

              if (data?.senderName && data.senderId != currentUserId) {

                  addToast({ senderName: data.senderName, preview: data.preview, senderId: data.senderId });

              }

              if (data?.type === 'mention' && data.from) {

                  addToast({ senderName: data.from, preview: `mentioned you in a post`, senderId: null, isMention: true });

              }

          };

          const handleOnlineStatus = ({ userId: uid, online }) => {

              setOnlineUsers(prev => {

                  const next = new Set(prev);

                  online ? next.add(String(uid)) : next.delete(String(uid));

                  return next;

              });

          };

          globalSocket.on('message_updated', handleNotification);

          globalSocket.on('activity_updated', handleNotification);

          globalSocket.on('online_status', handleOnlineStatus);



          subscribeToPush();

          return () => {

              globalSocket.off('message_updated', handleNotification);

              globalSocket.off('activity_updated', handleNotification);

              globalSocket.off('online_status', handleOnlineStatus);

          };

      }

  }, [currentUserId]);



  useEffect(() => {

    const timer = setTimeout(() => { setShowSplash(false); }, 500);

    if (currentUserId) { 

        axios.get(`${BACKEND_URL}/api/users/${currentUserId}`).then(res => { setCurrentUser(res.data); if (res.data?.username) localStorage.setItem('username', res.data.username); }).catch(err => console.error(err)); 

        fetchBadges();

    }

    return () => clearTimeout(timer);

  },[currentUserId]);

  

  useEffect(() => { setMobileMenuOpen(false); },[location.pathname]);



  return (

      <div className="h-screen bg-black text-zinc-50 font-sans flex justify-center overflow-hidden">

        

        {showSplash && <SplashScreen />}



        {/* DESKTOP SIDEBAR */}

        <header className="hidden sm:flex flex-col justify-between w-56 border-r border-zinc-800 h-screen sticky top-0 py-4 px-4 z-40 bg-black overflow-y-auto">

          <div className="flex flex-col gap-2">

            <Link to="/" className="p-3 mb-4 w-fit rounded-full transition flex items-center gap-3">

              <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-xl object-cover" />

              <span className="font-extrabold text-2xl tracking-tight" style={{ color: userThemeColor }}>SuperApp</span>

            </Link>



            {currentUserId && (

                <>

                    <NavItem to="/" icon={Home} label="Home" themeColor={userThemeColor} />

                    <NavItem to="/reels" icon={Clapperboard} label="Watch" themeColor={userThemeColor} />

                    <NavItem to="/friends" onClick={clearFriendsBadge} icon={Users} label="Friends" badgeCount={badges.pending_requests} themeColor={userThemeColor} />

                    <NavItem to="/chat" onClick={clearChatBadge} icon={MessageCircle} label="Messages" badgeCount={badges.unread_messages} themeColor={userThemeColor} />

                    <NavItem to="/notifications" onClick={clearNotifications} icon={Bell} label="Notifications" badgeCount={badges.total_notifications} themeColor={userThemeColor} />

                    <NavItem to="/search" icon={SearchIcon} label="Explore" themeColor={userThemeColor} />

                    <NavItem to="/communities" icon={Globe} label="Communities" themeColor={userThemeColor} />

                    <NavItem to="/marketplace" icon={ShoppingBag} label="Marketplace" themeColor={userThemeColor} />

                    <NavItem to="/streaks" icon={Flame} label="Streaks" themeColor={userThemeColor} />

                    <NavItem to="/settings" icon={SettingsIcon} label="Settings" themeColor={userThemeColor} />

                </>

            )}

            {!currentUserId && (

                <>

                    <NavItem to="/login" icon={LogIn} label="Login" themeColor={userThemeColor} />

                    <NavItem to="/register" icon={UserPlus} label="Register" themeColor={userThemeColor} />

                </>

            )}

          </div>

          

          {currentUserId && (

            <Link to={`/profile/${currentUserId}`} className="mt-auto flex items-center gap-3 p-3 hover:bg-zinc-900 rounded-xl cursor-pointer transition">

              <div className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center overflow-hidden">

                 {currentUser?.profile_pic_url ? ( <img src={`${currentUser.profile_pic_url}`} className="w-full h-full object-cover" /> ) : ( <User size={20} className="text-zinc-400" /> )}

              </div>

              <div><p className="font-bold text-sm" style={{ color: userThemeColor }}>My Profile</p><p className="text-zinc-500 text-xs">View & Edit</p></div>

            </Link>

          )}

        </header>



        {/* 🔥 MAIN CONTENT AREA (FIXED PADDING FOR MOBILE SCROLLING) 🔥 */}

        <main className={`w-full max-w-[600px] border-x border-zinc-800 h-screen relative bg-black ${location.pathname === '/chat' ? 'overflow-hidden pb-0' : 'overflow-y-auto pb-[70px] sm:pb-0'}`}>

          {location.pathname !== '/reels' && location.pathname !== '/chat' && (

              <div className="sm:hidden flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-black/80 backdrop-blur-md z-30">

                <div className="flex items-center gap-3">

                    <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />

                    <h1 className="font-bold text-xl tracking-tight" style={{ color: userThemeColor }}>SuperApp</h1>

                </div>

                <button onClick={() => setMobileMenuOpen(true)} className="p-2 -mr-2 text-zinc-400 hover:text-white transition">

                    <Menu size={26} />

                </button>

              </div>

          )}



          <Routes>

            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

            <Route path="/" element={<ProtectedRoute><Feed themeColor={userThemeColor} onlineUsers={onlineUsers} /></ProtectedRoute>} />

            <Route path="/search" element={<ProtectedRoute><Search themeColor={userThemeColor} /></ProtectedRoute>} />

            <Route path="/communities" element={<ProtectedRoute><Communities themeColor={userThemeColor} /></ProtectedRoute>} />

            <Route path="/friends" element={<ProtectedRoute><Friends themeColor={userThemeColor} /></ProtectedRoute>} /> 

            <Route path="/reels" element={<ProtectedRoute><Reels themeColor={userThemeColor} /></ProtectedRoute>} />
            <Route path="/streaks" element={<ProtectedRoute><Streaks /></ProtectedRoute>} /> 

            <Route path="/chat" element={<ProtectedRoute><Chat themeColor={userThemeColor} onStartCall={(target, isVideo) => startCallRef.current && startCallRef.current(target, isVideo)} onlineUsers={onlineUsers} /></ProtectedRoute>} />

            <Route path="/notifications" element={<ProtectedRoute><Notifications themeColor={userThemeColor} /></ProtectedRoute>} />

            <Route path="/settings" element={<ProtectedRoute><Settings themeColor={userThemeColor} /></ProtectedRoute>} />

            <Route path="/profile/:id" element={<ProtectedRoute><Profile themeColor={userThemeColor} onlineUsers={onlineUsers} /></ProtectedRoute>} />

            <Route path="/create-post" element={<ProtectedRoute><CreatePost themeColor={userThemeColor} /></ProtectedRoute>} />

            <Route path="/dashboard" element={<ProtectedRoute><UserDashboard themeColor={userThemeColor} /></ProtectedRoute>} />

            <Route path="/marketplace" element={<ProtectedRoute><Marketplace themeColor={userThemeColor} /></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

            <Route path="/admin/verification" element={<ProtectedRoute><AdminVerification /></ProtectedRoute>} />

            <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/users/:userId/profile" element={<ProtectedRoute><AdminUserProfile /></ProtectedRoute>} />

            <Route path="/admin/content" element={<ProtectedRoute><AdminContent /></ProtectedRoute>} />

            <Route path="/admin/analytics" element={<ProtectedRoute><AdminAnalytics /></ProtectedRoute>} />

            <Route path="/admin/reports" element={<ProtectedRoute><AdminReports /></ProtectedRoute>} />

            <Route path="/admin/marketplace" element={<ProtectedRoute><AdminMarketplace /></ProtectedRoute>} />
            <Route path="/admin/app-settings" element={<ProtectedRoute><AdminAppSettings /></ProtectedRoute>} />
            <Route path="/admin/powers" element={<ProtectedRoute><AdminPowers /></ProtectedRoute>} />
            <Route path="/admin/communities" element={<ProtectedRoute><AdminCommunities /></ProtectedRoute>} />

          </Routes>

        </main>



        {mobileMenuOpen && (

            <div className="fixed inset-0 z-50 flex sm:hidden">

                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setMobileMenuOpen(false)}></div>

                <aside className="absolute right-0 top-0 bottom-0 w-[75%] max-w-sm bg-zinc-950 border-l border-zinc-800 flex flex-col animate-[slide-left_0.3s_ease-out] shadow-2xl">

                    <div className="p-6 border-b border-zinc-800 flex justify-between items-center">

                        <span className="font-bold text-xl text-white">Menu</span>

                        <button onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white"><X size={24}/></button>

                    </div>

                    <div className="p-4 flex flex-col gap-2">

                        <NavItem to="/search" icon={SearchIcon} label="Explore Users" themeColor={userThemeColor} showLabelAlways={true} onClick={() => setMobileMenuOpen(false)} />

                        <NavItem to="/communities" icon={Globe} label="Communities" themeColor={userThemeColor} showLabelAlways={true} onClick={() => setMobileMenuOpen(false)} />

                        <NavItem to="/marketplace" icon={ShoppingBag} label="Marketplace" themeColor={userThemeColor} showLabelAlways={true} onClick={() => setMobileMenuOpen(false)} />

                        <NavItem to="/streaks" icon={Flame} label="Streaks" themeColor={userThemeColor} showLabelAlways={true} onClick={() => setMobileMenuOpen(false)} />

                        <NavItem to="/settings" icon={SettingsIcon} label="App Settings" themeColor={userThemeColor} showLabelAlways={true} onClick={() => setMobileMenuOpen(false)} />

                    </div>

                </aside>

            </div>

        )}



        {/* 🔥 MOBILE BOTTOM NAV (ABSOLUTELY FIXED TO SCREEN BOTTOM) 🔥 */}

        <nav className="sm:hidden fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-md border-t border-zinc-800 flex justify-around items-center px-1 py-3 pb-safe z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">

          {currentUserId ? (

              <>

                  <Link to="/" className="p-1.5 transition-colors" style={{ color: location.pathname === '/' ? userThemeColor : '#a1a1aa' }}><Home size={22} /></Link>

                  <Link to="/reels" className="p-1.5 transition-colors" style={{ color: location.pathname === '/reels' ? userThemeColor : '#a1a1aa' }}><Clapperboard size={22} /></Link>

                  <Link to="/friends" onClick={clearFriendsBadge} className="p-1.5 transition-colors relative" style={{ color: location.pathname === '/friends' ? userThemeColor : '#a1a1aa' }}>

                      <Users size={22} />

                      {badges.pending_requests > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-black animate-pulse"></span>}

                  </Link> 

                  <Link to="/chat" onClick={clearChatBadge} className="p-1.5 transition-colors relative" style={{ color: location.pathname === '/chat' ? userThemeColor : '#a1a1aa' }}>

                      <MessageCircle size={22} />

                      {badges.unread_messages > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-black animate-pulse"></span>}

                  </Link>

                  <Link to="/notifications" onClick={clearNotifications} className="p-1.5 transition-colors relative" style={{ color: location.pathname === '/notifications' ? userThemeColor : '#a1a1aa' }}>

                      <Bell size={22} />

                      {badges.total_notifications > 0 && (

                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md animate-bounce">

                              {badges.total_notifications}

                          </span>

                      )}

                  </Link> 

                  <Link to={`/profile/${currentUserId}`} className="p-1.5 flex items-center justify-center">

                    {currentUser?.profile_pic_url ? ( 

                        <img src={`${currentUser.profile_pic_url}`} className="w-[26px] h-[26px] rounded-full object-cover border-2" style={{ borderColor: location.pathname.includes('/profile') ? userThemeColor : 'transparent' }} /> 

                    ) : ( 

                        <User size={22} style={{ color: location.pathname.includes('/profile') ? userThemeColor : '#a1a1aa' }} /> 

                    )}

                  </Link>

              </>

          ) : (

              <>

                  <Link to="/login" className="p-2 text-zinc-400 hover:text-white"><LogIn size={26} /></Link>

                  <Link to="/register" className="p-2 text-zinc-400 hover:text-white"><UserPlus size={26} /></Link>

              </>

          )}

        </nav>

      {/* 💬 MESSAGE TOASTS */}

      <div className="fixed top-4 right-4 z-[250] flex flex-col gap-2 pointer-events-none">

          {toasts.map(toast => (

              <div key={toast.id} className="pointer-events-auto flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 shadow-2xl shadow-black/50 min-w-[260px] max-w-xs animate-fade-in backdrop-blur-md">

                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">

                      {toast.senderName?.charAt(0).toUpperCase()}

                  </div>

                  <div className="flex-1 min-w-0" onClick={() => { dismissToast(toast.id); window.location.href = '/chat'; }} style={{ cursor: 'pointer' }}>

                      <p className="text-white text-sm font-bold truncate">{toast.senderName}</p>

                      <p className="text-zinc-400 text-xs truncate">{toast.preview}</p>

                  </div>

                  <button onClick={() => dismissToast(toast.id)} className="text-zinc-500 hover:text-white transition flex-shrink-0">

                      <X size={14} />

                  </button>

              </div>

          ))}

      </div>



      <CallManager currentUserId={currentUserId} startCallRef={startCallRef} />

      </div>

  );

}



function App() { return ( <ErrorBoundary><Router><AppContent /></Router></ErrorBoundary> ); }

export default App;