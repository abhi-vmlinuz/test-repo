import GenericPage from '@/components/GenericPage';
import { Button } from '@/components/ui/button';

const Careers = () => {
    return (
        <GenericPage
            title="Join the Red Team"
            subtitle="We are looking for elite talent to help us secure the next generation of digital infrastructure."
            size="xl"
        >
            <p>
                At RLabZ, we operate with the speed and agility of a startup but the discipline of a special operations unit. We value curiosity, technical excellence, and the hacker mindset.
            </p>

            <h3>Open Positions</h3>

            <div className="space-y-6 not-prose mt-8">
                {[
                    { title: "Senior Security Researcher", location: "Remote / New York", type: "Full-time" },
                    { title: "Frontend Engineer (React/WebGL)", location: "Remote", type: "Full-time" },
                    { title: "DevSecOps Engineer", location: "London", type: "Contract" },
                ].map((job, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between group hover:border-zinc-700 transition-colors">
                        <div>
                            <h4 className="text-xl font-bold text-white mb-1 group-hover:text-green-400 transition-colors">{job.title}</h4>
                            <p className="text-zinc-500 text-sm">{job.location} • {job.type}</p>
                        </div>
                        <Button variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800">
                            Apply Now
                        </Button>
                    </div>
                ))}
            </div>

            <div className="mt-12 p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <p className="mb-0 text-zinc-400 text-sm">
                    Don't see a role that fits? We are always looking for exceptional talent. Send your resume and GitHub profile to <span className="text-white font-mono">careers@rlabz.edu</span>.
                </p>
            </div>
        </GenericPage>
    );
};

export default Careers;
