import GenericPage from '@/components/GenericPage';

const Terms = () => {
    return (
        <GenericPage
            title="Terms of Service"
            subtitle="Effective Date: December 24, 2024"
        >
            <h3>1. Acceptance of Terms</h3>
            <p>
                By accessing and using the ZecurX platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>

            <h3>2. Code of Conduct</h3>
            <p>
                ZecurX is an educational platform. You agree to use the skills learned here solely for ethical and legal purposes. Any malicious use of our training materials against real-world targets without authorization involves zero tolerance and immediate account termination.
            </p>

            <h3>3. Account Security</h3>
            <p>
                You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account.
            </p>

            <h3>4. Intellectual Property</h3>
            <p>
                All challenges, documentation, and platform content are the exclusive property of ZecurX Labs. You may not reproduce, distribute, or reverse engineer any part of the service.
            </p>

            <h3>5. Limitation of Liability</h3>
            <p>
                ZecurX provides training environments "as is". We are not liable for any damages arising from your use of the service or the inability to use the service.
            </p>
        </GenericPage>
    );
};

export default Terms;
