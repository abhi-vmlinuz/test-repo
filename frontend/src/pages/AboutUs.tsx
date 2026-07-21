import GenericPage from '@/components/GenericPage';

const AboutUs = () => {
    return (
        <GenericPage
            title="Our Mission"
            subtitle="RLabZ is pioneering the future of cybersecurity education through immersive, gamified learning experiences."
        >
            <p>
                Founded in 2024, RLabZ emerged from a simple observation: traditional cybersecurity training is often dry, theoretical, and disconnected from real-world scenarios. We set out to change that by building a platform that treats security like the high-stakes puzzle it really is.
            </p>

            <h3>Hyper-Realistic Training</h3>
            <p>
                We don't just teach you syntax; we drop you into simulated environments that mirror actual corporate networks. Our "Cyber-Physical Obsidian" design philosophy reflects our belief that the boundary between digital and physical security is vanishing.
            </p>

            <h3>Community Driven</h3>
            <p>
                Security is a team sport. Our platform is built around a vibrant community of ethical hackers, security researchers, and students who collaborate, compete, and grow together.
            </p>

            <h3>The Team</h3>
            <p>
                We are a collective of former red teamers, CTF champions, and seasoned educators obsessed with raising the bar for cybersecurity talent globally.
            </p>
        </GenericPage>
    );
};

export default AboutUs;
