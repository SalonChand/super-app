import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { X, Image as ImageIcon, Globe, Users, EyeOff, Star, ChevronDown, Check, Search, ArrowLeft, ChevronLeft, ChevronRight, Music } from 'lucide-react';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

// ── People picker bottom sheet ──────────────────────────────────────────────
function PeoplePicker({ title, subtitle, friends, selected, multiSelect, onToggle, onClose, themeColor }) {
    const [query, setQuery] = useState('');
    const filtered = query.trim()
        ? friends.filter(f => f.username.toLowerCase().includes(query.toLowerCase()))
        : friends;

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
                    <div>
                        <h3 className="text-white font-bold text-base">{title}</h3>
                        <p className="text-zinc-500 text-xs mt-0.5">{subtitle}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition">
                        <X size={15} className="text-zinc-400" />
                    </button>
                </div>

                {/* Search bar */}
                <div className="px-4 py-3 border-b border-zinc-800 flex-shrink-0">
                    <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-2.5 focus-within:border-zinc-500 transition">
                        <Search size={15} className="text-zinc-500 flex-shrink-0" />
                        <input
                            autoFocus
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search friends…"
                            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-zinc-600"
                        />
                        {query && <button onClick={() => setQuery('')}><X size={13} className="text-zinc-500" /></button>}
                    </div>
                </div>

                {/* Selected chips (multi-select only) */}
                {multiSelect && selected.length > 0 && (
                    <div className="px-4 py-2.5 flex gap-2 flex-wrap border-b border-zinc-800 flex-shrink-0">
                        {selected.map(f => (
                            <span key={f.id} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                                style={{ backgroundColor: themeColor + '25', border: `1px solid ${themeColor}40`, color: themeColor }}>
                                @{f.username}
                                <button onClick={() => onToggle(f)} className="opacity-60 hover:opacity-100 transition"><X size={10} /></button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Friend list */}
                <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center py-12 text-zinc-600">
                            <Search size={28} className="mb-3 opacity-40" />
                            <p className="text-sm">No friends found</p>
                        </div>
                    ) : filtered.map(f => {
                        const isSelected = multiSelect
                            ? selected.some(s => s.id === f.id)
                            : selected.length > 0 && selected[0]?.id === f.id;
                        return (
                            <button key={f.id} onClick={() => onToggle(f)}
                                className={`w-full flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-900 transition text-left ${isSelected ? 'bg-zinc-900/50' : ''}`}>
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 border border-zinc-700">
                                    {f.profile_pic_url
                                        ? <img src={f.profile_pic_url} className="w-full h-full object-cover" alt="" />
                                        : <span className="flex items-center justify-center h-full text-zinc-400 font-bold text-sm">{f.username.charAt(0).toUpperCase()}</span>}
                                </div>
                                <p className="flex-1 text-white font-semibold text-sm truncate">{f.username}</p>
                                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                                    style={isSelected ? { backgroundColor: themeColor, borderColor: themeColor } : { borderColor: '#52525b' }}>
                                    {isSelected && <Check size={11} className="text-white" />}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Done */}
                <div className="p-4 border-t border-zinc-800 flex-shrink-0 pb-safe">
                    <button onClick={onClose} className="w-full py-3 rounded-2xl font-bold text-white text-sm transition active:opacity-80"
                        style={{ backgroundColor: themeColor }}>
                        Done{multiSelect && selected.length > 0 ? ` (${selected.length})` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Collage image preview ─────────────────────────────────────────────────────
function ImagePreview({ urls, onRemove }) {
    const [viewIdx, setViewIdx] = useState(null);
    const touchStartX = useRef(null);
    const touchStartY = useRef(null);
    if (!urls.length) return null;

    const n = urls.length;

    const onTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = e.changedTouches[0].clientY - touchStartY.current;
        touchStartX.current = null;
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
        if (dx < 0 && viewIdx < urls.length - 1) setViewIdx(i => i + 1);
        if (dx > 0 && viewIdx > 0) setViewIdx(i => i - 1);
    };

    // Single image
    if (n === 1) return (
        <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
            <img src={urls[0]} className="w-full max-h-80 object-cover" alt=""/>
            <button onClick={() => onRemove(0)} className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1.5 rounded-full transition">
                <X size={15}/>
            </button>
        </div>
    );

    // Collage grid
    const gridClass = n === 2 ? 'grid grid-cols-2 gap-0.5' : n === 3 ? 'grid grid-cols-3 gap-0.5' : 'grid grid-cols-2 gap-0.5';
    const aspectRatio = n === 2 ? '1' : n === 3 ? '0.85' : '1';

    return (
        <div className="rounded-2xl overflow-hidden border border-zinc-800">
            <div className={gridClass}>
                {urls.slice(0, 4).map((url, i) => {
                    const isOverlay = i === 3 && n > 4;
                    return (
                        <div key={i} className="relative overflow-hidden bg-zinc-900 cursor-pointer"
                            style={{ aspectRatio }}
                            onClick={() => setViewIdx(i)}>
                            <img src={url} className="w-full h-full object-cover hover:opacity-90 transition" alt=""/>
                            {isOverlay && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <span className="text-white font-bold text-3xl">+{n - 4}</span>
                                </div>
                            )}
                            <button onClick={e => { e.stopPropagation(); onRemove(i); }}
                                className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black text-white p-1 rounded-full transition z-10">
                                <X size={13}/>
                            </button>
                        </div>
                    );
                })}
            </div>
            {n > 4 && <p className="text-zinc-500 text-xs text-center py-2 bg-zinc-900">{n} photos · tap to view</p>}

            {/* Fullscreen viewer with swipe */}
            {viewIdx !== null && (
                <div className="fixed inset-0 z-[300] bg-black/97 flex items-center justify-center"
                    onClick={() => setViewIdx(null)}
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}>
                    <button className="absolute top-4 right-4 bg-zinc-800 text-white p-2 rounded-full z-10" onClick={() => setViewIdx(null)}>
                        <X size={20}/>
                    </button>
                    <img src={urls[viewIdx]} className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl select-none"
                        onClick={e => e.stopPropagation()} draggable={false} alt=""/>
                    {urls.length > 1 && (
                        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {urls.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === viewIdx ? 'bg-white scale-125' : 'bg-white/35'}`}/>)}
                        </div>
                    )}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                        {viewIdx + 1} / {urls.length}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function CreatePost({ themeColor = '#3b82f6' }) {
    const navigate = useNavigate();
    const userId = localStorage.getItem('userId');
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    const [content, setContent] = useState('');
    const [images, setImages] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const [visibility, setVisibility] = useState('public');
    const [showVisPicker, setShowVisPicker] = useState(false);
    const [taggedFriends, setTaggedFriends] = useState([]);
    const [collabFriend, setCollabFriend] = useState(null);
    const [showTagPicker, setShowTagPicker] = useState(false);
    const [showCollabPicker, setShowCollabPicker] = useState(false);
    const [friends, setFriends] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [posting, setPosting] = useState(false);
    const [songFile, setSongFile] = useState(null);
    const [songName, setSongName] = useState('');
    const songInputRef = useRef(null);

    useEffect(() => {
        if (!userId) return;
        axios.get(`${BACKEND_URL}/api/friends/list/${userId}`).then(r => setFriends(r.data || [])).catch(() => {});
        axios.get(`${BACKEND_URL}/api/users/${userId}`).then(r => setCurrentUser(r.data)).catch(() => {});
        // Auto-focus textarea
        setTimeout(() => textareaRef.current?.focus(), 100);
    }, []);

    // Auto-grow textarea
    useEffect(() => {
        const t = textareaRef.current;
        if (t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
    }, [content]);

    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        const all = [...images, ...files].slice(0, 10);
        setImages(all);
        setPreviewUrls(all.map(f => URL.createObjectURL(f)));
        e.target.value = '';
    };

    const removeImage = (i) => {
        const all = images.filter((_, idx) => idx !== i);
        setImages(all);
        setPreviewUrls(all.map(f => URL.createObjectURL(f)));
    };

    const toggleTag = (f) => setTaggedFriends(prev => prev.some(p => p.id === f.id) ? prev.filter(p => p.id !== f.id) : [...prev, f]);
    const toggleCollab = (f) => setCollabFriend(prev => prev?.id === f.id ? null : f);

    const canPost = !!(content.trim() || images.length > 0);

    const submit = async (asDraft = false) => {
        if (!canPost && !asDraft) return;
        setPosting(true);
        try {
            const fd = new FormData();
            fd.append('user_id', userId);
            fd.append('content', content);
            fd.append('visibility', visibility);
            if (asDraft) fd.append('is_draft', 'true');
            if (taggedFriends.length > 0) fd.append('tagged_users', JSON.stringify(taggedFriends.map(f => f.id)));
            images.forEach(img => fd.append('images', img));
            if (songFile) { fd.append('song', songFile); fd.append('song_name', songName || songFile.name.replace(/\.[^/.]+$/, '')); }
            const res = await axios.post(`${BACKEND_URL}/api/posts`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (collabFriend && res.data?.postId) {
                await axios.post(`${BACKEND_URL}/api/posts/${res.data.postId}/collab-invite`, { coAuthorId: collabFriend.id }).catch(() => {});
            }
            navigate(-1);
        } catch (e) {
            console.error(e);
            alert('Failed to post. Try again.');
        } finally {
            setPosting(false);
        }
    };

    const visOpts = [
        { value: 'public',        icon: <Globe size={15}/>,  label: 'Everyone',      desc: 'Anyone can see this',       color: 'text-green-400'  },
        { value: 'friends',       icon: <Users size={15}/>,  label: 'Friends Only',  desc: 'Only your friends',         color: 'text-blue-400'   },
        { value: 'close_friends', icon: <Star size={15}/>,   label: 'Close Friends', desc: 'Your close friends list',   color: 'text-yellow-400' },
        { value: 'only_me',       icon: <EyeOff size={15}/>, label: 'Only Me',       desc: 'Just you',                  color: 'text-zinc-400'   },
    ];
    const curVis = visOpts.find(v => v.value === visibility);

    return (
        <div className="min-h-screen bg-black flex flex-col">

            {/* ── Top bar ── */}
            <div className="flex items-center px-4 py-3 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-10 gap-3">
                <button onClick={() => navigate(-1)} className="text-zinc-400 hover:text-white transition p-1 -ml-1 flex-shrink-0">
                    <ArrowLeft size={22} />
                </button>
                <h1 className="text-white font-bold text-lg flex-1 text-center">New Post</h1>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => submit(true)}
                        className="text-zinc-400 hover:text-white text-sm font-semibold px-3 py-1.5 rounded-full hover:bg-zinc-800 transition">
                        Draft
                    </button>
                    <button onClick={() => submit(false)} disabled={!canPost || posting}
                        className="text-white text-sm font-bold px-5 py-2 rounded-full transition disabled:opacity-40 active:opacity-80"
                        style={{ backgroundColor: themeColor }}>
                        {posting ? '…' : 'Post'}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">

                {/* ── Author + visibility ── */}
                <div className="flex items-start gap-3 px-4 pt-5 pb-2">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700 flex-shrink-0 flex items-center justify-center">
                        {currentUser?.profile_pic_url
                            ? <img src={currentUser.profile_pic_url} className="w-full h-full object-cover" alt="" />
                            : <span className="text-zinc-400 font-bold">{currentUser?.username?.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="flex flex-col gap-1.5 pt-0.5">
                        <p className="text-white font-bold text-sm leading-none">{currentUser?.username}</p>
                        <button onClick={() => setShowVisPicker(p => !p)}
                            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border transition ${curVis.color} ${showVisPicker ? 'bg-zinc-800 border-zinc-600' : 'border-zinc-700 hover:bg-zinc-900'}`}>
                            {curVis.icon}
                            <span>{curVis.label}</span>
                            <ChevronDown size={10} />
                        </button>
                    </div>
                </div>

                {/* ── Visibility dropdown ── */}
                {showVisPicker && (
                    <div className="mx-4 mb-3 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                        {visOpts.map(opt => (
                            <button key={opt.value} onClick={() => { setVisibility(opt.value); setShowVisPicker(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-900 transition border-b border-zinc-800/50 last:border-0 ${visibility === opt.value ? 'bg-zinc-900/60' : ''}`}>
                                <span className={opt.color}>{opt.icon}</span>
                                <div className="flex-1">
                                    <p className={`text-sm font-semibold ${visibility === opt.value ? opt.color : 'text-white'}`}>{opt.label}</p>
                                    <p className="text-zinc-500 text-xs">{opt.desc}</p>
                                </div>
                                {visibility === opt.value && <Check size={14} style={{ color: themeColor }} />}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Text ── */}
                <div className="px-4 pb-2">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="What's on your mind?"
                        className="w-full bg-transparent text-white text-xl placeholder-zinc-600 outline-none resize-none leading-relaxed min-h-[100px]"
                    />
                </div>

                {/* ── Tagged friends pills ── */}
                {taggedFriends.length > 0 && (
                    <div className="px-4 pb-3 flex flex-wrap gap-2">
                        {taggedFriends.map(f => (
                            <span key={f.id} className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full"
                                style={{ backgroundColor: themeColor + '20', color: themeColor }}>
                                <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0">
                                    {f.profile_pic_url
                                        ? <img src={f.profile_pic_url} className="w-full h-full object-cover" alt="" />
                                        : <span className="flex items-center justify-center h-full text-[10px] font-bold text-white">{f.username.charAt(0).toUpperCase()}</span>}
                                </div>
                                @{f.username}
                                <button onClick={() => toggleTag(f)} className="opacity-60 hover:opacity-100 ml-0.5"><X size={12}/></button>
                            </span>
                        ))}
                    </div>
                )}

                {/* ── Collab pill ── */}
                {collabFriend && (
                    <div className="mx-4 mb-3 flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-4 py-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0 border border-yellow-500/40">
                            {collabFriend.profile_pic_url
                                ? <img src={collabFriend.profile_pic_url} className="w-full h-full object-cover" alt="" />
                                : <span className="flex items-center justify-center h-full text-xs font-bold text-white">{collabFriend.username.charAt(0).toUpperCase()}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-yellow-400 text-[11px] font-bold uppercase tracking-wider">Co-author invite</p>
                            <p className="text-white text-sm font-semibold truncate">@{collabFriend.username}</p>
                        </div>
                        <button onClick={() => setCollabFriend(null)} className="text-zinc-500 hover:text-white transition"><X size={16}/></button>
                    </div>
                )}

                {/* ── Music pill ── */}
                {songFile && (
                    <div className="mx-4 mb-3 flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-2xl px-4 py-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
                            <Music size={16} className="text-white"/>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-green-400 text-[11px] font-bold uppercase tracking-wider">Music attached</p>
                            <input value={songName} onChange={e => setSongName(e.target.value)}
                                placeholder="Song name…"
                                className="bg-transparent text-white text-sm font-semibold outline-none w-full truncate placeholder-zinc-500"/>
                        </div>
                        <button onClick={() => { setSongFile(null); setSongName(''); }} className="text-zinc-500 hover:text-red-400 transition flex-shrink-0"><X size={16}/></button>
                    </div>
                )}

                {/* ── Image preview ── */}
                {previewUrls.length > 0 && (
                    <div className="px-4 pb-4">
                        <ImagePreview urls={previewUrls} onRemove={removeImage} />
                    </div>
                )}

                {/* ── Toolbar ── */}
                <div className="border-t border-zinc-900 mx-0" />
                <div className="px-2 py-3 flex items-center gap-1">
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />

                    <button onClick={() => fileInputRef.current.click()}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-2xl hover:bg-zinc-900 transition group">
                        <ImageIcon size={20} className={images.length > 0 ? 'text-green-400' : 'text-zinc-500 group-hover:text-white'} />
                        <span className={`text-sm font-medium ${images.length > 0 ? 'text-green-400' : 'text-zinc-500 group-hover:text-white'}`}>
                            Photo{images.length > 0 ? ` (${images.length})` : ''}
                        </span>
                    </button>

                    <button onClick={() => setShowTagPicker(true)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-2xl hover:bg-zinc-900 transition group">
                        <Users size={20} className={taggedFriends.length > 0 ? '' : 'text-zinc-500 group-hover:text-white'} style={taggedFriends.length > 0 ? { color: themeColor } : {}} />
                        <span className={taggedFriends.length > 0 ? 'text-sm font-medium' : 'text-sm font-medium text-zinc-500 group-hover:text-white'}
                            style={taggedFriends.length > 0 ? { color: themeColor } : {}}>
                            Tag{taggedFriends.length > 0 ? ` (${taggedFriends.length})` : ''}
                        </span>
                    </button>

                    <button onClick={() => setShowCollabPicker(true)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-2xl hover:bg-zinc-900 transition group">
                        <Star size={20} className={collabFriend ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-500 group-hover:text-white'} />
                        <span className={`text-sm font-medium ${collabFriend ? 'text-yellow-400' : 'text-zinc-500 group-hover:text-white'}`}>
                            {collabFriend ? `Collab: @${collabFriend.username}` : 'Collab'}
                        </span>
                    </button>

                    <input ref={songInputRef} type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) { setSongFile(f); setSongName(f.name.replace(/\.[^/.]+$/, '')); } e.target.value=''; }} />
                    <button onClick={() => songInputRef.current.click()}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-2xl hover:bg-zinc-900 transition group">
                        <Music size={20} className={songFile ? 'text-green-400' : 'text-zinc-500 group-hover:text-white'} />
                        <span className={`text-sm font-medium ${songFile ? 'text-green-400' : 'text-zinc-500 group-hover:text-white'}`}>
                            {songFile ? songName || 'Song' : 'Music'}
                        </span>
                    </button>
                </div>
            </div>

            {/* ── Tag picker ── */}
            {showTagPicker && (
                <PeoplePicker
                    title="Tag People"
                    subtitle="Tag friends who appear in this post"
                    friends={friends}
                    selected={taggedFriends}
                    multiSelect={true}
                    onToggle={toggleTag}
                    onClose={() => setShowTagPicker(false)}
                    themeColor={themeColor}
                />
            )}

            {/* ── Collab picker ── */}
            {showCollabPicker && (
                <PeoplePicker
                    title="Invite Co-author"
                    subtitle="They'll be credited as a co-author on this post"
                    friends={friends}
                    selected={collabFriend ? [collabFriend] : []}
                    multiSelect={false}
                    onToggle={(f) => { toggleCollab(f); if (collabFriend?.id !== f.id) setShowCollabPicker(false); }}
                    onClose={() => setShowCollabPicker(false)}
                    themeColor={themeColor}
                />
            )}
        </div>
    );
}
