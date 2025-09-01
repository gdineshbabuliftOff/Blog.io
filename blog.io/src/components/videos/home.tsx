import React, { useState, useEffect, useRef, FC, ReactNode } from 'react';

const StarIcon: FC<{ size?: number; className?: string }> = ({ size = 28, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
);
const BotIcon: FC<{ size?: number; className?: string }> = ({ size = 28, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 8V4H8V8H4v4h4v4h4v4h4v-4h4v-4h-4V8z"/><rect x="4" y="8" width="16" height="8" rx="2" /><path d="M9 16v-4" /><path d="M15 16v-4" /></svg>
);
const ChartIcon: FC<{ size?: number; className?: string }> = ({ size = 28, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20V16"/></svg>
);
const ZapIcon: FC<{ size?: number; className?: string }> = ({ size = 28, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
);
const UsersIcon: FC<{ size?: number; className?: string }> = ({ size = 28, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);
const ShieldCheckIcon: FC<{ size?: number; className?: string }> = ({ size = 28, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
);

const VideoStyles: FC = () => (
    <style>{`
        .scene { animation: fadeIn 0.8s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .fade-in { animation: fadeIn 1s ease-out forwards; }
        .fade-in-delay-1 { animation: fadeIn 1s ease-out 0.5s forwards; opacity: 0; }
        .fade-in-delay-2 { animation: fadeIn 1s ease-out 1s forwards; opacity: 0; }
        .fade-in-delay-3 { animation: fadeIn 1s ease-out 1.5s forwards; opacity: 0; }
        .logo-animation { animation: text-focus-in 1.2s cubic-bezier(0.550, 0.085, 0.680, 0.530) both; }
        @keyframes text-focus-in {
            0% { filter: blur(12px) saturate(0); opacity: 0; transform: scale(0.9); }
            100% { filter: blur(0px) saturate(1); opacity: 1; transform: scale(1); }
        }
        .animated-gradient-bg {
            background-size: 200% 200%;
            animation: gradient-pan 12s ease infinite;
        }
        @keyframes gradient-pan {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        .perspective-container { perspective: 1000px; }
        .parallax-card {
            transform-style: preserve-3d;
            transition: transform 0.4s ease-out;
            animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-15px); }
        }
        .typing-effect {
            border-right: .15em solid #d946ef;
            white-space: nowrap;
            overflow: hidden;
            animation: typing 2s steps(40, end), blink-caret .75s step-end infinite;
        }
        @keyframes typing { from { width: 0 } to { width: 100% } }
        @keyframes blink-caret { from, to { border-color: transparent } 50% { border-color: #d946ef; } }
        .generated-item {
            animation: popIn 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
            opacity: 0;
            transition: all 0.2s ease-in-out;
        }
        .generated-item:hover {
            background-color: rgba(217, 70, 239, 0.2);
            color: #fff;
        }
        @keyframes popIn {
            0% { transform: scale(0.5) translateY(20px); opacity: 0; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .template-card {
            transform-style: preserve-3d;
            transition: transform 0.7s cubic-bezier(0.25, 1, 0.5, 1);
            animation: slideUpIn 0.8s ease-out forwards;
            opacity: 0;
        }
        .template-card:hover { transform: translateY(-10px) scale(1.05); }
        @keyframes slideUpIn {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .chart-bar {
            animation: growHeight 1.2s cubic-bezier(0.23, 1, 0.32, 1) forwards;
            transform-origin: bottom;
        }
        @keyframes growHeight { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        .device {
            background: #1f2937;
            border: 8px solid #111827;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: device-pop-in 1s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
            opacity: 0;
        }
        @keyframes device-pop-in { from { transform: translateY(100px) scale(0.8); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        .device-screen { background: linear-gradient(135deg, #e0e7ff, #c7d2fe); }
        .checkmark__circle { stroke-dasharray: 166; stroke-dashoffset: 166; animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards; }
        .checkmark__check { stroke-dasharray: 48; stroke-dashoffset: 48; animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 1.2s forwards; }
        @keyframes stroke { 100% { stroke-dashoffset: 0; } }
        .pulse-ring { animation: pulseRing 2s infinite cubic-bezier(0.66, 0, 0, 1); }
        @keyframes pulseRing {
            0%, 100% { box-shadow: 0 0 0 0 rgba(217, 70, 239, 0.7); }
            50% { box-shadow: 0 0 0 14px rgba(217, 70, 239, 0); }
        }
        .aurora-bg {
            position: absolute;
            filter: blur(100px);
            opacity: 0.2;
            animation: aurora-pan 20s linear infinite alternate;
        }
        @keyframes aurora-pan {
            from { transform: translateX(-20%) translateY(10%) rotate(0deg); }
            to { transform: translateX(20%) translateY(-10%) rotate(90deg); }
        }
        .feature-card {
            background-color: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            animation: popIn 0.6s ease-out forwards;
            opacity: 0;
        }
        .avatar {
            animation: avatar-pop 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
            opacity: 0;
        }
        @keyframes avatar-pop {
            from { transform: scale(0.5); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
    `}</style>
);

const IntroScene: FC = () => (
    <div className="scene w-full h-full flex items-center justify-center bg-gray-900 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-96 h-96 bg-fuchsia-600 rounded-full aurora-bg"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full aurora-bg" style={{ animationDelay: '-5s' }}></div>
        <div className="text-center logo-animation z-10">
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter">
                blog<span className="text-fuchsia-400">.io</span>
            </h1>
        </div>
    </div>
);

const WriterBlockScene: FC = () => (
    <div className="scene w-full h-full flex flex-col items-center justify-center bg-slate-100 p-8 perspective-container">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-700 mb-8 text-center fade-in">Facing a blank page?</h2>
        <div className="w-full max-w-xl h-64 bg-white rounded-lg shadow-2xl p-6 parallax-card border border-slate-200">
            <div className="w-1/3 h-4 bg-slate-200 rounded animate-pulse"></div>
            <div className="w-full h-2 bg-slate-200 rounded mt-6 animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2/3 h-2 bg-slate-200 rounded mt-2 animate-pulse" style={{animationDelay: '0.4s'}}></div>
            <div className="w-1/2 h-2 bg-slate-200 rounded mt-2 animate-pulse" style={{animationDelay: '0.6s'}}></div>
        </div>
    </div>
);

const AiGeneratorScene: FC = () => (
    <div className="scene w-full h-full flex flex-col items-center justify-center bg-gray-800 text-white p-8 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-900 rounded-full aurora-bg"></div>
        <div className="z-10 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-2 text-center fade-in">Let AI spark your creativity.</h2>
            <p className="text-lg text-slate-400 mb-8 fade-in-delay-1">Powered by the Gemini model.</p>
        </div>
        <div className="w-full max-w-xl bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 shadow-2xl border border-fuchsia-500/30 z-10 perspective-container">
            <div className="parallax-card bg-transparent">
                <div className="flex items-center gap-4">
                    <BotIcon size={32} className="text-fuchsia-400" />
                    <div className="font-mono text-lg text-fuchsia-300 typing-effect">e.g., &quot;Web Developer&quot;</div>
                </div>
                <div className="mt-6 space-y-3">
                    <div className="p-3 bg-gray-700/50 rounded-md text-slate-300 generated-item" style={{ animationDelay: '2.2s' }}>&quot;Crafting Digital Experiences, One Line of Code at a Time.&quot;</div>
                    <div className="p-3 bg-gray-700/50 rounded-md text-slate-300 generated-item" style={{ animationDelay: '2.5s' }}>&quot;Building the Web of Tomorrow. Welcome to My Portfolio.&quot;</div>
                </div>
            </div>
        </div>
    </div>
);

const CustomizationScene: FC = () => (
    <div className="scene w-full h-full flex flex-col items-center justify-center bg-slate-50 p-8">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-12 text-center fade-in">Design your perfect look.</h2>
        <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="template-card h-64 shadow-2xl bg-white border rounded-lg p-4 flex flex-col justify-between" style={{ animationDelay: '0.5s' }}>
                <h3 className="font-bold text-lg text-slate-800">Minimalist</h3>
                <div className="space-y-2">
                   <div className="w-full h-3 bg-slate-200 rounded-full"></div>
                   <div className="w-4/5 h-3 bg-slate-200 rounded-full"></div>
                </div>
            </div>
            <div className="template-card h-64 shadow-2xl bg-gray-800 border rounded-lg p-4 flex flex-col justify-between" style={{ animationDelay: '0.7s' }}>
                <h3 className="font-bold text-lg text-white">Dark Mode</h3>
                 <div className="space-y-2">
                   <div className="w-full h-3 bg-gray-600 rounded-full"></div>
                   <div className="w-4/5 h-3 bg-gray-600 rounded-full"></div>
                </div>
            </div>
            <div className="template-card h-64 shadow-2xl bg-amber-50 border rounded-lg p-4 flex flex-col justify-between" style={{ animationDelay: '0.9s' }}>
                <h3 className="font-bold text-lg text-amber-800">Playful</h3>
                 <div className="space-y-2">
                   <div className="w-full h-3 bg-amber-200 rounded-full"></div>
                   <div className="w-4/5 h-3 bg-amber-200 rounded-full"></div>
                </div>
            </div>
        </div>
    </div>
);

const PremiumScene: FC = () => (
    <div className="scene w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-8 relative overflow-hidden animated-gradient-bg bg-gradient-to-br from-indigo-900 via-gray-900 to-fuchsia-900">
        <div className="text-center z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-2 fade-in">Unlock <span className="text-fuchsia-400">Premium</span> Power.</h2>
            <p className="text-lg text-slate-400 mb-12 fade-in-delay-1">Go beyond the basics.</p>
        </div>
        <div className="grid grid-cols-2 gap-6 max-w-2xl w-full z-10">
            <div className="feature-card rounded-xl p-4" style={{ animationDelay: '0.8s' }}>
                <h3 className="font-bold text-white">Custom Domains</h3>
            </div>
            <div className="feature-card rounded-xl p-4" style={{ animationDelay: '1s' }}>
                <h3 className="font-bold text-white">Advanced Analytics</h3>
            </div>
            <div className="feature-card rounded-xl p-4" style={{ animationDelay: '1.2s' }}>
                <h3 className="font-bold text-white">Exclusive Templates</h3>
            </div>
            <div className="feature-card rounded-xl p-4" style={{ animationDelay: '1.4s' }}>
                <h3 className="font-bold text-white">Priority Support</h3>
            </div>
        </div>
    </div>
);

const AnalyticsScene: FC = () => (
    <div className="scene w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-8 relative overflow-hidden">
        <div className="absolute -bottom-1/2 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-900 rounded-full aurora-bg"></div>
        <div className="z-10 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-2 text-center fade-in">Track your growth.</h2>
            <p className="text-lg text-slate-400 mb-8 fade-in-delay-1">Simple, powerful analytics.</p>
        </div>
        <div className="w-full max-w-xl bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 shadow-2xl border border-indigo-500/30 z-10">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-white">Page Views</h3>
                <span className="text-sm font-semibold text-cyan-300 fade-in" style={{animationDelay: '1.5s'}}>+24% this month</span>
            </div>
            <div className="w-full h-40 flex items-end gap-3">
                <div className="chart-bar flex-1 bg-gradient-to-t from-fuchsia-500 to-fuchsia-400 rounded-t-md" style={{ height: '60%', animationDelay: '0.8s' }}></div>
                <div className="chart-bar flex-1 bg-gradient-to-t from-cyan-500 to-cyan-300 rounded-t-md" style={{ height: '80%', animationDelay: '1.0s' }}></div>
                <div className="chart-bar flex-1 bg-gradient-to-t from-fuchsia-500 to-fuchsia-400 rounded-t-md" style={{ height: '50%', animationDelay: '1.2s' }}></div>
                <div className="chart-bar flex-1 bg-gradient-to-t from-cyan-500 to-cyan-300 rounded-t-md" style={{ height: '70%', animationDelay: '1.4s' }}></div>
                <div className="chart-bar flex-1 bg-gradient-to-t from-fuchsia-500 to-fuchsia-400 rounded-t-md" style={{ height: '95%', animationDelay: '1.6s' }}></div>
            </div>
        </div>
    </div>
);

const SeoScene: FC = () => (
    <div className="scene w-full h-full flex flex-col items-center justify-center bg-slate-50 p-8">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-8 text-center fade-in">Optimized for Search Engines.</h2>
        <div className="w-full max-w-xl bg-white rounded-lg shadow-xl p-6 border fade-in-delay-1">
            <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">G</div>
                <div className="ml-4 w-full h-6 bg-slate-200 rounded-full"></div>
            </div>
            <div className="mt-6 space-y-4">
                <div className="w-3/4 h-4 bg-blue-600 rounded-full"></div>
                <div className="w-full h-3 bg-slate-200 rounded-full"></div>
                <div className="w-5/6 h-3 bg-slate-200 rounded-full"></div>
            </div>
        </div>
    </div>
);

const ResponsiveScene: FC = () => (
    <div className="scene w-full h-full flex flex-col items-center justify-center bg-indigo-50 p-8 overflow-hidden">
        <h2 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-12 text-center fade-in">Stunning on every screen.</h2>
        <div className="flex items-end justify-center gap-4">
            <div className="device rounded-lg w-16 h-32" style={{ animationDelay: '1s' }}><div className="device-screen w-full h-full rounded"></div></div>
            <div className="device rounded-2xl w-96 h-56" style={{ animationDelay: '0.6s' }}><div className="device-screen w-full h-full rounded-lg"></div></div>
            <div className="device rounded-xl w-40 h-52" style={{ animationDelay: '0.8s' }}><div className="device-screen w-full h-full rounded-md"></div></div>
        </div>
    </div>
);

const CommunityScene: FC = () => (
    <div className="scene w-full h-full flex flex-col items-center justify-center bg-gray-800 text-white p-8 relative overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-[500px] h-[500px] bg-cyan-900 rounded-full aurora-bg"></div>
        <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center fade-in z-10">Join a community of creators.</h2>
        <div className="flex -space-x-4 z-10">
            <img className="avatar w-24 h-24 rounded-full border-4 border-gray-800" src="https://i.pravatar.cc/150?img=1" alt="User 1" style={{ animationDelay: '0.5s' }} />
            <img className="avatar w-24 h-24 rounded-full border-4 border-gray-800" src="https://i.pravatar.cc/150?img=2" alt="User 2" style={{ animationDelay: '0.7s' }} />
            <img className="avatar w-24 h-24 rounded-full border-4 border-gray-800" src="https://i.pravatar.cc/150?img=3" alt="User 3" style={{ animationDelay: '0.9s' }} />
            <img className="avatar w-24 h-24 rounded-full border-4 border-gray-800" src="https://i.pravatar.cc/150?img=4" alt="User 4" style={{ animationDelay: '1.1s' }} />
        </div>
    </div>
);

const SupportScene: FC = () => (
    <div className="scene w-full h-full flex flex-col items-center justify-center bg-slate-100 p-8">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-700 mb-8 text-center fade-in">We&apos;ve got your back.</h2>
        <div className="w-48 h-48 rounded-full bg-white flex items-center justify-center shadow-lg fade-in-delay-1">
            <ShieldCheckIcon size={80} className="text-indigo-500" />
        </div>
        <p className="text-xl font-semibold mt-8 text-slate-500 fade-in-delay-2">24/7 Customer Support</p>
    </div>
);

const PublishingScene: FC = () => (
    <div className="scene w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-8 overflow-hidden">
        <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center fade-in">Ready to go live?</h2>
        <div className="w-48 h-48 rounded-full bg-gray-800 flex items-center justify-center fade-in-delay-1">
             <svg className="w-32 h-32" viewBox="0 0 52 52">
                <circle className="checkmark__circle" stroke="#d946ef" strokeWidth="4" fill="none" cx="26" cy="26" r="25"/>
                <path className="checkmark__check" fill="none" stroke="#fff" strokeWidth="5" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
        </div>
        <p className="text-2xl font-semibold mt-8 text-slate-300 fade-in-delay-3">Published!</p>
    </div>
);

const FinalCtaScene: FC = () => (
    <div className="scene w-full h-full flex flex-col items-center justify-center bg-gray-900 text-center p-8 animated-gradient-bg bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-800 relative">
        <div className="absolute top-0 left-0 w-96 h-96 bg-fuchsia-600 rounded-full aurora-bg"></div>
        <div className="fade-in z-10">
            <StarIcon size={64} className="text-amber-300 drop-shadow-lg" />
        </div>
        <div className="mt-6 fade-in-delay-1 z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white">Create your stunning site. In minutes.</h2>
        </div>
        <div className="mt-8 fade-in-delay-2 z-10">
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter">
                blog<span className="text-fuchsia-400">.io</span>
            </h1>
        </div>
        <div className="mt-12 fade-in-delay-3 z-10">
            <div className="bg-fuchsia-500 text-white font-bold py-4 px-10 text-xl rounded-lg shadow-lg inline-block pulse-ring transition-transform duration-300 hover:scale-110 cursor-pointer">
                Get Started Free
            </div>
        </div>
    </div>
);

interface Scene {
    duration: number;
    content: ReactNode;
}

const scenes: Scene[] = [
    { duration: 3000, content: <IntroScene /> },
    { duration: 3500, content: <WriterBlockScene /> },
    { duration: 4000, content: <AiGeneratorScene /> },
    { duration: 4000, content: <CustomizationScene /> },
    { duration: 3500, content: <PremiumScene /> },
    { duration: 4000, content: <AnalyticsScene /> },
    { duration: 3500, content: <SeoScene /> },
    { duration: 4000, content: <ResponsiveScene /> },
    { duration: 3500, content: <CommunityScene /> },
    { duration: 3500, content: <SupportScene /> },
    { duration: 3000, content: <PublishingScene /> },
    { duration: 4500, content: <FinalCtaScene /> },
];

const BlogIoVideo: FC = () => {
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const sceneTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (sceneTimeoutRef.current) {
            clearTimeout(sceneTimeoutRef.current);
        }
        sceneTimeoutRef.current = setTimeout(() => {
            setCurrentSceneIndex(prevIndex => (prevIndex + 1) % scenes.length);
        }, scenes[currentSceneIndex].duration);

        return () => {
            if (sceneTimeoutRef.current) {
                clearTimeout(sceneTimeoutRef.current);
            }
        };
    }, [currentSceneIndex]);

    return (
        <>
            <VideoStyles />
            <div className="bg-gray-900 rounded-lg shadow-2xl shadow-fuchsia-500/20 w-full aspect-video relative overflow-hidden group">
                <div className="w-full h-full">
                    {scenes[currentSceneIndex].content}
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gray-700/50 group-hover:h-2.5 transition-all duration-300">
                    <div
                        className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400"
                        style={{ animation: `progress ${scenes[currentSceneIndex].duration}ms linear forwards` }}
                    ></div>
                    <style>{`
                        @keyframes progress {
                            from { width: 0%; }
                            to { width: 100%; }
                        }
                    `}</style>
                </div>
            </div>
        </>
    );
}

export default BlogIoVideo;