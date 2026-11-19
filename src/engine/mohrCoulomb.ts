import { CalculationResult, ModuleMetadata, StatusTone, ValidationIssue } from './types';
import { asFiniteNumber, formatEngineeringNumber, validateNumberField } from './validation';

export interface MohrCoulombGraphData {
  cohesionKPa: number;
  frictionDeg: number;
  sigma1KPa: number;
  sigma3KPa: number;
  normalStressKPa: number;
  appliedShearKPa: number;
  tauCapacityKPa: number;
  failureAngleDeg: number;
  factorOfSafety: number;
  mobRadiusKPa: number;
  limitRadiusKPa: number;
  sigmaCenterKPa: number;
  tangentNormalKPa: number;
  tangentShearKPa: number;
}

export const MOHR_COULOMB_META: ModuleMetadata = {
  id: 'mohr-coulomb',
  index: '06',
  name: 'Mohr–Coulomb Failure Envelope',
  shortName: 'Mohr–Coulomb',
  category: 'Geotechnical',
  description: 'Soil shear-strength failure envelope τ_f = c + σ tan(φ) overlaid with triaxial principal stress circles and plane stability check.',
  governingStandard: 'ASTM D2850 / D4767 Triaxial & Direct Shear Mohr–Coulomb Failure Criterion',
  equations: [
    {
      title: 'Mohr–Coulomb Failure Criterion',
      expression: 'τ_f = c + σ_n · tan(φ)',
      note: 'Linear shear-strength envelope parameterized by cohesion intercept c and internal friction angle φ.',
    },
    {
      title: 'Failure Plane Orientation',
      expression: 'θ_f = 45° + φ / 2',
      note: 'Critical shear plane angle measured from the minor principal stress plane (σ_3 plane).',
    },
    {
      title: 'Triaxial Principal Limiting State',
      expression: 'σ_1,f = σ_3 · tan²(45° + φ/2) + 2c · tan(45° + φ/2)',
      note: 'Maximum sustainable major principal stress at confining stress σ_3 before shear rupture.',
    },
  ],
  assumptions: [
    'Geotechnical compression-positive sign convention (σ > 0 denotes effective compressive stress).',
    'Effective stress parameters (c′, φ′) apply when pore water pressure is accounted for; total stress parameters apply for undrained short-term checks.',
    'Factor of Safety compares available shear capacity at the critical plane / applied normal stress against mobilized shear stress.',
  ],
  fields: [
    {
      key: 'cohesionKPa',
      label: 'Soil Cohesion',
      symbol: 'c',
      unit: 'kPa',
      kind: 'number',
      min: 0,
      max: 500,
      step: 2,
      finePrint: {
        summary: 'Shear strength intercept at zero normal stress due to clay electrochemical bonding or cementation.',
        validRange: 'c ≥ 0 kPa (0 for clean sands)',
      },
    },
    {
      key: 'frictionDeg',
      label: 'Internal Friction Angle',
      symbol: 'φ',
      unit: 'deg',
      kind: 'number',
      min: 0,
      max: 55,
      step: 1,
      finePrint: {
        summary: 'Slope angle of the Mohr–Coulomb envelope governing normal-stress-dependent frictional resistance.',
        validRange: '0° ≤ φ < 60° (0° for saturated undrained clay)',
      },
    },
    {
      key: 'sigma3KPa',
      label: 'Minor Principal Stress',
      symbol: 'σ_3',
      unit: 'kPa',
      kind: 'number',
      min: 0,
      max: 1500,
      step: 10,
      finePrint: {
        summary: 'Confining / lateral effective compressive stress on the soil element.',
      },
    },
    {
      key: 'sigma1KPa',
      label: 'Major Principal Stress',
      symbol: 'σ_1',
      unit: 'kPa',
      kind: 'number',
      min: 0,
      max: 3000,
      step: 10,
      finePrint: {
        summary: 'Vertical / major effective compressive stress acting on the soil element.',
        validRange: 'σ_1 ≥ σ_3 ≥ 0 kPa',
      },
    },
  ],
  presets: [
    {
      id: 'stiff-clay-safe',
      label: 'Silty Clay (Safe)',
      description: 'Cohesive-frictional soil comfortably below failure envelope.',
      values: { cohesionKPa: 24, frictionDeg: 28, sigma3KPa: 100, sigma1KPa: 260 },
    },
    {
      id: 'sand-critical',
      label: 'Dense Sand (Critical)',
      description: 'Cohesionless sand near incipient shear failure.',
      values: { cohesionKPa: 0, frictionDeg: 34, sigma3KPa: 120, sigma1KPa: 415 },
    },
    {
      id: 'slope-failure',
      label: 'Overstressed Slope',
      description: 'Mobilized stress circle exceeds the Mohr–Coulomb envelope.',
      values: { cohesionKPa: 12, frictionDeg: 24, sigma3KPa: 80, sigma1KPa: 310 },
    },
  ],
  defaultValues: {
    cohesionKPa: 24,
    frictionDeg: 28,
    sigma3KPa: 100,
    sigma1KPa: 260,
  },
};

export function calculateMohrCoulomb(
  raw: Record<string, number | string | boolean>,
): CalculationResult<MohrCoulombGraphData> {
  const c = asFiniteNumber(raw.cohesionKPa);
  const phiDeg = asFiniteNumber(raw.frictionDeg);
  const sigma3 = asFiniteNumber(raw.sigma3KPa);
  const sigma1 = asFiniteNumber(raw.sigma1KPa);

  const issues: ValidationIssue[] = [];
  validateNumberField(issues, 'cohesionKPa', 'Soil Cohesion', c, { min: 0, max: 2000 });
  validateNumberField(issues, 'frictionDeg', 'Internal Friction Angle', phiDeg, { min: 0, max: 65 });
  validateNumberField(issues, 'sigma3KPa', 'Minor Principal Stress', sigma3, { min: 0, max: 5000 });
  validateNumberField(issues, 'sigma1KPa', 'Major Principal Stress', sigma1, { min: 0, max: 10000 });

  if (issues.length === 0 && sigma1 < sigma3) {
    issues.push({
      field: 'sigma1KPa',
      message: `Major Principal Stress σ_1 (${sigma1} kPa) must be ≥ Minor Principal Stress σ_3 (${sigma3} kPa).`,
    });
  }

  if (issues.length > 0) {
    return { valid: false, issues, warnings: [], metrics: [], graphData: null };
  }

  const phiRad = (phiDeg * Math.PI) / 180;
  const tanPhi = Math.tan(phiRad);
  const sinPhi = Math.sin(phiRad);
  const cosPhi = Math.cos(phiRad);
  const failureAngleDeg = 45 + phiDeg / 2;

  const sigmaCenter = (sigma1 + sigma3) / 2;
  const mobRadius = (sigma1 - sigma3) / 2;

  // Critical plane normal stress and shear stress on the 45 + phi/2 plane
  const criticalNormal = sigmaCenter - mobRadius * sinPhi;
  const criticalShear = mobRadius * cosPhi;
  const tauCapacityAtCritical = c + criticalNormal * tanPhi;

  // Limit radius tangent to envelope at same center sigmaCenter: R_limit = c*cos(phi) + sigmaCenter*sin(phi)
  const limitRadius = c * cosPhi + sigmaCenter * sinPhi;
  const factorOfSafety = mobRadius > 1e-6 ? limitRadius / mobRadius : Infinity;

  const tangentNormal = sigmaCenter - limitRadius * sinPhi;
  const tangentShear = limitRadius * cosPhi;

  let tone: StatusTone = 'safe';
  let statusLabel = 'Stable Envelope';
  if (factorOfSafety < 1.0) {
    tone = 'danger';
    statusLabel = 'Shear Failure (FS < 1.0)';
  } else if (factorOfSafety < 1.5) {
    tone = 'caution';
    statusLabel = 'Marginal Stability (1.0 ≤ FS < 1.5)';
  }

  const warnings: string[] = [];
  if (factorOfSafety < 1.0) {
    warnings.push('Mohr circle intersects and crosses the Mohr–Coulomb envelope: shear failure along θ_f plane is predicted.');
  }
  if (c === 0 && sigma3 === 0) {
    warnings.push('Zero cohesion and zero confining pressure provide zero shear resistance.');
  }

  return {
    valid: true,
    issues: [],
    warnings,
    verdict: {
      tone,
      label: statusLabel,
      detail: `Factor of Safety FS = ${Number.isFinite(factorOfSafety) ? formatEngineeringNumber(factorOfSafety, 2) : '∞'} · Failure Plane θ_f = ${formatEngineeringNumber(failureAngleDeg, 1)}°`,
    },
    metrics: [
      {
        key: 'tauCapacity',
        label: 'Shear Strength Capacity',
        symbol: 'τ_f',
        value: formatEngineeringNumber(tauCapacityAtCritical, 1),
        rawValue: tauCapacityAtCritical,
        unit: 'kPa',
        finePrint: {
          summary: `Available shear resistance at critical normal stress σ_n = ${formatEngineeringNumber(criticalNormal, 1)} kPa.`,
          formula: 'τ_f = c + σ_n · tan(φ)',
        },
      },
      {
        key: 'factorOfSafety',
        label: 'Factor of Safety',
        symbol: 'FS',
        value: Number.isFinite(factorOfSafety) ? formatEngineeringNumber(factorOfSafety, 2) : '∞',
        rawValue: factorOfSafety,
        unit: '—',
        tone,
        statusLabel,
        finePrint: {
          summary: 'Ratio of limiting failure radius to mobilized Mohr circle radius (R_limit / R_mob).',
        },
      },
      {
        key: 'failureAngle',
        label: 'Failure Plane Angle',
        symbol: 'θ_f',
        value: formatEngineeringNumber(failureAngleDeg, 1),
        rawValue: failureAngleDeg,
        unit: 'deg',
        finePrint: {
          summary: 'Orientation of the potential slip surface relative to the major principal plane.',
          formula: 'θ_f = 45° + φ / 2',
        },
      },
      {
        key: 'mobilizedShear',
        label: 'Mobilized Critical Shear',
        symbol: 'τ_mob',
        value: formatEngineeringNumber(criticalShear, 1),
        rawValue: criticalShear,
        unit: 'kPa',
        finePrint: {
          summary: 'Shear stress acting directly on the θ_f plane under (σ_1, σ_3).',
        },
      },
    ],
    graphData: {
      cohesionKPa: c,
      frictionDeg: phiDeg,
      sigma1KPa: sigma1,
      sigma3KPa: sigma3,
      normalStressKPa: criticalNormal,
      appliedShearKPa: criticalShear,
      tauCapacityKPa: tauCapacityAtCritical,
      failureAngleDeg,
      factorOfSafety,
      mobRadiusKPa: mobRadius,
      limitRadiusKPa: limitRadius,
      sigmaCenterKPa: sigmaCenter,
      tangentNormalKPa: tangentNormal,
      tangentShearKPa: tangentShear,
    },
  };
}
