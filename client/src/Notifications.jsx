import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Bell, MessageCircle, UserPlus, Check, AtSign, Heart, Users, Cake } from 'lucide-react';
import { BACKEND_URL } from './config';

function formatTimeFriendly(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString); const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today at ${timeStr}`;
    if (isYesterday) return `Yesterday at ${timeStr}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
}

const TYPE_CONFIG = {
    message:         { color: 'bg-blue-500',   Icon: MessageCircle, link: '/chat' },
    request:         { color: 'bg-pink-500',    Icon: UserPlus,      link: '/friends' },
    friend_accepted: { color: 'bg-green-500',   Icon: Check,         link: '/friends' },
    mention:         { color: 'bg-purple-500',  Icon: AtSign,        link: '/' },
    like:            { color: 'bg-rose-500',    Icon: Heart,         link: '/' },
    comment:         { color: 'bg-indigo-500',  Icon: MessageCircle, link: '/' },
    verified:        { color: 'bg-blue-600',    Icon: Check,         link: '/settings' },
};

function Notifications() {
    const userId = localStorage.getItem('userId');
    const [activity, setActivity] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [addedIds, setAddedIds] = useState(new Set());
    const [birthdayFriends, setBirthdayFriends] = useState([]);

    useEffect(() => {
        if (!userId) return;
        axios.get(`${BACKEND_URL}/api/notifications/${userId}`)
            .then(res => { if (Array.isArray(res.data)) setActivity(res.data.filter(n => n.type !== 'message')); })
            .catch(() => {});
        axios.get(`${BACKEND_URL}/api/friends/suggestions/${userId}`)
            .then(res => { if (Array.isArray(res.data)) setSuggestions(res.data); })
            .catch(() => {});
        axios.get(`${BACKEND_URL}/api/users/${userId}/birthday-friends`)
            .then(res => { if (Array.isArray(res.data)) setBirthdayFriends(res.data); })
            .catch(() => {});
    }, []);

    const sendRequest = (targetId) => {
        axios.post(`${BACKEND_URL}/api/friends/request`, { requester_id: userId, receiver_id: targetId })
            .then(() => setAddedIds(prev => new Set([...prev, targetId])))
            .catch(() => {});
    };

    return (
        <div className="w-full bg-black flex flex-col h-screen">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-10 flex items-center gap-3 backdrop-blur-md">
                <Bell size={24} className="text-white" />
                <h2 className="text-2xl font-bold text-white">Notifications</h2>
            </div>

            <div className="flex-1 overflow-y-auto pb-20 sm:pb-4">
            {birthdayFriends.length > 0 && (
                <div className="mx-4 mt-4 bg-gradient-to-r from-pink-500/20 to-yellow-500/20 border border-pink-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Cake size={18} className="text-pink-400"/>
                        <h3 className="text-white font-bold text-sm">🎂 Birthdays Today!</h3>
                    </div>
                    <div className="flex flex-col gap-2">
                        {birthdayFriends.map(friend => (
                            <Link key={friend.id} to={`/profile/${friend.id}`} className="flex items-center gap-3 hover:opacity-80 transition">
                                <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0">
                                    {friend.profile_pic_url ? <img src={friend.profile_pic_url} className="w-full h-full object-cover"/> : <span className="flex items-center justify-center h-full font-bold text-white text-sm">{friend.username.charAt(0).toUpperCase()}</span>}
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">{friend.username}</p>
                                    <p className="text-pink-300 text-xs">🎉 It's their birthday today!</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {suggestions.length > 0 && (
                <div className="px-4 pt-4">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Users size={13} /> People You May Know
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-3">
                        {suggestions.map(user => (
                            <div key={user.id} className="flex-shrink-0 w-36 bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex flex-col items-center gap-2">
                                <Link to={`/profile/${user.id}`}>
                                    <div className="w-14 h-14 rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center">
                                        {user.profile_pic_url
                                            ? <img src={user.profile_pic_url} className="w-full h-full object-cover" />
                                            : <span className="text-xl font-bold text-zinc-400">{user.username.charAt(0).toUpperCase()}</span>}
                                    </div>
                                </Link>
                                <Link to={`/profile/${user.id}`} className="text-white text-sm font-bold text-center truncate w-full">{user.username}</Link>
                                <p className="text-zinc-500 text-xs">{user.mutual_count} mutual</p>
                                {addedIds.has(user.id)
                                    ? <span className="text-green-400 text-xs font-bold">Added!</span>
                                    : <button onClick={() => sendRequest(user.id)} className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-1.5 rounded-full transition">Add Friend</button>
                                }
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-zinc-800 mt-1 mb-1" />
                </div>
            )}

            <div className="p-4 space-y-3">
                {activity.length === 0 ? (
                    <div className="text-center p-10 text-zinc-500">
                        <Bell size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No recent activity.</p>
                    </div>
                ) : (
                    activity.map((item, i) => {
                        const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG['message'];
                        const { color, Icon, link } = cfg;
                        return (
                            <Link to={link} key={i} className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl hover:bg-zinc-800 transition shadow-md">
                                <div className="relative flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center">
                                        {item.profile_pic_url
                                            ? <img src={`${item.profile_pic_url}`} className="w-full h-full object-cover" />
                                            : <span className="font-bold text-zinc-500 text-lg">{(item.username || '?').charAt(0).toUpperCase()}</span>}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-zinc-900 ${color}`}>
                                        <Icon size={10} className="text-white" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm leading-snug">{item.content || `${item.username} interacted with you.`}</p>
                                    <p className="text-zinc-600 text-[10px] mt-1">{formatTimeFriendly(item.created_at)}</p>
                                </div>
                                <div className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition text-white flex-shrink-0">
                                    <Check size={18} />
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
            </div>
        </div>
    );
}

export default Notifications;
