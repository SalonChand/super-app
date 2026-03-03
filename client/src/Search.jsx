import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, User } from 'lucide-react';

const BACKEND_URL = `http://${window.location.hostname}:5000`;

function Search() {
    const currentUserId = localStorage.getItem('userId');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);

    const handleSearch = async (e) => {
        const searchTerm = e.target.value;
        setQuery(searchTerm);
        if (searchTerm.trim() === '') { setResults([]); return; }
        try {
            const res = await axios.get(`${BACKEND_URL}/api/search?q=${searchTerm}&userId=${currentUserId}`);
            setResults(res.data);
        } catch (error) { console.error(error); }
    };

    return (
        <div className="w-full bg-black min-h-screen pb-20 sm:pb-0 animate-fade-in">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-10 flex items-center gap-3">
                <SearchIcon className="text-zinc-400" size={24} />
                <input type="text" placeholder="Search users..." value={query} onChange={handleSearch} className="w-full bg-transparent text-white text-lg outline-none placeholder-zinc-600" autoFocus />
            </div>
            <div className="p-4 space-y-2">
                {query !== '' && results.length === 0 && <p className="text-zinc-500 text-center mt-10">No users found.</p>}
                {results.map((user) => (
                    <Link key={user.id} to={`/profile/${user.id}`} className="flex items-center gap-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition">
                        <div className="w-12 h-12 rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center">
                            {user.profile_pic_url ? <img src={`${BACKEND_URL}${user.profile_pic_url}`} className="w-full h-full object-cover" /> : <User className="text-zinc-400" />}
                        </div>
                        <div><h4 className="font-bold text-white">{user.username}</h4><p className="text-sm text-zinc-500">View Profile</p></div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
export default Search;