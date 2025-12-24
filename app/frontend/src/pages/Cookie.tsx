import GenericPage from '@/components/GenericPage';

const Cookie = () => {
    return (
        <GenericPage
            title="Cookie Policy"
            subtitle="We use cookies to keep you logged in and ensure the smooth operation of our challenges."
        >
            <h3>What are Cookies?</h3>
            <p>
                Cookies are small text files stored on your device that allow us to recognize your session.
            </p>

            <h3>Essential Cookies</h3>
            <p>
                These cookies are necessary for the website to function and cannot be switched off. They are usually only set in response to actions made by you which amount to a request for services, such as logging in or filling in forms.
            </p>

            <h3>Performance Cookies</h3>
            <p>
                These allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us to know which pages are the most and least popular and see how visitors move around the site.
            </p>

            <h3>Managing Cookies</h3>
            <p>
                You can set your browser to block or alert you about these cookies, but some parts of the site will not then work.
            </p>
        </GenericPage>
    );
};

export default Cookie;
