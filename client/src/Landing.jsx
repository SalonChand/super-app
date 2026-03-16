import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, MessageCircle, Users, Globe, ShoppingBag, Clapperboard,
  Shield, Star, ArrowRight, Check, Sparkles, Heart, TrendingUp,
  Bell, Camera, Play, ChevronDown, Menu, X, Twitter, Instagram,
  Github, Linkedin, Mail, Phone, MapPin, BadgeCheck, Flame
} from 'lucide-react';

// ─── Animated counter hook ───────────────────────────────────────────
function useCountUp(end, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, start]);
  return count;
}

// ─── Intersection Observer hook ──────────────────────────────────────
function useInView(threshold = 0.1) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// ─── Floating particle ───────────────────────────────────────────────
function Particle({ style }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        background: 'radial-gradient(circle, rgba(59,130,246,0.6) 0%, rgba(139,92,246,0.3) 70%, transparent 100%)',
        animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
        animationDelay: `${Math.random() * 3}s`,
        ...style,
      }}
    />
  );
}

// ─── Feature card ────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, description, gradient, delay = 0 }) {
  const [ref, inView] = useInView(0.1);
  return (
    <div
      ref={ref}
      className="group relative bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 hover:border-zinc-600 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms, box-shadow 0.3s ease`,
      }}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br ${gradient} shadow-lg`}>
        <Icon size={22} className="text-white" />
      </div>
      <h3 className="text-white font-bold text-lg mb-2 group-hover:text-blue-400 transition-colors">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity`} />
    </div>
  );
}

// ─── Testimonial card ────────────────────────────────────────────────
function TestimonialCard({ name, role, avatar, text, stars, verified, delay = 0 }) {
  const [ref, inView] = useInView(0.1);
  return (
    <div
      ref={ref}
      className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all duration-300"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      <div className="flex gap-1 mb-4">
        {Array.from({ length: stars }).map((_, i) => (
          <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
        ))}
      </div>
      <p className="text-zinc-300 text-sm leading-relaxed mb-6 italic">"{text}"</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {avatar}
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="text-white font-semibold text-sm">{name}</span>
            {verified && <BadgeCheck size={14} className="text-blue-400" />}
          </div>
          <span className="text-zinc-500 text-xs">{role}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Stat box ────────────────────────────────────────────────────────
function StatBox({ value, suffix, label, started }) {
  const count = useCountUp(value, 2000, started);
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-zinc-400 text-sm mt-2 font-medium">{label}</div>
    </div>
  );
}

// ─── Main Landing Page ───────────────────────────────────────────────
export default function Landing() {
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [statsRef, statsInView] = useInView(0.3);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const features = [
    {
      icon: MessageCircle, title: 'Real-Time Chat',
      description: 'End-to-end encrypted messaging with voice & video calls, reactions, and media sharing.',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Clapperboard, title: 'Short Reels',
      description: 'Create and discover short videos with filters, music, and viral discovery algorithm.',
      gradient: 'from-pink-500 to-rose-500',
    },
    {
      icon: Globe, title: 'Communities',
      description: 'Build or join interest-based communities with threads, polls and moderation tools.',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: ShoppingBag, title: 'Marketplace',
      description: 'Buy and sell products directly with secure payments and buyer protection.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: Flame, title: 'Streaks & Gamification',
      description: 'Build daily streaks with friends. Earn badges and climb the leaderboard.',
      gradient: 'from-red-500 to-orange-500',
    },
    {
      icon: Shield, title: 'Privacy First',
      description: 'Two-factor authentication, granular privacy controls and secure data storage.',
      gradient: 'from-violet-500 to-purple-500',
    },
    {
      icon: Bell, title: 'Smart Notifications',
      description: 'AI-powered notifications that only ping you when it truly matters.',
      gradient: 'from-indigo-500 to-blue-500',
    },
    {
      icon: TrendingUp, title: 'Analytics Dashboard',
      description: 'Track your reach, engagement and growth with beautiful charts.',
      gradient: 'from-teal-500 to-green-500',
    },
  ];

  const testimonials = [
    {
      name: 'Rohan Sharma', role: 'Content Creator · Kathmandu',
      avatar: 'RS', text: 'SuperApp completely replaced 3 other apps for me. The reels, chat and communities all in one place is game-changing.',
      stars: 5, verified: true,
    },
    {
      name: 'Priya Thapa', role: 'Small Business Owner',
      avatar: 'PT', text: 'I run my entire shop through the Marketplace feature. Sales doubled in the first month after joining SuperApp.',
      stars: 5, verified: false,
    },
    {
      name: 'Arjun K.', role: 'Software Engineer',
      avatar: 'AK', text: 'The security features are excellent. 2FA, encrypted chats — I feel safe sharing personal moments here.',
      stars: 5, verified: true,
    },
    {
      name: 'Sita Rai', role: 'Community Manager',
      avatar: 'SR', text: 'Built a thriving community of 10,000 members in just two months. The moderation tools make it effortless.',
      stars: 4, verified: false,
    },
    {
      name: 'Dev Poudel', role: 'Photographer',
      avatar: 'DP', text: 'The image quality is amazing and the story filters are beautiful. My portfolio has never looked better!',
      stars: 5, verified: true,
    },
    {
      name: 'Anjali M.', role: 'Student · Pokhara',
      avatar: 'AM', text: 'Streaks with my friends keep me motivated every single day. It\'s addictive in the best possible way.',
      stars: 5, verified: false,
    },
  ];

  const plans = [
    {
      name: 'Free', price: 0, description: 'Perfect to get started',
      features: ['Unlimited posts & reels', 'Direct messages (100/day)', 'Join up to 5 communities', '1 GB media storage', 'Basic analytics'],
      cta: 'Get Started Free', highlight: false,
    },
    {
      name: 'Pro', price: 499, description: 'For creators & professionals',
      features: ['Everything in Free', 'Unlimited messages', 'Join unlimited communities', '50 GB media storage', 'Advanced analytics', 'Verified badge eligibility', 'Priority support'],
      cta: 'Start Pro Trial', highlight: true,
    },
    {
      name: 'Business', price: 1499, description: 'For teams & businesses',
      features: ['Everything in Pro', 'Team collaboration tools', 'Marketplace seller tools', '500 GB media storage', 'Custom community branding', 'Dedicated account manager', 'API access'],
      cta: 'Contact Sales', highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-x-hidden">
      {/* ── CSS for float animation ── */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .gradient-text {
          background: linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6, #60a5fa);
          background-size: 300% 300%;
          animation: gradientShift 4s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-glow {
          background: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59,130,246,0.25), transparent);
        }
        .card-hover {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(59,130,246,0.1);
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/60 shadow-xl shadow-black/20' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-black text-xl tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">SuperApp</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {[['Features', '#features'], ['Testimonials', '#testimonials'], ['Pricing', '#pricing'], ['About', '#about']].map(([label, href]) => (
              <a key={label} href={href} className="text-zinc-400 hover:text-white text-sm font-medium transition-colors">{label}</a>
            ))}
          </div>

          {/* Desktop CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-zinc-300 hover:text-white text-sm font-medium transition-colors px-4 py-2">Sign In</Link>
            <Link
              to="/register"
              className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden text-zinc-400 hover:text-white transition-colors p-2" onClick={() => setNavOpen(!navOpen)}>
            {navOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {navOpen && (
          <div className="md:hidden bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800 px-4 py-4 flex flex-col gap-4 animate-fade-in">
            {[['Features', '#features'], ['Testimonials', '#testimonials'], ['Pricing', '#pricing'], ['About', '#about']].map(([label, href]) => (
              <a key={label} href={href} className="text-zinc-300 hover:text-white text-base font-medium transition-colors py-1" onClick={() => setNavOpen(false)}>{label}</a>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
              <Link to="/login" className="text-center text-zinc-300 border border-zinc-700 rounded-xl py-3 font-medium hover:bg-zinc-900 transition" onClick={() => setNavOpen(false)}>Sign In</Link>
              <Link to="/register" className="text-center bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold py-3 rounded-xl transition hover:from-blue-500 hover:to-violet-500" onClick={() => setNavOpen(false)}>Get Started Free</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 pb-24 px-4 hero-glow overflow-hidden">
        {/* Background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Particle style={{ width: 300, height: 300, top: '5%', left: '-5%', opacity: 0.15 }} />
          <Particle style={{ width: 200, height: 200, top: '20%', right: '5%', opacity: 0.12 }} />
          <Particle style={{ width: 150, height: 150, bottom: '15%', left: '15%', opacity: 0.1 }} />
          <Particle style={{ width: 100, height: 100, bottom: '30%', right: '20%', opacity: 0.08 }} />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-1.5 text-sm text-blue-400 font-medium mb-8 animate-fade-in">
            <Sparkles size={14} className="text-blue-400" />
            <span>Nepal's #1 Super Social Platform</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-white">One App.</span>
            <br />
            <span className="gradient-text">Everything You Need.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-zinc-400 text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Chat, create reels, build communities, shop in the marketplace, and stay connected — all in one beautifully designed super-app.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link
              to="/register"
              className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5"
            >
              Start for Free
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-lg px-8 py-4 rounded-2xl border border-zinc-700 hover:border-zinc-600 transition-all"
            >
              Sign In
            </Link>
          </div>

          {/* Social proof pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {[
              { icon: Users, label: '50K+ Users', color: 'text-blue-400' },
              { icon: Star, label: '4.9 Rating', color: 'text-yellow-400' },
              { icon: Shield, label: 'Secure & Private', color: 'text-green-400' },
              { icon: Heart, label: 'Made in Nepal', color: 'text-red-400' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800 rounded-full px-4 py-2 text-sm font-medium">
                <Icon size={14} className={color} />
                <span className="text-zinc-300">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <a href="#features" className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors animate-bounce">
          <span className="text-xs font-medium tracking-widest uppercase">Scroll</span>
          <ChevronDown size={18} />
        </a>
      </section>

      {/* ── STATS SECTION ── */}
      <section ref={statsRef} className="relative py-20 px-4 border-y border-zinc-800/60 bg-zinc-950/50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
          <StatBox value={50000} suffix="+" label="Active Users" started={statsInView} />
          <StatBox value={2000000} suffix="+" label="Posts Shared" started={statsInView} />
          <StatBox value={500} suffix="+" label="Communities" started={statsInView} />
          <StatBox value={99} suffix="%" label="Uptime" started={statsInView} />
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/30 rounded-full px-4 py-1.5 text-sm text-violet-400 font-medium mb-4">
              <Zap size={14} />
              <span>Packed with Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Everything you love,<br />
              <span className="gradient-text">in one place</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              SuperApp combines the best of social media, messaging, video, shopping, and community into one seamless experience.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, i) => (
              <FeatureCard key={feature.title} {...feature} delay={i * 75} />
            ))}
          </div>
        </div>
      </section>

      {/* ── SHOWCASE / APP PREVIEW ── */}
      <section className="py-20 px-4 bg-zinc-950/60">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/30 rounded-full px-4 py-1.5 text-sm text-pink-400 font-medium mb-6">
                <Camera size={14} />
                <span>Stories & Reels</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                Express yourself<br />
                <span className="gradient-text">without limits</span>
              </h2>
              <p className="text-zinc-400 text-lg leading-relaxed mb-8">
                Create stunning stories with filters, post short reels to go viral, or share long-form posts with your community. Your voice, your way.
              </p>
              <ul className="space-y-4">
                {[
                  'Instagram-style stories with filters & music',
                  'Short reels with discovery algorithm',
                  'Photo collages up to 10 images',
                  'Text posts, polls & rich media',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-zinc-300">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={11} className="text-white" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register" className="inline-flex items-center gap-2 mt-8 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-pink-500/25 hover:-translate-y-0.5">
                Start Creating <ArrowRight size={18} />
              </Link>
            </div>

            {/* Mock phone UI */}
            <div className="relative flex justify-center">
              <div className="relative w-72 h-[520px] bg-zinc-900 rounded-[2.5rem] border-4 border-zinc-700 shadow-2xl shadow-black/60 overflow-hidden">
                {/* Status bar */}
                <div className="absolute top-0 inset-x-0 h-12 bg-zinc-950 flex items-center justify-between px-6 text-xs text-zinc-500">
                  <span className="font-semibold">9:41</span>
                  <div className="flex gap-1.5 items-center">
                    <div className="w-3.5 h-2.5 rounded-sm border border-zinc-400 relative"><div className="absolute inset-0.5 bg-zinc-400 rounded-sm" style={{ width: '70%' }} /></div>
                  </div>
                </div>
                {/* App content mockup */}
                <div className="pt-12 px-4 pb-4 h-full bg-zinc-950 flex flex-col gap-3">
                  {/* Stories row */}
                  <div className="flex gap-2 overflow-hidden">
                    {['A', 'B', 'C', 'D', 'E'].map((l, i) => (
                      <div key={l} className="flex-shrink-0 flex flex-col items-center gap-1">
                        <div className={`w-11 h-11 rounded-full border-2 ${i === 0 ? 'border-dashed border-zinc-600' : 'border-blue-500'} flex items-center justify-center text-xs font-bold text-white`}
                          style={{ background: i === 0 ? 'transparent' : `hsl(${i * 60},70%,35%)` }}>
                          {i === 0 ? '+' : l}
                        </div>
                        <span className="text-zinc-500 text-[9px]">{i === 0 ? 'Add' : `User${l}`}</span>
                      </div>
                    ))}
                  </div>
                  {/* Post mockup */}
                  <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800">
                    <div className="flex items-center gap-2 p-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600" />
                      <div>
                        <div className="text-white text-xs font-bold flex items-center gap-1">SuperApp <BadgeCheck size={10} className="text-blue-400" /></div>
                        <div className="text-zinc-500 text-[9px]">2 min ago</div>
                      </div>
                    </div>
                    <div className="h-36 bg-gradient-to-br from-blue-900/60 to-violet-900/60 flex items-center justify-center">
                      <Play size={32} className="text-white/60" />
                    </div>
                    <div className="flex items-center gap-4 px-3 py-2">
                      <Heart size={16} className="text-zinc-400" />
                      <MessageCircle size={16} className="text-zinc-400" />
                      <div className="ml-auto text-zinc-500 text-[10px]">1.2K likes</div>
                    </div>
                  </div>
                  {/* Another post */}
                  <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-orange-600" />
                      <div className="text-white text-xs font-bold">CreatorNP</div>
                    </div>
                    <p className="text-zinc-300 text-xs leading-relaxed">Loving this amazing sunset from Nagarkot! 🌅 #Nepal #SuperApp</p>
                    <div className="flex gap-3 mt-2 text-zinc-500 text-[10px]">
                      <span>❤️ 847</span><span>💬 32</span>
                    </div>
                  </div>
                </div>
                {/* Bottom notch */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-zinc-700 rounded-full" />
              </div>
              {/* Glow */}
              <div className="absolute inset-0 rounded-full bg-blue-600/10 blur-3xl -z-10 scale-75" />
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5 text-sm text-yellow-400 font-medium mb-4">
              <Star size={14} className="fill-yellow-400" />
              <span>Loved by thousands</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              What our users <span className="gradient-text">say about us</span>
            </h2>
            <p className="text-zinc-400 text-lg">Real stories from real SuperApp users across Nepal and beyond.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <TestimonialCard key={t.name} {...t} delay={i * 100} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-4 bg-zinc-950/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1.5 text-sm text-green-400 font-medium mb-4">
              <Zap size={14} />
              <span>Simple Pricing</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Plans for <span className="gradient-text">every journey</span>
            </h2>
            <p className="text-zinc-400 text-lg">Start free forever. Upgrade when you're ready to unlock more.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-7 card-hover flex flex-col ${
                  plan.highlight
                    ? 'bg-gradient-to-b from-blue-950/80 to-violet-950/80 border-2 border-blue-500/60 shadow-xl shadow-blue-500/20'
                    : 'bg-zinc-900/60 border border-zinc-800'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-lg">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-white font-bold text-xl mb-1">{plan.name}</h3>
                  <p className="text-zinc-400 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-zinc-400 text-lg font-medium">₹</span>
                    <span className="text-5xl font-black text-white">{plan.price === 0 ? '0' : plan.price.toLocaleString()}</span>
                    {plan.price > 0 && <span className="text-zinc-400 mb-1">/month</span>}
                    {plan.price === 0 && <span className="text-zinc-400 mb-1 ml-1">forever</span>}
                  </div>
                </div>
                <ul className="flex-1 space-y-3 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.highlight ? 'bg-blue-500/20' : 'bg-zinc-800'}`}>
                        <Check size={9} className={plan.highlight ? 'text-blue-400' : 'text-zinc-400'} />
                      </div>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block text-center font-bold py-3.5 rounded-xl transition-all ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-blue-500/30 hover:-translate-y-0.5'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT / TEAM ── */}
      <section id="about" className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-1.5 text-sm text-red-400 font-medium mb-6">
            <Heart size={14} className="fill-red-400" />
            <span>Made with ❤️ in Nepal</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            Building the future of<br />
            <span className="gradient-text">social connection</span>
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
            SuperApp was born from a simple idea: why use 5 different apps when one can do it all beautifully? We're a passionate team from Nepal, building tech for the world.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            {[
              { icon: Zap, title: 'Lightning Fast', desc: 'Optimized for speed on all connections, including low bandwidth networks.' },
              { icon: Shield, title: 'Privacy First', desc: 'Your data is yours. We never sell or share personal data with third parties.' },
              { icon: Heart, title: 'Community Driven', desc: 'Built with feedback from our community. Every feature exists because users asked.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-left">
                <Icon size={24} className="text-blue-400 mb-3" />
                <h3 className="text-white font-bold mb-2">{title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-blue-950/60 to-violet-950/60 border border-blue-800/40 rounded-3xl p-12 text-center overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-violet-600/10 rounded-3xl" />
            <Sparkles size={40} className="text-blue-400 mx-auto mb-4 relative" />
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 relative">
              Ready to join the<br />
              <span className="gradient-text">SuperApp family?</span>
            </h2>
            <p className="text-zinc-400 text-lg mb-8 max-w-xl mx-auto relative">
              50,000+ users are already on SuperApp. Sign up in seconds — no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative">
              <Link
                to="/register"
                className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold text-lg px-10 py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5"
              >
                Create Free Account
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/login" className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">
                Already a member? Sign in →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-zinc-800/60 bg-zinc-950 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                  <Zap size={16} className="text-white" />
                </div>
                <span className="font-black text-xl text-white">SuperApp</span>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6 max-w-xs">
                Nepal's #1 super social platform. Chat, create, connect, shop — all in one place.
              </p>
              <div className="flex gap-3">
                {[Twitter, Instagram, Github, Linkedin].map((Icon, i) => (
                  <a key={i} href="#" className="w-9 h-9 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white transition-all">
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>

            {/* Product links */}
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Product</h4>
              <ul className="space-y-3">
                {['Features', 'Pricing', 'Changelog', 'Roadmap'].map((item) => (
                  <li key={item}><a href="#" className="text-zinc-400 hover:text-white text-sm transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            {/* Company links */}
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Company</h4>
              <ul className="space-y-3">
                {['About', 'Blog', 'Careers', 'Press Kit'].map((item) => (
                  <li key={item}><a href="#" className="text-zinc-400 hover:text-white text-sm transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            {/* Legal links */}
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Legal</h4>
              <ul className="space-y-3">
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'].map((item) => (
                  <li key={item}><a href="#" className="text-zinc-400 hover:text-white text-sm transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact row */}
          <div className="border-t border-zinc-800 pt-8 flex flex-wrap gap-6 justify-between items-center">
            <div className="flex flex-wrap gap-6">
              {[
                { icon: Mail, text: 'hello@superapp.np' },
                { icon: Phone, text: '+977 98-XXXXXXXX' },
                { icon: MapPin, text: 'Kathmandu, Nepal 🇳🇵' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Icon size={14} />
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <p className="text-zinc-600 text-xs">© {new Date().getFullYear()} SuperApp. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
