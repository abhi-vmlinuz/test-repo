import { useParams } from 'react-router-dom';
import TerminalComponent from '@/components/TerminalComponent';

const TerminalPage = () => {
    const { vmId } = useParams();

    if (!vmId) {
        return (
            <div className="h-screen bg-zinc-950 flex items-center justify-center">
                <p className="text-red-400 font-mono">No VM ID specified.</p>
            </div>
        );
    }

    return (
        <div className="h-screen bg-zinc-950 p-2">
            <TerminalComponent vmId={vmId} />
        </div>
    );
};

export default TerminalPage;
