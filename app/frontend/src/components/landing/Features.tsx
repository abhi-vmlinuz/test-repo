import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Zap, Clock, Trophy, Users, Shield, Terminal } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

const features = [
    {
        icon: Zap,
        title: "Instant Feedback",
        desc: "Get real-time validation on your flags. No manual grading, no waiting."
    },
    {
        icon: Terminal,
        title: "Browser-based Terminal",
        desc: "Launch a full Kali Linux environment directly in your browser. Zero setup required."
    },
    {
        icon: Shield,
        title: "Private Environments",
        desc: "Each user gets isolated Docker containers. No interference from other players."
    },
    {
        icon: Trophy,
        title: "Live Leaderboards",
        desc: "Compete in real-time with global rankings and team-based scoring."
    },
    {
        icon: Clock,
        title: "24/7 Availability",
        desc: "Practice whenever you want. Our infrastructure scales automatically to meet demand."
    },
    {
        icon: Users,
        title: "Community Driven",
        desc: "Join thousands of security professionals sharing writeups and techniques."
    }
];

export const Features = () => {
    const containerRef = useRef(null);

    return (
        <section id="features" ref={containerRef} className="py-32 bg-zinc-50 relative overflow-hidden">
            {/* Dot Pattern Background */}
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

            <div className="max-w-[80rem] mx-auto px-6 relative z-10">
                <div className="mb-20 md:text-center max-w-3xl mx-auto">
                    <SectionHeader
                        subtitle="Why Choose ZecurX"
                        title="Everything You Need to Win"
                        className="mb-0"
                    />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ staggerChildren: 0.2, duration: 0.8 }}
                    viewport={{ once: true, margin: "-100px" }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(250px,auto)]"
                >
                    {features.map((feature, i) => (
                        <motion.div
                            key={i}
                            variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: { opacity: 1, y: 0 }
                            }}
                            className={`group relative bg-white/50 backdrop-blur-sm p-8 rounded-[2rem] border border-gray-200/60 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-1 overflow-hidden
                            ${i === 0 || i === 3 || i === 4 ? 'md:col-span-2' : 'md:col-span-1'}`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div>
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-zinc-900 border border-gray-100 shadow-sm mb-6 group-hover:scale-110 group-hover:border-blue-100 group-hover:text-blue-600 transition-all duration-300">
                                        <feature.icon size={26} strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">{feature.title}</h3>
                                    <p className="text-gray-500 leading-relaxed font-medium">
                                        {feature.desc}
                                    </p>
                                </div>

                                {(i === 0 || i === 3 || i === 4) && (
                                    <div className="mt-8 hidden md:block">
                                        <div className="h-1 w-12 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 w-0 group-hover:w-full transition-all duration-700 ease-out"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};
