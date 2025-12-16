import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { Link } from 'react-router-dom';
import {
    BookOpen, Trophy, Target, Clock, CheckCircle2, ArrowRight,
    Flame, Star, TrendingUp
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Radiating Particle Animation Component - Continuous Movement
const StudentParticles = () => {
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);
    const mouseRef = useRef({ x: null, y: null });
    const animationRef = useRef(null);
    const timeRef = useRef(0);

    const createParticles = useCallback((width, height) => {
        const particles = [];
        const numParticles = 60;
        const centerX = width / 2;
        const centerY = height / 2;

        for (let i = 0; i < numParticles; i++) {
            // Spread particles across the canvas
            const angle = (Math.PI * 2 * i) / numParticles + Math.random() * 0.5;
            const distance = Math.random() * Math.min(width, height) * 0.4 + 50;

            particles.push({
                x: centerX + Math.cos(angle) * distance,
                y: centerY + Math.sin(angle) * distance,
                originX: centerX + Math.cos(angle) * distance,
                originY: centerY + Math.sin(angle) * distance,
                size: Math.random() * 3 + 1.5,
                // Independent movement speeds
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5,
                // Orbit properties for circular movement
                orbitRadius: Math.random() * 30 + 10,
                orbitSpeed: (Math.random() - 0.5) * 0.02,
                orbitAngle: Math.random() * Math.PI * 2,
                opacity: Math.random() * 0.4 + 0.3,
                color: Math.random() > 0.5 ? 'rgba(55, 65, 81, ' : 'rgba(107, 114, 128, '
            });
        }
        return particles;
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const resizeCanvas = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            particlesRef.current = createParticles(canvas.width, canvas.height);
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const handleMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };

        const handleMouseLeave = () => {
            mouseRef.current = { x: null, y: null };
        };

        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', handleMouseLeave);

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            timeRef.current += 0.016; // Approximately 60fps

            particlesRef.current.forEach((particle, index) => {
                // Update orbit angle for continuous circular motion
                particle.orbitAngle += particle.orbitSpeed;

                // Calculate new position with orbit
                const orbitX = Math.cos(particle.orbitAngle) * particle.orbitRadius;
                const orbitY = Math.sin(particle.orbitAngle) * particle.orbitRadius;

                // Add gentle drift
                particle.originX += particle.vx * 0.3;
                particle.originY += particle.vy * 0.3;

                // Boundary bouncing for origin
                if (particle.originX < 50 || particle.originX > canvas.width - 50) {
                    particle.vx *= -1;
                    particle.originX = Math.max(50, Math.min(canvas.width - 50, particle.originX));
                }
                if (particle.originY < 50 || particle.originY > canvas.height - 50) {
                    particle.vy *= -1;
                    particle.originY = Math.max(50, Math.min(canvas.height - 50, particle.originY));
                }

                // Target position
                let targetX = particle.originX + orbitX;
                let targetY = particle.originY + orbitY;

                // Mouse interaction - push particles away
                if (mouseRef.current.x !== null && mouseRef.current.y !== null) {
                    const dx = mouseRef.current.x - targetX;
                    const dy = mouseRef.current.y - targetY;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 120) {
                        const force = (120 - dist) / 120;
                        targetX -= (dx / dist) * force * 50;
                        targetY -= (dy / dist) * force * 50;
                    }
                }

                // Smooth interpolation to target
                particle.x += (targetX - particle.x) * 0.1;
                particle.y += (targetY - particle.y) * 0.1;

                // Draw particle
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = particle.color + particle.opacity + ')';
                ctx.fill();

                // Draw connections to nearby particles
                for (let j = index + 1; j < particlesRef.current.length; j++) {
                    const other = particlesRef.current[j];
                    const distX = particle.x - other.x;
                    const distY = particle.y - other.y;
                    const distance = Math.sqrt(distX * distX + distY * distY);

                    if (distance < 100) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(156, 163, 175, ${0.2 * (1 - distance / 100)})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(other.x, other.y);
                        ctx.stroke();
                    }
                }
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [createParticles]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-auto"
            style={{ zIndex: 0 }}
        />
    );
};

const StudentDashboard = ({ user }) => {
    const [stats, setStats] = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [statsRes, enrollmentsRes] = await Promise.allSettled([
                axios.get(`${API}/student/stats`),
                axios.get(`${API}/student/enrollments`)
            ]);
            if (statsRes.status === 'fulfilled') {
                setStats(statsRes.value.data);
                setRecentActivity(statsRes.value.data.recent_activity || []);
            }
            if (enrollmentsRes.status === 'fulfilled') {
                setEnrollments(enrollmentsRes.value.data.enrollments || []);
            }
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 rounded w-64" />
                    <div className="grid grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Stat cards with colored icon backgrounds
    const statCards = [
        { label: 'Enrolled Courses', value: stats?.enrolled_courses || 0, icon: BookOpen, bgColor: 'bg-blue-500', iconColor: 'text-white' },
        { label: 'Challenges Solved', value: stats?.challenges_solved || 0, icon: Trophy, bgColor: 'bg-yellow-500', iconColor: 'text-white' },
        { label: 'Current Streak', value: `${stats?.streak || 0} days`, icon: Flame, bgColor: 'bg-orange-500', iconColor: 'text-white' },
        { label: 'Total Points', value: stats?.total_points || 0, icon: Star, bgColor: 'bg-purple-500', iconColor: 'text-white' },
    ];

    return (
        <div className="p-8 relative min-h-screen">
            {/* Particle Animation Background */}
            <div className="absolute inset-0 overflow-hidden">
                <StudentParticles />
            </div>

            {/* Content */}
            <div className="relative z-10">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Welcome back, {user?.username}! 
                    </h1>
                    <p className="text-gray-500 mt-1">Continue your cybersecurity learning journey</p>
                </div>

                {/* Stats Grid - with colored icons */}
                <div className="grid grid-cols-4 gap-6 mb-8">
                    {statCards.map((stat, idx) => {
                        const Icon = stat.icon;
                        return (
                            <div key={idx} className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm text-gray-500">{stat.label}</span>
                                    <div className={`w-10 h-10 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                                        <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-3 gap-8">
                    {/* Enrolled Courses */}
                    <div className="col-span-2">
                        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900">My Courses</h2>
                                <Link to="/student/courses" className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
                                    View all <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>

                            {enrollments.length > 0 ? (
                                <div className="space-y-4">
                                    {enrollments.slice(0, 3).map((enrollment) => (
                                        <Link
                                            key={enrollment.course_id}
                                            to={`/student/course/${enrollment.course_id}`}
                                            className="block p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                                                        <BookOpen className="w-6 h-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">{enrollment.course_name}</h3>
                                                        <p className="text-sm text-gray-500">{enrollment.modules_count} modules</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-gray-900">{enrollment.progress || 0}%</p>
                                                    <p className="text-xs text-gray-400">Complete</p>
                                                </div>
                                            </div>
                                            <Progress value={enrollment.progress || 0} className="h-2" />
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-400">No courses enrolled yet</p>
                                    <p className="text-sm text-gray-400 mt-1">Contact your admin for enrollment</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div>
                        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                                <TrendingUp className="w-5 h-5 text-green-500" />
                            </div>

                            {recentActivity.length > 0 ? (
                                <div className="space-y-4">
                                    {recentActivity.slice(0, 5).map((activity, idx) => (
                                        <div key={idx} className="flex items-start gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.type === 'solve' ? 'bg-green-100' : 'bg-gray-100'
                                                }`}>
                                                {activity.type === 'solve' ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <Target className="w-4 h-4 text-gray-500" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-900 truncate">{activity.title}</p>
                                                <p className="text-xs text-gray-400">{activity.time_ago}</p>
                                            </div>
                                            {activity.points && (
                                                <span className="text-sm font-medium text-green-600">+{activity.points}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-400 text-sm">No recent activity</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
