import { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { leaveAPI } from '../../services/api';
import { Badge, EmptyState, StatCard } from '../../components/common/index.jsx';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = { leaveType: 'casual', startDate: '', endDate: '', reason: '' };
const LEAVE_TYPES = ['sick', 'casual', 'annual', 'maternity', 'paternity', 'unpaid', 'other'];

export default function LeavesPage() {
  const { canManage } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [applyModal, setApplyModal] = useState(false);
  const [reviewModal, setReviewModal] = useState(null); // leave object
  const [form, setForm] = useState(EMPTY_FORM);
  const [reviewForm, setReviewForm] = useState({ status: 'approved', reviewNote: '' });

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = canManage ? leaveAPI.getAll : leaveAPI.getMy;
      const params = { page, limit: 10, ...(statusFilter ? { status: statusFilter } : {}) };
      const { data } = await endpoint(params);
      setLeaves(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load leave requests'); }
    finally { setLoading(false); }
  }, [page, statusFilter, canManage]);

  const fetchStats = useCallback(async () => {
    if (!canManage) return;
    try {
      const { data } = await leaveAPI.getStats();
      setStats(data.data);
    } catch {}
  }, [canManage]);

  useEffect(() => { fetchLeaves(); fetchStats(); }, [fetchLeaves, fetchStats]);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleApply = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason) return toast.error('Please fill in all fields');
    if (form.reason.length < 10) return toast.error('Reason must be at least 10 characters');
    setSubmitting(true);
    try {
      await leaveAPI.apply(form);
      toast.success('Leave request submitted!');
      setApplyModal(false);
      setForm(EMPTY_FORM);
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit leave');
    } finally { setSubmitting(false); }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await leaveAPI.review(reviewModal._id, reviewForm);
      toast.success(`Leave ${reviewForm.status}`);
      setReviewModal(null);
      fetchLeaves();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Review failed');
    } finally { setSubmitting(false); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      await leaveAPI.cancel(id);
      toast.success('Leave request cancelled');
      fetchLeaves();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const totalDays = (s, e) => {
    if (!s || !e) return 0;
    return Math.max(1, differenceInDays(new Date(e), new Date(s)) + 1);
  };

  const leaveTypeColor = {
    sick: 'text-red-400', casual: 'text-blue-400', annual: 'text-emerald-400',
    maternity: 'text-pink-400', paternity: 'text-cyan-400', unpaid: 'text-amber-400', other: 'text-slate-400',
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Requests</h1>
          <p className="page-subtitle">{canManage ? 'Review and manage team leave requests' : 'Apply and track your leave'}</p>
        </div>
        {!canManage && (
          <button onClick={() => setApplyModal(true)} className="btn-primary">
            <Plus size={16} /> Apply for Leave
          </button>
        )}
      </div>

      {/* Stats (admin/manager) */}
      {canManage && stats && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={Clock}        label="Pending"  value={stats.pending}  color="amber" />
          <StatCard icon={CheckCircle}  label="Approved" value={stats.approved} color="emerald" />
          <StatCard icon={XCircle}      label="Rejected" value={stats.rejected} color="red" />
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-auto">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={fetchLeaves} className="btn-secondary"><RefreshCw size={14} /></button>
      </div>

      {/* Leave Cards */}
      <div className="card overflow-hidden">
        {loading ? <LoadingSpinner /> : (
          <>
            <div className="divide-y divide-slate-800">
              {leaves.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No leave requests"
                  description={canManage ? 'No leave requests match your filter' : "You haven't applied for any leave yet"}
                  action={!canManage && <button onClick={() => setApplyModal(true)} className="btn-primary"><Plus size={14} /> Apply for Leave</button>}
                />
              ) : leaves.map(leave => (
                <div key={leave._id} className="p-4 hover:bg-slate-800/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {canManage && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold flex-shrink-0">
                            {leave.employee?.name?.charAt(0)}
                          </div>
                          <p className="text-sm font-medium text-slate-200">{leave.employee?.name}</p>
                          <span className="text-xs text-slate-500">· {leave.employee?.department}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-sm font-semibold capitalize ${leaveTypeColor[leave.leaveType] || 'text-slate-300'}`}>
                          {leave.leaveType} Leave
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs text-slate-400 font-mono">
                          {format(new Date(leave.startDate), 'MMM d')} → {format(new Date(leave.endDate), 'MMM d, yyyy')}
                        </span>
                        <span className="badge bg-slate-800 text-slate-400 border border-slate-700">{leave.totalDays}d</span>
                      </div>

                      <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">{leave.reason}</p>

                      {leave.reviewNote && (
                        <p className="mt-2 text-xs text-slate-500 italic bg-slate-800/60 rounded-lg px-3 py-2">
                          <span className="not-italic font-medium text-slate-400">Review note: </span>{leave.reviewNote}
                        </p>
                      )}

                      <p className="text-xs text-slate-600 mt-2">Applied {format(new Date(leave.createdAt), 'MMM d, yyyy')}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge status={leave.status} />
                      {canManage && leave.status === 'pending' && (
                        <button
                          onClick={() => { setReviewModal(leave); setReviewForm({ status: 'approved', reviewNote: '' }); }}
                          className="btn-primary py-1.5 px-3 text-xs"
                        >
                          Review
                        </button>
                      )}
                      {!canManage && leave.status === 'pending' && (
                        <button onClick={() => handleCancel(leave._id)} className="btn-danger py-1.5 px-3 text-xs">
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Apply Modal */}
      <Modal open={applyModal} onClose={() => setApplyModal(false)} title="Apply for Leave">
        <form onSubmit={handleApply} className="space-y-4">
          <div>
            <label className="label">Leave Type *</label>
            <select value={form.leaveType} onChange={set('leaveType')} className="input-field">
              {LEAVE_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date *</label>
              <input type="date" value={form.startDate} onChange={set('startDate')} className="input-field" min={format(new Date(), 'yyyy-MM-dd')} required />
            </div>
            <div>
              <label className="label">End Date *</label>
              <input type="date" value={form.endDate} onChange={set('endDate')} className="input-field" min={form.startDate || format(new Date(), 'yyyy-MM-dd')} required />
            </div>
          </div>
          {form.startDate && form.endDate && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5 text-sm text-blue-400">
              Total: <strong>{totalDays(form.startDate, form.endDate)} day(s)</strong>
            </div>
          )}
          <div>
            <label className="label">Reason * (min. 10 characters)</label>
            <textarea value={form.reason} onChange={set('reason')} className="input-field" rows={4} placeholder="Describe the reason for your leave request…" required />
            <p className="text-xs text-slate-500 mt-1">{form.reason.length} characters</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setApplyModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Review Modal */}
      <Modal open={!!reviewModal} onClose={() => setReviewModal(null)} title="Review Leave Request" maxWidth="max-w-md">
        {reviewModal && (
          <form onSubmit={handleReview} className="space-y-4">
            <div className="bg-slate-800/60 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Employee</span>
                <span className="text-slate-200 font-medium">{reviewModal.employee?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span className="text-slate-200 capitalize">{reviewModal.leaveType} Leave</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration</span>
                <span className="text-slate-200">{reviewModal.totalDays} day(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dates</span>
                <span className="text-slate-200 font-mono text-xs">
                  {format(new Date(reviewModal.startDate), 'MMM d')} – {format(new Date(reviewModal.endDate), 'MMM d, yyyy')}
                </span>
              </div>
            </div>

            <div className="bg-slate-800/40 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Reason</p>
              <p className="text-sm text-slate-300">{reviewModal.reason}</p>
            </div>

            <div>
              <label className="label">Decision *</label>
              <div className="grid grid-cols-2 gap-3">
                {['approved', 'rejected'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setReviewForm(p => ({ ...p, status: s }))}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-all capitalize ${
                      reviewForm.status === s
                        ? s === 'approved'
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : 'bg-red-500/20 border-red-500/40 text-red-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {s === 'approved' ? <CheckCircle size={14} className="inline mr-1.5" /> : <XCircle size={14} className="inline mr-1.5" />}
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Review Note (optional)</label>
              <textarea
                value={reviewForm.reviewNote}
                onChange={e => setReviewForm(p => ({ ...p, reviewNote: e.target.value }))}
                className="input-field"
                rows={3}
                placeholder="Add a note for the employee…"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setReviewModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting} className={reviewForm.status === 'approved' ? 'btn-success' : 'btn-danger'}>
                {submitting ? 'Saving…' : `${reviewForm.status === 'approved' ? 'Approve' : 'Reject'} Leave`}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
