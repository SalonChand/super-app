import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, User, FileText, Users, BadgeCheck, Sparkles } from 'lucide-react';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

const FILTERS = [
    { key: 'people',      label: 'People',      Icon: User },
    { key: 'posts',       label: 'Posts',       Icon: FileText },
    { key: 'communities', label: 'Communities', Icon: Users },
];

const VERIFY_STYLES = {
    red:    { color: 'text-red-500',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    label: 'Platform Owner',     glow: '0 0 12px rgba(239,68,68,0.4)' },
    yellow: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'Celebrity',          glow: '0 0 12px rgba(234,179,8,0.4)' },
    green:  { color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  label: 'Verified Politician', glow: '0 0 12px rgba(34,197,94,0.4)' },
    blue:   { color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   label: 'Verified Account',   glow: '0 0 12px rgba(59,130,246,0.4)' },
};

function VerifiedBadge({ isVerified, verifyType, size = 14 }) {
    if (!isVerified) return null;
    const t = verifyType || 'blue';
    const style = t === 'red' ? { filter: 'drop-shadow(0 0 3px rgba(239,68,68,0.7))' } : {};
    return <BadgeCheck size={size} className={`flex-shrink-0 ${VERIFY_STYLES[t]?.color || 'text-blue-400'}`} style={style}/>;
}

function Search() {
    const currentUserId = localStorage.getItem('userId');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [filter, setFilter] = useState('people');
    const [verifiedUsers, setVerifiedUsers] = useState([]);
    const debounceRef = useRef(null);

    useEffect(() => {
        axios.get(`${BACKEND_URL}/api/search?q=&userId=${currentUserId}&filter=people`)
            .then(res => {
                const all = Array.isArray(res.data) ? res.data : [];
                setVerifiedUsers(all.filter(u => u.is_verified));
            }).catch(() => {});
    }, []);

    const doSearch = async (q, f) => {
        if (!q.trim()) { setResults([]); return; }
        try {
            const res = await axios.get(`${BACKEND_URL}/api/search?q=${encodeURIComponent(q)}&userId=${currentUserId}&filter=${f}`);
            setResults(Array.isArray(res.data) ? res.data : []);
        } catch { setResults([]); }
    };

    const handleSearch = (e) => {
        const val = e.target.value;
        setQuery(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(val, filter), 300);
    };

    const switchFilter = (f) => {
        setFilter(f);
        setResults([]);
        if (query.trim()) doSearch(query, f);
    };

    return (
        <div className="w-full bg-black min-h-screen pb-20 sm:pb-0 animate-fade-in">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-10 flex items-center gap-3 backdrop-blur-md">
                <SearchIcon className="text-zinc-400 flex-shrink-0" size={22} />
                <input
                    type="text"
                    placeholder={`Search ${filter}...`}
                    value={query}
                    onChange={handleSearch}
                    className="w-full bg-transparent text-white text-lg outline-none placeholder-zinc-600"
                    autoFocus
                />
            </div>

            <div className="flex border-b border-zinc-800 bg-zinc-950/60 sticky top-[72px] z-10">
                {FILTERS.map(({ key, label, Icon }) => (
                    <button
                        key={key}
                        onClick={() => switchFilter(key)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition border-b-2 ${
                            filter === key ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        <Icon size={15} />
                        {label}
                    </button>
                ))}
            </div>

            <div className="p-4 space-y-4">

                {/* ✨ VERIFIED USERS SECTION — shown when no search query and on people tab */}
                {!query && filter === 'people' && verifiedUsers.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={15} className="text-yellow-400"/>
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Verified & Notable</h3>
                        </div>
                        <div className="space-y-2">
                            {verifiedUsers.map(user => {
                                const t = user.verify_type || 'blue';
                                const vs = VERIFY_STYLES[t] || VERIFY_STYLES.blue;
                                return (
                                    <Link key={user.id} to={`/profile/${user.id}`}
                                        className={`flex items-center gap-3 p-3 rounded-xl ${vs.bg} border ${vs.border} hover:brightness-110 transition`}
                                        style={{ boxShadow: vs.glow }}>
                                        <div className="relative flex-shrink-0">
                                            <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center border-2 ${vs.border}`}>
                                                {user.profile_pic_url
                                                    ? <img src={user.profile_pic_url} className="w-full h-full object-cover" />
                                                    : <User className="text-zinc-400" size={22}/>}
                                            </div>
                                            <div className={`absolute -bottom-1 -right-1 rounded-full p-0.5 bg-black`}>
                                                <VerifiedBadge isVerified={true} verifyType={t} size={14}/>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <h4 className="font-bold text-white truncate">{user.username}</h4>
                                            </div>
                                            <p className={`text-xs font-semibold ${vs.color}`}>{vs.label}</p>
                                        </div>
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${vs.bg} ${vs.color} border ${vs.border}`}>
                                            View
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                        <div className="border-t border-zinc-800 mt-4 pt-1"/>
                    </div>
                )}

                {query !== '' && results.length === 0 && (
                    <p className="text-zinc-500 text-center mt-10">No {filter} found for "{query}".</p>
                )}

                {filter === 'people' && results.map(user => (
                    <Link key={user.id} to={`/profile/${user.id}`} className="flex items-center gap-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition">
                        <div className="w-12 h-12 rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center">
                            {user.profile_pic_url ? <img src={user.profile_pic_url} className="w-full h-full object-cover" /> : <User className="text-zinc-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-white truncate">{user.username}</h4>
                                <VerifiedBadge isVerified={!!user.is_verified} verifyType={user.verify_type} size={14}/>
                            </div>
                            <p className="text-sm text-zinc-500">View Profile</p>
                        </div>
                    </Link>
                ))}

                {filter === 'posts' && results.map(post => (
                    <div key={post.id} className={`p-4 rounded-xl border ${post.is_verified ? 'bg-zinc-900 border-blue-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <Link to={`/profile/${post.user_id}`} className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {post.profile_pic_url ? <img src={post.profile_pic_url} className="w-full h-full object-cover" /> : <User size={14} className="text-zinc-500" />}
                            </Link>
                            <div className="flex items-center gap-1">
                                <Link to={`/profile/${post.user_id}`} className="font-semibold text-white text-sm hover:underline">{post.username}</Link>
                                <VerifiedBadge isVerified={!!post.is_verified} verifyType={post.verify_type} size={13}/>
                            </div>
                            <span className="text-zinc-600 text-xs ml-auto">{new Date(post.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <p className="text-zinc-200 text-sm line-clamp-3">{post.content}</p>
                        {post.image_url && <img src={post.image_url} className="mt-2 rounded-lg max-h-40 w-full object-cover" />}
                        <p className="text-zinc-500 text-xs mt-2">{post.like_count} likes · {post.comment_count} comments</p>
                    </div>
                ))}

                {filter === 'communities' && results.map(comm => (
                    <Link key={comm.id} to="/communities" className="flex items-center gap-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition">
                        <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center">
                            {comm.banner_url ? <img src={comm.banner_url} className="w-full h-full object-cover" /> : <Users size={22} className="text-zinc-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-white truncate">{comm.name}</h4>
                            {comm.description && <p className="text-sm text-zinc-500 truncate">{comm.description}</p>}
                            <p className="text-xs text-zinc-600">{comm.member_count} members</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export default Search;
