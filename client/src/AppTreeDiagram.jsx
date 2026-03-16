import { Link } from 'react-router-dom';
import { GitBranch, Lock, Globe, Shield } from 'lucide-react';

const treeData = {
    label: 'SuperApp',
    path: '/',
    color: 'text-white',
    bg: 'bg-zinc-800',
    border: 'border-zinc-600',
    icon: '🚀',
    children: [
        {
            label: 'Public Routes',
            color: 'text-green-400',
            bg: 'bg-green-500/10',
            border: 'border-green-500/40',
            icon: '🌐',
            children: [
                { label: '/login', desc: 'User Login', color: 'text-green-300', bg: 'bg-green-500/5', border: 'border-green-500/20' },
                { label: '/register', desc: 'User Registration', color: 'text-green-300', bg: 'bg-green-500/5', border: 'border-green-500/20' },
            ],
        },
        {
            label: 'User Routes',
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/40',
            icon: '🔐',
            desc: 'Protected — login required',
            children: [
                { label: '/', desc: 'Feed', color: 'text-blue-300', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
                { label: '/search', desc: 'Search', color: 'text-blue-300', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
                { label: '/communities', desc: 'Communities', color: 'text-blue-300', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
                { label: '/friends', desc: 'Friends', color: 'text-blue-300', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
                { label: '/reels', desc: 'Reels', color: 'text-blue-300', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
                { label: '/streaks', desc: 'Streaks', color: 'text-blue-300', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
                { label: '/chat', desc: 'Chat', color: 'text-blue-300', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
                { label: '/notifications', desc: 'Notifications', color: 'text-blue-300', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
                { label: '/settings', desc: 'Settings', color: 'text-blue-300', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
                { label: '/profile/:id', desc: 'User Profile', color: 'text-blue-300', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
                { label: '/create-post', desc: 'Create Post', color: 'text-blue-300', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
                { label: '/dashboard', desc: 'User Dashboard', color: 'text-blue-300', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
                { label: '/marketplace', desc: 'Marketplace', color: 'text-blue-300', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
            ],
        },
        {
            label: 'Admin Routes',
            color: 'text-yellow-400',
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/40',
            icon: '🛡️',
            desc: 'Protected — superadmin only',
            children: [
                { label: '/admin', desc: 'Admin Dashboard', color: 'text-yellow-300', bg: 'bg-yellow-500/5', border: 'border-yellow-500/20' },
                { label: '/admin/verification', desc: 'Badge Verification', color: 'text-yellow-300', bg: 'bg-yellow-500/5', border: 'border-yellow-500/20' },
                {
                    label: '/admin/users', desc: 'User Management', color: 'text-yellow-300', bg: 'bg-yellow-500/5', border: 'border-yellow-500/20',
                    children: [
                        { label: '/admin/users/:userId/profile', desc: 'Admin User Profile', color: 'text-yellow-200', bg: 'bg-yellow-500/5', border: 'border-yellow-500/15' },
                    ],
                },
                { label: '/admin/content', desc: 'Content Moderation', color: 'text-yellow-300', bg: 'bg-yellow-500/5', border: 'border-yellow-500/20' },
                { label: '/admin/analytics', desc: 'Platform Analytics', color: 'text-yellow-300', bg: 'bg-yellow-500/5', border: 'border-yellow-500/20' },
                { label: '/admin/reports', desc: 'Reports', color: 'text-yellow-300', bg: 'bg-yellow-500/5', border: 'border-yellow-500/20' },
                { label: '/admin/marketplace', desc: 'Marketplace Admin', color: 'text-yellow-300', bg: 'bg-yellow-500/5', border: 'border-yellow-500/20' },
                { label: '/admin/app-settings', desc: 'App Settings', color: 'text-yellow-300', bg: 'bg-yellow-500/5', border: 'border-yellow-500/20' },
                { label: '/admin/powers', desc: 'Admin Powers', color: 'text-yellow-300', bg: 'bg-yellow-500/5', border: 'border-yellow-500/20' },
                { label: '/admin/communities', desc: 'Communities Admin', color: 'text-yellow-300', bg: 'bg-yellow-500/5', border: 'border-yellow-500/20' },
            ],
        },
    ],
};

function TreeNode({ node, depth = 0, isLast = false }) {
    const isRoot = depth === 0;
    const isBranch = depth === 1;
    const isLeaf = !node.children || node.children.length === 0;

    return (
        <div className={`relative flex flex-col ${depth > 0 ? 'pl-5' : ''}`}>
            {/* Vertical + horizontal connector lines for non-root nodes */}
            {depth > 0 && (
                <>
                    {/* Horizontal line */}
                    <span
                        className="absolute left-0 top-[18px] w-4 border-t border-zinc-600"
                        style={{ display: 'block' }}
                    />
                    {/* Vertical line going up (for all but last sibling) */}
                    {!isLast && (
                        <span
                            className="absolute left-0 top-0 bottom-0 border-l border-zinc-600"
                            style={{ display: 'block' }}
                        />
                    )}
                    {/* Vertical line only to the mid-point for last sibling */}
                    {isLast && (
                        <span
                            className="absolute left-0 top-0 h-[18px] border-l border-zinc-600"
                            style={{ display: 'block' }}
                        />
                    )}
                </>
            )}

            {/* Node box */}
            <div className={`flex items-start gap-2 mb-1 ${depth > 0 ? 'ml-1' : ''}`}>
                <div
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 ${node.bg} ${node.border} ${isRoot ? 'py-2 px-4' : ''}`}
                >
                    {node.icon && <span className="text-base leading-none">{node.icon}</span>}
                    <div>
                        <span className={`font-mono font-semibold text-xs ${node.color} ${isRoot ? 'text-sm' : ''}`}>
                            {node.label}
                        </span>
                        {node.desc && (
                            <span className="text-zinc-500 text-xs ml-2">{node.desc}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Children */}
            {node.children && node.children.length > 0 && (
                <div className="relative pl-4">
                    {/* Vertical line alongside children */}
                    <span
                        className="absolute left-0 top-0 border-l border-zinc-700"
                        style={{ bottom: '18px', display: 'block' }}
                    />
                    {node.children.map((child, idx) => (
                        <TreeNode
                            key={child.label + idx}
                            node={child}
                            depth={depth + 1}
                            isLast={idx === node.children.length - 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function AppTreeDiagram() {
    return (
        <div className="min-h-screen bg-black pb-24">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
                <Link to="/admin" className="text-zinc-400 hover:text-white transition p-1">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </Link>
                <div className="flex items-center gap-2 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                        <GitBranch size={14} className="text-cyan-400" />
                    </div>
                    <h1 className="text-white font-bold text-lg">App Tree Diagram</h1>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-5">
                {/* Legend */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-full px-3 py-1">
                        <Globe size={12} className="text-green-400" />
                        <span className="text-green-400 text-xs font-semibold">Public</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full px-3 py-1">
                        <Lock size={12} className="text-blue-400" />
                        <span className="text-blue-400 text-xs font-semibold">Protected (User)</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-3 py-1">
                        <Shield size={12} className="text-yellow-400" />
                        <span className="text-yellow-400 text-xs font-semibold">Protected (Admin)</span>
                    </div>
                </div>

                {/* Route counts */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                    {[
                        { label: 'Public Routes', value: 2, color: 'text-green-400' },
                        { label: 'User Routes', value: 13, color: 'text-blue-400' },
                        { label: 'Admin Routes', value: 11, color: 'text-yellow-400' },
                    ].map(s => (
                        <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
                            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-zinc-500 text-xs mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Tree */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 overflow-x-auto">
                    <TreeNode node={treeData} depth={0} isLast={true} />
                </div>

                <p className="text-zinc-600 text-xs text-center mt-4">
                    SuperApp route hierarchy · {2 + 13 + 11} total routes
                </p>
            </div>
        </div>
    );
}
