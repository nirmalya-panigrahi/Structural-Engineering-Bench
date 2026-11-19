import { CalculationResult, ModuleMetadata, StatusTone, ValidationIssue } from './types';
import { asFiniteNumber, formatEngineeringNumber, validateNumberField } from './validation';

export interface GoodmanGraphData {
  sigmaM: number;
  sigmaA: number;
  se: number;
  sut: number;
  sy: number;
  nGoodman: number;
  nSoderberg: number;
  nGerber: number;
  nYield: number;
  governingFactor: number;
  intersectM: number;
  intersectA: number;
}

export const GOODMAN_META: ModuleMetadata = {
  id: 'goodman-haigh',
  index: '04',
  name: 'Goodman / Haigh Diagram',
  shortName: 'Goodman / Haigh',
  category: 'Fatigue & Failure',
  description: 'Safe operating envelope under combined mean and alternating cyclic stresses using Modified Goodman, Soderberg, Gerber, and Langer yield lines.',
  governingStandard: "Modified Goodman & Langer First-Cycle Yield Criterion (Shigley Ch. 6)",
  equations: [
    {
      title: 'Modified Goodman Criterion',
      expression: 'σ_a / S_e + σ_m / S_ut = 1 / n_G',
      note: 'Linear fatigue boundary connecting endurance limit S_e on the σ_a-axis to ultimate strength S_ut on the σ_m-axis.',
    },
    {
      title: 'Langer Static Yield Line',
      expression: '(σ_a + |σ_m|) / S_y = 1 / n_y',
      note: 'Guards against first-cycle yielding when mean + alternating peak stress reaches S_y.',
    },
    {
      title: 'Soderberg & Gerber Bounds',
      expression: 'Soderberg: σ_a/S_e + σ_m/S_y = 1/n_S,   Gerber: (n·σ_a/S_e) + (n·σ_m/S_ut)² = 1',
      note: 'Soderberg is strictly conservative; Gerber fits ductile test data closely.',
    },
  ],
  assumptions: [
    'Compressive mean stress (σ_m < 0) does not degrade fatigue limit in Modified Goodman; conservative flat cap at S_e is shown if σ_m < 0.',
    'Load ratio r = σ_a / σ_m remains proportional along the load line from the origin.',
    'S_e must be pre-adjusted for surface, size, temperature, and notch sensitivity (K_f).',
  ],
  fields: [
    {
      key: 'sigmaM',
      label: 'Mean Stress',
      symbol: 'σ_m',
      unit: 'MPa',
      kind: 'number',
      min: -500,
      max: 1500,
      step: 5,
      finePrint: {
        summary: 'Steady component (σ_max + σ_min) / 2 of the fluctuating stress cycle.',
      },
    },
    {
      key: 'sigmaA',
      label: 'Alternating Stress',
      symbol: 'σ_a',
      unit: 'MPa',
      kind: 'number',
      min: 0,
      max: 1000,
      step: 5,
      finePrint: {
        summary: 'Cyclic amplitude (σ_max − σ_min) / 2 superimposed on the mean stress.',
        validRange: 'σ_a ≥ 0 MPa',
      },
    },
    {
      key: 'se',
      label: 'Endurance Limit',
      symbol: 'S_e',
      unit: 'MPa',
      kind: 'number',
      min: 10,
      max: 1000,
      step: 5,
      finePrint: {
        summary: 'Fully-reversed infinite-life fatigue strength of the component.',
        validRange: '0 < S_e ≤ S_y ≤ S_ut',
      },
    },
    {
      key: 'sy',
      label: 'Yield Strength',
      symbol: 'S_y',
      unit: 'MPa',
      kind: 'number',
      min: 20,
      max: 2000,
      step: 10,
      finePrint: {
        summary: 'Tensile yield strength defining the Langer first-cycle yield line.',
      },
    },
    {
      key: 'sut',
      label: 'Ultimate Tensile Strength',
      symbol: 'S_ut',
      unit: 'MPa',
      kind: 'number',
      min: 30,
      max: 2500,
      step: 10,
      finePrint: {
        summary: 'Ultimate tensile strength anchoring the Modified Goodman and Gerber x-intercept.',
      },
    },
  ],
  presets: [
    {
      id: 'safe-shaft',
      label: 'Safe Design Point',
      description: 'Shaft well inside both Goodman and Langer boundaries (n ≈ 1.8).',
      values: { sigmaM: 150, sigmaA: 95, se: 260, sy: 480, sut: 640 },
    },
    {
      id: 'yield-governed',
      label: 'Static Yield Governed',
      description: 'High mean stress pushing near the Langer yield boundary.',
      values: { sigmaM: 370, sigmaA: 70, se: 260, sy: 480, sut: 640 },
    },
    {
      id: 'fatigue-fail',
      label: 'Fatigue Failure Zone',
      description: 'Alternating stress exceeds Modified Goodman infinite-life envelope.',
      values: { sigmaM: 220, sigmaA: 210, se: 260, sy: 480, sut: 640 },
    },
  ],
  defaultValues: {
    sigmaM: 150,
    sigmaA: 95,
    se: 260,
    sy: 480,
    sut: 640,
  },
};

export function calculateGoodman(
  raw: Record<string, number | string | boolean>,
): CalculationResult<GoodmanGraphData> {
  const sigmaM = asFiniteNumber(raw.sigmaM);
  const sigmaA = asFiniteNumber(raw.sigmaA);
  const se = asFiniteNumber(raw.se);
  const sy = asFiniteNumber(raw.sy);
  const sut = asFiniteNumber(raw.sut);

  const issues: ValidationIssue[] = [];
  validateNumberField(issues, 'sigmaM', 'Mean Stress', sigmaM, { min: -2000, max: 3000 });
  validateNumberField(issues, 'sigmaA', 'Alternating Stress', sigmaA, { min: 0, max: 3000 });
  validateNumberField(issues, 'se', 'Endurance Limit', se, { min: 0, exclusiveMin: true, max: 3000 });
  validateNumberField(issues, 'sy', 'Yield Strength', sy, { min: 0, exclusiveMin: true, max: 4000 });
  validateNumberField(issues, 'sut', 'Ultimate Tensile Strength', sut, { min: 0, exclusiveMin: true, max: 5000 });

  if (issues.length === 0 && sut < sy) {
    issues.push({
      field: 'sut',
      message: 'Ultimate Tensile Strength (S_ut) must be ≥ Yield Strength (S_y).',
    });
  }
  if (issues.length === 0 && se > sut) {
    issues.push({
      field: 'se',
      message: 'Endurance Limit (S_e) cannot exceed Ultimate Tensile Strength (S_ut).',
    });
  }

  if (issues.length > 0) {
    return { valid: false, issues, warnings: [], metrics: [], graphData: null };
  }

  const effM = Math.max(0, sigmaM);
  const goodmanDenom = sigmaA / se + effM / sut;
  const nGoodman = goodmanDenom > 1e-9 ? 1 / goodmanDenom : Infinity;

  const soderbergDenom = sigmaA / se + effM / sy;
  const nSoderberg = soderbergDenom > 1e-9 ? 1 / soderbergDenom : Infinity;

  const yieldDenom = (sigmaA + Math.abs(sigmaM)) / sy;
  const nYield = yieldDenom > 1e-9 ? 1 / yieldDenom : Infinity;

  let nGerber = Infinity;
  if (effM === 0) {
    nGerber = sigmaA > 0 ? se / sigmaA : Infinity;
  } else if (sigmaA === 0) {
    nGerber = sut / effM;
  } else {
    const aTerm = Math.pow(effM / sut, 2);
    const bTerm = sigmaA / se;
    nGerber = (-bTerm + Math.sqrt(bTerm * bTerm + 4 * aTerm)) / (2 * aTerm);
  }

  const governingFactor = Math.min(nGoodman, nYield);
  const intersectM = Number.isFinite(governingFactor) ? sigmaM * governingFactor : 0;
  const intersectA = Number.isFinite(governingFactor) ? sigmaA * governingFactor : 0;

  let tone: StatusTone = 'safe';
  let statusLabel = 'Infinite Life Envelope';
  if (nYield < 1) {
    tone = 'danger';
    statusLabel = 'First-Cycle Yield Failure';
  } else if (nGoodman < 1) {
    tone = 'danger';
    statusLabel = 'Fatigue Failure Risk';
  } else if (governingFactor < 1.25) {
    tone = 'caution';
    statusLabel = 'Marginal Safety (1.0 ≤ n < 1.25)';
  }

  const warnings: string[] = [];
  if (sigmaM < 0) {
    warnings.push('Compressive mean stress (σ_m < 0): Modified Goodman uses σ_a ≤ S_e while static compression yield is checked via |σ_m| + σ_a ≤ S_y.');
  }
  if (nYield < nGoodman) {
    warnings.push('Langer static yielding governs over fatigue at this high mean-stress ratio.');
  }

  return {
    valid: true,
    issues: [],
    warnings,
    verdict: {
      tone,
      label: statusLabel,
      detail: `Governing safety factor n = ${Number.isFinite(governingFactor) ? formatEngineeringNumber(governingFactor, 2) : '∞'} (${nYield < nGoodman ? 'Langer Yield' : 'Modified Goodman'})`,
    },
    metrics: [
      {
        key: 'nGoodman',
        label: 'Goodman Safety Factor',
        symbol: 'n_G',
        value: Number.isFinite(nGoodman) ? formatEngineeringNumber(nGoodman, 2) : '∞',
        rawValue: nGoodman,
        unit: '×',
        tone: nGoodman >= 1.25 ? 'safe' : nGoodman >= 1 ? 'caution' : 'danger',
        statusLabel: nGoodman >= 1 ? 'Pass' : 'Fail',
        finePrint: {
          summary: 'Fatigue safety factor against the Modified Goodman line.',
          formula: '1 / n_G = σ_a/S_e + σ_m/S_ut',
        },
      },
      {
        key: 'nYield',
        label: 'Langer Yield Factor',
        symbol: 'n_y',
        value: Number.isFinite(nYield) ? formatEngineeringNumber(nYield, 2) : '∞',
        rawValue: nYield,
        unit: '×',
        tone: nYield >= 1.25 ? 'safe' : nYield >= 1 ? 'caution' : 'danger',
        statusLabel: nYield >= 1 ? 'Pass' : 'Yield',
        finePrint: {
          summary: 'Static safety factor guarding against first-cycle plastic yield.',
          formula: 'n_y = S_y / (|σ_m| + σ_a)',
        },
      },
      {
        key: 'nSoderberg',
        label: 'Soderberg Factor',
        symbol: 'n_S',
        value: Number.isFinite(nSoderberg) ? formatEngineeringNumber(nSoderberg, 2) : '∞',
        rawValue: nSoderberg,
        unit: '×',
        finePrint: {
          summary: 'Most conservative linear envelope using S_y instead of S_ut.',
          formula: '1 / n_S = σ_a/S_e + σ_m/S_y',
        },
      },
      {
        key: 'nGerber',
        label: 'Gerber Parabolic Factor',
        symbol: 'n_Gerber',
        value: Number.isFinite(nGerber) ? formatEngineeringNumber(nGerber, 2) : '∞',
        rawValue: nGerber,
        unit: '×',
        finePrint: {
          summary: 'Parabolic fit representing median experimental ductile fatigue limits.',
        },
      },
    ],
    graphData: {
      sigmaM,
      sigmaA,
      se,
      sut,
      sy,
      nGoodman,
      nSoderberg,
      nGerber,
      nYield,
      governingFactor,
      intersectM,
      intersectA,
    },
  };
}
