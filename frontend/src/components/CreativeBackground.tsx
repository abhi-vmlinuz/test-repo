import { motion } from 'framer-motion';
import { Shield, Lock, Binary, Cpu, Wifi, Database, Globe, Key } from 'lucide-react';

const FloatingIcon = ({ icon: Icon, className, delay = 0, duration = 6 }) => (
    <motion.div
        className={`absolute ${className}`}
        initial={{ opacity: 0 }}
        animate={{
            opacity: 1,
            y: [0, -20, 0],
            rotate: [0, 5, -5, 0],
        }}
        transition={{
            opacity: { duration: 1 },
            y: { duration: duration, repeat: Infinity, ease: "easeInOut", delay: delay },
            rotate: { duration: duration * 1.5, repeat: Infinity, ease: "easeInOut", delay: delay },
        }}
    >
        <Icon className="w-full h-full" strokeWidth={1} />
    </motion.div>
);

const CreativeBackground = () => {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
            {/* Large Watermark Icons - Subtle & Architectural */}
            <FloatingIcon
                icon={Shield}
                className="top-[-10%] right-[-10%] w-[600px] h-[600px] text-zinc-900/[0.03]"
                delay={0}
                duration={10}
            />
            <FloatingIcon
                icon={Lock}
                className="bottom-[-10%] left-[-5%] w-[500px] h-[500px] text-zinc-900/[0.03]"
                delay={2}
                duration={12}
            />

            {/* Scattered Tech Elements - Medium size */}
            <FloatingIcon
                icon={Binary}
                className="top-[15%] left-[25%] w-24 h-24 text-zinc-900/[0.04]"
                delay={1}
                duration={8}
            />
            <FloatingIcon
                icon={Cpu}
                className="bottom-[20%] right-[20%] w-32 h-32 text-zinc-900/[0.04]"
                delay={3}
                duration={9}
            />
            <FloatingIcon
                icon={Database}
                className="top-[40%] right-[10%] w-20 h-20 text-zinc-900/[0.04]"
                delay={1.5}
                duration={7}
            />

            {/* Tiny Accents - Higher Opacity for detail */}
            <FloatingIcon
                icon={Wifi}
                className="top-[10%] left-[5%] w-8 h-8 text-zinc-900/10"
                delay={0.5}
                duration={5}
            />
            <FloatingIcon
                icon={Globe}
                className="bottom-[10%] right-[40%] w-12 h-12 text-zinc-900/10"
                delay={2.5}
                duration={6}
            />
            <FloatingIcon
                icon={Key}
                className="top-[60%] left-[8%] w-10 h-10 text-zinc-900/10"
                delay={4}
                duration={7}
            />
        </div>
    );
};

export default CreativeBackground;
