import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // 🔥 Dynamic API Call!
            const response = await axios.post('/api/login', { email, password });
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('userId', response.data.user.id);
            window.location.href = '/';
        } catch (error) {
            setMessage(error.response?.data?.error || "Server error");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh] px-4 animate-fade-in">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                        <LogIn size={24} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
                    <p className="text-zinc-500 mt-2">Enter your details to sign in.</p>
                </div>
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors" />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors" />
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl mt-2 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/30">Sign In</button>
                </form>
                {message && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-center text-sm font-medium">{message}</div>}
                <p className="text-center text-zinc-500 mt-8 text-sm">Don't have an account? <Link to="/register" className="text-blue-500 hover:underline font-medium">Sign up</Link></p>
            </div>
        </div>
    );
}
export default Login;