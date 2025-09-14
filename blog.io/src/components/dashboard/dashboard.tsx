'use client';

import React, { useState, useEffect, ReactNode, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { CreateSiteModal } from './modal';
import { clearSessionClient } from '@/actions/localStorage';
// Import shared types from the new central file
import { Site, SiteStatus, FirestoreTimestamp, UserData } from '@/utils/types/dashboard';

// --- ICONS ---
import {
    PlusIcon, SettingsIcon, EditIcon, EyeIcon, MoreHorizontalIcon,
    LayoutDashboardIcon, LayoutGridIcon, FileTextIcon, UserIcon, LogOutIcon, MenuIcon, XIcon,
    BarChart3Icon
} from 'lucide-react';
import { AnalyticsCharts } from './AnalyticsCharts';

// --- SIDEBAR ---
const Sidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen }: { isMobileMenuOpen: boolean; setIsMobileMenuOpen: (isOpen: boolean) => void; }) => {
    const router = useRouter();
    const pathname = usePathname();
    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboardIcon /> },
        { href: '/sites', label: 'My Sites', icon: <LayoutGridIcon /> },
        { href: '/posts', label: 'All Posts', icon: <FileTextIcon /> },
        { href: '/profile', label: 'Profile', icon: <UserIcon /> }
    ];

    const handleLogout = () => { clearSessionClient(); router.push('/login'); };

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-gray-900 text-white fixed h-full border-r border-gray-800 p-4">
                <div className="px-2 py-4 border-b border-gray-800 mb-4">
                    <h1 className="text-2xl font-bold">
                        blog<span className="text-fuchsia-400">.io</span>
                    </h1>
                </div>
                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => (
                        <a
                            key={item.label}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                pathname === item.href ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'hover:bg-gray-800'
                            }`}
                        >
                            {item.icon}
                            <span className="font-medium">{item.label}</span>
                        </a>
                    ))}
                </nav>
                <div className="border-t border-gray-800 pt-4 mt-4">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-400"
                    >
                        <LogOutIcon />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <motion.aside
                            className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white border-r border-gray-800 p-4 flex flex-col"
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-2 py-4 border-b border-gray-800 mb-4 flex justify-between items-center">
                                <h1 className="text-2xl font-bold">blog<span className="text-fuchsia-400">.io</span></h1>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                    <XIcon />
                                </button>
                            </div>
                            <nav className="flex-1 space-y-2">
                                {navItems.map((item) => (
                                    <a
                                        key={item.label}
                                        href={item.href}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                            pathname === item.href ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'hover:bg-gray-800'
                                        }`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {item.icon}
                                        <span className="font-medium">{item.label}</span>
                                    </a>
                                ))}
                            </nav>
                            <div className="border-t border-gray-800 pt-4 mt-4">
                                <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-400">
                                    <LogOutIcon />
                                    <span className="font-medium">Logout</span>
                                </button>
                            </div>
                        </motion.aside>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

const DashboardLayout = ({ children }: { children: ReactNode }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    return (
        <div className="bg-gray-950 text-white min-h-screen font-sans flex">
            <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
            <div className="flex-1 md:ml-64">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800 sticky top-0 z-20">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 rounded-md hover:bg-gray-800 text-gray-400">
                        <MenuIcon />
                    </button>
                    <h1 className="text-xl font-bold">blog<span className="text-fuchsia-400">.io</span></h1>
                    <div className="w-10"></div>
                </header>
                <main className="container mx-auto p-6 md:p-8">{children}</main>
            </div>
        </div>
    );
};

const ActionDropdown = ({ site }: { site: Site }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleEdit = () => router.push(`/creator-space/${site.id}`);
    const handleView = () => window.open(`https://${site.subdomain}.blog.io`, '_blank');
    const handleSettings = () => router.push(`/site/${site.id}/settings`);

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-md hover:bg-gray-600"><MoreHorizontalIcon /></button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-10">
                    <ul className="py-1">
                        <li><button onClick={handleEdit} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-fuchsia-500/20"><EditIcon /> Edit</button></li>
                        <li><button onClick={handleView} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-fuchsia-500/20"><EyeIcon /> View</button></li>
                        <li><button onClick={handleSettings} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-fuchsia-500/20"><SettingsIcon /> Settings</button></li>
                    </ul>
                </div>
            )}
        </div>
    );
};

const SitesTable = ({ sites }: { sites: Site[] }) => {
    const formatDate = (timestamp: FirestoreTimestamp) => {
        if (timestamp && typeof timestamp._seconds === 'number') {
            return new Date(timestamp._seconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        }
        return "---";
    };

    const StatusBadge = ({ status }: { status: SiteStatus }) => {
        const isPublished = String(status || 'draft').toLowerCase() === 'published';
        return <span className={`capitalize text-xs font-medium px-2.5 py-0.5 rounded-full ${isPublished ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{status}</span>;
    };

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg mt-6 overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-800 text-xs text-gray-400 uppercase">
                    <tr>
                        <th scope="col" className="px-6 py-3">Site Title</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                        <th scope="col" className="px-6 py-3">Views</th>
                        <th scope="col" className="px-6 py-3">Created</th>
                        <th scope="col" className="px-6 py-3">Last Published</th>
                        <th scope="col" className="px-6 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sites.map((site) => (
                        <tr key={site.id} className="border-b border-gray-700 hover:bg-gray-800 transition-colors">
                            <td className="px-6 py-4">
                                <div className="font-medium text-white">{site.title}</div>
                                {String(site.status).toLowerCase() === 'published' ? (
                                    <a href={`https://${site.subdomain}.blog.io`} target="_blank" rel="noopener noreferrer" className="text-fuchsia-400 text-xs hover:underline">{site.subdomain}.blog.io</a>
                                ) : (
                                    <span className="text-gray-500 text-xs">{site.subdomain}.blog.io</span>
                                )}
                            </td>
                            <td className="px-6 py-4"><StatusBadge status={site.status} /></td>
                            <td className="px-6 py-4 text-white">{(site.stats?.views || 0).toLocaleString()}</td>
                            <td className="px-6 py-4 text-gray-400">{formatDate(site.createdAt)}</td>
                            <td className="px-6 py-4 text-gray-400">{formatDate(site.lastPublishedAt)}</td>
                            <td className="px-6 py-4 text-right"><div className="flex justify-end"><ActionDropdown site={site} /></div></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const DashboardContent = ({ userData, handleSiteCreated, existingSubdomains, setIsModalOpen }: {
    userData: UserData,
    handleSiteCreated: (newSite: Site) => void,
    existingSubdomains: string[],
    setIsModalOpen: (isOpen: boolean) => void
}) => {
    return (
        <>
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
            >
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold">Welcome back, {userData.user?.firstName || 'Creator'}! 👋</h2>
                    <p className="text-gray-400 mt-2">Here&apos;s a snapshot of your creative universe.</p>
                </div>
                <motion.button
                    onClick={() => setIsModalOpen(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-fuchsia-500 hover:bg-fuchsia-600 flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                    <PlusIcon className="w-5 h-5" /> <span className="hidden sm:inline">Create New Site</span>
                </motion.button>
            </motion.header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Sites" value={userData.stats?.totalSites || 0} />
                <StatCard title="Total Likes" value={userData.stats?.totalLikes || 0} />
                <StatCard title="Total Views" value={userData.stats?.totalViews || 0} />
            </div>

            <section className="mt-12">
                <h3 className="text-2xl font-bold mb-4">My Sites</h3>
                {userData.sites?.length > 0 ? (
                    <SitesTable sites={userData.sites} />
                ) : (
                    <div className="text-center py-12 bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-lg mt-6">
                        <h4 className="text-xl font-semibold">No sites yet!</h4>
                        <p className="text-gray-400 mt-2">Click &quot;Create New Site&quot; to get started.</p>
                    </div>
                )}
            </section>

            <section className="mt-12">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3Icon className="text-fuchsia-400" />
                    <h3 className="text-2xl font-bold">Analytics</h3>
                </div>
                <AnalyticsCharts />
            </section>
        </>
    );
};

export default function DashboardPage() {
    const [userData, setUserData] = useState<UserData>({ user: null, sites: [], recentPosts: [], stats: {} });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const token = localStorage.getItem("blogToken");
                if (!token) { router.push('/login'); return; }
                const response = await fetch('/api/sites', { headers: { 'Authorization': `Bearer ${token}` } });
                if (!response.ok) { if (response.status === 401) clearSessionClient(); router.push('/login'); throw new Error('Failed to fetch data'); }
                const data: UserData = await response.json();
                setUserData(data);
            } catch (error) { console.error(error); } finally { setLoading(false); }
        }
        fetchData();
    }, [router]);

    const handleSiteCreated = (newSite: Site) => {
        setUserData((prevData) => ({
            ...prevData,
            sites: [newSite, ...(prevData.sites || [])],
            stats: { ...prevData.stats, totalSites: (prevData.stats.totalSites || 0) + 1 }
        }));
    };

    const existingSubdomains = React.useMemo(() => (userData.sites || []).map(site => site.subdomain), [userData.sites]);

    if (loading) return <DashboardSkeleton />;

    return (
        <>
            <CreateSiteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSiteCreated={handleSiteCreated} existingSubdomains={existingSubdomains} />
            <DashboardLayout>
                <DashboardContent
                    userData={userData}
                    handleSiteCreated={handleSiteCreated}
                    existingSubdomains={existingSubdomains}
                    setIsModalOpen={setIsModalOpen}
                />
            </DashboardLayout>
        </>
    );
}

const StatCard = ({ title, value }: { title: string, value: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 shadow-xl relative overflow-hidden"
    >
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800/70 to-fuchsia-900/10 opacity-70 rounded-lg"></div>
        <p className="text-gray-400 text-sm relative z-10">{title}</p>
        <p className="text-3xl font-bold mt-1 relative z-10 text-white">{value.toLocaleString()}</p>
    </motion.div>
);

const SkeletonCard = () => <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 animate-pulse"><div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div><div className="h-8 bg-gray-700 rounded w-1/2"></div></div>;

const SkeletonTable = () => (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg mt-6 overflow-x-auto">
        <table className="w-full text-sm text-left animate-pulse">
            <thead className="bg-gray-800 text-xs text-gray-400 uppercase">
                <tr>
                    {Array.from({ length: 6 }).map((_, i) => <th key={i} scope="col" className="px-6 py-3"><div className="h-4 bg-gray-700 rounded w-3/4"></div></th>)}
                </tr>
            </thead>
            <tbody>
                {Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-700">
                        <td className="px-6 py-4"><div className="h-4 bg-gray-700 rounded w-full mb-2"></div><div className="h-3 bg-gray-700 rounded w-1/2"></div></td>
                        <td className="px-6 py-4"><div className="h-5 bg-gray-700 rounded-full w-20"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-700 rounded w-12"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-700 rounded w-24"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-700 rounded w-24"></div></td>
                        <td className="px-6 py-4"><div className="h-8 w-8 bg-gray-700 rounded-md ml-auto"></div></td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const DashboardSkeleton = () => (
    <DashboardLayout>
        <header className="flex justify-between items-center mb-8 animate-pulse">
            <div>
                <div className="h-10 bg-gray-700 rounded w-72 md:w-96 mb-3"></div>
                <div className="h-5 bg-gray-700 rounded w-64 md:w-80"></div>
            </div>
            <div className="h-10 w-40 bg-gray-700 rounded-lg hidden sm:block"></div>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
        <section className="mt-12">
            <div className="flex justify-between items-center animate-pulse">
                <div className="h-8 bg-gray-700 rounded w-36"></div>
            </div>
            <SkeletonTable />
        </section>
        <section className="mt-12">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 h-96 animate-pulse"></div>
        </section>
    </DashboardLayout>
);