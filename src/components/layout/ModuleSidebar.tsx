import { RegisteredModule } from '../../engine/registry';
import { ModuleCategory, ModuleId } from '../../engine/types';

interface ModuleSidebarProps {
  modules: RegisteredModule[];
  activeModuleId: ModuleId;
  activeCategory: ModuleCategory;
  onSelectCategory: (cat: ModuleCategory) => void;
  onSelectModule: (id: ModuleId) => void;
}

const CATEGORIES: ModuleCategory[] = [
  'All',
  'Solid Mechanics',
  'Fatigue & Failure',
  'Structural',
  'Geotechnical',
  'Materials',
];

export function ModuleSidebar({
  modules,
  activeModuleId,
  activeCategory,
  onSelectCategory,
  onSelectModule,
}: ModuleSidebarProps) {
  return (
    <aside aria-label="Engineering Modules" className="space-y-4">
      {/* Category Filter */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Discipline Filter
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Select Escape Hatch */}
      <div className="lg:hidden">
        <label htmlFor="mobile-module-select" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
          Active Engineering Module
        </label>
        <select
          id="mobile-module-select"
          value={activeModuleId}
          onChange={(e) => onSelectModule(e.target.value as ModuleId)}
          className="w-full h-11 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-slate-100"
        >
          {modules.map(({ meta }) => (
            <option key={meta.id} value={meta.id}>
              {meta.index}. {meta.name}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop Numbered Module List */}
      <div className="hidden lg:block rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
        {modules.map(({ meta }) => {
          const isActive = meta.id === activeModuleId;
          return (
            <button
              key={meta.id}
              type="button"
              onClick={() => onSelectModule(meta.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full text-left px-3.5 py-2.5 transition-colors flex items-start gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${
                isActive
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span
                className={`font-mono text-xs mt-0.5 tabular-nums shrink-0 ${
                  isActive ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {meta.index}.
              </span>
              <span className="min-w-0">
                <span className={`block text-xs font-semibold leading-snug ${isActive ? 'text-blue-700 dark:text-blue-200' : 'text-slate-900 dark:text-slate-100'}`}>
                  {meta.shortName}
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {meta.category}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
