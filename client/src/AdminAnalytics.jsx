import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, BarChart2, Users, FileText, Film, MessageCircle, Heart, RefreshCw } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

export default function AdminAnalytics() {
    const adminId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const loginUsername = localStorage.getItem('loginUsername');
    const isAdmin = userRole === 'superadmin' || loginUsername === 'superadmin' || adminId === '1';
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/api/admin/analytics?adminId=${adminId}`);
            setStats(res.data);
        } catch(e) {}
        setLoading(false);
    };

    useEffect(() => { if (isAdmin) load(); }, []);

    const StatCard = ({ icon: Icon, label, value, sub, color }) => (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={18} className="text-white"/>
            </div>
            <div>
                <p className="text-white font-bold text-xl">{value ?? '—'}</p>
                <p className="text-zinc-500 text-xs">{label}</p>
                {sub && <p className="text-zinc-600 text-xs">{sub}</p>}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-black pb-24">
            <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
                <Link to="/admin" className="text-zinc-400 hover:text-white transition"><ChevronLeft size={24}/></Link>
                <BarChart2 size={20} className="text-green-400"/>
                <h1 className="text-white font-bold text-lg flex-1">Platform Analytics</h1>
                <button onClick={load} className="text-zinc-400 hover:text-white p-1"><RefreshCw size={18} className={loading ? 'animate-spin' : ''}/></button>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
                {loading ? <div className="text-center py-16 text-zinc-500">Loading analytics...</div> : !stats ? <div className="text-center py-16 text-zinc-500">Could not load stats</div> : <>
                    <p className="text-zinc-500 text-xs px-1 uppercase tracking-wider font-bold">Overview</p>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard icon={Users} label="Total Users" value={stats.total_users} sub={`${stats.new_users_today || 0} today`} color="bg-blue-500"/>
                        <StatCard icon={FileText} label="Total Posts" value={stats.total_posts} sub={`${stats.new_posts_today || 0} today`} color="bg-green-500"/>
                        <StatCard icon={Film} label="Total Reels" value={stats.total_reels} color="bg-purple-500"/>
                        <StatCard icon={MessageCircle} label="Total Comments" value={stats.total_comments} color="bg-yellow-500"/>
                        <StatCard icon={Heart} label="Total Likes" value={stats.total_likes} color="bg-red-500"/>
                        <StatCard icon={Users} label="Verified Users" value={stats.verified_users} sub={`${stats.pending_requests || 0} pending`} color="bg-yellow-600"/>
                    </div>

                    {stats.top_users && stats.top_users.length > 0 && <>
                        <p className="text-zinc-500 text-xs px-1 uppercase tracking-wider font-bold pt-2">Most Active Users</p>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                            {stats.top_users.map((u, i) => (
                                <div key={u.id} className={`flex items-center gap-3 px-4 py-3 ${i < stats.top_users.length - 1 ? 'border-b border-zinc-800' : ''}`}>
                                    <span className="text-zinc-600 text-sm font-bold w-5">{i+1}</span>
                                    {u.profile_pic_url
                                        ? <img src={u.profile_pic_url} className="w-8 h-8 rounded-full object-cover"/>
                                        : <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-sm font-bold">{u.username?.[0]?.toUpperCase()}</div>
                                    }
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-semibold truncate">{u.username}</p>
                                    </div>
                                    <span className="text-zinc-400 text-sm font-bold">{u.post_count} posts</span>
                                </div>
                            ))}
                        </div>
                    </>}
                </>}
            </div>
        </div>
    );
}
