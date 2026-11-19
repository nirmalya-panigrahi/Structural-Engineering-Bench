import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useEngineeringBench } from '../hooks/useEngineeringBench';
import { useTheme } from '../hooks/useTheme';

describe('useEngineeringBench hook', () => {
  it('switches modules, filters categories, updates fields, and resets defaults', () => {
    const { result } = renderHook(() => useEngineeringBench('mohrs-circle'));
    expect(result.current.activeModuleId).toBe('mohrs-circle');
    expect(result.current.calculation.valid).toBe(true);

    act(() => {
      result.current.selectCategory('Geotechnical');
    });
    expect(result.current.filteredModules.length).toBe(2);
    expect(result.current.activeModuleId).toBe('mohr-coulomb');

    act(() => {
      result.current.selectModule('casagrande');
      result.current.updateField('liquidLimit', 68);
      result.current.updateField('plasticLimit', 24);
    });
    expect(result.current.calculation.metrics[0].value).toBe('CH');

    act(() => {
      result.current.resetActiveModule();
    });
    expect(result.current.currentValues.liquidLimit).toBe(42);
    expect(result.current.calculation.metrics[0].value).toBe('CL');
  });
});

describe('useTheme hook', () => {
  it('toggles light/dark theme class on documentElement', () => {
    const { result } = renderHook(() => useTheme());
    const initial = result.current.theme;
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).not.toBe(initial);
    if (result.current.theme === 'dark') {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    } else {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    }
  });
});
