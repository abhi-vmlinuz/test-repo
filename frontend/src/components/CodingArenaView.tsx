import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
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
    AlertCircle,
    RefreshCw
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
    const [terminalKey, setTerminalKey] = useState(0);

    // Submissions
    const [submissions, setSubmissions] = useState<CodingSubmission[]>([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);

    // Copy states
    const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

    // Fullscreen editor
    const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
    const arenaContainerRef = useRef<HTMLDivElement>(null);

    // Editor settings
    const [fontSize, setFontSize] = useState<number>(13);
    const [wordWrap, setWordWrap] = useState<'on' | 'off'>('off');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setIsSettingsOpen(false);
            }
        };
        if (isSettingsOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSettingsOpen]);

    // Resizable Console Height
    const [consoleHeight, setConsoleHeight] = useState(300);
    const [isDraggingConsole, setIsDraggingConsole] = useState(false);
    const dragStartYRef = useRef(0);
    const dragStartHeightRef = useRef(300);

    const handleConsoleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDraggingConsole(true);
        dragStartYRef.current = e.clientY;
        dragStartHeightRef.current = consoleHeight;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const delta = dragStartYRef.current - moveEvent.clientY;
            const newHeight = Math.max(120, Math.min(window.innerHeight - 200, dragStartHeightRef.current + delta));
            setConsoleHeight(newHeight);
            setIsConsoleCollapsed(false);
        };

        const onMouseUp = () => {
            setIsDraggingConsole(false);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            if (arenaContainerRef.current?.requestFullscreen) {
                arenaContainerRef.current.requestFullscreen().catch(() => {
                    setIsEditorFullscreen(true);
                });
            } else {
                setIsEditorFullscreen(true);
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {
                    setIsEditorFullscreen(false);
                });
            } else {
                setIsEditorFullscreen(false);
            }
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsEditorFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

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
        const sessId = dockerSession?.session_id;
        if (!sessId) return;
        setDockerSession(null);
        setStoppingDocker(true);
        try {
            await axios.delete(`${API}/docker/stop/${sessId}`);
            toast.info('Terminal pod destroyed');
        } catch {
            // Already destroyed or 404
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
                        if (tc.stdout) {
                            logs.push(`  Output: ${tc.stdout.trim()}`);
                        }
                    });
                }
                if (data.results.all_passed) {
                    logs.push('✔ All visible test cases passed!');
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

    const renderMarkdown = (content: string) => {
        try {
            const raw = marked.parse(content || '', { breaks: true, gfm: true }) as string;
            return { __html: DOMPurify.sanitize(raw) };
        } catch {
            return { __html: content || '' };
        }
    };

    return (
        <div
            ref={arenaContainerRef}
            className={`flex flex-col ${
                isEditorFullscreen
                    ? 'fixed inset-0 z-[99999] w-screen h-screen m-0 p-0 rounded-none border-0'
                    : 'h-[calc(100vh-4.8rem)] w-full rounded-xl border border-zinc-200 shadow-sm'
            } bg-white text-zinc-900 overflow-hidden font-sans coding-arena ${
                isDraggingConsole ? 'select-none cursor-row-resize' : ''
            }`}
        >
            {/* 3-COLUMN WORKSPACE */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200">
                {/* ======================================================== */}
                {/* COLUMN 1: PROBLEM DETAILS (Left Column, ~28% width) */}
                {/* ======================================================== */}
                <div className="lg:w-[28%] flex flex-col min-h-0 bg-white overflow-y-auto">
                    {/* Header: Badges + Title */}
                    <div className="p-4 border-b border-zinc-200 space-y-2.5">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {challenge.difficulty || 'Easy'}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono text-zinc-700 bg-zinc-100 border border-zinc-200">
                                {challenge.points || 100} points
                            </span>
                            {isSolved && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Solved
                                </span>
                            )}
                        </div>

                        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                            {challenge.title}
                        </h1>
                    </div>

                    {/* Sub-tabs: Description | Examples | Constraints | Notes */}
                    <div className="flex items-center border-b border-zinc-200 px-3 bg-zinc-50">
                        {(['description', 'examples', 'constraints', 'notes'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setLeftTab(tab)}
                                className={`px-3 py-2 text-xs font-medium capitalize border-b-2 transition-all ${
                                    leftTab === tab
                                        ? 'border-blue-600 text-blue-600 font-semibold'
                                        : 'border-transparent text-zinc-500 hover:text-zinc-800'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto text-xs text-zinc-700">
                        {leftTab === 'description' && (
                            <div className="space-y-4">
                                {challenge.description && (
                                    <div 
                                        className="coding-arena-markdown text-xs text-zinc-700 leading-relaxed"
                                        dangerouslySetInnerHTML={renderMarkdown(challenge.description)}
                                    />
                                )}

                                {/* Examples inside Description view */}
                                {visibleTestCases.slice(0, 2).map((tc, idx) => (
                                    <div key={idx} className="space-y-2 pt-2">
                                        <h3 className="font-semibold text-zinc-900">Example {idx + 1}</h3>
                                        {/* Input Box */}
                                        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-1">
                                            <div className="flex items-center justify-between text-zinc-500">
                                                <span>Input</span>
                                                <button
                                                    onClick={() => handleCopy(tc.input, `in-${idx}`)}
                                                    className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900 transition-colors"
                                                >
                                                    {copiedMap[`in-${idx}`] ? (
                                                        <Check className="w-3 h-3 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="w-3 h-3" />
                                                    )}
                                                    <span>{copiedMap[`in-${idx}`] ? 'Copied' : 'Copy'}</span>
                                                </button>
                                            </div>
                                            <pre className="!bg-white !p-2 !rounded border border-zinc-200 font-mono text-zinc-800 text-xs whitespace-pre-wrap">{tc.input}</pre>
                                        </div>
                                        {/* Output Box */}
                                        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-1">
                                            <div className="flex items-center justify-between text-zinc-500">
                                                <span>Output</span>
                                                <button
                                                    onClick={() => handleCopy(tc.expected, `out-${idx}`)}
                                                    className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900 transition-colors"
                                                >
                                                    {copiedMap[`out-${idx}`] ? (
                                                        <Check className="w-3 h-3 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="w-3 h-3" />
                                                    )}
                                                    <span>{copiedMap[`out-${idx}`] ? 'Copied' : 'Copy'}</span>
                                                </button>
                                            </div>
                                            <pre className="!bg-white !p-2 !rounded border border-zinc-200 font-mono text-zinc-800 text-xs whitespace-pre-wrap">{tc.expected}</pre>
                                        </div>
                                    </div>
                                ))}

                                {/* Constraints */}
                                <div className="space-y-2 pt-3 border-t border-zinc-200">
                                    <h3 className="font-semibold text-zinc-900">Constraints</h3>
                                    <ul className="space-y-1 text-zinc-600 list-disc list-inside font-mono text-[11px]">
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
                                        <h3 className="font-semibold text-zinc-900">Example {idx + 1}</h3>
                                        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-1">
                                            <div className="flex items-center justify-between text-zinc-500">
                                                <span>Input</span>
                                                <button
                                                    onClick={() => handleCopy(tc.input, `ex-in-${idx}`)}
                                                    className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900"
                                                >
                                                    {copiedMap[`ex-in-${idx}`] ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                                    <span>Copy</span>
                                                </button>
                                            </div>
                                            <pre className="!bg-white !p-2 !rounded border border-zinc-200 font-mono text-zinc-800 text-xs whitespace-pre-wrap">{tc.input}</pre>
                                        </div>
                                        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-1">
                                            <div className="flex items-center justify-between text-zinc-500">
                                                <span>Expected Output</span>
                                                <button
                                                    onClick={() => handleCopy(tc.expected, `ex-out-${idx}`)}
                                                    className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900"
                                                >
                                                    {copiedMap[`ex-out-${idx}`] ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                                    <span>Copy</span>
                                                </button>
                                            </div>
                                            <pre className="!bg-white !p-2 !rounded border border-zinc-200 font-mono text-zinc-800 text-xs whitespace-pre-wrap">{tc.expected}</pre>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {leftTab === 'constraints' && (
                            <div className="space-y-3">
                                <h3 className="font-semibold text-zinc-900">Execution Constraints</h3>
                                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2 font-mono text-xs text-zinc-700">
                                    <p>• Time Limit: <span className="text-blue-600 font-medium">{challenge.time_limit_ms || 2000} ms</span> per test case</p>
                                    <p>• Memory Limit: <span className="text-blue-600 font-medium">{challenge.memory_limit_mb || 128} MB</span></p>
                                    <p>• Input Format: Read from Standard Input (<code className="text-emerald-700 font-medium">stdin</code>)</p>
                                    <p>• Output Format: Write to Standard Output (<code className="text-emerald-700 font-medium">stdout</code>)</p>
                                </div>
                            </div>
                        )}

                        {leftTab === 'notes' && (
                            <div className="space-y-3">
                                <h3 className="font-semibold text-zinc-900">Notes & Hints</h3>
                                <p className="text-zinc-600 leading-relaxed">
                                    You can test your solution with the built-in terminal or by running sample cases. When using C/C++, all compiler warnings are treated seriously and <code className="text-zinc-800 font-medium">-O2</code> optimization is applied.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ======================================================== */}
                {/* COLUMN 2: CODE EDITOR & OUTPUT/TERMINAL (~44% width) */}
                {/* ======================================================== */}
                <div className="lg:w-[44%] flex flex-col min-h-0 bg-white">
                    {/* Editor Header Bar */}
                    <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 border-b border-zinc-200">
                        <div className="flex items-center gap-1.5">
                            {/* Active Tab */}
                            <div className="flex items-center gap-2 px-3 py-1 bg-white border border-zinc-200 rounded text-xs font-mono text-zinc-800 shadow-xs">
                                <FileCode className="w-3.5 h-3.5 text-zinc-500" />
                                <span>{getFilename()}</span>
                            </div>
                            <button
                                className="p-1 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-200 transition-colors"
                                title="New file"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Challenge Language Badge */}
                            <span className="px-2.5 py-1 text-xs font-mono font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 rounded">
                                {selectedLanguage === 'python' ? 'Python 3.12' : selectedLanguage === 'cpp' ? 'C++ (G++ 13)' : 'C (GCC 13)'}
                            </span>

                            {/* Settings Icon & Popover */}
                            <div className="relative" ref={settingsRef}>
                                <button
                                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                    className={`p-1.5 rounded transition-colors ${
                                        isSettingsOpen
                                            ? 'bg-zinc-200 text-zinc-900'
                                            : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
                                    }`}
                                    title="Editor Settings"
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                </button>

                                {isSettingsOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 p-3 space-y-3 text-xs">
                                        <div className="font-semibold text-zinc-900 pb-1 border-b border-zinc-100">
                                            Editor Settings
                                        </div>
                                        <div>
                                            <label className="text-zinc-500 block mb-1.5 font-medium">Font Size</label>
                                            <div className="grid grid-cols-4 gap-1">
                                                {[12, 13, 14, 16].map((sz) => (
                                                    <button
                                                        key={sz}
                                                        onClick={() => setFontSize(sz)}
                                                        className={`py-1 text-center font-mono rounded border transition-colors ${
                                                            fontSize === sz
                                                                ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                                                                : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                                                        }`}
                                                    >
                                                        {sz}px
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-zinc-500 block mb-1.5 font-medium">Word Wrap</label>
                                            <div className="grid grid-cols-2 gap-1">
                                                {(['off', 'on'] as const).map((mode) => (
                                                    <button
                                                        key={mode}
                                                        onClick={() => setWordWrap(mode)}
                                                        className={`py-1 text-center capitalize rounded border transition-colors ${
                                                            wordWrap === mode
                                                                ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                                                                : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                                                        }`}
                                                    >
                                                        {mode}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Fullscreen Toggle */}
                            <button
                                onClick={toggleFullscreen}
                                className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded hover:bg-zinc-200 transition-colors"
                                title={isEditorFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                            >
                                {isEditorFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>

                    {/* Monaco Editor Pane */}
                    <div className="flex-1 min-h-[260px] relative bg-white">
                        <Editor
                            height="100%"
                            language={selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage}
                            theme="vs"
                            value={sourceCode}
                            onChange={(val) => setSourceCode(val || '')}
                            options={{
                                fontSize,
                                wordWrap,
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

                    {/* Resizable Divider Handle */}
                    <div
                        onMouseDown={handleConsoleMouseDown}
                        className={`h-2.5 bg-zinc-100 hover:bg-blue-500/20 cursor-row-resize transition-colors flex items-center justify-center border-t border-b border-zinc-200 select-none group ${
                            isDraggingConsole ? 'bg-blue-500/30' : ''
                        }`}
                        title="Drag upwards/downwards to resize terminal"
                    >
                        <div className="w-10 h-1 rounded-full bg-zinc-300 group-hover:bg-blue-600 transition-colors" />
                    </div>

                    {/* Bottom Console Panel: Output | Terminal ($HOME) */}
                    <div
                        style={{ height: isConsoleCollapsed ? '36px' : `${consoleHeight}px` }}
                        className="flex flex-col bg-white transition-[height] duration-75 min-h-[36px]"
                    >
                        {/* Console Header */}
                        <div className="flex items-center justify-between px-3 bg-zinc-50 border-b border-zinc-200 h-9 shrink-0">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setConsoleTab('output');
                                        setIsConsoleCollapsed(false);
                                    }}
                                    className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                                        consoleTab === 'output' && !isConsoleCollapsed
                                            ? 'border-blue-600 text-blue-600 font-semibold'
                                            : 'border-transparent text-zinc-500 hover:text-zinc-800'
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
                                            ? 'border-blue-600 text-blue-600 font-semibold'
                                            : 'border-transparent text-zinc-500 hover:text-zinc-800'
                                    }`}
                                >
                                    <Terminal className="w-3.5 h-3.5" />
                                    <span>Terminal</span>
                                    {dockerSession && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    )}
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                {consoleTab === 'terminal' && dockerSession && (
                                    <>
                                        <button
                                            onClick={() => setTerminalKey((prev) => prev + 1)}
                                            className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded transition-colors"
                                            title="Reconnect terminal shell without stopping pod"
                                        >
                                            <RefreshCw className="w-2.5 h-2.5" />
                                            <span>Reconnect</span>
                                        </button>
                                        <button
                                            onClick={handleStopDocker}
                                            disabled={stoppingDocker}
                                            className="flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-300 rounded transition-colors"
                                            title="End session and destroy pod"
                                        >
                                            <Square className="w-2.5 h-2.5 fill-current" />
                                            <span>{stoppingDocker ? 'Destroying...' : 'Stop Pod'}</span>
                                        </button>
                                    </>
                                )}

                                {consoleTab === 'output' && (
                                    <button
                                        onClick={() => setConsoleLogs(['Cleared.'])}
                                        className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200 rounded transition-colors"
                                        title="Clear Output"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Clear</span>
                                    </button>
                                )}

                                <button
                                    onClick={() => setIsConsoleCollapsed(!isConsoleCollapsed)}
                                    className="p-1 text-zinc-500 hover:text-zinc-800 rounded hover:bg-zinc-200 transition-colors"
                                    title={isConsoleCollapsed ? 'Expand Console' : 'Collapse Console'}
                                >
                                    {isConsoleCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>

                        {/* Console Body */}
                        {!isConsoleCollapsed && (
                            <div className="flex-1 min-h-0 relative bg-white">
                                {/* Output Tab */}
                                <div
                                    className={`h-full w-full overflow-y-auto p-3 font-mono text-xs ${
                                        consoleTab === 'output' ? 'block' : 'hidden'
                                    }`}
                                >
                                    <div className="space-y-1">
                                        {consoleLogs.map((log, i) => {
                                            const isSuccess = log.includes('passed') || log.includes('successfully') || log.includes('Passed');
                                            const isError = log.includes('Error') || log.includes('Failed') || log.includes('STDERR');
                                            return (
                                                <p
                                                    key={i}
                                                    className={`${
                                                        isSuccess
                                                            ? 'text-emerald-600 font-medium'
                                                            : isError
                                                            ? 'text-red-600 font-medium'
                                                            : 'text-zinc-800'
                                                    }`}
                                                >
                                                    {log}
                                                </p>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Interactive Terminal inside Console */}
                                <div
                                    className={`h-full w-full p-0 overflow-hidden bg-white ${
                                        consoleTab === 'terminal' ? 'block' : 'hidden'
                                    }`}
                                >
                                    {dockerSession?.session_id ? (
                                        <TerminalComponent
                                            key={terminalKey}
                                            sessionId={dockerSession.session_id}
                                            hideHeader
                                            isActive={consoleTab === 'terminal' && !isConsoleCollapsed}
                                        />
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center space-y-2 p-4">
                                            <p className="text-zinc-500 text-xs">
                                                Ephemeral Linux Pod is not currently running.
                                            </p>
                                            <button
                                                onClick={handleStartDocker}
                                                disabled={startingDocker}
                                                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-xs font-medium transition-colors shadow-xs"
                                            >
                                                {startingDocker ? 'Starting Pod...' : 'Start Linux Terminal at $HOME'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ======================================================== */}
                {/* COLUMN 3: TEST CASES & SUBMISSIONS (~28% width) */}
                {/* ======================================================== */}
                <div className="lg:w-[28%] flex flex-col min-h-0 bg-white">
                    {/* Header Tabs: Test Cases | Submissions */}
                    <div className="flex items-center border-b border-zinc-200 px-3 bg-zinc-50">
                        <button
                            onClick={() => setRightMainTab('test_cases')}
                            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
                                rightMainTab === 'test_cases'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                            }`}
                        >
                            Test Cases
                        </button>
                        <button
                            onClick={() => setRightMainTab('submissions')}
                            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                                rightMainTab === 'submissions'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                            }`}
                        >
                            <span>Submissions</span>
                            {submissions.length > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-200 text-zinc-700 font-mono">
                                    {submissions.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Sub-tabs under Test Cases: Run Code | Custom Input */}
                    {rightMainTab === 'test_cases' && (
                        <div className="flex items-center gap-4 px-4 py-2 border-b border-zinc-200 bg-white text-xs font-medium">
                            <button
                                onClick={() => setRightSubTab('run_code')}
                                className={`${
                                    rightSubTab === 'run_code' ? 'text-blue-600 font-semibold' : 'text-zinc-500 hover:text-zinc-800'
                                }`}
                            >
                                Run Code
                            </button>
                            <button
                                onClick={() => setRightSubTab('custom_input')}
                                className={`${
                                    rightSubTab === 'custom_input' ? 'text-blue-600 font-semibold' : 'text-zinc-500 hover:text-zinc-800'
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
                                        <h2 className="text-sm font-bold text-zinc-900">Sample Test Cases</h2>
                                        <p className="text-xs text-zinc-500">Run your code against the visible test cases.</p>
                                    </div>

                                    {/* Test Case Cards List */}
                                    <div className="space-y-3">
                                        {mergedTestCases.map((tc, idx) => {
                                            const isExpanded = expandedCases[idx] ?? true;
                                            return (
                                                <div
                                                    key={idx}
                                                    className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-xs"
                                                >
                                                    {/* Card Header */}
                                                    <div
                                                        onClick={() => toggleCaseExpand(idx)}
                                                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-50 transition-colors select-none"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`w-2 h-2 rounded-full ${
                                                                    tc.passed === true
                                                                        ? 'bg-emerald-500'
                                                                        : tc.passed === false
                                                                        ? 'bg-red-500'
                                                                        : 'bg-zinc-400'
                                                                }`}
                                                            />
                                                            <span className="font-semibold text-xs text-zinc-800">
                                                                Test Case {idx + 1}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {tc.passed !== undefined && (
                                                                <span
                                                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                                                        tc.passed
                                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                            : 'bg-red-50 text-red-700 border border-red-200'
                                                                    }`}
                                                                >
                                                                    {tc.passed ? 'Passed' : 'Failed'}
                                                                </span>
                                                            )}
                                                            <button className="text-zinc-400 hover:text-zinc-700">
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
                                                        <div className="p-3 pt-0 space-y-2.5 text-xs font-mono border-t border-zinc-100 bg-zinc-50/50">
                                                            <div>
                                                                <span className="text-[11px] text-zinc-500 block mb-1">
                                                                    Input (stdin)
                                                                </span>
                                                                <pre className="!bg-white !p-2.5 !rounded !border !border-zinc-200 text-zinc-800 whitespace-pre-wrap">
                                                                    {tc.input}
                                                                </pre>
                                                            </div>

                                                            <div>
                                                                <span className="text-[11px] text-zinc-500 block mb-1">
                                                                    Expected Output
                                                                </span>
                                                                <pre className="!bg-white !p-2.5 !rounded !border !border-zinc-200 text-zinc-800 whitespace-pre-wrap">
                                                                    {tc.expected}
                                                                </pre>
                                                            </div>

                                                            {tc.userOutput !== undefined && (
                                                                <div>
                                                                    <span className="text-[11px] text-zinc-500 block mb-1">
                                                                        Your Output
                                                                    </span>
                                                                    <pre
                                                                        className={`!p-2.5 !rounded-md !border text-xs font-mono whitespace-pre-wrap ${
                                                                            tc.passed
                                                                                ? 'passed-output !border-emerald-300 !bg-emerald-50/80 !text-emerald-950 font-semibold'
                                                                                : 'failed-output !border-red-300 !bg-red-50/80 !text-red-950 font-semibold'
                                                                        }`}
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
                                    <h2 className="text-sm font-bold text-zinc-900">Custom Stdin</h2>
                                    <p className="text-xs text-zinc-500">
                                        Type inputs to feed into <code className="text-blue-600 font-medium">stdin</code> when clicking "Run Code".
                                    </p>
                                    <textarea
                                        value={customInput}
                                        onChange={(e) => setCustomInput(e.target.value)}
                                        placeholder="5&#10;1 2 3 4 5&#10;3"
                                        rows={8}
                                        className="w-full bg-white border border-zinc-300 rounded-lg p-3 text-xs font-mono text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            )
                        ) : (
                            /* Submissions History Tab */
                            <div className="space-y-3">
                                <h2 className="text-sm font-bold text-zinc-900">Submission History</h2>
                                {loadingSubmissions ? (
                                    <p className="text-xs text-zinc-500">Loading submissions...</p>
                                ) : submissions.length === 0 ? (
                                    <p className="text-xs text-zinc-500">No submissions yet for this problem.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {submissions.map((sub) => (
                                            <div
                                                key={sub.id}
                                                className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1.5 text-xs font-mono"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            sub.status === 'Accepted'
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                : 'bg-red-50 text-red-700 border border-red-200'
                                                        }`}
                                                    >
                                                        {sub.status}
                                                    </span>
                                                    <span className="text-zinc-600 font-medium">
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
                                                        className="text-blue-600 hover:underline font-medium"
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

                    {/* Bottom Sticky Action Bar */}
                    <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between gap-3">
                        {/* Run Code Button */}
                        <button
                            onClick={handleRunCode}
                            disabled={isRunning || isSubmitting}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300 rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Play className={`w-3.5 h-3.5 fill-current text-zinc-700 ${isRunning ? 'animate-spin' : ''}`} />
                            <span>{isRunning ? 'Running...' : 'Run Code'}</span>
                        </button>

                        {/* Submit Solution Button */}
                        <button
                            onClick={handleSubmitSolution}
                            disabled={isRunning || isSubmitting}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
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
