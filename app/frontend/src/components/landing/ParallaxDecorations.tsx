import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FloatingElement } from './FloatingElement';
import { Wifi, Database, Key, Server, Hash, Radio, Globe, Trophy, Box, Bug, ShieldAlert } from 'lucide-react';

export const ParallaxDecorations = () => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden h-full max-w-[100vw] z-50">

            {/* --- FEATURE SECTION DECORATIONS (Top half) --- */}
            {/* Context: Instant Feedback, Terminal, Private Env, Leaderboards */}

            {/* 1. Leaderboard Trophy (Left) */}
            <FloatingElement depth={0.5} className="absolute left-[5%] top-[10%] block" floatY={15} floatDuration={5} initialX={-50} hideOnScroll={false}>
                <div className="relative group transform -rotate-12">
                    <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-yellow-200 shadow-xl overflow-hidden relative">
                        <div className="absolute inset-0 bg-paper opacity-50 mix-blend-overlay"></div>
                        <Trophy className="w-12 h-12 text-yellow-900 drop-shadow-md" />
                        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white">#1</div>
                    </div>
                </div>
            </FloatingElement>

            {/* 2. Docker Container (Right - Private Env) */}
            <FloatingElement depth={1.2} className="absolute right-[8%] top-[20%] block" floatY={20} floatDuration={7} initialX={50} hideOnScroll={false}>
                <div className="relative group transform rotate-6">
                    <div className="w-24 h-24 bg-blue-500 rounded-xl flex flex-col items-center justify-center border-t border-blue-400 shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-paper opacity-30 mix-blend-overlay pointer-events-none z-0"></div>
                        {/* Container Lines */}
                        <div className="absolute inset-0 flex flex-col justify-between py-2 px-1 opacity-20">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="w-full h-[2px] bg-white"></div>
                            ))}
                        </div>

                        <Box className="w-12 h-12 text-white relative z-10" />
                        <div className="text-[8px] text-white font-mono mt-1 z-10 opacity-80">container_id</div>
                    </div>
                </div>
            </FloatingElement>

            {/* 3. Terminal/Instant Feedback Activity (Center BG) */}
            <FloatingElement depth={0.2} className="absolute left-[30%] top-[30%] opacity-30 block" floatY={10} floatDuration={4} hideOnScroll={false}>
                <div className="bg-black/5 p-4 rounded-lg backdrop-blur-sm transform rotate-3 relative overflow-hidden">
                    <div className="absolute inset-0 bg-paper opacity-40"></div>
                    <div className="flex gap-1 mb-2">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    </div>
                    <div className="space-y-1">
                        <div className="w-32 h-2 bg-gray-400/20 rounded"></div>
                        <div className="w-24 h-2 bg-gray-400/20 rounded"></div>
                        <div className="w-28 h-2 bg-gray-400/20 rounded"></div>
                    </div>
                </div>
            </FloatingElement>


            {/* --- MODULE SECTION DECORATIONS (Bottom half) --- */}
            {/* Context: Web, Binary, Network, Crypto */}

            {/* 4. Bug for Web/Binary (Left - Web Exp) */}
            <FloatingElement depth={0.6} className="absolute left-[3%] top-[60%] block" floatY={18} floatDuration={5.5} initialX={-40} hideOnScroll={false}>
                <div className="relative group">
                    <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-red-400 relative overflow-hidden">
                        <div className="absolute inset-0 bg-paper opacity-40 mix-blend-overlay pointer-events-none"></div>
                        <Bug className="w-10 h-10 text-white" />
                        <div className="absolute inset-0 bg-red-600 rounded-full animate-ping opacity-20"></div>
                    </div>
                </div>
            </FloatingElement>

            {/* 5. WiFi Sniffer (Moved here for Network Defense - Right Center) */}
            <FloatingElement depth={0.8} className="absolute right-[12%] top-[55%] block" floatY={25} floatDuration={8} initialX={60} hideOnScroll={false}>
                <div className="relative group p-3 bg-white rounded-2xl border border-gray-200 shadow-xl transform -rotate-12 overflow-hidden">
                    <div className="absolute inset-0 bg-paper opacity-50 mix-blend-multiply pointer-events-none"></div>
                    <Wifi className="w-10 h-10 text-blue-600" />
                    <div className="w-full bg-gray-100 h-1 mt-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full w-2/3 animate-pulse"></div>
                    </div>
                    <div className="text-[8px] font-mono text-gray-500 mt-1 uppercase">Packets: 1024</div>
                </div>
            </FloatingElement>

            {/* 6. Encryption Key (Bottom Right - Crypto) */}
            <FloatingElement depth={1.5} className="absolute right-[5%] top-[80%] block" floatY={18} floatDuration={6} initialX={60} hideOnScroll={false}>
                <div className="relative w-20 h-20 bg-yellow-400 rounded-xl flex items-center justify-center shadow-xl border-4 border-white transform rotate-[15deg] group hover:rotate-0 transition-transform overflow-hidden">
                    <div className="absolute inset-0 bg-paper opacity-50 mix-blend-overlay pointer-events-none"></div>
                    <Key className="w-10 h-10 text-yellow-900 relative z-10" />
                </div>
            </FloatingElement>

            {/* 7. Binary Rain (Background Module) */}
            <FloatingElement depth={0.3} className="absolute left-[15%] top-[75%] opacity-10 block pointer-events-none" floatY={-10} floatDuration={5} hideOnScroll={false}>
                <div className="font-mono text-lg font-bold text-blue-900 leading-none flex flex-col items-center">
                    <span>101010</span>
                    <span>010011</span>
                    <span>110101</span>
                    <span>001100</span>
                </div>
            </FloatingElement>

        </div>
    );
};
