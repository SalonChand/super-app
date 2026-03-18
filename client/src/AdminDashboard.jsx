import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Users, BadgeCheck, BarChart2, MessageSquareX, Flag, Settings, ChevronRight, Zap, Globe, ShoppingBag, UserPlus, AlertTriangle, Clock } from 'lucide-react';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

function timeAgo(d) {
    if (!d) return '';
    const diff = (Date.now() - new Date(d)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const adminId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const loginUsername = localStorage.getItem('loginUsername');
    const username = localStorage.getItem('username');
    const isAdmin = userRole === 'superadmin' || loginUsername === 'superadmin' || username === 'superadmin' || adminId === '1';
    const [stats, setStats] = useState({ users: 0, posts: 0, pending: 0, reports: 0 });
    const [activity, setActivity] = useState(null);

    useEffect(() => {
        if (!isAdmin) { navigate('/settings'); return; }
        fetch(`${BACKEND_URL}/api/admin/stats?adminId=${adminId}`)
            .then(r => r.json()).then(d => { if (d && !d.error) setStats(d); }).catch(() => {});
        fetch(`${BACKEND_URL}/api/admin/recent-activity?adminId=${adminId}`)
            .then(r => r.json()).then(d => { if (d && !d.error) setActivity(d); }).catch(() => {});
    }, []);

    const sections = [
        { icon: BadgeCheck, label: 'Verification', desc: 'Approve & manage badge requests', route: '/admin/verification', color: 'from-yellow-500/20 to-yellow-600/5', border: 'border-yellow-500/30', iconColor: 'text-yellow-400', stat: stats.pending > 0 ? `${stats.pending} pending` : null, statColor: 'bg-yellow-500/20 text-yellow-400' },
        { icon: Users, label: 'User Management', desc: 'Delete, deactivate & control accounts', route: '/admin/users', color: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/30', iconColor: 'text-blue-400', stat: `${stats.users} users`, statColor: 'bg-blue-500/20 text-blue-400' },
        { icon: MessageSquareX, label: 'Content Moderation', desc: 'Delete posts, comments & reels', route: '/admin/content', color: 'from-red-500/20 to-red-600/5', border: 'border-red-500/30', iconColor: 'text-red-400', stat: `${stats.posts} posts`, statColor: 'bg-red-500/20 text-red-400' },
        { icon: Flag, label: 'Reports', desc: 'Handle reported users & content', route: '/admin/reports', color: 'from-orange-500/20 to-orange-600/5', border: 'border-orange-500/30', iconColor: 'text-orange-400', stat: stats.reports > 0 ? `${stats.reports} new` : 'All clear', statColor: stats.reports > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-zinc-800 text-zinc-500' },
        { icon: BarChart2, label: 'Platform Analytics', desc: 'Users, posts, activity stats', route: '/admin/analytics', color: 'from-green-500/20 to-green-600/5', border: 'border-green-500/30', iconColor: 'text-green-400', stat: null, statColor: '' },
        { icon: Settings, label: 'App Settings', desc: 'Control platform-wide settings', route: '/admin/app-settings', color: 'from-purple-500/20 to-purple-600/5', border: 'border-purple-500/30', iconColor: 'text-purple-400', stat: null, statColor: '' },
        { icon: Zap, label: 'Admin Powers', desc: 'Broadcast, pin posts, silence & shadowban', route: '/admin/powers', color: 'from-yellow-500/20 to-red-500/5', border: 'border-yellow-500/30', iconColor: 'text-yellow-400', stat: null, statColor: '' },
        { icon: Globe, label: 'Communities', desc: 'Manage communities, members & posts', route: '/admin/communities', color: 'from-green-500/20 to-green-600/5', border: 'border-green-500/30', iconColor: 'text-green-400', stat: null, statColor: '' },
        { icon: ShoppingBag, label: 'Marketplace', desc: 'View & remove listings, monitor activity', route: '/admin/marketplace', color: 'from-pink-500/20 to-pink-600/5', border: 'border-pink-500/30', iconColor: 'text-pink-400', stat: null, statColor: '' },
    ];

    if (!isAdmin) return null;

    const now = new Date();
    const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div className="min-h-screen bg-black pb-24">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
                <Link to="/settings" className="text-zinc-400 hover:text-white transition p-1">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                </Link>
                <div className="flex items-center gap-2 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center">
                        <Shield size={14} className="text-yellow-400"/>
                    </div>
                    <h1 className="text-white font-bold text-lg">Admin Dashboard</h1>
                </div>
                <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-3 py-1">
                    <Zap size={11} className="text-yellow-400"/>
                    <span className="text-yellow-400 text-xs font-bold">SUPERADMIN</span>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
                {/* Welcome Banner */}
                <div className="bg-gradient-to-r from-yellow-500/10 to-zinc-900 border border-yellow-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <Shield size={20} className="text-yellow-400 flex-shrink-0"/>
                    <div>
                        <p className="text-white font-bold text-sm">Welcome back, Superadmin</p>
                        <p className="text-zinc-500 text-xs">{dateStr}</p>
                    </div>
                    {stats.reports > 0 && (
                        <Link to="/admin/reports" className="ml-auto flex items-center gap-1.5 bg-orange-500/20 border border-orange-500/40 rounded-full px-3 py-1 hover:bg-orange-500/30 transition">
                            <AlertTriangle size={11} className="text-orange-400"/>
                            <span className="text-orange-400 text-xs font-bold">{stats.reports} reports</span>
                        </Link>
                    )}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: 'Total Users', value: stats.users, color: 'text-blue-400', bg: 'border-blue-500/20' },
                        { label: 'Total Posts', value: stats.posts, color: 'text-green-400', bg: 'border-green-500/20' },
                        { label: 'Pending Verif.', value: stats.pending, color: 'text-yellow-400', bg: 'border-yellow-500/20' },
                        { label: 'Open Reports', value: stats.reports, color: stats.reports > 0 ? 'text-orange-400' : 'text-zinc-500', bg: stats.reports > 0 ? 'border-orange-500/20' : 'border-zinc-800' },
                    ].map(s => (
                        <div key={s.label} className={`bg-zinc-900 border ${s.bg} rounded-2xl p-3 text-center`}>
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-zinc-500 text-xs mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Recent Activity */}
                {activity && (activity.recent_users?.length > 0 || activity.recent_reports?.length > 0 || activity.recent_verifications?.length > 0) && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                            <Clock size={14} className="text-zinc-400"/>
                            <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Recent Activity</p>
                        </div>
                        <div className="divide-y divide-zinc-800">
                            {activity.recent_verifications?.slice(0, 3).map(v => (
                                <div key={v.id} className="flex items-center gap-3 px-4 py-2.5">
                                    <BadgeCheck size={14} className="text-yellow-400 flex-shrink-0"/>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-xs font-semibold truncate">
                                            <span className="text-yellow-400">@{v.username}</span> requested {v.verify_type} verification
                                        </p>
                                        <p className="text-zinc-600 text-[10px]">{timeAgo(v.created_at)}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                                        ${v.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400'
                                        : v.status === 'approved' ? 'bg-green-500/20 text-green-400'
                                        : 'bg-red-500/20 text-red-400'}`}>{v.status}</span>
                                </div>
                            ))}
                            {activity.recent_reports?.slice(0, 2).map(r => (
                                <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                                    <Flag size={14} className="text-orange-400 flex-shrink-0"/>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-xs font-semibold truncate">
                                            Report: <span className="text-orange-400">{r.reason || 'No reason'}</span>
                                        </p>
                                        <p className="text-zinc-600 text-[10px]">{timeAgo(r.created_at)}</p>
                                    </div>
                                </div>
                            ))}
                            {activity.recent_users?.slice(0, 2).map(u => (
                                <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                                    <UserPlus size={14} className="text-blue-400 flex-shrink-0"/>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-xs font-semibold truncate">
                                            <span className="text-blue-400">@{u.username}</span> joined
                                        </p>
                                        <p className="text-zinc-600 text-[10px]">{timeAgo(u.created_at)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section Cards */}
                <p className="text-zinc-500 text-xs px-1 uppercase tracking-wider font-bold">Management</p>
                {sections.map(sec => (
                    <Link key={sec.route} to={sec.route}
                        className={`flex items-center gap-4 bg-gradient-to-r ${sec.color} border ${sec.border} rounded-2xl p-4 transition hover:scale-[1.01] active:scale-[0.99]`}>
                        <div className={`w-11 h-11 rounded-xl bg-zinc-900/80 border ${sec.border} flex items-center justify-center flex-shrink-0`}>
                            <sec.icon size={20} className={sec.iconColor}/>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm">{sec.label}</p>
                            <p className="text-zinc-500 text-xs mt-0.5">{sec.desc}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {sec.stat && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sec.statColor}`}>{sec.stat}</span>}
                            <ChevronRight size={16} className="text-zinc-600"/>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
