import GenericPage from '@/components/GenericPage';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const Blog = () => {
    return (
        <GenericPage
            title="Security Research"
            subtitle="Insights, analysis, and write-ups from the RLabZ team and community."
            size="lg"
        >
            <div className="grid gap-8 not-prose">
                {[
                    {
                        title: "Analyzing the XY-24 Ransomware Variant",
                        date: "Dec 20, 2024",
                        category: "Malware Analysis",
                        summary: "A deep dive into the encryption mechanisms of the latest ransomware strain affecting ICS systems."
                    },
                    {
                        title: "Kernel Exploitation Techniques in 2025",
                        date: "Dec 15, 2024",
                        category: "Exploitation",
                        summary: "New methods for bypassing KASLR and SMEP on modern Linux kernels."
                    },
                    {
                        title: "Zero-Knowledge Proofs for Authentication",
                        date: "Dec 10, 2024",
                        category: "Cryptography",
                        summary: "How ZK-SNARKs are reshaping secure identity verification without revealing secrets."
                    }
                ].map((post, i) => (
                    <Card key={i} className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer group">
                        <CardContent className="p-8">
                            <div className="flex items-center gap-4 mb-4">
                                <Badge variant="outline" className="border-green-500/50 text-green-400">{post.category}</Badge>
                                <span className="text-zinc-500 text-sm font-mono">{post.date}</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-green-400 transition-colors">{post.title}</h3>
                            <p className="text-zinc-400 leading-relaxed">{post.summary}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </GenericPage>
    );
};

export default Blog;
