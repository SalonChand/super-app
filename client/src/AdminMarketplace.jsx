import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Trash2, ShoppingBag, Search, X, AlertTriangle } from 'lucide-react';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

function safeParseImages(images) {
    if (!images) return [];
    if (Array.isArray(images)) return images;
    try { const p = JSON.parse(images); return Array.isArray(p) ? p : []; } catch { return []; }
}

export default function AdminMarketplace() {
    const navigate = useNavigate();
    const adminId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const loginUsername = localStorage.getItem('loginUsername');
    const username = localStorage.getItem('username');
    const isAdmin = userRole === 'superadmin' || loginUsername === 'superadmin' || username === 'superadmin' || adminId === '1';

    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [stats, setStats] = useState({ total: 0, categories: {} });

    useEffect(() => {
        if (!isAdmin) { navigate('/settings'); return; }
        fetchListings();
    }, [search, category]);

    const fetchListings = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ adminId, q: search, category });
            const res = await fetch(`${BACKEND_URL}/api/admin/marketplace?${params}`);
            const data = await res.json();
            setListings(Array.isArray(data) ? data : []);
            // Compute stats
            const cats = {};
            data.forEach(l => { cats[l.category] = (cats[l.category] || 0) + 1; });
            setStats({ total: data.length, categories: cats });
        } catch { setListings([]); }
        setLoading(false);
    };

    const deleteListing = async (id) => {
        try {
            await fetch(`${BACKEND_URL}/api/admin/marketplace/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId })
            });
            setListings(prev => prev.filter(l => l.id !== id));
            setConfirmDelete(null);
        } catch { alert('Failed to delete'); }
    };

    const categories = ['Electronics', 'Vehicles', 'Fashion', 'Art', 'Books', 'Furniture', 'Sports', 'Other'];

    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-black pb-24">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
                <Link to="/admin" className="text-zinc-400 hover:text-white transition p-1">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                </Link>
                <div className="flex items-center gap-2 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center">
                        <ShoppingBag size={14} className="text-pink-400"/>
                    </div>
                    <h1 className="text-white font-bold text-lg">Marketplace Admin</h1>
                </div>
                <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-3 py-1">
                    <Shield size={11} className="text-yellow-400"/>
                    <span className="text-yellow-400 text-xs font-bold">ADMIN</span>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
                        <p className="text-2xl font-bold text-pink-400">{stats.total}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">Total Listings</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
                        <p className="text-2xl font-bold text-blue-400">{Object.keys(stats.categories).length}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">Categories Active</p>
                    </div>
                </div>

                {/* Category breakdown */}
                {Object.keys(stats.categories).length > 0 && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
                        <p className="text-xs text-zinc-500 uppercase font-bold mb-2">By Category</p>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(stats.categories).map(([cat, count]) => (
                                <span key={cat} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-full">
                                    {cat}: <span className="text-white font-bold">{count}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search & Filter */}
                <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
                        <Search size={16} className="text-zinc-500 flex-shrink-0"/>
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search listings..."
                            className="bg-transparent text-white text-sm outline-none w-full placeholder-zinc-600"/>
                        {search && <button onClick={() => setSearch('')}><X size={14} className="text-zinc-500"/></button>}
                    </div>
                    <select value={category} onChange={e => setCategory(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm outline-none">
                        <option value="">All</option>
                        {categories.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                    </select>
                </div>

                {/* Listings */}
                {loading ? (
                    <div className="text-center py-10 text-zinc-500 animate-pulse">Loading...</div>
                ) : listings.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500">No listings found</div>
                ) : (
                    <div className="space-y-3">
                        {listings.map(listing => {
                            const images = safeParseImages(listing.images);
                            return (
                                <div key={listing.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                                    <div className="flex gap-3 p-3">
                                        {/* Image */}
                                        <div className="w-20 h-20 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
                                            {images[0] ? (
                                                <img src={`${BACKEND_URL}${images[0]}`} className="w-full h-full object-cover"/>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ShoppingBag size={24} className="text-zinc-600"/>
                                                </div>
                                            )}
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-white font-bold text-sm truncate">{listing.title}</p>
                                                    <p className="text-pink-400 font-bold text-sm">NPR {Number(listing.price).toLocaleString()}</p>
                                                </div>
                                                <button onClick={() => setConfirmDelete(listing)}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg p-1.5 transition flex-shrink-0">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{listing.category}</span>
                                                <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{listing.condition_type}</span>
                                            </div>
                                            <p className="text-zinc-500 text-xs mt-1">
                                                By <span className="text-zinc-300">{listing.username || `User #${listing.seller_id}`}</span>
                                                {listing.location && ` · ${listing.location}`}
                                            </p>
                                        </div>
                                    </div>
                                    {listing.description && (
                                        <div className="px-3 pb-3">
                                            <p className="text-zinc-500 text-xs line-clamp-2">{listing.description}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Confirm Delete Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                <AlertTriangle size={20} className="text-red-400"/>
                            </div>
                            <div>
                                <p className="text-white font-bold">Delete Listing?</p>
                                <p className="text-zinc-500 text-xs">This cannot be undone</p>
                            </div>
                        </div>
                        <p className="text-zinc-300 text-sm mb-4">"{confirmDelete.title}"</p>
                        <div className="flex gap-2">
                            <button onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-bold hover:bg-zinc-700 transition">
                                Cancel
                            </button>
                            <button onClick={() => deleteListing(confirmDelete.id)}
                                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
