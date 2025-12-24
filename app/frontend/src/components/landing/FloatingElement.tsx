import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';
import React from 'react';

interface FloatingElementProps {
    children: React.ReactNode;
    depth?: number;
    className?: string;
    floatDuration?: number;
    floatY?: number;
    initialX?: number;
    initialY?: number;
    hideOnScroll?: boolean;
}

export const FloatingElement = ({
    children,
    depth = 1,
    className,
    floatDuration = 6,
    floatY = 20,
    initialX = 0,
    initialY = 0,
    hideOnScroll = true,
}: FloatingElementProps) => {
    const ref = useRef(null);
    const { scrollY } = useScroll(); // Global scroll for Hero (hideOnScroll=true)
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"] // Output 0 when top of element hits bottom of screen, 1 when bottom of element hits top
    });

    // --- LOGIC 1: HERO MODE (hideOnScroll = true) ---
    // Old logic: absolute fade out based on top of page
    const yHero = useTransform(scrollY, [0, 600], [0, -300 * depth]);
    const opacityHero = useTransform(scrollY, [0, 500], [1, 0]);
    const scaleHero = useTransform(scrollY, [0, 500], [1, 0.8]);

    // --- LOGIC 2: PARALLAX MODE (hideOnScroll = false) ---
    // New logic: relative movement based on viewport position
    // When entering from bottom (0), push down by 200 * depth
    // When leaving at top (1), push up by 200 * depth
    // Result: Element moves faster/slower than scroll
    const parallaxY = useTransform(scrollYProgress, [0, 1], [300 * depth, -300 * depth]);
    const springParallaxY = useSpring(parallaxY, { stiffness: 100, damping: 30, restDelta: 0.001 }); // Smooth out scroll jitter

    // Continuous "Idle" Floating Animation
    const floatTransition = {
        y: {
            duration: floatDuration,
            repeat: Infinity,
            repeatType: "reverse" as const,
            ease: "easeInOut" as const,
        },
        rotate: {
            duration: floatDuration * 1.5,
            repeat: Infinity,
            repeatType: "reverse" as const,
            ease: "easeInOut" as const,
        }
    };

    if (hideOnScroll) {
        return (
            <div ref={ref} className={cn("relative will-change-transform z-10", className)}>
                <motion.div style={{ y: yHero, opacity: opacityHero, scale: scaleHero }}>
                    {/* Initial Entry for Hero */}
                    <motion.div
                        initial={{ x: initialX * 1.5, y: initialY * 1.5, opacity: 0, scale: 0.8 }}
                        animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: Math.random() * 0.3 }}
                    >
                        <motion.div
                            animate={{ y: [0, floatY, 0], rotate: [0, (Math.random() - 0.5) * 4, 0] }}
                            transition={floatTransition}
                        >
                            {children}
                        </motion.div>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    // PARALLAX MODE RENDER
    return (
        <div ref={ref} className={cn("relative will-change-transform z-10", className)}>
            <motion.div style={{ y: springParallaxY }}>
                {/* Fade in when entering viewport */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ margin: "-50px" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <motion.div
                        animate={{ y: [0, floatY, 0], rotate: [0, (Math.random() - 0.5) * 4, 0] }}
                        transition={floatTransition}
                    >
                        {children}
                    </motion.div>
                </motion.div>
            </motion.div>
        </div>
    );
};
