import { useState, useEffect } from 'react';
import { Users, Calendar, ClipboardCheck, FileText, Clock, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { employeeAPI, shiftAPI, attendanceAPI, leaveAPI } from '../../services/api';
import { StatCard } from '../../components/common/index.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { user, employee, canManage } = useAuth();
  const [stats, setStats] = useState(null);
  const [myShifts, setMyShifts] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const promises = [attendanceAPI.getToday()];
        if (canManage) {
          promises.push(
            employeeAPI.getStats(),
            leaveAPI.getStats(),
            attendanceAPI.getStats({ startDate: format(subDays(new Date(), 6), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd') }),
          );
        } else {
          promises.push(
            shiftAPI.getMy({ startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(subDays(new Date(), -6), 'yyyy-MM-dd') }),
          );
        }
        const results = await Promise.allSettled(promises);
        setTodayAttendance(results[0].status === 'fulfilled' ? results[0].value.data?.data : null);
        if (canManage && results.length > 1) {
          setStats({
            employees: results[1].status === 'fulfilled' ? results[1].value.data?.data : null,
            leaves: results[2].status === 'fulfilled' ? results[2].value.data?.data : null,
            attendance: results[3].status === 'fulfilled' ? results[3].value.data?.data : null,
          });
        } else if (!canManage && results[1]?.status === 'fulfilled') {
          setMyShifts(results[1].value.data?.data || []);
        }
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [canManage]);

  // Generate mock weekly chart data
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    return {
      day: format(d, 'EEE'),
      present: Math.floor(Math.random() * 20) + 10,
      absent: Math.floor(Math.random() * 5),
      late: Math.floor(Math.random() * 3),
    };
  });

  const deptData = stats?.employees?.byDepartment?.slice(0, 5) || [];

  if (loading) return <LoadingSpinner />;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {greeting()}, <span className="text-gradient">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="page-subtitle">
            {format(new Date(), 'EEEE, MMMM do yyyy')} · Here's your workforce overview
          </p>
        </div>
      </div>

      {/* Today's check-in status */}
      <div className={`card p-4 flex items-center justify-between border-l-4 ${todayAttendance?.checkIn ? 'border-emerald-500' : 'border-amber-500'}`}>
        <div className="flex items-center gap-3">
          {todayAttendance?.checkIn
            ? <CheckCircle size={20} className="text-emerald-400" />
            : <AlertCircle size={20} className="text-amber-400" />
          }
          <div>
            <p className="text-sm font-medium text-slate-200">
              {todayAttendance?.checkIn ? 'Checked in today' : "Haven't checked in yet"}
            </p>
            <p className="text-xs text-slate-500">
              {todayAttendance?.checkIn
                ? `Since ${format(new Date(todayAttendance.checkIn), 'hh:mm a')}${todayAttendance?.checkOut ? ` · Checked out at ${format(new Date(todayAttendance.checkOut), 'hh:mm a')}` : ''}`
                : 'Check in from the Attendance page'
              }
            </p>
          </div>
        </div>
        {todayAttendance?.totalHours > 0 && (
          <div className="text-right">
            <p className="text-lg font-display font-bold text-slate-100">{todayAttendance.totalHours}h</p>
            <p className="text-xs text-slate-500">worked today</p>
          </div>
        )}
      </div>

      {/* Admin/Manager Stats */}
      {canManage && stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users}         label="Total Employees" value={stats.employees?.total}   sub={`${stats.employees?.active} active`}   color="blue" />
            <StatCard icon={Calendar}      label="Inactive"        value={stats.employees?.inactive} sub="employees"                             color="red" />
            <StatCard icon={FileText}      label="Pending Leaves"  value={stats.leaves?.pending}    sub="awaiting review"                       color="amber" />
            <StatCard icon={ClipboardCheck} label="Present Today"  value={stats.attendance?.present} sub={`of ${stats.attendance?.total} total`} color="emerald" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Weekly Attendance Bar Chart */}
            <div className="card p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-display font-semibold text-slate-100">Weekly Attendance</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Last 7 days overview</p>
                </div>
                <TrendingUp size={18} className="text-blue-400" />
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData} barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="present" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Present" />
                  <Bar dataKey="late"    fill="#f59e0b" radius={[4, 4, 0, 0]} name="Late" />
                  <Bar dataKey="absent"  fill="#ef4444" radius={[4, 4, 0, 0]} name="Absent" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Department Distribution Pie Chart */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-display font-semibold text-slate-100">By Department</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Employee distribution</p>
                </div>
              </div>
              {deptData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={deptData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="count" nameKey="_id" paddingAngle={3}>
                        {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-3">
                    {deptData.map((d, i) => (
                      <div key={d._id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-slate-400 truncate max-w-[110px]">{d._id}</span>
                        </div>
                        <span className="text-slate-300 font-medium">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-40 text-slate-500 text-sm">No data</div>
              )}
            </div>
          </div>

          {/* Leave stats */}
          {stats.leaves && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Pending', value: stats.leaves.pending, color: 'amber' },
                { label: 'Approved', value: stats.leaves.approved, color: 'emerald' },
                { label: 'Rejected', value: stats.leaves.rejected, color: 'red' },
              ].map(s => (
                <div key={s.label} className="card p-4 text-center">
                  <p className="text-2xl font-display font-bold text-slate-100">{s.value ?? 0}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label} Leaves</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Employee view: upcoming shifts */}
      {!canManage && (
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-display font-semibold text-slate-100">Upcoming Shifts</h3>
            <Clock size={17} className="text-slate-500" />
          </div>
          {myShifts.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">No upcoming shifts scheduled</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {myShifts.slice(0, 5).map(shift => (
                <div key={shift._id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{format(new Date(shift.shiftDate), 'EEEE, MMM d')}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{shift.branch}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-blue-400">{shift.startTime} – {shift.endTime}</p>
                    <span className={`badge-${shift.status} badge mt-1`}>{shift.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
