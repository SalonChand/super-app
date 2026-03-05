import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Bell, MessageCircle, UserPlus, Check } from 'lucide-react';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';
const EMPTY_ARRAY = new Array();

function Notifications() {
    const userId = localStorage.getItem('userId');
    const [activity, setActivity] = useState([]);

    const fetchActivity = () => {
        axios.get(`${BACKEND_URL}/api/activity/${userId}`)
             .then(res => setActivity(res.data.feed))
             .catch(err => console.error(err));
    };

    useEffect(fetchActivity, EMPTY_ARRAY);

    return (
        <div className="w-full bg-black min-h-screen pb-20 sm:pb-0 animate-fade-in relative">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-10 flex items-center gap-3 backdrop-blur-md">
                <Bell size={24} className="text-white" />
                <h2 className="text-2xl font-bold text-white">Notifications</h2>
            </div>

            <div className="p-4 space-y-3">
                {activity.length === 0 ? (
                    <div className="text-center p-10 text-zinc-500">
                        <Bell size={48} className="mx-auto mb-4 opacity-30" />
                        <p>You're all caught up!</p>
                    </div>
                ) : (
                    activity.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl hover:bg-zinc-800 transition shadow-md">
                            
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800">
                                    {item.profile_pic_url ? <img src={`${item.profile_pic_url}`} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center w-full h-full font-bold text-zinc-500">{item.username.charAt(0).toUpperCase()}</div>}
                                </div>
                                <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-zinc-900 ${item.type === 'message' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                                    {item.type === 'message' ? <MessageCircle size={10} className="text-white" /> : <UserPlus size={10} className="text-white" />}
                                </div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm">
                                    <span className="font-bold">{item.username}</span> 
                                    {item.type === 'message' ? ' sent you a message:' : ' sent a friend request.'}
                                </p>
                                {item.type === 'message' && (
                                    <p className="text-zinc-400 text-xs truncate mt-0.5 font-medium">{item.content || "Sent an attachment"}</p>
                                )}
                                <p className="text-zinc-600 text-[10px] mt-1">{new Date(item.created_at).toLocaleString()}</p>
                            </div>

                            <Link to={item.type === 'message' ? '/chat' : '/friends'} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition text-white">
                                <Check size={18} />
                            </Link>

                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Notifications;