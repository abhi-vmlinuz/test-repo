import React from 'react';
import { Navbar } from './landing/Navbar';
import Footer from './Footer';
import { motion } from 'framer-motion';

interface GenericPageProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const GenericPage: React.FC<GenericPageProps> = ({ title, subtitle, children, size = 'md' }) => {
    const sizeClasses = {
        sm: 'max-w-3xl',
        md: 'max-w-4xl',
        lg: 'max-w-6xl',
        xl: 'max-w-7xl',
        full: 'max-w-full'
    };

    const contentWidth = sizeClasses[size];

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-green-500/30">
            <Navbar />

            <main className="pt-32 pb-20">
                {/* Header Section */}
                <div className="container mx-auto px-6 mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={contentWidth}
                    >
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-500">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-xl text-zinc-400 max-w-2xl leading-relaxed border-l-2 border-green-500/50 pl-6">
                                {subtitle}
                            </p>
                        )}
                    </motion.div>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent mb-16 opacity-50"></div>

                {/* Main Content */}
                <div className="container mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className={`prose prose-invert prose-lg ${contentWidth} ${size !== 'sm' && size !== 'md' ? 'max-w-none' : ''}`}
                    >
                        {children}
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default GenericPage;
