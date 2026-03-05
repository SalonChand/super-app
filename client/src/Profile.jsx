import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { UserPlus, UserCheck, UserMinus, Clock, Edit3, Check, Camera, MessageCircle, Heart, Repeat2, Share, Lock, Image as ImageIcon, X, Music, Settings as SettingsIcon, MoreHorizontal, Edit2, Trash2, Link as LinkIcon } from 'lucide-react';

const BACKEND_URL = `http://${window.location.hostname}:5000`;
const EMPTY_ARRAY = new Array();

function formatTimeFriendly(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString); const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today at ${timeStr}`; if (isYesterday) return `Yesterday at ${timeStr}`; return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
}

function Profile() {
    const { id } = useParams(); 
    const currentUserId = localStorage.getItem('userId');
    const isMyProfile = id === currentUserId; 

    const[profileData, setProfileData] = useState(null);
    const[userPosts, setUserPosts] = useState([]);
    const[friendStatus, setFriendStatus] = useState('none'); 
    const[errorMessage, setErrorMessage] = useState(''); 
    const[viewingImage, setViewingImage] = useState(null);
    
    // EDIT PROFILE STATES
    const[isEditing, setIsEditing] = useState(false);
    const[editBio, setEditBio] = useState('');
    const[editAvatar, setEditAvatar] = useState(null);
    const[editCover, setEditCover] = useState(null); 
    const[editAnthem, setEditAnthem] = useState(''); 
    
    // POST CREATION STATES
    const[newPost, setNewPost] = useState('');
    const[selectedImage, setSelectedImage] = useState(null); 
    const[previewUrl, setPreviewUrl] = useState(null); 

    // 🔥 POST EDITING STATES 🔥
    const [menuOpenPostId, setMenuOpenPostId] = useState(null);
    const [editingPostId, setEditingPostId] = useState(null);
    const [editContent, setEditContent] = useState('');

    const fileInputRef = useRef(null);
    const avatarInputRef = useRef(null);
    const coverInputRef = useRef(null); 

    const deps = Array.of(id);

    const loadProfileData = () => {
        if (!id || id === 'undefined') { setErrorMessage("Invalid User ID"); return; }
        axios.get(`${BACKEND_URL}/api/users/${id}`)
             .then(res => { setProfileData(res.data); setEditBio(res.data.bio || ''); setEditAnthem(res.data.anthem_url || ''); })
             .catch(err => { console.error(err); setErrorMessage("Backend failed to send user data."); });
             
        axios.get(`${BACKEND_URL}/api/users/${id}/posts`)
             .then(res => { if (Array.isArray(res.data)) setUserPosts(res.data); })
             .catch(err => console.error(err));
             
        if (!isMyProfile) { 
            axios.get(`${BACKEND_URL}/api/friends/status/${currentUserId}/${id}`).then(res => setFriendStatus(res.data.status)).catch(err => console.error(err)); 
        }
    };

    useEffect(() => { loadProfileData(); }, [id]);

    const sendFriendRequest = () => axios.post(`${BACKEND_URL}/api/friends/request`, { requester_id: currentUserId, receiver_id: id }).then(() => setFriendStatus('sent_request'));
    const acceptFriendRequest = () => axios.put(`${BACKEND_URL}/api/friends/accept`, { requester_id: id, receiver_id: currentUserId }).then(() => setFriendStatus('friends'));
    const unfriendUser = () => { if(window.confirm(`Are you sure you want to unfriend ${profileData.username}?`)) { axios.post(`${BACKEND_URL}/api/friends/remove`, { user1: currentUserId, user2: id }).then(() => { setFriendStatus('none'); loadProfileData(); }).catch(console.error); } };

    const handleSaveProfile = async () => {
        const formData = new FormData(); 
        formData.append('userId', currentUserId); formData.append('bio', editBio); formData.append('anthem_url', editAnthem);
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

    const handleImageSelect = (e) => { const file = e.target.files[0]; if (file) { setSelectedImage(file); setPreviewUrl(URL.createObjectURL(file)); } };
    const removeImage = () => { setSelectedImage(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; };
    const handlePost = async (e) => {
        e.preventDefault(); if (!newPost.trim() && !selectedImage) return; 
        try {
            const formData = new FormData(); formData.append('user_id', currentUserId); formData.append('content', newPost);
            if (selectedImage) formData.append('image', selectedImage);
            await axios.post(`${BACKEND_URL}/api/posts`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setNewPost(''); removeImage(); loadProfileData(); 
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

    if (errorMessage) return <div className="text-center p-10 mt-20 border border-red-500/50 bg-red-500/10 rounded-2xl m-4"><h3 className="text-red-500 font-bold text-xl mb-2">Oops! Something broke.</h3><p className="text-zinc-400">{errorMessage}</p></div>;
    if (!profileData) return <div className="text-white text-center p-10 mt-20 animate-pulse">Loading profile...</div>;

    const avatarUrl = profileData.profile_pic_url ? `${BACKEND_URL}${profileData.profile_pic_url}` : null;
    const coverUrl = profileData.cover_pic_url ? `${BACKEND_URL}${profileData.cover_pic_url}` : null;
    const tempAvatarUrl = editAvatar ? URL.createObjectURL(editAvatar) : avatarUrl;
    const tempCoverUrl = editCover ? URL.createObjectURL(editCover) : coverUrl;
    
    const canSeeDetails = isMyProfile || !profileData.is_private || friendStatus === 'friends';
    const displayedPosts = canSeeDetails ? userPosts : userPosts.slice(0, 1);

    return (
        <div className="w-full pb-20 sm:pb-0 animate-fade-in relative">
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
                    <div className="relative -mt-12 sm:-mt-16 w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-black bg-zinc-800 flex items-center justify-center overflow-hidden z-20">
                        {tempAvatarUrl ? <img src={tempAvatarUrl} className="w-full h-full object-cover" /> : <span className="text-4xl text-zinc-500">{profileData.username.charAt(0).toUpperCase()}</span>}
                        {isEditing && <div onClick={() => avatarInputRef.current.click()} className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer hover:bg-black/80 transition"><Camera size={28} className="text-white" /><input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => setEditAvatar(e.target.files[0])}/></div>}
                    </div>

                    <div className="mt-3">
                        {isMyProfile ? (
                            isEditing ? <button onClick={handleSaveProfile} className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-500 font-bold py-1.5 px-4 rounded-full transition"><Check size={18} /> Save</button>
                            : <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 text-white font-bold py-1.5 px-4 rounded-full hover:bg-zinc-800"><Edit3 size={18} /> Edit Profile</button>
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
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">{profileData.username} {profileData.is_private ? <Lock size={16} className="text-zinc-500" /> : null}</h1>
                    <p className="text-zinc-500">@{profileData.username.toLowerCase()}</p>
                    {canSeeDetails && <p className="text-white font-bold mt-2 mb-2">{profileData.friend_count || 0} <span className="text-zinc-500 font-normal">Friends</span></p>}
                    
                    {isEditing ? (
                        <div className="space-y-4 mt-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                            <div><label className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1 block">Bio</label><textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition-colors" placeholder="Write a bio..." rows="2" /></div>
                            <div><label className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Music size={14}/> Profile Anthem (YouTube Link)</label><input type="text" value={editAnthem} onChange={(e) => setEditAnthem(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition-colors text-sm" /></div>
                        </div>
                    ) : (
                        <>
                            <p className="text-zinc-200 mt-2">{profileData.bio}</p>
                            {renderAnthem(profileData.anthem_url)}
                        </>
                    )}
                </div>
            </div>

            {isMyProfile && (
                <div className="p-4 border-b border-zinc-800 bg-zinc-950/30 flex gap-4">
                    <div className="w-12 h-12 rounded-full flex-shrink-0 bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">{avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <span className="text-zinc-500 font-bold">{profileData.username.charAt(0).toUpperCase()}</span>}</div>
                    <form onSubmit={handlePost} className="w-full pt-1">
                        <textarea className="w-full bg-transparent text-xl text-white placeholder-zinc-500 outline-none resize-none overflow-hidden" value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder="What's on your mind?" rows="2" />
                        {previewUrl && <div className="relative mt-2 mb-2 w-fit"><img src={previewUrl} className="max-h-64 rounded-2xl object-cover border border-zinc-700" /><button type="button" onClick={removeImage} className="absolute top-2 right-2 bg-black/70 p-1.5 rounded-full hover:bg-black transition"><X size={18} className="text-white" /></button></div>}
                        <div className="flex justify-between items-center mt-2 border-t border-zinc-800 pt-3">
                            <div className="flex gap-4 text-blue-500"><input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" /><button type="button" onClick={() => fileInputRef.current.click()} className="hover:bg-zinc-800 p-2 rounded-full transition"><ImageIcon size={20} /></button></div>
                            <button type="submit" disabled={!newPost.trim() && !selectedImage} className="text-white bg-blue-600 hover:bg-blue-500 font-bold py-1.5 px-6 rounded-full transition disabled:opacity-50">Post</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="w-full">
                <h3 className="p-4 font-bold text-lg border-b border-zinc-800">Posts</h3>
                {displayedPosts.length === 0 ? <p className="text-zinc-500 text-center p-8">No posts yet.</p> : (
                    displayedPosts.map((post) => (
                        <div key={post.id} className="p-4 border-b border-zinc-800 hover:bg-zinc-950/30 flex gap-4">
                            <div className="w-12 h-12 rounded-full flex-shrink-0 bg-zinc-800 flex items-center justify-center overflow-hidden">{avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <span className="text-zinc-500 font-bold">{post.username.charAt(0).toUpperCase()}</span>}</div>
                            <div className="w-full">
                                
                                {/* 🔥 THE POST HEADER W/ MORE OPTIONS MENU 🔥 */}
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-white">{post.username}</span>
                                        <span className="text-zinc-500 text-sm">@{post.username.toLowerCase()}</span>
                                        <span className="text-zinc-600 text-sm hidden sm:inline">·</span>
                                        <span className="text-zinc-500 text-xs w-full sm:w-auto">{formatTimeFriendly(post.created_at)}</span>
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

                                {post.image_url && <img onClick={() => setViewingImage(`${BACKEND_URL}${post.image_url}`)} src={`${BACKEND_URL}${post.image_url}`} className="rounded-2xl border border-zinc-800 max-h-96 w-auto object-cover mb-3 cursor-pointer hover:opacity-90 transition"/>}
                            </div>
                        </div>
                    ))
                )}
                {!canSeeDetails && <div className="text-center p-10 border border-zinc-800 rounded-2xl m-4 bg-zinc-900/50"><Lock className="mx-auto text-zinc-500 mb-2" size={32} /><h3 className="text-white font-bold">This Account is Private</h3><p className="text-zinc-500 text-sm mt-1">Add them as a friend to see their friend count and all other posts.</p></div>}
            </div>
        </div>
    );
}

export default Profile;