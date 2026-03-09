import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Settings, Save, RefreshCw } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

export default function AdminAppSettings() {
    const adminId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const loginUsername = localStorage.getItem('loginUsername');
    const isAdmin = userRole === 'superadmin' || loginUsername === 'superadmin' || adminId === '1';
    const [settings, setSettings] = useState({ allow_registration: true, maintenance_mode: false, max_post_length: 2000, app_name: 'SuperApp' });
    const [loading, setLoading] = useState(true);
    const [saveMsg, setSaveMsg] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/api/admin/app-settings?adminId=${adminId}`);
            if (res.data && !res.data.error) setSettings(res.data);
        } catch(e) {}
        setLoading(false);
    };

    const save = async () => {
        setSaveMsg('Saving...');
        try {
            await axios.put(`${BACKEND_URL}/api/admin/app-settings`, { adminId, settings });
            setSaveMsg('✅ Saved!');
        } catch(e) { setSaveMsg('❌ Failed'); }
        setTimeout(() => setSaveMsg(''), 2500);
    };

    useEffect(() => { if (isAdmin) load(); }, []);

    const Toggle = ({ label, desc, value, onChange }) => (
        <div className="flex items-center justify-between py-3">
            <div>
                <p className="text-white text-sm font-semibold">{label}</p>
                {desc && <p className="text-zinc-500 text-xs">{desc}</p>}
            </div>
            <button onClick={() => onChange(!value)}
                className={`w-12 h-6 rounded-full transition-colors relative ${value ? 'bg-yellow-500' : 'bg-zinc-700'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`}/>
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-black pb-24">
            <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
                <Link to="/admin" className="text-zinc-400 hover:text-white transition"><ChevronLeft size={24}/></Link>
                <Settings size={20} className="text-purple-400"/>
                <h1 className="text-white font-bold text-lg flex-1">App Settings</h1>
                <button onClick={load} className="text-zinc-400 hover:text-white p-1"><RefreshCw size={18} className={loading ? 'animate-spin' : ''}/></button>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 divide-y divide-zinc-800">
                    <Toggle label="Allow Registration" desc="New users can sign up" value={settings.allow_registration} onChange={v => setSettings(s => ({...s, allow_registration: v}))}/>
                    <Toggle label="Maintenance Mode" desc="Show maintenance page to users" value={settings.maintenance_mode} onChange={v => setSettings(s => ({...s, maintenance_mode: v}))}/>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">App Name</p>
                    <input value={settings.app_name} onChange={e => setSettings(s => ({...s, app_name: e.target.value}))}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-purple-500/50"/>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Max Post Length: {settings.max_post_length} chars</p>
                    <input type="range" min="100" max="5000" step="100" value={settings.max_post_length}
                        onChange={e => setSettings(s => ({...s, max_post_length: parseInt(e.target.value)}))}
                        className="w-full accent-purple-500"/>
                </div>

                {saveMsg && <p className={`text-center text-sm font-semibold ${saveMsg.startsWith('✅') ? 'text-green-400' : saveMsg.startsWith('❌') ? 'text-red-400' : 'text-zinc-400'}`}>{saveMsg}</p>}

                <button onClick={save} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-purple-500 hover:bg-purple-400 text-white font-bold transition">
                    <Save size={16}/> Save Settings
                </button>
            </div>
        </div>
    );
}
