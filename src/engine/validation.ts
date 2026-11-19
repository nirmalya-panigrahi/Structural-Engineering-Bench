import { ValidationIssue } from './types';

export function asFiniteNumber(value: unknown, fallback = NaN): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return fallback;
}

export function validateNumberField(
  issues: ValidationIssue[],
  field: string,
  label: string,
  value: number,
  opts: {
    min?: number;
    max?: number;
    exclusiveMin?: boolean;
    exclusiveMax?: boolean;
  } = {},
): void {
  if (!Number.isFinite(value)) {
    issues.push({
      field,
      message: `${label} must be a valid finite number.`,
    });
    return;
  }
  if (opts.min !== undefined) {
    if (opts.exclusiveMin ? value <= opts.min : value < opts.min) {
      const cmp = opts.exclusiveMin ? '>' : '≥';
      issues.push({
        field,
        message: `${label} must be ${cmp} ${opts.min}.`,
      });
      return;
    }
  }
  if (opts.max !== undefined) {
    if (opts.exclusiveMax ? value >= opts.max : value > opts.max) {
      const cmp = opts.exclusiveMax ? '<' : '≤';
      issues.push({
        field,
        message: `${label} must be ${cmp} ${opts.max}.`,
      });
    }
  }
}

export function formatEngineeringNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1e6 || (Math.abs(value) > 0 && Math.abs(value) < 1e-3)) {
    return value.toExponential(decimals);
  }
  const rounded = Math.abs(value) < 1e-9 ? 0 : value;
  return rounded.toFixed(decimals);
}
