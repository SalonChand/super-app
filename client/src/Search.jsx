import { useState, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, User, FileText, Users, BadgeCheck } from 'lucide-react';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

function VerifiedBadge({ isVerified, verifyType, size = 14 }) {
    if (!isVerified) return null;
    const t = verifyType || 'blue';
    const colors = { red: 'text-red-500', green: 'text-green-500', yellow: 'text-yellow-400', blue: 'text-blue-400' };
    const style = t === 'red' ? { filter: 'drop-shadow(0 0 3px rgba(239,68,68,0.7))' } : {};
    return <BadgeCheck size={size} className={`flex-shrink-0 ${colors[t] || colors.blue}`} style={style}/>;
}

const FILTERS = [
    { key: 'people',      label: 'People',      Icon: User },
    { key: 'posts',       label: 'Posts',       Icon: FileText },
    { key: 'communities', label: 'Communities', Icon: Users },
];

function Search() {
    const currentUserId = localStorage.getItem('userId');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [filter, setFilter] = useState('people');
    const debounceRef = useRef(null);

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

            <div className="p-4 space-y-2">
                {query !== '' && results.length === 0 && (
                    <p className="text-zinc-500 text-center mt-10">No {filter} found for "{query}".</p>
                )}

                {filter === 'people' && results.map(user => (
                    <Link key={user.id} to={`/profile/${user.id}`} className="flex items-center gap-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition">
                        <div className="w-12 h-12 rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {user.profile_pic_url ? <img src={user.profile_pic_url} className="w-full h-full object-cover" /> : <User className="text-zinc-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-white truncate">{user.username}</h4>
                                <VerifiedBadge isVerified={!!user.is_verified} verifyType={user.verify_type} size={15}/>
                            </div>
                            <p className="text-sm text-zinc-500">@{user.username.toLowerCase()}</p>
                        </div>
                    </Link>
                ))}

                {filter === 'posts' && results.map(post => (
                    <div key={post.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                        <div className="flex items-center gap-2 mb-2">
                            <Link to={`/profile/${post.user_id}`} className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {post.profile_pic_url ? <img src={post.profile_pic_url} className="w-full h-full object-cover" /> : <User size={14} className="text-zinc-500" />}
                            </Link>
                            <Link to={`/profile/${post.user_id}`} className="font-semibold text-white text-sm hover:underline flex items-center gap-1">{post.username}<VerifiedBadge isVerified={!!post.is_verified} verifyType={post.verify_type} size={13}/></Link>
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
