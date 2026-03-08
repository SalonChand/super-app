import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Eye, Heart, MessageCircle, Users, Film, TrendingUp,
    BarChart2, Activity, Star, Bell, Image as ImageIcon, Clock,
    ChevronRight, Flame, Award, Globe
} from 'lucide-react';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

// ── Mini bar chart (posts per day) ──────────────────────────────────────────
function WeekChart({ data }) {
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const today = new Date();
    const week = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        const key = d.toISOString().slice(0, 10);
        const found = data.find(r => r.day === key);
        return { label: days[d.getDay() === 0 ? 6 : d.getDay() - 1], count: found ? Number(found.count) : 0 };
    });
    const max = Math.max(...week.map(w => w.count), 1);
    return (
        <div className="flex items-end gap-1.5 h-16">
            {week.map((w, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max((w.count / max) * 52, w.count > 0 ? 8 : 2)}px`, backgroundColor: w.count > 0 ? '#3b82f6' : '#27272a', opacity: w.count > 0 ? 1 : 0.4 }} />
                    <span className="text-[9px] text-zinc-600 font-medium">{w.label}</span>
                </div>
            ))}
        </div>
    );
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = '#3b82f6', delay = 0 }) {
    const [displayed, setDisplayed] = useState(0);
    useEffect(() => {
        const target = Number(value) || 0;
        if (target === 0) return;
        let start = 0;
        const step = Math.ceil(target / 30);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setDisplayed(target); clearInterval(timer); }
            else setDisplayed(start);
        }, 30);
        return () => clearInterval(timer);
    }, [value]);

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2 hover:border-zinc-700 transition-all" style={{ animationDelay: `${delay}ms` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '20' }}>
                <span style={{ color }}>{icon}</span>
            </div>
            <div>
                <p className="text-2xl font-bold text-white tabular-nums">{displayed.toLocaleString()}</p>
                <p className="text-zinc-400 text-xs font-medium mt-0.5">{label}</p>
                {sub && <p className="text-zinc-600 text-[11px] mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ── Activity item ─────────────────────────────────────────────────────────────
function ActivityItem({ item }) {
    const icons = {
        like: <Heart size={13} className="text-red-400 fill-red-400" />,
        comment: <MessageCircle size={13} className="text-blue-400" />,
        friend_request: <Users size={13} className="text-green-400" />,
        mention: <span className="text-purple-400 text-xs font-bold">@</span>,
        message: <MessageCircle size={13} className="text-zinc-400" />,
    };
    const timeAgo = (dateStr) => {
        const diff = (Date.now() - new Date(dateStr)) / 1000;
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
        return `${Math.floor(diff/86400)}d ago`;
    };
    return (
        <div className="flex items-center gap-3 py-3 border-b border-zinc-800/60 last:border-0">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700 flex-shrink-0">
                {item.profile_pic_url
                    ? <img src={item.profile_pic_url} className="w-full h-full object-cover" alt="" />
                    : <span className="flex items-center justify-center h-full text-zinc-400 text-sm font-bold">{item.username?.charAt(0).toUpperCase()}</span>}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-white text-sm">
                    <span className="font-semibold">@{item.username}</span>
                    <span className="text-zinc-400"> {item.content}</span>
                </p>
                <p className="text-zinc-600 text-xs mt-0.5">{timeAgo(item.created_at)}</p>
            </div>
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                {icons[item.type] || <Bell size={13} className="text-zinc-500" />}
            </div>
        </div>
    );
}

// ── Top Post row ─────────────────────────────────────────────────────────────
function TopPostRow({ post, rank }) {
    const rankColors = ['text-yellow-400', 'text-zinc-300', 'text-orange-400'];
    const rankBg = ['bg-yellow-400/10', 'bg-zinc-300/10', 'bg-orange-400/10'];
    return (
        <div className="flex items-center gap-3 py-3 border-b border-zinc-800/50 last:border-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${rankColors[rank] || 'text-zinc-500'} ${rankBg[rank] || 'bg-zinc-800'}`}>
                {rank + 1}
            </div>
            {post.image_url
                ? <img src={post.image_url} className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-zinc-700" alt="" />
                : <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0"><ImageIcon size={16} className="text-zinc-600" /></div>}
            <p className="flex-1 text-zinc-300 text-sm truncate">{post.content || '📎 Media post'}</p>
            <div className="flex items-center gap-3 flex-shrink-0 text-zinc-500 text-xs">
                <span className="flex items-center gap-1"><Eye size={12}/>{Number(post.view_count).toLocaleString()}</span>
                <span className="flex items-center gap-1"><Heart size={12}/>{Number(post.like_count).toLocaleString()}</span>
            </div>
        </div>
    );
}

// ── Top Reel row ─────────────────────────────────────────────────────────────
function TopReelRow({ reel, rank }) {
    return (
        <div className="flex items-center gap-3 py-3 border-b border-zinc-800/50 last:border-0">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                <Film size={16} className="text-zinc-500" />
            </div>
            <p className="flex-1 text-zinc-300 text-sm truncate">{reel.caption || '🎬 Reel'}</p>
            <div className="flex items-center gap-1 text-red-400 text-xs flex-shrink-0">
                <Heart size={12} className="fill-red-400" />{Number(reel.like_count).toLocaleString()}
            </div>
        </div>
    );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function UserDashboard({ themeColor = '#3b82f6' }) {
    const navigate = useNavigate();
    const userId = localStorage.getItem('userId');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview'); // overview | posts | reels | activity

    useEffect(() => {
        if (!userId) return;
        axios.get(`${BACKEND_URL}/api/users/${userId}/dashboard`)
            .then(r => setData(r.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: <BarChart2 size={15}/> },
        { id: 'posts',    label: 'Posts',    icon: <ImageIcon size={15}/> },
        { id: 'reels',    label: 'Reels',    icon: <Film size={15}/> },
        { id: 'activity', label: 'Activity', icon: <Activity size={15}/> },
    ];

    // Engagement rate
    const engagementRate = data
        ? data.post_stats.total_views > 0
            ? (((Number(data.post_stats.total_likes) + Number(data.post_stats.total_comments)) / Number(data.post_stats.total_views)) * 100).toFixed(1)
            : '0.0'
        : '0.0';

    return (
        <div className="min-h-screen bg-black flex flex-col">

            {/* ── Header ── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="text-zinc-400 hover:text-white transition p-1 -ml-1">
                    <ArrowLeft size={22} />
                </button>
                <div className="flex-1">
                    <h1 className="text-white font-bold text-lg leading-none">Dashboard</h1>
                    <p className="text-zinc-500 text-xs mt-0.5">Your activity & analytics</p>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: themeColor + '20' }}>
                    <TrendingUp size={16} style={{ color: themeColor }} />
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex border-b border-zinc-800 bg-zinc-950/60 sticky top-[57px] z-10 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-semibold border-b-2 flex-shrink-0 transition-all ${tab === t.id ? 'border-current text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                        style={tab === t.id ? { borderColor: themeColor, color: themeColor } : {}}>
                        {t.icon}{t.label}
                    </button>
                ))}
            </div>

            {/* ── Loading ── */}
            {loading && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-zinc-600">
                        <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
                        <p className="text-sm">Loading dashboard…</p>
                    </div>
                </div>
            )}

            {/* ── Content ── */}
            {!loading && data && (
                <div className="flex-1 overflow-y-auto pb-20">

                    {/* ══ OVERVIEW TAB ══ */}
                    {tab === 'overview' && (
                        <div className="p-4 flex flex-col gap-4">

                            {/* Hero engagement score */}
                            <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${themeColor}25 0%, ${themeColor}08 100%)`, border: `1px solid ${themeColor}30` }}>
                                <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-10" style={{ backgroundColor: themeColor }} />
                                <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">Engagement Rate</p>
                                <p className="text-5xl font-black text-white">{engagementRate}<span className="text-2xl text-zinc-500">%</span></p>
                                <p className="text-zinc-500 text-xs mt-2">Based on all-time post views vs interactions</p>
                                <div className="mt-3 flex items-center gap-2">
                                    <Flame size={14} style={{ color: themeColor }} />
                                    <span className="text-sm font-semibold" style={{ color: themeColor }}>
                                        {Number(engagementRate) > 5 ? 'Great performance!' : Number(engagementRate) > 2 ? 'Good engagement' : 'Keep posting!'}
                                    </span>
                                </div>
                            </div>

                            {/* Stat grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <StatCard icon={<Eye size={18}/>} label="Post Views" value={data.post_stats.total_views} color={themeColor} delay={0} />
                                <StatCard icon={<Heart size={18}/>} label="Post Likes" value={data.post_stats.total_likes} color="#ef4444" delay={50} />
                                <StatCard icon={<MessageCircle size={18}/>} label="Comments" value={data.post_stats.total_comments} color="#8b5cf6" delay={100} />
                                <StatCard icon={<Users size={18}/>} label="Friends" value={data.friend_count} color="#10b981" delay={150} />
                                <StatCard icon={<Globe size={18}/>} label="Profile Visits" value={data.profile_visits_30d} sub="Last 30 days" color="#f59e0b" delay={200} />
                                <StatCard icon={<Film size={18}/>} label="Reel Likes" value={data.reel_stats.total_likes} color="#ec4899" delay={250} />
                            </div>

                            {/* Posts this week chart */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-white font-bold text-sm">Posts This Week</p>
                                    <span className="text-zinc-500 text-xs">{data.posts_last_7d.reduce((s, d) => s + Number(d.count), 0)} posts</span>
                                </div>
                                <WeekChart data={data.posts_last_7d} />
                            </div>

                            {/* Quick stats row */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Total Posts', value: data.post_stats.post_count, icon: <ImageIcon size={14}/>, color: themeColor },
                                    { label: 'Total Reels', value: data.reel_stats.reel_count, icon: <Film size={14}/>, color: '#ec4899' },
                                    { label: 'Avg. Likes', value: data.post_stats.post_count > 0 ? Math.round(data.post_stats.total_likes / data.post_stats.post_count) : 0, icon: <Heart size={14}/>, color: '#ef4444' },
                                ].map((s, i) => (
                                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
                                        <div className="flex justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
                                        <p className="text-white font-black text-xl">{Number(s.value).toLocaleString()}</p>
                                        <p className="text-zinc-600 text-[11px] mt-0.5">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ══ POSTS TAB ══ */}
                    {tab === 'posts' && (
                        <div className="p-4 flex flex-col gap-4">
                            {/* Stats row */}
                            <div className="grid grid-cols-2 gap-3">
                                <StatCard icon={<Eye size={18}/>} label="Total Views" value={data.post_stats.total_views} color={themeColor} />
                                <StatCard icon={<Heart size={18}/>} label="Total Likes" value={data.post_stats.total_likes} color="#ef4444" />
                                <StatCard icon={<MessageCircle size={18}/>} label="Comments" value={data.post_stats.total_comments} color="#8b5cf6" />
                                <StatCard icon={<ImageIcon size={18}/>} label="Total Posts" value={data.post_stats.post_count} color={themeColor} />
                            </div>

                            {/* Top performing posts */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                                <div className="px-4 py-3.5 border-b border-zinc-800 flex items-center gap-2">
                                    <Award size={15} style={{ color: themeColor }} />
                                    <p className="text-white font-bold text-sm">Top Performing Posts</p>
                                </div>
                                {data.top_posts.length === 0
                                    ? <p className="text-zinc-600 text-sm text-center py-8">No posts yet</p>
                                    : <div className="px-4">{data.top_posts.map((p, i) => <TopPostRow key={p.id} post={p} rank={i} />)}</div>}
                            </div>

                            {/* Post activity bar */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                                <p className="text-white font-bold text-sm mb-4">Activity This Week</p>
                                <WeekChart data={data.posts_last_7d} />
                            </div>
                        </div>
                    )}

                    {/* ══ REELS TAB ══ */}
                    {tab === 'reels' && (
                        <div className="p-4 flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-3">
                                <StatCard icon={<Film size={18}/>} label="Total Reels" value={data.reel_stats.reel_count} color="#ec4899" />
                                <StatCard icon={<Heart size={18}/>} label="Total Likes" value={data.reel_stats.total_likes} color="#ef4444" />
                            </div>

                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                                <div className="px-4 py-3.5 border-b border-zinc-800 flex items-center gap-2">
                                    <Star size={15} className="text-yellow-400" />
                                    <p className="text-white font-bold text-sm">Top Reels</p>
                                </div>
                                {data.top_reels.length === 0
                                    ? <p className="text-zinc-600 text-sm text-center py-8">No reels yet</p>
                                    : <div className="px-4">{data.top_reels.map((r, i) => <TopReelRow key={r.id} reel={r} rank={i} />)}</div>}
                            </div>

                            {data.reel_stats.reel_count === 0 && (
                                <div className="flex flex-col items-center gap-3 py-8 text-center">
                                    <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                        <Film size={28} className="text-zinc-600" />
                                    </div>
                                    <p className="text-zinc-400 font-semibold">No reels yet</p>
                                    <p className="text-zinc-600 text-sm max-w-[220px]">Upload your first reel to start tracking performance here</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══ ACTIVITY TAB ══ */}
                    {tab === 'activity' && (
                        <div className="p-4 flex flex-col gap-4">

                            {/* Summary row */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Profile Visits', value: data.profile_visits_30d, color: '#f59e0b', sub: '30d' },
                                    { label: 'Interactions', value: Number(data.post_stats.total_likes) + Number(data.post_stats.total_comments), color: '#ef4444', sub: 'all time' },
                                    { label: 'Friends', value: data.friend_count, color: '#10b981', sub: 'total' },
                                ].map((s, i) => (
                                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
                                        <p className="text-white font-black text-xl" style={{ color: s.color }}>{Number(s.value).toLocaleString()}</p>
                                        <p className="text-zinc-400 text-[11px] font-semibold mt-0.5">{s.label}</p>
                                        <p className="text-zinc-600 text-[10px]">{s.sub}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Recent activity feed */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                                <div className="px-4 py-3.5 border-b border-zinc-800 flex items-center gap-2">
                                    <Activity size={15} style={{ color: themeColor }} />
                                    <p className="text-white font-bold text-sm">Recent Activity</p>
                                </div>
                                {data.recent_activity.length === 0
                                    ? (
                                        <div className="flex flex-col items-center py-10 text-zinc-600">
                                            <Bell size={28} className="mb-3 opacity-40" />
                                            <p className="text-sm">No recent activity</p>
                                        </div>
                                    )
                                    : <div className="px-4">{data.recent_activity.map((a, i) => <ActivityItem key={i} item={a} />)}</div>
                                }
                            </div>
                        </div>
                    )}

                </div>
            )}

            {/* Empty/error state */}
            {!loading && !data && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-600 p-8 text-center">
                    <BarChart2 size={40} className="opacity-30" />
                    <p className="font-semibold text-zinc-400">Couldn't load dashboard</p>
                    <p className="text-sm">Check your connection and try again</p>
                </div>
            )}
        </div>
    );
}
