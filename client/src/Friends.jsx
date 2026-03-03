import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { UserCheck, UserPlus, User } from 'lucide-react';

const BACKEND_URL = `http://${window.location.hostname}:5000`;
const EMPTY_ARRAY = new Array();

function Friends() {
    const currentUserId = localStorage.getItem('userId');
    const[pendingRequests, setPendingRequests] = useState(EMPTY_ARRAY);
    const[exploreUsers, setExploreUsers] = useState(EMPTY_ARRAY);

    const loadFriendsData = () => {
        if (!currentUserId) return;
        axios.get(`${BACKEND_URL}/api/friends/pending/${currentUserId}`).then(res => setPendingRequests(res.data)).catch(err => console.error(err));
        axios.get(`${BACKEND_URL}/api/friends/explore/${currentUserId}`).then(res => setExploreUsers(res.data)).catch(err => console.error(err));
    };
    useEffect(loadFriendsData, EMPTY_ARRAY);

    const acceptRequest = (requesterId) => {
        axios.put(`${BACKEND_URL}/api/friends/accept`, { requester_id: requesterId, receiver_id: currentUserId }).then(() => loadFriendsData()).catch(err => console.error(err));
    };
    const sendRequest = (receiverId) => {
        axios.post(`${BACKEND_URL}/api/friends/request`, { requester_id: currentUserId, receiver_id: receiverId }).then(() => loadFriendsData()).catch(err => console.error(err));
    };

    if (!currentUserId) return <div className="p-8 text-center text-zinc-500">Please log in.</div>;

    return (
        <div className="w-full bg-black min-h-screen pb-20 sm:pb-0 animate-fade-in">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-10"><h2 className="text-2xl font-bold text-white">Friends & Connect</h2></div>
            <div className="p-4 space-y-8">
                {pendingRequests.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Friend Requests</h3>
                        <div className="grid grid-cols-1 gap-4">
                            {pendingRequests.map(user => (
                                <div key={user.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                                    <Link to={`/profile/${user.id}`} className="flex items-center gap-3 hover:opacity-80 transition">
                                        <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center">{user.profile_pic_url ? <img src={`${BACKEND_URL}${user.profile_pic_url}`} className="w-full h-full object-cover" /> : <User className="text-zinc-500"/>}</div>
                                        <div><h4 className="font-bold text-white">{user.username}</h4><p className="text-xs text-zinc-500">Wants to connect</p></div>
                                    </Link>
                                    <button onClick={() => acceptRequest(user.id)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-4 rounded-full transition flex items-center gap-2 text-sm"><UserCheck size={16} /> Accept</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div>
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Explore Community</h3>
                    {exploreUsers.length === 0 ? (<p className="text-zinc-500">You are connected with everyone!</p>) : (
                        <div className="grid grid-cols-1 gap-4">
                            {exploreUsers.map(user => (
                                <div key={user.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                                    <Link to={`/profile/${user.id}`} className="flex items-center gap-3 hover:opacity-80 transition">
                                        <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center">{user.profile_pic_url ? <img src={`${BACKEND_URL}${user.profile_pic_url}`} className="w-full h-full object-cover" /> : <User className="text-zinc-500"/>}</div>
                                        <div><h4 className="font-bold text-white">{user.username}</h4><p className="text-xs text-zinc-500">New to network</p></div>
                                    </Link>
                                    <button onClick={() => sendRequest(user.id)} className="bg-white text-black hover:bg-zinc-200 font-bold py-1.5 px-4 rounded-full transition flex items-center gap-2 text-sm"><UserPlus size={16} /> Add Friend</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
export default Friends;