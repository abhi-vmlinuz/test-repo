import { useParams } from 'react-router-dom';
import TerminalComponent from '@/components/TerminalComponent';

// Kept for direct links: /terminal/:vmId is really a nexus session id, which
// only this page still uses. Everything in the UI goes through the backend
// proxy in TerminalComponent, so this page inherits the ownership check.
const TerminalPage = () => {
    const { vmId } = useParams();

    if (!vmId) {
        return (
            <div className="h-screen bg-zinc-950 flex items-center justify-center">
                <p className="text-red-400 font-mono">No session ID specified.</p>
            </div>
        );
    }

    return (
        <div className="h-screen bg-zinc-950 p-2">
            <TerminalComponent sessionId={vmId} />
        </div>
    );
};

export default TerminalPage;
