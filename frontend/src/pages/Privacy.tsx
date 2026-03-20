import GenericPage from '@/components/GenericPage';

const Privacy = () => {
    return (
        <GenericPage
            title="Privacy Policy"
            subtitle="Your privacy is critically important to us. We believe in transparency and data minimization."
        >
            <h3>Data We Collect</h3>
            <p>
                We collect only the information necessary to provide our service:
            </p>
            <ul>
                <li>Account information (email, username, password hash)</li>
                <li>Progress data (completed challenges, scores, leaderboard standing)</li>
                <li>Technical logs (IP address, browser type) for security and debugging</li>
            </ul>

            <h3>How We Use Your Data</h3>
            <p>
                We use your data to:
                <ul>
                    <li>Authenticate your access to the platform</li>
                    <li>Track your learning progress and achievements</li>
                    <li>Maintain the integrity and security of the platform</li>
                    <li>Communicate important updates strictly related to the service</li>
                </ul>
            </p>

            <h3>Data Sharing</h3>
            <p>
                We do not sell your personal data. We may share data with trusted third-party service providers (like payment processors or hosting providers) solely for the purpose of operating the platform.
            </p>
        </GenericPage>
    );
};

export default Privacy;
