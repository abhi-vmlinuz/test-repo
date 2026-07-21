import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

type Theme = 'light' | 'dark';

interface ThemeToggleProps {
    isAuthenticated?: boolean;
}

const ThemeToggle = ({ isAuthenticated = false }: ThemeToggleProps) => {
    const [theme, setTheme] = useState<Theme>('light');

    // Initialize theme from localStorage or system preference
    useEffect(() => {
        // If not authenticated, always use light theme
        if (!isAuthenticated) {
            setTheme('light');
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.classList.remove('dark');
            return;
        }

        // Only apply saved theme for authenticated users
        const savedTheme = localStorage.getItem('rlabz-theme') as Theme | null;

        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
            if (savedTheme === 'dark') document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const initialTheme: Theme = prefersDark ? 'dark' : 'light';
            setTheme(initialTheme);
            document.documentElement.setAttribute('data-theme', initialTheme);
            if (prefersDark) document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
        }
    }, [isAuthenticated]);

    const toggleTheme = () => {
        const newTheme: Theme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        if (newTheme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('rlabz-theme', newTheme);
    };

    // Don't render the toggle button for non-authenticated users
    if (!isAuthenticated) {
        return null;
    }

    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === 'light' ? (
                <Moon className="w-5 h-5" />
            ) : (
                <Sun className="w-5 h-5" />
            )}
        </button>
    );
};

export default ThemeToggle;

