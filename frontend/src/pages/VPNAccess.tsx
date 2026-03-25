import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../App';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Shield, Wifi, WifiOff, RefreshCw, CheckCircle2,
  Terminal, Globe, Lock, Zap, HelpCircle, ChevronDown, ChevronUp,
  Copy, ExternalLink, Monitor, Activity, Server, ArrowRight, ShieldCheck, XCircle
} from 'lucide-react';

// VPN API is proxied through nginx at /api/vpn/ -> Nexus Engine
const VPN_API_BASE = import.meta.env.VITE_BACKEND_URL || '';

const VPNAccess = ({ user, logout }) => {
  const [vpnStatus, setVpnStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<'success' | 'failed' | null>(null);
  const [showFAQ, setShowFAQ] = useState<number | null>(null);

  useEffect(() => {
    fetchVPNStatus();
  }, []);

  const fetchVPNStatus = async () => {
    try {
      const response = await axios.get(`${VPN_API_BASE}/api/vpn/status`, {
        headers: { 'X-User-ID': user?.id }
      });
      setVpnStatus(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setVpnStatus({ has_vpn: false, connected: false });
      } else {
        console.error('Failed to fetch VPN status:', error);
        setVpnStatus({ has_vpn: false, connected: false });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);

    try {
      // Small delay for UI feel
      await new Promise(resolve => setTimeout(resolve, 1500));

      // In a real scenario, this would call a backend endpoint that pings the VPN range
      // or simply check if the client can reach the API via the VPN IP
      const response = await axios.get(`${VPN_API_BASE}/api/vpn/test-connection`, {
        headers: { 'X-User-ID': user?.id },
        timeout: 5000
      });

      if (response.data.active) {
        setConnectionTestResult('success');
        toast.success('VPN Connection active!');
      } else {
        setConnectionTestResult('failed');
      }
    } catch (error) {
      setConnectionTestResult('failed');
      toast.error('Unable to verify connection');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleDownloadConfig = async () => {
    setDownloading(true);
    try {
      const response = await axios.get(`${VPN_API_BASE}/api/vpn/config`, {
        headers: { 'X-User-ID': user?.id },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${user?.username || 'zecurx'}.conf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('VPN configuration downloaded!');
      fetchVPNStatus();
    } catch (error) {
      toast.error('Failed to download VPN configuration');
    } finally {
      setDownloading(false);
    }
  };

  const handleRegenerateConfig = async () => {
    if (!confirm('This will invalidate your current configuration file. Are you sure?')) return;

    setRegenerating(true);
    try {
      await axios.post(`${VPN_API_BASE}/api/vpn/regenerate`, {}, {
        headers: { 'X-User-ID': user?.id }
      });
      toast.success('VPN configuration regenerated! Download the new config.');
      fetchVPNStatus();
    } catch (error) {
      toast.error('Failed to regenerate VPN configuration');
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const faqs = [
    {
      question: 'What is WireGuard VPN?',
      answer: 'WireGuard is a modern, fast, and secure VPN protocol. It creates an encrypted tunnel between your computer and our lab servers, allowing you to access challenge environments securely.'
    },
    {
      question: 'How do I install WireGuard?',
      answer: 'Download WireGuard from wireguard.com/install. It\'s available for Windows, macOS, Linux, iOS, and Android. After installing, import your configuration file.'
    },
    {
      question: 'Why do I need VPN to access challenges?',
      answer: 'The VPN provides direct access to challenge lab environments on our secure network. This allows you to interact with real services, run exploits, and practice on isolated systems without exposing them to the public internet.'
    },
    {
      question: 'Can I use the same config on multiple devices?',
      answer: 'Your VPN configuration is tied to your account. You can use the same config on multiple devices, but only one connection at a time is recommended for optimal performance.'
    }
  ];

  if (loading) {
    return (
      <Layout user={user} logout={logout}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-zinc-900 border border-zinc-700 rounded-2xl animate-spin" />
            <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Securing Connection...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} logout={logout}>
      <div className="max-w-6xl mx-auto space-y-12 pb-20">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-100 dark:border-zinc-800 pb-8">
          <div>
            <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest leading-none">Security & Access</span>
            </div>
            <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">Network Access</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-4 max-w-xl leading-relaxed font-medium">
              Connect to our encrypted lab network using WireGuard. All challenge instances are isolated and require an active tunnel for direct interaction.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-700">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-tighter">GATEWAY ONLINE</span>
            </div>
            <div className="px-3 py-1.5">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono font-bold">ZX-K8s-v2</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* Main Dashboard Area */}
          <div className="lg:col-span-8 space-y-8">

            {/* Primary Access Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2rem] border border-zinc-200 shadow-xl shadow-zinc-200/50 overflow-hidden"
            >
              <div className="bg-zinc-900 p-8 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 bg-gradient-to-br from-zinc-700 to-zinc-900 rounded-3xl flex items-center justify-center border border-zinc-600 shadow-inner">
                      <img src="/wireguard.svg" alt="WireGuard" className="w-12 h-12 grayscale brightness-200" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-white leading-none">WireGuard Client</h2>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-zinc-400 font-mono text-xs">{user?.id?.substring(0, 13)}...</span>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-bold">READY</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <button
                      onClick={handleRegenerateConfig}
                      className="text-zinc-500 hover:text-white transition-colors text-xs font-bold flex items-center gap-1.5 mb-2"
                    >
                      <RefreshCw className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} />
                      REGENERATE KEYS
                    </button>
                    <Button
                      onClick={handleDownloadConfig}
                      disabled={downloading}
                      className="bg-white hover:bg-zinc-100 text-zinc-900 font-black px-8 py-6 rounded-2xl shadow-lg border-b-4 border-zinc-200 active:transform active:translate-y-1 active:border-b-0 transition-all flex items-center gap-3"
                    >
                      {downloading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Download className="w-5 h-5" />
                      )}
                      DOWNLOAD CONFIG
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: Connection Details */}
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <Server className="w-3 h-3" /> Endpoint Metadata
                    </h3>

                    <div className="space-y-4">
                      <div className="group bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-900 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Internal Virtual IP</label>
                          <button onClick={() => copyToClipboard(vpnStatus?.vpn_ip || '0.0.0.0', 'IP')} className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Copy className="w-3 h-3 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100" />
                          </button>
                        </div>
                        <p className="text-xl font-mono font-bold text-zinc-900 dark:text-white tracking-tight">{vpnStatus?.vpn_ip || '0.0.0.0'}</p>
                      </div>

                      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-all">
                        <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Active Resource Routes</label>
                        <p className="text-xl font-mono font-bold text-zinc-900 dark:text-white tracking-tight">{vpnStatus?.allowed_pod_ips?.length || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Connection Test (User Requested) */}
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <Activity className="w-3 h-3" /> Connection Status
                    </h3>

                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[160px]">
                      <AnimatePresence mode="wait">
                        {testingConnection ? (
                          <motion.div
                            key="testing"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex flex-col items-center"
                          >
                            <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100 rounded-full animate-spin mb-3" />
                            <p className="text-sm font-bold text-zinc-500 uppercase tracking-tight">PINGING GATEWAY...</p>
                          </motion.div>
                        ) : connectionTestResult === 'success' ? (
                          <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center"
                          >
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mb-3">
                              <Wifi className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <Badge variant="default" className="bg-emerald-500 text-white border-0 font-bold mb-1">CONNECTED</Badge>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">TUNNEL ESTABLISHED</p>
                          </motion.div>
                        ) : connectionTestResult === 'failed' ? (
                          <motion.div
                            key="failed"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center"
                          >
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mb-3">
                              <WifiOff className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <Badge variant="destructive" className="bg-red-500 text-white border-0 font-bold mb-1">NOT DETECTED</Badge>
                            <p className="text-[10px] text-red-600 dark:text-red-400 font-bold">VERIFY CLIENT CONFIG</p>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center"
                          >
                            <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3">
                              <Activity className="w-6 h-6 text-zinc-400 dark:text-zinc-600" />
                            </div>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium max-w-[140px] mb-4">Click below to verify your tunnel status</p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!testingConnection && (
                        <Button
                          onClick={handleTestConnection}
                          className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black rounded-xl transition-all h-12 hover:opacity-90 uppercase tracking-widest text-xs"
                        >
                          TEST CONNECTION
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Attack Box / Playground Section */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-50 border border-zinc-200 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Terminal className="w-32 h-32 text-zinc-900" />
              </div>

              <div className="w-20 h-20 bg-white dark:bg-zinc-900 rounded-3xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-sm flex-shrink-0">
                <Monitor className="w-10 h-10 text-zinc-900 dark:text-white" />
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white leading-none">Virtual Attack Box</h3>
                  <Badge variant="outline" className="text-[10px] border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-widest">COMING SOON</Badge>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md leading-relaxed font-medium">
                  Need an isolated environment? Launch a persistent Kali Linux instance directly in your browser. Fully networked and pre-configured with industry tools.
                </p>
              </div>

              <Button disabled className="bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 px-8 py-6 rounded-2xl cursor-not-allowed font-black uppercase tracking-widest text-xs">
                LAUNCH LAB
              </Button>
            </motion.div>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-8">

            {/* Detailed Stats */}
            {/* Detailed Stats */}
            <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest flex items-center gap-2 leading-none">
                  <Globe className="w-3 h-3 text-zinc-500 dark:text-zinc-400" /> Network Topology
                </h3>
              </div>
              <CardContent className="p-6">
                <div className="space-y-5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium tracking-tight">VPN Range</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">10.8.0.0/24</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium tracking-tight">Lab Network</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">10.42.0.0/16</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium tracking-tight">Protocol</span>
                    <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-[10px] font-bold border-zinc-200 dark:border-zinc-700">WireGuard</Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium tracking-tight">Standard Port</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">51820 / UDP</span>
                  </div>
                  <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-start gap-3 text-[10px] text-zinc-400 dark:text-zinc-500 leading-relaxed font-medium">
                      <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>End-to-end encryption enforced via <span className="font-bold text-zinc-500 dark:text-zinc-400">ChaCha20/Poly1305</span>.</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Setup Guide - GUI */}
            <div className="bg-zinc-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Monitor className="w-12 h-12 text-white" />
              </div>

              <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-zinc-500" /> GUI Setup
              </h3>

              <div className="space-y-8 relative">
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center text-[10px] font-black shrink-0 shadow-lg">1</div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">Install WireGuard from <a href="https://wireguard.com" className="text-white underline font-bold hover:text-white/80 transition-colors" target="_blank" rel="noopener noreferrer">wireguard.com</a></p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center text-[10px] font-black shrink-0 shadow-lg">2</div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">Download your <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-white border border-zinc-700 font-mono text-[10px]">.conf</code> bundle using the dashboard button.</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center text-[10px] font-black shrink-0 shadow-lg">3</div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">Import config into your client and click <span className="text-white font-bold tracking-tight">Activate</span>.</p>
                </div>
              </div>
            </div>

            {/* CLI Connection Guide */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border-2 border-zinc-200 dark:border-zinc-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Terminal className="w-12 h-12 text-zinc-900 dark:text-white" />
              </div>

              <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-zinc-500 dark:text-zinc-400" /> CLI Connection
              </h3>

              <div className="space-y-6">
                <div className="flex gap-4 overflow-x-auto pb-2">
                {/* Linux */}
                <div className="min-w-[250px] flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold text-[10px]">LINUX</Badge>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-2">
                    <pre className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 leading-relaxed overflow-x-auto">
{`# Install WireGuard
sudo apt install wireguard  # Ubuntu/Debian
sudo dnf install wireguard-tools  # Fedora

# Copy config to /etc/wireguard/
sudo cp ~/Downloads/<username>.conf /etc/wireguard/<username>.conf

# Connect using interface name (without .conf)
sudo wg-quick up <username>`}
                    </pre>
                    <button 
                      onClick={() => copyToClipboard(`sudo cp ~/Downloads/${user?.username || 'your_username'}.conf /etc/wireguard/${user?.username || 'your_username'}.conf\nsudo wg-quick up ${user?.username || 'your_username'}`, 'Linux commands')}
                      className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-bold uppercase tracking-wider"
                    >
                      <Copy className="w-3 h-3" /> COPY
                    </button>
                  </div>
                </div>

                {/* macOS */}
                <div className="min-w-[250px] flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold text-[10px]">macOS</Badge>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-2">
                    <pre className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 leading-relaxed overflow-x-auto">
{`# Install WireGuard via Homebrew
brew install wireguard-tools

# Copy config (create directory if needed)
sudo mkdir -p /usr/local/etc/wireguard
sudo cp ~/Downloads/<username>.conf /usr/local/etc/wireguard/<username>.conf

# Connect
sudo wg-quick up <username>`}
                    </pre>
                    <button 
                      onClick={() => copyToClipboard(`brew install wireguard-tools\nsudo mkdir -p /usr/local/etc/wireguard\nsudo cp ~/Downloads/${user?.username || 'your_username'}.conf /usr/local/etc/wireguard/${user?.username || 'your_username'}.conf\nsudo wg-quick up ${user?.username || 'your_username'}`, 'macOS commands')}
                      className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-bold uppercase tracking-wider"
                    >
                      <Copy className="w-3 h-3" /> COPY
                    </button>
                  </div>
                </div>

                {/* Windows */}
                <div className="min-w-[250px] flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold text-[10px]">WINDOWS</Badge>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-2">
                    <pre className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 leading-relaxed overflow-x-auto">
{`# Download WireGuard installer from wireguard.com

# Move config to WireGuard config folder
Move-Item -Path "$env:USERPROFILE\\Downloads\\<username>.conf" \\
  -Destination "$env:APPDATA\\WireGuard\\Configs\\<username>.conf"

# Or copy manually:
# C:\\Users\\YourUsername\\AppData\\Roaming\\WireGuard\\Configs\\

# Connect via WireGuard GUI app`}
                    </pre>
                    <button 
                      onClick={() => copyToClipboard(`Move-Item -Path "$env:USERPROFILE\\\\Downloads\\\\${user?.username || 'your_username'}.conf" -Destination "$env:APPDATA\\\\WireGuard\\\\Configs\\\\${user?.username || 'your_username'}.conf"`, 'Windows commands')}
                      className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-bold uppercase tracking-wider"
                    >
                      <Copy className="w-3 h-3" /> COPY
                    </button>
                  </div>
                </div>
                </div>

                {/* Alternative: Absolute Path */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 font-bold text-[10px]">ALTERNATIVE</Badge>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 border border-amber-200 dark:border-amber-900">
                    <p className="text-[10px] text-amber-800 dark:text-amber-300 mb-2 font-medium leading-relaxed">
                      Use absolute path if you don't want to copy to /etc/wireguard:
                    </p>
                    <pre className="text-[10px] font-mono text-amber-900 dark:text-amber-200 leading-relaxed overflow-x-auto">
{`sudo wg-quick up /full/path/to/<username>.conf`}
                    </pre>
                  </div>
                </div>

                {/* Disconnect */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">DISCONNECT</p>
                  <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-4 border border-red-200 dark:border-red-900">
                    <code className="block text-[10px] font-mono text-red-900 dark:text-red-200">
                      sudo wg-quick down {user?.username || 'zecurx'}
                    </code>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl pt-10 border-t border-zinc-100 dark:border-zinc-800">
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-8 flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-zinc-300 dark:text-zinc-700" /> Infrastructure Q&A
          </h3>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`group border rounded-3xl transition-all duration-300 ${showFAQ === index ? 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 shadow-sm' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700'}`}
              >
                <button
                  onClick={() => setShowFAQ(showFAQ === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-bold text-zinc-800 dark:text-zinc-100 underline decoration-zinc-100 dark:decoration-zinc-800 underline-offset-8 decoration-2">{faq.question}</span>
                  <div className={`p-2 rounded-xl transition-all ${showFAQ === index ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rotate-180' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-700'}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>
                <AnimatePresence>
                  {showFAQ === index && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-3xl font-medium">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default VPNAccess;
