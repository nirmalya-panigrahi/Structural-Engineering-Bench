import { AlertTriangle, Download, Moon, RotateCcw, Sun, Trash2 } from 'lucide-react';
import { ModuleChart } from './components/charts/ModuleChart';
import { ModuleSidebar } from './components/layout/ModuleSidebar';
import { TopBar } from './components/layout/TopBar';
import { FinePrintTooltip } from './components/ui/FinePrintTooltip';
import { NumberField } from './components/ui/NumberField';
import { OutputMetricCard } from './components/ui/OutputMetricCard';
import { StatusBadge } from './components/ui/StatusBadge';
import { FinePrintDrawer } from './components/workbench/FinePrintDrawer';
import {
  ChartLoadingSkeleton,
  EmptyInputsState,
  ValidationErrorState,
} from './components/workbench/WorkspaceStates';
import { useEngineeringBench } from './hooks/useEngineeringBench';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const {
    activeCategory,
    activeModuleId,
    activeModule,
    filteredModules,
    currentValues,
    calculation,
    isRecalculating,
    selectCategory,
    selectModule,
    updateField,
    applyPreset,
    resetActiveModule,
    clearInputsForEmptyState,
  } = useEngineeringBench('mohrs-circle');

  const { meta } = activeModule;
  const issueMap = new Map(calculation.issues.map((i) => [i.field, i.message]));

  const hasEmptyNumericFields = meta.fields
    .filter((f) => f.kind === 'number' && (!f.visibleWhen || f.visibleWhen(currentValues)))
    .every((f) => currentValues[f.key] === '');

  const handleExportSnapshot = () => {
    const payload = {
      module: meta.id,
      name: meta.name,
      standard: meta.governingStandard,
      inputs: currentValues,
      outputs: calculation.metrics.map((m) => ({
        label: m.label,
        symbol: m.symbol,
        value: m.value,
        unit: m.unit,
      })),
      verdict: calculation.verdict,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stratabench-${meta.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <TopBar onResetModule={resetActiveModule} />

      {/* Workspace Header & Utility Toolbar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Module {meta.index}</span>
              <span aria-hidden="true">·</span>
              <span>{meta.category}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{meta.governingStandard}</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
                {meta.name}
              </h1>
              <FinePrintTooltip
                title={meta.name}
                finePrint={{
                  summary: meta.description,
                  standard: meta.governingStandard,
                  assumptions: meta.assumptions[0],
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportSnapshot}
              disabled={!calculation.valid}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Export JSON
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                  Light Mode
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                  Dark Mode
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Workbench */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1: Module Directory */}
          <div className="lg:col-span-3 xl:col-span-2">
            <ModuleSidebar
              modules={filteredModules}
              activeModuleId={activeModuleId}
              activeCategory={activeCategory}
              onSelectCategory={selectCategory}
              onSelectModule={selectModule}
            />
          </div>

          {/* Column 2: Parametric Input Console */}
          <section
            id="workbench-inputs"
            aria-label="Input Parameters"
            className="lg:col-span-4 xl:col-span-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-5"
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Input Parameters
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearInputsForEmptyState}
                  aria-label="Clear numeric inputs"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                  Clear
                </button>
                <button
                  type="button"
                  onClick={resetActiveModule}
                  aria-label="Reset module inputs"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  Reset
                </button>
              </div>
            </div>

            {/* Calibrated Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Calibrated Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {meta.presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.description}
                    onClick={() => applyPreset(preset.values)}
                    className="px-2.5 py-1 text-[11px] font-medium rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-300 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Numeric / Select Inputs */}
            <div className="space-y-4">
              {meta.fields
                .filter((field) => !field.visibleWhen || field.visibleWhen(currentValues))
                .map((field) => (
                  <NumberField
                    key={`${meta.id}-${field.key}`}
                    field={field}
                    value={currentValues[field.key]}
                    errorMessage={issueMap.get(field.key)}
                    onChange={updateField}
                  />
                ))}
            </div>
          </section>

          {/* Column 3: Analytical Visualization + Computed Outputs */}
          <div className="lg:col-span-5 xl:col-span-7 space-y-5 min-w-0">
            {/* Engineering Verdict Strip */}
            {calculation.valid && calculation.verdict && (
              <div className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <StatusBadge tone={calculation.verdict.tone} label={calculation.verdict.label} />
                <span className="font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                  {calculation.verdict.detail}
                </span>
              </div>
            )}

            {/* Warnings Banner (Non-blocking engineering caveats) */}
            {calculation.valid && calculation.warnings.length > 0 && (
              <div
                role="status"
                className="px-4 py-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  {calculation.warnings.map((w) => (
                    <p key={w}>{w}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Dominant Analytical Plot Viewport */}
            <section id="workbench-plot" aria-label="Analytical Visualization">
              {isRecalculating ? (
                <ChartLoadingSkeleton />
              ) : hasEmptyNumericFields ? (
                <EmptyInputsState onRestoreDefaults={resetActiveModule} />
              ) : !calculation.valid ? (
                <ValidationErrorState
                  issues={calculation.issues}
                  onRestoreDefaults={resetActiveModule}
                />
              ) : (
                <ModuleChart moduleId={meta.id} graphData={calculation.graphData} />
              )}
            </section>

            {/* Computed Outputs Grid */}
            {calculation.valid && (
              <section id="workbench-outputs" aria-label="Computed Engineering Outputs" className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Computed Outputs
                  </h2>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Hover or click info icons for fine-print equations
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {calculation.metrics.map((metric) => (
                    <OutputMetricCard key={metric.key} metric={metric} />
                  ))}
                </div>
              </section>
            )}

            {/* Governing Equations & Fine Print Drawer */}
            <FinePrintDrawer meta={meta} graphData={calculation.valid ? calculation.graphData : null} />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>StrataBench · Mechanical &amp; Civil Engineering Workbench</span>
          <span>Verify all analytical calculations against project-specific design codes prior to fabrication or construction.</span>
        </div>
      </footer>
    </div>
  );
}
