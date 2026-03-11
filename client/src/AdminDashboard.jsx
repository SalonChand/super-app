import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Users, BadgeCheck, BarChart2, MessageSquareX, Flag, Settings, ChevronRight, LogOut, Zap, Globe, ShoppingBag } from 'lucide-react';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const adminId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const loginUsername = localStorage.getItem('loginUsername');
    const username = localStorage.getItem('username');
    const isAdmin = userRole === 'superadmin' || loginUsername === 'superadmin' || username === 'superadmin' || adminId === '1';
    const [stats, setStats] = useState({ users: 0, posts: 0, pending: 0, reports: 0 });

    useEffect(() => {
        if (!isAdmin) { navigate('/settings'); return; }
        fetch(`${BACKEND_URL}/api/admin/stats?adminId=${adminId}`)
            .then(r => r.json()).then(d => { if (d && !d.error) setStats(d); }).catch(() => {});
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

            <div className="max-w-2xl mx-auto px-4 pt-5 space-y-3">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                    {[
                        { label: 'Total Users', value: stats.users, color: 'text-blue-400' },
                        { label: 'Total Posts', value: stats.posts, color: 'text-green-400' },
                        { label: 'Pending', value: stats.pending, color: 'text-yellow-400' },
                    ].map(s => (
                        <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
                            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-zinc-500 text-xs mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Section Cards */}
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
