import { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Home, LogIn, UserPlus, Users, Menu, MessageCircle, User, Settings as SettingsIcon, Search as SearchIcon, Clapperboard, Globe, X, Bell } from 'lucide-react';
import { io } from 'socket.io-client'; 
import Register from './Register'; 
import Login from './Login';
import Feed from './Feed';
import Chat from './Chat';
import Profile from './Profile'; 
import Friends from './Friends'; 
import Settings from './Settings';
import Search from './Search';
import Reels from './Reels'; 
import Communities from './Communities'; 
import Notifications from './Notifications'; 

const BACKEND_URL = `http://${window.location.hostname}:5000`;
const globalSocket = io(BACKEND_URL); 
const EMPTY_ARRAY = new Array();
const THEME_COLOR = '#3b82f6'; 

// ========================================================
// 🔥 NEW: THE NATIVE MOBILE SPLASH SCREEN 🔥
// ========================================================
function SplashScreen() {
    return (
        <div className="fixed inset-0 z-[999] bg-black flex flex-col items-center justify-center animate-fade-out" style={{ animationDelay: '1.5s', animationFillMode: 'forwards' }}>
            <img src="/logo.png" alt="SuperApp" className="w-24 h-24 rounded-2xl object-cover animate-pulse shadow-[0_0_40px_rgba(59,130,246,0.6)]" />
            <h1 className="text-white font-extrabold text-3xl mt-4 tracking-tight" style={{ color: THEME_COLOR }}>SuperApp</h1>
        </div>
    );
}

// Audio & Push Notification Setup
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
  return outputArray;
}

let audioCtx = null;
const unlockAudio = () => { if (!audioCtx) { const AudioContext = window.AudioContext || window.webkitAudioContext; audioCtx = new AudioContext(); } if (audioCtx.state === 'suspended') { audioCtx.resume(); } document.removeEventListener('click', unlockAudio); };
if (typeof document !== 'undefined') { document.addEventListener('click', unlockAudio); }
const playNotificationSound = () => { try { if (!audioCtx) return; const osc = audioCtx.createOscillator(); const gainNode = audioCtx.createGain(); osc.connect(gainNode); gainNode.connect(audioCtx.destination); osc.type = 'sine'; osc.frequency.setValueAtTime(800, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1); gainNode.gain.setValueAtTime(0, audioCtx.currentTime); gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.05); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3); osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.3); } catch (e) { } };

function ProtectedRoute({ children }) { const currentUserId = localStorage.getItem('userId'); if (!currentUserId) return <Navigate to="/login" replace />; return children; }
function PublicRoute({ children }) { const currentUserId = localStorage.getItem('userId'); if (currentUserId) return <Navigate to="/" replace />; return children; }

function NavItem({ to, icon: Icon, label, badgeCount, themeColor, onClick, showLabelAlways }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-4 p-3 rounded-xl transition-colors text-xl font-medium w-fit xl:w-full relative" style={{ backgroundColor: isActive ? `${themeColor}20` : 'transparent', color: isActive ? themeColor : '#a1a1aa' }}>
      <div className="relative">
          <Icon size={28} />
          {badgeCount > 0 && <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md animate-pulse">{badgeCount > 9 ? '9+' : badgeCount}</span>}
      </div>
      <span className={showLabelAlways ? "block" : "hidden xl:block"}>{label}</span>
    </Link>
  );
}

function AppContent() {
  const currentUserId = localStorage.getItem('userId');
  const[currentUser, setCurrentUser] = useState(null);
  const location = useLocation();
  const[mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [badges, setBadges] = useState({ unread_messages: 0, pending_requests: 0, total_notifications: 0 });
  
  // 🔥 SPLASH SCREEN TIMER STATE 🔥
  const [showSplash, setShowSplash] = useState(true);

  const userThemeColor = currentUser?.theme_color || '#3b82f6';

  const fetchBadges = () => {
      if (currentUserId) {
          axios.get(`${BACKEND_URL}/api/activity/${currentUserId}`)
               .then(res => setBadges(res.data))
               .catch(e => console.error(e));
      }
  };

  const clearNotifications = () => { setBadges(prev => ({ ...prev, total_notifications: 0 })); };
  const clearChatBadge = () => { setBadges(prev => ({ ...prev, unread_messages: 0 })); };
  const clearFriendsBadge = () => { setBadges(prev => ({ ...prev, pending_requests: 0 })); };

  const subscribeToPush = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
          try {
              const reg = await navigator.serviceWorker.ready;
              const vapidRes = await axios.get(`${BACKEND_URL}/api/vapidPublicKey`);
              const convertedVapidKey = urlBase64ToUint8Array(vapidRes.data);
              const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: convertedVapidKey });
              await axios.post(`${BACKEND_URL}/api/subscribe`, { userId: currentUserId, subscription: subscription });
          } catch (e) {}
      }
  };

  const audioDeps = Array.of(currentUserId);
  useEffect(() => {
      if (currentUserId) {
          globalSocket.emit('join_private_room', currentUserId);
          const handleNotification = () => { playNotificationSound(); fetchBadges(); };
          globalSocket.on('message_updated', handleNotification);
          globalSocket.on('activity_updated', handleNotification);
          globalSocket.on('incoming_call', handleNotification);
          subscribeToPush();
          return () => { globalSocket.off('message_updated', handleNotification); globalSocket.off('activity_updated', handleNotification); globalSocket.off('incoming_call', handleNotification); };
      }
  }, audioDeps);

  useEffect(() => {
    // 🔥 Remove the Splash Screen exactly 2 seconds after the app loads! 🔥
    const timer = setTimeout(() => { setShowSplash(false); }, 2000);
    
    if (currentUserId) { 
        axios.get(`${BACKEND_URL}/api/users/${currentUserId}`).then(res => setCurrentUser(res.data)).catch(err => console.error(err)); 
        fetchBadges();
    }
    
    return () => clearTimeout(timer);
  },[currentUserId]);
  
  useEffect(() => { setMobileMenuOpen(false); },[location.pathname]);

  return (
      <div className="min-h-screen bg-black text-zinc-50 font-sans flex justify-center overflow-x-hidden">
        
        {/* 🔥 THE SPLASH SCREEN LAYER 🔥 */}
        {showSplash && <SplashScreen />}

        {/* DESKTOP SIDEBAR */}
        <header className="hidden sm:flex flex-col justify-between w-20 xl:w-64 border-r border-zinc-800 h-screen sticky top-0 py-6 px-2 xl:px-6 z-40 bg-black">
          <div className="flex flex-col gap-4">
            <Link to="/" className="p-3 mb-4 w-fit rounded-full transition flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
              <span className="hidden xl:block font-extrabold text-2xl tracking-tight" style={{ color: userThemeColor }}>SuperApp</span>
            </Link>

            {currentUserId && (
                <>
                    <NavItem to="/" icon={Home} label="Home" themeColor={userThemeColor} />
                    <NavItem to="/search" icon={SearchIcon} label="Explore" themeColor={userThemeColor} />
                    <NavItem to="/communities" icon={Globe} label="Communities" themeColor={userThemeColor} />
                    <NavItem to="/friends" onClick={clearFriendsBadge} icon={Users} label="Friends" badgeCount={badges.pending_requests} themeColor={userThemeColor} />
                    <NavItem to="/reels" icon={Clapperboard} label="Watch" themeColor={userThemeColor} />
                    <NavItem to="/chat" onClick={clearChatBadge} icon={MessageCircle} label="Messages" badgeCount={badges.unread_messages} themeColor={userThemeColor} />
                    <NavItem to="/notifications" onClick={clearNotifications} icon={Bell} label="Notifications" badgeCount={badges.total_notifications} themeColor={userThemeColor} />
                    <NavItem to="/settings" icon={SettingsIcon} label="Settings" themeColor={userThemeColor} />
                </>
            )}
            {!currentUserId && (
                <>
                    <NavItem to="/login" icon={LogIn} label="Login" themeColor={userThemeColor} />
                    <NavItem to="/register" icon={UserPlus} label="Register" themeColor={userThemeColor} />
                </>
            )}
          </div>
          
          {currentUserId && (
            <Link to={`/profile/${currentUserId}`} className="mt-auto hidden xl:flex items-center gap-3 p-3 hover:bg-zinc-900 rounded-full cursor-pointer transition">
              <div className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center overflow-hidden">
                 {currentUser?.profile_pic_url ? ( <img src={`${currentUser.profile_pic_url}`} className="w-full h-full object-cover" /> ) : ( <User size={20} className="text-zinc-400" /> )}
              </div>
              <div><p className="font-bold text-sm" style={{ color: userThemeColor }}>My Profile</p><p className="text-zinc-500 text-xs">View & Edit</p></div>
            </Link>
          )}
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="w-full max-w-[600px] border-x border-zinc-800 min-h-screen relative bg-black">
          {location.pathname !== '/reels' && (
              <div className="sm:hidden flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-black/80 backdrop-blur-md z-30">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
                    <h1 className="font-bold text-xl tracking-tight" style={{ color: userThemeColor }}>SuperApp</h1>
                </div>
                <button onClick={() => setMobileMenuOpen(true)} className="p-2 -mr-2 text-zinc-400 hover:text-white transition">
                    <Menu size={26} />
                </button>
              </div>
          )}

          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><Feed themeColor={userThemeColor} /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><Search themeColor={userThemeColor} /></ProtectedRoute>} />
            <Route path="/communities" element={<ProtectedRoute><Communities themeColor={userThemeColor} /></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute><Friends themeColor={userThemeColor} /></ProtectedRoute>} /> 
            <Route path="/reels" element={<ProtectedRoute><Reels themeColor={userThemeColor} /></ProtectedRoute>} /> 
            <Route path="/chat" element={<ProtectedRoute><Chat themeColor={userThemeColor} /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications themeColor={userThemeColor} /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings themeColor={userThemeColor} /></ProtectedRoute>} />
            <Route path="/profile/:id" element={<ProtectedRoute><Profile themeColor={userThemeColor} /></ProtectedRoute>} />
          </Routes>
        </main>

        {/* MOBILE HAMBURGER MENU */}
        {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex sm:hidden">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setMobileMenuOpen(false)}></div>
                <aside className="absolute right-0 top-0 bottom-0 w-[75%] max-w-sm bg-zinc-950 border-l border-zinc-800 flex flex-col animate-[slide-left_0.3s_ease-out] shadow-2xl">
                    <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                        <span className="font-bold text-xl text-white">Menu</span>
                        <button onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white"><X size={24}/></button>
                    </div>
                    <div className="p-4 flex flex-col gap-2">
                        <NavItem to="/search" icon={SearchIcon} label="Explore Users" themeColor={userThemeColor} showLabelAlways={true} onClick={() => setMobileMenuOpen(false)} />
                        <NavItem to="/communities" icon={Globe} label="Communities" themeColor={userThemeColor} showLabelAlways={true} onClick={() => setMobileMenuOpen(false)} />
                        <NavItem to="/settings" icon={SettingsIcon} label="App Settings" themeColor={userThemeColor} showLabelAlways={true} onClick={() => setMobileMenuOpen(false)} />
                    </div>
                </aside>
            </div>
        )}

        {/* 🔥 MOBILE NAV (6 ICONS, WITH NOTIFICATIONS BETWEEN CHAT & PROFILE) 🔥 */}
        <nav className="sm:hidden fixed bottom-0 w-full bg-black border-t border-zinc-800 flex justify-around items-center px-1 py-3 pb-safe z-30">
          {currentUserId ? (
              <>
                  <Link to="/" className="p-1.5 transition-colors" style={{ color: location.pathname === '/' ? userThemeColor : '#a1a1aa' }}><Home size={22} /></Link>
                  <Link to="/reels" className="p-1.5 transition-colors" style={{ color: location.pathname === '/reels' ? userThemeColor : '#a1a1aa' }}><Clapperboard size={22} /></Link>
                  <Link to="/friends" onClick={clearFriendsBadge} className="p-1.5 transition-colors relative" style={{ color: location.pathname === '/friends' ? userThemeColor : '#a1a1aa' }}>
                      <Users size={22} />
                      {badges.pending_requests > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-black animate-pulse"></span>}
                  </Link> 
                  <Link to="/chat" onClick={clearChatBadge} className="p-1.5 transition-colors relative" style={{ color: location.pathname === '/chat' ? userThemeColor : '#a1a1aa' }}>
                      <MessageCircle size={22} />
                      {badges.unread_messages > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-black animate-pulse"></span>}
                  </Link>

                  {/* 🔥 NEW: NOTIFICATIONS ICON 🔥 */}
                  <Link to="/notifications" onClick={clearNotifications} className="p-1.5 transition-colors relative" style={{ color: location.pathname === '/notifications' ? userThemeColor : '#a1a1aa' }}>
                      <Bell size={22} />
                      {badges.total_notifications > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md animate-bounce">
                              {badges.total_notifications}
                          </span>
                      )}
                  </Link> 

                  <Link to={`/profile/${currentUserId}`} className="p-1.5 flex items-center justify-center">
                    {currentUser?.profile_pic_url ? ( 
                        <img src={`${currentUser.profile_pic_url}`} className="w-[26px] h-[26px] rounded-full object-cover border-2" style={{ borderColor: location.pathname.includes('/profile') ? userThemeColor : 'transparent' }} /> 
                    ) : ( 
                        <User size={22} style={{ color: location.pathname.includes('/profile') ? userThemeColor : '#a1a1aa' }} /> 
                    )}
                  </Link>
              </>
          ) : (
              <>
                  <Link to="/login" className="p-2 text-zinc-400 hover:text-white"><LogIn size={26} /></Link>
                  <Link to="/register" className="p-2 text-zinc-400 hover:text-white"><UserPlus size={26} /></Link>
              </>
          )}
        </nav>
      </div>
  );
}

function App() { return ( <Router><AppContent /></Router> ); }
export default App;