import { useState } from 'react';
import { X, Flag, AlertTriangle, Upload, ChevronRight, CheckCircle, Loader } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

const CATEGORIES = [
    { value: 'harassment',      emoji: '😡', label: 'Harassment or Bullying',       desc: 'Targeting, intimidating or bullying someone' },
    { value: 'hate_speech',     emoji: '🚫', label: 'Hate Speech',                  desc: 'Promoting hatred based on identity or religion' },
    { value: 'spam',            emoji: '🗑️', label: 'Spam or Fake Account',          desc: 'Spam, bot, impersonation or misleading identity' },
    { value: 'sexual_content',  emoji: '🔞', label: 'Inappropriate Sexual Content',  desc: 'Explicit or adult content posted inappropriately' },
    { value: 'violence',        emoji: '⚠️', label: 'Violence or Threats',           desc: 'Threats, violent content or dangerous behaviour' },
    { value: 'misinformation',  emoji: '📢', label: 'Misinformation',                desc: 'Spreading false or misleading information' },
    { value: 'privacy',         emoji: '🔒', label: 'Privacy Violation',             desc: 'Sharing private info or images without consent' },
    { value: 'scam',            emoji: '💸', label: 'Scam or Fraud',                 desc: 'Attempting to deceive or defraud others' },
    { value: 'other',           emoji: '📋', label: 'Other',                         desc: 'Something else not listed above' },
];

// step: 'category' | 'details' | 'done'
export default function ReportModal({ reportedUser, onClose }) {
    const reporterId = localStorage.getItem('userId');
    const [step, setStep] = useState('category');
    const [category, setCategory] = useState(null);
    const [description, setDescription] = useState('');
    const [proofUrl, setProofUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!reportedUser) return null;

    const submit = async () => {
        setError('');
        if (description.trim().length < 20) {
            setError('Please describe the issue in at least 20 characters.');
            return;
        }
        setSubmitting(true);
        try {
            await axios.post(`${BACKEND_URL}/api/reports`, {
                reporterId,
                reportedUserId: reportedUser.id,
                reasonCategory: category.value,
                description: description.trim(),
                proofUrl: proofUrl.trim() || null,
            });
            setStep('done');
        } catch(e) {
            setError(e.response?.data?.error || 'Failed to submit. Please try again.');
        }
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-[999] bg-black/85 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                            <Flag size={15} className="text-red-400"/>
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm">Report User</p>
                            <p className="text-zinc-500 text-xs">@{reportedUser.username}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 transition"><X size={20}/></button>
                </div>

                {/* STEP 1 — Category */}
                {step === 'category' && (
                    <div className="px-4 py-4 space-y-2">
                        <p className="text-zinc-400 text-xs mb-3">What's the issue with this account?</p>
                        {CATEGORIES.map(cat => (
                            <button key={cat.value} onClick={() => { setCategory(cat); setStep('details'); }}
                                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 transition text-left group">
                                <span className="text-xl flex-shrink-0">{cat.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-semibold">{cat.label}</p>
                                    <p className="text-zinc-500 text-xs mt-0.5 line-clamp-1">{cat.desc}</p>
                                </div>
                                <ChevronRight size={15} className="text-zinc-600 group-hover:text-zinc-400 flex-shrink-0"/>
                            </button>
                        ))}
                    </div>
                )}

                {/* STEP 2 — Details */}
                {step === 'details' && (
                    <div className="px-4 py-4 space-y-4">
                        {/* Selected category pill */}
                        <div className="flex items-center gap-2">
                            <button onClick={() => setStep('category')} className="text-zinc-500 hover:text-white text-xs transition">← Back</button>
                            <span className="text-xs bg-red-500/15 border border-red-500/30 text-red-400 font-semibold px-2.5 py-1 rounded-full">
                                {category.emoji} {category.label}
                            </span>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <label className="text-zinc-300 text-sm font-semibold flex items-center gap-1.5">
                                Describe the problem <span className="text-red-400">*</span>
                            </label>
                            <p className="text-zinc-500 text-xs">{category.desc}. Be as specific as possible.</p>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder={`Explain what @${reportedUser.username} did that violates our guidelines. Include dates, context and any relevant details...`}
                                rows={5}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 outline-none focus:border-red-500/50 resize-none transition"
                            />
                            <div className="flex justify-between items-center">
                                {description.length < 20
                                    ? <p className="text-zinc-600 text-xs">Minimum 20 characters ({Math.max(0, 20 - description.length)} more needed)</p>
                                    : <p className="text-green-500 text-xs">✓ Good description</p>
                                }
                                <span className="text-zinc-600 text-xs">{description.length}/1000</span>
                            </div>
                        </div>

                        {/* Proof URL */}
                        <div className="space-y-1.5">
                            <label className="text-zinc-300 text-sm font-semibold">
                                Proof / Evidence link <span className="text-zinc-600 text-xs font-normal">(optional but recommended)</span>
                            </label>
                            <p className="text-zinc-500 text-xs">Link to a screenshot (Imgur, Google Drive, etc.) or relevant post URL.</p>
                            <div className="relative">
                                <Upload size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                                <input
                                    value={proofUrl}
                                    onChange={e => setProofUrl(e.target.value)}
                                    placeholder="https://imgur.com/... or post URL"
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-8 pr-4 py-2.5 text-white text-sm placeholder-zinc-600 outline-none focus:border-zinc-500 transition"
                                />
                            </div>
                            {proofUrl && !/^https?:\/\//.test(proofUrl) && (
                                <p className="text-yellow-500 text-xs">⚠️ URL should start with https://</p>
                            )}
                        </div>

                        {/* Warning note */}
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex gap-2.5">
                            <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0 mt-0.5"/>
                            <p className="text-yellow-300 text-xs leading-relaxed">
                                False reports may result in action against your account. Only report genuine violations.
                            </p>
                        </div>

                        {error && <p className="text-red-400 text-xs text-center font-semibold bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>}

                        <button onClick={submit} disabled={submitting || description.trim().length < 20}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition">
                            {submitting ? <><Loader size={15} className="animate-spin"/> Submitting...</> : <><Flag size={15}/> Submit Report</>}
                        </button>
                    </div>
                )}

                {/* STEP 3 — Done */}
                {step === 'done' && (
                    <div className="px-4 py-10 flex flex-col items-center text-center space-y-3">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                            <CheckCircle size={32} className="text-green-400"/>
                        </div>
                        <h2 className="text-white font-bold text-lg">Report Submitted</h2>
                        <p className="text-zinc-400 text-sm max-w-xs leading-relaxed">
                            Thank you. Our admin team will review your report and take action if the account violates our guidelines.
                        </p>
                        <p className="text-zinc-600 text-xs">Reports are usually reviewed within 24 hours.</p>
                        <button onClick={onClose}
                            className="mt-4 px-8 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold transition">
                            Done
                        </button>
                    </div>
                )}

                {/* Safe area bottom spacing */}
                <div className="h-4"/>
            </div>
        </div>
    );
}
