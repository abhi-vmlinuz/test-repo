import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { API } from '../App';

interface Feature {
    name: string;
    description: string;
    status: string;
    beta: boolean;
}

interface FeatureContextType {
    features: Record<string, Feature>;
    isEnabled: (key: string) => boolean;
    isBeta: (key: string) => boolean;
    loading: boolean;
    refresh: () => Promise<void>;
}

const FeatureContext = createContext<FeatureContextType>({
    features: {},
    isEnabled: () => false,
    isBeta: () => false,
    loading: true,
    refresh: async () => { },
});

export const useFeatures = () => useContext(FeatureContext);

export const FeatureProvider = ({ children }: { children: ReactNode }) => {
    const [features, setFeatures] = useState<Record<string, Feature>>({});
    const [loading, setLoading] = useState(true);

    const fetchFeatures = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setFeatures({});
                setLoading(false);
                return;
            }
            const response = await axios.get(`${API}/features`);
            setFeatures(response.data || {});
        } catch {
            setFeatures({});
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch features whenever localStorage token changes (login/logout)
    // Listen for storage events + re-check on interval for same-tab changes
    useEffect(() => {
        fetchFeatures();

        // Listen for cross-tab storage changes
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'token') fetchFeatures();
        };
        window.addEventListener('storage', handleStorage);

        // Also listen for custom event dispatched after login/logout in same tab
        const handleTokenChange = () => fetchFeatures();
        window.addEventListener('token-changed', handleTokenChange);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('token-changed', handleTokenChange);
        };
    }, []);

    const isEnabled = (key: string): boolean => {
        return key in features;
    };

    const isBeta = (key: string): boolean => {
        return features[key]?.beta ?? false;
    };

    return (
        <FeatureContext.Provider value={{ features, isEnabled, isBeta, loading, refresh: fetchFeatures }}>
            {children}
        </FeatureContext.Provider>
    );
};

export default FeatureContext;
