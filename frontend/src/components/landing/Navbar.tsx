import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

export const Navbar = () => {
    const { scrollY } = useScroll();
    const [isHidden, setIsHidden] = useState(false);
    const [prevScroll, setPrevScroll] = useState(0);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // Dynamic styles based on scroll
    const isLandingPage = location.pathname === '/';

    const width = useTransform(scrollY, [0, 100], ['100%', '90%']);
    const top = useTransform(scrollY, [0, 100], ['0px', '24px']);
    const borderRadius = useTransform(scrollY, [0, 100], ['0px', '9999px']);
    const backgroundOpacity = useTransform(scrollY, [0, 100], [0, 0.8]);
    const backdropBlur = useTransform(scrollY, [0, 100], ['0px', '12px']);

    // Colors based on page type
    const textColor = isLandingPage ? 'text-gray-500 hover:text-zinc-900' : 'text-zinc-400 hover:text-white';
    const logoColor = isLandingPage ? 'text-gray-900' : 'text-white';
    const loginBtnColor = isLandingPage ? 'text-gray-900 hover:text-blue-600' : 'text-white hover:text-green-400';
    const mobileMenuBtnColor = isLandingPage ? 'text-zinc-900' : 'text-white';

    useEffect(() => {
        return scrollY.onChange((latest) => {
            const currentScroll = latest;
            if (currentScroll > prevScroll && currentScroll > 150) {
                setIsHidden(true);
            } else {
                setIsHidden(false);
            }
            setPrevScroll(currentScroll);
        });
    }, [scrollY, prevScroll]);

    const scrollToSection = (id: string) => {
        setIsMobileOpen(false);
        if (location.pathname !== '/') {
            navigate('/');
            // Add a small delay to allow navigation to complete
            setTimeout(() => {
                const element = document.getElementById(id);
                if (element) element.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } else {
            const element = document.getElementById(id);
            if (element) element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const navItems = [
        { name: 'Features', action: () => scrollToSection('features') },
        { name: 'Modules', action: () => scrollToSection('modules') },
        { name: 'Pricing', link: '/pricing' },
        { name: 'Docs', link: '/documentation' },
    ];

    return (
        <>
            <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
                <motion.header
                    style={{
                        width,
                        top,
                        borderRadius,
                        backgroundColor: useTransform(backgroundOpacity, o =>
                            isLandingPage ? `rgba(255, 255, 255, ${o})` : `rgba(24, 24, 27, ${o})`
                        ),
                        backdropFilter: useTransform(backdropBlur, b => `blur(${b})`),
                    }}
                    animate={{
                        y: isHidden ? -100 : 0,
                    }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className={`relative px-6 py-4 flex items-center justify-between pointer-events-auto border border-transparent ${isLandingPage ? 'data-[scrolled=true]:border-gray-200' : 'data-[scrolled=true]:border-zinc-800'} shadow-sm transition-all max-w-[90rem] mx-auto min-h-[80px]`}
                >
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group z-50" onClick={() => window.scrollTo(0, 0)}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110">
                            <img src="/logo.png" alt="ZecurX Labs Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className={`text-xl font-bold tracking-tighter ${logoColor}`}>
                            ZecurX<span className="text-gray-400">.Labs</span>
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navItems.map((item) => (
                            item.link ? (
                                <Link
                                    key={item.name}
                                    to={item.link}
                                    className={`text-sm font-medium transition-colors cursor-pointer ${textColor}`}
                                >
                                    {item.name}
                                </Link>
                            ) : (
                                <button
                                    key={item.name}
                                    onClick={item.action}
                                    className={`text-sm font-medium transition-colors cursor-pointer ${textColor}`}
                                >
                                    {item.name}
                                </button>
                            )
                        ))}
                    </nav>

                    {/* Auth Actions */}
                    <div className="hidden md:flex items-center gap-4">
                        <Link
                            to="/login"
                            className={`text-sm font-semibold transition-colors ${loginBtnColor}`}
                        >
                            Log in
                        </Link>
                        <Link to="/login">
                            <button className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg ${isLandingPage ? 'bg-zinc-900 text-white hover:bg-gray-800 shadow-gray-200' : 'bg-white text-black hover:bg-zinc-200 shadow-zinc-900/20'}`}>
                                Get Access
                            </button>
                        </Link>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className={`md:hidden z-50 p-2 rounded-full hover:bg-white/10 transition-colors`}
                        onClick={() => setIsMobileOpen(!isMobileOpen)}
                    >
                        {isMobileOpen ? (
                            <X className={`w-6 h-6 ${mobileMenuBtnColor}`} />
                        ) : (
                            <Menu className={`w-6 h-6 ${mobileMenuBtnColor}`} />
                        )}
                    </button>
                </motion.header>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 z-40 bg-white pt-28 px-6 pb-6 md:hidden flex flex-col gap-6"
                    >
                        <nav className="flex flex-col gap-4">
                            {navItems.map((item) => (
                                item.link ? (
                                    <Link
                                        key={item.name}
                                        to={item.link}
                                        onClick={() => setIsMobileOpen(false)}
                                        className="text-2xl font-bold text-zinc-900 py-2 border-b border-gray-100"
                                    >
                                        {item.name}
                                    </Link>
                                ) : (
                                    <button
                                        key={item.name}
                                        onClick={item.action}
                                        className="text-left text-2xl font-bold text-zinc-900 py-2 border-b border-gray-100"
                                    >
                                        {item.name}
                                    </button>
                                )
                            ))}
                        </nav>

                        <div className="mt-auto flex flex-col gap-4">
                            <Link to="/login" onClick={() => setIsMobileOpen(false)}>
                                <button className="w-full py-4 rounded-xl text-lg font-bold text-zinc-900 border border-gray-200 hover:bg-gray-50">
                                    Log in
                                </button>
                            </Link>
                            <Link to="/login" onClick={() => setIsMobileOpen(false)}>
                                <button className="w-full py-4 rounded-xl text-lg font-bold text-white bg-zinc-900 hover:bg-gray-800 shadow-lg">
                                    Get Access Now
                                </button>
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
