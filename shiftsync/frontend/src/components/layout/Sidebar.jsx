import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, ClipboardCheck,
  FileText, X, Zap, Shield, User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'manager', 'employee'] },
  { to: '/employees', icon: Users, label: 'Employees', roles: ['admin', 'manager'] },
  { to: '/shifts', icon: Calendar, label: 'Shifts', roles: ['admin', 'manager', 'employee'] },
  { to: '/attendance', icon: ClipboardCheck, label: 'Attendance', roles: ['admin', 'manager', 'employee'] },
  { to: '/leaves', icon: FileText, label: 'Leave Requests', roles: ['admin', 'manager', 'employee'] },
];

const roleConfig = {
  admin:    { label: 'Administrator', icon: Shield, color: 'text-purple-400 bg-purple-500/15 border-purple-500/20' },
  manager:  { label: 'Manager',       icon: Zap,    color: 'text-amber-400 bg-amber-500/15 border-amber-500/20' },
  employee: { label: 'Employee',      icon: User,   color: 'text-blue-400 bg-blue-500/15 border-blue-500/20' },
};

export default function Sidebar({ open, onClose }) {
  const { user, employee } = useAuth();
  const role = user?.role || 'employee';
  const rc = roleConfig[role];
  const RoleIcon = rc.icon;

  const filteredNav = navItems.filter(item => item.roles.includes(role));

  return (
    <aside
      className={`
        fixed lg:relative z-30 h-full w-64 flex-shrink-0
        bg-slate-900 border-r border-slate-800
        flex flex-col transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center glow-blue">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-lg text-white tracking-tight">
            ShiftSync
          </span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800"
        >
          <X size={18} />
        </button>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-100 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <div className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${rc.color}`}>
          <RoleIcon size={11} />
          {rc.label}
        </div>
        {employee?.department && (
          <p className="mt-1.5 text-xs text-slate-500 pl-0.5">{employee.department} · {employee.branch}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
        <p className="text-xs font-medium text-slate-600 uppercase tracking-widest px-3 mb-3">Navigation</p>
        {filteredNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-800">
        <p className="text-xs text-slate-600 text-center">ShiftSync v1.0 · © 2024</p>
      </div>
    </aside>
  );
}
