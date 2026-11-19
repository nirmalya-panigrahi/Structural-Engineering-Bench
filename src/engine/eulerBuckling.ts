import { CalculationResult, ModuleMetadata, StatusTone, ValidationIssue } from './types';
import { asFiniteNumber, formatEngineeringNumber, validateNumberField } from './validation';

export interface BucklingCurvePoint {
  slenderness: number;
  eulerStressMPa: number;
  johnsonStressMPa: number;
  criticalStressMPa: number;
}

export interface EulerBucklingGraphData {
  lengthMm: number;
  radiusGyrationMm: number;
  areaMm2: number;
  kFactor: number;
  modulusGPa: number;
  yieldMPa: number;
  slenderness: number;
  transitionCc: number;
  regime: 'Euler Elastic' | 'Johnson Inelastic';
  criticalStressMPa: number;
  criticalLoadKN: number;
  curve: BucklingCurvePoint[];
}

export const EULER_BUCKLING_META: ModuleMetadata = {
  id: 'euler-buckling',
  index: '08',
  name: 'Euler Column Buckling Curve',
  shortName: 'Euler Buckling',
  category: 'Structural',
  description: 'Critical buckling stress versus effective slenderness ratio KL/r with automatic Euler elastic to Johnson parabolic inelastic transition.',
  governingStandard: "Euler–Johnson Column Stability Criterion (Shigley Ch. 4 / AISC Conceptual Transition)",
  equations: [
    {
      title: 'Transition Slenderness Ratio',
      expression: 'C_c = √(2π² E / σ_y)',
      note: 'Boundary where Euler elastic buckling stress equals σ_y / 2, separating slender from intermediate columns.',
    },
    {
      title: 'Euler Elastic Buckling (KL/r ≥ C_c)',
      expression: 'σ_cr = π² E / (KL / r)²',
      note: 'Governs slender columns failing by elastic instability prior to material yield.',
    },
    {
      title: 'Johnson Inelastic Parabola (KL/r < C_c)',
      expression: 'σ_cr = σ_y − (σ_y² / (4π² E)) · (KL / r)²',
      note: 'Smoothly transitions from σ_y at zero slenderness to tangent Euler curve at C_c.',
    },
  ],
  assumptions: [
    'Initially straight, concentric axial compression column with uniform cross-section.',
    'End-fixity factor K: Fixed–Fixed (0.5), Fixed–Pinned (0.7), Pinned–Pinned (1.0), Fixed–Free Flagpole (2.0).',
    'Critical load P_cr = σ_cr · A represents theoretical bifurcation; apply project design safety factors separately.',
  ],
  fields: [
    {
      key: 'endCondition',
      label: 'End-Fixity Factor',
      symbol: 'K',
      kind: 'select',
      options: [
        { value: '0.5', label: 'Fixed–Fixed (K = 0.5)' },
        { value: '0.7', label: 'Fixed–Pinned (K = 0.7)' },
        { value: '1.0', label: 'Pinned–Pinned (K = 1.0)' },
        { value: '2.0', label: 'Fixed–Free Cantilever (K = 2.0)' },
      ],
      finePrint: {
        summary: 'Theoretical effective length multiplier K adjusting unbraced length L.',
      },
    },
    {
      key: 'lengthMm',
      label: 'Unbraced Column Length',
      symbol: 'L',
      unit: 'mm',
      kind: 'number',
      min: 100,
      max: 20000,
      step: 100,
      finePrint: {
        summary: 'Unsupported column length between lateral bracing points.',
        validRange: 'L > 0 mm',
      },
    },
    {
      key: 'radiusGyrationMm',
      label: 'Radius of Gyration',
      symbol: 'r',
      unit: 'mm',
      kind: 'number',
      min: 2,
      max: 500,
      step: 1,
      finePrint: {
        summary: 'Minimum cross-sectional radius of gyration r = √(I_min / A) about the weak buckling axis.',
        validRange: 'r > 0 mm',
      },
    },
    {
      key: 'areaMm2',
      label: 'Cross-Sectional Area',
      symbol: 'A',
      unit: 'mm²',
      kind: 'number',
      min: 10,
      max: 100000,
      step: 50,
      finePrint: {
        summary: 'Gross cross-sectional area used to convert critical stress σ_cr into critical load P_cr.',
      },
    },
    {
      key: 'modulusGPa',
      label: "Young's Modulus",
      symbol: 'E',
      unit: 'GPa',
      kind: 'number',
      min: 5,
      max: 500,
      step: 5,
      finePrint: {
        summary: 'Elastic modulus of the column material (200 GPa for steel, 69 GPa for aluminum).',
      },
    },
    {
      key: 'yieldMPa',
      label: 'Yield Strength',
      symbol: 'σ_y',
      unit: 'MPa',
      kind: 'number',
      min: 20,
      max: 2000,
      step: 10,
      finePrint: {
        summary: 'Compressive yield strength anchoring the Johnson inelastic buckling curve.',
      },
    },
  ],
  presets: [
    {
      id: 'slender-steel',
      label: 'Slender Steel Strut',
      description: '3.6 m pinned steel column in pure Euler elastic regime.',
      values: { endCondition: '1.0', lengthMm: 3600, radiusGyrationMm: 28, areaMm2: 2400, modulusGPa: 200, yieldMPa: 250 },
    },
    {
      id: 'intermediate-johnson',
      label: 'Intermediate Column',
      description: 'Compact W-section column governed by Johnson inelastic curve.',
      values: { endCondition: '0.7', lengthMm: 3000, radiusGyrationMm: 35, areaMm2: 4200, modulusGPa: 200, yieldMPa: 345 },
    },
    {
      id: 'flagpole-cantilever',
      label: 'Fixed–Free Mast (K=2)',
      description: 'High effective length aluminum mast.',
      values: { endCondition: '2.0', lengthMm: 2500, radiusGyrationMm: 30, areaMm2: 1800, modulusGPa: 69, yieldMPa: 276 },
    },
  ],
  defaultValues: {
    endCondition: '1.0',
    lengthMm: 3600,
    radiusGyrationMm: 28,
    areaMm2: 2400,
    modulusGPa: 200,
    yieldMPa: 250,
  },
};

export function calculateEulerBuckling(
  raw: Record<string, number | string | boolean>,
): CalculationResult<EulerBucklingGraphData> {
  const kFactor = asFiniteNumber(raw.endCondition, 1.0);
  const lengthMm = asFiniteNumber(raw.lengthMm);
  const r = asFiniteNumber(raw.radiusGyrationMm);
  const areaMm2 = asFiniteNumber(raw.areaMm2);
  const modulusGPa = asFiniteNumber(raw.modulusGPa);
  const yieldMPa = asFiniteNumber(raw.yieldMPa);

  const issues: ValidationIssue[] = [];
  validateNumberField(issues, 'endCondition', 'End-Fixity Factor', kFactor, { min: 0.1, max: 5 });
  validateNumberField(issues, 'lengthMm', 'Column Length', lengthMm, { min: 0, exclusiveMin: true, max: 100000 });
  validateNumberField(issues, 'radiusGyrationMm', 'Radius of Gyration', r, { min: 0, exclusiveMin: true, max: 5000 });
  validateNumberField(issues, 'areaMm2', 'Cross-Sectional Area', areaMm2, { min: 0, exclusiveMin: true, max: 1000000 });
  validateNumberField(issues, 'modulusGPa', "Young's Modulus", modulusGPa, { min: 0, exclusiveMin: true, max: 2000 });
  validateNumberField(issues, 'yieldMPa', 'Yield Strength', yieldMPa, { min: 0, exclusiveMin: true, max: 5000 });

  if (issues.length > 0) {
    return { valid: false, issues, warnings: [], metrics: [], graphData: null };
  }

  const E_MPa = modulusGPa * 1000;
  const slenderness = (kFactor * lengthMm) / r;
  const transitionCc = Math.sqrt((2 * Math.PI * Math.PI * E_MPa) / yieldMPa);

  const evalEuler = (lam: number) => (Math.PI * Math.PI * E_MPa) / Math.max(1, lam * lam);
  const evalJohnson = (lam: number) =>
    yieldMPa - ((yieldMPa * yieldMPa) / (4 * Math.PI * Math.PI * E_MPa)) * lam * lam;

  const isEuler = slenderness >= transitionCc;
  const regime = isEuler ? 'Euler Elastic' : 'Johnson Inelastic';
  const criticalStressMPa = isEuler ? evalEuler(slenderness) : evalJohnson(slenderness);
  const criticalLoadKN = (criticalStressMPa * areaMm2) / 1000;

  const maxPlotSlenderness = Math.max(220, Math.ceil((Math.max(slenderness, transitionCc) * 1.35) / 20) * 20);
  const steps = 100;
  const curve: BucklingCurvePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const lam = Math.max(2, (maxPlotSlenderness * i) / steps);
    const euler = evalEuler(lam);
    const johnson = evalJohnson(lam);
    const crit = lam >= transitionCc ? euler : johnson;
    curve.push({
      slenderness: lam,
      eulerStressMPa: euler,
      johnsonStressMPa: johnson,
      criticalStressMPa: crit,
    });
  }

  const warnings: string[] = [];
  if (slenderness > 200) {
    warnings.push(`Slenderness ratio KL/r = ${formatEngineeringNumber(slenderness, 1)} exceeds typical AISC 200 compression member limit.`);
  }

  const tone: StatusTone = isEuler ? 'caution' : 'safe';

  return {
    valid: true,
    issues: [],
    warnings,
    verdict: {
      tone,
      label: regime,
      detail: `KL/r = ${formatEngineeringNumber(slenderness, 1)} vs. C_c = ${formatEngineeringNumber(transitionCc, 1)} · P_cr = ${formatEngineeringNumber(criticalLoadKN, 1)} kN`,
    },
    metrics: [
      {
        key: 'criticalLoad',
        label: 'Critical Buckling Load',
        symbol: 'P_cr',
        value: formatEngineeringNumber(criticalLoadKN, 1),
        rawValue: criticalLoadKN,
        unit: 'kN',
        finePrint: {
          summary: 'Theoretical bifurcation load P_cr = σ_cr · A.',
        },
      },
      {
        key: 'criticalStress',
        label: 'Critical Buckling Stress',
        symbol: 'σ_cr',
        value: formatEngineeringNumber(criticalStressMPa, 1),
        rawValue: criticalStressMPa,
        unit: 'MPa',
        finePrint: {
          summary: `Evaluated via ${regime} branch.`,
        },
      },
      {
        key: 'slenderness',
        label: 'Effective Slenderness Ratio',
        symbol: 'KL/r',
        value: formatEngineeringNumber(slenderness, 1),
        rawValue: slenderness,
        unit: '—',
        tone,
        statusLabel: regime,
        finePrint: {
          summary: `Effective length KL = ${formatEngineeringNumber(kFactor * lengthMm, 0)} mm divided by r = ${r} mm.`,
        },
      },
      {
        key: 'transitionCc',
        label: 'Transition Point (Euler/Johnson)',
        symbol: 'C_c',
        value: formatEngineeringNumber(transitionCc, 1),
        rawValue: transitionCc,
        unit: '—',
        finePrint: {
          summary: 'Slenderness threshold where σ_cr = σ_y / 2.',
          formula: 'C_c = √(2π²E / σ_y)',
        },
      },
    ],
    graphData: {
      lengthMm,
      radiusGyrationMm: r,
      areaMm2,
      kFactor,
      modulusGPa,
      yieldMPa,
      slenderness,
      transitionCc,
      regime,
      criticalStressMPa,
      criticalLoadKN,
      curve,
    },
  };
}
