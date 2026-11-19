import { AlertCircle, RotateCcw } from 'lucide-react';
import { ValidationIssue } from '../../engine/types';

export function ChartLoadingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Recalculating engineering plot"
      className="w-full h-[380px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between animate-pulse"
    >
      <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="flex-1 my-4 rounded bg-slate-100 dark:bg-slate-800/60" />
      <div className="h-3 w-64 rounded bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

interface ValidationErrorStateProps {
  issues: ValidationIssue[];
  onRestoreDefaults: () => void;
}

export function ValidationErrorState({ issues, onRestoreDefaults }: ValidationErrorStateProps) {
  return (
    <div
      role="alert"
      className="w-full rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 p-6 space-y-3"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-100">
            Invalid Input Parameters — Calculation Halted
          </h3>
          <p className="text-xs text-rose-700 dark:text-rose-300">
            Correct the highlighted parameter constraints in the input panel to plot the analytical curve and compute outputs.
          </p>
          <ul className="list-disc pl-4 space-y-1 text-xs text-rose-700 dark:text-rose-300 pt-1">
            {issues.map((issue) => (
              <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      </div>
      <div>
        <button
          type="button"
          onClick={onRestoreDefaults}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 hover:bg-rose-100/60 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          Restore Valid Defaults
        </button>
      </div>
    </div>
  );
}

interface EmptyInputsStateProps {
  onRestoreDefaults: () => void;
}

export function EmptyInputsState({ onRestoreDefaults }: EmptyInputsStateProps) {
  return (
    <div className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        No Numeric Parameters Entered
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
        Enter numeric values in the parameter panel on the left, or load a calibrated engineering preset to generate plots and outputs.
      </p>
      <button
        type="button"
        onClick={onRestoreDefaults}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
        Load Default Benchmark
      </button>
    </div>
  );
}
