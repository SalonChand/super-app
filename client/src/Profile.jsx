import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { UserPlus, UserCheck, UserMinus, Clock, Edit3, Check, Camera, MessageCircle, Heart, Repeat2, Share, Lock, Image as ImageIcon, X, Music, Settings as SettingsIcon, MoreHorizontal, Edit2, Trash2, Link as LinkIcon, Film, Play, Globe, Users, EyeOff, Star, UserCheck2, ChevronDown, BadgeCheck, Ghost } from 'lucide-react';

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
    const[errorMessage, setErrorMessage] = useState(''); 
    const[viewingImage, setViewingImage] = useState(null);
    
    // EDIT PROFILE STATES
    const[isEditing, setIsEditing] = useState(false);
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

    const sendFriendRequest = () => axios.post(`${BACKEND_URL}/api/friends/request`, { requester_id: currentUserId, receiver_id: id }).then(() => setFriendStatus('sent_request'));
    const acceptFriendRequest = () => axios.put(`${BACKEND_URL}/api/friends/accept`, { requester_id: id, receiver_id: currentUserId }).then(() => setFriendStatus('friends'));
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
    if (!profileData) return <div className="text-white text-center p-10 mt-20 animate-pulse">Loading profile...</div>;

    const avatarUrl = profileData.profile_pic_url ? `${profileData.profile_pic_url}` : null;
    const coverUrl = profileData.cover_pic_url ? `${profileData.cover_pic_url}` : null;
    const tempAvatarUrl = editAvatar ? URL.createObjectURL(editAvatar) : avatarUrl;
    const tempCoverUrl = editCover ? URL.createObjectURL(editCover) : coverUrl;
    
    const canSeeDetails = isMyProfile || !profileData.is_private || friendStatus === 'friends';
    const displayedPosts = canSeeDetails ? userPosts : userPosts.slice(0, 1);

    return (
        <div className="w-full pb-20 sm:pb-0 animate-fade-in relative">
            {/* QR Code Modal */}
            {showQR && (
                <div className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center animate-fade-in" onClick={() => setShowQR(false)}>
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
            {viewingImage && (
                <div className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center animate-fade-in" onClick={() => setViewingImage(null)}>
                    <button className="absolute top-4 right-4 text-white bg-zinc-800 rounded-full p-2 hover:bg-zinc-700 transition"><X size={24} /></button>
                    <img src={viewingImage} className="max-w-full max-h-full object-contain p-4" onClick={(e) => e.stopPropagation()} />
                </div>
            )}

            <div className="h-32 sm:h-48 w-full relative overflow-hidden bg-zinc-900">
                {(tempCoverUrl) ? <img src={tempCoverUrl} className="w-full h-full object-cover opacity-90" /> : <div className="w-full h-full bg-gradient-to-r from-blue-900 to-purple-900"></div>}
                {isMyProfile && !isEditing && ( <Link to="/settings" className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-black/70 transition shadow-lg z-10 backdrop-blur-md sm:hidden"><SettingsIcon size={20} /></Link> )}
                {isEditing && ( <div onClick={() => coverInputRef.current.click()} className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center cursor-pointer hover:bg-black/70 transition z-10"><Camera size={32} className="text-white drop-shadow-md" /><span className="text-white font-bold drop-shadow-md mt-1 text-sm">Edit Cover</span><input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => setEditCover(e.target.files[0])}/></div> )}
            </div>

            <div className="px-4 relative pb-4 border-b border-zinc-800">
                <div className="flex justify-between items-start">
                    <div className="relative -mt-12 sm:-mt-16 z-20 w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
                        <div className="w-full h-full rounded-full border-4 border-black bg-zinc-800 flex items-center justify-center overflow-hidden">
                            {tempAvatarUrl ? <img src={tempAvatarUrl} className="w-full h-full object-cover" /> : <span className="text-4xl text-zinc-500">{profileData.username.charAt(0).toUpperCase()}</span>}
                            {isEditing && <div onClick={() => avatarInputRef.current.click()} className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer hover:bg-black/80 transition rounded-full"><Camera size={28} className="text-white" /><input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => setEditAvatar(e.target.files[0])}/></div>}
                        </div>
                        {/* Online dot — only show if user has active status ON and is actually online */}
                        {!!profileData.show_active_status && onlineUsers.has(String(profileData.id)) && (
                            <span style={{position:'absolute',bottom:'4px',right:'4px',width:'16px',height:'16px',background:'#4ade80',borderRadius:'50%',border:'3px solid #000',boxShadow:'0 0 8px rgba(74,222,128,0.8)',display:'block',zIndex:30}}></span>
                        )}
                    </div>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {isMyProfile ? (
                            isEditing ? <button onClick={handleSaveProfile} className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-500 font-bold py-1.5 px-4 rounded-full transition"><Check size={18} /> Save</button>
                            : <>
                                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 text-white font-bold py-1.5 px-4 rounded-full hover:bg-zinc-800"><Edit3 size={18} /> Edit Profile</button>
                                <button onClick={() => setShowQR(true)} title="Show QR Code" className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 text-white font-bold py-1.5 px-3 rounded-full hover:bg-zinc-800">📱 QR</button>
                                <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 text-white font-bold py-1.5 px-4 rounded-full hover:bg-zinc-800 transition">📊 Dashboard</button>
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
                    </div>
                </div>

                <div className="mt-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-2xl font-bold text-white leading-tight">{profileData.username}</h1>
                        <VerifiedBadge isVerified={!!profileData.is_verified} verifyType={profileData.verify_type} size={20}/>
                        {profileData.is_private ? <Lock size={16} className="text-zinc-500" /> : null}
                        {isMyProfile && !!profileData.ghost_mode && <span title="Ghost Mode ON" className="text-purple-400"><Ghost size={16}/></span>}
                    </div>
                    <p className="text-zinc-500">@{profileData.username.toLowerCase()}</p>
                    {/* Active status badge */}
                    {!!profileData.show_active_status && onlineUsers.has(String(profileData.id)) && (
                        <p className="text-green-400 text-xs font-medium mt-1 flex items-center gap-1">
                            <span style={{width:7,height:7,borderRadius:'50%',background:'#4ade80',display:'inline-block'}}></span> Active now
                        </p>
                    )}
                    {canSeeDetails && profileData.friend_count > 0 && <p className="text-white font-bold mt-2 mb-1">{profileData.friend_count} <span className="text-zinc-500 font-normal">Friends</span></p>}

                    {profileData.created_at && (
                        <p className="text-zinc-500 text-xs mt-1 mb-1">📅 Joined {new Date(profileData.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' })}</p>
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
                                            <p className="text-zinc-500 text-xs">Hide your active status from everyone including friends</p>
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
                                    {editLinks.length < (profileData.is_verified ? 5 : 2) && (
                                        <button type="button" onClick={() => setEditLinks(prev => [...prev, { label: '', url: '' }])} className="text-blue-400 hover:text-blue-300 text-xs font-bold">+ Add Link</button>
                                    )}
                                    {editLinks.length >= (profileData.is_verified ? 5 : 2) && (
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
                                        <div className="text-center"><p className="font-bold text-white">{postAnalytics[post.id].view_count || 0}</p><p className="text-zinc-500 text-xs">Views</p></div>
                                        <div className="text-center"><p className="font-bold text-white">{postAnalytics[post.id].like_count || 0}</p><p className="text-zinc-500 text-xs">Likes</p></div>
                                        <div className="text-center"><p className="font-bold text-white">{postAnalytics[post.id].comment_count || 0}</p><p className="text-zinc-500 text-xs">Comments</p></div>
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
    );
}

export default Profile;