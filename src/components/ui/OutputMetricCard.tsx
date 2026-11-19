import { OutputMetric } from '../../engine/types';
import { FinePrintTooltip } from './FinePrintTooltip';
import { StatusBadge } from './StatusBadge';

interface OutputMetricCardProps {
  metric: OutputMetric;
}

export function OutputMetricCard({ metric }: OutputMetricCardProps) {
  return (
    <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
            {metric.label}
          </div>
          {metric.symbol && (
            <div className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
              {metric.symbol}
            </div>
          )}
        </div>
        <FinePrintTooltip title={metric.label} finePrint={metric.finePrint} align="right" />
      </div>

      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="text-xl sm:text-2xl font-mono font-semibold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums">
          {metric.value}
        </span>
        {metric.unit && (
          <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
            {metric.unit}
          </span>
        )}
      </div>

      {metric.tone && metric.statusLabel && (
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
          <StatusBadge tone={metric.tone} label={metric.statusLabel} />
        </div>
      )}
    </div>
  );
}
