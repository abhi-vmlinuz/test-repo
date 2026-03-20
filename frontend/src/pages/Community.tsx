import GenericPage from '@/components/GenericPage';
import { Button } from '@/components/ui/button';
import { MessageCircle, Github, Twitter } from 'lucide-react';

const Community = () => {
    return (
        <GenericPage
            title="Community Hub"
            subtitle="Join over 10,000 security professionals and students learning together."
            size="xl"
        >
            <div className="grid md:grid-cols-3 gap-6 not-prose mb-12">
                <div className="bg-[#5865F2]/10 border border-[#5865F2]/20 p-8 rounded-2xl flex flex-col items-center text-center">
                    <MessageCircle className="w-12 h-12 text-[#5865F2] mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Discord Server</h3>
                    <p className="text-zinc-400 text-sm mb-6">Chat with other players, get hints, and attend live workshops.</p>
                    <Button className="bg-[#5865F2] hover:bg-[#4752C4] text-white w-full">Join Discord</Button>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-2xl flex flex-col items-center text-center">
                    <Github className="w-12 h-12 text-white mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">GitHub</h3>
                    <p className="text-zinc-400 text-sm mb-6">Contribute to our open-source tools and challenge templates.</p>
                    <Button variant="outline" className="border-zinc-600 text-white hover:bg-zinc-800 w-full">View Repos</Button>
                </div>

                <div className="bg-[#1DA1F2]/10 border border-[#1DA1F2]/20 p-8 rounded-2xl flex flex-col items-center text-center">
                    <Twitter className="w-12 h-12 text-[#1DA1F2] mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Twitter / X</h3>
                    <p className="text-zinc-400 text-sm mb-6">Follow for challenge drops, platform updates, and security news.</p>
                    <Button className="bg-[#1DA1F2] hover:bg-[#1A91DA] text-white w-full">Follow Us</Button>
                </div>
            </div>

            <h3>Community Guidelines</h3>
            <p>
                We strive to maintain a welcoming and inclusive environment. Harassment, hate speech, and intolerance are not permitted.
            </p>
        </GenericPage>
    );
};

export default Community;
