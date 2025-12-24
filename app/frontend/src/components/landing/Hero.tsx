import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Shield, Terminal, Cpu, Lock, ArrowRight, Activity, Bug, Biohazard, Gamepad2, Skull, Eye } from 'lucide-react';
import { FloatingElement } from './FloatingElement';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { Link } from 'react-router-dom';

export const Hero = () => {
    const containerRef = useRef(null);
    const { scrollY } = useScroll();

    // Parallax text effect
    const yText = useTransform(scrollY, [0, 500], [0, 150]);
    const opacityText = useTransform(scrollY, [0, 400], [1, 0]);

    return (
        <section ref={containerRef} className="relative w-full min-h-[100vh] flex flex-col items-center justify-between py-24 overflow-hidden bg-white">
            {/* Background Grid & Noise */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
            <div className="absolute inset-0 bg-noise opacity-40 pointer-events-none mix-blend-overlay"></div>

            <div className="relative z-10 w-full max-w-[90rem] mx-auto px-4 md:px-8 text-center flex-grow flex flex-col justify-center">
                {/* Floating "Physical" Cyber Props - High Fidelity Vinyl Stickers */}

                {/* Top Left: Hyper-Realistic Terminal */}
                <FloatingElement depth={0.5} className="absolute left-[1%] top-[5%] hidden lg:block" floatY={15} floatDuration={5} initialX={-100} initialY={-50}>
                    <div className="relative group">
                        {/* Vinyl Sticker Backing (White Contour) - Thicker for realism */}
                        <div className="absolute -inset-[3px] bg-white rounded-xl shadow-[0_8px_16px_rgba(0,0,0,0.15)]"></div>

                        {/* Main Content */}
                        <div className="relative w-72 bg-[#0f0f0f] text-left rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.3)] font-mono text-[10px] overflow-hidden transform -rotate-2 select-none ring-1 ring-black/5">
                            {/* Gloss Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-white/5 to-transparent pointer-events-none z-20 mix-blend-overlay"></div>

                            {/* Title Bar */}
                            <div className="flex px-4 py-3 bg-[#1a1a1a] items-center border-b border-gray-800/50">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#d89e24]/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]/50"></div>
                                </div>
                                <div className="flex-1 text-center text-gray-500 font-medium opacity-60 text-[10px]">sidhu — zsh — 80x24</div>
                            </div>
                            {/* Terminal Content */}
                            <div className="p-5 space-y-2 text-gray-400 font-medium leading-relaxed">
                                <div className="flex items-center gap-2">
                                    <span className="text-emerald-400">➜</span>
                                    <span className="text-blue-400">~/labs</span>
                                    <span className="text-gray-500">$</span>
                                    <span className="text-gray-200">docker-compose up -d</span>
                                </div>

                                <div className="pl-1 pt-1 opacity-90 space-y-1">
                                    <div className="flex gap-2 text-[#8b919d]">
                                        <span>[+]</span>
                                        <span>Running 3/3</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <span className="text-emerald-500">✔</span>
                                        <span className="flex-1">Network zcx_net</span>
                                        <span className="text-emerald-600 text-[10px] bg-emerald-500/10 px-1.5 rounded">Created</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <span className="text-emerald-500">✔</span>
                                        <span className="flex-1">Container ctf_core</span>
                                        <span className="text-emerald-600 text-[10px] bg-emerald-500/10 px-1.5 rounded">Started</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <span className="text-emerald-500">✔</span>
                                        <span className="flex-1">Container lab_01</span>
                                        <span className="text-emerald-600 text-[10px] bg-emerald-500/10 px-1.5 rounded">Healthy</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <span className="text-emerald-400">➜</span>
                                    <span className="text-blue-400">~/labs</span>
                                    <span className="text-gray-500">$</span>
                                    {/* Blinking Cursor */}
                                    <span className="w-2 h-4 bg-gray-500/80 block animate-pulse ml-[-4px]"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </FloatingElement>

                {/* Right Middle: ZecurX Elite Black Card (Premium Auth Sticker) */}
                <FloatingElement depth={2} className="absolute right-[2%] top-[28%] hidden lg:block" floatY={25} floatDuration={7} initialX={100} initialY={0}>
                    <div className="relative group transform rotate-12 hover:rotate-6 transition-transform duration-500 hover:scale-105">
                        {/* Sticker Backing */}
                        <div className="absolute -inset-[3px] bg-white rounded-xl shadow-[0_8px_16px_rgba(0,0,0,0.15)]"></div>

                        {/* Main Card */}
                        <div className="relative w-44 h-28 bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 shadow-xl flex flex-col justify-between p-4 select-none">
                            {/* Matte Texture & Shine */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-20 pointer-events-none"></div>
                            <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-150%] group-hover:animate-shine pointer-events-none"></div>

                            {/* Top Row: Chip & NFC */}
                            <div className="flex justify-between items-start z-10">
                                {/* Simulated EMV Chip */}
                                <div className="w-10 h-8 bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 rounded-md border border-yellow-700/50 relative overflow-hidden shadow-sm">
                                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-yellow-800/40"></div>
                                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-yellow-800/40"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-4 h-4 border border-yellow-800/30 rounded-sm"></div>
                                    </div>
                                </div>
                                {/* Contactless Symbol */}
                                <div className="space-y-[2px] opacity-60">
                                    <div className="w-4 h-4 border-r-2 border-t-2 border-gray-400 rounded-tr-full"></div>
                                    <div className="w-2 h-2 border-r-2 border-t-2 border-gray-400 rounded-tr-full ml-1 -mt-1"></div>
                                </div>
                            </div>

                            {/* Middle: Number */}
                            <div className="flex items-center gap-3 z-10 font-mono text-gray-300 text-[10px] tracking-widest opacity-80 mt-1">
                                <span>3137</span>
                                <span>1337</span>
                                <span>8080</span>
                                <span>9090</span>
                            </div>

                            {/* Bottom: Info */}
                            <div className="flex justify-between items-end z-10">
                                <div>
                                    <div className="text-[6px] text-gray-500 uppercase tracking-wider mb-0.5">Authorized</div>
                                    <div className="font-mono text-xs text-white font-bold tracking-wide text-shadow">ROOT USER</div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-4 h-4 rounded-full bg-red-500/80 blur-[8px] absolute"></div>
                                    <div className="w-4 h-4 rounded-full bg-orange-500/80 blur-[8px] absolute ml-3"></div>
                                    <div className="relative w-8 h-5 flex justify-center items-center font-bold italic text-[8px] text-white tracking-tighter">
                                        ZCX
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </FloatingElement>



                {/* Top Right: High Voltage Warning Sticker */}
                <FloatingElement depth={0.8} className="absolute right-[2%] top-[6%] hidden lg:block" floatY={10} floatDuration={5.5} initialX={80} initialY={-80}>
                    <div className="relative group transform rotate-12 hover:rotate-6 transition-transform duration-300">
                        {/* Sticker Backing */}
                        <div className="absolute -inset-[3px] bg-white rounded-lg shadow-[0_8px_16px_rgba(0,0,0,0.15)] clip-path-triangle"></div>

                        <div className="relative w-28 h-24 bg-yellow-400 rounded-md flex flex-col items-center justify-center p-2 border-4 border-black shadow-sm overflow-hidden">
                            {/* Gloss Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/40 to-transparent pointer-events-none z-20"></div>

                            <div className="text-black font-black text-2xl mb-1">
                                ⚠
                            </div>
                            <div className="text-black text-[9px] font-bold uppercase tracking-tighter leading-3 text-center border-t-2 border-black pt-1 w-full">
                                RESTRICTED<br />AREA
                            </div>
                        </div>
                    </div>
                </FloatingElement>

                {/* NEW: Inner Right - Surveillance Eye */}
                <FloatingElement depth={0.4} className="absolute right-[19%] top-[14%] hidden lg:block" floatY={8} floatDuration={9} initialX={40} initialY={-40}>
                    <div className="relative group transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                        <div className="absolute -inset-[3px] bg-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)]"></div>
                        <div className="relative w-16 h-16 bg-black rounded-full flex items-center justify-center border border-gray-800 overflow-hidden">
                            <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,white_360deg)] opacity-20 animate-spin-slow"></div>
                            <Eye className="w-8 h-8 text-red-500 relative z-10" />
                            <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>
                        </div>
                    </div>
                </FloatingElement>

                {/* Left Middle: Bug Bounty Badge */}
                <FloatingElement depth={1} className="absolute left-[3%] top-[32%] hidden lg:block" floatY={20} floatDuration={6} initialX={-80} initialY={20}>
                    <div className="relative group transform -rotate-12 hover:rotate-0 transition-transform duration-300">
                        <div className="absolute -inset-[3px] bg-white rounded-full shadow-[0_8px_16px_rgba(0,0,0,0.15)]"></div>
                        <div className="relative w-24 h-24 bg-purple-900 rounded-full flex flex-col items-center justify-center border-2 border-purple-400/30 overflow-hidden">
                            <div className="absolute inset-0 bg-noise opacity-20"></div>
                            <Bug className="w-10 h-10 text-purple-200 mb-1" />
                            <div className="text-[7px] font-mono text-purple-200 uppercase tracking-widest text-center">Bug Hunter<br />Level 99</div>
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/10 pointer-events-none"></div>
                        </div>
                    </div>
                </FloatingElement>

                {/* Bottom Right: Field Notes (Sticky Note) */}
                <FloatingElement depth={1.2} className="absolute right-[2%] top-[72%] hidden lg:block" floatY={18} floatDuration={6.5} initialX={100} initialY={100}>
                    <div className="relative group transform rotate-6 hover:rotate-2 transition-transform duration-300">
                        {/* Sticker Backing */}
                        <div className="absolute -inset-[3px] bg-white rounded-md shadow-[0_8px_16px_rgba(0,0,0,0.15)]"></div>

                        <div className="relative w-40 h-40 bg-[#fef3c7] rounded-sm p-4 flex flex-col font-mono text-gray-800 text-[10px] handwriting-font border border-black/5">
                            {/* Paper Texture Overlay */}
                            <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none"></div>

                            <div className="opacity-70 mb-2 border-b border-gray-400/20 pb-1">
                                TARGET: <span className="font-bold text-red-600">10.10.11.24</span>
                            </div>
                            <div className="space-y-1.5 leading-tight opacity-90">
                                <div className="flex justify-between">
                                    <span>User:</span>
                                    <span className="font-bold">admin</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Pass:</span>
                                    <span className="font-bold blur-[2px] group-hover:blur-0 transition-all duration-500 cursor-help">P@ssw0rd!</span>
                                </div>
                                <div className="pt-2 text-[9px] text-gray-500 italic">
                                    * Scan ports 22, 80 first!<br />
                                    * Check for CVE-2024-XXXX
                                </div>
                            </div>
                            {/* Folded Corner */}
                            <div className="absolute bottom-0 right-0 w-6 h-6 bg-gradient-to-tl from-gray-300 to-transparent shadow-[-2px_-2px_4px_rgba(0,0,0,0.1)] rounded-tl-lg"></div>
                        </div>
                    </div>
                </FloatingElement>

                {/* NEW: Right Middle - Game Cartridge */}
                <FloatingElement depth={1.5} className="absolute right-[3%] top-[50%] hidden lg:block" floatY={22} floatDuration={7.5} initialX={90} initialY={30}>
                    <div className="relative group transform -rotate-[15deg] hover:rotate-[-5deg] transition-transform duration-300">
                        <div className="absolute -inset-[3px] bg-white rounded-md shadow-[0_8px_16px_rgba(0,0,0,0.15)]"></div>
                        <div className="relative w-32 h-36 bg-gray-400 rounded-md flex flex-col p-1 border border-gray-500 shadow-inner">
                            {/* Cartridge Grip Lines */}
                            <div className="h-4 w-full flex justify-center gap-1 mb-2">
                                <div className="w-0.5 h-full bg-gray-500/50"></div>
                                <div className="w-0.5 h-full bg-gray-500/50"></div>
                                <div className="w-0.5 h-full bg-gray-500/50"></div>
                            </div>
                            {/* Label */}
                            <div className="flex-1 bg-black rounded-sm relative overflow-hidden flex flex-col items-center justify-center border-t-2 border-red-500">
                                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_40%,rgba(255,0,0,0.2)_50%,transparent_60%)] bg-[length:100%_4px]"></div>
                                <Gamepad2 className="w-8 h-8 text-neutral-200" />
                                <div className="text-white font-black text-sm italic tracking-tighter mt-1">ZECURX</div>
                                <div className="text-[6px] text-gray-400 tracking-widest uppercase">PwnOS v1.0</div>
                            </div>
                        </div>
                    </div>
                </FloatingElement>

                {/* NEW: Left Bottom - Biohazard */}
                <FloatingElement depth={0.6} className="absolute left-[4%] top-[82%] hidden lg:block" floatY={15} floatDuration={6} initialX={-60} initialY={80}>
                    <div className="relative group transform rotate-[25deg] hover:rotate-[15deg] transition-transform duration-300">
                        <div className="absolute -inset-[3px] bg-white rounded-full shadow-[0_8px_16px_rgba(0,0,0,0.15)]"></div>
                        <div className="relative w-28 h-28 bg-[#ccff00] rounded-full flex items-center justify-center border-4 border-black/80 shadow-inner">
                            <Biohazard className="w-16 h-16 text-black" />
                            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-full pointer-events-none"></div>
                        </div>
                    </div>
                </FloatingElement>

                {/* NEW: Inner Left - Evidence Tape */}
                <FloatingElement depth={1.1} className="absolute left-[14%] top-[68%] hidden lg:block" floatY={12} floatDuration={4.5} initialX={-50} initialY={50}>
                    <div className="relative group transform -rotate-6 hover:rotate-3 transition-transform duration-300">
                        {/* Tape effect - glowing edges, translucent */}
                        <div className="relative w-48 h-10 bg-yellow-400/90 shadow-[0_4px_12px_rgba(250,204,21,0.3)] flex items-center justify-center border-y-2 border-black/80 backdrop-blur-sm transform skew-x-12">
                            <div className="absolute top-0.5 bottom-0.5 left-2 right-2 border-y border-black/20"></div>
                            <span className="font-black text-black tracking-[0.2em] text-[10px]">EVIDENCE - DO NOT OPEN</span>
                        </div>
                    </div>
                </FloatingElement>

                {/* Left Middle: USB Rubber Ducky */}
                <FloatingElement depth={0.6} className="absolute left-[2%] top-[55%] hidden lg:block" floatY={12} floatDuration={4} initialX={-120} initialY={-20}>
                    <div className="relative group transform -rotate-[25deg] hover:rotate-[-20deg] transition-transform">
                        {/* Sticker Backing (Contour) */}
                        <div className="absolute -inset-[3px] bg-white rounded-lg shadow-[0_8px_16px_rgba(0,0,0,0.15)]"></div>

                        <div className="relative w-auto inline-block bg-white rounded-lg">
                            <div className="w-32 h-10 bg-gray-900 rounded-md flex items-center px-1 border border-gray-800 shadow-inner overflow-hidden">
                                {/* Gloss Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-20 rounded-md mix-blend-overlay"></div>
                                {/* USB Connector */}
                                <div className="w-8 h-6 bg-gray-300 rounded-sm bg-gradient-to-b from-gray-100 to-gray-400 mr-1 border-r border-gray-400 grid grid-cols-2 gap-[2px] place-content-center">
                                    <div className="w-1.5 h-3 border border-gray-400/50"></div>
                                    <div className="w-1.5 h-3 border border-gray-400/50"></div>
                                </div>
                                {/* Body */}
                                <div className="flex-1 h-8 bg-[#111] rounded flex items-center justify-between px-2 relative overflow-hidden">
                                    <span className="text-[7px] font-bold text-gray-500 tracking-widest uppercase z-10">Rubber Ducky</span>
                                    {/* Status LED */}
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)] z-10"></div>
                                    {/* Texture */}
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.03)_50%,transparent_75%)] bg-[length:4px_4px]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </FloatingElement>


                {/* Main Content - Centered Text */}
                <motion.div style={{ y: yText, opacity: opacityText }} className="relative z-0 flex flex-col items-center select-none pointer-events-none mb-12">
                    <div className="inline-flex items-center gap-2 px-6 py-2 bg-gray-50 border border-gray-200 rounded-full mb-8 pointer-events-auto">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-sm font-semibold text-gray-600 tracking-wide uppercase">New Challenges Added</span>
                    </div>

                    <h1 className="text-[11vw] leading-[0.85] font-black tracking-[-0.04em] text-gray-950 flex flex-col items-center">
                        <span className="block">MASTER</span>
                        <span className="block text-transparent bg-clip-text bg-gradient-to-b from-gray-200 to-gray-400 stroke-2" style={{ WebkitTextStroke: '1px #d1d5db' }}>ETHICAL</span>
                        <span className="block">HACKING</span>
                    </h1>
                </motion.div>
            </div>

            {/* Glassmorphic Bottom Dock */}
            <div className="relative w-full max-w-2xl px-4 z-30 mb-8">
                <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-2xl rounded-2xl py-3 px-6 flex flex-col md:flex-row items-center justify-between gap-4 ring-1 ring-gray-950/5">
                    <p className="text-sm md:text-base text-gray-700 font-medium leading-relaxed text-center md:text-left">
                        The advanced CTF platform.<br />
                        <span className="text-gray-500 text-xs">Real-world labs. Dockerized. Zero setup.</span>
                    </p>

                    <div className="shrink-0">
                        <Link to="/login">
                            <RainbowButton className="h-10 px-5 text-sm gap-2 shadow-lg">
                                Start Hacking <ArrowRight className="w-4 h-4" />
                            </RainbowButton>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 text-gray-300 flex flex-col items-center gap-2 z-20"
            >
                <div className="w-[1px] h-6 bg-gray-200"></div>
            </motion.div>
        </section>
    );
};
