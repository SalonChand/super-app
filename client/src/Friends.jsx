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
    return <BadgeCheck size={size} className={`inline-block align-middle flex-shrink-0 ${colors[t] || colors.blue}`} title={titles[t] || titles.blue} style={{...style, verticalAlign: 'middle', marginLeft: '2px', marginBottom: '1px'}}/>;
}

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';
function Friends() {
    const currentUserId = localStorage.getItem('userId');
    const [pendingRequests, setPendingRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [exploreUsers, setExploreUsers] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);

    const loadFriendsData = () => {
        if (!currentUserId) return;
        Promise.all([
            axios.get(`${BACKEND_URL}/api/friends/pending/${currentUserId}`).then(res => setPendingRequests(res.data)).catch(console.error),
            axios.get(`${BACKEND_URL}/api/friends/sent/${currentUserId}`).then(res => setSentRequests(res.data)).catch(console.error),
            axios.get(`${BACKEND_URL}/api/friends/explore/${currentUserId}`).then(res => setExploreUsers(res.data)).catch(console.error),
        ]).finally(() => setInitialLoading(false));
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
        <div className="w-full bg-zinc-950 min-h-screen pb-20 sm:pb-0 animate-fade-in">
            <div className="px-5 py-4 border-b border-zinc-800/60 bg-zinc-950/90 sticky top-0 z-10 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 border border-sky-500/20 flex items-center justify-center">
                        <UserPlus size={15} className="text-sky-400"/>
                    </div>
                    <h2 className="text-xl font-black text-white tracking-tight">Friends</h2>
                </div>
            </div>
            <div className="p-4 space-y-6">

                {initialLoading ? (
                    /* ── Full page skeleton ── */
                    <>
                        {/* Requests skeleton */}
                        <div>
                            <div className="h-3 w-32 bg-zinc-800 rounded-full animate-pulse mb-4"/>
                            <div className="space-y-3">
                                {[...Array(2)].map((_, i) => (
                                    <div key={i} className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-3.5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-zinc-800 animate-pulse flex-shrink-0"/>
                                            <div className="space-y-2">
                                                <div className="h-3 w-24 bg-zinc-800 rounded-full animate-pulse"/>
                                                <div className="h-2.5 w-20 bg-zinc-800/60 rounded-full animate-pulse"/>
                                            </div>
                                        </div>
                                        <div className="h-8 w-20 bg-zinc-800 rounded-full animate-pulse"/>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Explore skeleton */}
                        <div>
                            <div className="h-3 w-40 bg-zinc-800 rounded-full animate-pulse mb-4"/>
                            <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-3.5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-zinc-800 animate-pulse flex-shrink-0"/>
                                            <div className="space-y-2">
                                                <div className="h-3 w-28 bg-zinc-800 rounded-full animate-pulse"/>
                                                <div className="h-2.5 w-16 bg-zinc-800/60 rounded-full animate-pulse"/>
                                            </div>
                                        </div>
                                        <div className="h-8 w-16 bg-zinc-800 rounded-full animate-pulse"/>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                {/* Incoming Requests */}
                {pendingRequests.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3"><span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"/><h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Friend Requests</h3><span className="text-xs text-sky-400 font-bold">{pendingRequests.length}</span></div>
                        <div className="grid grid-cols-1 gap-4">
                            {pendingRequests.map(user => (
                                <div key={user.id} className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-3.5 flex items-center gap-3 hover:border-zinc-700/60 transition-all">
                                    <Link to={`/profile/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center flex-shrink-0 ring-2 ring-sky-500/30">
                                            {user.profile_pic_url ? <img src={user.profile_pic_url} className="w-full h-full object-cover" /> : <User className="text-zinc-500" size={20}/>}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1"><h4 className="font-black text-white text-sm truncate">{user.username}</h4><VerifiedBadge isVerified={!!user.is_verified} verifyType={user.verify_type} size={13}/></div>
                                            <p className="text-xs text-sky-400/80 font-medium">Wants to connect</p>
                                        </div>
                                    </Link>
                                    <button onClick={() => acceptRequest(user.id)} className="flex-shrink-0 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold py-2 px-4 rounded-xl transition-all text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20">
                                        <UserCheck size={14}/> Accept
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sent Requests */}
                {sentRequests.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3"><span className="w-2 h-2 rounded-full bg-zinc-600"/><h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Sent Requests</h3></div>
                        <div className="grid grid-cols-1 gap-4">
                            {sentRequests.map(user => (
                                <div key={user.id} className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-3.5 flex items-center gap-3 hover:border-zinc-700/50 transition-all">
                                    <Link to={`/profile/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center flex-shrink-0 opacity-80">
                                            {user.profile_pic_url ? <img src={user.profile_pic_url} className="w-full h-full object-cover" /> : <User className="text-zinc-500" size={20}/>}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1"><h4 className="font-black text-white text-sm truncate">{user.username}</h4><VerifiedBadge isVerified={!!user.is_verified} verifyType={user.verify_type} size={13}/></div>
                                            <p className="text-xs text-zinc-500 flex items-center gap-1"><Clock size={10}/> Pending</p>
                                        </div>
                                    </Link>
                                    <button onClick={() => cancelRequest(user.id)} className="flex-shrink-0 border border-zinc-700 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/8 text-zinc-500 font-bold py-2 px-3 rounded-xl transition-all text-xs flex items-center gap-1.5">
                                        <X size={13}/> Cancel
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Explore */}
                <div>
                    <div className="flex items-center gap-2 mb-3"><span className="w-2 h-2 rounded-full bg-rose-400/60"/><h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">People You May Know</h3></div>
                    {exploreUsers.length === 0 ? (
                        <div className="text-center py-12 text-zinc-600"><div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3"><UserCheck size={24} className="opacity-40"/></div><p className="font-semibold text-sm">You know everyone here!</p><p className="text-xs mt-1 text-zinc-700">Invite friends to join Connect</p></div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {exploreUsers.map(user => (
                                <div key={user.id} className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-3.5 flex items-center gap-3 hover:bg-zinc-900/60 hover:border-zinc-700/50 transition-all">
                                    <Link to={`/profile/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                                            {user.profile_pic_url ? <img src={user.profile_pic_url} className="w-full h-full object-cover" /> : <span className="text-zinc-400 font-black text-lg">{user.username?.charAt(0).toUpperCase()}</span>}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1"><h4 className="font-black text-white text-sm truncate">{user.username}</h4><VerifiedBadge isVerified={!!user.is_verified} verifyType={user.verify_type} size={13}/></div>
                                            <p className="text-xs text-zinc-600">Connect member</p>
                                        </div>
                                    </Link>
                                    <button onClick={() => sendRequest(user.id)} className="flex-shrink-0 bg-zinc-800 hover:bg-sky-600 border border-zinc-700 hover:border-sky-500 text-zinc-300 hover:text-white font-bold py-2 px-3 rounded-xl transition-all text-xs flex items-center gap-1.5">
                                        <UserPlus size={13}/> Add
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                    </>
                )}

            </div>
        </div>
    );
}
export default Friends;
