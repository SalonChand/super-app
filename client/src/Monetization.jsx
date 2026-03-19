import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowLeft, DollarSign, CheckCircle, Circle, ChevronRight, Loader } from 'lucide-react';
import { BACKEND_URL } from './config';

const DIFF_CONFIG = {
    easy:     { label: 'Easy',     color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  bar: 'bg-green-500'  },
    moderate: { label: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', bar: 'bg-yellow-500' },
    hard:     { label: 'Hard',     color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    bar: 'bg-red-500'    },
};

function TaskCard({ task }) {
    const cfg = DIFF_CONFIG[task.difficulty];
    const pct = Math.min((task.current / task.target) * 100, 100);
    return (
        <div className={`rounded-2xl border p-4 ${task.done ? 'bg-green-500/8 border-green-500/20' : `${cfg.bg} ${cfg.border}`}`}>
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                    {task.done
                        ? <CheckCircle size={20} className="text-green-400" />
                        : <Circle size={20} className="text-zinc-600" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-xs font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</p>
                    </div>
                    <p className={`font-bold text-sm ${task.done ? 'text-green-300' : 'text-white'}`}>{task.label}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{task.desc}</p>
                    {!task.done && (
                        <div className="mt-2.5">
                            <div className="flex justify-between text-xs text-zinc-500 mb-1">
                                <span>{task.current.toLocaleString()} / {task.target.toLocaleString()}</span>
                                <span>{Math.round(pct)}%</span>
                            </div>
                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`} style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    )}
                    {task.done && <p className="text-green-400 text-xs mt-1 font-semibold">✓ Completed</p>}
                </div>
            </div>
        </div>
    );
}

export default function Monetization() {
    const userId = localStorage.getItem('userId');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [applyMsg, setApplyMsg] = useState('');

    useEffect(() => {
        if (!userId) return;
        axios.get(`${BACKEND_URL}/api/monetization/progress/${userId}`)
            .then(res => setData(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleApply = async () => {
        setApplying(true); setApplyMsg('');
        try {
            await axios.post(`${BACKEND_URL}/api/monetization/apply`, { userId });
            setApplyMsg('✅ Application submitted! Admin will review it shortly.');
            setData(prev => ({ ...prev, application: { status: 'pending' } }));
        } catch(e) {
            setApplyMsg('❌ ' + (e.response?.data?.error || 'Failed to apply'));
        }
        setApplying(false);
    };

    if (loading) return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
            <Loader size={24} className="animate-spin text-zinc-500" />
        </div>
    );

    const easy     = data?.tasks?.filter(t => t.difficulty === 'easy') || [];
    const moderate = data?.tasks?.filter(t => t.difficulty === 'moderate') || [];
    const hard     = data?.tasks?.filter(t => t.difficulty === 'hard') || [];
    const doneCount = data?.tasks?.filter(t => t.done).length || 0;
    const totalCount = data?.tasks?.length || 10;
    const overallPct = Math.round((doneCount / totalCount) * 100);

    return (
        <div className="min-h-screen bg-zinc-950 pb-24">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/60 px-4 py-3 flex items-center gap-3">
                <Link to={`/profile/${userId}`} className="text-zinc-400 hover:text-white transition p-1">
                    <ArrowLeft size={22} />
                </Link>
                <div className="flex items-center gap-2.5 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center">
                        <DollarSign size={15} className="text-yellow-400" />
                    </div>
                    <h1 className="text-white font-black text-lg tracking-tight">Monetization</h1>
                </div>
                {data?.is_monetized && (
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400">💰 MONETIZED</span>
                )}
            </div>

            <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">

                {/* Already monetized */}
                {data?.is_monetized && (
                    <div className="bg-gradient-to-r from-yellow-500/15 to-orange-500/15 border border-yellow-500/30 rounded-2xl p-5 text-center">
                        <p className="text-4xl mb-2">💰</p>
                        <p className="text-white font-black text-lg">You're a Monetized Creator!</p>
                        <p className="text-zinc-400 text-sm mt-1">Creator tag: <span className="text-yellow-400 font-bold">{data.creator_tag}</span></p>
                    </div>
                )}

                {/* Hero progress */}
                {!data?.is_monetized && (
                    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h2 className="text-white font-black text-base">Creator Certification</h2>
                                <p className="text-zinc-500 text-xs mt-0.5">Complete all 10 tasks to apply for monetization</p>
                            </div>
                            <span className="text-2xl font-black text-white">{overallPct}%</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-700"
                                style={{ width: `${overallPct}%` }} />
                        </div>
                        <p className="text-zinc-500 text-xs mt-2">{doneCount} of {totalCount} tasks completed</p>
                    </div>
                )}

                {/* Perks */}
                {!data?.is_monetized && (
                    <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-4">
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3">What you get</p>
                        <div className="space-y-2">
                            {[
                                { icon: '💰', text: 'Ability to receive tips on your posts' },
                                { icon: '🚀', text: 'Higher visibility in search and feed' },
                                { icon: '🏷️', text: 'Exclusive creator tag under your username' },
                            ].map((perk, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="text-lg">{perk.icon}</span>
                                    <p className="text-zinc-300 text-sm">{perk.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Easy tasks */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Easy Tasks</p>
                        <span className="text-zinc-600 text-xs">{easy.filter(t=>t.done).length}/{easy.length} done</span>
                    </div>
                    <div className="space-y-2">{easy.map(t => <TaskCard key={t.id} task={t} />)}</div>
                </div>

                {/* Moderate tasks */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Moderate Tasks</p>
                        <span className="text-zinc-600 text-xs">{moderate.filter(t=>t.done).length}/{moderate.length} done</span>
                    </div>
                    <div className="space-y-2">{moderate.map(t => <TaskCard key={t.id} task={t} />)}</div>
                </div>

                {/* Hard tasks */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Hard Tasks</p>
                        <span className="text-zinc-600 text-xs">{hard.filter(t=>t.done).length}/{hard.length} done</span>
                    </div>
                    <div className="space-y-2">{hard.map(t => <TaskCard key={t.id} task={t} />)}</div>
                </div>

                {/* Apply section */}
                {!data?.is_monetized && (
                    <div className="pt-2 pb-4">
                        {data?.application?.status === 'pending' && (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
                                <p className="text-blue-400 font-bold text-sm">⏳ Application Under Review</p>
                                <p className="text-zinc-500 text-xs mt-1">Admin will review your application shortly</p>
                            </div>
                        )}
                        {data?.application?.status === 'rejected' && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center mb-3">
                                <p className="text-red-400 font-bold text-sm">❌ Application Rejected</p>
                                {data.application.admin_note && <p className="text-zinc-400 text-xs mt-1">{data.application.admin_note}</p>}
                                <p className="text-zinc-500 text-xs mt-1">You can reapply once all tasks are completed</p>
                            </div>
                        )}
                        {(!data?.application || data?.application?.status === 'rejected') && (
                            <button
                                onClick={handleApply}
                                disabled={!data?.allDone || applying}
                                className="w-full py-4 rounded-2xl font-black text-base transition-all shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ background: data?.allDone ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : undefined, backgroundColor: data?.allDone ? undefined : '#18181b', color: data?.allDone ? '#000' : '#52525b' }}>
                                {applying ? '⏳ Submitting...' : data?.allDone ? '🚀 Apply for Monetization' : `Complete all tasks first (${doneCount}/${totalCount})`}
                            </button>
                        )}
                        {applyMsg && <p className={`text-center text-sm font-semibold mt-3 ${applyMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{applyMsg}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
