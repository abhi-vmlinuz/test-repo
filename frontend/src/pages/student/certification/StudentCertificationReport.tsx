import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API, toast } from '../../../App';
import { ArrowLeft, Upload, FileText, Clock, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ReportStatus {
    exam_id: number;
    exam_title: string;
    attempt_id: number;
    lab_score: number;
    can_upload_report: boolean;
    report_uploaded_at: string | null;
    report_filename: string | null;
    report_timer_end: string | null;
    status: string;
}

const StudentCertificationReport = () => {
    const navigate = useNavigate();
    const { examId } = useParams();
    const [reportStatus, setReportStatus] = useState<ReportStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<string>('');

    useEffect(() => {
        fetchReportStatus();
    }, [examId]);

    useEffect(() => {
        if (reportStatus?.report_timer_end) {
            const interval = setInterval(() => {
                updateTimer();
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [reportStatus]);

    const fetchReportStatus = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API}/api/student/certification-exams/${examId}/report-status`);
            setReportStatus(response.data);
        } catch (error: any) {
            toast.error('Failed to load report status');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const updateTimer = () => {
        if (!reportStatus?.report_timer_end) return;
        
        const now = new Date();
        const end = new Date(reportStatus.report_timer_end);
        const diff = end.getTime() - now.getTime();

        if (diff <= 0) {
            setTimeRemaining('Time Expired');
            return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Only PDF and DOCX files are allowed');
            return;
        }

        // Validate file size (50MB max)
        if (file.size > 50 * 1024 * 1024) {
            toast.error('File size must be less than 50MB');
            return;
        }

        setSelectedFile(file);
    };

    const handleUpload = async () => {
        if (!selectedFile || !reportStatus) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('report', selectedFile);

            await axios.post(
                `${API}/api/student/certification-exams/attempts/${reportStatus.attempt_id}/report`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            toast.success('Report uploaded successfully!');
            setSelectedFile(null);
            await fetchReportStatus();
        } catch (error: any) {
            const errorMsg = error.response?.data?.detail || 'Failed to upload report';
            toast.error(errorMsg);
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!reportStatus) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <button
                    onClick={() => navigate('/student/certification-exams')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Certification Exams
                </button>
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Unable to load report status</p>
                </div>
            </div>
        );
    }

    const isExpired = reportStatus.report_timer_end 
        ? new Date(reportStatus.report_timer_end) <= new Date() 
        : false;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/student/certification-exams')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Certification Exams
                </button>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{reportStatus.exam_title}</h1>
                <p className="text-gray-600">Penetration Testing Report Submission</p>
            </div>

            {/* Timer */}
            {reportStatus.report_timer_end && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Report Upload Timer</p>
                            <p className={`text-3xl font-bold ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                                <Clock className="inline w-8 h-8 mr-2" />
                                {timeRemaining}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Lab Score</p>
                            <p className="text-3xl font-bold text-blue-600">{reportStatus.lab_score}%</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Cannot Upload Warning */}
            {!reportStatus.can_upload_report && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-yellow-600 mt-0.5" />
                        <div>
                            <p className="font-semibold text-yellow-900 mb-2">Report Upload Not Available</p>
                            <p className="text-sm text-yellow-800 mb-2">
                                You need to achieve at least 80% lab score to unlock report upload.
                            </p>
                            <p className="text-sm text-yellow-800">
                                Current lab score: <span className="font-semibold">{reportStatus.lab_score}%</span>
                            </p>
                            <button
                                onClick={() => navigate(`/student/certification-exams/${examId}/lab`)}
                                className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                            >
                                Continue Lab Challenges
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Expired Warning */}
            {isExpired && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
                        <div>
                            <p className="font-semibold text-red-900 mb-1">Report Upload Timer Expired</p>
                            <p className="text-sm text-red-800">
                                The 3-hour report upload window has expired. You can no longer submit your report.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Already Uploaded */}
            {reportStatus.report_uploaded_at && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-semibold text-green-900 mb-2">Report Uploaded Successfully</p>
                            <p className="text-sm text-green-800 mb-1">
                                File: <span className="font-mono">{reportStatus.report_filename}</span>
                            </p>
                            <p className="text-sm text-green-800 mb-3">
                                Uploaded on: {new Date(reportStatus.report_uploaded_at).toLocaleString()}
                            </p>
                            <Badge className="bg-orange-500 mb-3">
                                {reportStatus.status.replace(/_/g, ' ')}
                            </Badge>
                            <p className="text-sm text-green-800">
                                Your report is being reviewed by the instructor. You will be notified once grading is complete.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Form */}
            {reportStatus.can_upload_report && !reportStatus.report_uploaded_at && !isExpired && (
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Your Report</h2>

                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                        <h3 className="font-semibold text-blue-900 mb-3">Report Requirements:</h3>
                        <ul className="space-y-2 text-sm text-blue-800">
                            <li className="flex items-start gap-2">
                                <span className="font-bold">•</span>
                                <span>Document all solved challenges with detailed methodology</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold">•</span>
                                <span>Include screenshots, evidence, and step-by-step explanations</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold">•</span>
                                <span>Provide technical findings and remediation recommendations</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold">•</span>
                                <span>Use professional formatting and clear structure</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold">•</span>
                                <span>File format: PDF or DOCX (max 50MB)</span>
                            </li>
                        </ul>
                    </div>

                    {/* File Upload */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
                        <input
                            type="file"
                            id="report-upload"
                            accept=".pdf,.docx"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        
                        {selectedFile ? (
                            <div className="space-y-4">
                                <FileText className="w-12 h-12 text-green-600 mx-auto" />
                                <div>
                                    <p className="text-lg font-semibold text-gray-900">{selectedFile.name}</p>
                                    <p className="text-sm text-gray-600">
                                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedFile(null)}
                                    className="text-sm text-red-600 hover:text-red-700"
                                >
                                    Remove file
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                                <div>
                                    <p className="text-lg font-semibold text-gray-900 mb-2">
                                        Drop your report here or click to browse
                                    </p>
                                    <p className="text-sm text-gray-600">PDF or DOCX (max 50MB)</p>
                                </div>
                                <label
                                    htmlFor="report-upload"
                                    className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer font-semibold"
                                >
                                    Select File
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Upload Button */}
                    <button
                        onClick={handleUpload}
                        disabled={!selectedFile || uploading}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-lg"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="w-5 h-5" />
                                Upload Report
                            </>
                        )}
                    </button>

                    <p className="text-xs text-gray-500 text-center mt-4">
                        Once uploaded, you cannot replace or modify the report. Make sure it's final before submitting.
                    </p>
                </div>
            )}
        </div>
    );
};

export default StudentCertificationReport;
