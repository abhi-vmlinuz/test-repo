import { motion } from 'framer-motion';

export const SectionHeader = ({ title, subtitle, className }) => {
    return (
        <div className={`relative z-10 mb-20 ${className}`}>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
            >
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-[2px] w-12 bg-gray-900"></div>
                    <span className="text-sm font-mono uppercase tracking-widest text-gray-500">{subtitle}</span>
                </div>
                <h2 className="text-[5vw] leading-[0.9] font-bold text-gray-900 tracking-tighter uppercase relative">
                    {title}
                    <span className="absolute -z-10 top-0 left-1 text-transparent stroke-text opacity-20"
                        style={{ WebkitTextStroke: '1px #000' }}>
                        {title}
                    </span>
                </h2>
            </motion.div>
        </div>
    );
};
