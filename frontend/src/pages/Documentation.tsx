import GenericPage from '@/components/GenericPage';

const Documentation = () => {
    return (
        <GenericPage
            title="Platform Documentation"
            subtitle="Guides, references, and API docs to help you get the most out of RLabZ."
        >
            <h3>Getting Started</h3>
            <p>
                Learn how to set up your account, configure your VPN connection, and launch your first challenge container.
            </p>

            <h3>Challenge Categories</h3>
            <div className="grid grid-cols-2 gap-4 not-prose my-6">
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                    <h4 className="font-bold text-white mb-2">Web Exploitation</h4>
                    <p className="text-sm text-zinc-400">SQLi, XSS, SSRF, and modern web attacks.</p>
                </div>
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                    <h4 className="font-bold text-white mb-2">Binary Exploitation</h4>
                    <p className="text-sm text-zinc-400">Buffer overflows, ROP chains, and heap exploitation.</p>
                </div>
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                    <h4 className="font-bold text-white mb-2">Cryptography</h4>
                    <p className="text-sm text-zinc-400">Breaking ciphers, attacking RSA, and elliptic curve attacks.</p>
                </div>
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                    <h4 className="font-bold text-white mb-2">Forensics</h4>
                    <p className="text-sm text-zinc-400">Memory analysis, packet capture analysis, and steganography.</p>
                </div>
            </div>

            <h3>API Reference</h3>
            <p>
                Automate your workflow with our public API. Full Swagger documentation is available at <code className="text-green-400">api.rlabz.edu/docs</code>.
            </p>
        </GenericPage>
    );
};

export default Documentation;
