import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, Users, RefreshCw, Filter } from 'lucide-react';
import { employeeAPI } from '../../services/api';
import { Badge, StatCard, EmptyState, ConfirmDialog } from '../../components/common/index.jsx';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = {
  name: '', email: '', phone: '', department: '', branch: '',
  designation: '', joiningDate: '', status: 'active', salary: '',
  role: 'employee', password: '',
};

const DEPARTMENTS = ['Engineering', 'Operations', 'HR', 'Finance', 'Marketing', 'Sales', 'Support'];
const BRANCHES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'London', 'Remote'];

export default function EmployeesPage() {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ department: '', branch: '', status: '' });
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, search: search || undefined, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
      const { data } = await employeeAPI.getAll(params);
      setEmployees(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load employees'); }
    finally { setLoading(false); }
  }, [page, search, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await employeeAPI.getStats();
      setStats(data.data);
    } catch {}
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchEmployees(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const openCreate = () => { setForm(EMPTY_FORM); setEditingId(null); setModalOpen(true); };
  const openEdit = (emp) => {
    setForm({
      name: emp.name, email: emp.email, phone: emp.phone || '',
      department: emp.department, branch: emp.branch, designation: emp.designation,
      joiningDate: emp.joiningDate ? format(new Date(emp.joiningDate), 'yyyy-MM-dd') : '',
      status: emp.status, salary: emp.salary || '', role: 'employee', password: '',
    });
    setEditingId(emp._id);
    setModalOpen(true);
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.department || !form.branch || !form.designation || !form.joiningDate) {
      return toast.error('Please fill in all required fields');
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await employeeAPI.update(editingId, form);
        toast.success('Employee updated');
      } else {
        await employeeAPI.create(form);
        toast.success('Employee created');
      }
      setModalOpen(false);
      fetchEmployees();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    try {
      await employeeAPI.delete(deleteId);
      toast.success('Employee deactivated');
      fetchEmployees();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">Manage your workforce</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Add Employee
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total" value={stats.total} color="blue" />
          <StatCard icon={Users} label="Active" value={stats.active} color="emerald" />
          <StatCard icon={Users} label="Inactive" value={stats.inactive} color="red" />
          <StatCard icon={Users} label="Departments" value={stats.byDepartment?.length} color="purple" />
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employees…"
            className="input-field pl-9"
          />
        </div>
        <select value={filters.department} onChange={e => { setFilters(p => ({ ...p, department: e.target.value })); setPage(1); }} className="input-field w-auto">
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filters.branch} onChange={e => { setFilters(p => ({ ...p, branch: e.target.value })); setPage(1); }} className="input-field w-auto">
          <option value="">All Branches</option>
          {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={filters.status} onChange={e => { setFilters(p => ({ ...p, status: e.target.value })); setPage(1); }} className="input-field w-auto">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on_leave">On Leave</option>
        </select>
        <button onClick={fetchEmployees} className="btn-secondary">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? <LoadingSpinner /> : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Branch</th>
                    <th>Designation</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr><td colSpan={7}><EmptyState icon={Users} title="No employees found" description="Add your first employee or adjust the filters" /></td></tr>
                  ) : employees.map(emp => (
                    <tr key={emp._id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0">
                            {emp.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-200 text-sm">{emp.name}</p>
                            <p className="text-xs text-slate-500">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-slate-400">{emp.department}</td>
                      <td className="text-slate-400">{emp.branch}</td>
                      <td className="text-slate-400">{emp.designation}</td>
                      <td className="text-slate-400 font-mono text-xs">{emp.joiningDate ? format(new Date(emp.joiningDate), 'MMM d, yyyy') : '—'}</td>
                      <td><Badge status={emp.status} /></td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEdit(emp)} className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                            <Pencil size={14} />
                          </button>
                          {isAdmin && (
                            <button onClick={() => setDeleteId(emp._id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Employee' : 'Add Employee'} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Full Name *</label>
            <input value={form.name} onChange={set('name')} className="input-field" placeholder="John Doe" required />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" value={form.email} onChange={set('email')} className="input-field" placeholder="john@company.com" required />
          </div>
          <div>
            <label className="label">Phone</label>
            <input value={form.phone} onChange={set('phone')} className="input-field" placeholder="+1 234 567 8900" />
          </div>
          <div>
            <label className="label">Department *</label>
            <select value={form.department} onChange={set('department')} className="input-field" required>
              <option value="">Select Department</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Branch *</label>
            <select value={form.branch} onChange={set('branch')} className="input-field" required>
              <option value="">Select Branch</option>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Designation *</label>
            <input value={form.designation} onChange={set('designation')} className="input-field" placeholder="Software Engineer" required />
          </div>
          <div>
            <label className="label">Joining Date *</label>
            <input type="date" value={form.joiningDate} onChange={set('joiningDate')} className="input-field" required />
          </div>
          <div>
            <label className="label">Status</label>
            <select value={form.status} onChange={set('status')} className="input-field">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>
          <div>
            <label className="label">Salary (USD)</label>
            <input type="number" value={form.salary} onChange={set('salary')} className="input-field" placeholder="60000" />
          </div>
          {!editingId && (
            <div>
              <label className="label">Password (default: name@123)</label>
              <input type="text" value={form.password} onChange={set('password')} className="input-field" placeholder="Leave blank for auto" />
            </div>
          )}
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create Employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Deactivate Employee"
        message="This employee will be deactivated and their account disabled. This action can be reversed by editing the employee."
        confirmLabel="Deactivate"
        danger
      />
    </div>
  );
}
