import { useCallback, useMemo, useRef, useState } from 'react';
import { MODULE_MAP, MODULE_REGISTRY } from '../engine/registry';
import { CalculationResult, ModuleCategory, ModuleId } from '../engine/types';

type ModuleValuesMap = Record<ModuleId, Record<string, number | string | boolean>>;

function buildInitialValues(): ModuleValuesMap {
  const map = {} as ModuleValuesMap;
  for (const mod of MODULE_REGISTRY) {
    map[mod.meta.id] = { ...mod.meta.defaultValues };
  }
  return map;
}

export function useEngineeringBench(initialModule: ModuleId = 'mohrs-circle') {
  const [activeCategory, setActiveCategory] = useState<ModuleCategory>('All');
  const [activeModuleId, setActiveModuleId] = useState<ModuleId>(initialModule);
  const activeModuleIdRef = useRef<ModuleId>(initialModule);
  const [valuesByModule, setValuesByModule] = useState<ModuleValuesMap>(buildInitialValues);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const filteredModules = useMemo(() => {
    if (activeCategory === 'All') return MODULE_REGISTRY;
    return MODULE_REGISTRY.filter((m) => m.meta.category === activeCategory);
  }, [activeCategory]);

  const activeModule = MODULE_MAP[activeModuleId] ?? MODULE_REGISTRY[0];
  const currentValues = valuesByModule[activeModule.meta.id];

  const calculation: CalculationResult = useMemo(() => {
    return activeModule.calculate(currentValues);
  }, [activeModule, currentValues]);

  const selectCategory = useCallback((category: ModuleCategory) => {
    setActiveCategory(category);
    if (category !== 'All') {
      const firstMatch = MODULE_REGISTRY.find((m) => m.meta.category === category);
      if (firstMatch) {
        setActiveModuleId((prev) => {
          const prevMod = MODULE_MAP[prev];
          const next = prevMod.meta.category === category ? prev : firstMatch.meta.id;
          activeModuleIdRef.current = next;
          return next;
        });
      }
    }
  }, []);

  const selectModule = useCallback((id: ModuleId) => {
    activeModuleIdRef.current = id;
    setActiveModuleId(id);
  }, []);

  const updateField = useCallback(
    (fieldKey: string, nextValue: number | string | boolean) => {
      const targetId = activeModuleIdRef.current;
      setValuesByModule((prev) => ({
        ...prev,
        [targetId]: {
          ...prev[targetId],
          [fieldKey]: nextValue,
        },
      }));
    },
    [],
  );

  const applyPreset = useCallback(
    (presetValues: Record<string, number | string | boolean>) => {
      setIsRecalculating(true);
      setValuesByModule((prev) => ({
        ...prev,
        [activeModuleId]: {
          ...prev[activeModuleId],
          ...presetValues,
        },
      }));
      window.setTimeout(() => setIsRecalculating(false), 120);
    },
    [activeModuleId],
  );

  const resetActiveModule = useCallback(() => {
    setValuesByModule((prev) => ({
      ...prev,
      [activeModuleId]: { ...activeModule.meta.defaultValues },
    }));
  }, [activeModuleId, activeModule.meta.defaultValues]);

  const clearInputsForEmptyState = useCallback(() => {
    const cleared: Record<string, number | string | boolean> = {};
    for (const field of activeModule.meta.fields) {
      if (field.kind === 'number') {
        cleared[field.key] = '';
      } else {
        cleared[field.key] = activeModule.meta.defaultValues[field.key];
      }
    }
    setValuesByModule((prev) => ({
      ...prev,
      [activeModuleId]: cleared,
    }));
  }, [activeModuleId, activeModule.meta.fields, activeModule.meta.defaultValues]);

  return {
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
  };
}
