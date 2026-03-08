import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Bell, Shield, LogOut, ChevronRight, Moon, Trash2, Palette, ShieldCheck, BadgeCheck, Send } from 'lucide-react';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';
// Helper to convert VAPID keys
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
  return outputArray;
}

function Settings() {
    const navigate = useNavigate();
    const currentUserId = localStorage.getItem('userId');
    const[darkMode, setDarkMode] = useState(true);
    const[privateAccount, setPrivateAccount] = useState(false);
    const[notifications, setNotifications] = useState(true);
    const[showPasswordForm, setShowPasswordForm] = useState(false);
    const[oldPassword, setOldPassword] = useState('');
    const[newPassword, setNewPassword] = useState('');
    const[passwordMsg, setPasswordMsg] = useState('');
    const[birthday, setBirthday] = useState('');
    const[birthdayMsg, setBirthdayMsg] = useState('');
    // Accent color
    const[accentColor, setAccentColor] = useState('#3b82f6');
    const[accentMsg, setAccentMsg] = useState('');
    // 2FA
    const[twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const[show2FASetup, setShow2FASetup] = useState(false);
    const[twoFASecret, setTwoFASecret] = useState('');
    const[twoFAQR, setTwoFAQR] = useState('');
    const[twoFACode, setTwoFACode] = useState('');
    const[twoFAMsg, setTwoFAMsg] = useState('');
    const[verificationStatus, setVerificationStatus] = useState(null); // null | { is_verified, request }
    const[verifyReason, setVerifyReason] = useState('');
    const[verifyMsg, setVerifyMsg] = useState('');
    const[showVerifyForm, setShowVerifyForm] = useState(false);

    useEffect(() => {
        if (!currentUserId) return;
        const isDark = localStorage.getItem('darkMode') !== 'false';
        setDarkMode(isDark); if (!isDark) document.body.classList.add('light-theme');
        axios.get(`${BACKEND_URL}/api/users/${currentUserId}/settings`).then((res) => { 
            setPrivateAccount(res.data.is_private); 
            setNotifications(res.data.notifications); 
            if (res.data.birthday) setBirthday(res.data.birthday.slice(0,10));
            if (res.data.theme_color) setAccentColor(res.data.theme_color);
            setTwoFactorEnabled(!!res.data.two_factor_enabled);
        }).catch(err => console.error(err));
        axios.get(`${BACKEND_URL}/api/users/${currentUserId}/verification-status`)
            .then(res => setVerificationStatus(res.data))
            .catch(() => {});
    }, []);

    // 🔥 THE FIX: EXPLICIT BUTTON TO ASK FOR PUSH NOTIFICATIONS 🔥
    const enableOSNotifications = async () => {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                alert("Push notifications are not supported in this browser."); return;
            }
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                alert("Please allow notifications when prompted, then try again."); return;
            }
            // Register SW if needed
            let reg = await navigator.serviceWorker.getRegistration('/');
            if (!reg) reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            const readyReg = await navigator.serviceWorker.ready;

            // 🔑 Unsubscribe any old subscription to avoid key mismatch error
            const existing = await readyReg.pushManager.getSubscription();
            if (existing) await existing.unsubscribe();

            // Get fresh VAPID key and resubscribe
            const vapidRes = await axios.get(`${BACKEND_URL}/api/vapidPublicKey`);
            const convertedKey = urlBase64ToUint8Array(vapidRes.data);
            const subscription = await readyReg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedKey
            });
            await axios.post(`${BACKEND_URL}/api/subscribe`, {
                userId: currentUserId,
                subscription: subscription.toJSON()
            });
            alert("✅ Desktop alerts are now active!");
        } catch (e) {
            console.error("Push Error:", e);
            alert("Failed: " + e.message);
        }
    };

    const toggleDarkMode = () => { const newMode = !darkMode; setDarkMode(newMode); localStorage.setItem('darkMode', newMode); if (newMode) document.body.classList.remove('light-theme'); else document.body.classList.add('light-theme'); };
    const updateDbSettings = async (isPriv, notif) => { try { await axios.put(`${BACKEND_URL}/api/users/${currentUserId}/settings`, { is_private: isPriv, notifications: notif }); } catch (error) { console.error(error); } };
    const handlePrivateToggle = () => { const newVal = !privateAccount; setPrivateAccount(newVal); updateDbSettings(newVal, notifications); };
    const handleNotifToggle = () => { const newVal = !notifications; setNotifications(newVal); updateDbSettings(privateAccount, newVal); };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.put(`${BACKEND_URL}/api/users/${currentUserId}/password`, { oldPassword, newPassword });
            setPasswordMsg(`✅ ${res.data.message}`); setOldPassword(''); setNewPassword(''); setTimeout(() => { setShowPasswordForm(false); setPasswordMsg(''); }, 2000);
        } catch (error) { setPasswordMsg(`❌ ${error.response?.data?.error || "Error"}`); }
    };

    const saveBirthday = async () => {
        try {
            await axios.put(`${BACKEND_URL}/api/users/${currentUserId}/birthday`, { birthday: birthday || null });
            setBirthdayMsg('✅ Birthday saved!');
            setTimeout(() => setBirthdayMsg(''), 2500);
        } catch(e) { setBirthdayMsg('❌ Failed to save'); }
    };

    const saveAccentColor = async (color) => {
        setAccentColor(color);
        try {
            await axios.put(`${BACKEND_URL}/api/users/${currentUserId}/settings`, { 
                is_private: privateAccount, notifications, theme_color: color
            });
            setAccentMsg('✅ Accent color saved!');
            // Update theme in page immediately
            window.dispatchEvent(new CustomEvent('theme_color_changed', { detail: { color } }));
            setTimeout(() => setAccentMsg(''), 2000);
        } catch(e) { setAccentMsg('❌ Failed'); }
    };

    const setup2FA = async () => {
        try {
            const res = await axios.post(`${BACKEND_URL}/api/users/${currentUserId}/2fa/setup`);
            setTwoFASecret(res.data.secret);
            setTwoFAQR(res.data.qrCodeUrl);
            setShow2FASetup(true);
            setTwoFAMsg('');
        } catch(e) { setTwoFAMsg('❌ Setup failed'); }
    };

    const requestVerification = async () => {
        if (!verifyReason.trim()) { setVerifyMsg('Please explain why you should be verified.'); return; }
        try {
            await axios.post(`${BACKEND_URL}/api/users/${currentUserId}/request-verification`, { reason: verifyReason });
            setVerifyMsg('✅ Request submitted! We will review it shortly.');
            setVerifyReason('');
            const res = await axios.get(`${BACKEND_URL}/api/users/${currentUserId}/verification-status`);
            setVerificationStatus(res.data);
        } catch(e) { setVerifyMsg('Something went wrong. Try again.'); }
    };

    const verify2FA = async () => {
        try {
            await axios.post(`${BACKEND_URL}/api/users/${currentUserId}/2fa/verify`, { code: twoFACode });
            setTwoFactorEnabled(true);
            setShow2FASetup(false);
            setTwoFACode('');
            setTwoFAMsg('✅ 2FA enabled!');
            setTimeout(() => setTwoFAMsg(''), 3000);
        } catch(e) { setTwoFAMsg('❌ Invalid code. Try again.'); }
    };

    const disable2FA = async () => {
        if (!window.confirm('Disable two-factor authentication?')) return;
        try {
            await axios.post(`${BACKEND_URL}/api/users/${currentUserId}/2fa/disable`);
            setTwoFactorEnabled(false);
            setTwoFAMsg('2FA disabled.');
            setTimeout(() => setTwoFAMsg(''), 2000);
        } catch(e) { setTwoFAMsg('❌ Failed'); }
    };

    const handleDeleteAccount = async () => {
        if (window.confirm("Are you ABSOLUTELY sure? This will permanently delete your account.")) {
            try { await axios.delete(`${BACKEND_URL}/api/users/${currentUserId}`); handleLogout(); } catch (error) { console.error(error); }
        }
    };

    const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('userId'); document.body.classList.remove('light-theme'); window.location.href = '/login'; };

    if (!currentUserId) return <div className="p-8 text-center text-zinc-500">Please log in.</div>;

    return (
        <div className="w-full bg-black min-h-screen pb-20 sm:pb-0 animate-fade-in">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-10"><h2 className="text-2xl font-bold text-white">Settings</h2></div>
            <div className="p-4 space-y-6">
                <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-2">Account</h3>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                        <div onClick={() => navigate(`/profile/${currentUserId}`)} className="flex items-center justify-between p-4 hover:bg-zinc-800 cursor-pointer transition border-b border-zinc-800/50"><div className="flex items-center gap-4"><User className="text-blue-500" size={22} /><div><h3 className="text-white font-medium">Edit Profile</h3></div></div><ChevronRight className="text-zinc-600" size={20} /></div>
                        <div className="flex flex-col border-b border-zinc-800/50">
                            <div onClick={() => setShowPasswordForm(!showPasswordForm)} className="flex items-center justify-between p-4 hover:bg-zinc-800 cursor-pointer transition"><div className="flex items-center gap-4"><Lock className="text-zinc-400" size={22} /><div><h3 className="text-white font-medium">Password & Security</h3></div></div><ChevronRight className={`text-zinc-600 transition-transform ${showPasswordForm ? 'rotate-90' : ''}`} size={20} /></div>
                            {showPasswordForm && (<form onSubmit={handleChangePassword} className="p-4 bg-zinc-950 border-t border-zinc-800"><input type="password" placeholder="Current Password" required value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 mb-2 text-white outline-none" /><input type="password" placeholder="New Password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 mb-3 text-white outline-none" /><button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg">Update Password</button>{passwordMsg && <p className="text-center text-sm mt-2">{passwordMsg}</p>}</form>)}
                            {/* Birthday */}
                            <div className="p-4 border-t border-zinc-800/50">
                                <div className="flex items-center gap-4 mb-3">
                                    <span className="text-xl">🎂</span>
                                    <div><h3 className="text-white font-medium">Birthday</h3><p className="text-zinc-500 text-xs">Friends will be notified on your birthday</p></div>
                                </div>
                                <div className="flex gap-2">
                                    <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)}
                                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500 transition text-sm" />
                                    <button onClick={saveBirthday} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl transition text-sm">Save</button>
                                </div>
                                {birthdayMsg && <p className="text-sm mt-2 text-center">{birthdayMsg}</p>}
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-2">Preferences</h3>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 hover:bg-zinc-800 cursor-pointer transition border-b border-zinc-800/50" onClick={handlePrivateToggle}><div className="flex items-center gap-4"><Shield className="text-green-500" size={22} /><div><h3 className="text-white font-medium">Private Account</h3></div></div><div className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${privateAccount ? 'bg-green-500' : 'bg-zinc-700'}`}><div className={`w-4 h-4 bg-white rounded-full transition-transform ${privateAccount ? 'translate-x-6' : 'translate-x-0'}`}></div></div></div>
                        
                        {/* Accent Color */}
                        <div className="p-4 border-b border-zinc-800/50">
                            <div className="flex items-center gap-4 mb-3">
                                <Palette className="text-pink-400" size={22} />
                                <div><h3 className="text-white font-medium">Accent Color</h3><p className="text-zinc-500 text-xs">Applied everywhere across the app</p></div>
                                <div className="ml-auto w-7 h-7 rounded-full border-2 border-zinc-600" style={{backgroundColor: accentColor}}/>
                            </div>
                            <div className="flex flex-wrap gap-2 pl-[38px]">
                                {['#3b82f6','#8b5cf6','#ec4899','#f97316','#10b981','#ef4444','#eab308','#06b6d4','#f43f5e','#64748b','#84cc16','#a855f7'].map(color => (
                                    <button key={color} onClick={() => saveAccentColor(color)} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${accentColor === color ? 'border-white scale-110' : 'border-transparent'}`} style={{backgroundColor: color}} />
                                ))}
                            </div>
                            {accentMsg && <p className="text-sm mt-2 ml-[38px]">{accentMsg}</p>}
                        </div>
                        
                        {/* 🔥 EXPLICIT OS NOTIFICATION BUTTON 🔥 */}
                        <div className="flex items-center justify-between p-4 hover:bg-zinc-800 cursor-pointer transition border-b border-zinc-800/50" onClick={enableOSNotifications}><div className="flex items-center gap-4"><Bell className="text-pink-500" size={22} /><div><h3 className="text-white font-medium">Enable Desktop Alerts</h3></div></div></div>
                        
                        <div className="flex items-center justify-between p-4 hover:bg-zinc-800 cursor-pointer transition border-b border-zinc-800/50" onClick={handleNotifToggle}><div className="flex items-center gap-4"><Bell className="text-zinc-500" size={22} /><div><h3 className="text-white font-medium">In-App Sounds</h3></div></div><div className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${notifications ? 'bg-zinc-300' : 'bg-zinc-700'}`}><div className={`w-4 h-4 bg-black rounded-full transition-transform ${notifications ? 'translate-x-6' : 'translate-x-0'}`}></div></div></div>
                        <div className="flex items-center justify-between p-4 hover:bg-zinc-800 cursor-pointer transition" onClick={toggleDarkMode}><div className="flex items-center gap-4"><Moon className="text-purple-500" size={22} /><div><h3 className="text-white font-medium">Dark Mode</h3></div></div><div className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${darkMode ? 'bg-purple-500' : 'bg-zinc-700'}`}><div className={`w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0'}`}></div></div></div>
                    </div>
                </div>

                {/* 2FA Section */}
                <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-2">Security</h3>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-zinc-800/50">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-4">
                                    <ShieldCheck className={twoFactorEnabled ? "text-green-400" : "text-zinc-400"} size={22} />
                                    <div>
                                        <h3 className="text-white font-medium">Two-Factor Authentication</h3>
                                        <p className="text-zinc-500 text-xs">{twoFactorEnabled ? '✅ 2FA is active on this account' : 'Add an extra layer of security'}</p>
                                    </div>
                                </div>
                                {twoFactorEnabled ? (
                                    <button onClick={disable2FA} className="text-red-400 text-sm font-bold hover:text-red-300 transition px-3 py-1 rounded-full border border-red-500/30 hover:bg-red-500/10">Disable</button>
                                ) : (
                                    <button onClick={setup2FA} className="text-green-400 text-sm font-bold hover:text-green-300 transition px-3 py-1 rounded-full border border-green-500/30 hover:bg-green-500/10">Enable</button>
                                )}
                            </div>
                            {twoFAMsg && <p className="text-sm mt-1">{twoFAMsg}</p>}
                            {show2FASetup && (
                                <div className="mt-4 bg-zinc-950 rounded-2xl p-4 border border-zinc-800 animate-fade-in">
                                    <p className="text-white font-bold mb-2">1. Scan this QR code with an authenticator app</p>
                                    <div className="bg-white p-3 rounded-xl w-fit mb-3">
                                        <img src={twoFAQR} alt="2FA QR Code" className="w-40 h-40" />
                                    </div>
                                    <p className="text-zinc-400 text-xs mb-1">Or enter this secret manually:</p>
                                    <code className="text-green-400 text-xs bg-zinc-900 px-3 py-1.5 rounded-lg block mb-4 break-all">{twoFASecret}</code>
                                    <p className="text-white font-bold mb-2">2. Enter the 6-digit code to confirm</p>
                                    <div className="flex gap-2">
                                        <input type="text" inputMode="numeric" maxLength={6} value={twoFACode} onChange={e => setTwoFACode(e.target.value.replace(/\D/g,''))} placeholder="000000" className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-white text-center text-xl tracking-widest outline-none focus:border-green-500 transition" />
                                        <button onClick={verify2FA} disabled={twoFACode.length !== 6} className="bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2 rounded-xl transition disabled:opacity-50">Verify</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-2">Verification</h3>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-6">
                        {verificationStatus?.is_verified ? (
                            <div className="flex items-center gap-4 p-4">
                                <BadgeCheck className="text-blue-400 flex-shrink-0" size={26} />
                                <div>
                                    <h3 className="text-white font-bold">Verified Account ✓</h3>
                                    <p className="text-zinc-500 text-xs">{verificationStatus.verified_reason || 'Your account is verified.'}</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div onClick={() => setShowVerifyForm(!showVerifyForm)}
                                    className="flex items-center justify-between p-4 hover:bg-zinc-800 cursor-pointer transition">
                                    <div className="flex items-center gap-4">
                                        <BadgeCheck className="text-zinc-400" size={22} />
                                        <div>
                                            <h3 className="text-white font-medium">Request Verification</h3>
                                            {verificationStatus?.request ? (
                                                <p className="text-xs text-yellow-400">Request {verificationStatus.request.status}</p>
                                            ) : (
                                                <p className="text-zinc-500 text-xs">Get a blue checkmark on your profile</p>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight className={`text-zinc-600 transition-transform ${showVerifyForm ? 'rotate-90' : ''}`} size={20} />
                                </div>
                                {showVerifyForm && (
                                    <div className="px-4 pb-4 border-t border-zinc-800 pt-3 space-y-3">
                                        <p className="text-zinc-500 text-xs">Tell us why your account should be verified (e.g. public figure, creator, business).</p>
                                        <textarea
                                            value={verifyReason}
                                            onChange={e => setVerifyReason(e.target.value)}
                                            placeholder="I am a verified creator/public figure because..."
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-500 transition resize-none"
                                            rows={3}
                                        />
                                        <button onClick={requestVerification}
                                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-xl text-sm transition">
                                            <Send size={14}/> Submit Request
                                        </button>
                                        {verifyMsg && <p className="text-xs text-green-400">{verifyMsg}</p>}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
                <div>
                    <h3 className="text-xs font-bold text-red-500/80 uppercase tracking-wider mb-2 ml-2">Danger Zone</h3>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                        <div onClick={handleLogout} className="flex items-center p-4 hover:bg-red-500/10 cursor-pointer transition border-b border-zinc-800/50"><LogOut className="text-red-500 mr-4" size={22} /><h3 className="font-bold text-red-500">Log Out</h3></div>
                        <div onClick={handleDeleteAccount} className="flex items-center p-4 hover:bg-red-500/10 cursor-pointer transition"><Trash2 className="text-red-500/70 mr-4" size={22} /><h3 className="font-bold text-red-500/70">Delete Account</h3></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default Settings;