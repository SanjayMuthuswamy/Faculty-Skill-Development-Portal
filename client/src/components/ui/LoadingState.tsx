import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

type LoadingStateProps = {
  label?: string;
  className?: string;
  compact?: boolean;
  fullScreen?: boolean;
};

export function LoadingState({
  label = 'Loading',
  className,
  compact = false,
  fullScreen = false,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        fullScreen ? 'min-h-screen w-full' : compact ? 'py-10' : 'min-h-[320px]',
        className
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-white shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
          {label}
        </p>
      </div>
    </div>
  );
}

