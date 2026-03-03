import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';

function Register() {
    const[username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const[password, setPassword] = useState('');
    const[message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            // 🔥 Dynamic API Call!
            const response = await axios.post('/api/register', { username, email, password });
            setMessage("✅ " + response.data.message);
            setTimeout(() => navigate('/login'), 1500);
        } catch (error) {
            setMessage("❌ " + (error.response?.data?.error || "Server error"));
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh] px-4 animate-fade-in">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mb-4">
                        <UserPlus size={24} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Create Account</h2>
                    <p className="text-zinc-500 mt-2">Join the SuperApp community.</p>
                </div>
                <form onSubmit={handleRegister} className="flex flex-col gap-4">
                    <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors" />
                    <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors" />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors" />
                    <button type="submit" className="w-full bg-purple-600 text-white font-bold text-lg py-4 rounded-xl mt-2 hover:bg-purple-500 transition-colors shadow-lg shadow-purple-500/30">Sign Up</button>
                </form>
                {message && <div className="mt-4 p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-center text-sm font-medium">{message}</div>}
                <p className="text-center text-zinc-500 mt-8 text-sm">Already have an account? <Link to="/login" className="text-purple-500 hover:underline font-medium">Sign in</Link></p>
            </div>
        </div>
    );
}
export default Register;