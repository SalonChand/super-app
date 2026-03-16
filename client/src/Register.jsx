import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Zap, Eye, EyeOff, Check, ArrowLeft, ArrowRight } from 'lucide-react';

function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const passwordStrength = (p) => {
        if (!p) return { score: 0, label: '', color: '' };
        let score = 0;
        if (p.length >= 8) score++;
        if (/[A-Z]/.test(p)) score++;
        if (/[0-9]/.test(p)) score++;
        if (/[^A-Za-z0-9]/.test(p)) score++;
        const map = [
            { score: 0, label: '', color: '' },
            { score: 1, label: 'Weak', color: 'bg-red-500' },
            { score: 2, label: 'Fair', color: 'bg-orange-500' },
            { score: 3, label: 'Good', color: 'bg-yellow-500' },
            { score: 4, label: 'Strong', color: 'bg-green-500' },
        ];
        return map[score];
    };

    const strength = passwordStrength(password);

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post('/api/register', { username, email, password });
            setMessage('✅ ' + response.data.message);
            setTimeout(() => navigate('/login'), 1500);
        } catch (error) {
            setMessage('❌ ' + (error.response?.data?.error || 'Server error'));
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Background glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-violet-600/8 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-blue-600/6 blur-3xl pointer-events-none" />
            {/* Grid pattern */}
            <div
                className="absolute inset-0 opacity-[0.025] pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }}
            />

            <div className="w-full max-w-md relative animate-fade-in">
                {/* Back to landing */}
                <Link to="/landing" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm mb-6 transition-colors">
                    <ArrowLeft size={14} />
                    Back to home
                </Link>

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
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-violet-500/30">
                            <UserPlus size={22} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-white">Create your account</h2>
                        <p className="text-zinc-400 mt-1 text-sm">Join Nepal's #1 super social platform</p>
                    </div>

                    {/* Perks */}
                    <div className="grid grid-cols-3 gap-2 mb-7">
                        {['Free forever', 'No ads spam', 'Secure & private'].map((perk) => (
                            <div key={perk} className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-2 py-2 text-center">
                                <div className="text-green-400 text-xs font-semibold flex items-center justify-center gap-1">
                                    <Check size={10} />
                                    {perk}
                                </div>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleRegister} className="flex flex-col gap-4">
                        {/* Username field */}
                        <div>
                            <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Username</label>
                            <input
                                type="text"
                                placeholder="cooluser123"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/30 transition-all text-sm"
                            />
                        </div>

                        {/* Email field */}
                        <div>
                            <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/30 transition-all text-sm"
                            />
                        </div>

                        {/* Password field */}
                        <div>
                            <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Create a strong password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-3.5 pr-12 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/30 transition-all text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>
                            {/* Password strength indicator */}
                            {password && (
                                <div className="mt-2">
                                    <div className="flex gap-1 mb-1">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : 'bg-zinc-800'}`}
                                            />
                                        ))}
                                    </div>
                                    {strength.label && (
                                        <span className={`text-xs font-medium ${
                                            strength.score <= 1 ? 'text-red-400' :
                                            strength.score === 2 ? 'text-orange-400' :
                                            strength.score === 3 ? 'text-yellow-400' :
                                            'text-green-400'
                                        }`}>{strength.label} password</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Sign up button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="group w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-base py-4 rounded-2xl mt-2 transition-all shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {message && (
                        <div className={`mt-4 p-3.5 rounded-xl text-center text-sm border ${
                            message.startsWith('✅')
                                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                            {message}
                        </div>
                    )}

                    <p className="text-center text-zinc-500 mt-7 text-sm">
                        Already have an account?{' '}
                        <Link to="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                            Sign in
                        </Link>
                    </p>

                    <p className="text-center text-zinc-600 mt-3 text-xs leading-relaxed">
                        By signing up, you agree to our{' '}
                        <a href="#" className="text-zinc-500 hover:text-zinc-400 transition-colors">Terms of Service</a>
                        {' '}and{' '}
                        <a href="#" className="text-zinc-500 hover:text-zinc-400 transition-colors">Privacy Policy</a>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Register;
