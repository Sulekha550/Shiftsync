import { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, RefreshCw, Pencil, X, Clock } from 'lucide-react';
import { shiftAPI, employeeAPI } from '../../services/api';
import { Badge, EmptyState } from '../../components/common/index.jsx';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format, startOfWeek, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = { employee: '', shiftDate: format(new Date(), 'yyyy-MM-dd'), startTime: '09:00', endTime: '17:00', branch: '', notes: '' };
const BRANCHES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'London', 'Remote'];

export default function ShiftsPage() {
  const { canManage } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', branch: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = canManage ? shiftAPI.getAll : shiftAPI.getMy;
      const params = { page, limit: 10, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
      const { data } = await endpoint(params);
      setShifts(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load shifts'); }
    finally { setLoading(false); }
  }, [page, filters, canManage]);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  useEffect(() => {
    if (canManage) {
      employeeAPI.getAll({ limit: 100, status: 'active' }).then(({ data }) => setEmployees(data.data)).catch(() => {});
    }
  }, [canManage]);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const openCreate = () => { setForm(EMPTY_FORM); setEditingId(null); setModalOpen(true); };
  const openEdit = (shift) => {
    setForm({
      employee: shift.employee?._id || '',
      shiftDate: format(new Date(shift.shiftDate), 'yyyy-MM-dd'),
      startTime: shift.startTime,
      endTime: shift.endTime,
      branch: shift.branch,
      notes: shift.notes || '',
    });
    setEditingId(shift._id);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee || !form.shiftDate || !form.startTime || !form.endTime || !form.branch) {
      return toast.error('Please fill in all required fields');
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await shiftAPI.update(editingId, form);
        toast.success('Shift updated');
      } else {
        await shiftAPI.create(form);
        toast.success('Shift created');
      }
      setModalOpen(false);
      fetchShifts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally { setSubmitting(false); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this shift?')) return;
    try {
      await shiftAPI.delete(id);
      toast.success('Shift cancelled');
      fetchShifts();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const statusColor = (s) => ({
    scheduled: 'border-l-blue-500',
    completed: 'border-l-slate-500',
    cancelled: 'border-l-red-500',
    no_show:   'border-l-amber-500',
  }[s] || 'border-l-slate-600');

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Shifts</h1>
          <p className="page-subtitle">{canManage ? 'Manage and assign employee shifts' : 'View your scheduled shifts'}</p>
        </div>
        {canManage && (
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Assign Shift
          </button>
        )}
      </div>

      {/* Filters */}
      {canManage && (
        <div className="card p-4 flex flex-wrap gap-3">
          <select value={filters.status} onChange={e => { setFilters(p => ({ ...p, status: e.target.value })); setPage(1); }} className="input-field w-auto">
            <option value="">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
          <select value={filters.branch} onChange={e => { setFilters(p => ({ ...p, branch: e.target.value })); setPage(1); }} className="input-field w-auto">
            <option value="">All Branches</option>
            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <button onClick={fetchShifts} className="btn-secondary"><RefreshCw size={14} /></button>
        </div>
      )}

      {/* Shift List */}
      <div className="card overflow-hidden">
        {loading ? <LoadingSpinner /> : (
          <>
            <div className="divide-y divide-slate-800">
              {shifts.length === 0 ? (
                <EmptyState icon={Calendar} title="No shifts found" description={canManage ? 'Start by assigning a shift to an employee' : 'No shifts have been assigned to you yet'} action={canManage && <button onClick={openCreate} className="btn-primary"><Plus size={14} /> Assign Shift</button>} />
              ) : shifts.map(shift => (
                <div key={shift._id} className={`flex items-start sm:items-center justify-between p-4 border-l-4 gap-4 hover:bg-slate-800/30 transition-colors ${statusColor(shift.status)}`}>
                  <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                    {/* Date block */}
                    <div className="flex-shrink-0 w-12 text-center">
                      <p className="text-xs text-slate-500 uppercase tracking-wide">{format(new Date(shift.shiftDate), 'EEE')}</p>
                      <p className="text-xl font-display font-bold text-slate-100 leading-none">{format(new Date(shift.shiftDate), 'd')}</p>
                      <p className="text-xs text-slate-500">{format(new Date(shift.shiftDate), 'MMM')}</p>
                    </div>

                    <div className="min-w-0">
                      {shift.employee && (
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-5 h-5 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold flex-shrink-0">
                            {shift.employee?.name?.charAt(0)}
                          </div>
                          <p className="text-sm font-medium text-slate-200 truncate">{shift.employee?.name}</p>
                          <span className="text-xs text-slate-500 hidden sm:inline">· {shift.employee?.department}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1 text-xs font-mono text-blue-400">
                          <Clock size={11} />{shift.startTime} – {shift.endTime}
                        </span>
                        <span className="text-xs text-slate-500">{shift.branch}</span>
                        {shift.notes && <span className="text-xs text-slate-600 italic truncate max-w-40">{shift.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge status={shift.status} />
                    {canManage && shift.status === 'scheduled' && (
                      <>
                        <button onClick={() => openEdit(shift)} className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleCancel(shift._id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                          <X size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Shift' : 'Assign Shift'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Employee *</label>
            <select value={form.employee} onChange={set('employee')} className="input-field" required>
              <option value="">Select Employee</option>
              {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name} — {emp.department}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Shift Date *</label>
            <input type="date" value={form.shiftDate} onChange={set('shiftDate')} className="input-field" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Time *</label>
              <input type="time" value={form.startTime} onChange={set('startTime')} className="input-field" required />
            </div>
            <div>
              <label className="label">End Time *</label>
              <input type="time" value={form.endTime} onChange={set('endTime')} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="label">Branch *</label>
            <select value={form.branch} onChange={set('branch')} className="input-field" required>
              <option value="">Select Branch</option>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={set('notes')} className="input-field" rows={2} placeholder="Optional notes…" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Assign Shift'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
