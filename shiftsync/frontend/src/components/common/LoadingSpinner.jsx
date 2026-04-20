// LoadingSpinner.jsx
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ fullScreen = false, size = 24 }) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center animate-pulse">
            <Loader2 size={20} className="text-white animate-spin" />
          </div>
          <p className="text-slate-400 text-sm font-medium">Loading ShiftSync…</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={size} className="text-blue-500 animate-spin" />
    </div>
  );
}
