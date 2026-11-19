import { Info } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { FinePrintMeta } from '../../engine/types';

interface FinePrintTooltipProps {
  title: string;
  finePrint: FinePrintMeta;
  align?: 'left' | 'right';
}

export function FinePrintTooltip({ title, finePrint, align = 'left' }: FinePrintTooltipProps) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  const open = pinned || hovered || focused;

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setPinned(false);
        setHovered(false);
        setFocused(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPinned(false);
        setHovered(false);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={`Fine print for ${title}`}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setPinned((prev) => !prev)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="inline-flex items-center justify-center w-6 h-6 -m-1 rounded text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors cursor-pointer"
      >
        <Info className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`z-50 absolute bottom-full mb-2 w-72 sm:w-80 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-lg text-left pointer-events-auto ${
            align === 'right' ? 'right-0' : 'left-0 sm:-translate-x-1/4'
          }`}
        >
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-50 mb-1">
            {title} — Fine Print
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {finePrint.summary}
          </p>

          {finePrint.formula && (
            <div className="mt-2 px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 font-mono text-[11px] text-blue-700 dark:text-blue-300 break-words">
              {finePrint.formula}
            </div>
          )}

          {(finePrint.validRange || finePrint.standard || finePrint.assumptions) && (
            <dl className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
              {finePrint.validRange && (
                <div>
                  <dt className="inline font-medium text-slate-700 dark:text-slate-300">Domain: </dt>
                  <dd className="inline font-mono">{finePrint.validRange}</dd>
                </div>
              )}
              {finePrint.standard && (
                <div>
                  <dt className="inline font-medium text-slate-700 dark:text-slate-300">Standard: </dt>
                  <dd className="inline">{finePrint.standard}</dd>
                </div>
              )}
              {finePrint.assumptions && (
                <div>
                  <dt className="inline font-medium text-slate-700 dark:text-slate-300">Note: </dt>
                  <dd className="inline">{finePrint.assumptions}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
