import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Plus, X, Tag, MapPin, ChevronDown, Heart, MessageCircle, Share2, Filter, Sparkles, Package, ShoppingBag, Laptop, Car, Home, Music, BookOpen, Shirt, Dumbbell, Camera, MoreHorizontal, Check, Edit2, Trash2, Eye, Star, Upload, ChevronLeft, ChevronRight, Palette } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

const CATEGORIES = [
    { key: 'all',        label: 'All',         Icon: Sparkles },
    { key: 'electronics',label: 'Electronics', Icon: Laptop },
    { key: 'vehicles',   label: 'Vehicles',    Icon: Car },
    { key: 'property',   label: 'Property',    Icon: Home },
    { key: 'fashion',    label: 'Fashion',      Icon: Shirt },
    { key: 'music',      label: 'Music',        Icon: Music },
    { key: 'books',      label: 'Books',        Icon: BookOpen },
    { key: 'sports',     label: 'Sports',       Icon: Dumbbell },
    { key: 'photography',label: 'Photography',  Icon: Camera },
    { key: 'art',        label: 'Art',           Icon: Palette },
    { key: 'other',      label: 'Other',        Icon: Package },
];

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'For Parts'];

function VerifiedBadge({ isVerified, verifyType, size = 13 }) {
    if (!isVerified) return null;
    const colors = { red: 'text-red-500', green: 'text-green-500', yellow: 'text-yellow-400', blue: 'text-blue-400' };
    const t = verifyType || 'blue';
    return <span className={`inline-flex ${colors[t] || colors.blue}`}>✓</span>;
}

function formatPrice(p) {
    if (!p || p === 0) return 'Free';
    return `$${Number(p).toLocaleString()}`;
}

function timeAgo(date) {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
}

export default function Marketplace({ themeColor = '#3b82f6' }) {
    const userId = localStorage.getItem('userId');
    const navigate = useNavigate();

    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('all');
    const [searchQ, setSearchQ] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [showCreate, setShowCreate] = useState(false);
    const [viewListing, setViewListing] = useState(null);
    const [myListings, setMyListings] = useState(false);
    const [savedIds, setSavedIds] = useState(new Set());
    const [imgIndex, setImgIndex] = useState(0);
    const searchRef = useRef(null);

    // Create form state
    const [form, setForm] = useState({ title: '', description: '', price: '', category: 'other', condition: 'Good', location: '' });
    const [formImages, setFormImages] = useState([]);
    const [formPreviews, setFormPreviews] = useState([]);
    const [creating, setCreating] = useState(false);
    const [menuOpen, setMenuOpen] = useState(null);

    const fetchListings = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ userId, sort: sortBy });
            if (category !== 'all') params.set('category', category);
            if (searchQ) params.set('q', searchQ);
            if (myListings) params.set('mine', '1');
            const res = await axios.get(`${BACKEND_URL}/api/marketplace?${params}`);
            setListings(Array.isArray(res.data) ? res.data : []);
        } catch { setListings([]); }
        setLoading(false);
    };

    useEffect(() => { fetchListings(); }, [category, searchQ, sortBy, myListings]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearchQ(searchInput);
    };

    const handleImagePick = (e) => {
        const files = Array.from(e.target.files).slice(0, 5);
        setFormImages(files);
        setFormPreviews(files.map(f => URL.createObjectURL(f)));
    };

    const submitListing = async () => {
        if (!form.title.trim() || !form.price) return;
        setCreating(true);
        try {
            const fd = new FormData();
            fd.append('userId', userId);
            fd.append('title', form.title);
            fd.append('description', form.description);
            fd.append('price', form.price);
            fd.append('category', form.category);
            fd.append('condition', form.condition);
            fd.append('location', form.location);
            formImages.forEach(img => fd.append('images', img));
            await axios.post(`${BACKEND_URL}/api/marketplace`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setShowCreate(false);
            setForm({ title: '', description: '', price: '', category: 'other', condition: 'Good', location: '' });
            setFormImages([]); setFormPreviews([]);
            fetchListings();
        } catch(e) { alert(e.response?.data?.error || 'Failed to create listing'); }
        setCreating(false);
    };

    const deleteListing = async (id) => {
        if (!window.confirm('Delete this listing?')) return;
        try {
            await axios.delete(`${BACKEND_URL}/api/marketplace/${id}`, { data: { userId } });
            setListings(l => l.filter(x => x.id !== id));
            if (viewListing?.id === id) setViewListing(null);
        } catch {}
    };

    const toggleSave = (id) => {
        setSavedIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    const contactSeller = (listing) => {
        navigate(`/chat?userId=${listing.seller_id}`);
    };

    return (
        <div className="w-full min-h-screen bg-black pb-20 sm:pb-0">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800">
                <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                    <ShoppingBag size={22} className="text-yellow-400 flex-shrink-0"/>
                    <h1 className="text-white font-bold text-xl flex-1">Marketplace</h1>
                    <button
                        onClick={() => setMyListings(m => !m)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${myListings ? 'bg-yellow-400/15 border-yellow-400/40 text-yellow-400' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'}`}
                    >My Listings</button>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm px-3 py-1.5 rounded-full transition"
                    ><Plus size={16}/> Sell</button>
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="px-4 pb-3 flex gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
                        <Search size={16} className="text-zinc-500 flex-shrink-0"/>
                        <input
                            ref={searchRef}
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            placeholder="Search listings..."
                            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-zinc-600"
                        />
                        {searchInput && <button type="button" onClick={() => { setSearchInput(''); setSearchQ(''); }}><X size={14} className="text-zinc-500"/></button>}
                    </div>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs rounded-xl px-2 outline-none">
                        <option value="newest">Newest</option>
                        <option value="price_asc">Price ↑</option>
                        <option value="price_desc">Price ↓</option>
                    </select>
                </form>

                {/* Categories */}
                <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
                    {CATEGORIES.map(({ key, label, Icon }) => (
                        <button
                            key={key}
                            onClick={() => setCategory(key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex-shrink-0 border ${
                                category === key
                                    ? 'bg-yellow-400 text-black border-yellow-400'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                            }`}
                        >
                            <Icon size={12}/> {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Listings Grid */}
            <div className="p-3">
                {loading && (
                    <div className="grid grid-cols-2 gap-3">
                        {[1,2,3,4,5,6].map(i => (
                            <div key={i} className="bg-zinc-900 rounded-2xl overflow-hidden animate-pulse">
                                <div className="aspect-square bg-zinc-800"/>
                                <div className="p-3 space-y-2">
                                    <div className="h-3 bg-zinc-800 rounded w-3/4"/>
                                    <div className="h-3 bg-zinc-800 rounded w-1/2"/>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && listings.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <ShoppingBag size={48} className="text-zinc-700 mb-4"/>
                        <p className="text-zinc-500 font-semibold">No listings found</p>
                        <p className="text-zinc-600 text-sm mt-1">Be the first to sell something!</p>
                        <button onClick={() => setShowCreate(true)} className="mt-4 bg-yellow-400 text-black font-bold px-6 py-2 rounded-full text-sm hover:bg-yellow-300 transition">+ List Item</button>
                    </div>
                )}

                {!loading && listings.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                        {listings.map(listing => {
                            const imgs = listing.images ? JSON.parse(listing.images) : [];
                            const isSaved = savedIds.has(listing.id);
                            const isOwner = String(listing.seller_id) === String(userId);
                            return (
                                <div key={listing.id} className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition cursor-pointer group" onClick={() => { setViewListing(listing); setImgIndex(0); }}>
                                    {/* Image */}
                                    <div className="aspect-square bg-zinc-800 relative overflow-hidden">
                                        {imgs.length > 0
                                            ? <img src={imgs[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                                            : <div className="w-full h-full flex items-center justify-center"><Package size={32} className="text-zinc-600"/></div>
                                        }
                                        {/* Save button */}
                                        <button onClick={e => { e.stopPropagation(); toggleSave(listing.id); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition">
                                            <Heart size={14} className={isSaved ? 'text-red-500 fill-red-500' : 'text-white'}/>
                                        </button>
                                        {/* Condition badge */}
                                        {listing.condition && <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">{listing.condition}</span>}
                                        {imgs.length > 1 && <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded-full">{imgs.length} photos</span>}
                                    </div>
                                    {/* Info */}
                                    <div className="p-3">
                                        <p className="text-yellow-400 font-bold text-base">{formatPrice(listing.price)}</p>
                                        <p className="text-white text-sm font-semibold truncate mt-0.5">{listing.title}</p>
                                        <div className="flex items-center gap-1 mt-1.5">
                                            <div className="w-4 h-4 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
                                                {listing.profile_pic_url ? <img src={listing.profile_pic_url} className="w-full h-full object-cover"/> : null}
                                            </div>
                                            <span className="text-zinc-500 text-xs truncate">{listing.seller_username}</span>
                                            <VerifiedBadge isVerified={!!listing.is_verified} verifyType={listing.verify_type}/>
                                        </div>
                                        {listing.location && <p className="text-zinc-600 text-xs mt-1 flex items-center gap-0.5"><MapPin size={10}/>{listing.location}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* View Listing Modal */}
            {viewListing && (() => {
                const imgs = viewListing.images ? JSON.parse(viewListing.images) : [];
                const isOwner = String(viewListing.seller_id) === String(userId);
                return (
                    <div className="fixed inset-0 z-[100] bg-black/90 flex items-end sm:items-center justify-center" onClick={() => setViewListing(null)}>
                        <div className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            {/* Image carousel */}
                            <div className="relative aspect-square bg-zinc-900 rounded-t-3xl sm:rounded-t-2xl overflow-hidden">
                                {imgs.length > 0
                                    ? <img src={imgs[imgIndex]} className="w-full h-full object-cover"/>
                                    : <div className="w-full h-full flex items-center justify-center"><Package size={48} className="text-zinc-700"/></div>
                                }
                                <button onClick={() => setViewListing(null)} className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"><X size={18}/></button>
                                {imgs.length > 1 && (
                                    <>
                                        <button onClick={() => setImgIndex(i => Math.max(0, i-1))} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white"><ChevronLeft size={18}/></button>
                                        <button onClick={() => setImgIndex(i => Math.min(imgs.length-1, i+1))} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white"><ChevronRight size={18}/></button>
                                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                            {imgs.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIndex ? 'bg-white' : 'bg-white/40'}`}/>)}
                                        </div>
                                    </>
                                )}
                                {viewListing.condition && <span className="absolute top-3 left-3 text-xs font-bold bg-black/60 text-white px-2 py-1 rounded-full">{viewListing.condition}</span>}
                            </div>

                            <div className="p-5 space-y-4">
                                {/* Price + title */}
                                <div>
                                    <p className="text-yellow-400 font-bold text-2xl">{formatPrice(viewListing.price)}</p>
                                    <h2 className="text-white font-bold text-xl mt-1">{viewListing.title}</h2>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <span className="text-xs bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full border border-zinc-700">{CATEGORIES.find(c => c.key === viewListing.category)?.label || viewListing.category}</span>
                                        {viewListing.location && <span className="text-xs text-zinc-500 flex items-center gap-1"><MapPin size={11}/>{viewListing.location}</span>}
                                        <span className="text-xs text-zinc-600 ml-auto">{timeAgo(viewListing.created_at)}</span>
                                    </div>
                                </div>

                                {/* Description */}
                                {viewListing.description && (
                                    <div>
                                        <p className="text-zinc-400 text-xs uppercase font-bold tracking-wider mb-1">Description</p>
                                        <p className="text-zinc-200 text-sm leading-relaxed">{viewListing.description}</p>
                                    </div>
                                )}

                                {/* Seller */}
                                <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                                    <Link to={`/profile/${viewListing.seller_id}`} onClick={() => setViewListing(null)} className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
                                        {viewListing.profile_pic_url ? <img src={viewListing.profile_pic_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-white font-bold">{viewListing.seller_username?.charAt(0).toUpperCase()}</div>}
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                            <Link to={`/profile/${viewListing.seller_id}`} onClick={() => setViewListing(null)} className="text-white font-bold text-sm hover:underline truncate">{viewListing.seller_username}</Link>
                                            <VerifiedBadge isVerified={!!viewListing.is_verified} verifyType={viewListing.verify_type}/>
                                        </div>
                                        <p className="text-zinc-500 text-xs">Seller</p>
                                    </div>
                                    {isOwner && (
                                        <button onClick={() => deleteListing(viewListing.id)} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 px-3 py-1.5 bg-red-500/10 rounded-xl border border-red-500/20 transition"><Trash2 size={13}/> Delete</button>
                                    )}
                                </div>

                                {/* Actions */}
                                {!isOwner && (
                                    <div className="flex gap-3">
                                        <button onClick={() => contactSeller(viewListing)} className="flex-1 flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 rounded-xl transition"><MessageCircle size={18}/> Message Seller</button>
                                        <button onClick={() => toggleSave(viewListing.id)} className={`w-12 flex items-center justify-center rounded-xl border transition ${savedIds.has(viewListing.id) ? 'bg-red-500/15 border-red-500/40 text-red-400' : 'bg-zinc-900 border-zinc-700 text-zinc-400'}`}>
                                            <Heart size={18} className={savedIds.has(viewListing.id) ? 'fill-red-400' : ''}/>
                                        </button>
                                    </div>
                                )}
                                {isOwner && <p className="text-center text-zinc-600 text-sm">This is your listing</p>}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Create Listing Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-[110] bg-black/90 flex items-end sm:items-center justify-center" onClick={() => setShowCreate(false)}>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-800">
                            <h2 className="text-white font-bold text-lg">Create Listing</h2>
                            <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Images */}
                            <div>
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-2">Photos (up to 5)</label>
                                <div className="flex gap-2 flex-wrap">
                                    {formPreviews.map((url, i) => (
                                        <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-zinc-800">
                                            <img src={url} className="w-full h-full object-cover"/>
                                            <button onClick={() => { setFormImages(f => f.filter((_,j) => j!==i)); setFormPreviews(p => p.filter((_,j) => j!==i)); }} className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center"><X size={10} className="text-white"/></button>
                                        </div>
                                    ))}
                                    {formPreviews.length < 5 && (
                                        <label className="w-20 h-20 rounded-xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-500 transition">
                                            <Upload size={18} className="text-zinc-500"/>
                                            <span className="text-zinc-600 text-xs mt-1">Add</span>
                                            <input type="file" multiple accept="image/*" className="hidden" onChange={handleImagePick}/>
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Title *</label>
                                <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="What are you selling?" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50 placeholder-zinc-600"/>
                            </div>

                            {/* Price + Condition */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Price ($) *</label>
                                    <input type="number" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} placeholder="0 for Free" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50 placeholder-zinc-600"/>
                                </div>
                                <div>
                                    <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Condition</label>
                                    <select value={form.condition} onChange={e => setForm(f => ({...f, condition: e.target.value}))} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50">
                                        {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Category</label>
                                <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50">
                                    {CATEGORIES.filter(c => c.key !== 'all').map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                                </select>
                            </div>

                            {/* Location */}
                            <div>
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Location</label>
                                <input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="City, Area..." className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50 placeholder-zinc-600"/>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Description</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Describe your item..." rows={3} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50 placeholder-zinc-600 resize-none"/>
                            </div>

                            <button onClick={submitListing} disabled={creating || !form.title.trim()} className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-black font-bold py-3.5 rounded-xl transition text-sm">
                                {creating ? 'Publishing...' : <><Plus size={16}/> Publish Listing</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
