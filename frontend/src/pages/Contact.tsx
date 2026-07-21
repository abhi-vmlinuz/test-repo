import GenericPage from '@/components/GenericPage';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Mail, MessageSquare } from 'lucide-react';

const Contact = () => {
    return (
        <GenericPage
            title="Contact Base"
            subtitle="Have questions about our platform, enterprise pricing, or custom CTF events? We are standing by."
            size="xl"
        >
            <div className="grid md:grid-cols-2 gap-12 not-prose">
                <div className="space-y-6">
                    <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-green-500" /> General Inquiries
                        </h3>
                        <p className="text-zinc-400 mb-4">For account support, partnerships, and general questions.</p>
                        <a href="mailto:contact@rajagiri.edu" className="text-white hover:text-green-400 font-mono transition-colors">contact@rajagiri.edu</a>
                    </div>

                    <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-blue-500" /> Enterprise Sales
                        </h3>
                        <p className="text-zinc-400 mb-4">For large teams and custom training deployments.</p>
                        <a href="mailto:sales@rajagiri.edu" className="text-white hover:text-blue-400 font-mono transition-colors">sales@rajagiri.edu</a>
                    </div>
                </div>

                <form className="space-y-4 bg-zinc-900/30 p-8 rounded-2xl border border-zinc-800/50">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">First Name</label>
                            <Input placeholder="John" className="bg-zinc-950 border-zinc-800" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Last Name</label>
                            <Input placeholder="Doe" className="bg-zinc-950 border-zinc-800" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Email</label>
                        <Input placeholder="john@company.com" type="email" className="bg-zinc-950 border-zinc-800" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Message</label>
                        <Textarea placeholder="How can we help you?" className="bg-zinc-950 border-zinc-800 min-h-[150px]" />
                    </div>

                    <Button className="w-full bg-white text-black hover:bg-zinc-200">Send Transmission</Button>
                </form>
            </div>
        </GenericPage>
    );
};

export default Contact;
