import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { UserCheck, UserPlus, User, X, Clock, BadgeCheck } from 'lucide-react';

function VerifiedBadge({ isVerified, verifyType, size = 14 }) {
    if (!isVerified) return null;
    const titles = { red: 'Platform Owner', green: 'Verified Politician', yellow: 'Verified Celebrity', blue: 'Verified Account' };
    const t = verifyType || 'blue';
    const colors = { red: 'text-red-500', green: 'text-green-500', yellow: 'text-yellow-400', blue: 'text-blue-400' };
    const style = t === 'red' ? { filter: 'drop-shadow(0 0 3px rgba(239,68,68,0.7))' } : {};
    return <BadgeCheck size={size} className={`flex-shrink-0 ${colors[t] || colors.blue}`} title={titles[t] || titles.blue} style={style}/>;
}

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';
function Friends() {
    const currentUserId = localStorage.getItem('userId');
    const [pendingRequests, setPendingRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [exploreUsers, setExploreUsers] = useState([]);

    const loadFriendsData = () => {
        if (!currentUserId) return;
        axios.get(`${BACKEND_URL}/api/friends/pending/${currentUserId}`).then(res => setPendingRequests(res.data)).catch(console.error);
        axios.get(`${BACKEND_URL}/api/friends/sent/${currentUserId}`).then(res => setSentRequests(res.data)).catch(console.error);
        axios.get(`${BACKEND_URL}/api/friends/explore/${currentUserId}`).then(res => setExploreUsers(res.data)).catch(console.error);
    };

    useEffect(() => { loadFriendsData(); }, []);

    const acceptRequest = (requesterId) => {
        axios.put(`${BACKEND_URL}/api/friends/accept`, { requester_id: requesterId, receiver_id: currentUserId })
            .then(() => loadFriendsData()).catch(console.error);
    };

    const sendRequest = async (receiverId) => {
        try {
            await axios.post(`${BACKEND_URL}/api/friends/request`, {
                requester_id: parseInt(currentUserId),
                receiver_id: parseInt(receiverId)
            });
            loadFriendsData();
        } catch (err) {
            alert(`Failed to send request: ${err.response?.data?.error || err.message}`);
        }
    };

    const cancelRequest = async (receiverId) => {
        try {
            await axios.post(`${BACKEND_URL}/api/friends/cancel`, {
                requester_id: parseInt(currentUserId),
                receiver_id: parseInt(receiverId)
            });
            loadFriendsData();
        } catch (err) {
            alert(`Failed to cancel: ${err.response?.data?.error || err.message}`);
        }
    };

    if (!currentUserId) return <div className="p-8 text-center text-zinc-500">Please log in.</div>;

    return (
        <div className="w-full bg-black min-h-screen pb-20 sm:pb-0 animate-fade-in">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-10">
                <h2 className="text-2xl font-bold text-white">Friends & Connect</h2>
            </div>
            <div className="p-4 space-y-8">

                {/* Incoming Requests */}
                {pendingRequests.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Friend Requests</h3>
                        <div className="grid grid-cols-1 gap-4">
                            {pendingRequests.map(user => (
                                <div key={user.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                                    <Link to={`/profile/${user.id}`} className="flex items-center gap-3 hover:opacity-80 transition">
                                        <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center">
                                            {user.profile_pic_url ? <img src={user.profile_pic_url} className="w-full h-full object-cover" /> : <User className="text-zinc-500" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white flex items-center gap-1">{user.username}<VerifiedBadge isVerified={!!user.is_verified} verifyType={user.verify_type} size={14}/></h4>
                                            <p className="text-xs text-zinc-500">Wants to connect</p>
                                        </div>
                                    </Link>
                                    <button onClick={() => acceptRequest(user.id)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-4 rounded-full transition flex items-center gap-2 text-sm">
                                        <UserCheck size={16} /> Accept
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sent Requests */}
                {sentRequests.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Sent Requests</h3>
                        <div className="grid grid-cols-1 gap-4">
                            {sentRequests.map(user => (
                                <div key={user.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                                    <Link to={`/profile/${user.id}`} className="flex items-center gap-3 hover:opacity-80 transition">
                                        <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center">
                                            {user.profile_pic_url ? <img src={user.profile_pic_url} className="w-full h-full object-cover" /> : <User className="text-zinc-500" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white flex items-center gap-1">{user.username}<VerifiedBadge isVerified={!!user.is_verified} verifyType={user.verify_type} size={14}/></h4>
                                            <p className="text-xs text-zinc-500 flex items-center gap-1"><Clock size={11} /> Request pending</p>
                                        </div>
                                    </Link>
                                    <button onClick={() => cancelRequest(user.id)} className="border border-zinc-600 hover:border-red-500 hover:text-red-400 text-zinc-400 font-bold py-1.5 px-4 rounded-full transition flex items-center gap-2 text-sm">
                                        <X size={16} /> Cancel
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Explore */}
                <div>
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Explore Community</h3>
                    {exploreUsers.length === 0 ? (
                        <p className="text-zinc-500">You are connected with everyone!</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {exploreUsers.map(user => (
                                <div key={user.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                                    <Link to={`/profile/${user.id}`} className="flex items-center gap-3 hover:opacity-80 transition">
                                        <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center">
                                            {user.profile_pic_url ? <img src={user.profile_pic_url} className="w-full h-full object-cover" /> : <User className="text-zinc-500" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white flex items-center gap-1">{user.username}<VerifiedBadge isVerified={!!user.is_verified} verifyType={user.verify_type} size={14}/></h4>
                                            <p className="text-xs text-zinc-500">New to network</p>
                                        </div>
                                    </Link>
                                    <button onClick={() => sendRequest(user.id)} className="bg-white text-black hover:bg-zinc-200 font-bold py-1.5 px-4 rounded-full transition flex items-center gap-2 text-sm">
                                        <UserPlus size={16} /> Add
                                    </button>
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
