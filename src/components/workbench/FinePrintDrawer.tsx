import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { AshbyGraphData } from '../../engine/ashbyChart';
import { ModuleMetadata } from '../../engine/types';
import { formatEngineeringNumber } from '../../engine/validation';
import { StatusBadge } from '../ui/StatusBadge';

interface FinePrintDrawerProps {
  meta: ModuleMetadata;
  graphData: unknown;
}

export function FinePrintDrawer({ meta, graphData }: FinePrintDrawerProps) {
  const [expanded, setExpanded] = useState(true);
  const ashbyData = meta.id === 'ashby-chart' && graphData ? (graphData as AshbyGraphData) : null;

  return (
    <section
      id="workbench-fine-print"
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="w-full px-4 py-3 flex items-center justify-between gap-4 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg"
      >
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Governing Equations &amp; Engineering Fine Print
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {meta.governingStandard}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-5">
          {ashbyData && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Ranked Material Family Trade-Off Table
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-3 font-medium">Rank</th>
                      <th className="py-2 pr-3 font-medium">Material Family</th>
                      <th className="py-2 pr-3 font-medium text-right">Centroid ρ (kg/m³)</th>
                      <th className="py-2 pr-3 font-medium text-right">Centroid {ashbyData.yUnit}</th>
                      <th className="py-2 pr-3 font-medium text-right">Index M</th>
                      <th className="py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {ashbyData.candidates.map((cand, idx) => (
                      <tr key={cand.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2 pr-3 font-mono tabular-nums text-slate-500">#{idx + 1}</td>
                        <td className="py-2 pr-3 font-medium text-slate-800 dark:text-slate-200">{cand.name}</td>
                        <td className="py-2 pr-3 font-mono tabular-nums text-right text-slate-700 dark:text-slate-300">
                          {Math.round(cand.xGeoMean)}
                        </td>
                        <td className="py-2 pr-3 font-mono tabular-nums text-right text-slate-700 dark:text-slate-300">
                          {formatEngineeringNumber(cand.yGeoMean, 1)}
                        </td>
                        <td className="py-2 pr-3 font-mono tabular-nums text-right font-semibold text-slate-900 dark:text-slate-100">
                          {formatEngineeringNumber(cand.indexValue, 2)}
                        </td>
                        <td className="py-2">
                          <StatusBadge
                            tone={cand.meetsThreshold ? 'safe' : 'neutral'}
                            label={cand.meetsThreshold ? 'Qualifies' : 'Below Target'}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Analytical Formulations
              </h4>
              <div className="space-y-2.5">
                {meta.equations.map((eq) => (
                  <div
                    key={eq.title}
                    className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1"
                  >
                    <div className="text-xs font-medium text-slate-800 dark:text-slate-100">{eq.title}</div>
                    <div className="font-mono text-xs text-blue-700 dark:text-blue-300 break-words">
                      {eq.expression}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{eq.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Engineering Assumptions &amp; Scope Limits
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed list-disc pl-4">
                {meta.assumptions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
