import { ReactNode } from 'react';
import { useFeatures } from '../contexts/FeatureContext';

interface BetaFeatureProps {
    name: string;
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * Wraps content that should only render if the feature flag is active.
 * Shows a "Beta" badge on beta features.
 *
 * Usage:
 *   <BetaFeature name="firecracker_terminal">
 *     <TerminalComponent />
 *   </BetaFeature>
 */
const BetaFeature = ({ name, children, fallback = null }: BetaFeatureProps) => {
    const { isEnabled, isBeta } = useFeatures();

    if (!isEnabled(name)) {
        return <>{fallback}</>;
    }

    return (
        <div className="relative">
            {isBeta(name) && <BetaBadge />}
            {children}
        </div>
    );
};

const BetaBadge = () => (
    <span
        className="absolute -top-2 -right-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border shadow-sm"
        style={{
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            color: '#78350f',
            borderColor: '#f59e0b',
        }}
    >
        Beta
    </span>
);

export { BetaFeature, BetaBadge };
export default BetaFeature;
