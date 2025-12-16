import { Link } from 'react-router-dom';
import { Shield, Mail, Twitter, Github, Linkedin, MessageCircle } from 'lucide-react';

const Footer = () => {
    const footerLinks = {
        Platform: [
            { label: 'Challenges', href: '/challenges' },
            { label: 'Leaderboard', href: '/leaderboard' },
            { label: 'Categories', href: '/challenges' },
            { label: 'Docker Labs', href: '/challenges' },
        ],
        Resources: [
            { label: 'Documentation', href: '#' },
            { label: 'Blog', href: '#' },
            { label: 'Community', href: '#' },
            { label: 'Discord', href: '#' },
        ],
        Company: [
            { label: 'About Us', href: '#' },
            { label: 'Pricing', href: '/pricing' },
            { label: 'Careers', href: '#' },
            { label: 'Contact', href: '#' },
        ],
        Legal: [
            { label: 'Terms of Service', href: '#' },
            { label: 'Privacy Policy', href: '#' },
            { label: 'Cookie Policy', href: '#' },
        ],
    };

    const socialLinks = [
        { icon: Twitter, href: '#', label: 'Twitter' },
        { icon: Github, href: '#', label: 'GitHub' },
        { icon: Linkedin, href: '#', label: 'LinkedIn' },
        { icon: MessageCircle, href: '#', label: 'Discord' },
    ];

    return (
        <footer className="bg-white relative z-10">
            {/* Main Footer Content - appears like a card on white sheet */}
            <div className="w-full px-8 lg:px-16 pt-20 pb-16">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-12 lg:gap-16">
                    {/* Logo & Tagline */}
                    <div className="col-span-2">
                        <Link to="/" className="flex items-center gap-2 mb-6">
                            <img src="/logo.png" alt="ZecurX" className="w-8 h-8" />
                            <span className="text-xl font-bold text-gray-900">ZecurX LABS</span>
                        </Link>
                        <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-xs">
                            The ultimate CTF platform for cybersecurity enthusiasts. Practice, learn, and master ethical hacking skills.
                        </p>
                        {/* Social Links */}
                        <div className="flex gap-3">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                                    aria-label={social.label}
                                >
                                    <social.icon className="w-5 h-5" strokeWidth={1.5} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Footer Links */}
                    {Object.entries(footerLinks).map(([title, links]) => (
                        <div key={title}>
                            <h4 className="font-semibold text-gray-900 mb-5">{title}</h4>
                            <ul className="space-y-3">
                                {links.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            to={link.href}
                                            className="text-gray-400 text-sm hover:text-gray-600 transition-colors"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Contact Section - Subtle gray background with rounded top */}
            <div className="mx-8 lg:mx-16 bg-gray-50 rounded-t-3xl">
                <div className="px-8 py-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-1">Have questions?</h4>
                            <p className="text-gray-400 text-sm">We'd love to hear from you. Get in touch with our team.</p>
                        </div>
                        <a
                            href="mailto:contact@ZecurX LABS.com"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-full font-medium transition-colors"
                        >
                            <Mail className="w-4 h-4" />
                            Contact Us
                        </a>
                    </div>
                </div>
            </div>

            {/* Copyright - Within the same gray section */}
            <div className="mx-8 lg:mx-16 bg-gray-50 rounded-b-3xl mb-8">
                <div className="px-8 py-6 border-t border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-gray-400">
                        <p>© 2025 ZecurX Pvt.Ltd All rights reserved.</p>
                        <p>Made with ❤️ for hackers</p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
