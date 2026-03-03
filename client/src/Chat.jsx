import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';
import { Send, ArrowLeft, User, BellRing, Phone, Video, PhoneOff, Mic, MicOff, Camera, CameraOff, Image as ImageIcon, Paperclip, FileText, Reply, Pin, Forward, X, PinOff, Trash2, Gamepad2 } from 'lucide-react';

const BACKEND_URL = `http://${window.location.hostname}:5000`;
const socket = io(BACKEND_URL);
const EMOJIS =['❤️', '😂', '😮', '😢', '🔥', '🙏'];

function Chat() {
    const userId = parseInt(localStorage.getItem('userId'));
    const[currentUserInfo, setCurrentUserInfo] = useState(null);
    const [friends, setFriends] = useState([]);
    const[requests, setRequests] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const[messages, setMessages] = useState([]);
    const[currentMessage, setCurrentMessage] = useState('');
    const messagesEndRef = useRef(null);
    const [viewingImage, setViewingImage] = useState(null);

    const[replyingTo, setReplyingTo] = useState(null);
    const[forwardingMessage, setForwardingMessage] = useState(null);
    const[hoveredMessageId, setHoveredMessageId] = useState(null);
    const[uploadingMedia, setUploadingMedia] = useState(false);
    
    // 🔥 NEW: GAME MENU STATE 🔥
    const [showGameMenu, setShowGameMenu] = useState(false);

    const imageInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const docInputRef = useRef(null);
    
    const[receivingCall, setReceivingCall] = useState(false);
    const[callerInfo, setCallerInfo] = useState(null);
    const[callAccepted, setCallAccepted] = useState(false);
    const [activeCall, setActiveCall] = useState(false); 
    const [isVideoCall, setIsVideoCall] = useState(false);
    const[micEnabled, setMicEnabled] = useState(true);
    const [cameraEnabled, setCameraEnabled] = useState(true);

    const myVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const myStreamRef = useRef(null);
    const peerConnectionRef = useRef(null);

    const isCallerRef = useRef(false); 
    const callStartTimeRef = useRef(null); 
    const isVideoCallRef = useRef(false);
    const pendingIceCandidates = useRef([]);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const[isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);

    const loadInbox = () => {
        axios.get(`${BACKEND_URL}/api/friends/list/${userId}`).then(res => setFriends(res.data)).catch(err => console.error(err));
        axios.get(`${BACKEND_URL}/api/requests/${userId}`).then(res => setRequests(res.data)).catch(err => console.error(err));
    };

    const initialDeps = Array.of();
    useEffect(() => {
        socket.emit('join_private_room', userId);
        axios.get(`${BACKEND_URL}/api/users/${userId}`).then(res => setCurrentUserInfo(res.data)).catch(err => console.error(err));
        loadInbox();
    }, initialDeps);

    const loadMessages = () => {
        if (selectedUser) { 
            axios.get(`${BACKEND_URL}/api/messages/${userId}/${selectedUser.id}`)
                 .then(res => setMessages(res.data)).catch(err => console.error(err)); 
        }
    };
    
    const chatDeps = Array.of(selectedUser ? selectedUser.id : null);
    useEffect(() => { loadMessages(); }, chatDeps);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    useEffect(() => {
        if (activeCall) {
            if (myVideoRef.current && myStreamRef.current) myVideoRef.current.srcObject = myStreamRef.current;
            if (remoteVideoRef.current && peerConnectionRef.current) {
                const remoteStream = new MediaStream();
                peerConnectionRef.current.getReceivers().forEach(receiver => { if(receiver.track) remoteStream.addTrack(receiver.track); });
                remoteVideoRef.current.srcObject = remoteStream;
            }
        }
    },[activeCall, callAccepted]);

    useEffect(() => {
        const handleMessageUpdate = () => { loadMessages(); loadInbox(); };
        const handleIncomingCall = (data) => { if (!activeCall && !receivingCall) { setReceivingCall(true); setCallerInfo(data); setIsVideoCall(data.isVideo); isVideoCallRef.current = data.isVideo; } };
        const handleCallAccepted = async (signal) => { setCallAccepted(true); callStartTimeRef.current = Date.now(); if (peerConnectionRef.current) { await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal)); pendingIceCandidates.current.forEach(candidate => peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))); pendingIceCandidates.current =[]; } };
        const handleIceCandidate = async (candidate) => { if (peerConnectionRef.current) { if (peerConnectionRef.current.remoteDescription) { try { await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.error(e); } } else { pendingIceCandidates.current.push(candidate); } } };
        const handleCallEnded = () => handleHangUp(false);

        socket.on('message_updated', handleMessageUpdate);
        socket.on('incoming_call', handleIncomingCall);
        socket.on('call_accepted', handleCallAccepted);
        socket.on('ice_candidate', handleIceCandidate);
        socket.on('call_ended', handleCallEnded);
        
        return () => { socket.off('message_updated', handleMessageUpdate); socket.off('incoming_call', handleIncomingCall); socket.off('call_accepted', handleCallAccepted); socket.off('ice_candidate', handleIceCandidate); socket.off('call_ended', handleCallEnded); };
    },[selectedUser, activeCall, receivingCall]);

    const handleSelectUser = async (friend) => {
        setSelectedUser(friend);
        try {
            await axios.put(`${BACKEND_URL}/api/messages/read`, { senderId: friend.id, receiverId: userId });
            setFriends(prev => prev.map(f => f.id === friend.id ? { ...f, unread_count: 0 } : f));
        } catch (e) { console.error(e); }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (currentMessage.trim() !== '' && selectedUser) {
            socket.emit('send_private_message', { senderId: userId, receiverId: selectedUser.id, content: currentMessage, replyToId: replyingTo ? replyingTo.id : null });
            setCurrentMessage(''); setReplyingTo(null); setShowGameMenu(false);
        }
    };

    const handleMediaUpload = async (e) => {
        const file = e.target.files[0]; if(!file) return;
        const formData = new FormData(); formData.append('media', file);
        try {
            setUploadingMedia(true);
            const res = await axios.post(`${BACKEND_URL}/api/messages/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            socket.emit('send_private_message', { senderId: userId, receiverId: selectedUser.id, content: '', media_url: res.data.media_url, media_type: res.data.media_type, replyToId: replyingTo ? replyingTo.id : null });
            setUploadingMedia(false); e.target.value = ''; setReplyingTo(null);
        } catch(err) { console.error(err); setUploadingMedia(false); alert("Upload failed"); }
    };

    // 🔥 NEW: START A MULTIPLAYER GAME 🔥
    const startNewGame = (type) => {
        setShowGameMenu(false);
        if (!selectedUser) return;
        
        let gameData = {};
        if (type === 'tictactoe') {
            gameData = { board: Array(9).fill(null), nextTurn: selectedUser.id, playerX: userId, playerO: selectedUser.id, winner: null };
        } else if (type === 'rps') {
            gameData = { player1: userId, player2: selectedUser.id, p1Choice: null, p2Choice: null, winner: null };
        }

        socket.emit('send_private_message', { 
            senderId: userId, 
            receiverId: selectedUser.id, 
            content: JSON.stringify(gameData), 
            media_type: type,
            replyToId: replyingTo ? replyingTo.id : null 
        });
        setReplyingTo(null);
    };

    // 🔥 NEW: HANDLE A MOVE FOR ANY GAME 🔥
    const handleGameMove = (msgId, index, gameType, choice = null) => {
        socket.emit('play_game_move', {
            messageId: msgId,
            index: index,
            userId: userId,
            gameType: gameType,
            choice: choice
        });
    };

    const startRecording = async () => {
        setShowGameMenu(false);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current =[];
            mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            mediaRecorderRef.current.onstop = async () => {
                if (!isRecording) return; 
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const formData = new FormData(); formData.append('media', audioBlob, `voicenote-${Date.now()}.webm`);
                try {
                    setUploadingMedia(true);
                    const res = await axios.post(`${BACKEND_URL}/api/messages/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                    socket.emit('send_private_message', { senderId: userId, receiverId: selectedUser.id, content: '', media_url: res.data.media_url, media_type: 'audio', replyToId: replyingTo ? replyingTo.id : null });
                    setUploadingMedia(false); setReplyingTo(null);
                } catch(err) { console.error(err); setUploadingMedia(false); alert("Voice note upload failed"); }
            };
            mediaRecorderRef.current.start(); setIsRecording(true); setRecordingDuration(0);
            timerRef.current = setInterval(() => { setRecordingDuration((prev) => prev + 1); }, 1000);
        } catch (err) { console.error(err); alert("Microphone access denied."); }
    };

    const stopAndSendRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop(); 
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            clearInterval(timerRef.current); setIsRecording(false);
        }
    };
    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            setIsRecording(false); 
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            clearInterval(timerRef.current);
        }
    };
    const formatDuration = (seconds) => {
        const m = Math.floor(seconds / 60); const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const reactToMessage = (msgId, reaction) => { socket.emit('react_message', { messageId: msgId, reaction: reaction, senderId: userId, receiverId: selectedUser.id }); setHoveredMessageId(null); };
    const togglePinMessage = (msgId, currentPinState) => { socket.emit('pin_message', { messageId: msgId, isPinned: !currentPinState, senderId: userId, receiverId: selectedUser.id }); setHoveredMessageId(null); };
    const executeForward = (targetFriendId) => { socket.emit('send_private_message', { senderId: userId, receiverId: targetFriendId, content: forwardingMessage.content, media_url: forwardingMessage.media_url, media_type: forwardingMessage.media_type, isForwarded: true }); setForwardingMessage(null); alert("Message forwarded!"); };
    const deleteMessage = (msgId) => { if(window.confirm("Delete this message for everyone?")) { socket.emit('delete_message', { messageId: msgId, senderId: userId, receiverId: selectedUser.id }); setHoveredMessageId(null); } };

    const initPeerConnection = () => { const pc = new RTCPeerConnection({ iceServers:[{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] }); pc.onicecandidate = (event) => { if (event.candidate) { const sendTo = callerInfo ? callerInfo.from : selectedUser.id; socket.emit('ice_candidate', { to: sendTo, candidate: event.candidate }); } }; pc.ontrack = (event) => { if (remoteVideoRef.current) { remoteVideoRef.current.srcObject = event.streams[0]; } }; return pc; };
    const startCall = async (video = false) => { setIsVideoCall(video); isVideoCallRef.current = video; setActiveCall(true); isCallerRef.current = true; callStartTimeRef.current = null; pendingIceCandidates.current =[]; try { const stream = await navigator.mediaDevices.getUserMedia({ video: video, audio: true }); myStreamRef.current = stream; const pc = initPeerConnection(); peerConnectionRef.current = pc; stream.getTracks().forEach((track) => pc.addTrack(track, stream)); const offer = await pc.createOffer(); await pc.setLocalDescription(offer); socket.emit('call_user', { userToCall: selectedUser.id, signalData: offer, from: userId, callerName: currentUserInfo?.username || "Unknown", isVideo: video }); } catch (err) { console.error(err); alert("Camera/Mic permission denied."); setActiveCall(false); } };
    const answerCall = async () => { setCallAccepted(true); setActiveCall(true); setReceivingCall(false); isCallerRef.current = false; callStartTimeRef.current = Date.now(); pendingIceCandidates.current =[]; try { const stream = await navigator.mediaDevices.getUserMedia({ video: isVideoCall, audio: true }); myStreamRef.current = stream; const pc = initPeerConnection(); peerConnectionRef.current = pc; stream.getTracks().forEach((track) => pc.addTrack(track, stream)); await pc.setRemoteDescription(new RTCSessionDescription(callerInfo.signal)); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); socket.emit('answer_call', { signal: answer, to: callerInfo.from }); } catch (err) { console.error(err); alert("Failed to connect media."); handleHangUp(true); } };
    const handleHangUp = (emitToOther = true) => { 
        if (emitToOther) { const sendTo = callerInfo ? callerInfo.from : selectedUser?.id; if (sendTo) socket.emit('end_call', { to: sendTo }); } 
        if (isCallerRef.current && selectedUser) {
            let logMsg = ""; const isVid = isVideoCallRef.current;
            if (callStartTimeRef.current) { const diffSeconds = Math.floor((Date.now() - callStartTimeRef.current) / 1000); const mins = Math.floor(diffSeconds / 60); const secs = diffSeconds % 60; const duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`; logMsg = isVid ? `📹 Video call ended • ${duration}` : `📞 Audio call ended • ${duration}`;
            } else { logMsg = isVid ? `📹 Missed Video call` : `📞 Missed Audio call`; }
            socket.emit('send_private_message', { senderId: userId, receiverId: selectedUser.id, content: logMsg, replyToId: null });
        }
        isCallerRef.current = false; callStartTimeRef.current = null; setActiveCall(false); setReceivingCall(false); setCallAccepted(false); setCallerInfo(null); if (myStreamRef.current) { myStreamRef.current.getTracks().forEach(track => track.stop()); myStreamRef.current = null; } if (remoteStreamRef.current) { remoteStreamRef.current.getTracks().forEach(track => track.stop()); remoteStreamRef.current = null; } if (peerConnectionRef.current) { peerConnectionRef.current.close(); peerConnectionRef.current = null; } 
    };
    const toggleMic = () => { if (myStreamRef.current) { const track = myStreamRef.current.getAudioTracks()[0]; if (track) { track.enabled = !track.enabled; setMicEnabled(track.enabled); } } };
    const toggleCamera = () => { if (myStreamRef.current && isVideoCall) { const track = myStreamRef.current.getVideoTracks()[0]; if (track) { track.enabled = !track.enabled; setCameraEnabled(track.enabled); } } };

    if (receivingCall && !callAccepted) {
        return ( <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center animate-fade-in backdrop-blur-md"><div className="w-24 h-24 rounded-full bg-zinc-800 border-4 border-zinc-700 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,255,255,0.2)] animate-pulse"><User size={40} className="text-zinc-500" /></div><h2 className="text-white text-3xl font-bold mb-2">{callerInfo.callerName}</h2><p className="text-zinc-400 mb-12 uppercase tracking-widest text-sm">Incoming {isVideoCall ? 'Video' : 'Audio'} Call...</p><div className="flex gap-10"><button onClick={() => { setReceivingCall(false); handleHangUp(); }} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:scale-110 transition shadow-lg shadow-red-500/50"><PhoneOff className="text-white" size={28} /></button><button onClick={answerCall} className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center hover:scale-110 transition shadow-lg shadow-green-500/50 animate-bounce">{isVideoCall ? <Video className="text-white" size={28} /> : <Phone className="text-white" size={28} />}</button></div></div> );
    }

    if (activeCall) {
        return ( <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col"><div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden"><video playsInline ref={remoteVideoRef} autoPlay className="absolute inset-0 w-full h-full object-cover" />{!isVideoCall && (<div className="flex flex-col items-center z-10"><div className="w-32 h-32 bg-zinc-800 rounded-full flex items-center justify-center mb-4 border border-zinc-700"><User size={50} className="text-zinc-500" /></div><h2 className="text-white text-2xl font-bold">{callerInfo?.callerName || selectedUser?.username}</h2><p className="text-green-400 animate-pulse mt-2">Connected</p></div>)}{isVideoCall && (<div className="absolute top-6 right-4 w-28 h-40 bg-zinc-900 rounded-xl overflow-hidden border-2 border-zinc-700 shadow-2xl z-20"><video playsInline muted ref={myVideoRef} autoPlay className="w-full h-full object-cover transform -scale-x-100" /></div>)}</div><div className="h-28 bg-zinc-900 border-t border-zinc-800 flex items-center justify-center gap-6 pb-safe"><button onClick={toggleMic} className={`w-14 h-14 rounded-full flex items-center justify-center transition ${micEnabled ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-white text-black'}`}>{micEnabled ? <Mic size={24} /> : <MicOff size={24} />}</button><button onClick={() => handleHangUp(true)} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/30 transition hover:scale-105"><PhoneOff size={28} /></button>{isVideoCall && (<button onClick={toggleCamera} className={`w-14 h-14 rounded-full flex items-center justify-center transition ${cameraEnabled ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-white text-black'}`}>{cameraEnabled ? <Camera size={24} /> : <CameraOff size={24} />}</button>)}</div></div> );
    }

    if (selectedUser) {
        const isCurrentlyFriend = friends.some(f => f.id === selectedUser.id);
        const pinnedMessage = messages.slice().reverse().find(m => m.is_pinned);

        return (
            <div className="flex flex-col h-[calc(100vh-140px)] sm:h-screen w-full relative bg-black">
                {viewingImage && ( <div className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center animate-fade-in" onClick={() => setViewingImage(null)}><button className="absolute top-4 right-4 text-white bg-zinc-800 rounded-full p-2 hover:bg-zinc-700 transition"><X size={24} /></button><img src={viewingImage} className="max-w-full max-h-full object-contain p-4" onClick={(e) => e.stopPropagation()} /></div> )}
                {forwardingMessage ? ( <div className="absolute inset-0 z-50 bg-black/90 flex flex-col p-4 animate-fade-in"><div className="flex justify-between items-center mb-6"><h3 className="text-white font-bold text-xl">Forward to...</h3><button onClick={() => setForwardingMessage(null)} className="text-white bg-zinc-800 rounded-full p-2"><X size={20}/></button></div><div className="space-y-2 overflow-y-auto">{friends.map(friend => (<div key={friend.id} onClick={() => executeForward(friend.id)} className="flex items-center gap-4 bg-zinc-900 p-3 rounded-xl cursor-pointer hover:bg-zinc-800 transition"><div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800">{friend.profile_pic_url ? <img src={`${BACKEND_URL}${friend.profile_pic_url}`} className="w-full h-full object-cover" /> : <User className="m-auto mt-2 text-zinc-500" />}</div><span className="text-white font-bold">{friend.username}</span><Send size={18} className="ml-auto text-blue-500" /></div>))}</div></div> ) : null}

                <div className="p-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-zinc-800 rounded-full transition text-white"><ArrowLeft size={24} /></button>
                        <Link to={`/profile/${selectedUser.id}`} className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center">{selectedUser.profile_pic_url ? <img src={`${BACKEND_URL}${selectedUser.profile_pic_url}`} className="w-full h-full object-cover" /> : <span className="text-zinc-500 font-bold">{selectedUser.username.charAt(0).toUpperCase()}</span>}</div>
                            <div><h2 className="text-lg font-bold text-white leading-tight">{selectedUser.username}</h2><p className="text-xs text-zinc-500">Private Chat</p></div>
                        </Link>
                    </div>
                    {isCurrentlyFriend && (<div className="flex items-center gap-4 text-blue-500 mr-2"><button onClick={() => startCall(false)} className="hover:bg-blue-500/10 p-2 rounded-full transition"><Phone size={22} /></button><button onClick={() => startCall(true)} className="hover:bg-blue-500/10 p-2 rounded-full transition"><Video size={24} /></button></div>)}
                </div>
                
                {pinnedMessage ? (<div className="bg-zinc-900 border-b border-zinc-800 p-2 px-4 flex items-center gap-3 shadow-md z-10"><Pin size={16} className="text-blue-500 flex-shrink-0" /><div className="flex-1 overflow-hidden"><p className="text-blue-500 text-xs font-bold">Pinned Message</p><p className="text-zinc-300 text-sm truncate">{pinnedMessage.content || "Media Attachment"}</p></div></div>) : null}
                
                <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">
                    {!isCurrentlyFriend && (<div className="bg-zinc-900 border border-zinc-700 p-3 rounded-xl text-center mb-4"><p className="text-sm text-zinc-300">You are not friends with this user.</p><p className="text-xs text-zinc-500">Go to the Friends tab to add them to call them.</p></div>)}
                    
                    {messages.map((msg) => { 
                        const isMyMessage = msg.sender_id === userId; 
                        const isHovered = hoveredMessageId === msg.id;
                        const isCallLog = msg.content && (msg.content.startsWith('📞') || msg.content.startsWith('📹'));

                        // Parse game data if it exists
                        let tttData = null; let rpsData = null;
                        if (msg.media_type === 'tictactoe') { try { tttData = JSON.parse(msg.content); } catch(e){} }
                        if (msg.media_type === 'rps') { try { rpsData = JSON.parse(msg.content); } catch(e){} }

                        return (
                            <div key={msg.id} className={`flex flex-col w-full ${isMyMessage ? 'items-end' : 'items-start'} relative group`} onMouseEnter={() => setHoveredMessageId(msg.id)} onMouseLeave={() => setHoveredMessageId(null)}>
                                {isHovered && !isCallLog && !tttData && !rpsData && (
                                    <div className={`absolute top-0 -mt-8 flex gap-1 bg-zinc-800 border border-zinc-700 p-1 rounded-full shadow-lg z-20 ${isMyMessage ? 'right-0' : 'left-0'}`}>
                                        <div className="flex gap-1 border-r border-zinc-600 pr-1 mr-1">{EMOJIS.map(emoji => (<button key={emoji} onClick={() => reactToMessage(msg.id, emoji)} className="hover:scale-125 transition text-lg px-1">{emoji}</button>))}</div>
                                        <button onClick={() => setReplyingTo(msg)} className="p-1.5 text-zinc-400 hover:text-white transition"><Reply size={16} /></button>
                                        <button onClick={() => setForwardingMessage(msg)} className="p-1.5 text-zinc-400 hover:text-white transition"><Forward size={16} /></button>
                                        <button onClick={() => togglePinMessage(msg.id, msg.is_pinned)} className="p-1.5 text-zinc-400 hover:text-white transition">{msg.is_pinned ? <PinOff size={16}/> : <Pin size={16} />}</button>
                                        {isMyMessage && (<button onClick={() => deleteMessage(msg.id)} className="p-1.5 text-red-500 hover:text-red-400 transition ml-1"><Trash2 size={16} /></button>)}
                                    </div>
                                )}
                                <div className="relative max-w-[85%] sm:max-w-[70%] flex flex-col">
                                    {msg.reply_to_id ? ( <div className={`text-xs p-2 mb-1 w-fit rounded-t-xl rounded-br-none border-l-4 opacity-80 ${isMyMessage ? 'bg-blue-700/50 border-blue-300 text-blue-100 self-end' : 'bg-zinc-700/50 border-zinc-400 text-zinc-300 self-start'}`}><span className="font-bold block">{msg.reply_username}</span><span className="truncate block max-w-[200px]">{msg.reply_content || "Media"}</span></div> ) : null}

                                    {/* 🔥 GAME UI RENDERERS 🔥 */}
                                    {tttData ? (
                                        <div className={`w-48 bg-zinc-950 p-2 rounded-2xl border-2 shadow-xl ${isMyMessage ? 'border-blue-900 self-end' : 'border-zinc-800 self-start'}`}>
                                            <div className="text-center text-xs font-bold mb-3 text-white">
                                                {tttData.winner ? (tttData.winner === 'Draw' ? "🤝 It's a Draw!" : `🏆 ${tttData.winner} Wins!`) : (tttData.nextTurn === userId ? "🟢 Your Turn!" : "⏳ Opponent's Turn...")}
                                            </div>
                                            <div className="grid grid-cols-3 gap-1">
                                                {tttData.board.map((cell, i) => (
                                                    <button key={i} onClick={() => handleGameMove(msg.id, i, 'tictactoe')} disabled={cell !== null || tttData.winner !== null || tttData.nextTurn !== userId} className="w-14 h-14 bg-zinc-800 rounded-xl flex items-center justify-center text-2xl font-extrabold hover:bg-zinc-700 disabled:opacity-100 transition">
                                                        {cell === 'X' ? <span className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]">X</span> : cell === 'O' ? <span className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">O</span> : ''}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : rpsData ? (
                                        <div className={`w-52 bg-zinc-950 p-3 rounded-2xl border-2 shadow-xl ${isMyMessage ? 'border-purple-600 self-end' : 'border-orange-600 self-start'}`}>
                                            <div className="text-center text-xs font-extrabold mb-3 text-white tracking-widest uppercase opacity-80">Rock Paper Scissors</div>
                                            {rpsData.winner ? (
                                                <div className="text-center">
                                                    <div className="flex justify-center gap-4 text-3xl mb-2"><span className="drop-shadow-lg">{rpsData.p1Choice}</span><span className="text-sm text-zinc-500 mt-2 font-bold">VS</span><span className="drop-shadow-lg">{rpsData.p2Choice}</span></div>
                                                    <div className="text-white bg-white/10 rounded-full py-1 px-2 font-bold text-xs uppercase mt-2 border border-white/20">{rpsData.winner === 'Draw' ? "It's a Tie! 🤝" : (rpsData.winner === userId ? "You Won! 🏆" : "You Lost! 💀")}</div>
                                                </div>
                                            ) : (
                                                <div className="text-center">
                                                    {(() => {
                                                        const isP1 = rpsData.player1 === userId;
                                                        const myChoice = isP1 ? rpsData.p1Choice : rpsData.p2Choice;
                                                        if (myChoice) {
                                                            return <div className="text-blue-400 text-xs font-bold animate-pulse py-2">Waiting for opponent... ⏳</div>;
                                                        } else {
                                                            return (
                                                                <div className="flex justify-center gap-3">
                                                                    <button onClick={() => handleGameMove(msg.id, null, 'rps', '✊')} className="hover:scale-125 transition-transform text-3xl hover:-translate-y-2 drop-shadow-md">✊</button>
                                                                    <button onClick={() => handleGameMove(msg.id, null, 'rps', '✋')} className="hover:scale-125 transition-transform text-3xl hover:-translate-y-2 drop-shadow-md">✋</button>
                                                                    <button onClick={() => handleGameMove(msg.id, null, 'rps', '✌️')} className="hover:scale-125 transition-transform text-3xl hover:-translate-y-2 drop-shadow-md">✌️</button>
                                                                </div>
                                                            );
                                                        }
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className={`px-4 py-2 text-left w-fit whitespace-pre-wrap break-words relative shadow-sm ${isCallLog ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-full mx-auto my-2 text-sm px-4 py-2' : isMyMessage ? (msg.reply_to_id ? 'bg-blue-600 text-white rounded-tr-sm rounded-tl-2xl rounded-b-2xl self-end' : 'bg-blue-600 text-white rounded-2xl rounded-br-sm self-end') : (msg.reply_to_id ? 'bg-zinc-800 text-zinc-100 rounded-tl-sm rounded-tr-2xl rounded-b-2xl self-start' : 'bg-zinc-800 text-zinc-100 rounded-2xl rounded-bl-sm self-start')} ${msg.content ? 'px-4 py-2' : 'p-1'}`}>
                                            {msg.is_forwarded === 1 ? <div className="text-[10px] text-white/70 italic flex items-center gap-1 mb-1 px-2 pt-1"><Forward size={10}/> Forwarded</div> : null}
                                            {msg.media_url ? ( 
                                                <div className="mb-1 mt-1">
                                                    {msg.media_type === 'image' ? <img onClick={() => setViewingImage(`${BACKEND_URL}${msg.media_url}`)} src={`${BACKEND_URL}${msg.media_url}`} className="rounded-xl max-w-[250px] sm:max-w-[300px] w-full cursor-pointer hover:opacity-90 transition object-cover" /> 
                                                    : msg.media_type === 'video' ? <video src={`${BACKEND_URL}${msg.media_url}`} controls className="rounded-xl max-w-[250px] sm:max-w-[300px] w-full" /> 
                                                    : msg.media_type === 'audio' ? <audio src={`${BACKEND_URL}${msg.media_url}`} controls className="w-[200px] sm:w-[250px] h-10 outline-none" />
                                                    : <a href={`${BACKEND_URL}${msg.media_url}`} target="_blank" className="flex items-center gap-2 underline text-blue-200 px-3"><FileText size={16} /> Document</a>}
                                                </div> 
                                            ) : null}
                                            {msg.content ? <span className="leading-relaxed px-1 block">{msg.content}</span> : null}
                                            {msg.reaction ? <div className={`absolute -bottom-3 ${isMyMessage ? '-left-2' : '-right-2'} bg-zinc-800 border border-zinc-700 rounded-full px-1.5 py-0.5 text-sm shadow-md z-10`}>{msg.reaction}</div> : null}
                                        </div>
                                    )}
                                </div>
                                {!isCallLog && <span className={`text-[10px] text-zinc-600 mt-1 px-1 ${msg.reaction ? 'mt-3' : ''}`}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                        ); 
                    })}
                    <div ref={messagesEndRef} /> 
                </div>
                
                <div className="absolute bottom-0 w-full bg-zinc-950 border-t border-zinc-800 flex flex-col z-20">
                    {replyingTo ? ( <div className="flex items-center justify-between bg-zinc-900 border-l-4 border-blue-500 p-2 px-4 shadow-md"><div><p className="text-blue-500 text-xs font-bold">Replying to {replyingTo.username}</p><p className="text-zinc-400 text-sm truncate max-w-[250px]">{replyingTo.content || "Media attachment"}</p></div><button onClick={() => setReplyingTo(null)} className="text-zinc-500 hover:text-white p-1"><X size={18}/></button></div> ) : null}
                    {uploadingMedia && <p className="text-blue-500 text-xs mb-2 animate-pulse pl-4 pt-2">Uploading...</p>}
                    
                    <form onSubmit={sendMessage} className="flex gap-2 items-center w-full p-3 pt-2">
                        {isRecording ? (
                            <div className="flex-1 flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-full py-2.5 px-4 shadow-inner transition-all w-full animate-fade-in">
                                <div className="flex items-center gap-3"><div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div><span className="text-red-400 font-semibold text-sm w-10">{formatDuration(recordingDuration)}</span><div className="flex items-center gap-1 h-5 ml-2"><div className="w-1 bg-red-400 animate-wave rounded-full"></div><div className="w-1 bg-red-400 animate-wave delay-100 rounded-full"></div><div className="w-1 bg-red-400 animate-wave delay-200 rounded-full"></div><div className="w-1 bg-red-400 animate-wave delay-300 rounded-full"></div><div className="w-1 bg-red-400 animate-wave delay-400 rounded-full"></div></div></div>
                                <div className="flex items-center gap-4"><button type="button" onClick={cancelRecording} className="text-zinc-500 hover:text-red-400 transition"><Trash2 size={18}/></button><button type="button" onClick={stopAndSendRecording} className="bg-red-600 text-white p-2 rounded-full hover:bg-red-500 transition shadow-lg shadow-red-600/30"><Send size={16}/></button></div>
                            </div>
                        ) : (
                            <>
                                <div className="flex gap-3 sm:gap-4 px-1 text-zinc-500 relative">
                                    <input type="file" ref={imageInputRef} accept="image/*" onChange={handleMediaUpload} className="hidden" /><ImageIcon size={22} className="cursor-pointer hover:text-white transition" onClick={() => imageInputRef.current.click()} />
                                    <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" onChange={handleMediaUpload} className="hidden" /><Camera size={22} className="cursor-pointer hover:text-white transition hidden sm:block" onClick={() => cameraInputRef.current.click()} />
                                    <input type="file" ref={docInputRef} accept=".pdf,.doc,.docx,.txt" onChange={handleMediaUpload} className="hidden" /><Paperclip size={22} className="cursor-pointer hover:text-white transition" onClick={() => docInputRef.current.click()} />
                                    
                                    {/* 🔥 THE NEW GAMES MENU BUTTON 🔥 */}
                                    <div className="relative">
                                        <button type="button" onClick={() => setShowGameMenu(!showGameMenu)} className="hover:scale-110 transition cursor-pointer text-zinc-500 hover:text-blue-500"><Gamepad2 size={22} /></button>
                                        {showGameMenu && (
                                            <div className="absolute bottom-10 left-0 bg-zinc-900 border border-zinc-700 rounded-xl p-2 shadow-2xl flex flex-col gap-1 w-48 z-50 mb-2 animate-slide-up">
                                                <button onClick={() => startNewGame('tictactoe')} className="text-left px-3 py-2 hover:bg-zinc-800 rounded-lg text-white text-sm font-bold flex items-center gap-2">❌⭕ Tic-Tac-Toe</button>
                                                <button onClick={() => startNewGame('rps')} className="text-left px-3 py-2 hover:bg-zinc-800 rounded-lg text-white text-sm font-bold flex items-center gap-2">✊✋ Rock, Paper, Scissors</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <input type="text" value={currentMessage} onChange={(e) => setCurrentMessage(e.target.value)} placeholder="Type a message..." className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-3 px-5 text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition shadow-inner" />
                                {currentMessage.trim() === '' ? ( <button type="button" onClick={startRecording} className="bg-zinc-800 hover:bg-zinc-700 text-blue-500 p-3 rounded-full flex-shrink-0 transition shadow-lg"><Mic size={20} /></button> ) : ( <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-full flex-shrink-0 transition shadow-lg shadow-blue-600/20"><Send size={20} /></button> )}
                            </>
                        )}
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] sm:h-screen w-full bg-black">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-10"><h2 className="text-2xl font-bold text-white">Messages</h2></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24 sm:pb-20">
                {requests.length > 0 && (
                    <div><h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2"><BellRing size={16} className="text-pink-500" /> Message Requests ({requests.length})</h3><div className="space-y-2">{requests.map((req, index) => (<div key={index} onClick={() => handleSelectUser({ id: req.sender_id, username: req.username, profile_pic_url: req.profile_pic_url })} className="flex items-center gap-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer hover:bg-zinc-800 transition"><div className="w-12 h-12 rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center">{req.profile_pic_url ? <img src={`${BACKEND_URL}${req.profile_pic_url}`} className="w-full h-full object-cover" /> : <span className="text-zinc-500 font-bold text-xl">{req.username.charAt(0).toUpperCase()}</span>}</div><div><h4 className="font-bold text-white">{req.username}</h4><p className="text-sm text-zinc-400 truncate max-w-[200px]">{req.content}</p></div><div className="ml-auto w-3 h-3 bg-blue-500 rounded-full"></div></div>))}</div></div>
                )}
                <div>
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">Friends</h3>
                    {friends.length === 0 ? (<p className="text-zinc-500 p-4 border border-zinc-800 rounded-xl bg-zinc-900/50">You don't have any friends yet! Head over to the <span className="font-bold text-white">Friends tab</span> to connect with people.</p>) : (
                        <div className="space-y-2">{friends.map((friend) => (<div key={friend.id} onClick={() => handleSelectUser(friend)} className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-900 transition cursor-pointer"><div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center">{friend.profile_pic_url ? <img src={`${BACKEND_URL}${friend.profile_pic_url}`} className="w-full h-full object-cover" /> : <span className="text-xl text-zinc-500 font-bold">{friend.username.charAt(0).toUpperCase()}</span>}</div><div className="flex-1 min-w-0"><h4 className="font-bold text-white">{friend.username}</h4><p className={`text-sm truncate ${friend.unread_count > 0 ? 'text-white font-bold' : 'text-zinc-500'}`}>{friend.last_sender === userId ? 'You: ' : ''}{friend.last_message || 'Sent an attachment'}</p></div>{friend.unread_count > 0 && (<div className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto shadow-[0_0_10px_rgba(59,130,246,0.5)]">{friend.unread_count}</div>)}</div>))}</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Chat;