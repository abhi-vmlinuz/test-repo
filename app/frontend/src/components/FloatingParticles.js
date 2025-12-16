import { useEffect, useRef } from 'react';

const FloatingParticles = ({ particleCount = 150 }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const particlesRef = useRef([]);
    const mouseRef = useRef({ x: null, y: null });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let width = window.innerWidth;
        let height = window.innerHeight;

        // Set canvas size
        const setCanvasSize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);

        // Track mouse position
        const handleMouseMove = (e) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseLeave = () => {
            mouseRef.current = { x: null, y: null };
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        // Create particles with darker grey/black color palette
        const createParticles = () => {
            const particles = [];
            for (let i = 0; i < particleCount; i++) {
                // Darker grey/black color palette - increased visibility
                const greyValue = Math.floor(Math.random() * 100) + 80; // 80-180 range (darker)
                const alpha = Math.random() * 0.5 + 0.3; // 0.3-0.8 alpha (more opaque)

                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    size: Math.random() * 3 + 1.2, // Slightly larger
                    // Base velocity - particles always have this movement
                    baseVelX: (Math.random() - 0.5) * 0.8,
                    baseVelY: (Math.random() - 0.5) * 0.8,
                    // Current velocity (base + attraction)
                    velX: 0,
                    velY: 0,
                    color: `rgba(${greyValue}, ${greyValue}, ${greyValue}, ${alpha})`,
                });
            }
            return particles;
        };

        particlesRef.current = createParticles();

        // Animation loop
        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            const mouse = mouseRef.current;
            const attractionRadius = 200;
            const attractionStrength = 0.02;

            particlesRef.current.forEach((particle) => {
                // Start with base velocity (always moving)
                let targetVelX = particle.baseVelX;
                let targetVelY = particle.baseVelY;

                // Add mouse attraction if mouse is on screen
                if (mouse.x !== null && mouse.y !== null) {
                    const dx = mouse.x - particle.x;
                    const dy = mouse.y - particle.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < attractionRadius && distance > 0) {
                        // Calculate attraction force (stronger when closer)
                        const force = (attractionRadius - distance) / attractionRadius;
                        const attractX = (dx / distance) * force * attractionStrength * 50;
                        const attractY = (dy / distance) * force * attractionStrength * 50;

                        // Add attraction to base velocity
                        targetVelX += attractX;
                        targetVelY += attractY;
                    }
                }

                // Smoothly interpolate current velocity towards target
                particle.velX += (targetVelX - particle.velX) * 0.05;
                particle.velY += (targetVelY - particle.velY) * 0.05;

                // Update position
                particle.x += particle.velX;
                particle.y += particle.velY;

                // Wrap around screen edges
                if (particle.x < -10) particle.x = width + 10;
                if (particle.x > width + 10) particle.x = -10;
                if (particle.y < -10) particle.y = height + 10;
                if (particle.y > height + 10) particle.y = -10;

                // Draw particle
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = particle.color;
                ctx.fill();
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', setCanvasSize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [particleCount]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ opacity: 0.7 }}
        />
    );
};

export default FloatingParticles;
