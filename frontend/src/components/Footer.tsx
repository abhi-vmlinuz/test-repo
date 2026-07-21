import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, Twitter, Github, Linkedin, MessageCircle, Terminal, Command } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';

const Keycap = ({ label, className, delay = 0, depth = 1 }: { label: React.ReactNode, className?: string, delay?: number, depth?: number }) => {
    return (
        <motion.div
            className={`absolute ${className}`}
            style={{ zIndex: 0 }}
            initial={{ y: 0 }}
            animate={{
                y: [0, -10 * depth, 0],
                rotate: [0, 5, -5, 0]
            }}
            transition={{
                duration: 4 * depth,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
                delay: delay
            }}
        >
            <div className="relative w-16 h-16 bg-zinc-800/80 backdrop-blur-sm rounded-xl shadow-[0_8px_0_rgba(0,0,0,0.5)] border-t border-l border-zinc-600 flex items-center justify-center text-zinc-300 font-mono font-bold text-lg transform hover:-translate-y-1 hover:shadow-[0_12px_0_rgba(0,0,0,0.5)] transition-all cursor-default">
                {label}
            </div>
        </motion.div>
    );
};

const Footer = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end end"]
    });

    const y1 = useTransform(scrollYProgress, [0, 1], [100, -50]);
    const y2 = useTransform(scrollYProgress, [0, 1], [200, -100]);
    const rotate = useTransform(scrollYProgress, [0, 1], [-10, 0]);

    const footerLinks = {
        Platform: [
            { label: 'Challenges', href: '/challenges' },
            { label: 'Leaderboard', href: '/leaderboard' },
            { label: 'Categories', href: '/challenges' }, // Redirect to challenges for now
            { label: 'Docker Labs', href: '/challenges' }, // Redirect to challenges for now
        ],
        Resources: [
            { label: 'Documentation', href: '/documentation' },
            { label: 'Blog', href: '/blog' },
            { label: 'Community', href: '/community' },
            { label: 'Discord', href: 'https://discord.gg/rlabz' }, // Example Discord link
        ],
        Company: [
            { label: 'About Us', href: '/about' },
            { label: 'Pricing', href: '/pricing' },
            { label: 'Careers', href: '/careers' },
            { label: 'Contact', href: '/contact' },
        ],
        Legal: [
            { label: 'Terms of Service', href: '/terms' },
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Cookie Policy', href: '/cookie' },
        ],
    };

    const socialLinks = [
        { icon: Twitter, href: '#', label: 'Twitter' },
        { icon: Github, href: '#', label: 'GitHub' },
        { icon: Linkedin, href: '#', label: 'LinkedIn' },
        { icon: MessageCircle, href: '#', label: 'Discord' },
    ];

    return (
        <div ref={containerRef} className="relative h-[800px]" style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}>
            <div className="fixed bottom-0 h-[800px] w-full bg-zinc-950 text-white overflow-hidden">

                {/* --- 3D DECORATIONS --- */}
                {/* 1. Tilted Terminal Window - Left Side */}
                <motion.div
                    style={{ y: y1, rotateX: 20, rotateY: 10, rotateZ: 5, left: '0%', top: '10%' }}
                    className="absolute w-[500px] h-[300px] bg-zinc-900/50 backdrop-blur-md rounded-xl border border-zinc-800 shadow-2xl z-0 hidden lg:block opacity-60"
                >
                    <div className="h-8 bg-zinc-800/80 rounded-t-xl flex items-center gap-2 px-4 border-b border-zinc-700">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <div className="ml-4 text-xs text-zinc-500 font-mono">root@rlabz:~</div>
                    </div>
                    <div className="p-6 font-mono text-sm text-green-500/80 space-y-2">
                        <p>$ nmap -sV -p- rlabz.edu</p>
                        <p className="text-zinc-500">Starting Nmap 7.92...</p>
                        <p className="text-zinc-500">Scanning targets...</p>
                        <p>Discovered open port 443/tcp on 192.168.1.1</p>
                        <p>Discovered open port 80/tcp on 192.168.1.1</p>
                        <div className="w-3 h-5 bg-green-500/50 animate-pulse inline-block"></div>
                    </div>
                </motion.div>

                {/* 2. Floating Keycaps */}
                <motion.div style={{ y: y2 }} className="absolute inset-0 pointer-events-none z-0">
                    <Keycap label="ESC" className="top-[15%] left-[10%]" delay={0} depth={1.2} />
                    <Keycap label={<Command className="w-6 h-6" />} className="top-[45%] right-[25%]" delay={1.5} depth={0.8} />
                    <Keycap label="CTF" className="bottom-[30%] left-[20%]" delay={0.5} depth={1.2} />
                    <Keycap label={<Terminal className="w-6 h-6" />} className="bottom-[15%] right-[10%]" delay={2} depth={1.5} />
                </motion.div>

                <div className="h-full flex flex-col justify-between px-8 lg:px-16 pt-20 pb-10 relative z-20">

                    {/* Top Section: CTA + Links */}
                    <div className="flex flex-col md:flex-row justify-between gap-16">
                        {/* CTA */}
                        <div className="max-w-2xl">
                            <h2 className="text-6xl md:text-8xl font-bold tracking-tighter leading-none mb-8 text-white relative z-20">
                                Let's build <br />
                                <span className="text-zinc-500">secure futures.</span>
                            </h2>
                            <div className="flex gap-4">
                                <Link to="/login">
                                    <button className="px-8 py-4 bg-white text-zinc-950 rounded-full font-bold text-lg hover:bg-zinc-200 transition-colors">
                                        Start Hacking
                                    </button>
                                </Link>
                                <a href="mailto:contact@rajagiri.edu">
                                    <button className="px-8 py-4 border border-zinc-800 rounded-full font-bold text-lg hover:bg-zinc-900 transition-colors">
                                        Contact Sales
                                    </button>
                                </a>
                            </div>
                        </div>

                        {/* Links Grid */}
                        <div className="grid grid-cols-2 gap-x-16 gap-y-8">
                            {Object.entries(footerLinks).map(([title, links]) => (
                                <div key={title}>
                                    <h4 className="font-mono text-zinc-500 mb-4 uppercase text-xs tracking-wider">{title}</h4>
                                    <ul className="space-y-3">
                                        {links.map((link) => (
                                            <li key={link.label}>
                                                <Link
                                                    to={link.href}
                                                    className="text-lg text-zinc-300 hover:text-white transition-colors"
                                                >
                                                    {link.label}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Section: Logo + Copyright */}
                    <div className="flex flex-col md:flex-row items-end justify-between border-t border-zinc-800 pt-8 mt-12 bg-zinc-950/80 backdrop-blur-sm">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <img src="/logo.png" alt="RLabZ" className="w-8 h-8 opacity-80" />
                                <span className="text-xl font-bold tracking-tight">RLabZ</span>
                            </div>
                            <p className="text-zinc-500 text-sm">
                                © 2025 RLabZ Pvt.Ltd. All rights reserved.
                            </p>
                        </div>

                        <div className="flex gap-4 mt-8 md:mt-0">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    className="w-12 h-12 flex items-center justify-center rounded-full border border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors hover:scale-110 transform duration-300"
                                    aria-label={social.label}
                                >
                                    <social.icon className="w-5 h-5" />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Footer;
