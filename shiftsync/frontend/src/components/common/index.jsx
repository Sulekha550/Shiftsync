// Badge.jsx
export function Badge({ status }) {
  const map = {
    active: 'badge-active',
    inactive: 'badge-inactive',
    on_leave: 'badge-on_leave',
    pending: 'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
    cancelled: 'badge-cancelled',
    scheduled: 'badge-scheduled',
    completed: 'badge-completed',
    no_show: 'badge-inactive',
    present: 'badge-active',
    absent: 'badge-inactive',
    late: 'badge-pending',
    half_day: 'badge-on_leave',
  };
  return (
    <span className={map[status] || 'badge bg-slate-700 text-slate-300'}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

// StatCard.jsx
export function StatCard({ icon: Icon, label, value, sub, color = 'blue', trend }) {
  const colors = {
    blue:    { bg: 'bg-blue-500/15',    icon: 'text-blue-400',    border: 'border-blue-500/20' },
    emerald: { bg: 'bg-emerald-500/15', icon: 'text-emerald-400', border: 'border-emerald-500/20' },
    amber:   { bg: 'bg-amber-500/15',   icon: 'text-amber-400',   border: 'border-amber-500/20' },
    red:     { bg: 'bg-red-500/15',     icon: 'text-red-400',     border: 'border-red-500/20' },
    purple:  { bg: 'bg-purple-500/15',  icon: 'text-purple-400',  border: 'border-purple-500/20' },
    cyan:    { bg: 'bg-cyan-500/15',    icon: 'text-cyan-400',    border: 'border-cyan-500/20' },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className="stat-card animate-slide-up">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${c.bg} ${c.border}`}>
        <Icon size={20} className={c.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-display font-bold text-slate-100">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        {trend !== undefined && (
          <p className={`text-xs mt-1 font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last week
          </p>
        )}
      </div>
    </div>
  );
}

// EmptyState.jsx
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
        <Icon size={24} className="text-slate-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-300 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ConfirmDialog.jsx
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${danger ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
          <AlertTriangle size={22} className={danger ? 'text-red-400' : 'text-amber-400'} />
        </div>
        <p className="text-sm text-slate-400">{message}</p>
        <div className="flex gap-3 w-full">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 justify-center ${danger ? 'btn-danger' : 'btn-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
