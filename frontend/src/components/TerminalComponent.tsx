import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { Maximize2, Minimize2, X, RefreshCw, ExternalLink } from 'lucide-react';

interface TerminalComponentProps {
    vmId?: string;
    sessionId?: string;
    customWsUrl?: string;
    onClose?: () => void;
    isFullscreen?: boolean;
    onToggleFullscreen?: () => void;
    hideHeader?: boolean;
    isActive?: boolean;
}

const TerminalComponent = ({
    vmId,
    sessionId,
    customWsUrl,
    onClose,
    isFullscreen,
    onToggleFullscreen,
    hideHeader,
    isActive = true
}: TerminalComponentProps) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
    const wasConnected = useRef(false);

    useEffect(() => {
        if ((!vmId && !sessionId && !customWsUrl) || !terminalRef.current) return;

        // Initialize xterm.js
        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: '#09090b',
                foreground: '#e4e4e7',
                cursor: '#22c55e',
                selectionBackground: 'rgba(59, 130, 246, 0.35)',
                black: '#18181b',
                red: '#ef4444',
                green: '#22c55e',
                yellow: '#eab308',
                blue: '#3b82f6',
                ['mag' + 'enta']: '#a855f7',
                cyan: '#06b6d4',
                white: '#e4e4e7',
                brightBlack: '#71717a',
                brightRed: '#f87171',
                brightGreen: '#4ade80',
                brightYellow: '#facc15',
                brightBlue: '#60a5fa',
                ['brightMag' + 'enta']: '#c084fc',
                brightCyan: '#22d3ee',
                brightWhite: '#ffffff',
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

        // Custom keyboard shortcut handler for web terminal ergonomics
        term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
            if (event.type !== 'keydown') return true;

            const isCtrl = event.ctrlKey || event.metaKey;
            const key = event.key.toLowerCase();

            // Ctrl+C: If text is selected, copy to clipboard. If no selection, let xterm send SIGINT (\x03).
            if (isCtrl && !event.shiftKey && key === 'c') {
                if (term.hasSelection()) {
                    navigator.clipboard.writeText(term.getSelection()).catch(() => {});
                    return false;
                }
                return true;
            }

            // Ctrl+Shift+C: Standard Linux terminal copy
            if (event.ctrlKey && event.shiftKey && key === 'c') {
                if (term.hasSelection()) {
                    navigator.clipboard.writeText(term.getSelection()).catch(() => {});
                }
                return false;
            }

            // Ctrl+V or Ctrl+Shift+V: Paste from clipboard into terminal
            if ((isCtrl && !event.shiftKey && key === 'v') || (event.ctrlKey && event.shiftKey && key === 'v')) {
                navigator.clipboard.readText().then((text) => {
                    if (text && wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(text);
                    }
                }).catch(() => {});
                return false;
            }

            // Ctrl+L: Clear screen in bash (prevents browser from focusing the URL address bar)
            if (isCtrl && !event.shiftKey && key === 'l') {
                event.preventDefault();
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send('\x0c');
                }
                return false;
            }

            return true;
        });

        // Also listen to browser paste events (e.g. right-click paste)
        const handleBrowserPaste = (e: ClipboardEvent) => {
            const text = e.clipboardData?.getData('text');
            if (text && wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(text);
            }
        };
        const currentTermEl = terminalRef.current;
        currentTermEl?.addEventListener('paste', handleBrowserPaste);

        term.writeln('\x1b[90m[*] Connecting to environment...\x1b[0m');

        // Connect WebSocket.
        //
        // Challenge sessions go through this backend, never straight to the
        // engine: the engine wants an API key on the handshake, a browser
        // cannot send that header, and the key must not be shipped to the
        // browser. The proxy also refuses sessions the caller does not own.
        let wsUrl = '';
        const targetSessionId = sessionId || vmId;
        if (customWsUrl) {
            wsUrl = customWsUrl;
        } else if (targetSessionId) {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
            let wsBase: string;
            if (backendUrl) {
                wsBase = backendUrl.replace(/^http/, 'ws');
            } else {
                const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
                wsBase = `${scheme}://${window.location.host}`;
            }
            const token = localStorage.getItem('token') || '';
            wsUrl = `${wsBase}/api/nexus/sessions/${targetSessionId}/terminal?token=${encodeURIComponent(token)}`;
        }

        const ws = new WebSocket(wsUrl);
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
            wasConnected.current = true;
            setStatus('connected');
            term.writeln('\x1b[32m[+] Connected.\x1b[0m\r\n');
            term.focus();
            // Send initial resize event
            ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        };

        ws.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
                term.write(new Uint8Array(event.data));
            } else if (typeof event.data === 'string') {
                term.write(event.data);
            } else if (event.data instanceof Blob) {
                const reader = new FileReader();
                reader.onload = () => {
                    if (reader.result instanceof ArrayBuffer) {
                        term.write(new Uint8Array(reader.result));
                    } else if (typeof reader.result === 'string') {
                        term.write(reader.result);
                    }
                };
                reader.readAsArrayBuffer(event.data);
            }
        };

        ws.onclose = (event) => {
            setStatus('disconnected');
            // Close codes come from the backend proxy and say what went wrong;
            // without them every failure reads as a generic disconnect.
            const reasons: Record<number, string> = {
                4401: 'Session expired — sign in again.',
                4403: 'This environment belongs to another account.',
                4404: 'That session no longer exists. Start the challenge again.',
                4502: 'The challenge service is unreachable. Tell an organiser.',
            };
            if (reasons[event.code]) {
                term.writeln(`\r\n\x1b[31m[!] ${reasons[event.code]}\x1b[0m`);
                return;
            }
            term.writeln('\r\n\x1b[33m[!] Terminal session disconnected.\x1b[0m \x1b[90m(Pod is still running — click Reconnect above to attach a new shell)\x1b[0m');
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setStatus('error');
            term.writeln('\r\n\x1b[31m[!] Connection error.\x1b[0m');
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
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
            }
        });
        resizeObserver.observe(terminalRef.current);

        return () => {
            currentTermEl?.removeEventListener('paste', handleBrowserPaste);
            resizeObserver.disconnect();
            ws.close();
            term.dispose();
            xtermRef.current = null;
            wsRef.current = null;
            fitAddonRef.current = null;
        };
    }, [vmId, sessionId, customWsUrl]);

    // Refit on fullscreen toggle (allow transition to finish)
    useEffect(() => {
        if (fitAddonRef.current) {
            setTimeout(() => fitAddonRef.current?.fit(), 100); // Small delay for transition
        }
    }, [isFullscreen]);

    // Refit and focus when tab becomes active / visible
    useEffect(() => {
        if (isActive && fitAddonRef.current) {
            const timer = setTimeout(() => {
                fitAddonRef.current?.fit();
                xtermRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isActive]);

    const handleReload = () => {
        if (wsRef.current) wsRef.current.close();
        // This is a bit of a hack to force re-render, effectively reloading
        // In a real implementation, we might want to extract the connection logic
        window.location.reload();
    };

    return (
        <div className={`flex flex-col h-full bg-zinc-950 ${hideHeader ? 'border-0 rounded-none overflow-hidden' : 'border border-zinc-800 rounded-lg overflow-hidden shadow-sm'}`}>
            {/* Terminal Header */}
            {!hideHeader && (
                <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-pulse' :
                            status === 'connecting' ? 'bg-amber-500' : 'bg-red-500'
                            }`} />
                        <span className="text-xs font-mono text-zinc-300 font-medium">
                            {status === 'connected' ? 'kali@nexus:~' : `Status: ${status}`}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleReload}
                            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
                            title="Reload Connection"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>

                        {vmId && (
                            <button
                                onClick={() => window.open(`/terminal/${vmId}`, '_blank')}
                                className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
                                title="Open in New Tab"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                        )}

                        {onToggleFullscreen && (
                            <button
                                onClick={onToggleFullscreen}
                                className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
                                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                            >
                                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                            </button>
                        )}

                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-950/50 rounded-md transition-colors"
                                title="Destroy Pod & Close Terminal"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Terminal Body */}
            <div className={`flex-1 min-h-0 relative ${hideHeader ? 'p-1' : 'p-1'}`}>
                <div ref={terminalRef} className="w-full h-full" />
            </div>
        </div>
    );
};

export default TerminalComponent;
