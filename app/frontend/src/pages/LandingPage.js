import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Target, Trophy, Users, ArrowRight, Terminal, Lock, Code, ChevronLeft, ChevronRight } from 'lucide-react';
import FloatingParticles from '@/components/FloatingParticles';
import Footer from '@/components/Footer';
import { RainbowButton } from '@/components/ui/rainbow-button';

const LandingPage = () => {
  const testimonialRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Testimonials data
  const testimonials = [
    {
      quote: "ZecurX LABS completely changed how I approach CTF challenges. The Docker labs are incredibly realistic and helped me land my first security role.",
      name: "Alex Chen",
      role: "Security Engineer, TechCorp",
      tag: "Career Change"
    },
    {
      quote: "The best CTF platform I've used. The hint system is perfectly balanced - challenging enough to learn, but not frustrating.",
      name: "Sarah Williams",
      role: "Penetration Tester",
      tag: "Pro Hacker"
    },
    {
      quote: "I went from zero cybersecurity knowledge to solving intermediate challenges in just 3 months. The learning curve is perfect.",
      name: "Marcus Johnson",
      role: "CS Student, MIT",
      tag: "Beginner to Pro"
    },
    {
      quote: "Finally a CTF platform that actually teaches you real-world skills. The cryptography challenges are top-notch.",
      name: "Emily Zhang",
      role: "Cryptography Researcher",
      tag: "Expert Level"
    },
    {
      quote: "Our entire security team uses ZecurX LABS for training. The Docker integration makes it easy to practice safely.",
      name: "David Kumar",
      role: "CISO, StartupXYZ",
      tag: "Team Training"
    },
    {
      quote: "The community here is amazing. Got help on a challenge I was stuck on for days within minutes of asking.",
      name: "Jessica Park",
      role: "Bug Bounty Hunter",
      tag: "Community"
    },
  ];

  // Check scroll position for testimonials
  const checkScroll = () => {
    if (testimonialRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = testimonialRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scrollTestimonials = (direction) => {
    if (testimonialRef.current) {
      const scrollAmount = 400;
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

  // Features data
  const features = [
    {
      icon: Target,
      title: 'Real Challenges',
      description: '8 intermediate-level challenges across Web, Crypto, Forensics, and Binary exploitation.'
    },
    {
      icon: Terminal,
      title: 'Docker Labs',
      description: 'Isolated containerized environments for safe, hands-on practice without any setup.'
    },
    {
      icon: Trophy,
      title: 'Live Leaderboard',
      description: 'Compete globally, track your ranking, and earn recognition for your skills.'
    },
    {
      icon: Lock,
      title: 'Hint System',
      description: 'Get progressive hints when stuck - balanced to help you learn without giving away answers.'
    },
  ];

  // Stats data
  const stats = [
    { value: '8+', label: 'Challenges' },
    { value: '4', label: 'Categories' },
    { value: 'Live', label: 'Docker Labs' },
    { value: '24/7', label: 'Access' },
  ];

  return (
    <div className="min-h-screen bg-white relative">
      {/* Floating Particles */}
      <FloatingParticles particleCount={150} />

      {/* Header - Full Width */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="w-full px-8 lg:px-16 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="ZecurX" className="w-7 h-7" />
            <span className="text-xl font-semibold text-gray-900 tracking-tight">ZecurX LABS</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium">Features</a>
            <a href="#testimonials" className="text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium">Reviews</a>
            <Link to="/pricing" className="text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium">Pricing</Link>
          </nav>

          {/* Only Sign in button - removed duplicate Get Started */}
          <Link
            to="/login"
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-full text-sm font-medium transition-all"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero Section - Full Viewport */}
      <section className="min-h-screen flex items-center justify-center relative pt-20">
        <div className="w-full px-8 lg:px-16 py-20 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-gray-600 text-sm font-medium mb-8">
              <Code className="w-4 h-4" />
              A CTF Platform by ZecurX Pvt.Ltd
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.1] tracking-tight mb-6">
              Master The Art Of
              <span className="block text-gray-400">Ethical Hacking</span>
            </h1>

            <p className="text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto mb-10">
              Challenge yourself with real-world CTF competitions. Test your skills in web exploitation,
              cryptography, forensics, and binary exploitation.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              {/* Rainbow Button for Start Hacking */}
              <Link to="/login">
                <RainbowButton className="gap-2">
                  Start Hacking
                  <ArrowRight className="w-5 h-5" />
                </RainbowButton>
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-8 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-base font-medium border border-gray-200 transition-all"
              >
                Explore Features
              </a>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl lg:text-4xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Full Width */}
      <section id="features" className="w-full py-24 bg-gray-50 relative z-10">
        <div className="w-full px-8 lg:px-16">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Why ZecurX LABS?</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Everything you need to practice and master cybersecurity skills
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-8 bg-white rounded-3xl border border-gray-100 card-hover-delay hover:shadow-xl hover:border-gray-200 group"
              >
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-gray-900 transition-colors">
                  <feature.icon className="w-7 h-7 text-gray-600 group-hover:text-white transition-colors" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section - Full Width with Horizontal Scroll */}
      <section id="testimonials" className="w-full py-24 relative z-10">
        <div className="w-full">
          {/* Header */}
          <div className="px-8 lg:px-16 mb-12">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                  Real people, real progress
                </h2>
                <p className="text-lg text-gray-500 max-w-2xl">
                  Join thousands of security enthusiasts who transformed their careers with ZecurX LABS.
                </p>
              </div>

              {/* Scroll Controls */}
              <div className="flex gap-3">
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
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${canScrollRight
                    ? 'border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400'
                    : 'border-gray-200 text-gray-300 cursor-not-allowed'
                    }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Horizontal Scrolling Testimonials */}
          <div
            ref={testimonialRef}
            className="flex gap-6 overflow-x-auto pb-4 px-8 lg:px-16 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-[350px] lg:w-[400px] p-8 bg-white rounded-3xl border border-gray-100 card-hover-delay hover:shadow-lg hover:border-gray-200"
              >
                {/* Tag */}
                <div className="inline-block px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium mb-6">
                  {testimonial.tag}
                </div>

                {/* Quote */}
                <p className="text-gray-600 leading-relaxed mb-6 text-base">
                  "{testimonial.quote}"
                </p>

                {/* Author - No Avatar, just name and role */}
                <div className="pt-6 border-t border-gray-100">
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-400">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Curved corners with spacing from edges */}
      <section id="about" className="py-24 relative z-10 px-8 lg:px-16">
        <div className="bg-gray-900 rounded-3xl p-12 lg:p-16 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to start hacking?
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
            Join thousands of security enthusiasts and start your CTF journey today.
            No setup required - just sign up and start solving challenges.
          </p>
          <Link to="/login">
            <RainbowButton className="gap-2">Get Started Free
              <ArrowRight className="w-5 h-5" />
            </RainbowButton>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;
