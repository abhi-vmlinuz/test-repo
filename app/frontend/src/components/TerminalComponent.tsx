import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { Maximize2, Minimize2, X, RefreshCw, ExternalLink } from 'lucide-react';

interface TerminalComponentProps {
    vmId: string;
    onClose?: () => void;
    isFullscreen?: boolean;
    onToggleFullscreen?: () => void;
}

const TerminalComponent = ({ vmId, onClose, isFullscreen, onToggleFullscreen }: TerminalComponentProps) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

    useEffect(() => {
        if (!vmId || !terminalRef.current) return;

        // Initialize xterm.js
        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: '#09090b', // Zinc-950
                foreground: '#f4f4f5', // Zinc-100
                cursor: '#22c55e',     // Green-500
                selectionBackground: 'rgba(34, 197, 94, 0.3)',
                black: '#09090b',
                red: '#ef4444',
                green: '#22c55e',
                yellow: '#eab308',
                blue: '#3b82f6',
                magenta: '#a855f7',
                cyan: '#06b6d4',
                white: '#f4f4f5',
                brightBlack: '#71717a',
                brightRed: '#f87171',
                brightGreen: '#4ade80',
                brightYellow: '#facc15',
                brightBlue: '#60a5fa',
                brightMagenta: '#c084fc',
                brightCyan: '#22d3ee',
                brightWhite: '#fafafa',
            },
            allowProposedApi: true,
        });

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();

        term.loadAddon(fitAddon);
        term.loadAddon(webLinksAddon);
        term.open(terminalRef.current);
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        term.writeln('\x1b[33m⚡ Connecting to secure environment...\x1b[0m');

        // Connect WebSocket
        // Derive WebSocket URL from conductor URL
        // http://x → ws://x, https://x → wss://x
        const conductorUrl = import.meta.env.VITE_CONDUCTOR_URL || 'http://localhost:8080';
        const wsBase = conductorUrl.replace(/^http/, 'ws');
        const wsUrl = `${wsBase}/api/v1/vms/${vmId}/terminal`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            setStatus('connected');
            term.writeln('\r\n\x1b[32m✔ Connected to terminal session.\x1b[0m\r\n');
            term.focus();
            // Send a resize event to server if needed (not implemented in conductor yet)
        };

        ws.onmessage = (event) => {
            if (typeof event.data === 'string') {
                term.write(event.data);
            } else {
                // Handle binary data if needed
                const reader = new FileReader();
                reader.onload = () => {
                    term.write(reader.result as string);
                };
                reader.readAsText(event.data);
            }
        };

        ws.onclose = () => {
            setStatus('disconnected');
            term.writeln('\r\n\x1b[31m⚠ Connection closed.\x1b[0m');
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setStatus('error');
            term.writeln('\r\n\x1b[31m⚠ Connection error.\x1b[0m');
        };

        wsRef.current = ws;

        // Terminal -> WebSocket
        term.onData((data) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });

        // Resize observer
        const resizeObserver = new ResizeObserver(() => {
            fitAddon.fit();
        });
        resizeObserver.observe(terminalRef.current);

        return () => {
            resizeObserver.disconnect();
            ws.close();
            term.dispose();
            xtermRef.current = null;
            wsRef.current = null;
            fitAddonRef.current = null;
        };
    }, [vmId]);

    // Refit on fullscreen toggle (allow transition to finish)
    useEffect(() => {
        if (fitAddonRef.current) {
            setTimeout(() => fitAddonRef.current?.fit(), 100); // Small delay for transition
        }
    }, [isFullscreen]);

    const handleReload = () => {
        if (wsRef.current) wsRef.current.close();
        // This is a bit of a hack to force re-render, effectively reloading
        // In a real implementation, we might want to extract the connection logic
        window.location.reload();
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' :
                        status === 'connecting' ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                    <span className="text-xs font-mono text-zinc-400">
                        {status === 'connected' ? 'root@kali:~' : `Status: ${status}`}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleReload}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                        title="Reload Connection"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                        onClick={() => window.open(`/terminal/${vmId}`, '_blank')}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                        title="Open in New Tab"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    {onToggleFullscreen && (
                        <button
                            onClick={onToggleFullscreen}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        >
                            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </button>
                    )}

                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-colors"
                            title="Close Terminal"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 min-h-0 relative p-1">
                <div ref={terminalRef} className="w-full h-full" />
            </div>
        </div>
    );
};

export default TerminalComponent;
