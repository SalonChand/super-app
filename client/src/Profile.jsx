import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { UserPlus, UserCheck, UserMinus, Clock, Edit3, Check, Camera, MessageCircle, Heart, Repeat2, Share, Lock, Image as ImageIcon, X, Music, Settings as SettingsIcon, MoreHorizontal, Edit2, Trash2, Link as LinkIcon, Film, Play, Globe, Users, EyeOff, Star, UserCheck2, ChevronDown, BadgeCheck, Ghost, Rss, DollarSign, Eye } from 'lucide-react';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';
function formatTimeFriendly(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString); const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today at ${timeStr}`; if (isYesterday) return `Yesterday at ${timeStr}`; return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
}


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

function Profile({ onlineUsers = new Set(), themeColor = '#3b82f6' }) {
    const { id } = useParams(); 
    const currentUserId = localStorage.getItem('userId');
    const isMyProfile = id === currentUserId;
    const navigate = useNavigate();

    const[profileData, setProfileData] = useState(null);
    const[userPosts, setUserPosts] = useState([]);
    const[userReels, setUserReels] = useState([]);
    const[activeTab, setActiveTab] = useState('posts');
    const[friendStatus, setFriendStatus] = useState('none');
    const[followStatus, setFollowStatus] = useState(false); // for verified profiles
    const[followerCount, setFollowerCount] = useState(0);
    const[errorMessage, setErrorMessage] = useState(''); 
    const[viewingImage, setViewingImage] = useState(null);
    
    // EDIT PROFILE STATES
    const[isEditing, setIsEditing] = useState(false);
    const[showAvatarMenu, setShowAvatarMenu] = useState(false);
    const[showCoverMenu, setShowCoverMenu] = useState(false);
    const[viewingAvatar, setViewingAvatar] = useState(false);
    const[viewingCover, setViewingCover] = useState(false);
    const[savingPhoto, setSavingPhoto] = useState(false);
    const[editBio, setEditBio] = useState('');
    const[editLinks, setEditLinks] = useState([]); // [{label, url}]
    const[editAvatar, setEditAvatar] = useState(null);
    const[editCover, setEditCover] = useState(null); 
    const[editAnthem, setEditAnthem] = useState(''); 
    
    // POST CREATION STATES
    const[newPost, setNewPost] = useState('');
    const[scheduledAt, setScheduledAt] = useState('');
    const[saveAsDraft, setSaveAsDraft] = useState(false);
    const isDraftRef = React.useRef(false);
    const[drafts, setDrafts] = useState([]);
    const[showDrafts, setShowDrafts] = useState(false);
    const[selectedImage, setSelectedImage] = useState(null); 
    const[previewUrl, setPreviewUrl] = useState(null);
    // Carousel: multiple images
    const[selectedImages, setSelectedImages] = useState([]); // array of File
    const[previewUrls, setPreviewUrls] = useState([]); // array of blob urls
    const[postVisibility, setPostVisibility] = useState('public');
    const[showVisibilityPicker, setShowVisibilityPicker] = useState(false);
    const[taggedFriends, setTaggedFriends] = useState([]);
    const[showTagPicker, setShowTagPicker] = useState(false);
    const[collabInviteId, setCollabInviteId] = useState(null);
    const[showCollabPicker, setShowCollabPicker] = useState(false);
    const[collabInvites, setCollabInvites] = useState([]);
    const[friendsList, setFriendsList] = useState([]);
    // QR code modal
    const[showQR, setShowQR] = useState(false);
    // Post analytics
    const[postAnalytics, setPostAnalytics] = useState({});
    const[showAnalyticsPostId, setShowAnalyticsPostId] = useState(null);
    // Profile-level analytics (for own profile)

    // 🔥 POST EDITING STATES 🔥
    const [menuOpenPostId, setMenuOpenPostId] = useState(null);
    const [editingPostId, setEditingPostId] = useState(null);
    const [editContent, setEditContent] = useState('');

    const fileInputRef = useRef(null);
    const avatarInputRef = useRef(null);
    const coverInputRef = useRef(null);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [mutualFriends, setMutualFriends] = useState([]);
    const [showPeopleModal, setShowPeopleModal] = useState(null); // 'friends' | 'followers'
    const [peopleList, setPeopleList] = useState([]);
    const [peopleLoading, setPeopleLoading] = useState(false);
    const [peopleSearch, setPeopleSearch] = useState('');
    const [peopleMenuOpen, setPeopleMenuOpen] = useState(null); // user id
    const [peopleMenuPos, setPeopleMenuPos] = useState({ top: 0, right: 0 });
    const [peopleFollowMap, setPeopleFollowMap] = useState({});
    const loadProfileData = async () => {
        if (!id || id === 'undefined') { setErrorMessage('Invalid User ID'); return; }
        setIsRefreshing(true);
        setErrorMessage('');

        // ── Core: user profile (must succeed) ──
        try {
            const userRes = await axios.get(`${BACKEND_URL}/api/users/${id}`);
            if (!userRes.data || userRes.data.error) { setErrorMessage('User not found.'); setIsRefreshing(false); return; }
            setProfileData(userRes.data);
            setEditBio(userRes.data.bio || '');
            setEditAnthem(userRes.data.anthem_url || '');
            try { setEditLinks(JSON.parse(userRes.data.profile_links || '[]')); } catch(e) { setEditLinks([]); }
        } catch(err) {
            console.error('User fetch failed:', err);
            setErrorMessage('Could not load profile. Please try again.');
            setIsRefreshing(false);
            return;
        }

        // ── Secondary: all other data fetched independently ──
        axios.get(`${BACKEND_URL}/api/users/${id}/posts?currentUserId=${currentUserId || 0}`)
            .then(r => { if (Array.isArray(r.data)) setUserPosts(r.data); })
            .catch(() => {});

        if (!isMyProfile && currentUserId) {
            axios.get(`${BACKEND_URL}/api/friends/status/${currentUserId}/${id}`)
                .then(r => { if (r.data?.status) setFriendStatus(r.data.status); })
                .catch(() => {});
            // Load follow data if target is verified
            axios.get(`${BACKEND_URL}/api/users/${id}`)
                .then(r => {
                    if (r.data?.is_verified) {
                        axios.get(`${BACKEND_URL}/api/follow/status?followerId=${currentUserId}&followingId=${id}`)
                            .then(fr => { setFollowStatus(!!fr.data?.following); setFollowerCount(fr.data?.follower_count || 0); })
                            .catch(() => {});
                    }
                }).catch(() => {});
            axios.get(`${BACKEND_URL}/api/friends/mutual/${currentUserId}/${id}`)
                .then(r => { if (Array.isArray(r.data)) setMutualFriends(r.data); })
                .catch(() => {});
            axios.post(`${BACKEND_URL}/api/users/${id}/visit`, { visitorId: currentUserId }).catch(() => {});
        }

        axios.get(`${BACKEND_URL}/api/reels/user/${id}?currentUserId=${currentUserId || 0}`)
            .then(r => { if (Array.isArray(r.data)) setUserReels(r.data); })
            .catch(() => {});

        if (isMyProfile && currentUserId) {
            axios.get(`${BACKEND_URL}/api/friends/list/${currentUserId}`)
                .then(r => { if (Array.isArray(r.data)) setFriendsList(r.data); })
                .catch(() => {});
            axios.get(`${BACKEND_URL}/api/posts/collab-invites/${currentUserId}`)
                .then(r => { if (Array.isArray(r.data)) setCollabInvites(r.data); })
                .catch(() => {});
        }

        setIsRefreshing(false);
    };

    useEffect(() => { loadProfileData(); }, [id]);

    const openPeopleModal = async (type) => {
        setShowPeopleModal(type);
        setPeopleLoading(true);
        setPeopleSearch('');
        setPeopleMenuOpen(null);
        try {
            let data = [];
            if (type === 'friends') {
                const res = await axios.get(`${BACKEND_URL}/api/friends/list/${id}`);
                data = Array.isArray(res.data) ? res.data : [];
            } else {
                const res = await axios.get(`${BACKEND_URL}/api/followers/${id}`);
                data = Array.isArray(res.data) ? res.data : [];
            }
            setPeopleList(data);
            // Load follow status for each verified user
            const map = {};
            await Promise.all(data.filter(u => u.is_verified).map(async u => {
                try {
                    const r = await axios.get(`${BACKEND_URL}/api/follow/status?followerId=${currentUserId}&followingId=${u.id}`);
                    map[u.id] = r.data?.following;
                } catch {}
            }));
            setPeopleFollowMap(map);
        } catch {}
        setPeopleLoading(false);
    };

    const handleUnfriendFromModal = async (userId) => {
        if (!window.confirm('Unfriend this person?')) return;
        try {
            await axios.post(`${BACKEND_URL}/api/friends/remove`, { user1: currentUserId, user2: userId });
            setPeopleList(p => p.filter(u => u.id !== userId));
            loadProfileData();
        } catch {}
    };

    const handleUnfollowFromModal = async (userId) => {
        try {
            await axios.post(`${BACKEND_URL}/api/unfollow`, { followerId: currentUserId, followingId: userId });
            setPeopleList(p => p.filter(u => u.id !== userId));
            setFollowerCount(c => Math.max(0, c - 1));
        } catch {}
    };

    const sendFriendRequest = () => axios.post(`${BACKEND_URL}/api/friends/request`, { requester_id: currentUserId, receiver_id: id }).then(() => setFriendStatus('sent_request'));
    const followUser = () => axios.post(`${BACKEND_URL}/api/follow`, { followerId: currentUserId, followingId: id }).then(() => { setFollowStatus(true); setFollowerCount(c => c+1); });
    const unfollowUser = () => axios.post(`${BACKEND_URL}/api/unfollow`, { followerId: currentUserId, followingId: id }).then(() => { setFollowStatus(false); setFollowerCount(c => Math.max(0,c-1)); });
    const acceptFriendRequest = () => axios.put(`${BACKEND_URL}/api/friends/accept`, { requester_id: id, receiver_id: currentUserId }).then(() => setFriendStatus('friends'));
    const handleAvatarChange = async (file) => {
        if (!file) return;
        setEditAvatar(file);
        setSavingPhoto(true);
        try {
            const formData = new FormData();
            formData.append('user_id', currentUserId);
            formData.append('profile_pic', file);
            await axios.put(`${BACKEND_URL}/api/users/${currentUserId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        } catch(e) { console.error(e); }
        setSavingPhoto(false);
        setShowAvatarMenu(false);
    };

    const handleCoverChange = async (file) => {
        if (!file) return;
        setEditCover(file);
        setSavingPhoto(true);
        try {
            const formData = new FormData();
            formData.append('user_id', currentUserId);
            formData.append('cover_pic', file);
            await axios.put(`${BACKEND_URL}/api/users/${currentUserId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        } catch(e) { console.error(e); }
        setSavingPhoto(false);
        setShowCoverMenu(false);
    };

    const unfriendUser = () => { if(window.confirm(`Are you sure you want to unfriend ${profileData.username}?`)) { axios.post(`${BACKEND_URL}/api/friends/remove`, { user1: currentUserId, user2: id }).then(() => { setFriendStatus('none'); loadProfileData(); }).catch(console.error); } };

    const handleSaveProfile = async () => {
        const formData = new FormData(); 
        formData.append('userId', currentUserId); formData.append('bio', editBio); formData.append('anthem_url', editAnthem); formData.append('profile_links', JSON.stringify(editLinks.filter(l => l.url.trim())));
        if (editAvatar) formData.append('profile_pic', editAvatar);
        if (editCover) formData.append('cover_pic', editCover); 
        try { 
            await axios.put(`${BACKEND_URL}/api/users/edit`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); 
            setIsEditing(false); setEditAvatar(null); setEditCover(null); window.location.reload();
        } catch (error) { console.error(error); }
    };

    const renderAnthem = (url) => {
        if (!url) return null;
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const videoId = url.split('v=')[1] || url.split('youtu.be/')[1];
            const cleanId = videoId.indexOf('&') !== -1 ? videoId.substring(0, videoId.indexOf('&')) : videoId;
            return <iframe className="w-full h-20 rounded-xl my-3 opacity-80 hover:opacity-100 transition" src={`https://www.youtube.com/embed/${cleanId}?controls=1`} frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen></iframe>;
        }
        return <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-pink-500 hover:underline my-2 bg-zinc-900 w-fit p-2 rounded-full px-4"><Music size={16} /> Play Profile Anthem</a>;
    };

    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        if (files.length === 1) {
            setSelectedImage(files[0]);
            setPreviewUrl(URL.createObjectURL(files[0]));
            setSelectedImages([]);
            setPreviewUrls([]);
        } else {
            setSelectedImages(files);
            setPreviewUrls(files.map(f => URL.createObjectURL(f)));
            setSelectedImage(null);
            setPreviewUrl(null);
        }
    };
    const removeImage = () => { setSelectedImage(null); setPreviewUrl(null); setSelectedImages([]); setPreviewUrls([]); if (fileInputRef.current) fileInputRef.current.value = ''; };
    const removeCarouselImage = (i) => {
        const newFiles = selectedImages.filter((_, idx) => idx !== i);
        const newUrls = previewUrls.filter((_, idx) => idx !== i);
        if (newFiles.length === 0) { removeImage(); return; }
        if (newFiles.length === 1) { setSelectedImage(newFiles[0]); setPreviewUrl(newUrls[0]); setSelectedImages([]); setPreviewUrls([]); }
        else { setSelectedImages(newFiles); setPreviewUrls(newUrls); }
    };
    const loadDrafts = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/api/posts/drafts/${currentUserId}`);
            setDrafts(res.data);
        } catch(e) {}
    };

    const handlePost = async (e) => {
        e.preventDefault(); if (!newPost.trim() && !selectedImage && selectedImages.length === 0) return;
        try {
            const formData = new FormData();
            formData.append('user_id', currentUserId);
            formData.append('content', newPost);
            formData.append('visibility', postVisibility);
            if (taggedFriends.length > 0) formData.append('tagged_users', JSON.stringify(taggedFriends.map(f => f.id)));
            if (scheduledAt) formData.append('scheduled_at', new Date(scheduledAt).toISOString());
            if (isDraftRef.current || saveAsDraft) formData.append('is_draft', 'true');
            // Carousel support
            if (selectedImages.length > 1) {
                selectedImages.forEach(img => formData.append('images', img));
            } else if (selectedImage) {
                formData.append('images', selectedImage);
            }
            const res = await axios.post(`${BACKEND_URL}/api/posts`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            // Send collab invite if selected
            if (collabInviteId && res.data?.postId) {
                await axios.post(`${BACKEND_URL}/api/posts/${res.data.postId}/collab-invite`, { coAuthorId: collabInviteId }).catch(()=>{});
            }
            setSaveAsDraft(false); isDraftRef.current = false; setScheduledAt(''); loadDrafts();
            setNewPost(''); removeImage(); setTaggedFriends([]); setCollabInviteId(null); setPostVisibility('public'); loadProfileData(); 
        } catch (error) { console.error(error); }
    };

    // 🔥 NEW: POST ACTIONS (EDIT & DELETE) 🔥
    const deletePost = async (postId) => {
        if (window.confirm("Are you sure you want to delete this post?")) {
            try {
                await axios.delete(`${BACKEND_URL}/api/posts/${postId}`);
                setUserPosts(userPosts.filter(p => p.id !== postId));
            } catch (e) { console.error(e); }
        }
    };

    const saveEdit = async (postId) => {
        try {
            await axios.put(`${BACKEND_URL}/api/posts/${postId}`, { content: editContent });
            setUserPosts(userPosts.map(p => p.id === postId ? { ...p, content: editContent } : p));
            setEditingPostId(null);
        } catch (e) { console.error(e); }
    };

    const copyPostLink = (postId) => {
        navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
        alert("Link copied!");
        setMenuOpenPostId(null);
    };

    if (errorMessage) return <div className="text-center p-10 mt-20 border border-red-500/50 bg-red-500/10 rounded-2xl m-4"><h3 className="text-red-500 font-bold text-xl mb-2">Oops! Something broke.</h3><p className="text-zinc-400">{errorMessage}</p><button onClick={() => { setErrorMessage(''); loadProfileData(); }} className="mt-4 px-6 py-2 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 transition text-sm">Try Again</button></div>;
    if (!profileData) return (
        <div className="w-full min-h-screen bg-black animate-fade-in">
            {/* Cover */}
            <div className="h-44 bg-zinc-800 animate-pulse"/>
            <div className="px-4 pb-4 relative">
                {/* Avatar */}
                <div className="w-24 h-24 rounded-full bg-zinc-700 animate-pulse border-4 border-black -mt-12 mb-3"/>
                {/* Name + handle */}
                <div className="space-y-2 mb-4">
                    <div className="h-5 w-40 bg-zinc-800 rounded-full animate-pulse"/>
                    <div className="h-3 w-28 bg-zinc-800/60 rounded-full animate-pulse"/>
                </div>
                {/* Bio lines */}
                <div className="space-y-2 mb-4">
                    <div className="h-3 w-full bg-zinc-800 rounded-full animate-pulse"/>
                    <div className="h-3 w-3/4 bg-zinc-800/70 rounded-full animate-pulse"/>
                </div>
                {/* Stats */}
                <div className="flex gap-6 mb-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                            <div className="h-4 w-8 bg-zinc-800 rounded-full animate-pulse"/>
                            <div className="h-2.5 w-16 bg-zinc-800/60 rounded-full animate-pulse"/>
                        </div>
                    ))}
                </div>
                {/* Buttons */}
                <div className="flex gap-2 mb-6">
                    <div className="h-9 flex-1 bg-zinc-800 rounded-xl animate-pulse"/>
                    <div className="h-9 flex-1 bg-zinc-800 rounded-xl animate-pulse"/>
                    <div className="h-9 w-9 bg-zinc-800 rounded-xl animate-pulse"/>
                </div>
                {/* Tab bar */}
                <div className="flex gap-2 mb-4">
                    <div className="h-8 w-20 bg-zinc-800 rounded-full animate-pulse"/>
                    <div className="h-8 w-20 bg-zinc-800/60 rounded-full animate-pulse"/>
                </div>
                {/* Posts grid */}
                <div className="grid grid-cols-3 gap-1">
                    {[...Array(9)].map((_, i) => (
                        <div key={i} className="aspect-square bg-zinc-800 rounded-sm animate-pulse"/>
                    ))}
                </div>
            </div>
        </div>
    );

    const avatarUrl = profileData.profile_pic_url ? `${profileData.profile_pic_url}` : null;
    const coverUrl = profileData.cover_pic_url ? `${profileData.cover_pic_url}` : null;
    const tempAvatarUrl = editAvatar ? URL.createObjectURL(editAvatar) : avatarUrl;
    const tempCoverUrl = editCover ? URL.createObjectURL(editCover) : coverUrl;
    
    const isVerifiedProfile = !!profileData.is_verified;
    const canSeeDetails = isMyProfile || isVerifiedProfile || !profileData.is_private || friendStatus === 'friends';
    const displayedPosts = canSeeDetails ? userPosts : userPosts.slice(0, 1);

    return (
        <>
        <div className="w-full pb-20 sm:pb-0 animate-fade-in relative bg-zinc-950">
            {/* Friends / Followers Modal */}
            {showPeopleModal && (
                <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setShowPeopleModal(null)}>
                    <div className="bg-zinc-900 border border-zinc-800/60 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-800 flex-shrink-0">
                            <h2 className="text-white font-bold text-lg">{showPeopleModal === 'friends' ? 'Friends' : 'Followers'}</h2>
                            <button onClick={() => setShowPeopleModal(null)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                        </div>
                        {/* Search */}
                        <div className="px-4 py-3 border-b border-zinc-800 flex-shrink-0">
                            <input
                                value={peopleSearch}
                                onChange={e => setPeopleSearch(e.target.value)}
                                placeholder="Search..."
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm placeholder-zinc-600 outline-none focus:border-zinc-600"
                            />
                        </div>
                        {/* List */}
                        <div className="overflow-y-auto flex-1 p-3 space-y-1" onClick={() => setPeopleMenuOpen(null)}>
                            {peopleLoading && [1,2,3,4].map(i => (
                                <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                                    <div className="w-11 h-11 rounded-full bg-zinc-800 flex-shrink-0"/>
                                    <div className="flex-1 space-y-2"><div className="h-3 bg-zinc-800 rounded w-1/2"/><div className="h-2 bg-zinc-800 rounded w-1/3"/></div>
                                </div>
                            ))}
                            {!peopleLoading && peopleList.filter(u => u.username?.toLowerCase().includes(peopleSearch.toLowerCase())).length === 0 && (
                                <p className="text-zinc-500 text-center py-8 text-sm">No {showPeopleModal} found.</p>
                            )}
                            {!peopleLoading && peopleList.filter(u => u.username?.toLowerCase().includes(peopleSearch.toLowerCase())).map(user => (
                                <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-900 transition relative">
                                    <a href={`/profile/${user.id}`} className="w-11 h-11 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                        {user.profile_pic_url ? <img src={user.profile_pic_url} className="w-full h-full object-cover"/> : <span className="text-white font-bold">{user.username?.charAt(0).toUpperCase()}</span>}
                                    </a>
                                    <a href={`/profile/${user.id}`} className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                            <p className="font-bold text-white text-sm truncate">{user.username}</p>
                                            <VerifiedBadge isVerified={!!user.is_verified} verifyType={user.verify_type} size={13}/>
                                        </div>
                                        <p className="text-zinc-500 text-xs font-medium tracking-wide">@{user.username?.toLowerCase()}</p>
                                    </a>
                                    {/* 3 dot menu */}
                                    <div className="relative flex-shrink-0">
                                        <button onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setPeopleMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right }); setPeopleMenuOpen(peopleMenuOpen === user.id ? null : user.id); }} className="text-zinc-500 hover:text-white p-1.5 rounded-full hover:bg-zinc-800 transition">
                                            <MoreHorizontal size={18}/>
                                        </button>
                                        {peopleMenuOpen === user.id && (
                                            <div className="fixed w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-[999] overflow-hidden animate-fade-in" style={{top: peopleMenuPos.top, right: peopleMenuPos.right}}>
                                                <a href={`/profile/${user.id}`} className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-zinc-800 text-white text-sm"><UserCheck size={14}/> View Profile</a>
                                                {showPeopleModal === 'friends' && String(user.id) !== String(currentUserId) && (
                                                    <button onClick={() => { handleUnfriendFromModal(user.id); setPeopleMenuOpen(null); }} className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-zinc-800 text-red-400 text-sm border-t border-zinc-800"><UserMinus size={14}/> Unfriend</button>
                                                )}
                                                {showPeopleModal === 'followers' && String(user.id) !== String(currentUserId) && (
                                                    <button onClick={() => { handleUnfollowFromModal(user.id); setPeopleMenuOpen(null); }} className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-zinc-800 text-red-400 text-sm border-t border-zinc-800"><UserMinus size={14}/> Remove Follower</button>
                                                )}
                                                {!!user.is_verified && !peopleFollowMap[user.id] && (
                                                    <button onClick={async () => { await axios.post(`${BACKEND_URL}/api/follow`, { followerId: currentUserId, followingId: user.id }); setPeopleFollowMap(m => ({...m, [user.id]: true})); setPeopleMenuOpen(null); }} className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-zinc-800 text-blue-400 text-sm border-t border-zinc-800"><Rss size={14}/> Follow</button>
                                                )}
                                                {!!user.is_verified && peopleFollowMap[user.id] && (
                                                    <button onClick={async () => { await axios.post(`${BACKEND_URL}/api/unfollow`, { followerId: currentUserId, followingId: user.id }); setPeopleFollowMap(m => ({...m, [user.id]: false})); setPeopleMenuOpen(null); }} className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-zinc-800 text-zinc-400 text-sm border-t border-zinc-800"><Rss size={14}/> Unfollow</button>
                                                )}
                                                {String(user.id) !== String(currentUserId) && (
                                                    <button onClick={() => { window.location.href=`/chat?userId=${user.id}`; }} className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-zinc-800 text-zinc-300 text-sm border-t border-zinc-800"><MessageCircle size={14}/> Message</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="h-4 flex-shrink-0"/>
                    </div>
                </div>
            )}

            {viewingImage && (
                <div className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center animate-fade-in" onClick={() => setViewingImage(null)}>
                    <button className="absolute top-4 right-4 text-white bg-zinc-800 rounded-full p-2 hover:bg-zinc-700 transition"><X size={24} /></button>
                    <img src={viewingImage} className="max-w-full max-h-full object-contain p-4" onClick={(e) => e.stopPropagation()} />
                </div>
            )}

            <div className="h-32 sm:h-48 w-full relative overflow-hidden bg-zinc-900 group">
                {(tempCoverUrl) ? <img src={tempCoverUrl} className="w-full h-full object-cover opacity-90" /> : <div className="w-full h-full bg-gradient-to-br from-sky-900/60 via-zinc-900 to-rose-900/40"></div>}
                <Link to="/settings" className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-black/70 transition shadow-lg z-10 backdrop-blur-md sm:hidden"><SettingsIcon size={20} /></Link>
                {isMyProfile && (
                    <button onClick={() => setShowCoverMenu(true)} className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-white text-xs font-semibold hover:bg-black/80 transition z-10">
                        <Camera size={13}/> Edit Cover
                    </button>
                )}
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleCoverChange(e.target.files[0])}/>
            </div>


            <div className="px-4 relative pb-4 border-b border-zinc-800/50">
                <div className="flex justify-between items-start">
                    <div className="relative -mt-12 sm:-mt-16 z-20 w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
                        <div
                            className={"w-full h-full rounded-full border-4 border-black bg-zinc-800 flex items-center justify-center overflow-hidden relative group" + (isMyProfile ? " cursor-pointer" : "")}
                            onClick={() => isMyProfile ? setShowAvatarMenu(true) : (avatarUrl ? setViewingAvatar(true) : null)}
                        >
                            {tempAvatarUrl ? <img src={tempAvatarUrl} className="w-full h-full object-cover" /> : <span className="text-4xl text-zinc-500">{profileData.username.charAt(0).toUpperCase()}</span>}
                            {isMyProfile && (
                                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                    <Camera size={22} className="text-white drop-shadow"/>
                                </div>
                            )}
                        </div>
                        {savingPhoto && <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center z-10"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/></div>}
                        {!!profileData.show_active_status && onlineUsers.has(String(profileData.id)) && (
                            <span style={{position:'absolute',bottom:'4px',right:'4px',width:'16px',height:'16px',background:'#4ade80',borderRadius:'50%',border:'3px solid #000',boxShadow:'0 0 8px rgba(74,222,128,0.8)',display:'block',zIndex:30}}></span>
                        )}
                        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleAvatarChange(e.target.files[0])}/>
                    </div>

                    <div className="mt-4">
                        {!isMyProfile && (
                            <>
                                {isVerifiedProfile ? (
                                    <>
                                        {!followStatus && <button onClick={followUser} className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-500 font-bold py-1.5 px-4 rounded-full transition"><Rss size={16}/> Follow</button>}
                                        {followStatus && <button onClick={unfollowUser} className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 text-blue-400 hover:text-red-400 hover:border-red-500 font-bold py-1.5 px-4 rounded-full transition group"><Rss size={16}/> <span className="group-hover:hidden">Following</span><span className="hidden group-hover:block">Unfollow</span></button>}
                                    </>
                                ) : (
                                    <>
                                        {friendStatus === 'none' && <button onClick={sendFriendRequest} className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-500 font-bold py-1.5 px-4 rounded-full transition"><UserPlus size={18} /> Add Friend</button>}
                                        {friendStatus === 'sent_request' && <button className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 text-white font-bold py-1.5 px-4 rounded-full cursor-not-allowed"><Clock size={18} className="text-zinc-400" /> Request Sent</button>}
                                        {friendStatus === 'received_request' && <button onClick={acceptFriendRequest} className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-500 font-bold py-1.5 px-4 rounded-full transition"><UserCheck size={18} /> Accept Request</button>}
                                        {friendStatus === 'friends' && (
                                            <button onClick={unfriendUser} className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 text-green-500 font-bold py-1.5 px-4 rounded-full hover:text-red-500 hover:border-red-500 transition group">
                                                <UserCheck size={18} className="group-hover:hidden" />
                                                <UserMinus size={18} className="hidden group-hover:block" />
                                                <span className="group-hover:hidden">Friends</span>
                                                <span className="hidden group-hover:block">Unfriend</span>
                                            </button>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="mt-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-2xl font-bold text-white leading-tight">{profileData.username}</h1>
                        <VerifiedBadge isVerified={!!profileData.is_verified} verifyType={profileData.verify_type} size={20}/>
                        {!isVerifiedProfile && profileData.is_private ? <Lock size={16} className="text-zinc-500" /> : null}
                        {isMyProfile && !!profileData.ghost_mode && <span title="Ghost Mode ON" className="text-purple-400"><Ghost size={16}/></span>}
                        {profileData?.is_monetized && profileData?.creator_tag && (
                            <span className="inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-400">
                                <DollarSign size={10} />{profileData.creator_tag}
                            </span>
                        )}
                    </div>
                    <p className="text-zinc-500">@{profileData.username.toLowerCase()}</p>
                    {/* Active status badge */}
                    {!!profileData.show_active_status && onlineUsers.has(String(profileData.id)) && (
                        <p className="text-green-400 text-xs font-medium mt-1 flex items-center gap-1">
                            <span style={{width:7,height:7,borderRadius:'50%',background:'#4ade80',display:'inline-block'}}></span> Active now
                        </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 mb-1">
                        {isVerifiedProfile && (
                            <button onClick={() => openPeopleModal('followers')} className="text-white font-bold hover:underline">
                                {followerCount} <span className="text-zinc-500 font-normal">Followers</span>
                            </button>
                        )}
                        {canSeeDetails && profileData.friend_count > 0 && (
                            <button onClick={() => openPeopleModal('friends')} className="text-white font-bold hover:underline">
                                {profileData.friend_count} <span className="text-zinc-500 font-normal">Friends</span>
                            </button>
                        )}
                    </div>

                    {profileData.created_at && (
                        <p className="text-zinc-500 text-xs mt-1 mb-3">📅 Joined {new Date(profileData.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' })}</p>

                    {/* ── Action buttons below join date ── */}
                    {isMyProfile && (
                        isEditing ? (
                            <button onClick={handleSaveProfile} className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-500 font-bold py-2 px-6 rounded-xl transition">
                                <Check size={16}/> Save Changes
                            </button>
                        ) : (
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-zinc-900 border border-zinc-700/60 text-white font-semibold py-2 px-4 rounded-xl hover:bg-zinc-800 transition-all text-sm">
                                    <Edit3 size={14}/> Edit Info
                                </button>
                                <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 bg-zinc-900 border border-zinc-700/60 text-white font-semibold py-2 px-4 rounded-xl hover:bg-zinc-800 transition-all text-sm">
                                    📊 Dashboard
                                </button>
                                <Link to="/monetization" className={"flex items-center gap-1.5 py-2 px-4 rounded-xl font-semibold text-sm transition-all border " + (profileData?.is_monetized ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400' : 'bg-zinc-900 border-zinc-700/60 text-zinc-400 hover:text-white hover:bg-zinc-800')}>
                                    <DollarSign size={14}/>
                                    {profileData?.is_monetized ? 'Monetized' : 'Monetize'}
                                </Link>
                                <button onClick={() => setShowQR(true)} className="flex items-center gap-2 bg-zinc-900 border border-zinc-700/60 text-zinc-400 hover:text-white py-2 px-3 rounded-xl hover:bg-zinc-800 transition-all text-sm">
                                    📱
                                </button>
                            </div>
                        )
                    )}
                    )}
                    {!isMyProfile && mutualFriends.length > 0 && (
                        <div className="flex items-center gap-2 mt-2 mb-1">
                            <div className="flex -space-x-2">
                                {mutualFriends.slice(0, 3).map(f => (
                                    <div key={f.id} className="w-6 h-6 rounded-full border-2 border-black overflow-hidden bg-zinc-700 flex items-center justify-center">
                                        {f.profile_pic_url ? <img src={f.profile_pic_url} className="w-full h-full object-cover" /> : <span className="text-[10px] text-zinc-300">{f.username.charAt(0).toUpperCase()}</span>}
                                    </div>
                                ))}
                            </div>
                            <p className="text-zinc-400 text-xs">{mutualFriends.length} mutual {mutualFriends.length === 1 ? 'friend' : 'friends'}{mutualFriends.length > 0 ? ` · ${mutualFriends[0].username}${mutualFriends.length > 1 ? ` +${mutualFriends.length - 1}` : ''}` : ''}</p>
                        </div>
                    )}
                    
                    {isEditing ? (
                        <div className="space-y-4 mt-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                            <div><label className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1 block">Bio</label><textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition-colors" placeholder="Write a bio..." rows="2" /></div>
                            <div><label className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Music size={14}/> Profile Anthem (YouTube Link)</label><input type="text" value={editAnthem} onChange={(e) => setEditAnthem(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition-colors text-sm" /></div>
                            {!!profileData.is_verified && (
                                <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/30 rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Ghost size={18} className="text-purple-400"/>
                                        <div>
                                            <p className="text-white text-sm font-semibold">Ghost Mode</p>
                                            <p className="text-zinc-500 text-xs font-medium tracking-wide">Hide your active status from everyone including friends</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={async () => {
                                        const newVal = !profileData.ghost_mode;
                                        try {
                                            await axios.put(`${BACKEND_URL}/api/users/${currentUserId}/ghost-mode`, { ghostMode: newVal });
                                            setProfileData(p => ({...p, ghost_mode: newVal}));
                                        } catch(e) { alert('Failed to update ghost mode'); }
                                    }} className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${profileData.ghost_mode ? 'bg-purple-500' : 'bg-zinc-700'}`}>
                                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${profileData.ghost_mode ? 'translate-x-5' : 'translate-x-0.5'}`}/>
                                    </button>
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                                    <span>🔗 Links <span className="text-zinc-600 normal-case font-normal">{profileData.is_verified ? '(max 5)' : '(max 2)'}</span></span>
                                    {editLinks.length < (profileData.is_verified ? 5 : 2) ? (
                                        <button type="button" onClick={() => setEditLinks(prev => [...prev, { label: '', url: '' }])} className="text-blue-400 hover:text-blue-300 text-xs font-bold">+ Add Link</button>
                                    ) : (
                                        <span className="text-zinc-600 text-xs">{profileData.is_verified ? 'Max 5 reached' : <span className="text-yellow-500">Verify to add more ✦</span>}</span>
                                    )}
                                </label>
                                <div className="space-y-2">
                                    {editLinks.map((link, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <input value={link.label} onChange={e => setEditLinks(prev => prev.map((l, idx) => idx === i ? {...l, label: e.target.value} : l))}
                                                placeholder="Label (e.g. GitHub)" className="w-28 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 text-sm" />
                                            <input value={link.url} onChange={e => setEditLinks(prev => prev.map((l, idx) => idx === i ? {...l, url: e.target.value} : l))}
                                                placeholder="https://..." className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 text-sm" />
                                            <button type="button" onClick={() => setEditLinks(prev => prev.filter((_, idx) => idx !== i))} className="text-zinc-500 hover:text-red-400 transition"><X size={16}/></button>
                                        </div>
                                    ))}
                                    {editLinks.length === 0 && <p className="text-zinc-600 text-xs">No links yet. Click + Add Link.</p>}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-zinc-200 mt-2">{profileData.bio}</p>
                            {(() => {
                                let links = [];
                                try { links = JSON.parse(profileData.profile_links || '[]'); } catch(e) {}
                                return links.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {links.filter(l => l.url).map((link, i) => (
                                            <a key={i} href={link.url.startsWith('http') ? link.url : 'https://'+link.url} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-blue-400 text-sm px-3 py-1.5 rounded-full transition">
                                                🔗 {link.label || link.url}
                                            </a>
                                        ))}
                                    </div>
                                ) : null;
                            })()}
                            {renderAnthem(profileData.anthem_url)}
                        </>
                    )}
                </div>
            </div>

            {isMyProfile && (
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/30">
                    <button
                        onClick={() => navigate('/create-post')}
                        className="w-full flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-2xl px-4 py-3.5 transition group text-left">
                        <div className="w-9 h-9 rounded-full flex-shrink-0 bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
                            {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <span className="text-zinc-500 font-bold text-sm">{profileData.username.charAt(0).toUpperCase()}</span>}
                        </div>
                        <span className="text-zinc-500 group-hover:text-zinc-400 text-base flex-1 transition">What's on your mind?</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-bold px-3 py-1.5 rounded-full text-white transition" style={{backgroundColor: themeColor}}>+ Post</span>
                        </div>
                    </button>
                </div>
            )}

            {/* Collab invites banner */}
            {collabInvites.length > 0 && (
                <div className="mx-4 mt-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-3">
                    <p className="text-yellow-300 text-xs font-bold mb-2 flex items-center gap-1"><Star size={12}/> Co-author Invites</p>
                    {collabInvites.map(inv => (
                        <div key={inv.id} className="flex items-center gap-2 mb-1 last:mb-0">
                            <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                                {inv.author_pic ? <img src={inv.author_pic} className="w-full h-full object-cover"/> : <span className="flex items-center justify-center h-full text-xs text-white">{inv.author_username?.charAt(0).toUpperCase()}</span>}
                            </div>
                            <p className="text-white text-xs flex-1 truncate"><span className="font-bold">{inv.author_username}</span> invited you to co-author</p>
                            <button onClick={async () => { await axios.put(`${BACKEND_URL}/api/posts/${inv.id}/collab-respond`, { accept: true, userId: currentUserId }); setCollabInvites(p => p.filter(i => i.id !== inv.id)); }} className="bg-green-600 hover:bg-green-500 text-white text-xs px-2 py-1 rounded-full">Accept</button>
                            <button onClick={async () => { await axios.put(`${BACKEND_URL}/api/posts/${inv.id}/collab-respond`, { accept: false, userId: currentUserId }); setCollabInvites(p => p.filter(i => i.id !== inv.id)); }} className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs px-2 py-1 rounded-full">Decline</button>
                        </div>
                    ))}
                </div>
            )}

            <div className="w-full">
                {/* Tabs */}
                <div className="flex border-b border-zinc-800 sticky top-0 bg-black z-10">
                    <button
                        onClick={() => setActiveTab('posts')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition border-b-2 ${activeTab === 'posts' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <ImageIcon size={15} /> Posts
                    </button>
                    <button
                        onClick={() => setActiveTab('reels')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition border-b-2 ${activeTab === 'reels' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <Film size={15} /> Reels {userReels.length > 0 && <span className="text-xs bg-zinc-700 px-1.5 py-0.5 rounded-full">{userReels.length}</span>}
                    </button>
                </div>

                {/* Posts tab */}
                {activeTab === 'posts' && (
                    <>
                        {displayedPosts.length === 0 ? <p className="text-zinc-500 text-center p-8">No posts yet.</p> : (
                            displayedPosts.map((post) => (
                                <div key={post.id} className="p-4 border-b border-zinc-800 hover:bg-zinc-950/30 flex gap-4">
                                    <div className="w-12 h-12 rounded-full flex-shrink-0 bg-zinc-800 flex items-center justify-center overflow-hidden">{avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <span className="text-zinc-500 font-bold">{post.username.charAt(0).toUpperCase()}</span>}</div>
                                    <div className="w-full">
                                        
                                        {/* 🔥 THE POST HEADER W/ MORE OPTIONS MENU 🔥 */}
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-white flex items-center gap-1">{post.username}<VerifiedBadge isVerified={!!post.is_verified} verifyType={post.verify_type} size={12}/></span>
                                        {post.co_author_username && post.co_author_status === 'accepted' && <><span className="text-zinc-600 text-xs">with</span><span className="font-bold text-yellow-300 text-sm">& {post.co_author_username}</span></>}
                                        <span className="text-zinc-500 text-sm">@{post.username.toLowerCase()}</span>
                                        {post.visibility && post.visibility !== 'public' && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{post.visibility === 'friends' ? '👥' : post.visibility === 'close_friends' ? '⭐' : '🔒'} {post.visibility.replace('_', ' ')}</span>}
                                        <span className="text-zinc-600 text-sm hidden sm:inline">·</span>
                                        <span className="text-zinc-500 text-xs w-full sm:w-auto">{formatTimeFriendly(post.created_at)}</span>
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
                                                {post.user_id == currentUserId && (
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

                                {(() => {
                                    const imgs = (() => { try { return post.images ? JSON.parse(post.images) : null; } catch(e) { return null; } })();
                                    const allImgs = imgs && imgs.length > 1 ? imgs : (post.image_url ? [post.image_url] : null);
                                    if (!allImgs) return null;
                                    if (allImgs.length === 1) return <img onClick={() => setViewingImage(allImgs[0])} src={allImgs[0]} className="rounded-2xl border border-zinc-800 max-h-96 w-auto object-cover mb-3 cursor-pointer hover:opacity-90 transition"/>;
                                    return (
                                        <div className="relative mb-3 bg-zinc-900/40 rounded-2xl overflow-hidden">
                                            {(() => {
                                                const [ci, setCi] = useState(0);
                                                return <>
                                                    <img src={allImgs[ci]} onClick={() => setViewingImage(allImgs[ci])} className="max-h-96 w-full object-contain cursor-pointer hover:opacity-95 transition rounded-2xl"/>
                                                    {ci > 0 && <button onClick={e=>{e.stopPropagation();setCi(i=>i-1)}} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1.5 rounded-full">‹</button>}
                                                    {ci < allImgs.length-1 && <button onClick={e=>{e.stopPropagation();setCi(i=>i+1)}} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1.5 rounded-full">›</button>}
                                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">{allImgs.map((_,i)=><div key={i} className={`w-1.5 h-1.5 rounded-full ${i===ci?'bg-white':'bg-white/40'}`}/>)}</div>
                                                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">{ci+1}/{allImgs.length}</div>
                                                </>;
                                            })()}
                                        </div>
                                    );
                                })()}
                                {/* Analytics button for own posts */}
                                {isMyProfile && (
                                    <button onClick={async () => {
                                        if (showAnalyticsPostId === post.id) { setShowAnalyticsPostId(null); return; }
                                        const r = await axios.get(`${BACKEND_URL}/api/posts/${post.id}/analytics`).catch(()=>({data:{}}));
                                        setPostAnalytics(prev => ({...prev, [post.id]: r.data}));
                                        setShowAnalyticsPostId(post.id);
                                    }} className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs font-medium transition mb-2">
                                        📊 Analytics {showAnalyticsPostId === post.id ? '▲' : '▼'}
                                    </button>
                                )}
                                {showAnalyticsPostId === post.id && postAnalytics[post.id] && (
                                    <div className="flex gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-3 text-sm">
                                        <div className="text-center"><p className="font-bold text-white">{postAnalytics[post.id].view_count || 0}</p><p className="text-zinc-500 text-xs font-medium tracking-wide">Views</p></div>
                                        <div className="text-center"><p className="font-bold text-white">{postAnalytics[post.id].like_count || 0}</p><p className="text-zinc-500 text-xs font-medium tracking-wide">Likes</p></div>
                                        <div className="text-center"><p className="font-bold text-white">{postAnalytics[post.id].comment_count || 0}</p><p className="text-zinc-500 text-xs font-medium tracking-wide">Comments</p></div>
                                    </div>
                                )}
                                    </div>
                                </div>
                            ))
                        )}
                        {!canSeeDetails && <div className="text-center p-10 border border-zinc-800 rounded-2xl m-4 bg-zinc-900/50"><Lock className="mx-auto text-zinc-500 mb-2" size={32} /><h3 className="text-white font-bold">This Account is Private</h3><p className="text-zinc-500 text-sm mt-1">Add them as a friend to see their posts.</p></div>}
                    </>
                )}

                {/* Reels tab */}
                {activeTab === 'reels' && (
                    <div className="p-4">
                        {userReels.length === 0 ? (
                            <div className="text-center p-10 text-zinc-500">
                                <Film size={40} className="mx-auto mb-3 opacity-30" />
                                <p>No reels yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {userReels.map(reel => (
                                    <div key={reel.id} className="relative aspect-[9/16] bg-zinc-900 rounded-xl overflow-hidden group cursor-pointer border border-zinc-800">
                                        <video
                                            src={reel.video_url}
                                            className="w-full h-full object-cover"
                                            muted
                                            loop
                                            onMouseEnter={e => e.target.play()}
                                            onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }}
                                        />
                                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition flex items-center justify-center">
                                            <Play size={28} className="text-white opacity-80 group-hover:opacity-0 transition" fill="white" />
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                                            <div className="flex items-center gap-1 text-white text-xs">
                                                <Heart size={12} className={reel.user_liked ? 'fill-pink-500 text-pink-500' : ''} />
                                                <span>{reel.like_count}</span>
                                            </div>
                                            {reel.caption && <p className="text-white text-xs truncate mt-0.5">{reel.caption}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

            {/* Avatar menu */}
            {showAvatarMenu && (
                <div className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowAvatarMenu(false)}>
                    <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl p-4 pb-8 space-y-1" onClick={e => e.stopPropagation()}>
                        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-3"/>
                        <p className="text-white font-bold text-base text-center mb-2">Profile Photo</p>
                        {avatarUrl && (
                            <button onClick={() => { setViewingAvatar(true); setShowAvatarMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-zinc-800 transition text-white font-semibold">
                                <Eye size={20} className="text-zinc-400"/> See Profile Picture
                            </button>
                        )}
                        <button onClick={() => { avatarInputRef.current.click(); setShowAvatarMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-zinc-800 transition text-white font-semibold">
                            <Camera size={20} className="text-sky-400"/> Select New Profile Picture
                        </button>
                        <button onClick={() => setShowAvatarMenu(false)} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-zinc-800 transition text-zinc-500">
                            <X size={18}/> Cancel
                        </button>
                    </div>
                </div>
            )}
            {viewingAvatar && avatarUrl && (
                <div className="fixed inset-0 z-[500] bg-black/95 flex items-center justify-center" onClick={() => setViewingAvatar(false)}>
                    <button className="absolute top-4 right-4 text-white bg-zinc-800 rounded-full p-2 z-10" onClick={() => setViewingAvatar(false)}><X size={22}/></button>
                    <img src={avatarUrl} className="w-72 h-72 sm:w-96 sm:h-96 rounded-full object-cover shadow-2xl" onClick={e => e.stopPropagation()}/>
                </div>
            )}

            {/* Cover menu */}
            {showCoverMenu && (
                <div className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowCoverMenu(false)}>
                    <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl p-4 pb-8 space-y-1" onClick={e => e.stopPropagation()}>
                        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-3"/>
                        <p className="text-white font-bold text-base text-center mb-2">Cover Photo</p>
                        {coverUrl && (
                            <button onClick={() => { setViewingCover(true); setShowCoverMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-zinc-800 transition text-white font-semibold">
                                <Eye size={20} className="text-zinc-400"/> View Cover Photo
                            </button>
                        )}
                        <button onClick={() => { coverInputRef.current.click(); setShowCoverMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-zinc-800 transition text-white font-semibold">
                            <Camera size={20} className="text-sky-400"/> Select New Cover Photo
                        </button>
                        <button onClick={() => setShowCoverMenu(false)} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-zinc-800 transition text-zinc-500">
                            <X size={18}/> Cancel
                        </button>
                    </div>
                </div>
            )}
            {viewingCover && coverUrl && (
                <div className="fixed inset-0 z-[500] bg-black/95 flex items-center justify-center" onClick={() => setViewingCover(false)}>
                    <button className="absolute top-4 right-4 text-white bg-zinc-800 rounded-full p-2 z-10" onClick={() => setViewingCover(false)}><X size={22}/></button>
                    <img src={coverUrl} className="max-w-full max-h-[90vh] object-contain rounded-xl" onClick={e => e.stopPropagation()}/>
                </div>
            )}

            {/* QR Code Modal */}
            {showQR && (
                <div className="fixed inset-0 z-[500] bg-black/90 flex items-center justify-center animate-fade-in" onClick={() => setShowQR(false)}>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-white font-bold text-xl">My Profile QR Code</h3>
                        <p className="text-zinc-500 text-sm text-center">Scan to visit <span className="text-white font-bold">@{profileData?.username}</span>'s profile</p>
                        <div className="bg-white p-4 rounded-2xl shadow-lg">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/profile/' + id)}`} alt="Profile QR Code" className="w-48 h-48 rounded-xl" />
                        </div>
                        <p className="text-zinc-600 text-xs">{window.location.origin}/profile/{id}</p>
                        <button onClick={() => setShowQR(false)} className="text-zinc-400 hover:text-white transition text-sm">Close</button>
                    </div>
                </div>
            )}
        </>
    );
}

export default Profile;