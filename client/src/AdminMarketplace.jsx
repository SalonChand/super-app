import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Trash2, ShoppingBag, Search, X, AlertTriangle, Zap, CheckCircle, XCircle, Clock, Eye, Upload, Save, RefreshCw } from 'lucide-react';

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

    const [tab, setTab] = useState('listings');
    const [listings, setListings] = useState([]);
    const [boostRequests, setBoostRequests] = useState([]);
    const [renewalRequests, setRenewalRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [viewProof, setViewProof] = useState(null);
    const [stats, setStats] = useState({ total: 0, categories: {}, pendingBoosts: 0, pendingRenewals: 0 });

    // Payment settings state
    const [paySettings, setPaySettings] = useState({
        esewa_number: '', esewa_name: '', esewa_qr: '',
        khalti_number: '', khalti_name: '', khalti_qr: '',
        bank_name: '', bank_account: '', bank_holder: '', bank_qr: '',
        boost_price: '200',
        verify_price: '199',
    });
    const [payQrPreviews, setPayQrPreviews] = useState({ esewa: '', khalti: '', bank: '' });
    const [payQrFiles, setPayQrFiles] = useState({ esewa: null, khalti: null, bank: null });
    const [savingPay, setSavingPay] = useState(false);
    const [paySaved, setPaySaved] = useState(false);

    useEffect(() => {
        if (!isAdmin) { navigate('/settings'); return; }
        fetchListings();
        fetchBoostRequests();
        fetchRenewalRequests();
        fetchPaySettings();
    }, [search, category]);

    const fetchListings = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ adminId, q: search, category });
            const res = await fetch(`${BACKEND_URL}/api/admin/marketplace?${params}`);
            const data = await res.json();
            setListings(Array.isArray(data) ? data : []);
            const cats = {};
            data.forEach(l => { cats[l.category] = (cats[l.category] || 0) + 1; });
            setStats(s => ({ ...s, total: data.length, categories: cats }));
        } catch { setListings([]); }
        setLoading(false);
    };

    const fetchBoostRequests = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/boost-requests?adminId=${adminId}`);
            const data = await res.json();
            const requests = Array.isArray(data) ? data : [];
            setBoostRequests(requests);
            setStats(s => ({ ...s, pendingBoosts: requests.filter(r => r.status === 'pending').length }));
        } catch { setBoostRequests([]); }
    };

    const fetchRenewalRequests = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/renewal-requests?adminId=${adminId}`);
            const data = await res.json();
            const requests = Array.isArray(data) ? data : [];
            setRenewalRequests(requests);
            setStats(s => ({ ...s, pendingRenewals: requests.filter(r => r.status === 'pending').length }));
        } catch { setRenewalRequests([]); }
    };

    const handleRenewalRequest = async (id, action, adminNote = '') => {
        try {
            await fetch(`${BACKEND_URL}/api/admin/renewal-requests/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, adminNote }),
            });
            setRenewalRequests(prev => prev.map(r => r.id === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r));
            setStats(s => ({ ...s, pendingRenewals: Math.max(0, s.pendingRenewals - 1) }));
        } catch { alert('Action failed'); }
    };

    const fetchPaySettings = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/payment-settings?adminId=${adminId}`);
            const data = await res.json();
            if (data && !data.error) {
                setPaySettings(s => ({ ...s, ...data }));
                const resolveUrl = (url) => !url ? '' : url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
                setPayQrPreviews({
                    esewa: resolveUrl(data.esewa_qr),
                    khalti: resolveUrl(data.khalti_qr),
                    bank: resolveUrl(data.bank_qr),
                });
            }
        } catch {}
    };

    const handleQrPick = (method, file) => {
        if (!file) return;
        setPayQrFiles(f => ({ ...f, [method]: file }));
        setPayQrPreviews(p => ({ ...p, [method]: URL.createObjectURL(file) }));
    };

    const savePaySettings = async () => {
        setSavingPay(true);
        try {
            const fd = new FormData();
            fd.append('adminId', adminId);
            Object.entries(paySettings).forEach(([k, v]) => fd.append(k, v || ''));
            if (payQrFiles.esewa) fd.append('esewa_qr_file', payQrFiles.esewa);
            if (payQrFiles.khalti) fd.append('khalti_qr_file', payQrFiles.khalti);
            if (payQrFiles.bank) fd.append('bank_qr_file', payQrFiles.bank);
            const res = await fetch(`${BACKEND_URL}/api/admin/payment-settings`, { method: 'POST', body: fd });
            const data = await res.json();
            if (data.error) { alert(data.error); }
            else { setPaySaved(true); setTimeout(() => setPaySaved(false), 3000); }
        } catch { alert('Failed to save settings'); }
        setSavingPay(false);
    };

    const deleteListing = async (id) => {
        try {
            await fetch(`${BACKEND_URL}/api/admin/marketplace/${id}`, {
                method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId })
            });
            setListings(prev => prev.filter(l => l.id !== id));
            setConfirmDelete(null);
        } catch { alert('Failed to delete'); }
    };

    const handleBoostRequest = async (id, action) => {
        try {
            await fetch(`${BACKEND_URL}/api/admin/boost-requests/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId, action })
            });
            setBoostRequests(prev => prev.map(r => r.id === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r));
            setStats(s => ({ ...s, pendingBoosts: Math.max(0, s.pendingBoosts - 1) }));
        } catch { alert('Failed to process request'); }
    };

    const QrUploadBox = ({ method, label, preview }) => (
        <label className={`flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed cursor-pointer transition overflow-hidden ${preview ? 'border-zinc-600' : 'border-zinc-700 hover:border-zinc-500'}`}
            style={{ aspectRatio: '1' }}>
            {preview
                ? <img src={preview} className="w-full h-full object-contain bg-zinc-900"/>
                : <div className="flex flex-col items-center gap-2 py-8">
                    <Upload size={22} className="text-zinc-600"/>
                    <span className="text-zinc-600 text-xs text-center px-2">Upload {label} QR Code</span>
                  </div>
            }
            <input type="file" accept="image/*" className="hidden" onChange={e => handleQrPick(method, e.target.files[0])}/>
        </label>
    );

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
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
                        <p className="text-2xl font-bold text-pink-400">{stats.total}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">Listings</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
                        <p className="text-2xl font-bold text-blue-400">{Object.keys(stats.categories).length}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">Categories</p>
                    </div>
                    <div className={`border rounded-2xl p-3 text-center ${stats.pendingBoosts > 0 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-zinc-900 border-zinc-800'}`}>
                        <p className={`text-2xl font-bold ${stats.pendingBoosts > 0 ? 'text-yellow-400' : 'text-zinc-500'}`}>{stats.pendingBoosts}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">Boost Pending</p>
                    </div>
                    <div className={`border rounded-2xl p-3 text-center ${stats.pendingRenewals > 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-zinc-900 border-zinc-800'}`}>
                        <p className={`text-2xl font-bold ${stats.pendingRenewals > 0 ? 'text-blue-400' : 'text-zinc-500'}`}>{stats.pendingRenewals}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">Renewals Pending</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                    {[
                        { id: 'listings', label: 'Listings' },
                        { id: 'boosts', label: 'Boosts', badge: stats.pendingBoosts },
                        { id: 'renewals', label: 'Renewals', badge: stats.pendingRenewals },
                        { id: 'payment', label: 'Payment' },
                    ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 ${
                                tab === t.id
                                    ? t.id === 'payment' ? 'bg-green-500/20 text-green-400'
                                    : t.id === 'boosts' ? 'bg-yellow-500/20 text-yellow-400'
                                    : t.id === 'renewals' ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-zinc-700 text-white'
                                : 'text-zinc-500 hover:text-white'}`}>
                            {t.label}
                            {t.badge > 0 && <span className={`text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${t.id === 'renewals' ? 'bg-blue-400' : 'bg-yellow-400'}`}>{t.badge}</span>}
                        </button>
                    ))}
                </div>

                {/* ── LISTINGS TAB ── */}
                {tab === 'listings' && (
                    <>
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
                        <div className="flex gap-2">
                            <div className="flex-1 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
                                <Search size={16} className="text-zinc-500 flex-shrink-0"/>
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search listings..."
                                    className="bg-transparent text-white text-sm outline-none w-full placeholder-zinc-600"/>
                                {search && <button onClick={() => setSearch('')}><X size={14} className="text-zinc-500"/></button>}
                            </div>
                            <select value={category} onChange={e => setCategory(e.target.value)}
                                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm outline-none">
                                <option value="">All</option>
                                {categories.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                            </select>
                        </div>
                        {loading ? (
                            <div className="text-center py-10 text-zinc-500 animate-pulse">Loading...</div>
                        ) : listings.length === 0 ? (
                            <div className="text-center py-10 text-zinc-500">No listings found</div>
                        ) : (
                            <div className="space-y-3">
                                {listings.map(listing => {
                                    const images = safeParseImages(listing.images);
                                    return (
                                        <div key={listing.id} className={`bg-zinc-900 border rounded-2xl overflow-hidden ${listing.is_boosted ? 'border-yellow-500/40' : 'border-zinc-800'}`}>
                                            {listing.is_boosted && (
                                                <div className="flex items-center gap-1.5 bg-yellow-500/20 px-3 py-1.5 border-b border-yellow-500/20">
                                                    <Zap size={11} className="text-yellow-400"/><span className="text-yellow-400 text-xs font-bold">BOOSTED</span>
                                                </div>
                                            )}
                                            <div className="flex gap-3 p-3">
                                                <div className="w-20 h-20 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
                                                    {images[0] ? <img src={images[0]} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={24} className="text-zinc-600"/></div>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="text-white font-bold text-sm truncate">{listing.title}</p>
                                                            <p className="text-pink-400 font-bold text-sm">NPR {listing.price}</p>
                                                        </div>
                                                        <button onClick={() => setConfirmDelete(listing)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg p-1.5 transition flex-shrink-0">
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{listing.category}</span>
                                                        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{listing.condition_type}</span>
                                                        {listing.status === 'sold' && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Sold</span>}
                                                    </div>
                                                    <p className="text-zinc-500 text-xs mt-1">By <span className="text-zinc-300">{listing.username || `User #${listing.seller_id}`}</span>{listing.location && ` · ${listing.location}`}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* ── BOOST REQUESTS TAB ── */}
                {tab === 'boosts' && (
                    <div className="space-y-3">
                        {boostRequests.length === 0 ? (
                            <div className="text-center py-16">
                                <Zap size={40} className="text-zinc-700 mx-auto mb-3"/>
                                <p className="text-zinc-500 font-semibold">No boost requests yet</p>
                            </div>
                        ) : boostRequests.map(req => (
                            <div key={req.id} className={`bg-zinc-900 border rounded-2xl overflow-hidden ${req.status === 'pending' ? 'border-yellow-500/30' : req.status === 'approved' ? 'border-green-500/30' : 'border-red-500/20'}`}>
                                <div className={`flex items-center gap-2 px-4 py-2 border-b ${req.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/20' : req.status === 'approved' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                    {req.status === 'pending' && <><Clock size={12} className="text-yellow-400"/><span className="text-yellow-400 text-xs font-bold uppercase">Pending Review</span></>}
                                    {req.status === 'approved' && <><CheckCircle size={12} className="text-green-400"/><span className="text-green-400 text-xs font-bold uppercase">Approved</span></>}
                                    {req.status === 'rejected' && <><XCircle size={12} className="text-red-400"/><span className="text-red-400 text-xs font-bold uppercase">Rejected</span></>}
                                    <span className="text-zinc-600 text-xs ml-auto">{new Date(req.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div>
                                        <p className="text-white font-bold text-sm">{req.listing_title}</p>
                                        <p className="text-zinc-500 text-xs mt-0.5">
                                            By <span className="text-zinc-300">{req.username}</span> · <span className="uppercase font-semibold">{req.payment_method}</span> · <span className="text-yellow-400 font-semibold">Rs {paySettings.boost_price || 200}</span>
                                        </p>
                                    </div>
                                    {req.proof_url && (
                                        <button onClick={() => setViewProof(req.proof_url)}
                                            className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 w-full">
                                            <Eye size={14}/> View Payment Screenshot
                                        </button>
                                    )}
                                    {req.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <button onClick={() => handleBoostRequest(req.id, 'reject')}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/20 transition">
                                                <XCircle size={15}/> Reject
                                            </button>
                                            <button onClick={() => handleBoostRequest(req.id, 'approve')}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-bold hover:bg-green-500/20 transition">
                                                <CheckCircle size={15}/> Approve Boost
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── RENEWALS TAB ── */}
                {tab === 'renewals' && (
                    <div className="space-y-3">
                        {renewalRequests.length === 0 && (
                            <div className="text-center py-12 text-zinc-600">
                                <div className="text-4xl mb-2">🔄</div>
                                <p className="text-sm">No renewal requests yet</p>
                            </div>
                        )}
                        {renewalRequests.map(req => (
                            <div key={req.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0 flex items-center justify-center">
                                            {req.profile_pic_url
                                                ? <img src={req.profile_pic_url} className="w-full h-full object-cover" alt=""/>
                                                : <span className="text-white text-sm font-bold">{req.seller_name?.charAt(0).toUpperCase()}</span>}
                                        </div>
                                        <div>
                                            <p className="text-white font-semibold text-sm">{req.seller_name}</p>
                                            <p className="text-zinc-500 text-xs">{new Date(req.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                                        req.status === 'pending' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                        req.status === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                        'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                        {req.status === 'pending' ? '⏳ Pending' : req.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                                    </span>
                                </div>

                                {/* Listing info */}
                                <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-3 py-2.5">
                                    <p className="text-white font-semibold text-sm truncate">{req.listing_title}</p>
                                    <p className="text-zinc-500 text-xs mt-0.5">Listing ID #{req.listing_id} · Status: <span className="text-zinc-300">{req.listing_status || 'unknown'}</span></p>
                                </div>

                                {/* Reason */}
                                <div>
                                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Reason</p>
                                    <p className="text-zinc-200 text-sm leading-relaxed bg-zinc-800/40 rounded-xl px-3 py-2">{req.reason}</p>
                                </div>

                                {/* Duration & contact */}
                                <div className="flex gap-3">
                                    <div className="flex-1 bg-zinc-800/40 rounded-xl px-3 py-2">
                                        <p className="text-zinc-500 text-xs">Duration Requested</p>
                                        <p className="text-white font-bold text-sm">{req.duration_days} days</p>
                                    </div>
                                    {req.contact && (
                                        <div className="flex-1 bg-zinc-800/40 rounded-xl px-3 py-2">
                                            <p className="text-zinc-500 text-xs">Contact</p>
                                            <p className="text-white text-sm truncate">{req.contact}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Admin note if exists */}
                                {req.admin_note && (
                                    <div className="bg-zinc-800/40 rounded-xl px-3 py-2">
                                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-0.5">Admin Note</p>
                                        <p className="text-zinc-300 text-xs">{req.admin_note}</p>
                                    </div>
                                )}

                                {/* Action buttons */}
                                {req.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <button onClick={() => handleRenewalRequest(req.id, 'reject')}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/20 transition">
                                            <XCircle size={15}/> Reject
                                        </button>
                                        <button onClick={() => handleRenewalRequest(req.id, 'approve')}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-bold hover:bg-green-500/20 transition">
                                            <CheckCircle size={15}/> Approve ({req.duration_days}d)
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* ── PAYMENT SETTINGS TAB ── */}
                {tab === 'payment' && (
                    <div className="space-y-5 pb-4">
                        {/* Boost price */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Zap size={15} className="text-yellow-400"/>
                                <p className="text-white font-bold text-sm">Boost Price</p>
                            </div>
                            <div>
                                <label className="text-zinc-500 text-xs mb-1 block">Amount (NPR) — charged per 7-day boost</label>
                                <input value={paySettings.boost_price}
                                    onChange={e => setPaySettings(s => ({ ...s, boost_price: e.target.value }))}
                                    placeholder="200"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50"/>
                            </div>
                        </div>

                        {/* Verification Price */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">✅</span>
                                <p className="text-white font-bold text-sm">Verification Price</p>
                            </div>
                            <div>
                                <label className="text-zinc-500 text-xs mb-1 block">Amount (NPR) — charged per month after free slots fill up</label>
                                <input value={paySettings.verify_price || '199'}
                                    onChange={e => setPaySettings(s => ({ ...s, verify_price: e.target.value }))}
                                    placeholder="199"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/50"/>
                            </div>
                        </div>

                        {/* eSewa */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">🟢</span>
                                <p className="text-green-400 font-bold">eSewa</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-zinc-500 text-xs mb-1 block">eSewa Number</label>
                                    <input value={paySettings.esewa_number}
                                        onChange={e => setPaySettings(s => ({ ...s, esewa_number: e.target.value }))}
                                        placeholder="98XXXXXXXX"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-green-500/50"/>
                                </div>
                                <div>
                                    <label className="text-zinc-500 text-xs mb-1 block">Account Name</label>
                                    <input value={paySettings.esewa_name}
                                        onChange={e => setPaySettings(s => ({ ...s, esewa_name: e.target.value }))}
                                        placeholder="Your Name"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-green-500/50"/>
                                </div>
                            </div>
                            <div>
                                <label className="text-zinc-500 text-xs mb-2 block">QR Code</label>
                                <QrUploadBox method="esewa" label="eSewa" preview={payQrPreviews.esewa}/>
                                {payQrPreviews.esewa && (
                                    <button onClick={() => { setPayQrFiles(f => ({...f, esewa: null})); setPayQrPreviews(p => ({...p, esewa: ''})); setPaySettings(s => ({...s, esewa_qr: ''})); }}
                                        className="text-xs text-red-400 hover:text-red-300 mt-1.5 block">✕ Remove QR</button>
                                )}
                            </div>
                        </div>

                        {/* Khalti */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">🟣</span>
                                <p className="text-purple-400 font-bold">Khalti</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-zinc-500 text-xs mb-1 block">Khalti Number</label>
                                    <input value={paySettings.khalti_number}
                                        onChange={e => setPaySettings(s => ({ ...s, khalti_number: e.target.value }))}
                                        placeholder="98XXXXXXXX"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-purple-500/50"/>
                                </div>
                                <div>
                                    <label className="text-zinc-500 text-xs mb-1 block">Account Name</label>
                                    <input value={paySettings.khalti_name}
                                        onChange={e => setPaySettings(s => ({ ...s, khalti_name: e.target.value }))}
                                        placeholder="Your Name"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-purple-500/50"/>
                                </div>
                            </div>
                            <div>
                                <label className="text-zinc-500 text-xs mb-2 block">QR Code</label>
                                <QrUploadBox method="khalti" label="Khalti" preview={payQrPreviews.khalti}/>
                                {payQrPreviews.khalti && (
                                    <button onClick={() => { setPayQrFiles(f => ({...f, khalti: null})); setPayQrPreviews(p => ({...p, khalti: ''})); setPaySettings(s => ({...s, khalti_qr: ''})); }}
                                        className="text-xs text-red-400 hover:text-red-300 mt-1.5 block">✕ Remove QR</button>
                                )}
                            </div>
                        </div>

                        {/* Bank */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">🏦</span>
                                <p className="text-blue-400 font-bold">Bank Transfer</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-zinc-500 text-xs mb-1 block">Bank Name</label>
                                    <input value={paySettings.bank_name}
                                        onChange={e => setPaySettings(s => ({ ...s, bank_name: e.target.value }))}
                                        placeholder="e.g. Nabil Bank"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500/50"/>
                                </div>
                                <div>
                                    <label className="text-zinc-500 text-xs mb-1 block">Account Holder</label>
                                    <input value={paySettings.bank_holder}
                                        onChange={e => setPaySettings(s => ({ ...s, bank_holder: e.target.value }))}
                                        placeholder="Full Name"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500/50"/>
                                </div>
                            </div>
                            <div>
                                <label className="text-zinc-500 text-xs mb-1 block">Account Number</label>
                                <input value={paySettings.bank_account}
                                    onChange={e => setPaySettings(s => ({ ...s, bank_account: e.target.value }))}
                                    placeholder="0000000000000"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500/50"/>
                            </div>
                            <div>
                                <label className="text-zinc-500 text-xs mb-2 block">QR Code</label>
                                <QrUploadBox method="bank" label="Bank" preview={payQrPreviews.bank}/>
                                {payQrPreviews.bank && (
                                    <button onClick={() => { setPayQrFiles(f => ({...f, bank: null})); setPayQrPreviews(p => ({...p, bank: ''})); setPaySettings(s => ({...s, bank_qr: ''})); }}
                                        className="text-xs text-red-400 hover:text-red-300 mt-1.5 block">✕ Remove QR</button>
                                )}
                            </div>
                        </div>

                        {/* Save */}
                        <button onClick={savePaySettings} disabled={savingPay}
                            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition disabled:opacity-50 ${paySaved ? 'bg-green-500 text-white' : 'bg-yellow-400 hover:bg-yellow-300 text-black'}`}>
                            {savingPay ? 'Saving...' : paySaved ? <><CheckCircle size={16}/> Saved!</> : <><Save size={16}/> Save Payment Settings</>}
                        </button>
                    </div>
                )}
            </div>

            {/* View Proof Modal */}
            {viewProof && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setViewProof(null)}>
                    <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setViewProof(null)} className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white z-10"><X size={18}/></button>
                        <img src={`${BACKEND_URL}${viewProof}`} className="w-full rounded-2xl"/>
                    </div>
                </div>
            )}

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
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-bold hover:bg-zinc-700 transition">Cancel</button>
                            <button onClick={() => deleteListing(confirmDelete.id)} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
