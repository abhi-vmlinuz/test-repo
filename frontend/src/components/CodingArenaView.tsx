import { useState, useEffect } from 'react';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { API, toast } from '../App';
import TerminalComponent from '@/components/TerminalComponent';
import {
    Play,
    Cloud,
    CheckCircle2,
    XCircle,
    Copy,
    Check,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    Settings,
    Maximize2,
    Minimize2,
    Trash2,
    Terminal,
    FileCode,
    Plus,
    Square,
    AlertCircle
} from 'lucide-react';

interface TestCase {
    id?: number;
    input: string;
    expected: string;
    points: number;
    is_hidden: boolean;
}

interface TestResult {
    id: number;
    status: string;
    points: number;
    is_hidden: boolean;
    runtime_ms?: number;
    memory_kb?: number;
    stdout?: string;
    expected?: string;
    input?: string;
    error_message?: string;
}

interface EvaluationResult {
    submission_id?: string;
    status: string;
    score: number;
    max_score: number;
    all_passed: boolean;
    flag?: string;
    compile_error?: string;
    total_runtime_ms?: number;
    max_memory_kb?: number;
    test_cases: TestResult[];
    mode?: string;
}

interface CodingSubmission {
    id: string;
    status: string;
    score: number;
    max_score: number;
    source_code: string;
    language: string;
    created_at: string;
}

interface CodingArenaViewProps {
    challenge: any;
    user: any;
    onRefreshChallenge?: () => void;
}

const DEFAULT_STARTER_CODE: Record<string, string> = {
    c: `#include <stdio.h>
#include <stdlib.h>

// Implement your solution here
int main() {
    int n, target;
    if (scanf("%d", &n) != 1) return 0;
    int *arr = (int *)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }
    scanf("%d", &target);
    // TODO: Implement binary search
    int ans = -1;
    printf("%d\\n", ans);
    free(arr);
    return 0;
}
`,
    cpp: `#include <iostream>
#include <vector>

using namespace std;

// Implement your solution here
int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n, target;
    if (!(cin >> n)) return 0;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) {
        cin >> arr[i];
    }
    cin >> target;
    // TODO: Implement logic
    int ans = -1;
    cout << ans << "\\n";
    return 0;
}
`,
    python: `import sys

def solve():
    # Implement your solution here
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    arr = [int(x) for x in input_data[1:n+1]]
    target = int(input_data[n+1])
    # TODO: Implement binary search
    ans = -1
    print(ans)

if __name__ == "__main__":
    solve()
`
};

export default function CodingArenaView({ challenge, user, onRefreshChallenge }: CodingArenaViewProps) {
    const challengeLanguage = (challenge.language || 'c').toLowerCase();
    const [selectedLanguage, setSelectedLanguage] = useState<string>(
        challengeLanguage.includes('py') ? 'python' : challengeLanguage.includes('cpp') ? 'cpp' : 'c'
    );

    const initialCode = challenge.starter_code || challenge.starterCode || DEFAULT_STARTER_CODE[selectedLanguage] || DEFAULT_STARTER_CODE.c;
    const [sourceCode, setSourceCode] = useState<string>(initialCode);

    // Left Column Sub-tabs: 'description' | 'examples' | 'constraints' | 'notes'
    const [leftTab, setLeftTab] = useState<'description' | 'examples' | 'constraints' | 'notes'>('description');

    // Middle Column Console Sub-tabs: 'output' | 'terminal'
    const [consoleTab, setConsoleTab] = useState<'output' | 'terminal'>('output');
    const [isConsoleCollapsed, setIsConsoleCollapsed] = useState(false);
    const [consoleLogs, setConsoleLogs] = useState<string[]>([
        'Ready. Click "Run Code" to test visible cases, or "Submit Solution" for official evaluation.'
    ]);

    // Right Column Tabs: 'test_cases' | 'submissions'
    const [rightMainTab, setRightMainTab] = useState<'test_cases' | 'submissions'>('test_cases');
    // Right Column Sub-tabs under Test Cases: 'run_code' | 'custom_input'
    const [rightSubTab, setRightSubTab] = useState<'run_code' | 'custom_input'>('run_code');
    const [customInput, setCustomInput] = useState<string>('');

    // Accordion expand states for test cases
    const [expandedCases, setExpandedCases] = useState<Record<number, boolean>>({ 0: true, 1: true });

    // Execution & Evaluation
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);

    // Ephemeral container session
    const [dockerSession, setDockerSession] = useState<any>(null);
    const [startingDocker, setStartingDocker] = useState(false);
    const [stoppingDocker, setStoppingDocker] = useState(false);

    // Submissions
    const [submissions, setSubmissions] = useState<CodingSubmission[]>([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);

    // Copy states
    const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

    // Fullscreen editor
    const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);

    useEffect(() => {
        checkSession();
        fetchSubmissions();
    }, [challenge.id]);

    const checkSession = async () => {
        try {
            const res = await axios.get(`${API}/docker/challenge-session/${challenge.id}`);
            if (res.data && res.data.status === 'running') {
                setDockerSession(res.data);
            } else {
                setDockerSession(null);
            }
        } catch {
            setDockerSession(null);
        }
    };

    const fetchSubmissions = async () => {
        setLoadingSubmissions(true);
        try {
            const res = await axios.get(`${API}/challenges/${challenge.id}/coding-submissions`);
            if (res.data && Array.isArray(res.data)) {
                setSubmissions(res.data);
            }
        } catch (e) {
            console.error('Failed to load coding submissions:', e);
        } finally {
            setLoadingSubmissions(false);
        }
    };

    const handleStartDocker = async () => {
        setStartingDocker(true);
        try {
            const res = await axios.post(`${API}/docker/start/${challenge.id}`);
            if (res.data?.status === 'running') {
                setDockerSession(res.data);
                toast.success('Ephemeral Linux pod is ready at $HOME');
                setConsoleTab('terminal');
                setIsConsoleCollapsed(false);
            } else {
                toast.info('Starting pod environment...');
                setTimeout(checkSession, 3000);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Failed to start container pod');
        } finally {
            setStartingDocker(false);
        }
    };

    const handleStopDocker = async () => {
        if (!dockerSession?.session_id) return;
        setStoppingDocker(true);
        try {
            await axios.delete(`${API}/docker/stop/${dockerSession.session_id}`);
            setDockerSession(null);
            toast.info('Container environment stopped');
        } catch {
            toast.error('Failed to stop container');
        } finally {
            setStoppingDocker(false);
        }
    };

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedMap((prev) => ({ ...prev, [key]: true }));
        setTimeout(() => setCopiedMap((prev) => ({ ...prev, [key]: false })), 1500);
    };

    const toggleCaseExpand = (index: number) => {
        setExpandedCases((prev) => ({ ...prev, [index]: !prev[index] }));
    };

    const getFilename = () => {
        if (selectedLanguage === 'python') return 'solution.py';
        if (selectedLanguage === 'cpp') return 'main.cpp';
        return 'main.c';
    };

    // Run Code against sample test cases or custom input
    const handleRunCode = async () => {
        setIsRunning(true);
        setIsConsoleCollapsed(false);
        setConsoleTab('output');
        setConsoleLogs(['Compiling and executing code...']);

        try {
            const res = await axios.post(`${API}/challenges/${challenge.id}/coding-run`, {
                source_code: sourceCode,
                language: selectedLanguage,
                stdin: rightSubTab === 'custom_input' ? customInput : undefined
            });

            const data = res.data;
            const logs: string[] = ['Code compiled successfully.'];

            if (data.results) {
                setEvaluationResult(data.results);
                logs.push('Running against sample test cases...');
                if (data.results.test_cases) {
                    data.results.test_cases.forEach((tc: any, i: number) => {
                        logs.push(`Test Case ${i + 1}: ${tc.status} (${tc.runtime_ms || 1} ms)`);
                    });
                }
                if (data.results.all_passed) {
                    logs.push('All visible test cases passed!');
                }
            } else {
                logs.push(data.stdout || '(Program completed with no output)');
                if (data.stderr) logs.push(`STDERR: ${data.stderr}`);
            }

            setConsoleLogs(logs);
            toast.success('Run finished');
        } catch (err: any) {
            const msg = err.response?.data?.detail || 'Execution error';
            setConsoleLogs(['Compilation / Execution Failed:', msg]);
            toast.error(msg);
        } finally {
            setIsRunning(false);
        }
    };

    // Submit Solution for authoritative Judge0 scoring
    const handleSubmitSolution = async () => {
        setIsSubmitting(true);
        setIsConsoleCollapsed(false);
        setConsoleTab('output');
        setConsoleLogs(['Submitting solution to Judge0 evaluation queue...']);

        try {
            const res = await axios.post(`${API}/challenges/${challenge.id}/coding-submit`, {
                source_code: sourceCode,
                language: selectedLanguage,
            });

            const result: EvaluationResult = res.data;
            setEvaluationResult(result);
            fetchSubmissions();

            const logs: string[] = [];
            if (result.status === 'Compile Error') {
                logs.push('Compilation Error:');
                if (result.compile_error) logs.push(result.compile_error);
                toast.error('Compilation Error');
            } else {
                logs.push('Code compiled successfully.');
                logs.push(`Evaluation Status: ${result.status}`);
                logs.push(`Score: ${result.score} / ${result.max_score} points`);
                if (result.total_runtime_ms) logs.push(`Total Runtime: ${result.total_runtime_ms} ms`);

                if (result.all_passed) {
                    logs.push('🎉 All test cases passed! Full score awarded.');
                    if (result.flag) logs.push(`FLAG: ${result.flag}`);
                    toast.success(`Accepted! +${result.score} PTS`);
                    if (onRefreshChallenge) onRefreshChallenge();
                } else {
                    logs.push('Some test cases failed.');
                    toast.warning(`Verdict: ${result.status} (${result.score}/${result.max_score} pts)`);
                }
            }
            setConsoleLogs(logs);
        } catch (err: any) {
            const msg = err.response?.data?.detail || 'Submission failed';
            setConsoleLogs(['Submission Failed:', msg]);
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Extract test cases from challenge
    const testCases: TestCase[] = (() => {
        let raw = challenge.test_cases || challenge.testCases || [];
        if (typeof raw === 'string') {
            try {
                raw = JSON.parse(raw);
            } catch {
                raw = [];
            }
        }
        return Array.isArray(raw) ? raw : [];
    })();

    const visibleTestCases = testCases.filter((t) => !t.is_hidden);

    // Merge evaluation results with visible test cases
    const mergedTestCases = visibleTestCases.map((tc, idx) => {
        const evalTc = evaluationResult?.test_cases?.[idx];
        return {
            ...tc,
            status: evalTc ? evalTc.status : undefined,
            userOutput: evalTc ? evalTc.stdout : undefined,
            passed: evalTc ? evalTc.status === 'Passed' : undefined,
        };
    });

    const isSolved = challenge.user_progress?.solved || evaluationResult?.all_passed;

    return (
        <div className={`flex flex-col ${isEditorFullscreen ? 'fixed inset-0 z-50 p-4' : 'h-[calc(100vh-6rem)] -mx-4 lg:-mx-8'} bg-[#0b0f17] text-zinc-100 rounded-xl border border-[#1e293b] overflow-hidden shadow-2xl font-sans`}>
            {/* 3-COLUMN WORKSPACE */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-[#1e293b]">
                {/* ======================================================== */}
                {/* COLUMN 1: PROBLEM DETAILS (Left Column, ~28% width) */}
                {/* ======================================================== */}
                <div className="lg:w-[28%] flex flex-col min-h-0 bg-[#0d121d] overflow-y-auto">
                    {/* Header: Navigation + Badges + Title */}
                    <div className="p-4 border-b border-[#1e293b]/70 space-y-3">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                            <button className="p-1 hover:text-white rounded hover:bg-zinc-800 transition-colors">
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span>Problem {challenge.order || 1} of 5</span>
                            <button className="p-1 hover:text-white rounded hover:bg-zinc-800 transition-colors">
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
                                {challenge.difficulty || 'Easy'}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono text-zinc-300 bg-zinc-800/80 border border-zinc-700/60">
                                {challenge.points || 100} points
                            </span>
                            {isSolved && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/70 text-blue-400 border border-blue-800/60 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Solved
                                </span>
                            )}
                        </div>

                        <h1 className="text-xl font-bold tracking-tight text-white">
                            {challenge.title}
                        </h1>

                        <p className="text-xs text-zinc-400 leading-relaxed">
                            {challenge.description?.split('\n\n')[0] || 'Solve the problem following the constraints and specifications below.'}
                        </p>
                    </div>

                    {/* Sub-tabs: Description | Examples | Constraints | Notes */}
                    <div className="flex items-center border-b border-[#1e293b] px-3 bg-[#0a0e17]">
                        {(['description', 'examples', 'constraints', 'notes'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setLeftTab(tab)}
                                className={`px-3 py-2 text-xs font-medium capitalize border-b-2 transition-all ${
                                    leftTab === tab
                                        ? 'border-blue-500 text-blue-400'
                                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto text-xs text-zinc-300">
                        {leftTab === 'description' && (
                            <div className="space-y-4">
                                {challenge.description && (
                                    <div className="prose prose-invert prose-xs text-zinc-300 whitespace-pre-line leading-relaxed">
                                        {challenge.description}
                                    </div>
                                )}

                                {/* Examples inside Description view (matching mockup) */}
                                {visibleTestCases.slice(0, 2).map((tc, idx) => (
                                    <div key={idx} className="space-y-2 pt-2">
                                        <h3 className="font-semibold text-zinc-200">Example {idx + 1}</h3>
                                        {/* Input Box */}
                                        <div className="bg-[#111726] border border-[#1e293b] rounded-lg p-3 space-y-1">
                                            <div className="flex items-center justify-between text-zinc-400">
                                                <span>Input</span>
                                                <button
                                                    onClick={() => handleCopy(tc.input, `in-${idx}`)}
                                                    className="flex items-center gap-1 text-[11px] hover:text-white transition-colors"
                                                >
                                                    {copiedMap[`in-${idx}`] ? (
                                                        <Check className="w-3 h-3 text-emerald-400" />
                                                    ) : (
                                                        <Copy className="w-3 h-3" />
                                                    )}
                                                    <span>{copiedMap[`in-${idx}`] ? 'Copied' : 'Copy'}</span>
                                                </button>
                                            </div>
                                            <pre className="font-mono text-zinc-200 whitespace-pre-wrap">{tc.input}</pre>
                                        </div>
                                        {/* Output Box */}
                                        <div className="bg-[#111726] border border-[#1e293b] rounded-lg p-3 space-y-1">
                                            <div className="flex items-center justify-between text-zinc-400">
                                                <span>Output</span>
                                                <button
                                                    onClick={() => handleCopy(tc.expected, `out-${idx}`)}
                                                    className="flex items-center gap-1 text-[11px] hover:text-white transition-colors"
                                                >
                                                    {copiedMap[`out-${idx}`] ? (
                                                        <Check className="w-3 h-3 text-emerald-400" />
                                                    ) : (
                                                        <Copy className="w-3 h-3" />
                                                    )}
                                                    <span>{copiedMap[`out-${idx}`] ? 'Copied' : 'Copy'}</span>
                                                </button>
                                            </div>
                                            <pre className="font-mono text-zinc-200 whitespace-pre-wrap">{tc.expected}</pre>
                                        </div>
                                    </div>
                                ))}

                                {/* Constraints */}
                                <div className="space-y-2 pt-3 border-t border-[#1e293b]">
                                    <h3 className="font-semibold text-zinc-200">Constraints</h3>
                                    <ul className="space-y-1 text-zinc-400 list-disc list-inside font-mono text-[11px]">
                                        <li>1 ≤ n ≤ 10⁵</li>
                                        <li>-10⁹ ≤ arr[i] ≤ 10⁹</li>
                                        <li>-10⁹ ≤ target ≤ 10⁹</li>
                                        <li>Time limit: {challenge.time_limit_ms || 2000} ms</li>
                                        <li>Memory limit: {challenge.memory_limit_mb || 128} MB</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {leftTab === 'examples' && (
                            <div className="space-y-4">
                                {visibleTestCases.map((tc, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <h3 className="font-semibold text-zinc-200">Example {idx + 1}</h3>
                                        <div className="bg-[#111726] border border-[#1e293b] rounded-lg p-3 space-y-1">
                                            <div className="flex items-center justify-between text-zinc-400">
                                                <span>Input</span>
                                                <button
                                                    onClick={() => handleCopy(tc.input, `ex-in-${idx}`)}
                                                    className="flex items-center gap-1 text-[11px] hover:text-white"
                                                >
                                                    {copiedMap[`ex-in-${idx}`] ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                    <span>Copy</span>
                                                </button>
                                            </div>
                                            <pre className="font-mono text-zinc-200">{tc.input}</pre>
                                        </div>
                                        <div className="bg-[#111726] border border-[#1e293b] rounded-lg p-3 space-y-1">
                                            <div className="flex items-center justify-between text-zinc-400">
                                                <span>Expected Output</span>
                                                <button
                                                    onClick={() => handleCopy(tc.expected, `ex-out-${idx}`)}
                                                    className="flex items-center gap-1 text-[11px] hover:text-white"
                                                >
                                                    {copiedMap[`ex-out-${idx}`] ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                    <span>Copy</span>
                                                </button>
                                            </div>
                                            <pre className="font-mono text-zinc-200">{tc.expected}</pre>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {leftTab === 'constraints' && (
                            <div className="space-y-3">
                                <h3 className="font-semibold text-zinc-200">Execution Constraints</h3>
                                <div className="p-3 bg-[#111726] border border-[#1e293b] rounded-lg space-y-2 font-mono text-xs text-zinc-300">
                                    <p>• Time Limit: <span className="text-blue-400">{challenge.time_limit_ms || 2000} ms</span> per test case</p>
                                    <p>• Memory Limit: <span className="text-blue-400">{challenge.memory_limit_mb || 128} MB</span></p>
                                    <p>• Input Format: Read from Standard Input (<code className="text-emerald-400">stdin</code>)</p>
                                    <p>• Output Format: Write to Standard Output (<code className="text-emerald-400">stdout</code>)</p>
                                </div>
                            </div>
                        )}

                        {leftTab === 'notes' && (
                            <div className="space-y-3">
                                <h3 className="font-semibold text-zinc-200">Notes & Hints</h3>
                                <p className="text-zinc-400 leading-relaxed">
                                    You can test your solution with the built-in terminal or by running sample cases. When using C/C++, all compiler warnings are treated seriously and <code className="text-zinc-200">-O2</code> optimization is applied.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ======================================================== */}
                {/* COLUMN 2: CODE EDITOR & OUTPUT/TERMINAL (~44% width) */}
                {/* ======================================================== */}
                <div className="lg:w-[44%] flex flex-col min-h-0 bg-[#0e131f]">
                    {/* Editor Header Bar (Matching Mockup) */}
                    <div className="flex items-center justify-between px-3 py-2 bg-[#0d121d] border-b border-[#1e293b]">
                        <div className="flex items-center gap-1.5">
                            {/* Active Tab */}
                            <div className="flex items-center gap-2 px-3 py-1 bg-[#141b2d] border border-blue-500/30 rounded text-xs font-mono text-blue-400">
                                <FileCode className="w-3.5 h-3.5" />
                                <span>{getFilename()}</span>
                            </div>
                            <button
                                className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                                title="New file"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Language Selector Dropdown */}
                            <select
                                value={selectedLanguage}
                                onChange={(e) => {
                                    const lang = e.target.value;
                                    setSelectedLanguage(lang);
                                    if (!sourceCode.trim() || Object.values(DEFAULT_STARTER_CODE).includes(sourceCode.trim())) {
                                        setSourceCode(DEFAULT_STARTER_CODE[lang] || '');
                                    }
                                }}
                                className="bg-[#141b2d] border border-[#1e293b] text-xs font-mono text-zinc-200 rounded px-2.5 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value="c">C (GCC 13)</option>
                                <option value="cpp">C++ (G++ 13)</option>
                                <option value="python">Python 3.12</option>
                            </select>

                            {/* Settings Icon */}
                            <button
                                className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                                title="Settings"
                            >
                                <Settings className="w-3.5 h-3.5" />
                            </button>

                            {/* Fullscreen Toggle */}
                            <button
                                onClick={() => setIsEditorFullscreen(!isEditorFullscreen)}
                                className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                                title={isEditorFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                            >
                                {isEditorFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>

                    {/* Monaco Editor Pane */}
                    <div className="flex-1 min-h-[260px] relative bg-[#1e1e1e]">
                        <Editor
                            height="100%"
                            language={selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage}
                            theme="vs-dark"
                            value={sourceCode}
                            onChange={(val) => setSourceCode(val || '')}
                            options={{
                                fontSize: 13,
                                fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                lineNumbers: 'on',
                                renderLineHighlight: 'all',
                                bracketPairColorization: { enabled: true },
                                tabSize: 4,
                                automaticLayout: true,
                            }}
                        />
                    </div>

                    {/* Bottom Console Panel: Output | Terminal ($HOME) (Matching Mockup) */}
                    <div className={`border-t border-[#1e293b] flex flex-col bg-[#0b0f17] transition-all duration-200 ${isConsoleCollapsed ? 'h-9' : 'h-48'}`}>
                        {/* Console Header */}
                        <div className="flex items-center justify-between px-3 bg-[#0d121d] border-b border-[#1e293b]/80 h-9 shrink-0">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setConsoleTab('output');
                                        setIsConsoleCollapsed(false);
                                    }}
                                    className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                                        consoleTab === 'output' && !isConsoleCollapsed
                                            ? 'border-blue-500 text-blue-400'
                                            : 'border-transparent text-zinc-400 hover:text-zinc-200'
                                    }`}
                                >
                                    Output
                                </button>
                                <button
                                    onClick={() => {
                                        setConsoleTab('terminal');
                                        setIsConsoleCollapsed(false);
                                    }}
                                    className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                                        consoleTab === 'terminal' && !isConsoleCollapsed
                                            ? 'border-blue-500 text-blue-400'
                                            : 'border-transparent text-zinc-400 hover:text-zinc-200'
                                    }`}
                                >
                                    <Terminal className="w-3.5 h-3.5" />
                                    <span>Terminal</span>
                                    {dockerSession && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    )}
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                {consoleTab === 'output' && (
                                    <button
                                        onClick={() => setConsoleLogs(['Cleared.'])}
                                        className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                                        title="Clear Output"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Clear</span>
                                    </button>
                                )}

                                <button
                                    onClick={() => setIsConsoleCollapsed(!isConsoleCollapsed)}
                                    className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                                    title={isConsoleCollapsed ? 'Expand Console' : 'Collapse Console'}
                                >
                                    {isConsoleCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>

                        {/* Console Body */}
                        {!isConsoleCollapsed && (
                            <div className="flex-1 min-h-0 overflow-y-auto p-3 font-mono text-xs">
                                {consoleTab === 'output' ? (
                                    <div className="space-y-1">
                                        {consoleLogs.map((log, i) => {
                                            const isSuccess = log.includes('passed') || log.includes('successfully') || log.includes('Passed');
                                            const isError = log.includes('Error') || log.includes('Failed') || log.includes('STDERR');
                                            return (
                                                <p
                                                    key={i}
                                                    className={`${
                                                        isSuccess
                                                            ? 'text-emerald-400'
                                                            : isError
                                                            ? 'text-red-400'
                                                            : 'text-zinc-300'
                                                    }`}
                                                >
                                                    {log}
                                                </p>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    /* Interactive Terminal inside Console */
                                    <div className="h-full">
                                        {dockerSession?.session_id ? (
                                            <TerminalComponent sessionId={dockerSession.session_id} />
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                                                <p className="text-zinc-400 text-xs">
                                                    Ephemeral Linux Pod is not currently running.
                                                </p>
                                                <button
                                                    onClick={handleStartDocker}
                                                    disabled={startingDocker}
                                                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded text-xs transition-colors"
                                                >
                                                    {startingDocker ? 'Starting Pod...' : 'Start Linux Terminal at $HOME'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ======================================================== */}
                {/* COLUMN 3: TEST CASES & SUBMISSIONS (~28% width) */}
                {/* ======================================================== */}
                <div className="lg:w-[28%] flex flex-col min-h-0 bg-[#0d121d]">
                    {/* Header Tabs: Test Cases | Submissions */}
                    <div className="flex items-center border-b border-[#1e293b] px-3 bg-[#0a0e17]">
                        <button
                            onClick={() => setRightMainTab('test_cases')}
                            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
                                rightMainTab === 'test_cases'
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            Test Cases
                        </button>
                        <button
                            onClick={() => setRightMainTab('submissions')}
                            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                                rightMainTab === 'submissions'
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            <span>Submissions</span>
                            {submissions.length > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-zinc-300 font-mono">
                                    {submissions.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Sub-tabs under Test Cases: Run Code | Custom Input */}
                    {rightMainTab === 'test_cases' && (
                        <div className="flex items-center gap-4 px-4 py-2 border-b border-[#1e293b]/70 bg-[#0e131f] text-xs font-medium">
                            <button
                                onClick={() => setRightSubTab('run_code')}
                                className={`${
                                    rightSubTab === 'run_code' ? 'text-blue-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                Run Code
                            </button>
                            <button
                                onClick={() => setRightSubTab('custom_input')}
                                className={`${
                                    rightSubTab === 'custom_input' ? 'text-blue-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                Custom Input
                            </button>
                        </div>
                    )}

                    {/* Content Section */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                        {rightMainTab === 'test_cases' ? (
                            rightSubTab === 'run_code' ? (
                                <div className="space-y-4">
                                    <div>
                                        <h2 className="text-sm font-bold text-white">Sample Test Cases</h2>
                                        <p className="text-xs text-zinc-400">Run your code against the visible test cases.</p>
                                    </div>

                                    {/* Test Case Cards List */}
                                    <div className="space-y-3">
                                        {mergedTestCases.map((tc, idx) => {
                                            const isExpanded = expandedCases[idx] ?? true;
                                            return (
                                                <div
                                                    key={idx}
                                                    className="bg-[#111726] border border-[#1e293b] rounded-lg overflow-hidden"
                                                >
                                                    {/* Card Header */}
                                                    <div
                                                        onClick={() => toggleCaseExpand(idx)}
                                                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-800/30 transition-colors select-none"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`w-2 h-2 rounded-full ${
                                                                    tc.passed === true
                                                                        ? 'bg-emerald-400'
                                                                        : tc.passed === false
                                                                        ? 'bg-red-400'
                                                                        : 'bg-zinc-500'
                                                                }`}
                                                            />
                                                            <span className="font-semibold text-xs text-zinc-200">
                                                                Test Case {idx + 1}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {tc.passed !== undefined && (
                                                                <span
                                                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                                                        tc.passed
                                                                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                                                                            : 'bg-red-950/80 text-red-400 border border-red-800/80'
                                                                    }`}
                                                                >
                                                                    {tc.passed ? 'Passed' : 'Failed'}
                                                                </span>
                                                            )}
                                                            <button className="text-zinc-400 hover:text-white">
                                                                {isExpanded ? (
                                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                                ) : (
                                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Card Body */}
                                                    {isExpanded && (
                                                        <div className="p-3 pt-0 space-y-2.5 text-xs font-mono border-t border-[#1e293b]/60">
                                                            <div>
                                                                <span className="text-[11px] text-zinc-400 block mb-1">
                                                                    Input (stdin)
                                                                </span>
                                                                <pre className="bg-[#0b0f17] p-2.5 rounded border border-[#1e293b] text-zinc-200 whitespace-pre-wrap">
                                                                    {tc.input}
                                                                </pre>
                                                            </div>

                                                            <div>
                                                                <span className="text-[11px] text-zinc-400 block mb-1">
                                                                    Expected Output
                                                                </span>
                                                                <pre className="bg-[#0b0f17] p-2.5 rounded border border-[#1e293b] text-zinc-200 whitespace-pre-wrap">
                                                                    {tc.expected}
                                                                </pre>
                                                            </div>

                                                            {tc.userOutput !== undefined && (
                                                                <div>
                                                                    <span className="text-[11px] text-zinc-400 block mb-1">
                                                                        Your Output
                                                                    </span>
                                                                    <pre
                                                                        className={`bg-[#0b0f17] p-2.5 rounded border ${
                                                                            tc.passed
                                                                                ? 'border-emerald-800/70 text-emerald-300'
                                                                                : 'border-red-800/70 text-red-300'
                                                                        } whitespace-pre-wrap`}
                                                                    >
                                                                        {tc.userOutput || '(empty output)'}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                /* Custom Input Tab */
                                <div className="space-y-3">
                                    <h2 className="text-sm font-bold text-white">Custom Stdin</h2>
                                    <p className="text-xs text-zinc-400">
                                        Type inputs to feed into <code className="text-blue-400">stdin</code> when clicking "Run Code".
                                    </p>
                                    <textarea
                                        value={customInput}
                                        onChange={(e) => setCustomInput(e.target.value)}
                                        placeholder="5&#10;1 2 3 4 5&#10;3"
                                        rows={8}
                                        className="w-full bg-[#0b0f17] border border-[#1e293b] rounded-lg p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            )
                        ) : (
                            /* Submissions History Tab */
                            <div className="space-y-3">
                                <h2 className="text-sm font-bold text-white">Submission History</h2>
                                {loadingSubmissions ? (
                                    <p className="text-xs text-zinc-500">Loading submissions...</p>
                                ) : submissions.length === 0 ? (
                                    <p className="text-xs text-zinc-500">No submissions yet for this problem.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {submissions.map((sub) => (
                                            <div
                                                key={sub.id}
                                                className="p-3 bg-[#111726] border border-[#1e293b] rounded-lg space-y-1.5 text-xs font-mono"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            sub.status === 'Accepted'
                                                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                                                : 'bg-red-950 text-red-400 border border-red-800'
                                                        }`}
                                                    >
                                                        {sub.status}
                                                    </span>
                                                    <span className="text-zinc-400">
                                                        {sub.score}/{sub.max_score} pts
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                                                    <span>{new Date(sub.created_at).toLocaleTimeString()}</span>
                                                    <button
                                                        onClick={() => {
                                                            setSourceCode(sub.source_code);
                                                            if (sub.language) setSelectedLanguage(sub.language);
                                                            toast.success('Restored code to editor');
                                                        }}
                                                        className="text-blue-400 hover:underline"
                                                    >
                                                        Restore Code
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Bottom Sticky Action Bar (Matching Mockup) */}
                    <div className="p-3 bg-[#0a0e17] border-t border-[#1e293b] flex items-center justify-between gap-3">
                        {/* Run Code Button */}
                        <button
                            onClick={handleRunCode}
                            disabled={isRunning || isSubmitting}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-[#172033] hover:bg-[#1e2a42] text-zinc-200 border border-[#273552] rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
                            <span>{isRunning ? 'Running...' : 'Run Code'}</span>
                        </button>

                        {/* Submit Solution Button */}
                        <button
                            onClick={handleSubmitSolution}
                            disabled={isRunning || isSubmitting}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-900/30 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Cloud className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-pulse' : ''}`} />
                            <span>{isSubmitting ? 'Grading...' : 'Submit Solution'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
