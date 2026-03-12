import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Search, Plus, X, MapPin, Heart, MessageCircle,
    Filter, Sparkles, Package, ShoppingBag, Laptop, Car, Home, Music,
    BookOpen, Shirt, Dumbbell, Camera, Trash2, Eye, Upload,
    ChevronLeft, ChevronRight, Palette, Zap, CheckCircle, RefreshCw,
    Clock, SlidersHorizontal, User, Edit2, CreditCard, CheckCircle2, Copy, ImageIcon
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com'; // v2

function safeParseImages(images) {
    if (!images) return [];
    if (Array.isArray(images)) return images;
    try { const p = JSON.parse(images); return Array.isArray(p) ? p : []; } catch { return []; }
}

const CATEGORIES = [
    { key: 'all',         label: 'All',          Icon: Sparkles },
    { key: 'electronics', label: 'Electronics',  Icon: Laptop },
    { key: 'vehicles',    label: 'Vehicles',     Icon: Car },
    { key: 'property',    label: 'Property',     Icon: Home },
    { key: 'fashion',     label: 'Fashion',      Icon: Shirt },
    { key: 'music',       label: 'Music',        Icon: Music },
    { key: 'books',       label: 'Books',        Icon: BookOpen },
    { key: 'sports',      label: 'Sports',       Icon: Dumbbell },
    { key: 'photography', label: 'Photography',  Icon: Camera },
    { key: 'art',         label: 'Art',          Icon: Palette },
    { key: 'other',       label: 'Other',        Icon: Package },
];

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'For Parts'];

function VerifiedBadge({ isVerified, verifyType }) {
    if (!isVerified) return null;
    const colors = { red: 'text-red-500', green: 'text-green-500', yellow: 'text-yellow-400', blue: 'text-blue-400' };
    return <span className={`inline-flex ${colors[verifyType] || colors.blue}`}>✓</span>;
}


function resolveUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
}

function formatPrice(p) {
    if (!p || p === '0' || p === 0) return 'Free';
    return `NPR ${p}`;
}

function timeAgo(date) {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
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
    const [savedIds, setSavedIds] = useState(() => {
        try { return new Set(JSON.parse(localStorage.getItem('mp_saved') || '[]')); } catch { return new Set(); }
    });
    const [recentlyViewed, setRecentlyViewed] = useState(() => {
        try { return JSON.parse(localStorage.getItem('mp_recent') || '[]'); } catch { return []; }
    });
    const [imgIndex, setImgIndex] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [sellerView, setSellerView] = useState(null);
    const [sellerListings, setSellerListings] = useState([]);
    const [sellerLoading, setSellerLoading] = useState(false);
    const [paySettings, setPaySettings] = useState(null);
    const [paySettingsLoading, setPaySettingsLoading] = useState(true);

    const [editListing, setEditListing] = useState(null);
    const [renewModal, setRenewModal] = useState(null); // listing to renew
    const [renewForm, setRenewForm] = useState({ reason: '', duration: '30', contact: '' });
    const [submittingRenew, setSubmittingRenew] = useState(false);
    const [boostModal, setBoostModal] = useState(null); // listing to boost
    const [boostStep, setBoostStep] = useState(1); // 1=select payment, 2=instructions, 3=upload proof
    const [boostMethod, setBoostMethod] = useState('');
    const [boostProof, setBoostProof] = useState(null);
    const [boostProofPreview, setBoostProofPreview] = useState('');
    const [submittingBoost, setSubmittingBoost] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [editing, setEditing] = useState(false);

    // Filters
    const [filterPriceMin, setFilterPriceMin] = useState('');
    const [filterPriceMax, setFilterPriceMax] = useState('');
    const [filterCondition, setFilterCondition] = useState('');
    const [filterLocation, setFilterLocation] = useState('');

    // Create form
    const [form, setForm] = useState({ title: '', description: '', price: '0', category: 'other', condition: 'Good', location: '' });
    const [formImages, setFormImages] = useState([]);
    const [formPreviews, setFormPreviews] = useState([]);
    const [creating, setCreating] = useState(false);

    const searchRef = useRef(null);

    const fetchListings = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ userId, sort: sortBy });
            if (category !== 'all') params.set('category', category);
            if (searchQ) params.set('q', searchQ);
            if (myListings) params.set('mine', '1');
            if (filterPriceMin) params.set('price_min', filterPriceMin);
            if (filterPriceMax) params.set('price_max', filterPriceMax);
            if (filterCondition) params.set('condition', filterCondition);
            if (filterLocation) params.set('location', filterLocation);
            const res = await axios.get(`${BACKEND_URL}/api/marketplace?${params}`);
            setListings(Array.isArray(res.data) ? res.data : []);
        } catch { setListings([]); }
        setLoading(false);
    };

    useEffect(() => {
        setPaySettingsLoading(true);
        fetch(`${BACKEND_URL}/api/marketplace/payment-settings`)
            .then(r => r.json())
            .then(d => { if (d && !d.error) setPaySettings(d); })
            .catch(() => {})
            .finally(() => setPaySettingsLoading(false));
    }, []);

    useEffect(() => { fetchListings(); }, [category, searchQ, sortBy, myListings, filterPriceMin, filterPriceMax, filterCondition, filterLocation]);

    const handleSearch = (e) => { e.preventDefault(); setSearchQ(searchInput); };

    const handleImagePick = (e) => {
        const files = Array.from(e.target.files).slice(0, 5);
        setFormImages(files);
        setFormPreviews(files.map(f => URL.createObjectURL(f)));
    };

    const submitListing = async () => {
        if (!form.title.trim()) return;
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
            await axios.post(`${BACKEND_URL}/api/marketplace`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setShowCreate(false);
            setForm({ title: '', description: '', price: '0', category: 'other', condition: 'Good', location: '' });
            setFormImages([]); setFormPreviews([]);
            fetchListings();
        } catch (e) { alert(e.response?.data?.error || 'Failed to create listing'); }
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

    const markAsSold = async (id) => {
        try {
            await axios.put(`${BACKEND_URL}/api/marketplace/${id}/sold`, { userId });
            setListings(l => l.map(x => x.id === id ? { ...x, status: 'sold' } : x));
            if (viewListing?.id === id) setViewListing(v => ({ ...v, status: 'sold' }));
        } catch { alert('Failed to mark as sold'); }
    };

    const boostListing = (listing) => {
        setBoostModal(listing);
        setBoostStep(1);
        setBoostMethod('');
        setBoostProof(null);
        setBoostProofPreview('');
    };

    const submitBoostRequest = async () => {
        if (!boostProof || !boostMethod) return;
        setSubmittingBoost(true);
        try {
            const fd = new FormData();
            fd.append('userId', userId);
            fd.append('listingId', boostModal.id);
            fd.append('listingTitle', boostModal.title);
            fd.append('paymentMethod', boostMethod);
            fd.append('proof', boostProof);
            await axios.post(`${BACKEND_URL}/api/marketplace/boost-request`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setBoostModal(null);
            alert('Boost request submitted! Admin will review your payment and activate the boost within 24 hours.');
        } catch { alert('Failed to submit boost request. Please try again.'); }
        setSubmittingBoost(false);
    };

    const submitRenewalRequest = async () => {
        if (!renewModal || !renewForm.reason.trim()) return alert('Please provide a reason for renewal.');
        setSubmittingRenew(true);
        try {
            await axios.post(`${BACKEND_URL}/api/marketplace/renewal-request`, {
                userId,
                listingId: renewModal.id,
                reason: renewForm.reason,
                durationDays: renewForm.duration,
                contact: renewForm.contact,
            });
            setRenewModal(null);
            setRenewForm({ reason: '', duration: '30', contact: '' });
            alert('✅ Renewal request submitted! Admin will review within 24 hours.');
        } catch(e) {
            alert(e.response?.data?.error || 'Failed to submit request. Try again.');
        }
        setSubmittingRenew(false);
    };

    const saveEdit = async () => {
        if (!editListing || !editForm.title?.trim()) return;
        setEditing(true);
        try {
            await axios.put(`${BACKEND_URL}/api/marketplace/${editListing.id}`, {
                userId,
                title: editForm.title,
                description: editForm.description,
                price: editForm.price,
                condition: editForm.condition,
                location: editForm.location,
            });
            setListings(l => l.map(x => x.id === editListing.id ? { ...x, ...editForm, condition_type: editForm.condition } : x));
            if (viewListing?.id === editListing.id) setViewListing(v => ({ ...v, ...editForm, condition_type: editForm.condition }));
            setEditListing(null);
        } catch { alert('Failed to save changes'); }
        setEditing(false);
    };

    const toggleSave = (id) => {
        setSavedIds(s => {
            const n = new Set(s);
            n.has(id) ? n.delete(id) : n.add(id);
            localStorage.setItem('mp_saved', JSON.stringify([...n]));
            return n;
        });
    };

    const openListing = (listing) => {
        setViewListing(listing);
        setImgIndex(0);
        setRecentlyViewed(prev => {
            const filtered = prev.filter(x => x.id !== listing.id);
            const updated = [{ id: listing.id, title: listing.title, price: listing.price, images: listing.images }, ...filtered].slice(0, 10);
            localStorage.setItem('mp_recent', JSON.stringify(updated));
            return updated;
        });
    };

    const openSellerView = async (sellerId, sellerName, sellerPic, isVerified, verifyType) => {
        setViewListing(null);
        setSellerView({ id: sellerId, name: sellerName, pic: sellerPic, isVerified, verifyType });
        setSellerLoading(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/api/marketplace?userId=${userId}&seller=${sellerId}`);
            setSellerListings(Array.isArray(res.data) ? res.data : []);
        } catch { setSellerListings([]); }
        setSellerLoading(false);
    };

    const contactSeller = (listing) => { navigate(`/chat?userId=${listing.seller_id}`); };
    const clearFilters = () => { setFilterPriceMin(''); setFilterPriceMax(''); setFilterCondition(''); setFilterLocation(''); };
    const hasActiveFilters = filterPriceMin || filterPriceMax || filterCondition || filterLocation;

    return (
        <div className="w-full bg-black flex flex-col h-[calc(100dvh-70px)] sm:h-screen">

            {/* ── HEADER ── */}
            <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 flex-shrink-0">
                <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                    <ShoppingBag size={22} className="text-yellow-400 flex-shrink-0"/>
                    <h1 className="text-white font-bold text-xl flex-1">Marketplace</h1>
                    <button onClick={() => setMyListings(m => !m)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${myListings ? 'bg-yellow-400/15 border-yellow-400/40 text-yellow-400' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'}`}>
                        My Listings
                    </button>
                    <button onClick={() => setShowCreate(true)}
                        className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm px-3 py-1.5 rounded-full transition">
                        <Plus size={16}/> Sell
                    </button>
                </div>

                {/* Search bar */}
                <form onSubmit={handleSearch} className="px-4 pb-3 flex gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
                        <Search size={16} className="text-zinc-500 flex-shrink-0"/>
                        <input ref={searchRef} value={searchInput} onChange={e => setSearchInput(e.target.value)}
                            placeholder="Search listings..." className="flex-1 bg-transparent text-white text-sm outline-none placeholder-zinc-600"/>
                        {searchInput && <button type="button" onClick={() => { setSearchInput(''); setSearchQ(''); }}><X size={14} className="text-zinc-500"/></button>}
                    </div>
                    <button type="button" onClick={() => setShowFilters(f => !f)}
                        className={`flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-semibold transition ${hasActiveFilters ? 'bg-yellow-400/15 border-yellow-400/40 text-yellow-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}>
                        <SlidersHorizontal size={14}/>{hasActiveFilters ? ' On' : ''}
                    </button>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs rounded-xl px-2 outline-none">
                        <option value="newest">Newest</option>
                        <option value="boosted">Boosted</option>
                        <option value="price_asc">Price ↑</option>
                        <option value="price_desc">Price ↓</option>
                    </select>
                </form>

                {/* Advanced Filters Panel */}
                {showFilters && (
                    <div className="px-4 pb-3 border-t border-zinc-800 pt-3 space-y-2">
                        <div className="flex gap-2">
                            <input type="number" value={filterPriceMin} onChange={e => setFilterPriceMin(e.target.value)}
                                placeholder="Min price" className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none placeholder-zinc-600"/>
                            <input type="number" value={filterPriceMax} onChange={e => setFilterPriceMax(e.target.value)}
                                placeholder="Max price" className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none placeholder-zinc-600"/>
                        </div>
                        <div className="flex gap-2">
                            <select value={filterCondition} onChange={e => setFilterCondition(e.target.value)}
                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none">
                                <option value="">Any Condition</option>
                                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input value={filterLocation} onChange={e => setFilterLocation(e.target.value)}
                                placeholder="Location..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none placeholder-zinc-600"/>
                        </div>
                        {hasActiveFilters && (
                            <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-300 transition">✕ Clear all filters</button>
                        )}
                    </div>
                )}

                {/* Categories */}
                <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
                    {CATEGORIES.map(({ key, label, Icon }) => (
                        <button key={key} onClick={() => setCategory(key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex-shrink-0 border ${
                                category === key ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'}`}>
                            <Icon size={12}/> {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── SCROLLABLE CONTENT ── */}
            <div className="flex-1 overflow-y-auto pb-16 sm:pb-4">

                {/* Recently Viewed */}
                {!myListings && !searchQ && !hasActiveFilters && recentlyViewed.length > 0 && category === 'all' && (
                    <div className="px-4 pt-4 pb-2">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={13} className="text-zinc-500"/>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider flex-1">Recently Viewed</p>
                            <button onClick={() => { setRecentlyViewed([]); localStorage.removeItem('mp_recent'); }}
                                className="text-xs text-zinc-600 hover:text-zinc-400">Clear</button>
                        </div>
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                            {recentlyViewed.map(item => {
                                const imgs = safeParseImages(item.images);
                                const full = listings.find(l => l.id === item.id) || item;
                                return (
                                    <button key={item.id} onClick={() => { const l = listings.find(x => x.id === item.id); if (l) openListing(l); }}
                                        className="flex-shrink-0 w-[72px] text-left">
                                        <div className="w-[72px] h-[72px] rounded-xl bg-zinc-800 overflow-hidden border border-zinc-700">
                                            {imgs[0] ? <img src={imgs[0]} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-zinc-600"/></div>}
                                        </div>
                                        <p className="text-white text-[11px] truncate mt-1 leading-tight">{item.title}</p>
                                        <p className="text-yellow-400 text-[11px] font-bold">{formatPrice(item.price)}</p>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="border-b border-zinc-800 mt-3"/>
                    </div>
                )}

                <div className="p-3">
                    {/* Skeletons */}
                    {loading && (
                        <div className="grid grid-cols-2 gap-3">
                            {[1,2,3,4,5,6].map(i => (
                                <div key={i} className="bg-zinc-900 rounded-2xl overflow-hidden animate-pulse">
                                    <div className="aspect-square bg-zinc-800"/>
                                    <div className="p-3 space-y-2"><div className="h-3 bg-zinc-800 rounded w-3/4"/><div className="h-3 bg-zinc-800 rounded w-1/2"/></div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && listings.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <ShoppingBag size={48} className="text-zinc-700 mb-4"/>
                            <p className="text-zinc-500 font-semibold">No listings found</p>
                            <p className="text-zinc-600 text-sm mt-1">Be the first to sell something!</p>
                            <button onClick={() => setShowCreate(true)} className="mt-4 bg-yellow-400 text-black font-bold px-6 py-2 rounded-full text-sm hover:bg-yellow-300 transition">+ List Item</button>
                        </div>
                    )}

                    {/* Grid */}
                    {!loading && listings.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            {listings.map(listing => {
                                const imgs = safeParseImages(listing.images);
                                const isSaved = savedIds.has(listing.id);
                                const isOwner = String(listing.seller_id) === String(userId);
                                const isSold = listing.status === 'sold';
                                const isBoosted = listing.is_boosted;
                                return (
                                    <div key={listing.id} onClick={() => openListing(listing)}
                                        className={`bg-zinc-900 rounded-2xl overflow-hidden border transition cursor-pointer group relative ${
                                            isBoosted ? 'border-yellow-500/60 shadow-[0_0_14px_rgba(234,179,8,0.12)]' : 'border-zinc-800 hover:border-zinc-600'}`}>
                                        {isBoosted && (
                                            <div className="flex items-center justify-center gap-1 bg-yellow-500 py-0.5">
                                                <Zap size={9} className="text-black"/><span className="text-black text-[9px] font-bold tracking-wide">BOOSTED</span>
                                            </div>
                                        )}
                                        <div className="aspect-square bg-zinc-800 relative overflow-hidden">
                                            {imgs.length > 0
                                                ? <img src={imgs[0]} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isSold ? 'opacity-40' : ''}`}/>
                                                : <div className="w-full h-full flex items-center justify-center"><Package size={32} className="text-zinc-600"/></div>}
                                            {isSold && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="bg-black/80 text-white font-bold px-3 py-1 rounded-full text-xs border border-zinc-600 uppercase tracking-widest">Sold</span>
                                                </div>
                                            )}
                                            <button onClick={e => { e.stopPropagation(); toggleSave(listing.id); }}
                                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition">
                                                <Heart size={14} className={isSaved ? 'text-red-500 fill-red-500' : 'text-white'}/>
                                            </button>
                                            {listing.condition_type && <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">{listing.condition_type}</span>}
                                            {imgs.length > 1 && <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded-full">{imgs.length} photos</span>}
                                        </div>
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
            </div>

            {/* ── VIEW LISTING MODAL ── */}
            {viewListing && (() => {
                const imgs = safeParseImages(viewListing.images);
                const isOwner = String(viewListing.seller_id) === String(userId);
                const isSold = viewListing.status === 'sold';
                return (
                    <div className="fixed inset-0 z-[100] bg-black/90 flex items-end sm:items-center justify-center" onClick={() => setViewListing(null)}>
                        <div className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            {viewListing.is_boosted && (
                                <div className="flex items-center justify-center gap-2 bg-yellow-500/20 border-b border-yellow-500/30 py-1.5">
                                    <Zap size={12} className="text-yellow-400"/><span className="text-yellow-400 text-xs font-bold">BOOSTED LISTING</span>
                                </div>
                            )}
                            {/* Carousel */}
                            <div className="relative aspect-square bg-zinc-900 rounded-t-3xl sm:rounded-t-2xl overflow-hidden">
                                {imgs.length > 0
                                    ? <img src={imgs[imgIndex]} className={`w-full h-full object-cover ${isSold ? 'opacity-50' : ''}`}/>
                                    : <div className="w-full h-full flex items-center justify-center"><Package size={48} className="text-zinc-700"/></div>}
                                {isSold && <div className="absolute inset-0 flex items-center justify-center"><span className="bg-black/80 text-white font-bold px-6 py-2 rounded-full text-lg border border-zinc-600">SOLD</span></div>}
                                <button onClick={() => setViewListing(null)} className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"><X size={18}/></button>
                                {imgs.length > 1 && (
                                    <>
                                        <button onClick={() => setImgIndex(i => Math.max(0, i-1))} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white"><ChevronLeft size={18}/></button>
                                        <button onClick={() => setImgIndex(i => Math.min(imgs.length-1, i+1))} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white"><ChevronRight size={18}/></button>
                                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                            {imgs.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === imgIndex ? 'bg-white' : 'bg-white/40'}`}/>)}
                                        </div>
                                    </>
                                )}
                                {viewListing.condition_type && <span className="absolute top-3 left-3 text-xs font-bold bg-black/60 text-white px-2 py-1 rounded-full">{viewListing.condition_type}</span>}
                            </div>

                            <div className="p-5 space-y-4">
                                {/* Price + title */}
                                <div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-yellow-400 font-bold text-2xl">{formatPrice(viewListing.price)}</p>
                                        <button onClick={() => toggleSave(viewListing.id)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition ${savedIds.has(viewListing.id) ? 'bg-red-500/15 border-red-500/40 text-red-400' : 'bg-zinc-900 border-zinc-700 text-zinc-400'}`}>
                                            <Heart size={14} className={savedIds.has(viewListing.id) ? 'fill-red-400' : ''}/> {savedIds.has(viewListing.id) ? 'Saved' : 'Save'}
                                        </button>
                                    </div>
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

                                {/* Seller row */}
                                <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                                    <button onClick={() => openSellerView(viewListing.seller_id, viewListing.seller_username, viewListing.profile_pic_url, viewListing.is_verified, viewListing.verify_type)}
                                        className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
                                        {viewListing.profile_pic_url
                                            ? <img src={viewListing.profile_pic_url} className="w-full h-full object-cover"/>
                                            : <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">{viewListing.seller_username?.charAt(0).toUpperCase()}</div>}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-white font-bold text-sm truncate">{viewListing.seller_username}</span>
                                            <VerifiedBadge isVerified={!!viewListing.is_verified} verifyType={viewListing.verify_type}/>
                                            {viewListing.is_verified && <span className="text-[11px] text-green-400 font-semibold">Verified</span>}
                                        </div>
                                        <button onClick={() => openSellerView(viewListing.seller_id, viewListing.seller_username, viewListing.profile_pic_url, viewListing.is_verified, viewListing.verify_type)}
                                            className="text-zinc-500 text-xs hover:text-zinc-300 transition flex items-center gap-1 mt-0.5">
                                            <Eye size={11}/> View all listings
                                        </button>
                                    </div>
                                    {isOwner && (
                                        <button onClick={() => deleteListing(viewListing.id)}
                                            className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 px-3 py-1.5 bg-red-500/10 rounded-xl border border-red-500/20 transition">
                                            <Trash2 size={13}/> Delete
                                        </button>
                                    )}
                                </div>

                                {/* Owner controls */}
                                {isOwner && (
                                    <div className="grid grid-cols-3 gap-2">
                                        <button onClick={() => markAsSold(viewListing.id)} disabled={isSold}
                                            className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-semibold transition ${isSold ? 'bg-green-500/10 border-green-500/30 text-green-400 cursor-default' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'}`}>
                                            <CheckCircle size={18}/>{isSold ? 'Sold ✓' : 'Mark Sold'}
                                        </button>
                                        <button onClick={() => boostListing(viewListing)}
                                            className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-semibold transition ${viewListing.boost_status === 'pending' ? 'border-orange-500/30 bg-orange-500/10 text-orange-400 cursor-default' : viewListing.is_boosted ? 'border-green-500/30 bg-green-500/10 text-green-400 cursor-default' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'}`}
                                            disabled={viewListing.is_boosted || viewListing.boost_status === 'pending'}>
                                            <Zap size={18}/>
                                            {viewListing.boost_status === 'pending' ? 'Pending...' : viewListing.is_boosted ? 'Boosted ✓' : 'Boost'}
                                        </button>
                                        <button onClick={() => { setRenewModal(viewListing); setRenewForm({ reason: '', duration: '30', contact: '' }); }}
                                            className="flex flex-col items-center gap-1 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-400 text-xs font-semibold hover:text-white hover:border-zinc-500 transition">
                                            <RefreshCw size={18}/>Renew
                                        </button>
                                    </div>
                                )}

                                {/* Buyer CTA */}
                                {!isOwner && !isSold && (
                                    <button onClick={() => contactSeller(viewListing)}
                                        className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3.5 rounded-xl transition text-sm">
                                        <MessageCircle size={18}/> Message Seller
                                    </button>
                                )}
                                {!isOwner && isSold && <p className="text-center text-zinc-600 text-sm py-2">This item has been sold</p>}
                                {isOwner && (
                                    <button onClick={() => { setEditListing(viewListing); setEditForm({ title: viewListing.title, description: viewListing.description || '', price: viewListing.price, condition: viewListing.condition_type || 'Good', location: viewListing.location || '' }); }}
                                        className="w-full flex items-center justify-center gap-2 border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-500 font-semibold py-2.5 rounded-xl transition text-sm">
                                        <Edit2 size={15}/> Edit Listing
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── SELLER PROFILE MODAL ── */}
            {sellerView && (
                <div className="fixed inset-0 z-[110] bg-black/90 flex items-end sm:items-center justify-center" onClick={() => setSellerView(null)}>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 p-4 border-b border-zinc-800 flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
                                {sellerView.pic
                                    ? <img src={sellerView.pic} className="w-full h-full object-cover"/>
                                    : <div className="w-full h-full flex items-center justify-center"><User size={22} className="text-zinc-400"/></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <p className="text-white font-bold">{sellerView.name}</p>
                                    <VerifiedBadge isVerified={!!sellerView.isVerified} verifyType={sellerView.verifyType}/>
                                    {sellerView.isVerified && <span className="text-xs text-green-400 font-semibold">Verified Seller</span>}
                                </div>
                                <p className="text-zinc-500 text-xs">{sellerLoading ? 'Loading...' : `${sellerListings.length} listings`}</p>
                            </div>
                            <button onClick={() => setSellerView(null)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-4">
                            {sellerLoading ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {[1,2,3,4].map(i => <div key={i} className="bg-zinc-900 rounded-xl animate-pulse aspect-square"/>)}
                                </div>
                            ) : sellerListings.length === 0 ? (
                                <p className="text-center text-zinc-500 py-10">No listings from this seller</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {sellerListings.map(listing => {
                                        const imgs = safeParseImages(listing.images);
                                        return (
                                            <button key={listing.id} onClick={() => { setSellerView(null); openListing(listing); }}
                                                className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 text-left hover:border-zinc-600 transition">
                                                <div className="aspect-square bg-zinc-800">
                                                    {imgs[0] ? <img src={imgs[0]} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><Package size={24} className="text-zinc-600"/></div>}
                                                </div>
                                                <div className="p-2">
                                                    <p className="text-yellow-400 font-bold text-sm">{formatPrice(listing.price)}</p>
                                                    <p className="text-white text-xs truncate">{listing.title}</p>
                                                    {listing.status === 'sold' && <span className="text-[10px] text-zinc-500">Sold</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── CREATE LISTING MODAL ── */}
            {showCreate && (
                <div className="fixed inset-0 z-[110] bg-black/90 flex items-end sm:items-center justify-center" onClick={() => setShowCreate(false)}>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-800">
                            <h2 className="text-white font-bold text-lg">Create Listing</h2>
                            <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-2">Photos (up to 5)</label>
                                <div className="flex gap-2 flex-wrap">
                                    {formPreviews.map((url, i) => (
                                        <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-zinc-800">
                                            <img src={url} className="w-full h-full object-cover"/>
                                            <button onClick={() => { setFormImages(f => f.filter((_,j) => j!==i)); setFormPreviews(p => p.filter((_,j) => j!==i)); }}
                                                className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center"><X size={10} className="text-white"/></button>
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
                            <div>
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Title *</label>
                                <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                                    placeholder="What are you selling?" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50 placeholder-zinc-600"/>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Price (NPR) *</label>
                                    <input value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))}
                                        placeholder="e.g. 500, 20k, 1.5k" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50 placeholder-zinc-600"/>
                                </div>
                                <div>
                                    <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Condition</label>
                                    <select value={form.condition} onChange={e => setForm(f => ({...f, condition: e.target.value}))}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50">
                                        {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Category</label>
                                <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50">
                                    {CATEGORIES.filter(c => c.key !== 'all').map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Location</label>
                                <input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))}
                                    placeholder="City, Area..." className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50 placeholder-zinc-600"/>
                            </div>
                            <div>
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Description</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                                    placeholder="Describe your item..." rows={3} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50 placeholder-zinc-600 resize-none"/>
                            </div>
                            <button onClick={submitListing} disabled={creating || !form.title.trim()}
                                className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-black font-bold py-3.5 rounded-xl transition text-sm">
                                {creating ? 'Publishing...' : <><Plus size={16}/> Publish Listing</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── BOOST PAYMENT MODAL ── */}
            {/* ── Renewal Request Modal ── */}
            {renewModal && (
                <div className="fixed inset-0 z-[130] bg-black/90 flex items-end sm:items-center justify-center" onClick={() => setRenewModal(null)}>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800">
                            <div className="flex items-center gap-2">
                                <RefreshCw size={18} className="text-blue-400"/>
                                <h2 className="text-white font-bold">Request Renewal</h2>
                            </div>
                            <button onClick={() => setRenewModal(null)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                        </div>

                        <div className="px-5 py-4 space-y-4">
                            {/* Listing preview */}
                            <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                                    {safeParseImages(renewModal.images)[0]
                                        ? <img src={safeParseImages(renewModal.images)[0]} className="w-full h-full object-cover"/>
                                        : <Package size={20} className="m-auto mt-3 text-zinc-600"/>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-semibold text-sm truncate">{renewModal.title}</p>
                                    <p className="text-zinc-500 text-xs">Listed {timeAgo(renewModal.created_at)}</p>
                                </div>
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1.5">Reason for Renewal <span className="text-red-400">*</span></label>
                                <textarea
                                    value={renewForm.reason}
                                    onChange={e => setRenewForm(f => ({ ...f, reason: e.target.value }))}
                                    placeholder="e.g. Item still available, price updated, want more visibility..."
                                    rows={3}
                                    className="w-full bg-zinc-900 border border-zinc-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white text-sm outline-none resize-none transition placeholder-zinc-600"
                                />
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1.5">Renewal Duration</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[['15', '15 days'], ['30', '30 days'], ['60', '60 days']].map(([val, label]) => (
                                        <button key={val} onClick={() => setRenewForm(f => ({ ...f, duration: val }))}
                                            className={`py-2.5 rounded-xl border text-sm font-semibold transition ${renewForm.duration === val ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'}`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Contact */}
                            <div>
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1.5">Contact Info <span className="text-zinc-600 font-normal">(optional)</span></label>
                                <input
                                    type="text"
                                    value={renewForm.contact}
                                    onChange={e => setRenewForm(f => ({ ...f, contact: e.target.value }))}
                                    placeholder="Phone or email for admin to reach you"
                                    className="w-full bg-zinc-900 border border-zinc-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition placeholder-zinc-600"
                                />
                            </div>

                            {/* Info note */}
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 flex gap-2">
                                <Clock size={15} className="text-blue-400 flex-shrink-0 mt-0.5"/>
                                <p className="text-blue-300 text-xs leading-relaxed">Admin will review your request within 24 hours. If approved, your listing will be renewed for the selected duration.</p>
                            </div>

                            {/* Submit */}
                            <button onClick={submitRenewalRequest} disabled={submittingRenew || !renewForm.reason.trim()}
                                className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition disabled:opacity-40 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] flex items-center justify-center gap-2">
                                {submittingRenew ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Submitting...</> : <><RefreshCw size={16}/>Submit Renewal Request</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {boostModal && (
                <div className="fixed inset-0 z-[130] bg-black/90 flex items-end sm:items-center justify-center" onClick={() => setBoostModal(null)}>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-800">
                            <div className="flex items-center gap-2">
                                {boostStep > 1 && (
                                    <button onClick={() => setBoostStep(s => s - 1)} className="text-zinc-500 hover:text-white mr-1">
                                        <ChevronLeft size={18}/>
                                    </button>
                                )}
                                <Zap size={18} className="text-yellow-400"/>
                                <h2 className="text-white font-bold">Boost Listing</h2>
                            </div>
                            <button onClick={() => setBoostModal(null)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Listing preview */}
                            <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                                <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                                    {safeParseImages(boostModal.images)[0]
                                        ? <img src={safeParseImages(boostModal.images)[0]} className="w-full h-full object-cover"/>
                                        : <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-zinc-600"/></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-semibold text-sm truncate">{boostModal.title}</p>
                                    <p className="text-yellow-400 text-xs font-bold">NPR {boostModal.price}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-yellow-400 font-bold text-lg">Rs 200</p>
                                    <p className="text-zinc-500 text-xs">7 days · Rs {paySettings?.boost_price || 200}</p>
                                </div>
                            </div>

                            {/* Step 1: Choose payment method */}
                            {boostStep === 1 && (
                                <div className="space-y-3">
                                    <p className="text-zinc-400 text-sm font-semibold">Choose payment method</p>
                                    {[
                                        { id: 'esewa', label: 'eSewa', color: 'text-green-400', border: 'border-green-500/40', bg: 'bg-green-500/10', emoji: '🟢' },
                                        { id: 'khalti', label: 'Khalti', color: 'text-purple-400', border: 'border-purple-500/40', bg: 'bg-purple-500/10', emoji: '🟣' },
                                        { id: 'bank', label: 'Bank Transfer', color: 'text-blue-400', border: 'border-blue-500/40', bg: 'bg-blue-500/10', emoji: '🏦' },
                                    ].map(m => (
                                        <button key={m.id} onClick={() => { setBoostMethod(m.id); setBoostStep(2); }}
                                            className={`w-full flex items-center gap-3 p-4 rounded-xl border ${m.border} ${m.bg} hover:opacity-90 transition`}>
                                            <span className="text-2xl">{m.emoji}</span>
                                            <span className={`font-bold text-sm ${m.color}`}>{m.label}</span>
                                            <ChevronRight size={16} className="text-zinc-500 ml-auto"/>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Step 2: Payment instructions */}
                            {boostStep === 2 && (
                                <div className="space-y-4">
                                    <p className="text-zinc-400 text-sm font-semibold">Payment Instructions</p>
                                    {paySettingsLoading && (
                                        <div className="text-center py-6 text-zinc-500 text-sm animate-pulse">Loading payment details...</div>
                                    )}
                                    {!paySettingsLoading && !paySettings && (
                                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                                            <p className="text-red-400 font-semibold text-sm">Payment not configured</p>
                                            <p className="text-zinc-500 text-xs mt-1">Admin hasn't set up payment details yet. Please try again later.</p>
                                        </div>
                                    )}
                                    {!paySettingsLoading && paySettings && (
                                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                                        {boostMethod === 'esewa' && (
                                            <>
                                                <p className="text-white font-bold">Pay via eSewa</p>
                                                {paySettings?.esewa_qr && (
                                                    <img src={resolveUrl(paySettings.esewa_qr)} className="w-40 h-40 object-contain mx-auto rounded-xl bg-white p-2"/>
                                                )}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-zinc-400 text-sm">eSewa ID</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-white font-mono font-bold">{paySettings?.esewa_number || '—'}</span>
                                                            {paySettings?.esewa_number && <button onClick={() => navigator.clipboard.writeText(paySettings.esewa_number)} className="text-zinc-500 hover:text-white"><Copy size={13}/></button>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-zinc-400 text-sm">Name</span>
                                                        <span className="text-white font-semibold">{paySettings?.esewa_name || '—'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-zinc-400 text-sm">Amount</span>
                                                        <span className="text-yellow-400 font-bold">Rs {paySettings?.boost_price || 200}</span>
                                                    </div>
                                                </div>
                                                <p className="text-zinc-500 text-xs">Open your eSewa app → Send Money → Enter the above details</p>
                                            </>
                                        )}
                                        {boostMethod === 'khalti' && (
                                            <>
                                                <p className="text-white font-bold">Pay via Khalti</p>
                                                {paySettings?.khalti_qr && (
                                                    <img src={resolveUrl(paySettings.khalti_qr)} className="w-40 h-40 object-contain mx-auto rounded-xl bg-white p-2"/>
                                                )}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-zinc-400 text-sm">Khalti ID</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-white font-mono font-bold">{paySettings?.khalti_number || '—'}</span>
                                                            {paySettings?.khalti_number && <button onClick={() => navigator.clipboard.writeText(paySettings.khalti_number)} className="text-zinc-500 hover:text-white"><Copy size={13}/></button>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-zinc-400 text-sm">Name</span>
                                                        <span className="text-white font-semibold">{paySettings?.khalti_name || '—'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-zinc-400 text-sm">Amount</span>
                                                        <span className="text-yellow-400 font-bold">Rs {paySettings?.boost_price || 200}</span>
                                                    </div>
                                                </div>
                                                <p className="text-zinc-500 text-xs">Open your Khalti app → Send Money → Enter the above details</p>
                                            </>
                                        )}
                                        {boostMethod === 'bank' && (
                                            <>
                                                <p className="text-white font-bold">Bank Transfer</p>
                                                {paySettings?.bank_qr && (
                                                    <img src={resolveUrl(paySettings.bank_qr)} className="w-40 h-40 object-contain mx-auto rounded-xl bg-white p-2"/>
                                                )}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-zinc-400 text-sm">Bank</span>
                                                        <span className="text-white font-semibold">{paySettings?.bank_name || '—'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-zinc-400 text-sm">Account No.</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-white font-mono font-bold">{paySettings?.bank_account || '—'}</span>
                                                            {paySettings?.bank_account && <button onClick={() => navigator.clipboard.writeText(paySettings.bank_account)} className="text-zinc-500 hover:text-white"><Copy size={13}/></button>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-zinc-400 text-sm">Account Name</span>
                                                        <span className="text-white font-semibold">{paySettings?.bank_holder || '—'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-zinc-400 text-sm">Amount</span>
                                                        <span className="text-yellow-400 font-bold">Rs {paySettings?.boost_price || 200}</span>
                                                    </div>
                                                </div>
                                                <p className="text-zinc-500 text-xs">Transfer via connect IPS, mobile banking or visit any branch</p>
                                            </>
                                        )}
                                    </div>
                                    )}
                                    {!paySettingsLoading && paySettings && (
                                    <button onClick={() => setBoostStep(3)}
                                        className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 rounded-xl transition text-sm">
                                        I've Paid — Upload Proof <ChevronRight size={16}/>
                                    </button>
                                    )}
                                </div>
                            )}

                            {/* Step 3: Upload proof */}
                            {boostStep === 3 && (
                                <div className="space-y-4">
                                    <p className="text-zinc-400 text-sm font-semibold">Upload Payment Screenshot</p>
                                    <label className={`block w-full border-2 border-dashed rounded-xl cursor-pointer transition overflow-hidden ${boostProofPreview ? 'border-yellow-500/50' : 'border-zinc-700 hover:border-zinc-500'}`}>
                                        {boostProofPreview ? (
                                            <img src={boostProofPreview} className="w-full max-h-60 object-contain bg-zinc-900"/>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-10 gap-2">
                                                <ImageIcon size={32} className="text-zinc-600"/>
                                                <p className="text-zinc-500 text-sm">Tap to upload screenshot</p>
                                                <p className="text-zinc-600 text-xs">JPG, PNG supported</p>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                                            const f = e.target.files[0];
                                            if (f) { setBoostProof(f); setBoostProofPreview(URL.createObjectURL(f)); }
                                        }}/>
                                    </label>
                                    {boostProofPreview && (
                                        <button onClick={() => { setBoostProof(null); setBoostProofPreview(''); }}
                                            className="text-xs text-zinc-500 hover:text-red-400 transition">✕ Remove image</button>
                                    )}
                                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-start gap-2">
                                        <CheckCircle2 size={14} className="text-yellow-400 flex-shrink-0 mt-0.5"/>
                                        <p className="text-zinc-400 text-xs">After submission, admin will verify your payment and activate the boost within 24 hours. Your listing will be pinned to the top for 7 days.</p>
                                    </div>
                                    <button onClick={submitBoostRequest} disabled={!boostProof || submittingBoost}
                                        className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-black font-bold py-3.5 rounded-xl transition text-sm">
                                        {submittingBoost ? 'Submitting...' : <><Zap size={16}/> Submit Boost Request</>}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {/* ── EDIT LISTING MODAL ── */}
            {editListing && (
                <div className="fixed inset-0 z-[120] bg-black/90 flex items-end sm:items-center justify-center" onClick={() => setEditListing(null)}>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-800">
                            <h2 className="text-white font-bold text-lg">Edit Listing</h2>
                            <button onClick={() => setEditListing(null)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Title *</label>
                                <input value={editForm.title} onChange={e => setEditForm(f => ({...f, title: e.target.value}))}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50"/>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Price (NPR)</label>
                                    <input value={editForm.price} onChange={e => setEditForm(f => ({...f, price: e.target.value}))}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50"/>
                                </div>
                                <div>
                                    <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Condition</label>
                                    <select value={editForm.condition} onChange={e => setEditForm(f => ({...f, condition: e.target.value}))}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50">
                                        {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Location</label>
                                <input value={editForm.location} onChange={e => setEditForm(f => ({...f, location: e.target.value}))}
                                    placeholder="City, Area..." className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50 placeholder-zinc-600"/>
                            </div>
                            <div>
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Description</label>
                                <textarea value={editForm.description} onChange={e => setEditForm(f => ({...f, description: e.target.value}))}
                                    rows={3} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50 resize-none"/>
                            </div>
                            <button onClick={saveEdit} disabled={editing || !editForm.title?.trim()}
                                className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-black font-bold py-3.5 rounded-xl transition text-sm">
                                {editing ? 'Saving...' : <><Edit2 size={15}/> Save Changes</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}