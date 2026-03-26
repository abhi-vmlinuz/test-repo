import { useState, useEffect } from 'react';
import { API, toast } from '../../../App';
import axios from 'axios';
import { Plus, Edit2, Trash2, Eye, Users, CheckCircle, XCircle, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface CertificationExam {
  id: string;
  name: string;
  exam_type: string;
  lms_final_exam_id: string;
  lms_exam_title: string;
  total_lab_points: number;
  global_duration_hours: number;
  ctf_duration_hours: number;
  report_duration_hours: number;
  is_published: boolean;
  attempt_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const CertificationExamsList = () => {
  const [exams, setExams] = useState<CertificationExam[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await axios.get(`${API}/admin/certification-exams`);
      setExams(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to load certification exams');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This can only be done if there are no attempts.`)) {
      return;
    }

    try {
      await axios.delete(`${API}/admin/certification-exams/${id}`);
      toast.success('Certification exam deleted successfully');
      fetchExams();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete certification exam');
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const response = await axios.put(`${API}/admin/certification-exams/${id}/publish`);
      toast.success(response.data.message);
      fetchExams();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to toggle publish status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--text-primary)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Certification Exams
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage certification exams with 3-pool system
          </p>
        </div>
        <Button
          onClick={() => navigate('/admin/certification-exams/new')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create New Exam
        </Button>
      </div>

      {/* Stats Summary */}
      {exams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Exams</div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{exams.length}</div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Published</div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
              {exams.filter(e => e.is_published).length}
            </div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Attempts</div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
              {exams.reduce((sum, e) => sum + e.attempt_count, 0)}
            </div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Lab Points</div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>120</div>
          </div>
        </div>
      )}

      {/* Exams Table */}
      {exams.length === 0 ? (
        <div className="text-center py-12 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-40" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No Certification Exams</h3>
          <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
            Create your first certification exam to get started
          </p>
          <Button onClick={() => navigate('/admin/certification-exams/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Exam
          </Button>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                <th className="text-left p-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Exam Name</th>
                <th className="text-left p-4 font-semibold" style={{ color: 'var(--text-primary)' }}>LMS Final Exam</th>
                <th className="text-left p-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Type</th>
                <th className="text-center p-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Status</th>
                <th className="text-center p-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Attempts</th>
                <th className="text-center p-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Timing</th>
                <th className="text-right p-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr
                  key={exam.id}
                  style={{ borderBottom: '1px solid var(--border-light)' }}
                  className="hover:bg-opacity-50 transition-colors"
                >
                  <td className="p-4">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {exam.name}
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                      Created by {exam.created_by || 'Unknown'}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {exam.lms_exam_title}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline">{exam.exam_type}</Badge>
                  </td>
                  <td className="p-4 text-center">
                    {exam.is_published ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Published
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        <XCircle className="w-3 h-3 mr-1" />
                        Draft
                      </Badge>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => navigate(`/admin/certification-exams/${exam.id}/attempts`)}
                      className="inline-flex items-center gap-1 text-sm hover:underline"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <Users className="w-4 h-4" />
                      {exam.attempt_count}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {exam.global_duration_hours}h / {exam.ctf_duration_hours}h / {exam.report_duration_hours}h
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/admin/certification-exams/${exam.id}`)}
                        className="p-2 rounded hover:bg-gray-700 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
                      </button>
                      <button
                        onClick={() => navigate(`/admin/certification-exams/${exam.id}/edit`)}
                        className="p-2 rounded hover:bg-gray-700 transition-colors"
                        title="Edit"
                        disabled={exam.attempt_count > 0}
                      >
                        <Edit2 className={`w-4 h-4 ${exam.attempt_count > 0 ? 'opacity-30' : ''}`} style={{ color: 'var(--text-primary)' }} />
                      </button>
                      <button
                        onClick={() => handleTogglePublish(exam.id, exam.is_published)}
                        className="p-2 rounded hover:bg-gray-700 transition-colors"
                        title={exam.is_published ? 'Unpublish' : 'Publish'}
                      >
                        {exam.is_published ? (
                          <XCircle className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(exam.id, exam.name)}
                        className="p-2 rounded hover:bg-red-500/20 transition-colors"
                        title="Delete"
                        disabled={exam.attempt_count > 0}
                      >
                        <Trash2 className={`w-4 h-4 ${exam.attempt_count > 0 ? 'opacity-30' : 'text-red-400'}`} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CertificationExamsList;
