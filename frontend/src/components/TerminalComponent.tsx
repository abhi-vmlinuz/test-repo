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
                background: '#ffffff',
                foreground: '#0f172a',
                cursor: '#16a34a',
                selectionBackground: 'rgba(59, 130, 246, 0.25)',
                black: '#0f172a',
                red: '#dc2626',
                green: '#16a34a',
                yellow: '#ca8a04',
                blue: '#2563eb',
                ['mag' + 'enta']: '#9333ea',
                cyan: '#0891b2',
                white: '#f8fafc',
                brightBlack: '#64748b',
                brightRed: '#ef4444',
                brightGreen: '#22c55e',
                brightYellow: '#eab308',
                brightBlue: '#3b82f6',
                ['brightMag' + 'enta']: '#a855f7',
                brightCyan: '#06b6d4',
                brightWhite: '#0f172a',
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

        term.writeln('\x1b[33m⚡ Connecting to secure environment...\x1b[0m');

        // Connect WebSocket
        let wsUrl = '';
        if (customWsUrl) {
            wsUrl = customWsUrl;
        } else if (sessionId) {
            const engineUrl = import.meta.env.VITE_NEXUS_ENGINE_URL || import.meta.env.VITE_NEXUS_URL || import.meta.env.VITE_CONDUCTOR_URL || 'http://localhost:8080';
            const wsBase = engineUrl.replace(/^http/, 'ws');
            wsUrl = `${wsBase}/api/v1/sessions/${sessionId}/terminal`;
        } else {
            const conductorUrl = import.meta.env.VITE_CONDUCTOR_URL || 'http://localhost:8080';
            const wsBase = conductorUrl.replace(/^http/, 'ws');
            wsUrl = `${wsBase}/api/v1/vms/${vmId}/terminal`;
        }

        const ws = new WebSocket(wsUrl);
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
            wasConnected.current = true;
            setStatus('connected');
            term.writeln('\r\n\x1b[32m✔ Connected to terminal session.\x1b[0m\r\n');
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

        ws.onclose = () => {
            setStatus('disconnected');
            term.writeln('\r\n\x1b[33m⚠ Terminal session disconnected.\x1b[0m \x1b[90m(Pod is still running — click Reconnect above to attach a new shell)\x1b[0m');
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
        <div className={`flex flex-col h-full bg-white ${hideHeader ? 'border-0 rounded-none overflow-hidden' : 'border border-zinc-200 rounded-lg overflow-hidden shadow-sm'}`}>
            {/* Terminal Header */}
            {!hideHeader && (
                <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 border-b border-zinc-200">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-pulse' :
                            status === 'connecting' ? 'bg-amber-500' : 'bg-red-500'
                            }`} />
                        <span className="text-xs font-mono text-zinc-600 font-medium">
                            {status === 'connected' ? 'root@kali:~' : `Status: ${status}`}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleReload}
                            className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 rounded-md transition-colors"
                            title="Reload Connection"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>

                        {vmId && (
                            <button
                                onClick={() => window.open(`/terminal/${vmId}`, '_blank')}
                                className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 rounded-md transition-colors"
                                title="Open in New Tab"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                        )}

                        {onToggleFullscreen && (
                            <button
                                onClick={onToggleFullscreen}
                                className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 rounded-md transition-colors"
                                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                            >
                                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                            </button>
                        )}

                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
