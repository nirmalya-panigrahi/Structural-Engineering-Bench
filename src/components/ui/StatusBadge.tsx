import { AlertTriangle, CheckCircle2, CircleDot, XCircle } from 'lucide-react';
import { StatusTone } from '../../engine/types';

interface StatusBadgeProps {
  tone: StatusTone;
  label: string;
}

const TONE_CLASSES: Record<StatusTone, string> = {
  safe: 'text-emerald-700 dark:text-emerald-400',
  caution: 'text-amber-700 dark:text-amber-400',
  danger: 'text-rose-700 dark:text-rose-400',
  neutral: 'text-slate-700 dark:text-slate-300',
};

export function StatusBadge({ tone, label }: StatusBadgeProps) {
  const Icon =
    tone === 'safe'
      ? CheckCircle2
      : tone === 'caution'
        ? AlertTriangle
        : tone === 'danger'
          ? XCircle
          : CircleDot;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
