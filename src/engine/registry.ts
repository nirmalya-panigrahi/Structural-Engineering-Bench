import { ASHBY_CHART_META, calculateAshbyChart } from './ashbyChart';
import { BEAM_SFD_BMD_META, calculateBeamSfdBmd } from './beamSfdBmd';
import { calculateCasagrande, CASAGRANDE_META } from './casagrande';
import { calculateEulerBuckling, EULER_BUCKLING_META } from './eulerBuckling';
import { calculateGoodman, GOODMAN_META } from './goodman';
import { calculateMohrCoulomb, MOHR_COULOMB_META } from './mohrCoulomb';
import { calculateMohrsCircle, MOHRS_CIRCLE_META } from './mohrsCircle';
import { calculatePmInteraction, PM_INTERACTION_META } from './pmInteraction';
import { calculateSnCurve, SN_CURVE_META } from './snCurve';
import { calculateStressStrain, STRESS_STRAIN_META } from './stressStrain';
import { CalculationResult, ModuleId, ModuleMetadata } from './types';

export interface RegisteredModule {
  meta: ModuleMetadata;
  calculate: (values: Record<string, number | string | boolean>) => CalculationResult;
}

export const MODULE_REGISTRY: RegisteredModule[] = [
  { meta: MOHRS_CIRCLE_META, calculate: calculateMohrsCircle },
  { meta: STRESS_STRAIN_META, calculate: calculateStressStrain },
  { meta: SN_CURVE_META, calculate: calculateSnCurve },
  { meta: GOODMAN_META, calculate: calculateGoodman },
  { meta: BEAM_SFD_BMD_META, calculate: calculateBeamSfdBmd },
  { meta: MOHR_COULOMB_META, calculate: calculateMohrCoulomb },
  { meta: ASHBY_CHART_META, calculate: calculateAshbyChart },
  { meta: EULER_BUCKLING_META, calculate: calculateEulerBuckling },
  { meta: PM_INTERACTION_META, calculate: calculatePmInteraction },
  { meta: CASAGRANDE_META, calculate: calculateCasagrande },
];

export const MODULE_MAP: Record<ModuleId, RegisteredModule> = MODULE_REGISTRY.reduce(
  (acc, item) => {
    acc[item.meta.id] = item;
    return acc;
  },
  {} as Record<ModuleId, RegisteredModule>,
);
