import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Check, ChevronLeft, ChevronRight, HelpCircle, CreditCard, Globe, Users, Zap, ArrowRight } from 'lucide-react';
import FloatingParticles from '@/components/FloatingParticles';
import Footer from '@/components/Footer';
import { RainbowButton } from '@/components/ui/rainbow-button';

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
            name: 'Free',
            description: 'Perfect for beginners starting their hacking journey',
            price: '0',
            period: 'forever',
            features: [
                '5 Beginner Challenges',
                'Basic hint system',
                'Community forum access',
                'Progress tracking',
                'Mobile friendly',
            ],
            cta: user ? 'Current Plan' : 'Get Started',
            popular: false,
        },
        {
            name: 'Premium',
            description: 'Unlock all features and accelerate your learning',
            price: displayPrice.toString(),
            period: isYearly ? '/month (billed yearly)' : '/month',
            yearlyTotal: isYearly ? `$${displayPrice * 12}/year` : null,
            features: [
                'All challenges unlocked',
                'Unlimited Docker labs',
                'Priority hint system',
                'Exclusive CTF events',
                'Certificate of completion',
                'Discord premium access',
                '24/7 Support',
            ],
            cta: 'Go Premium',
            popular: true,
        },
    ];

    // Testimonials for pricing page
    const testimonials = [
        {
            title: 'Something for everyone',
            quote: 'The diverse range of content...there is something for everyone! Whether you\'re just getting started or an experienced professional looking to improve your skills, ZecurX LABS has it all.',
            company: 'Security Consulting Firm',
        },
        {
            title: 'Real-world scenarios',
            quote: 'Our team really enjoys the platform - especially the numerous hands-on simulations. We have benefited from the real-world scenarios and practical applications.',
            company: 'Enterprise Tech Company',
        },
        {
            title: 'Worth every penny',
            quote: 'The premium subscription paid for itself within a week. The advanced challenges and Docker labs are incredibly realistic and helped me land my dream job.',
            company: 'Independent Researcher',
        },
        {
            title: 'Team training made easy',
            quote: 'We use ZecurX LABS for onboarding our security team. The structured learning paths and progress tracking make it easy to measure improvement.',
            company: 'Cybersecurity Startup',
        },
    ];

    // FAQ data
    const faqs = [
        {
            icon: HelpCircle,
            question: 'Do you offer any discounts?',
            answer: 'Yes! We offer a 25% discount for students with a valid .edu email. We also run seasonal promotions - follow us on Twitter to stay updated.',
        },
        {
            icon: CreditCard,
            question: 'What payment methods do you accept?',
            answer: 'We accept all major credit cards (Visa, Mastercard, Amex), PayPal, and bank transfers for annual subscriptions.',
        },
        {
            icon: Globe,
            question: 'Can you charge me in my local currency?',
            answer: 'We currently support USD, EUR, GBP, and INR. Your bank may apply conversion fees for other currencies.',
        },
        {
            icon: Users,
            question: 'How do I manage my subscription?',
            answer: 'You can manage your subscription from your profile settings. Cancel anytime with no questions asked.',
        },
        {
            icon: Zap,
            question: 'Can I cancel at any time?',
            answer: 'Absolutely! You can cancel your subscription at any time. You\'ll retain access until the end of your billing period.',
        },
        {
            icon: HelpCircle,
            question: 'What if I have more questions?',
            answer: 'You can always reach us at support@zecurx.com or through our Discord community. We typically respond within 24 hours.',
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
            // User is logged in - go to checkout or dashboard
            if (plan.popular) {
                // Premium - would go to checkout
                navigate('/dashboard');
            } else {
                // Free - already on free plan
                navigate('/dashboard');
            }
        } else {
            // Not logged in - go to login
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen bg-white relative">
            {/* Floating Particles */}
            <FloatingParticles particleCount={100} />

            {/* Header - Changes based on user state */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="w-full px-8 lg:px-16 py-4 flex items-center justify-between">
                    <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-3">
                        <img src="/logo.png" alt="ZecurX" className="w-7 h-7" />
                        <span className="text-xl font-semibold text-gray-900 tracking-tight">ZecurX LABS</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8">
                        <Link to={user ? "/dashboard" : "/"} className="text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium">
                            {user ? 'Dashboard' : 'Home'}
                        </Link>
                        <Link to="/pricing" className="text-gray-900 text-sm font-medium">Pricing</Link>
                    </nav>

                    {user ? (
                        <Link
                            to="/dashboard"
                            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-full text-sm font-medium transition-all"
                        >
                            Go to Dashboard
                        </Link>
                    ) : (
                        <Link
                            to="/login"
                            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-full text-sm font-medium transition-all"
                        >
                            Sign in
                        </Link>
                    )}
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-32 pb-12 relative z-10">
                <div className="w-full px-8 lg:px-16 text-center">
                    <span className="inline-block text-gray-500 font-medium text-sm mb-4">Pricing</span>
                    <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                        Pricing that grows with you
                    </h1>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
                        Choose a plan that fits your learning journey. Start free, upgrade when you're ready.
                    </p>

                    {/* Monthly/Yearly Toggle */}
                    <div className="inline-flex items-center justify-center gap-4 bg-gray-100 rounded-full p-1.5">
                        <span
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${!isYearly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                                }`}
                            onClick={() => setIsYearly(false)}
                        >
                            Monthly
                        </span>
                        <button
                            onClick={() => setIsYearly(!isYearly)}
                            className="relative w-12 h-7 bg-gray-300 rounded-full p-0.5 transition-colors duration-300 ease-in-out"
                        >
                            <div
                                className={`w-6 h-6 bg-gray-900 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${isYearly ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                        <span
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer flex items-center gap-2 ${isYearly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                                }`}
                            onClick={() => setIsYearly(true)}
                        >
                            Yearly
                            <span className="px-2 py-0.5 bg-gray-900 text-white text-xs rounded-full">
                                Save 22%
                            </span>
                        </span>
                    </div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="pb-24 relative z-10">
                <div className="w-full px-8 lg:px-16">
                    <div className="flex flex-col lg:flex-row justify-center gap-8 max-w-4xl mx-auto">
                        {plans.map((plan) => (
                            <div
                                key={plan.name}
                                className={`flex-1 p-8 rounded-3xl border transition-all card-hover-delay ${plan.popular
                                    ? 'bg-gray-900 text-white border-gray-900 shadow-2xl shadow-gray-900/20 scale-105'
                                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg'
                                    }`}
                            >
                                {/* Header */}
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className={`text-xl font-semibold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                                            {plan.name}
                                        </h3>
                                        {plan.popular && (
                                            <span className="px-3 py-1 bg-white text-gray-900 text-xs font-medium rounded-full">
                                                Most Popular
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-sm ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {plan.description}
                                    </p>
                                </div>

                                {/* Price with rolling animation */}
                                <div className="mb-8">
                                    <div className="flex items-baseline">
                                        <span className={`text-5xl font-bold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                                            $
                                        </span>
                                        <div className="relative overflow-hidden h-14">
                                            <span
                                                className={`text-5xl font-bold inline-block transition-transform duration-100 ${plan.popular ? 'text-white' : 'text-gray-900'
                                                    } ${isRolling && plan.popular ? 'animate-pulse' : ''}`}
                                                style={{
                                                    transform: isRolling && plan.popular ? 'translateY(-2px)' : 'translateY(0)',
                                                }}
                                            >
                                                {plan.price}
                                            </span>
                                        </div>
                                        <span className={`text-sm ml-1 ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {plan.period}
                                        </span>
                                    </div>
                                    {plan.yearlyTotal && (
                                        <p className="text-sm text-gray-400 mt-1">{plan.yearlyTotal}</p>
                                    )}
                                </div>

                                {/* Features */}
                                <ul className="space-y-4 mb-8">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <Check className={`w-5 h-5 mt-0.5 ${plan.popular ? 'text-gray-400' : 'text-gray-400'}`} />
                                            <span className={`text-sm ${plan.popular ? 'text-gray-300' : 'text-gray-600'}`}>
                                                {feature}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA - Changes based on user state */}
                                {plan.popular ? (
                                    <RainbowButton className="w-full" onClick={() => handleCtaClick(plan)}>
                                        {plan.cta}
                                    </RainbowButton>
                                ) : (
                                    <button
                                        onClick={() => handleCtaClick(plan)}
                                        className="block w-full py-4 text-center rounded-xl font-medium transition-all bg-gray-900 text-white hover:bg-gray-800"
                                    >
                                        {plan.cta}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-24 bg-gray-50 relative z-10">
                <div className="w-full">
                    <div className="px-8 lg:px-16 text-center mb-12">
                        <span className="inline-block w-12 h-1 bg-gray-900 rounded-full mb-6" />
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">Trusted by experts</h2>
                        <p className="text-lg text-gray-500">See what professionals are saying about ZecurX LABS</p>
                    </div>

                    <div className="px-8 lg:px-16 flex justify-end gap-3 mb-8">
                        <button
                            onClick={() => scrollTestimonials('left')}
                            disabled={!canScrollLeft}
                            className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${canScrollLeft
                                ? 'border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400'
                                : 'border-gray-200 text-gray-300 cursor-not-allowed'
                                }`}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => scrollTestimonials('right')}
                            disabled={!canScrollRight}
                            className={`w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center transition-all ${canScrollRight ? 'hover:bg-gray-800' : 'opacity-50 cursor-not-allowed'
                                }`}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div
                        ref={testimonialRef}
                        className="flex gap-6 overflow-x-auto pb-4 px-8 lg:px-16 scroll-smooth"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {testimonials.map((testimonial, index) => (
                            <div
                                key={index}
                                className="flex-shrink-0 w-[450px] p-8 bg-white rounded-3xl border border-gray-100 card-hover-delay hover:shadow-lg hover:border-gray-200"
                            >
                                <div className="text-4xl text-gray-200 font-serif mb-4">"</div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">{testimonial.title}</h3>
                                <p className="text-gray-500 leading-relaxed mb-6">{testimonial.quote}</p>
                                <div className="flex items-center gap-3 pt-6 border-t border-gray-100">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                        <Users className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <span className="text-sm text-gray-400">{testimonial.company}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center gap-2 mt-8">
                        {testimonials.map((_, index) => (
                            <div
                                key={index}
                                className={`h-1 rounded-full transition-all ${index === 0 ? 'w-8 bg-gray-900' : 'w-8 bg-gray-200'}`}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-24 relative z-10">
                <div className="w-full px-8 lg:px-16">
                    <div className="text-center mb-16">
                        <span className="inline-block w-12 h-1 bg-gray-900 rounded-full mb-6" />
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">FAQs</h2>
                        <p className="text-lg text-gray-500">Everything you need to know about pricing</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {faqs.map((faq, index) => (
                            <div key={index} className="group">
                                <button
                                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                    className="w-full text-left"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
                                            <faq.icon className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors">
                                                {faq.question}
                                            </h3>
                                            <p className={`text-gray-500 text-sm leading-relaxed transition-all ${openFaq === index ? 'block' : 'line-clamp-2'}`}>
                                                {faq.answer}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section - Changes based on user state */}
            <section className="py-24 relative z-10 px-8 lg:px-16">
                <div className="bg-gray-900 rounded-3xl p-12 lg:p-16 text-center">
                    <h2 className="text-4xl font-bold text-white mb-4">
                        {user ? 'Upgrade to Premium' : 'Ready to start your journey?'}
                    </h2>
                    <p className="text-lg text-gray-400 max-w-xl mx-auto mb-8">
                        {user
                            ? 'Unlock all challenges and features with our premium plan.'
                            : 'Join thousands of security enthusiasts. Start with our free plan and upgrade anytime.'
                        }
                    </p>
                    <RainbowButton className="gap-2" onClick={() => navigate(user ? '/dashboard' : '/login')}>
                        {user ? 'Upgrade Now' : 'Get Started Free'}
                        <ArrowRight className="w-5 h-5" />
                    </RainbowButton>
                </div>
            </section>

            {/* Footer - Only show for non-logged in users */}
            {!user && <Footer />}
        </div>
    );
};

export default PricingPage;
