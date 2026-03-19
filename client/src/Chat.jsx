import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';
import { Send, ArrowLeft, User, BellRing, Phone, Video, PhoneOff, Mic, MicOff, Camera, CameraOff, Image as ImageIcon, Paperclip, FileText, Reply, Pin, Forward, X, PinOff, Trash2, Gamepad2, Search, UserX, Bell, BellOff, ChevronRight, Shield, Flag, Ban, Palette , BadgeCheck } from 'lucide-react';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';
// Use a singleton socket so Chat and App share the same connection
if (!window._superAppSocket) {
    try {
        window._superAppSocket = io(BACKEND_URL, {
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
const socket = window._superAppSocket;
const EMOJIS =['❤️', '😂', '😮', '😢', '🔥', '🙏'];

// Returns colored BadgeCheck based on verify_type
function VerifiedBadge({ isVerified, verifyType, size = 14 }) {
    if (!isVerified) return null;
    const titles = { red: 'Platform Owner', green: 'Verified Politician', yellow: 'Verified Celebrity', blue: 'Verified Account' };
    const t = verifyType || 'blue';
    const title = titles[t] || titles.blue;
    const colors = { red: 'text-red-500', green: 'text-green-500', yellow: 'text-yellow-400', blue: 'text-blue-400' };
    const style = t === 'red' ? { filter: 'drop-shadow(0 0 3px rgba(239,68,68,0.7))' } : {};
    return <BadgeCheck size={size} className={`flex-shrink-0 ${colors[t] || colors.blue}`} title={title} style={style}/>;
}

function Chat({ themeColor, onStartCall, onlineUsers: onlineUsersProp }) {
    const userId = parseInt(localStorage.getItem('userId'));
    const[currentUserInfo, setCurrentUserInfo] = useState(null);
    const [friends, setFriends] = useState([]);
    const[requests, setRequests] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [onlineUsersLocal, setOnlineUsersLocal] = useState(new Set());
    const onlineUsers = onlineUsersProp || onlineUsersLocal;
    const [friendStories, setFriendStories] = useState({}); // { userId: { hasStory, viewed } }
    const [viewingStory, setViewingStory] = useState(null);
    const[messages, setMessages] = useState([]);
    const [callLogs, setCallLogs] = useState([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const messagesEndRef = useRef(null);
    const [viewingImage, setViewingImage] = useState(null);

    const [replyingTo, setReplyingTo] = useState(null);
    const[forwardingMessage, setForwardingMessage] = useState(null);
    const [hoveredMessageId, setHoveredMessageId] = useState(null);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const[showGameMenu, setShowGameMenu] = useState(false);

    const imageInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const docInputRef = useRef(null);
    
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const shouldSendRef = React.useRef(false); // true = send, false = cancel
    const [mentionQuery, setMentionQuery] = useState(''); // text after @ for autocomplete
    const [mentionResults, setMentionResults] = useState([]);
    const[recordingDuration, setRecordingDuration] = useState(0);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [showChatSettings, setShowChatSettings] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [blockedUsers, setBlockedUsers] = useState(new Set());
    const [mutedUsers, setMutedUsers] = useState(new Set());
    const [typingUsers, setTypingUsers] = useState(new Set());
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);
    // Chat themes per conversation (stored in localStorage)
    const [convThemes, setConvThemes] = useState(() => { try { return JSON.parse(localStorage.getItem('convThemes') || '{}'); } catch(e) { return {}; } });
    const [showThemePicker, setShowThemePicker] = useState(false);
    // Waveform
    const [waveformBars, setWaveformBars] = useState(Array(30).fill(2));
    const [playingAudioId, setPlayingAudioId] = useState(null);
    const [audioProgress, setAudioProgress] = useState({});
    const analyserRef = useRef(null);
    const waveAnimRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioRefs = useRef({}); // stable map: msgId -> audio element
    // Chat folders
    const [chatFolders, setChatFolders] = useState([]);
    const [activeFolder, setActiveFolder] = useState('all'); // 'all' or folder name
    const [showFolderManager, setShowFolderManager] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [folderAssigning, setFolderAssigning] = useState(null); // userId being assigned
    // Screen recording detection
    const [screenRecordAlert, setScreenRecordAlert] = useState(false);
    const [filterRequests, setFilterRequests] = useState(true);

    const formatLastSeen = (friend) => {
        if (!friend) return '';
        if (onlineUsers.has(String(friend.id)) && friend.show_active_status) return '● Online';
        if (!friend.show_active_status) return '';
        if (!friend.last_seen) return '● Offline';
        const d = new Date(friend.last_seen);
        const diff = Math.floor((Date.now() - d) / 1000);
        if (diff < 60) return 'Last seen just now';
        if (diff < 3600) return `Last seen ${Math.floor(diff/60)}m ago`;
        if (diff < 86400) return `Last seen ${Math.floor(diff/3600)}h ago`;
        return `Last seen ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    };
    const loadInbox = async () => {
        setIsRefreshing(true);
        try {
            const [friendsRes, requestsRes] = await Promise.all([
                axios.get(`${BACKEND_URL}/api/friends/list/${userId}`),
                axios.get(`${BACKEND_URL}/api/friends/pending/${userId}`)
            ]);
            const uniqueFriends = Array.from(new Set(friendsRes.data.map(a => a.id))).map(id => friendsRes.data.find(a => a.id === id));
            // Sort by most recent message time (server already orders, but re-sort for safety)
            uniqueFriends.sort((a, b) => {
                if (!a.last_message_time && !b.last_message_time) return 0;
                if (!a.last_message_time) return 1;
                if (!b.last_message_time) return -1;
                return new Date(b.last_message_time) - new Date(a.last_message_time);
            });
            setFriends(uniqueFriends);
            setRequests(requestsRes.data);
        } catch (err) { console.error(err); } finally { setIsRefreshing(false); setInitialLoading(false); }
    };

    useEffect(() => {
        socket.emit('join_private_room', userId);
        axios.get(`${BACKEND_URL}/api/users/${userId}`).then(res => setCurrentUserInfo(res.data)).catch(err => console.error(err));
        loadInbox();
        // Load chat folders
        axios.get(`${BACKEND_URL}/api/users/${userId}/chat-folders`).then(res => { if (Array.isArray(res.data)) setChatFolders(res.data); }).catch(() => {});
        // Load message filter setting
        axios.get(`${BACKEND_URL}/api/users/${userId}/settings`).then(res => { if (res.data.filter_message_requests !== undefined) setFilterRequests(!!res.data.filter_message_requests); }).catch(() => {});
        // Fetch initial online users
        axios.get(`${BACKEND_URL}/api/online`).then(res => {
            setOnlineUsersLocal(new Set(res.data.map(u => String(u.userId))));
        }).catch(() => {});
        // Load stories for friends
        axios.get(`${BACKEND_URL}/api/stories?userId=${userId}`).then(res => {
            const map = {};
            if (Array.isArray(res.data)) res.data.forEach(s => { map[s.user_id] = { hasStory: true, viewed: !!s.user_has_viewed, story: s }; });
            setFriendStories(map);
        }).catch(() => {});
    }, []);

    const loadMessages = () => {
        if (selectedUser) { 
            axios.get(`${BACKEND_URL}/api/messages/${userId}/${selectedUser.id}`)
                 .then(res => setMessages(res.data)).catch(err => console.error(err));
            axios.get(`${BACKEND_URL}/api/call-logs/${userId}/${selectedUser.id}`)
                 .then(res => setCallLogs(Array.isArray(res.data) ? res.data : [])).catch(() => {});
        }
    };
    
    useEffect(() => { loadMessages(); }, [selectedUser?.id]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    useEffect(() => {
        const handleMessageUpdate = (data) => {
            loadMessages();
            loadInbox();
        };
        const handleOnlineStatus = ({ userId: uid, online }) => {
            setOnlineUsersLocal(prev => {
                const next = new Set(prev);
                online ? next.add(String(uid)) : next.delete(String(uid));
                return next;
            });
        };
        const handleMessagesSeen = ({ by, to }) => {
            if (selectedUser && (String(by) === String(selectedUser.id) || String(to) === String(selectedUser.id))) {
                loadMessages();
            }
        };
        const handleTypingStart = ({ userId: uid }) => {
            setTypingUsers(prev => new Set([...prev, String(uid)]));
        };
        const handleTypingStop = ({ userId: uid }) => {
            setTypingUsers(prev => { const n = new Set(prev); n.delete(String(uid)); return n; });
        };
        const handleScreenRecord = ({ by }) => {
            if (selectedUser && String(by) === String(selectedUser.id)) {
                setScreenRecordAlert(true);
                setTimeout(() => setScreenRecordAlert(false), 5000);
            }
        };
        socket.on('message_updated', handleMessageUpdate);
        socket.on('online_status', handleOnlineStatus);
        socket.on('messages_seen', handleMessagesSeen);
        socket.on('typing_start', handleTypingStart);
        socket.on('typing_stop', handleTypingStop);
        socket.on('screen_record_detected', handleScreenRecord);
        return () => {
            socket.off('message_updated', handleMessageUpdate);
            socket.off('online_status', handleOnlineStatus);
            socket.off('messages_seen', handleMessagesSeen);
            socket.off('typing_start', handleTypingStart);
            socket.off('typing_stop', handleTypingStop);
            socket.off('screen_record_detected', handleScreenRecord);
        };
    }, [selectedUser]);

    const handleSelectUser = async (friend) => {
        setSelectedUser(friend);
        try {
            await axios.put(`${BACKEND_URL}/api/messages/read`, { senderId: friend.id, receiverId: userId });
            setFriends(prev => prev.map(f => f.id === friend.id ? { ...f, unread_count: 0 } : f));
        } catch (e) { console.error(e); }
    };

    const deleteConversation = async () => {
        if (!selectedUser) return;
        if (!window.confirm(`Delete all messages with ${selectedUser.username}? This cannot be undone.`)) return;
        try {
            await axios.delete(`${BACKEND_URL}/api/messages/${userId}/${selectedUser.id}`);
            setMessages([]);
            setShowChatSettings(false);
        } catch(e) { alert('Failed to delete conversation.'); }
    };

    const toggleBlock = () => {
        const isBlocked = blockedUsers.has(selectedUser.id);
        if (!isBlocked && !window.confirm(`Block ${selectedUser.username}? They won't be able to message you.`)) return;
        setBlockedUsers(prev => { const n = new Set(prev); isBlocked ? n.delete(selectedUser.id) : n.add(selectedUser.id); return n; });
        setShowChatSettings(false);
    };

    const toggleMute = () => {
        setMutedUsers(prev => { const n = new Set(prev); mutedUsers.has(selectedUser.id) ? n.delete(selectedUser.id) : n.add(selectedUser.id); return n; });
        setShowChatSettings(false);
    };

    const filteredMessages = searchQuery.trim()
        ? messages.filter(m => m.content && m.content.toLowerCase().includes(searchQuery.toLowerCase()))
        : messages;

    // Merge messages + call logs into single sorted timeline
    const callLogItems = callLogs.map(cl => ({ ...cl, _isCallLog: true }));
    const timeline = [...filteredMessages, ...callLogItems]
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Chat folders helpers
    const saveFolders = async (newFolders) => {
        setChatFolders(newFolders);
        try { await axios.put(`${BACKEND_URL}/api/users/${userId}/chat-folders`, { folders: newFolders }); } catch(e) {}
    };
    const addFolder = async () => {
        if (!newFolderName.trim()) return;
        const newFolders = [...chatFolders, { name: newFolderName.trim(), userIds: [] }];
        await saveFolders(newFolders);
        setNewFolderName('');
    };
    const removeFolder = async (name) => {
        const newFolders = chatFolders.filter(f => f.name !== name);
        await saveFolders(newFolders);
        if (activeFolder === name) setActiveFolder('all');
    };
    const assignToFolder = async (folderName, targetUserId) => {
        const newFolders = chatFolders.map(f => {
            if (f.name === folderName) {
                const ids = f.userIds.includes(targetUserId) ? f.userIds.filter(id => id !== targetUserId) : [...f.userIds, targetUserId];
                return { ...f, userIds: ids };
            }
            return f;
        });
        await saveFolders(newFolders);
    };
    const getFolderForUser = (uid) => chatFolders.find(f => f.userIds.includes(uid))?.name || null;
    const friendsInActiveFolder = activeFolder === 'all' ? friends : friends.filter(f => {
        const folder = chatFolders.find(fo => fo.name === activeFolder);
        return folder?.userIds.includes(f.id);
    });

    // Screen recording detection - report to other user
    const reportScreenRecording = async () => {
        if (!selectedUser) return;
        try { await axios.post(`${BACKEND_URL}/api/chat/screen-record-alert`, { user1: userId, user2: selectedUser.id }); } catch(e) {}
    };

    // Toggle message request filtering  
    const toggleFilterRequests = async () => {
        const newVal = !filterRequests;
        setFilterRequests(newVal);
        try { await axios.put(`${BACKEND_URL}/api/users/${userId}/message-filter`, { enabled: newVal }); } catch(e) {}
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (currentMessage.trim() !== '' && selectedUser) {
            if (isTypingRef.current) {
                isTypingRef.current = false;
                socket.emit('typing_stop', { senderId: userId, receiverId: selectedUser.id });
            }
            socket.emit('send_private_message', { senderId: userId, receiverId: selectedUser.id, content: currentMessage, replyToId: replyingTo ? replyingTo.id : null });
            setCurrentMessage(''); setReplyingTo(null); setShowGameMenu(false);
        }
    };

    const handleInputChange = (val) => {
        setCurrentMessage(val);
        if (!selectedUser) return;
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            socket.emit('typing_start', { senderId: userId, receiverId: selectedUser.id });
        }
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
            socket.emit('typing_stop', { senderId: userId, receiverId: selectedUser.id });
        }, 2000);
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

    const startNewGame = (type) => {
        setShowGameMenu(false);
        if (!selectedUser) return;
        let gameData = {};
        if (type === 'tictactoe') { gameData = { board: Array(9).fill(null), nextTurn: selectedUser.id, playerX: userId, playerO: selectedUser.id, winner: null }; } 
        else if (type === 'rps') { gameData = { player1: userId, player2: selectedUser.id, p1Choice: null, p2Choice: null, winner: null }; }
        socket.emit('send_private_message', { senderId: userId, receiverId: selectedUser.id, content: JSON.stringify(gameData), media_type: type, replyToId: replyingTo ? replyingTo.id : null });
        setReplyingTo(null);
    };

    const handleGameMove = (msgId, index, gameType, choice = null) => { socket.emit('play_game_move', { messageId: msgId, index: index, userId: userId, gameType: gameType, choice: choice }); };

    // ===============================================
    // 🔥 IPHONE / ANDROID CAMERA BUG FIX 🔥
    // ===============================================

    const startRecording = async () => {
        setShowGameMenu(false);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Waveform analyser
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                audioContextRef.current = audioCtx;
                const source = audioCtx.createMediaStreamSource(stream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 64;
                source.connect(analyser);
                analyserRef.current = analyser;
                const animate = () => {
                    const data = new Uint8Array(analyser.frequencyBinCount);
                    analyser.getByteFrequencyData(data);
                    const bars = Array.from({length: 30}, (_, i) => {
                        const idx = Math.floor(i * data.length / 30);
                        return Math.max(2, Math.round((data[idx] / 255) * 36));
                    });
                    setWaveformBars(bars);
                    waveAnimRef.current = requestAnimationFrame(animate);
                };
                waveAnimRef.current = requestAnimationFrame(animate);
            } catch(e) {}
            // Pick best supported mime type
            const mimeType = ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4']
                .find(t => MediaRecorder.isTypeSupported(t)) || '';
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
            const chunks = [];
            recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
            recorder.onstop = async () => {
                // Stop all mic tracks regardless
                stream.getTracks().forEach(t => t.stop());
                if (!shouldSendRef.current) return; // was cancelled
                shouldSendRef.current = false;
                if (chunks.length === 0) { alert('No audio captured'); return; }
                const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
                const ext = (recorder.mimeType || '').includes('mp4') ? 'mp4' : 'webm';
                const fd = new FormData();
                fd.append('media', blob, `voice-${Date.now()}.${ext}`);
                try {
                    setUploadingMedia(true);
                    const res = await axios.post(`${BACKEND_URL}/api/messages/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                    if (!res.data?.media_url) throw new Error('No URL returned');
                    socket.emit('send_private_message', {
                        senderId: userId, receiverId: selectedUser.id,
                        content: '', media_url: res.data.media_url, media_type: 'audio',
                        replyToId: replyingTo?.id || null
                    });
                    setUploadingMedia(false);
                    setReplyingTo(null);
                } catch(err) {
                    setUploadingMedia(false);
                    alert('Upload failed: ' + (err.response?.data?.error || err.message));
                }
            };
            recorder.start(250); // chunk every 250ms
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            setRecordingDuration(0);
            timerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
        } catch(err) {
            alert('Microphone error: ' + err.message);
        }
    };
    const stopAndSendRecording = () => {
        if (!mediaRecorderRef.current || !isRecording) return;
        shouldSendRef.current = true;
        clearInterval(timerRef.current);
        if (waveAnimRef.current) cancelAnimationFrame(waveAnimRef.current);
        if (audioContextRef.current) { audioContextRef.current.close().catch(()=>{}); audioContextRef.current = null; }
        setWaveformBars(Array(30).fill(2));
        setIsRecording(false);
        mediaRecorderRef.current.stop();
    };
    const cancelRecording = () => {
        if (!mediaRecorderRef.current || !isRecording) return;
        shouldSendRef.current = false;
        clearInterval(timerRef.current);
        if (waveAnimRef.current) cancelAnimationFrame(waveAnimRef.current);
        if (audioContextRef.current) { audioContextRef.current.close().catch(()=>{}); audioContextRef.current = null; }
        setWaveformBars(Array(30).fill(2));
        setIsRecording(false);
        mediaRecorderRef.current.stop();
    };
    const formatDuration = (seconds) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s < 10 ? '0' : ''}${s}`; };

    const reactToMessage = (msgId, reaction) => { socket.emit('react_message', { messageId: msgId, reaction: reaction, senderId: userId, receiverId: selectedUser.id }); setHoveredMessageId(null); };
    const togglePinMessage = (msgId, currentPinState) => { socket.emit('pin_message', { messageId: msgId, isPinned: !currentPinState, senderId: userId, receiverId: selectedUser.id }); setHoveredMessageId(null); };
    const executeForward = (targetFriendId) => { socket.emit('send_private_message', { senderId: userId, receiverId: targetFriendId, content: forwardingMessage.content, media_url: forwardingMessage.media_url, media_type: forwardingMessage.media_type, isForwarded: true }); setForwardingMessage(null); alert("Message forwarded!"); };
    const deleteMessage = (msgId) => { if(window.confirm("Delete this message for everyone?")) { socket.emit('delete_message', { messageId: msgId, senderId: userId, receiverId: selectedUser.id }); setHoveredMessageId(null); } };

    // Use per-conversation theme color if set
    const activeColor = (selectedUser && convThemes[selectedUser.id]) ? convThemes[selectedUser.id] : themeColor;

    // Story viewer modal
    if (viewingStory) {
        return (
            <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center" onClick={() => setViewingStory(null)}>
                <button className="absolute top-4 right-4 text-white bg-zinc-800 rounded-full p-2 z-10"><X size={20}/></button>
                <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-700">
                        {viewingStory.profile_pic_url ? <img src={viewingStory.profile_pic_url} className="w-full h-full object-cover"/> : <span className="flex items-center justify-center h-full text-white font-bold text-sm">{viewingStory.username?.charAt(0).toUpperCase()}</span>}
                    </div>
                    <span className="text-white font-bold text-sm">{viewingStory.username}</span>
                </div>
                {viewingStory.media_type === 'video'
                    ? <video src={viewingStory.media_url} className="max-w-full max-h-[85vh] object-contain rounded-xl" autoPlay controls onClick={e=>e.stopPropagation()}/>
                    : <img src={viewingStory.media_url} className="max-w-full max-h-[85vh] object-contain rounded-xl" onClick={e=>e.stopPropagation()}/>}
                {viewingStory.caption && <p className="text-white text-sm mt-3 bg-black/50 px-4 py-2 rounded-full">{viewingStory.caption}</p>}
            </div>
        );
    }

    if (selectedUser) {
        const isCurrentlyFriend = friends.some(f => f.id === selectedUser.id);
        const pinnedMessage = messages.slice().reverse().find(m => m.is_pinned);

        return (
            <div className="flex flex-col w-full relative bg-zinc-950 h-[calc(100dvh-70px)] sm:h-screen">
                {viewingImage && ( <div className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center animate-fade-in" onClick={() => setViewingImage(null)}><button className="absolute top-4 right-4 text-white bg-zinc-800 rounded-full p-2 hover:bg-zinc-700 transition"><X size={24} /></button><img src={viewingImage} className="max-w-full max-h-full object-contain p-4" onClick={(e) => e.stopPropagation()} /></div> )}
                {forwardingMessage ? ( <div className="absolute inset-0 z-50 bg-black/90 flex flex-col p-4 animate-fade-in"><div className="flex justify-between items-center mb-6"><h3 className="text-white font-bold text-xl">Forward to...</h3><button onClick={() => setForwardingMessage(null)} className="text-white bg-zinc-800 rounded-full p-2"><X size={20}/></button></div><div className="space-y-2 overflow-y-auto">{friends.map(friend => (<div key={friend.id} onClick={() => executeForward(friend.id)} className="flex items-center gap-4 bg-zinc-900 p-3 rounded-xl cursor-pointer hover:bg-zinc-800 transition"><div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800">{friend.profile_pic_url ? <img src={`${friend.profile_pic_url}`} className="w-full h-full object-cover" /> : <User className="m-auto mt-2 text-zinc-500" />}</div><div className="flex items-center gap-1"><span className="text-white font-bold">{friend.username}</span>{<VerifiedBadge isVerified={!!friend.is_verified} verifyType={friend.verify_type} size={13}/>}</div><Send size={18} className="ml-auto text-blue-500" /></div>))}</div></div> ) : null}

                <div className="px-4 py-3 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-xl sticky top-0 z-10 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-zinc-800 rounded-full transition text-white"><ArrowLeft size={24} /></button>
                        <button onClick={() => setShowChatSettings(true)} className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer text-left">
                            {(() => { const fs = friendStories[selectedUser.id]; return (
    <div onClick={fs?.hasStory ? (e) => { e.preventDefault(); e.stopPropagation(); setViewingStory(fs.story); setFriendStories(prev => ({...prev, [selectedUser.id]: {...prev[selectedUser.id], viewed: true}})); axios.post(`${BACKEND_URL}/api/stories/${fs.story.id}/view`, { userId }).catch(()=>{}); } : undefined}
        className={"w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 " + (fs?.hasStory ? ("cursor-pointer p-0.5 " + (fs.viewed ? "bg-zinc-500" : "bg-gradient-to-tr from-sky-500 to-blue-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]")) : "bg-zinc-800 border border-zinc-700")}>
        <div className={"w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-zinc-800 " + (fs?.hasStory ? "border-2 border-black" : "")}>
            {selectedUser.profile_pic_url ? <img src={`${selectedUser.profile_pic_url}`} className="w-full h-full object-cover" /> : <span className="text-zinc-500 font-bold">{selectedUser.username.charAt(0).toUpperCase()}</span>}
        </div>
    </div>
); })()}
                            <div>
                                <div className="flex items-center gap-1"><h2 className="text-lg font-bold text-white leading-tight">{selectedUser.username}</h2>{<VerifiedBadge isVerified={!!selectedUser.is_verified} verifyType={selectedUser.verify_type} size={16}/>}</div>
                                <p className={"text-xs font-medium " + (typingUsers.has(String(selectedUser.id)) || (onlineUsers.has(String(selectedUser.id)) && selectedUser.show_active_status) ? "text-green-400" : "text-zinc-500")}>
                                    {typingUsers.has(String(selectedUser.id))
                                        ? <span className="animate-pulse">typing...</span>
                                        : formatLastSeen(selectedUser)
                                    }
                                </p>
                            </div>
                        </button>
                    </div>
                    {isCurrentlyFriend && onStartCall && (<div className="flex items-center gap-4 mr-2" style={{ color: activeColor }}><button onClick={() => onStartCall({ id: selectedUser.id, username: selectedUser.username }, false)} className="hover:bg-zinc-800 p-2 rounded-full transition"><Phone size={22} /></button><button onClick={() => onStartCall({ id: selectedUser.id, username: selectedUser.username }, true)} className="hover:bg-zinc-800 p-2 rounded-full transition"><Video size={24} /></button></div>)}
                </div>
                
                {/* Search bar in conversation */}
                {searchOpen && (
                    <div className="bg-zinc-900/80 border-b border-zinc-800/60 px-4 py-2.5 flex items-center gap-3 animate-fade-in backdrop-blur-sm">
                        <Search size={16} className="text-zinc-400 flex-shrink-0" />
                        <input
                            autoFocus
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search in conversation..."
                            className="flex-1 bg-transparent text-white outline-none text-sm placeholder-zinc-500"
                        />
                        <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="text-zinc-400 hover:text-white transition"><X size={16} /></button>
                    </div>
                )}

                {/* Chat Settings Panel */}
                {showChatSettings && (
                    <div className="absolute inset-0 z-50 flex flex-col animate-fade-in" style={{background:'rgba(0,0,0,0.6)'}}>
                        <div className="mt-auto bg-zinc-900 border-t border-zinc-800/60 rounded-t-3xl shadow-2xl shadow-black/80 overflow-y-auto max-h-[85vh] backdrop-blur-xl">
                            {/* Handle bar */}
                            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-zinc-700 rounded-full" /></div>

                            {/* User info header */}
                            <div className="flex flex-col items-center py-5 px-6 border-b border-zinc-800">
                                <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800 mb-3">
                                    {selectedUser.profile_pic_url
                                        ? <img src={selectedUser.profile_pic_url} className="w-full h-full object-cover" />
                                        : <span className="flex items-center justify-center w-full h-full text-2xl font-bold text-zinc-400">{selectedUser.username.charAt(0).toUpperCase()}</span>}
                                </div>
                                <div className="flex items-center gap-1 justify-center"><h3 className="text-white font-bold text-lg">{selectedUser.username}</h3>{<VerifiedBadge isVerified={!!selectedUser.is_verified} verifyType={selectedUser.verify_type} size={16}/>}</div>
                                <p className="text-zinc-500 text-sm">@{selectedUser.username.toLowerCase()}</p>
                            </div>

                            {/* Options list */}
                            <div className="divide-y divide-zinc-800/60">
                                {/* View Profile */}
                                <button onClick={() => { setShowChatSettings(false); window.location.href = `/profile/${selectedUser.id}`; }}
                                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-zinc-900 transition text-left">
                                    <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center"><User size={18} className="text-blue-400" /></div>
                                    <span className="text-white font-medium">View Profile</span>
                                    <ChevronRight size={18} className="text-zinc-600 ml-auto" />
                                </button>

                                {/* Search Conversation */}
                                <button onClick={() => { setShowChatSettings(false); setSearchOpen(true); }}
                                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-zinc-900 transition text-left">
                                    <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center"><Search size={18} className="text-purple-400" /></div>
                                    <span className="text-white font-medium">Search Conversation</span>
                                    <ChevronRight size={18} className="text-zinc-600 ml-auto" />
                                </button>

                                {/* Mute / Unmute */}
                                <button onClick={toggleMute}
                                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-zinc-900 transition text-left">
                                    <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                        {mutedUsers.has(selectedUser.id) ? <BellOff size={18} className="text-yellow-400" /> : <Bell size={18} className="text-yellow-400" />}
                                    </div>
                                    <span className="text-white font-medium">{mutedUsers.has(selectedUser.id) ? 'Unmute Notifications' : 'Mute Notifications'}</span>
                                    <ChevronRight size={18} className="text-zinc-600 ml-auto" />
                                </button>

                                {/* Delete Conversation */}
                                <button onClick={deleteConversation}
                                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-zinc-900 transition text-left">
                                    <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center"><Trash2 size={18} className="text-red-400" /></div>
                                    <span className="text-red-400 font-medium">Delete Conversation</span>
                                    <ChevronRight size={18} className="text-zinc-600 ml-auto" />
                                </button>

                                {/* Block / Unblock */}
                                <button onClick={toggleBlock}
                                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-zinc-900 transition text-left">
                                    <div className="w-9 h-9 rounded-full bg-orange-500/20 flex items-center justify-center"><Ban size={18} className="text-orange-400" /></div>
                                    <span className="text-orange-400 font-medium">{blockedUsers.has(selectedUser.id) ? `Unblock ${selectedUser.username}` : `Block ${selectedUser.username}`}</span>
                                    <ChevronRight size={18} className="text-zinc-600 ml-auto" />
                                </button>

                                {/* Report */}
                                <button onClick={() => { alert(`${selectedUser.username} has been reported.`); setShowChatSettings(false); }}
                                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-zinc-900 transition text-left">
                                    <div className="w-9 h-9 rounded-full bg-zinc-700/50 flex items-center justify-center"><Flag size={18} className="text-zinc-400" /></div>
                                    <span className="text-zinc-400 font-medium">Report</span>
                                    <ChevronRight size={18} className="text-zinc-600 ml-auto" />
                                </button>

                                {/* Screen Recording */}
                                <button onClick={() => { reportScreenRecording(); setShowChatSettings(false); alert('Screen recording reported. They have been notified.'); }}
                                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-zinc-900 transition text-left">
                                    <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center"><Shield size={18} className="text-red-400" /></div>
                                    <div className="flex-1"><span className="text-white font-medium block">Report Screen Recording</span><span className="text-zinc-500 text-xs">Notify them their recording was detected</span></div>
                                </button>

                                {/* Chat Theme */}
                                <div className="px-6 py-4">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="w-9 h-9 rounded-full bg-pink-500/20 flex items-center justify-center"><Palette size={18} className="text-pink-400" /></div>
                                        <span className="text-white font-medium">Chat Theme</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pl-[52px]">
                                        {['#3b82f6','#8b5cf6','#ec4899','#f97316','#10b981','#ef4444','#eab308','#06b6d4','#f43f5e','#64748b'].map(color => (
                                            <button key={color} type="button"
                                                onClick={() => {
                                                    const updated = {...convThemes, [selectedUser.id]: color};
                                                    setConvThemes(updated);
                                                    localStorage.setItem('convThemes', JSON.stringify(updated));
                                                    setShowChatSettings(false);
                                                }}
                                                className="w-8 h-8 rounded-full border-2 transition hover:scale-110"
                                                style={{background: color, borderColor: (convThemes[selectedUser.id] || themeColor) === color ? 'white' : 'transparent'}}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Close button */}
                            <div className="p-4">
                                <button onClick={() => setShowChatSettings(false)}
                                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {pinnedMessage ? (<div className="bg-zinc-900 border-b border-zinc-800 p-2 px-4 flex items-center gap-3 shadow-md z-10"><Pin size={16} style={{ color: activeColor }} className="flex-shrink-0" /><div className="flex-1 overflow-hidden"><p className="text-xs font-bold" style={{ color: activeColor }}>Pinned Message</p><p className="text-zinc-300 text-sm truncate">{pinnedMessage.content || "Media Attachment"}</p></div></div>) : null}
                {/* Screen recording alert */}
                {screenRecordAlert && (
                    <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-2 flex items-center gap-2 animate-fade-in">
                        <span className="text-red-400 text-sm font-bold">⚠️ {selectedUser.username} may be recording this screen</span>
                        <button onClick={() => setScreenRecordAlert(false)} className="ml-auto text-red-400/70 hover:text-red-400"><X size={14}/></button>
                    </div>
                )}
                
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 sm:space-y-6 pb-4" ref={null}>
                    {!isCurrentlyFriend && (<div className="bg-zinc-900 border border-zinc-700 p-3 rounded-xl text-center mb-4"><p className="text-sm text-zinc-300">You are not friends with this user.</p><p className="text-xs text-zinc-500">Go to the Friends tab to add them to call them.</p></div>)}
                    
                    {timeline.map((msg, idx) => {
                        // ── Call log entry ──
                        if (msg._isCallLog) {
                            const isCaller = String(msg.caller_id) === String(userId);
                            const isVideo = msg.call_type === 'video';
                            const statusColor = msg.status === 'missed' ? 'text-red-400' : msg.status === 'declined' ? 'text-zinc-400' : 'text-green-400';
                            const statusIcon = msg.status === 'missed' ? '📵' : msg.status === 'declined' ? '🚫' : isVideo ? '📹' : '📞';
                            const statusText = msg.status === 'missed' ? (isCaller ? 'No answer' : 'Missed call') : msg.status === 'declined' ? 'Declined' : isVideo ? 'Video call' : 'Voice call';
                            const formatDur = (s) => s >= 60 ? `${Math.floor(s/60)}m ${s%60}s` : `${s}s`;
                            return (
                                <div key={`call-${msg.id}`} className="flex justify-center">
                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold ${
                                        msg.status === 'missed' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                        msg.status === 'declined' ? 'bg-zinc-800 border-zinc-700 text-zinc-400' :
                                        'bg-green-500/10 border-green-500/20 text-green-400'
                                    }`}>
                                        <span>{statusIcon}</span>
                                        <span>{isCaller ? 'You called' : msg.caller_name + ' called'} · {statusText}</span>
                                        {msg.duration_seconds > 0 && <span className="text-zinc-500">· {formatDur(msg.duration_seconds)}</span>}
                                        <span className="text-zinc-600 font-normal">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            );
                        }
                        // ── Regular message ──
                        { const isMyMessage = msg.sender_id === userId; 
                        const isHovered = hoveredMessageId === msg.id;
                        const isCallLog = msg.content && (msg.content.startsWith('📞') || msg.content.startsWith('📹'));

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
                                    {msg.reply_to_id ? ( <div className={`text-xs p-2 mb-1 w-fit rounded-t-xl rounded-br-none border-l-4 opacity-80 ${isMyMessage ? 'bg-zinc-800 border-zinc-500 text-zinc-300 self-end' : 'bg-zinc-800 border-zinc-500 text-zinc-300 self-start'}`}><span className="font-bold block">{msg.reply_username}</span><span className="truncate block max-w-[200px]">{msg.reply_content || "Media"}</span></div> ) : null}
                                    
                                    {tttData ? (
                                        <div className={`w-48 bg-zinc-950 p-2 rounded-2xl border-2 shadow-xl ${isMyMessage ? 'self-end' : 'self-start'}`} style={{ borderColor: isMyMessage ? activeColor : '#27272a' }}>
                                            <div className="text-center text-xs font-bold mb-3 text-white">{tttData.winner ? (tttData.winner === 'Draw' ? "🤝 It's a Draw!" : `🏆 ${tttData.winner} Wins!`) : (tttData.nextTurn === userId ? "🟢 Your Turn!" : "⏳ Opponent's Turn...")}</div>
                                            <div className="grid grid-cols-3 gap-1">
                                                {tttData.board.map((cell, i) => (
                                                    <button key={i} onClick={() => handleGameMove(msg.id, i, 'tictactoe')} disabled={cell !== null || tttData.winner !== null || tttData.nextTurn !== userId} className="w-14 h-14 bg-zinc-800 rounded-xl flex items-center justify-center text-2xl font-extrabold hover:bg-zinc-700 disabled:opacity-100 transition">
                                                        {cell === 'X' ? <span style={{ color: activeColor }} className="drop-shadow-md">X</span> : cell === 'O' ? <span className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">O</span> : ''}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : rpsData ? (
                                        <div className={`w-52 bg-zinc-950 p-3 rounded-2xl border-2 shadow-xl ${isMyMessage ? 'border-purple-600 self-end' : 'border-orange-600 self-start'}`}>
                                            <div className="text-center text-xs font-extrabold mb-3 text-white tracking-widest uppercase opacity-80">Rock Paper Scissors</div>
                                            {rpsData.winner ? (
                                                <div className="text-center"><div className="flex justify-center gap-4 text-3xl mb-2"><span className="drop-shadow-lg">{rpsData.p1Choice}</span><span className="text-sm text-zinc-500 mt-2 font-bold">VS</span><span className="drop-shadow-lg">{rpsData.p2Choice}</span></div><div className="text-white bg-white/10 rounded-full py-1 px-2 font-bold text-xs uppercase mt-2 border border-white/20">{rpsData.winner === 'Draw' ? "It's a Tie! 🤝" : (rpsData.winner === userId ? "You Won! 🏆" : "You Lost! 💀")}</div></div>
                                            ) : (
                                                <div className="text-center">
                                                    {(() => {
                                                        const isP1 = rpsData.player1 === userId;
                                                        const myChoice = isP1 ? rpsData.p1Choice : rpsData.p2Choice;
                                                        if (myChoice) { return <div style={{ color: activeColor }} className="text-xs font-bold animate-pulse py-2">Waiting for opponent... ⏳</div>; } 
                                                        else { return ( <div className="flex justify-center gap-3"><button onClick={() => handleGameMove(msg.id, null, 'rps', '✊')} className="hover:scale-125 transition-transform text-3xl hover:-translate-y-2 drop-shadow-md">✊</button><button onClick={() => handleGameMove(msg.id, null, 'rps', '✋')} className="hover:scale-125 transition-transform text-3xl hover:-translate-y-2 drop-shadow-md">✋</button><button onClick={() => handleGameMove(msg.id, null, 'rps', '✌️')} className="hover:scale-125 transition-transform text-3xl hover:-translate-y-2 drop-shadow-md">✌️</button></div> ); }
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className={`px-4 py-2 text-left w-fit whitespace-pre-wrap break-words relative shadow-sm ${isCallLog ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-full mx-auto my-2 text-sm px-4 py-2' : isMyMessage ? (msg.reply_to_id ? 'text-white rounded-tr-sm rounded-tl-2xl rounded-b-2xl self-end' : 'text-white rounded-2xl rounded-br-sm self-end') : (msg.reply_to_id ? 'bg-zinc-800 text-zinc-100 rounded-tl-sm rounded-tr-2xl rounded-b-2xl self-start' : 'bg-zinc-800 text-zinc-100 rounded-2xl rounded-bl-sm self-start')} ${msg.content ? 'px-4 py-2' : 'p-1'}`} style={isMyMessage && !isCallLog ? { backgroundColor: activeColor } : {}}>
                                            {msg.is_forwarded === 1 ? <div className="text-[10px] text-white/70 italic flex items-center gap-1 mb-1 px-2 pt-1"><Forward size={10}/> Forwarded</div> : null}
                                            {msg.media_url ? ( 
                                                <div className="mb-1 mt-1">
                                                    {msg.media_type === 'image' ? <img onClick={() => setViewingImage(`${msg.media_url}`)} src={`${msg.media_url}`} className="rounded-xl max-w-[250px] sm:max-w-[300px] w-full cursor-pointer hover:opacity-90 transition object-cover" /> 
                                                    : msg.media_type === 'video' ? <video src={`${msg.media_url}`} controls className="rounded-xl max-w-[250px] sm:max-w-[300px] w-full" /> 
                                                    : msg.media_type === 'audio' ? (() => {
                                                        const msgId = msg.id;
                                                        const prog = audioProgress[msgId] || 0;
                                                        const isPlaying = playingAudioId === msgId;
                                                        const BARS = [4,7,5,9,6,8,5,7,4,9,7,5,8,6,9,5,7,4,8,6];
                                                        const togglePlay = () => {
                                                            // Stop any other playing audio first
                                                            if (playingAudioId && playingAudioId !== msgId) {
                                                                const prev = audioRefs.current[playingAudioId];
                                                                if (prev) { prev.pause(); prev.currentTime = 0; }
                                                            }
                                                            const audio = audioRefs.current[msgId];
                                                            if (!audio) return;
                                                            if (audio.paused) {
                                                                audio.play().then(() => setPlayingAudioId(msgId)).catch(e => console.warn('Audio play failed:', e));
                                                            } else {
                                                                audio.pause();
                                                                setPlayingAudioId(null);
                                                            }
                                                        };
                                                        return (
                                                        <div className="flex items-center gap-2 py-1 px-1 min-w-[180px] max-w-[240px]">
                                                            <button type="button" onClick={togglePlay}
                                                                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-white/20 hover:bg-white/30 transition">
                                                                <span className="text-sm">{isPlaying ? '⏸' : '▶'}</span>
                                                            </button>
                                                            <audio
                                                                ref={el => { if (el) audioRefs.current[msgId] = el; }}
                                                                src={`${msg.media_url}`}
                                                                preload="metadata"
                                                                onTimeUpdate={(e) => {
                                                                    const p = e.target.duration ? (e.target.currentTime / e.target.duration) : 0;
                                                                    setAudioProgress(prev => ({...prev, [msgId]: p}));
                                                                }}
                                                                onEnded={() => { setPlayingAudioId(null); setAudioProgress(prev => ({...prev, [msgId]: 0})); }}
                                                                onPause={() => { if (playingAudioId === msgId) setPlayingAudioId(null); }}
                                                                style={{display:'none'}}
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-end gap-[3px] h-8 cursor-pointer" onClick={togglePlay}>
                                                                    {BARS.map((h, i) => {
                                                                        const pct = i / BARS.length;
                                                                        const played = pct <= prog;
                                                                        return <div key={i} className="w-[4px] rounded-full transition-colors duration-75 flex-shrink-0"
                                                                            style={{height:`${h*3}px`, background: played ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.28)'}} />;
                                                                    })}
                                                                </div>
                                                                <p className="text-[10px] text-white/50 mt-0.5">Voice message</p>
                                                            </div>
                                                        </div>
                                                        );
                                                    })()
                                                    : <a href={`${msg.media_url}`} target="_blank" className="flex items-center gap-2 underline text-zinc-300 px-3"><FileText size={16} /> Document</a>}
                                                </div> 
                                            ) : null}
                                            {msg.content ? <span className="leading-relaxed px-1 block">{msg.content}</span> : null}
                                        </div>
                                    )}
                                    {msg.reaction ? <div className={`absolute -bottom-3 ${isMyMessage ? '-left-2' : '-right-2'} bg-zinc-800 border border-zinc-700 rounded-full px-1.5 py-0.5 text-sm shadow-md z-10`}>{msg.reaction}</div> : null}
                                    {isMyMessage && !isCallLog && (
                                        <div className="flex justify-end mt-0.5 pr-1 items-center gap-1">
                                            {msg.is_read ? (
                                                <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1">
                                                    ✓✓
                                                    {msg.read_at && <span className="text-zinc-500 font-normal">{new Date(msg.read_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-zinc-500">✓</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {!isCallLog && <span className={`text-[10px] text-zinc-600 mt-1 px-1 ${msg.reaction ? 'mt-3' : ''}`}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                        ); }
                    })}
                    <div ref={messagesEndRef} />
                </div>
                
                <div className="flex-shrink-0 w-full bg-zinc-950 border-t border-zinc-800 flex flex-col z-20">
                    {replyingTo ? ( <div className="flex items-center justify-between bg-zinc-900 border-l-4 p-2 px-4 shadow-md" style={{ borderColor: activeColor }}><div><p className="text-xs font-bold" style={{ color: activeColor }}>Replying to {replyingTo.username}</p><p className="text-zinc-400 text-sm truncate max-w-[250px]">{replyingTo.content || "Media attachment"}</p></div><button onClick={() => setReplyingTo(null)} className="text-zinc-500 hover:text-white p-1"><X size={18}/></button></div> ) : null}
                    {uploadingMedia && <p className="text-xs mb-2 animate-pulse pl-4 pt-2" style={{ color: activeColor }}>Uploading...</p>}
                    
                    {mentionResults.length > 0 && (
                        <div className="absolute bottom-full left-4 right-4 mb-1 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-slide-up">
                            {mentionResults.map(u => (
                                <button key={u.id} type="button" onClick={() => {
                                    setCurrentMessage(prev => prev.replace(/@\w*$/, `@${u.username} `));
                                    setMentionResults([]);
                                }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800 transition text-left">
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0 flex items-center justify-center">
                                        {u.profile_pic_url ? <img src={u.profile_pic_url} className="w-full h-full object-cover" /> : <span className="text-white text-xs font-bold">{u.username.charAt(0).toUpperCase()}</span>}
                                    </div>
                                    <span className="text-white text-sm font-medium">@{u.username}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <form onSubmit={sendMessage} className="flex gap-1.5 sm:gap-2 items-center w-full p-2 sm:p-3 pt-1.5 sm:pt-2">
                        {isRecording ? (
                            <div className="flex-1 flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-full py-2.5 px-4 shadow-inner transition-all w-full animate-fade-in">
                                <div className="flex items-center gap-3"><div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div><span className="text-red-400 font-semibold text-sm w-10">{formatDuration(recordingDuration)}</span><div className="flex items-end gap-[2px] h-8 ml-2">{waveformBars.map((h,i) => (<div key={i} className="w-[3px] bg-red-400 rounded-full transition-all duration-75" style={{height:`${h}px`}}></div>))}</div></div>
                                <div className="flex items-center gap-4"><button type="button" onClick={cancelRecording} className="text-zinc-500 hover:text-red-400 transition"><Trash2 size={18}/></button><button type="button" onClick={stopAndSendRecording} className="bg-red-600 text-white p-2 rounded-full hover:bg-red-500 transition shadow-lg shadow-red-600/30"><Send size={16}/></button></div>
                            </div>
                        ) : (
                            <>
                                <div className="flex gap-3 sm:gap-4 px-1 text-zinc-500 relative">
                                    <input type="file" ref={imageInputRef} accept="image/*" onChange={handleMediaUpload} className="hidden" /><ImageIcon size={22} className="cursor-pointer hover:text-white transition" onClick={() => imageInputRef.current.click()} />
                                    <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" onChange={handleMediaUpload} className="hidden" /><Camera size={22} className="cursor-pointer hover:text-white transition hidden sm:block" onClick={() => cameraInputRef.current.click()} />
                                    <input type="file" ref={docInputRef} accept=".pdf,.doc,.docx,.txt" onChange={handleMediaUpload} className="hidden" /><Paperclip size={22} className="cursor-pointer hover:text-white transition" onClick={() => docInputRef.current.click()} />
                                    <div className="relative">
                                        <button type="button" onClick={() => setShowGameMenu(!showGameMenu)} className="hover:scale-110 transition cursor-pointer text-zinc-500 hover:text-white"><Gamepad2 size={22} /></button>
                                        {showGameMenu && (
                                            <div className="absolute bottom-full left-0 mb-2 bg-zinc-900 border border-zinc-700 rounded-xl p-2 shadow-2xl flex flex-col gap-1 w-48 z-50 animate-slide-up">
                                                <button onClick={() => startNewGame('tictactoe')} className="text-left px-3 py-2 hover:bg-zinc-800 rounded-lg text-white text-sm font-bold flex items-center gap-2">❌⭕ Tic-Tac-Toe</button>
                                                <button onClick={() => startNewGame('rps')} className="text-left px-3 py-2 hover:bg-zinc-800 rounded-lg text-white text-sm font-bold flex items-center gap-2">✊✋ Rock, Paper, Scissors</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <input type="text" value={currentMessage} onChange={(e) => {
                                        const val = e.target.value;
                                        handleInputChange(val);
                                        const match = val.match(/@(\w*)$/);
                                        if (match) {
                                            const q = match[1];
                                            setMentionQuery(q);
                                            if (q.length > 0) {
                                                axios.get(`${BACKEND_URL}/api/search?q=${q}&userId=${userId}`).then(r => setMentionResults(r.data.slice(0,4))).catch(()=>{});
                                            } else { setMentionResults([]); }
                                        } else { setMentionQuery(''); setMentionResults([]); }
                                    }} placeholder="Type a message..." className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-3 px-5 text-white placeholder-zinc-500 outline-none transition shadow-inner" />
                                {currentMessage.trim() === '' ? ( <button type="button" onClick={startRecording} className="bg-zinc-800 hover:bg-zinc-700 text-white p-3 rounded-full flex-shrink-0 transition shadow-lg"><Mic size={20} /></button> ) : ( <button type="submit" className="text-white p-3 rounded-full flex-shrink-0 transition shadow-lg shadow-black/20" style={{ backgroundColor: activeColor }}><Send size={20} /></button> )}
                            </>
                        )}
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full bg-black h-[calc(100dvh-70px)] sm:h-screen">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-10 flex-shrink-0 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Messages</h2>
                <button onClick={() => setShowFolderManager(!showFolderManager)} className="p-1.5 px-3 rounded-full hover:bg-zinc-800 transition text-zinc-400 hover:text-white text-xs font-bold border border-zinc-700">📁 Folders</button>
            </div>

            {/* Folder Manager */}
            {showFolderManager && (
                <div className="bg-zinc-950 border-b border-zinc-800 p-4 flex-shrink-0 animate-fade-in">
                    <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-3">Chat Folders</p>
                    <div className="flex gap-2 flex-wrap mb-3">
                        {chatFolders.map(f => (
                            <div key={f.name} className="flex items-center gap-1 bg-zinc-800 rounded-full px-3 py-1 text-sm text-white">
                                <span>📁 {f.name}</span>
                                <span className="text-zinc-500 text-xs ml-1">({f.userIds.length})</span>
                                <button onClick={() => removeFolder(f.name)} className="text-zinc-500 hover:text-red-400 ml-1 transition"><X size={12}/></button>
                            </div>
                        ))}
                        {chatFolders.length === 0 && <p className="text-zinc-600 text-sm">No folders yet</p>}
                    </div>
                    <div className="flex gap-2">
                        <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addFolder()} placeholder="New folder name..." className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm outline-none placeholder-zinc-600 focus:border-zinc-500 transition"/>
                        <button onClick={addFolder} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition">Add</button>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
                        <div>
                            <p className="text-white text-sm font-medium">Filter message requests</p>
                            <p className="text-zinc-500 text-xs">Auto-hide requests from strangers</p>
                        </div>
                        <button onClick={toggleFilterRequests} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${filterRequests ? 'bg-blue-600' : 'bg-zinc-700'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${filterRequests ? 'translate-x-4' : 'translate-x-0'}`}/>
                        </button>
                    </div>
                </div>
            )}

            {/* Folder Tabs */}
            {chatFolders.length > 0 && (
                <div className="flex gap-2 px-4 py-2 overflow-x-auto flex-shrink-0 border-b border-zinc-800" style={{scrollbarWidth:'none'}}>
                    <button onClick={() => setActiveFolder('all')} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-bold transition ${activeFolder === 'all' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`} style={activeFolder === 'all' ? {backgroundColor: themeColor} : {}}>All</button>
                    {chatFolders.map(f => (
                        <button key={f.name} onClick={() => setActiveFolder(f.name)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-bold transition ${activeFolder === f.name ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`} style={activeFolder === f.name ? {backgroundColor: themeColor} : {}}>
                            📁 {f.name}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-4">
                {/* Message requests */}
                {requests.length > 0 && !filterRequests && (
                    <div><h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2"><BellRing size={16} className="text-pink-500" /> Message Requests ({requests.length})</h3><div className="space-y-2">{requests.map((req, index) => (<div key={index} onClick={() => handleSelectUser({ id: req.sender_id, username: req.username, profile_pic_url: req.profile_pic_url })} className="flex items-center gap-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer hover:bg-zinc-800 transition"><div className="w-12 h-12 rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center">{req.profile_pic_url ? <img src={`${req.profile_pic_url}`} className="w-full h-full object-cover" /> : <span className="text-zinc-500 font-bold text-xl">{req.username.charAt(0).toUpperCase()}</span>}</div><div><h4 className="font-bold text-white">{req.username}</h4><p className="text-sm text-zinc-400 truncate max-w-[200px]">{req.content}</p></div><div className="ml-auto w-3 h-3 bg-blue-500 rounded-full"></div></div>))}</div></div>
                )}
                {requests.length > 0 && filterRequests && (
                    <button onClick={() => { setFilterRequests(false); setShowFolderManager(true); }} className="w-full text-left p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-sm hover:bg-zinc-900 transition">
                        <span className="text-pink-400 font-bold">🔔 {requests.length} filtered request{requests.length > 1 ? 's' : ''}</span><span className="text-zinc-500"> — open Folders to review</span>
                    </button>
                )}
                <div>
                    {activeFolder !== 'all' && <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">📁 {activeFolder}</h3>}
                    {activeFolder === 'all' && <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">Friends</h3>}
                    {initialLoading ? (
                        <div className="space-y-1">
                            {[...Array(7)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                                    <div className="w-12 h-12 rounded-full bg-zinc-800 animate-pulse flex-shrink-0"/>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-zinc-800 rounded-full animate-pulse w-28"/>
                                        <div className="h-2.5 bg-zinc-800/60 rounded-full animate-pulse w-40"/>
                                    </div>
                                    <div className="h-2 w-8 bg-zinc-800/50 rounded-full animate-pulse"/>
                                </div>
                            ))}
                        </div>
                    ) : friendsInActiveFolder.length === 0 ? (
                        <p className="text-zinc-500 p-4 border border-zinc-800 rounded-xl bg-zinc-900/50">
                            {activeFolder === 'all' ? <span>No friends yet. Head to the <span className="font-bold text-white">Friends tab</span>.</span> : 'No chats in this folder. Right-click a chat to assign it.'}
                        </p>
                    ) : (
                        <div className="space-y-1">
                            {friendsInActiveFolder.map((friend) => (
                                <div key={friend.id} className="relative">
                                    <div onClick={() => handleSelectUser(friend)} onContextMenu={e => { e.preventDefault(); setFolderAssigning(folderAssigning === friend.id ? null : friend.id); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-900 transition cursor-pointer select-none">
                                        {(() => { const fs = friendStories[friend.id]; return (
                                            <div onClick={fs?.hasStory ? (e) => { e.stopPropagation(); setViewingStory(fs.story); setFriendStories(prev => ({...prev, [friend.id]: {...prev[friend.id], viewed: true}})); axios.post(`${BACKEND_URL}/api/stories/${fs.story.id}/view`, { userId }).catch(()=>{}); } : undefined}
                                                className={"w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center " + (fs?.hasStory ? ("p-0.5 cursor-pointer " + (fs.viewed ? "bg-zinc-500" : "bg-gradient-to-tr from-sky-500 to-blue-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]")) : "bg-zinc-800 border border-zinc-700")}>
                                                <div className={"w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-zinc-800 " + (fs?.hasStory ? "border-2 border-black" : "")}>
                                                    {friend.profile_pic_url ? <img src={`${friend.profile_pic_url}`} className="w-full h-full object-cover" /> : <span className="text-xl text-zinc-500 font-bold">{friend.username.charAt(0).toUpperCase()}</span>}
                                                </div>
                                            </div>
                                        ); })()}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <h4 className="font-bold text-white truncate">{friend.username}</h4>
                                                <VerifiedBadge isVerified={!!friend.is_verified} verifyType={friend.verify_type} size={13}/>
                                                {getFolderForUser(friend.id) && <span className="text-[10px] text-zinc-600">📁</span>}
                                            </div>
                                            <p className={`text-sm truncate ${friend.unread_count > 0 ? 'text-white font-semibold' : 'text-zinc-500'}`}>
                                                {friend.last_sender === userId ? '✓✓ ' : ''}{friend.last_message || 'Tap to chat'}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                            {friend.unread_count > 0 ? (
                                                <div className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{friend.unread_count}</div>
                                            ) : onlineUsers.has(String(friend.id)) && friend.show_active_status ? (
                                                <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]"></div>
                                            ) : null}
                                        </div>
                                    </div>
                                    {/* Folder assignment context menu */}
                                    {folderAssigning === friend.id && chatFolders.length > 0 && (
                                        <div className="absolute left-16 top-0 z-50 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-3 min-w-[180px] animate-fade-in">
                                            <p className="text-zinc-400 text-xs font-bold uppercase mb-2">Move to folder</p>
                                            {chatFolders.map(f => (
                                                <button key={f.name} onClick={() => { assignToFolder(f.name, friend.id); setFolderAssigning(null); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-800 transition ${f.userIds.includes(friend.id) ? 'text-blue-400 font-bold' : 'text-white'}`}>
                                                    {f.userIds.includes(friend.id) ? '✓ ' : ''}📁 {f.name}
                                                </button>
                                            ))}
                                            <button onClick={() => setFolderAssigning(null)} className="w-full text-left px-3 py-2 rounded-lg text-xs text-zinc-500 hover:bg-zinc-800 transition mt-1">Cancel</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Chat;