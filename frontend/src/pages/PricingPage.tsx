import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Check, ChevronLeft, ChevronRight, HelpCircle, CreditCard, Globe, Users, Zap, ArrowRight, Star } from 'lucide-react';
import Footer from '@/components/Footer';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { FloatingElement } from '@/components/landing/FloatingElement';
import { motion } from 'framer-motion';

const PricingPage = ({ user }) => {
    const testimonialRef = useRef(null);
    const navigate = useNavigate();
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [openFaq, setOpenFaq] = useState(null);
    const [isYearly, setIsYearly] = useState(false);

    // Rolling number animation state
    const [displayPrice, setDisplayPrice] = useState(9);
    const [isRolling, setIsRolling] = useState(false);

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Rolling price animation - slot machine style
    useEffect(() => {
        const targetPrice = isYearly ? 7 : 9;

        if (displayPrice === targetPrice) return;

        setIsRolling(true);

        const numbers = [];
        const start = displayPrice;
        const end = targetPrice;
        const step = start > end ? -1 : 1;

        for (let i = start; i !== end + step; i += step) {
            numbers.push(i);
        }

        let index = 0;
        const interval = setInterval(() => {
            if (index < numbers.length) {
                setDisplayPrice(numbers[index]);
                index++;
            } else {
                clearInterval(interval);
                setIsRolling(false);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isYearly]);

    // Pricing plans
    const plans = [
        {
            name: 'Starter',
            description: 'Essential tools for beginners starting their journey.',
            price: '0',
            period: 'forever',
            features: [
                '5 Beginner Challenges',
                'Basic hint system',
                'Community forum access',
                'Progress tracking',
                'Mobile friendly interface',
            ],
            cta: user ? 'Current Plan' : 'Get Started',
            popular: false,
        },
        {
            name: 'Pro Access',
            description: 'For serious security professionals who want to master the craft.',
            price: displayPrice.toString(),
            period: isYearly ? '/mo billed yearly' : '/month',
            yearlyTotal: isYearly ? `$${displayPrice * 12}/year` : null,
            features: [
                'Unlimited CTF Challenges',
                'Private Docker Instances',
                'Priority Hint System',
                'Exclusive Live Events',
                'Professional Certification',
                'Discord VIP Access',
                '24/7 Priority Support',
            ],
            cta: 'Upgrade to Pro',
            popular: true,
        },
    ];

    // Testimonials for pricing page
    const testimonials = [
        {
            title: 'Enterprise Grade',
            quote: 'We use RLabZ to benchmark our security team. The realistic scenarios are unmatched in the industry.',
            company: 'Global Defense Corp',
            role: 'CISO'
        },
        {
            title: 'Career Changing',
            quote: 'The Docker labs helped me understand container escape techniques that I used in my first pentest.',
            company: 'Independent Researcher',
            role: 'Bug Bounty Hunter'
        },
        {
            title: 'Worth the Investment',
            quote: 'Paid for itself with a single bug bounty find. The advanced challenges are incredibly well designed.',
            company: 'FinTech Secure',
            role: 'Lead Pen-Tester'
        },
        {
            title: 'Best Platform',
            quote: 'Cleaner and faster than the alternatives. The focus on quality over quantity really shows.',
            company: 'CyberOps Ltd',
            role: 'Security Analyst'
        },
    ];

    // FAQ data
    const faqs = [
        {
            icon: HelpCircle,
            question: 'Is there a student discount?',
            answer: 'Yes. Students with a valid .edu email get 25% off the Pro plan. Contact support to apply.',
        },
        {
            icon: CreditCard,
            question: 'What payment methods?',
            answer: 'We accept all major credit cards (Visa, Mastercard, Amex) and Stripe secure processing.',
        },
        {
            icon: Globe,
            question: 'Can I switch plans?',
            answer: 'Yes, you can upgrade or downgrade at any time. Prorated credits will be applied automatically.',
        },
        {
            icon: Zap,
            question: 'Are the labs persistent?',
            answer: 'Pro users get private, persistent Docker containers for up to 4 hours per session.',
        },
    ];

    // Scroll handlers
    const checkScroll = () => {
        if (testimonialRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = testimonialRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    const scrollTestimonials = (direction) => {
        if (testimonialRef.current) {
            const scrollAmount = 500;
            testimonialRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        const container = testimonialRef.current;
        if (container) {
            container.addEventListener('scroll', checkScroll);
            checkScroll();
            return () => container.removeEventListener('scroll', checkScroll);
        }
    }, []);

    // Handle CTA click
    const handleCtaClick = (plan) => {
        if (user) {
            navigate('/dashboard');
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen bg-white relative font-sans selection:bg-zinc-800 selection:text-white overflow-hidden">
            {/* Background Grid */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none z-0"></div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                            <Shield className="w-4 h-4 text-white" fill="white" />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-zinc-800">RLabZ</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8">
                        <Link to={user ? "/dashboard" : "/"} className="text-sm font-medium text-gray-500 hover:text-zinc-900 transition-colors">
                            {user ? 'Dashboard' : 'Home'}
                        </Link>
                        <Link to="/pricing" className="text-sm font-medium text-zinc-900">Pricing</Link>
                    </nav>

                    {user ? (
                        <Link to="/dashboard" className="px-5 py-2 bg-zinc-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors">
                            Dashboard
                        </Link>
                    ) : (
                        <Link to="/login" className="px-5 py-2 bg-zinc-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors">
                            Sign In
                        </Link>
                    )}
                </div>
            </header>

            {/* Hero Section with Floating Elements */}
            <section className="pt-40 pb-20 relative z-10">
                <div className="max-w-7xl mx-auto px-6 text-center relative">

                    {/* Decorative Floating Elements */}
                    <div className="absolute inset-0 pointer-events-none hidden lg:block">
                        <FloatingElement depth={1} initialX={-300} initialY={-50} className="absolute left-1/4 top-0">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xl transform -rotate-12">
                                <CreditCard className="w-8 h-8 text-gray-400" />
                            </div>
                        </FloatingElement>
                        <FloatingElement depth={2} initialX={300} initialY={50} className="absolute right-1/4 top-10">
                            <div className="bg-zinc-900 p-4 rounded-xl shadow-xl transform rotate-12">
                                <Zap className="w-8 h-8 text-white" />
                            </div>
                        </FloatingElement>
                    </div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider mb-6">
                            For Individuals & Teams
                        </span>
                        <h1 className="text-5xl lg:text-7xl font-extrabold text-zinc-800 tracking-tight mb-6">
                            Simple, transparent<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-500 to-black">pricing for everyone.</span>
                        </h1>
                        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10">
                            Start your security journey for free, or upgrade to access enterprise-grade simulation environments.
                        </p>

                        {/* Toggle */}
                        <div className="inline-flex bg-gray-100 p-1 rounded-full relative">
                            <div className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] bg-white rounded-full shadow-sm transition-transform duration-300 ${isYearly ? 'translate-x-[100%]' : 'translate-x-0'}`} />
                            <button
                                onClick={() => setIsYearly(false)}
                                className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-colors ${!isYearly ? 'text-zinc-900' : 'text-gray-500'}`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setIsYearly(true)}
                                className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${isYearly ? 'text-zinc-900' : 'text-gray-500'}`}
                            >
                                Yearly
                                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded ml-1">-20%</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="pb-32 relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {plans.map((plan, idx) => (
                            <div
                                key={plan.name}
                                className={`relative p-8 rounded-3xl border transition-all duration-300 flex flex-col ${plan.popular
                                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xl scale-105 z-10'
                                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-xl text-zinc-800'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                                        MOST POPULAR
                                    </div>
                                )}

                                <div className="mb-8">
                                    <h3 className={`text-xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-zinc-800'}`}>{plan.name}</h3>
                                    <p className={`text-sm ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>{plan.description}</p>
                                </div>

                                <div className="mb-8 flex items-baseline">
                                    <span className="text-5xl font-extrabold tracking-tight">$</span>
                                    <span className="text-6xl font-extrabold tracking-tight mx-1">
                                        <div className="inline-block relative h-[1.1em] overflow-hidden align-top">
                                            {plan.price}
                                        </div>
                                    </span>
                                    <span className={`text-sm ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>{plan.period}</span>
                                </div>

                                <div className="flex-1 space-y-4 mb-8">
                                    {plan.features.map((feature, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className={`mt-0.5 rounded-full p-0.5 ${plan.popular ? 'bg-white/20' : 'bg-zinc-900/5'}`}>
                                                <Check className={`w-3.5 h-3.5 ${plan.popular ? 'text-white' : 'text-zinc-900'}`} strokeWidth={3} />
                                            </div>
                                            <span className={`text-sm font-medium ${plan.popular ? 'text-gray-300' : 'text-gray-600'}`}>
                                                {feature}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => handleCtaClick(plan)}
                                    className={`w-full py-4 rounded-xl font-bold text-sm transition-all transform active:scale-95 ${plan.popular
                                        ? 'bg-white text-zinc-900 hover:bg-gray-100'
                                        : 'bg-zinc-800 text-white hover:bg-gray-800'
                                        }`}
                                >
                                    {plan.cta}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-24 bg-gray-50 border-y border-gray-200">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-3xl font-bold text-zinc-800">Industry Feedback</h2>
                            <p className="text-gray-500 mt-2">Trusted by security professionals worldwide.</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => scrollTestimonials('left')} disabled={!canScrollLeft} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 transition-colors">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button onClick={() => scrollTestimonials('right')} disabled={!canScrollRight} className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:bg-gray-800 disabled:opacity-50 transition-colors">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div
                        ref={testimonialRef}
                        className="flex gap-6 overflow-x-auto pb-8 scroll-smooth no-scrollbar"
                    >
                        {testimonials.map((t, i) => (
                            <div key={i} className="min-w-[400px] p-8 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex gap-1 mb-4">
                                        {[1, 2, 3, 4, 5].map(star => <Star key={star} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                                    </div>
                                    <h3 className="font-bold text-lg mb-2">{t.title}</h3>
                                    <p className="text-gray-600 leading-relaxed">"{t.quote}"</p>
                                </div>
                                <div className="mt-8 pt-6 border-t border-gray-50 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                        <span className="font-bold text-gray-500">{t.company[0]}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-zinc-800">{t.company}</p>
                                        <p className="text-xs text-gray-500">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQs */}
            <section className="py-24 max-w-4xl mx-auto px-6">
                <h2 className="text-3xl font-bold text-center mb-16">Frequently Asked Questions</h2>
                <div className="grid md:grid-cols-2 gap-8">
                    {faqs.map((faq, i) => (
                        <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                            <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                <faq.icon className="w-5 h-5 text-zinc-800" />
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-800 mb-2">{faq.question}</h3>
                                <p className={`text-sm text-gray-600 leading-relaxed ${openFaq === i ? '' : 'line-clamp-2'}`}>{faq.answer}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="pb-24 px-6">
                <div className="max-w-5xl mx-auto bg-zinc-900 rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gray-800 rounded-full filter blur-[100px] opacity-30 -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-900 rounded-full filter blur-[100px] opacity-30 translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10">
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Start your training today.</h2>
                        <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10">Join the elite community of security professionals using RLabZ to sharpen their skills.</p>
                        <RainbowButton onClick={() => navigate(user ? '/dashboard' : '/login')} className="px-10 py-4 h-auto text-base">
                            {user ? 'Go to Dashboard' : 'Get Started for Free'}
                        </RainbowButton>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default PricingPage;
