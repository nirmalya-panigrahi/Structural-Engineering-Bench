import { InputFieldSpec } from '../../engine/types';
import { FinePrintTooltip } from './FinePrintTooltip';

interface NumberFieldProps {
  field: InputFieldSpec;
  value: number | string | boolean;
  errorMessage?: string;
  onChange: (key: string, value: number | string | boolean) => void;
}

export function NumberField({ field, value, errorMessage, onChange }: NumberFieldProps) {
  if (field.kind === 'select') {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={`field-${field.key}`}
            className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
          >
            <span>{field.label}</span>
            {field.symbol && (
              <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                ({field.symbol})
              </span>
            )}
          </label>
          <FinePrintTooltip title={field.label} finePrint={field.finePrint} align="right" />
        </div>
        <select
          id={`field-${field.key}`}
          value={String(value)}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
        >
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.kind === 'toggle') {
    const checked = Boolean(value);
    return (
      <div className="flex items-center justify-between gap-3 py-1">
        <div className="flex items-center gap-1.5">
          <label
            htmlFor={`field-${field.key}`}
            className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            {field.label}
          </label>
          <FinePrintTooltip title={field.label} finePrint={field.finePrint} />
        </div>
        <button
          id={`field-${field.key}`}
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(field.key, !checked)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
            checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    );
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  const canSlide =
    field.min !== undefined &&
    field.max !== undefined &&
    Number.isFinite(numericValue) &&
    numericValue >= field.min &&
    numericValue <= field.max;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={`field-${field.key}`}
          className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
        >
          <span>{field.label}</span>
          {field.symbol && (
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              {field.symbol}
            </span>
          )}
        </label>
        <FinePrintTooltip title={field.label} finePrint={field.finePrint} align="right" />
      </div>

      <div className="relative flex items-center">
        <input
          id={`field-${field.key}`}
          type="number"
          step={field.step ?? 'any'}
          value={value === '' ? '' : String(value)}
          onChange={(e) => {
            const rawStr = e.target.value;
            if (rawStr === '' || rawStr === '-' || rawStr === '.') {
              onChange(field.key, rawStr);
              return;
            }
            const parsed = Number(rawStr);
            onChange(field.key, Number.isNaN(parsed) ? rawStr : parsed);
          }}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? `err-${field.key}` : undefined}
          className={`w-full h-10 pl-3 ${
            field.unit ? 'pr-14' : 'pr-3'
          } rounded-md border font-mono text-sm tabular-nums bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-colors ${
            errorMessage
              ? 'border-rose-500 focus:ring-rose-500/40'
              : 'border-slate-200 dark:border-slate-700 focus:ring-blue-600 focus:border-blue-600'
          }`}
        />
        {field.unit && (
          <span className="pointer-events-none absolute right-3 text-[11px] font-mono text-slate-400 dark:text-slate-500">
            {field.unit}
          </span>
        )}
      </div>

      {field.min !== undefined && field.max !== undefined && (
        <input
          type="range"
          aria-label={`${field.label} slider`}
          min={field.min}
          max={field.max}
          step={field.step ?? (field.max - field.min) / 100}
          value={canSlide ? numericValue : field.min}
          onChange={(e) => onChange(field.key, Number(e.target.value))}
          className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      )}

      {errorMessage && (
        <p id={`err-${field.key}`} role="alert" className="text-[11px] text-rose-600 dark:text-rose-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
