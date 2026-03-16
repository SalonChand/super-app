import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, ShieldCheck, Zap, Eye, EyeOff, ArrowLeft } from 'lucide-react';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [requires2FA, setRequires2FA] = useState(false);
    const [pendingUserId, setPendingUserId] = useState(null);
    const [totpCode, setTotpCode] = useState('');
    const [totpLoading, setTotpLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post('/api/login', { email, password });
            if (response.data.requires_2fa) {
                setPendingUserId(response.data.userId);
                setRequires2FA(true);
                setMessage('');
                setLoading(false);
                return;
            }
            finishLogin(response.data);
        } catch (error) {
            setMessage(error.response?.data?.error || "Server error");
            setLoading(false);
        }
    };

    const handleTotpSubmit = async (e) => {
        e.preventDefault();
        setTotpLoading(true);
        try {
            const response = await axios.post('/api/login', { email, password, totp_code: totpCode });
            finishLogin(response.data);
        } catch (error) {
            setMessage(error.response?.data?.error || "Invalid 2FA code");
        }
        setTotpLoading(false);
    };

    const finishLogin = (data) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('username', data.user.username);
        localStorage.setItem('loginUsername', data.user.loginUsername || data.user.username);
        localStorage.setItem('userRole', data.user.role || 'user');
        window.location.href = '/';
    };

    if (requires2FA) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4 py-12 relative overflow-hidden">
                {/* Background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-green-600/5 blur-3xl pointer-events-none" />
                <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-blue-600/5 blur-3xl pointer-events-none" />

                <div className="w-full max-w-md relative animate-fade-in">
                    {/* Card */}
                    <div className="bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl shadow-black/60">
                        {/* Logo */}
                        <div className="flex flex-col items-center mb-8">
                            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-green-500/30">
                                <ShieldCheck size={26} className="text-white" />
                            </div>
                            <h2 className="text-2xl font-black text-white">Two-Factor Auth</h2>
                            <p className="text-zinc-400 mt-2 text-center text-sm leading-relaxed max-w-xs">
                                Open your authenticator app and enter the 6-digit code.
                            </p>
                        </div>

                        <form onSubmit={handleTotpSubmit} className="flex flex-col gap-4">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="000 000"
                                value={totpCode}
                                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                required
                                autoFocus
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white text-center text-3xl font-mono tracking-[0.5em] placeholder-zinc-700 focus:outline-none focus:border-green-500/70 focus:ring-1 focus:ring-green-500/30 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={totpCode.length !== 6 || totpLoading}
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-base py-4 rounded-2xl mt-1 transition-all shadow-xl shadow-green-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-green-600 disabled:hover:to-emerald-600"
                            >
                                {totpLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Verifying...
                                    </span>
                                ) : 'Verify & Sign In'}
                            </button>
                        </form>

                        {message && (
                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center text-sm">
                                {message}
                            </div>
                        )}

                        <button
                            onClick={() => { setRequires2FA(false); setMessage(''); setTotpCode(''); }}
                            className="w-full text-center text-zinc-500 hover:text-zinc-300 mt-5 text-sm transition-colors flex items-center justify-center gap-1.5"
                        >
                            <ArrowLeft size={14} />
                            Back to login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Background glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-blue-600/8 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-violet-600/6 blur-3xl pointer-events-none" />
            {/* Grid pattern */}
            <div
                className="absolute inset-0 opacity-[0.025] pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }}
            />

            <div className="w-full max-w-md relative animate-fade-in">
                {/* Card */}
                <div className="bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 shadow-2xl shadow-black/60">
                    {/* Brand */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <Zap size={16} className="text-white" />
                            </div>
                            <span className="font-black text-xl bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">SuperApp</span>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-blue-500/30">
                            <LogIn size={22} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-white">Welcome back</h2>
                        <p className="text-zinc-400 mt-1 text-sm">Sign in to your SuperApp account</p>
                    </div>

                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        {/* Email field */}
                        <div>
                            <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm"
                            />
                        </div>

                        {/* Password field */}
                        <div>
                            <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-3.5 pr-12 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>
                        </div>

                        {/* Sign in button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold text-base py-4 rounded-2xl mt-2 transition-all shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    {message && (
                        <div className="mt-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center text-sm">
                            {message}
                        </div>
                    )}

                    <p className="text-center text-zinc-500 mt-7 text-sm">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                            Create one free
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;
