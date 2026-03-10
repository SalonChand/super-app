import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, BadgeCheck, Shield, AlertTriangle, Users, Trash2, Mail, Calendar, Eye, Heart, MessageCircle, UserX, Ghost, VolumeX, ShieldOff, Send, X, Clock } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';
const BADGE_COLOR = { blue: 'text-blue-400', yellow: 'text-yellow-400', green: 'text-green-400', red: 'text-red-500' };
const BADGE_BG    = { blue: 'bg-blue-500/10 border-blue-500/40', yellow: 'bg-yellow-500/10 border-yellow-500/40', green: 'bg-green-500/10 border-green-500/40', red: 'bg-red-500/10 border-red-500/40' };

export default function AdminUserProfile() {
    const { userId } = useParams();
    const adminId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const loginUsername = localStorage.getItem('loginUsername');
    const isAdmin = userRole === 'superadmin' || loginUsername === 'superadmin' || adminId === '1';

    const [profile, setProfile] = useState(null);
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('info');
    const [friendSearch, setFriendSearch] = useState('');
    const [warnMsg, setWarnMsg] = useState('');
    const [warnSending, setWarnSending] = useState(false);
    const [warnFeedback, setWarnFeedback] = useState('');
    const [removingFriend, setRemovingFriend] = useState(null);
    const [actionMsg, setActionMsg] = useState('');

    useEffect(() => {
        if (!isAdmin) return;
        loadProfile();
        loadFriends();
    }, [userId]);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/api/admin/users/${userId}/profile?adminId=${adminId}`);
            setProfile(res.data);
        } catch(e) {}
        setLoading(false);
    };

    const loadFriends = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/api/admin/users/${userId}/friends?adminId=${adminId}`);
            setFriends(res.data || []);
        } catch(e) {}
    };

    const sendWarning = async () => {
        if (!warnMsg.trim()) return;
        setWarnSending(true);
        try {
            await axios.post(`${BACKEND_URL}/api/admin/users/${userId}/warn`, { adminId, message: warnMsg });
            setWarnFeedback('✅ Warning sent!');
            setWarnMsg('');
            loadProfile();
        } catch(e) { setWarnFeedback('❌ Failed to send'); }
        setWarnSending(false);
        setTimeout(() => setWarnFeedback(''), 3000);
    };

    const deleteWarning = async (warningId) => {
        try {
            await axios.delete(`${BACKEND_URL}/api/admin/warnings/${warningId}`, { data: { adminId } });
            setProfile(p => ({ ...p, warnings: p.warnings.filter(w => w.id !== warningId) }));
        } catch(e) {}
    };

    const removeFriend = async (friendId) => {
        setRemovingFriend(friendId);
        try {
            await axios.delete(`${BACKEND_URL}/api/admin/users/${userId}/friends/${friendId}`, { data: { adminId } });
            setFriends(p => p.filter(f => f.id !== friendId));
        } catch(e) {}
        setRemovingFriend(null);
    };

    const isSilenced = profile?.silenced_until && new Date(profile.silenced_until) > new Date();
    const isVerified = profile?.is_verified == 1 || profile?.is_verified === true;

    if (!isAdmin) return <div className="min-h-screen bg-black flex items-center justify-center"><p className="text-red-400">Access Denied</p></div>;
    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><p className="text-zinc-500">Loading...</p></div>;
    if (!profile) return <div className="min-h-screen bg-black flex items-center justify-center"><p className="text-red-400">User not found</p></div>;

    const filteredFriends = friends.filter(f =>
        f.display_name?.toLowerCase().includes(friendSearch.toLowerCase()) ||
        f.username?.toLowerCase().includes(friendSearch.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-black pb-24">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
                <Link to="/admin/users" className="text-zinc-400 hover:text-white transition"><ChevronLeft size={24}/></Link>
                <Shield size={18} className="text-yellow-400"/>
                <h1 className="text-white font-bold text-base flex-1 truncate">@{profile.username}</h1>
                <span className="text-zinc-600 text-xs">ID: {profile.id}</span>
            </div>

            {/* Profile Hero */}
            <div className="relative">
                {profile.cover_pic_url
                    ? <img src={profile.cover_pic_url} className="w-full h-28 object-cover"/>
                    : <div className="w-full h-28 bg-gradient-to-br from-zinc-800 to-zinc-900"/>
                }
                <div className="absolute -bottom-8 left-4">
                    {profile.profile_pic_url
                        ? <img src={profile.profile_pic_url} className="w-16 h-16 rounded-full object-cover border-2 border-black"/>
                        : <div className="w-16 h-16 rounded-full bg-zinc-700 border-2 border-black flex items-center justify-center text-white font-bold text-xl">{profile.display_name?.[0]?.toUpperCase()}</div>
                    }
                </div>
                {/* Status badges top right */}
                <div className="absolute top-2 right-3 flex flex-col items-end gap-1">
                    {profile.shadowbanned == 1 && <span className="text-[10px] font-bold bg-purple-500/80 text-white px-2 py-0.5 rounded-full">👻 Shadowbanned</span>}
                    {isSilenced && <span className="text-[10px] font-bold bg-orange-500/80 text-white px-2 py-0.5 rounded-full">🔇 Silenced</span>}
                    {profile.is_active == 0 && <span className="text-[10px] font-bold bg-red-500/80 text-white px-2 py-0.5 rounded-full">⛔ Deactivated</span>}
                </div>
            </div>

            <div className="px-4 pt-10 pb-2">
                <div className="flex items-center gap-2">
                    <p className="text-white font-bold text-lg">{profile.display_name || profile.username}</p>
                    {isVerified && <BadgeCheck size={18} className={BADGE_COLOR[profile.verify_type] || 'text-blue-400'}/>}
                </div>
                <p className="text-zinc-500 text-sm">@{profile.username}</p>
                {profile.bio && <p className="text-zinc-400 text-sm mt-1">{profile.bio}</p>}

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                    {[
                        ['Posts', profile.post_count],
                        ['Friends', profile.friend_count],
                        ['❤️ Received', profile.total_likes_received],
                        ['💬 Received', profile.total_comments_received],
                    ].map(([label, val]) => (
                        <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-center">
                            <p className="text-white font-bold text-sm">{val || 0}</p>
                            <p className="text-zinc-500 text-[10px]">{label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800 mt-3 overflow-x-auto">
                {[['info','📋 Info'], ['friends',`👥 Friends (${friends.length})`], ['warn',`⚠️ Warnings (${profile.warnings?.length || 0})`]].map(([id, label]) => (
                    <button key={id} onClick={() => setTab(id)}
                        className={`px-4 py-3 text-xs font-bold border-b-2 flex-shrink-0 transition ${tab === id ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-zinc-500 hover:text-white'}`}>
                        {label}
                    </button>
                ))}
            </div>

            <div className="px-4 pt-4 space-y-3 max-w-2xl mx-auto">

                {/* INFO TAB */}
                {tab === 'info' && (
                    <div className="space-y-3">
                        {/* Private info card */}
                        <div className="bg-zinc-900 border border-yellow-500/20 rounded-2xl p-4 space-y-2.5">
                            <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><Eye size={12}/> Private Info</p>
                            {[
                                ['Email', profile.email, Mail],
                                ['Role', profile.role || 'user', Shield],
                                ['Joined', new Date(profile.created_at).toLocaleDateString(), Calendar],
                                ['Birthday', profile.birthday || 'Not set', Calendar],
                                ['Private Account', profile.is_private ? 'Yes' : 'No', Eye],
                                ['2FA Enabled', profile.two_factor_enabled ? 'Yes' : 'No', Shield],
                                ['Last Seen', profile.last_seen ? new Date(profile.last_seen).toLocaleString() : 'Unknown', Clock],
                            ].map(([label, val, Icon]) => (
                                <div key={label} className="flex items-center gap-3">
                                    <Icon size={13} className="text-zinc-500 flex-shrink-0"/>
                                    <span className="text-zinc-500 text-xs w-28 flex-shrink-0">{label}</span>
                                    <span className="text-white text-xs font-semibold truncate">{val}</span>
                                </div>
                            ))}
                            {isVerified && (
                                <div className="flex items-center gap-3">
                                    <BadgeCheck size={13} className={BADGE_COLOR[profile.verify_type] || 'text-blue-400'}/>
                                    <span className="text-zinc-500 text-xs w-28 flex-shrink-0">Badge</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${BADGE_BG[profile.verify_type] || ''} ${BADGE_COLOR[profile.verify_type] || ''}`}>
                                        ✓ {profile.verify_type}
                                    </span>
                                </div>
                            )}
                            {isSilenced && (
                                <div className="flex items-center gap-3">
                                    <VolumeX size={13} className="text-orange-400 flex-shrink-0"/>
                                    <span className="text-zinc-500 text-xs w-28 flex-shrink-0">Silenced Until</span>
                                    <span className="text-orange-400 text-xs font-semibold">{new Date(profile.silenced_until).toLocaleString()}</span>
                                </div>
                            )}
                        </div>

                        {/* Recent posts */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
                            <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Recent Posts</p>
                            {profile.recent_posts?.length === 0
                                ? <p className="text-zinc-600 text-xs text-center py-3">No posts yet</p>
                                : profile.recent_posts?.map(post => (
                                    <div key={post.id} className="flex gap-3 py-2 border-b border-zinc-800 last:border-0">
                                        {post.image_url && <img src={post.image_url} className="w-12 h-12 rounded-xl object-cover flex-shrink-0"/>}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-zinc-300 text-xs line-clamp-2">{post.content}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-zinc-600 text-[10px]">❤️ {post.like_count}</span>
                                                <span className="text-zinc-600 text-[10px]">💬 {post.comment_count}</span>
                                                <span className="text-zinc-600 text-[10px]">👁 {post.view_count || 0}</span>
                                                <span className="text-zinc-600 text-[10px] ml-auto">{new Date(post.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}

                {/* FRIENDS TAB */}
                {tab === 'friends' && (
                    <div className="space-y-3">
                        <input value={friendSearch} onChange={e => setFriendSearch(e.target.value)}
                            placeholder="Search friends..."
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-500 outline-none focus:border-yellow-500/50"/>
                        {filteredFriends.length === 0
                            ? <div className="text-center py-12 text-zinc-600"><Users size={32} className="mx-auto mb-2 opacity-30"/><p className="text-sm">No friends found</p></div>
                            : filteredFriends.map(friend => (
                                <div key={friend.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center gap-3">
                                    {friend.profile_pic_url
                                        ? <img src={friend.profile_pic_url} className="w-10 h-10 rounded-full object-cover flex-shrink-0"/>
                                        : <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold flex-shrink-0">{friend.display_name?.[0]?.toUpperCase()}</div>
                                    }
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                            <p className="text-white font-bold text-sm truncate">{friend.display_name}</p>
                                            {friend.is_verified == 1 && <BadgeCheck size={12} className={BADGE_COLOR[friend.verify_type] || 'text-blue-400'}/>}
                                        </div>
                                        <p className="text-zinc-500 text-xs">@{friend.username}</p>
                                        <p className="text-zinc-600 text-[10px]">Friends since {new Date(friend.friends_since).toLocaleDateString()}</p>
                                    </div>
                                    <button onClick={() => removeFriend(friend.id)} disabled={removingFriend === friend.id}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition disabled:opacity-50 flex-shrink-0">
                                        <UserX size={12}/> {removingFriend === friend.id ? '...' : 'Remove'}
                                    </button>
                                </div>
                            ))
                        }
                    </div>
                )}

                {/* WARNINGS TAB */}
                {tab === 'warn' && (
                    <div className="space-y-3">
                        {/* Send warning */}
                        <div className="bg-zinc-900 border border-yellow-500/20 rounded-2xl p-4 space-y-3">
                            <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><AlertTriangle size={12}/> Send Official Warning</p>
                            <p className="text-zinc-500 text-xs">The user will receive this as a notification from the platform.</p>
                            <textarea value={warnMsg} onChange={e => setWarnMsg(e.target.value)}
                                placeholder="Describe the violation or reason for warning..."
                                rows={3}
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-500 outline-none focus:border-yellow-500/50 resize-none"/>
                            {warnFeedback && <p className={`text-xs font-bold text-center ${warnFeedback.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{warnFeedback}</p>}
                            <button onClick={sendWarning} disabled={warnSending || !warnMsg.trim()}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 font-bold text-sm hover:bg-yellow-500/30 transition disabled:opacity-50">
                                <Send size={14}/> {warnSending ? 'Sending...' : 'Send Warning'}
                            </button>
                        </div>

                        {/* Warning history */}
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider px-1">Warning History ({profile.warnings?.length || 0})</p>
                        {profile.warnings?.length === 0
                            ? <div className="text-center py-8 text-zinc-600"><AlertTriangle size={28} className="mx-auto mb-2 opacity-30"/><p className="text-sm">No warnings issued</p></div>
                            : profile.warnings?.map(w => (
                                <div key={w.id} className="bg-zinc-900 border border-yellow-500/20 rounded-2xl p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <p className="text-white text-sm">{w.message}</p>
                                            <p className="text-zinc-500 text-xs mt-1">By {w.admin_name} · {new Date(w.created_at).toLocaleString()}</p>
                                        </div>
                                        <button onClick={() => deleteWarning(w.id)} className="text-zinc-600 hover:text-red-400 transition p-1 flex-shrink-0">
                                            <Trash2 size={14}/>
                                        </button>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                )}
            </div>
        </div>
    );
}
