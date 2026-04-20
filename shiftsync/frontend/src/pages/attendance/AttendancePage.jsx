import { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, LogIn, LogOut, Clock, Filter, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { attendanceAPI } from '../../services/api';
import { Badge, EmptyState, StatCard } from '../../components/common/index.jsx';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function AttendancePage() {
  const { canManage } = useAuth();
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '' });

  const fetchToday = useCallback(async () => {
    try {
      const { data } = await attendanceAPI.getToday();
      setTodayRecord(data.data);
    } catch {}
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = canManage ? attendanceAPI.getAll : attendanceAPI.getMy;
      const params = { page, limit: 10, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
      const { data } = await endpoint(params);
      setRecords(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  }, [page, filters, canManage]);

  const fetchStats = useCallback(async () => {
    if (!canManage) return;
    try {
      const { data } = await attendanceAPI.getStats();
      setStats(data.data);
    } catch {}
  }, [canManage]);

  useEffect(() => {
    fetchToday();
    fetchRecords();
    fetchStats();
  }, [fetchToday, fetchRecords, fetchStats]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await attendanceAPI.checkIn({});
      toast.success('Checked in successfully!');
      fetchToday();
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally { setActionLoading(false); }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await attendanceAPI.checkOut({});
      toast.success('Checked out. Have a great day!');
      fetchToday();
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally { setActionLoading(false); }
  };

  const checkedIn = !!todayRecord?.checkIn;
  const checkedOut = !!todayRecord?.checkOut;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">{canManage ? 'Track team attendance' : 'Your attendance history'}</p>
        </div>
      </div>

      {/* Today Card (for employees) */}
      {!canManage && (
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Today</p>
              <p className="text-lg font-display font-bold text-slate-100">{format(new Date(), 'EEEE, MMMM d')}</p>

              <div className="mt-4 flex flex-wrap gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Check In</p>
                  <p className={`text-sm font-mono font-medium ${checkedIn ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {checkedIn ? format(new Date(todayRecord.checkIn), 'hh:mm:ss a') : '— —'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Check Out</p>
                  <p className={`text-sm font-mono font-medium ${checkedOut ? 'text-blue-400' : 'text-slate-600'}`}>
                    {checkedOut ? format(new Date(todayRecord.checkOut), 'hh:mm:ss a') : '— —'}
                  </p>
                </div>
                {todayRecord?.totalHours > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Hours Worked</p>
                    <p className="text-sm font-mono font-bold text-amber-400">{todayRecord.totalHours}h</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {!checkedIn ? (
                <button
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                  className="btn-success px-6 py-3 text-base"
                >
                  {actionLoading ? <span className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" /> : <LogIn size={18} />}
                  Check In
                </button>
              ) : !checkedOut ? (
                <button
                  onClick={handleCheckOut}
                  disabled={actionLoading}
                  className="btn-danger px-6 py-3 text-base"
                >
                  {actionLoading ? <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" /> : <LogOut size={18} />}
                  Check Out
                </button>
              ) : (
                <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
                  <CheckCircle size={18} />
                  Completed for today
                </div>
              )}
              {checkedIn && !checkedOut && (
                <p className="text-xs text-slate-500 text-center">
                  Working for {formatDistanceToNow(new Date(todayRecord.checkIn))}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin stats */}
      {canManage && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={ClipboardCheck} label="Total Records" value={stats.total}   color="blue" />
          <StatCard icon={CheckCircle}    label="Present"        value={stats.present} color="emerald" />
          <StatCard icon={XCircle}        label="Absent"         value={stats.absent}  color="red" />
          <StatCard icon={Clock}          label="Late Arrivals"  value={stats.late}    color="amber" />
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select value={filters.status} onChange={e => { setFilters(p => ({ ...p, status: e.target.value })); setPage(1); }} className="input-field w-auto">
          <option value="">All Status</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="late">Late</option>
          <option value="half_day">Half Day</option>
          <option value="on_leave">On Leave</option>
        </select>
        <button onClick={fetchRecords} className="btn-secondary"><RefreshCw size={14} /></button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? <LoadingSpinner /> : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    {canManage && <th>Employee</th>}
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr><td colSpan={canManage ? 6 : 5}>
                      <EmptyState icon={ClipboardCheck} title="No attendance records" description="Records will appear here after check-ins" />
                    </td></tr>
                  ) : records.map(rec => (
                    <tr key={rec._id}>
                      <td className="font-medium text-slate-200 font-mono text-xs">
                        {format(new Date(rec.date), 'MMM d, yyyy')}
                        <p className="text-slate-500 text-xs font-sans">{format(new Date(rec.date), 'EEEE')}</p>
                      </td>
                      {canManage && (
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                              {rec.employee?.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm text-slate-200">{rec.employee?.name}</p>
                              <p className="text-xs text-slate-500">{rec.employee?.department}</p>
                            </div>
                          </div>
                        </td>
                      )}
                      <td className={`font-mono text-xs ${rec.checkIn ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {rec.checkIn ? format(new Date(rec.checkIn), 'hh:mm:ss a') : '—'}
                      </td>
                      <td className={`font-mono text-xs ${rec.checkOut ? 'text-blue-400' : 'text-slate-600'}`}>
                        {rec.checkOut ? format(new Date(rec.checkOut), 'hh:mm:ss a') : '—'}
                      </td>
                      <td className={`font-mono text-xs font-semibold ${rec.totalHours >= 8 ? 'text-emerald-400' : rec.totalHours > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                        {rec.totalHours > 0 ? `${rec.totalHours}h` : '—'}
                      </td>
                      <td><Badge status={rec.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
