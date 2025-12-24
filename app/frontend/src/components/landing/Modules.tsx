import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Shield, Terminal, Globe, Lock } from 'lucide-react';
import { TiltCard } from './TiltCard';
import { SectionHeader } from './SectionHeader';

const features = [
    {
        icon: Globe,
        color: "bg-blue-600",
        title: "Web Exploitation",
        desc: "SQL Injection, XSS, SSRF, and advanced race conditions. Test on real banking/commerce apps."
    },
    {
        icon: Terminal,
        color: "bg-gray-900",
        title: "Binary Exploitation",
        desc: "Buffer overflows, ROP chains, and heap exploitation. Analyze binaries in isolated sandboxes."
    },
    {
        icon: Shield,
        color: "bg-green-600",
        title: "Network Defense",
        desc: "Packet analysis, firewall evasion, and IDS testing using Wireshark and custom tools."
    },
    {
        icon: Lock,
        color: "bg-red-600",
        title: "Cryptography",
        desc: "Break modern ciphers, analyze entropy, and exploit implementation flaws in crypto-systems."
    }
];

export const Modules = () => {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: containerRef });
    const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

    return (
        <section id="modules" ref={containerRef} className="py-32 bg-white relative overflow-hidden">
            {/* Technical Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,#eef2ff,transparent)]"></div>

            <div className="max-w-[80rem] mx-auto px-6">
                <div className="mb-24 md:text-center max-w-3xl mx-auto">
                    <SectionHeader
                        subtitle="Detailed Curriculum"
                        title="Training Modules"
                        className="mb-0"
                    />
                    <p className="text-xl text-gray-500 mt-6 leading-relaxed">
                        Don't just learn usage. Learn exploits. Our labs are built on actual CVEs and real-world infrastructure vulnerabilities.
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ staggerChildren: 0.3, duration: 1 }}
                    viewport={{ once: true, margin: "-100px" }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start"
                >
                    {/* Column 1 - Starts higher */}
                    <div className="flex flex-col gap-8 lg:gap-12">
                        {features.filter((_, i) => i % 2 === 0).map((feature, i) => (
                            <TiltCard key={i} className="relative group perspective-1000">
                                <div className="absolute inset-0 bg-gradient-to-tr from-gray-50 to-white rounded-3xl border border-gray-100 shadow-2xl shadow-gray-200/50 transition-all duration-300 group-hover:shadow-blue-200/50"></div>

                                <div className="relative p-10 h-full flex flex-col items-start transform-style-3d">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 ${feature.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                        <feature.icon size={24} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">{feature.title}</h3>
                                    <p className="text-gray-500 leading-relaxed font-medium">
                                        {feature.desc}
                                    </p>
                                </div>
                            </TiltCard>
                        ))}
                    </div>

                    {/* Column 2 - Staggered/Lower */}
                    <motion.div style={{ y }} className="flex flex-col gap-8 lg:gap-12 mt-0 md:mt-24">
                        {features.filter((_, i) => i % 2 !== 0).map((feature, i) => (
                            <TiltCard key={i} className="relative group perspective-1000">
                                <div className="absolute inset-0 bg-gradient-to-tr from-gray-50 to-white rounded-3xl border border-gray-100 shadow-2xl shadow-gray-200/50 transition-all duration-300 group-hover:shadow-blue-200/50"></div>

                                <div className="relative p-10 h-full flex flex-col items-start transform-style-3d">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 ${feature.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                        <feature.icon size={24} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">{feature.title}</h3>
                                    <p className="text-gray-500 leading-relaxed font-medium">
                                        {feature.desc}
                                    </p>
                                </div>
                            </TiltCard>
                        ))}
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
};
