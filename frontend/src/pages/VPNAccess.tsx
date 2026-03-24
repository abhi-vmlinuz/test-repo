import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../App';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Download, Shield, Wifi, WifiOff, RefreshCw, CheckCircle2,
  Terminal, Globe, Lock, Zap, HelpCircle, ChevronDown, ChevronUp,
  Copy, ExternalLink, Monitor
} from 'lucide-react';

// Nexus Engine URL for VPN endpoints
const NEXUS_URL = import.meta.env.VITE_NEXUS_URL || 'http://localhost:8081';

const VPNAccess = ({ user, logout }) => {
  const [vpnStatus, setVpnStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showFAQ, setShowFAQ] = useState<number | null>(null);

  useEffect(() => {
    fetchVPNStatus();
  }, []);

  const fetchVPNStatus = async () => {
    try {
      const response = await axios.get(`${NEXUS_URL}/api/v1/vpn/status`, {
        headers: { 'X-User-ID': user?.username || user?.id }
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

  const handleDownloadConfig = async () => {
    setDownloading(true);
    try {
      const response = await axios.get(`${NEXUS_URL}/api/v1/vpn/config`, {
        headers: { 'X-User-ID': user?.username || user?.id },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${user?.username || 'zecurx'}.conf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('VPN configuration downloaded!');
      // Refresh status after download
      fetchVPNStatus();
    } catch (error) {
      toast.error('Failed to download VPN configuration');
    } finally {
      setDownloading(false);
    }
  };

  const handleRegenerateConfig = async () => {
    setRegenerating(true);
    try {
      await axios.post(`${NEXUS_URL}/api/v1/vpn/regenerate`, {}, {
        headers: { 'X-User-ID': user?.username || user?.id }
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
    },
    {
      question: 'What if my VPN connection isn\'t working?',
      answer: 'Try regenerating your configuration using the button above. If issues persist, check your firewall settings and ensure UDP port 51820 is not blocked.'
    }
  ];

  if (loading) {
    return (
      <Layout user={user} logout={logout}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-zinc-900 rounded-xl animate-spin" />
            <p className="text-gray-500 font-mono text-sm">Loading VPN Status...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} logout={logout}>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Header */}
        <div className="border-b border-gray-100 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Network Access</h1>
          </div>
          <p className="text-gray-500 text-sm max-w-2xl">
            Connect to our secure lab network using WireGuard VPN. This gives you direct access to challenge environments and lab machines.
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* VPN Card - Main */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2"
          >
            <Card className="border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                      <img src="/wireguard.svg" alt="WireGuard" className="w-10 h-10" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">WireGuard VPN</h2>
                      <p className="text-zinc-400 text-sm">Secure tunnel to lab network</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {vpnStatus?.connected ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold">
                        <Wifi className="w-3 h-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge className="bg-zinc-700 text-zinc-400 border-zinc-600">
                        <WifiOff className="w-3 h-3 mr-1" />
                        Disconnected
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Status Info */}
                {vpnStatus?.has_vpn && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Your VPN IP</p>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-mono font-bold text-zinc-900">{vpnStatus.vpn_ip}</p>
                        <button 
                          onClick={() => copyToClipboard(vpnStatus.vpn_ip, 'VPN IP')}
                          className="p-1 text-gray-400 hover:text-zinc-900 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Active Sessions</p>
                      <p className="text-lg font-mono font-bold text-zinc-900">
                        {vpnStatus.allowed_pod_ips?.length || 0}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleDownloadConfig}
                    disabled={downloading}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-6 rounded-xl shadow-lg"
                  >
                    {downloading ? (
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5 mr-2" />
                    )}
                    {vpnStatus?.has_vpn ? 'Download Config' : 'Generate & Download'}
                  </Button>
                  
                  {vpnStatus?.has_vpn && (
                    <Button
                      onClick={handleRegenerateConfig}
                      disabled={regenerating}
                      variant="outline"
                      className="border-gray-200 text-gray-600 hover:bg-gray-50 py-6 rounded-xl"
                    >
                      {regenerating ? (
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-5 h-5 mr-2" />
                      )}
                      Regenerate
                    </Button>
                  )}
                </div>

                {/* Instructions */}
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <div className="flex gap-3">
                    <HelpCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-semibold mb-1">Quick Setup</p>
                      <ol className="list-decimal list-inside space-y-1 text-amber-700">
                        <li>Download and install WireGuard from <a href="https://wireguard.com/install" target="_blank" rel="noreferrer" className="underline">wireguard.com</a></li>
                        <li>Click "Download Config" to get your personal configuration</li>
                        <li>Import the <code className="bg-amber-100 px-1 rounded">.conf</code> file into WireGuard</li>
                        <li>Activate the tunnel and you're connected!</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Playground Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg">Playground</h3>
                  </div>
                  <p className="text-indigo-200 text-sm mb-4">
                    Need a quick attack box? Launch an in-browser Kali Linux environment.
                  </p>
                  <Badge className="bg-white/20 text-white border-white/30 text-xs">
                    Coming Soon
                  </Badge>
                </div>
              </Card>
            </motion.div>

            {/* Network Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-5">
                  <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Network Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">VPN Network</span>
                      <span className="font-mono text-zinc-900">10.8.0.0/24</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Lab Network</span>
                      <span className="font-mono text-zinc-900">10.42.0.0/16</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Protocol</span>
                      <span className="font-mono text-zinc-900">WireGuard</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Port</span>
                      <span className="font-mono text-zinc-900">51820/UDP</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Security Notice */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-emerald-100 bg-emerald-50/50">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Lock className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-emerald-900 text-sm">Secure by Design</h4>
                      <p className="text-emerald-700 text-xs mt-1">
                        Your VPN config is unique to your account. You can only access labs you have active sessions for.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-bold text-zinc-900 text-lg mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Frequently Asked Questions
              </h3>
              <div className="divide-y divide-gray-100">
                {faqs.map((faq, index) => (
                  <div key={index} className="py-4">
                    <button
                      onClick={() => setShowFAQ(showFAQ === index ? null : index)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <span className="font-medium text-zinc-900">{faq.question}</span>
                      {showFAQ === index ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    {showFAQ === index && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-gray-600 text-sm mt-2 pl-0"
                      >
                        {faq.answer}
                      </motion.p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </Layout>
  );
};

export default VPNAccess;
