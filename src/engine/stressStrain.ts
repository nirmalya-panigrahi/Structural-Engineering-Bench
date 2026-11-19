import { CalculationResult, ModuleMetadata, StatusTone, ValidationIssue } from './types';
import { asFiniteNumber, formatEngineeringNumber, validateNumberField } from './validation';

export interface MaterialSpec {
  id: string;
  label: string;
  modulusGPa: number;
  yieldMPa: number;
  utsMPa: number;
  fractureStrainPct: number;
  brittle: boolean;
}

export const STRUCTURAL_MATERIALS: Record<string, MaterialSpec> = {
  a36_steel: {
    id: 'a36_steel',
    label: 'ASTM A36 Structural Steel',
    modulusGPa: 200,
    yieldMPa: 250,
    utsMPa: 400,
    fractureStrainPct: 20,
    brittle: false,
  },
  al_6061_t6: {
    id: 'al_6061_t6',
    label: '6061-T6 Aluminum Alloy',
    modulusGPa: 68.9,
    yieldMPa: 276,
    utsMPa: 310,
    fractureStrainPct: 12,
    brittle: false,
  },
  ti_6al_4v: {
    id: 'ti_6al_4v',
    label: 'Ti-6Al-4V (Grade 5 Titanium)',
    modulusGPa: 113.8,
    yieldMPa: 880,
    utsMPa: 950,
    fractureStrainPct: 14,
    brittle: false,
  },
  rebar_grade60: {
    id: 'rebar_grade60',
    label: 'ASTM A615 Grade 60 Rebar',
    modulusGPa: 200,
    yieldMPa: 420,
    utsMPa: 620,
    fractureStrainPct: 11,
    brittle: false,
  },
  gray_cast_iron: {
    id: 'gray_cast_iron',
    label: 'ASTM A48 Class 30 Cast Iron (Brittle)',
    modulusGPa: 100,
    yieldMPa: 210,
    utsMPa: 215,
    fractureStrainPct: 0.6,
    brittle: true,
  },
};

export interface StressStrainPoint {
  strainPct: number;
  stressMPa: number;
}

export interface StressStrainGraphData {
  material: MaterialSpec;
  curve: StressStrainPoint[];
  offsetLine: StressStrainPoint[];
  appliedStressMPa: number;
  appliedStrainPct: number;
  yieldStrainPct: number;
  utsStrainPct: number;
  modulusGPa: number;
  yieldMPa: number;
  utsMPa: number;
  fractureStrainPct: number;
  toughnessMJm3: number;
}

export const STRESS_STRAIN_META: ModuleMetadata = {
  id: 'stress-strain',
  index: '02',
  name: 'Stress–Strain Curve',
  shortName: 'Stress–Strain',
  category: 'Solid Mechanics',
  description: 'Engineering uniaxial tensile curve plotting elastic modulus, 0.2% offset yield, UTS, fracture strain, and toughness.',
  governingStandard: 'ASTM E8 / E8M Uniaxial Tension Testing · Engineering Stress & Strain',
  equations: [
    {
      title: 'Engineering Stress & Strain',
      expression: 'σ = F / A₀,   ε = ΔL / L₀ = σ / E (linear elastic)',
      note: 'Referenced to initial cross-sectional area A₀ and gauge length L₀.',
    },
    {
      title: '0.2% Offset Yield Criterion',
      expression: 'σ = E · (ε − 0.002)',
      note: 'Standard engineering yield definition for metals lacking a sharp yield plateau.',
    },
    {
      title: 'Modulus of Toughness',
      expression: 'U_T = ∫₀^{ε_f} σ(ε) dε',
      note: 'Total strain energy per unit volume absorbed prior to fracture (MJ/m³).',
    },
  ],
  assumptions: [
    'Engineering (nominal) stress-strain is plotted rather than true stress-strain; necking appears as a post-UTS softening branch.',
    'Applied load is assumed strictly uniaxial and quasi-static at ambient temperature (23 °C).',
    'When σ > σ_y, plastic strain is approximated along the Ramberg–Osgood / parabolic strain-hardening curve.',
  ],
  fields: [
    {
      key: 'materialId',
      label: 'Material Grade',
      kind: 'select',
      options: Object.values(STRUCTURAL_MATERIALS).map((m) => ({ value: m.id, label: m.label })),
      finePrint: {
        summary: 'Selects nominal handbook mechanical properties (E, σ_y, σ_ut, ε_f).',
        standard: 'ASM / ASTM E8 reference medians',
      },
    },
    {
      key: 'loadKN',
      label: 'Applied Axial Load',
      symbol: 'F',
      unit: 'kN',
      kind: 'number',
      min: 0,
      max: 2000,
      step: 2,
      finePrint: {
        summary: 'Uniaxial tensile force applied along the specimen gauge axis.',
        validRange: 'F ≥ 0 kN',
      },
    },
    {
      key: 'areaMm2',
      label: 'Cross-Sectional Area',
      symbol: 'A₀',
      unit: 'mm²',
      kind: 'number',
      min: 1,
      max: 10000,
      step: 5,
      finePrint: {
        summary: 'Original specimen cross-sectional area before loading.',
        validRange: 'A₀ > 0 mm² (standard 12.5 mm round bar ≈ 126.7 mm²)',
      },
    },
    {
      key: 'gaugeMm',
      label: 'Gauge Length',
      symbol: 'L₀',
      unit: 'mm',
      kind: 'number',
      min: 10,
      max: 1000,
      step: 5,
      finePrint: {
        summary: 'Initial extensometer gauge length used to compute elongation ΔL.',
        standard: 'ASTM E8 standard gauge length: 50 mm or 200 mm',
      },
    },
  ],
  presets: [
    {
      id: 'a36-elastic',
      label: 'A36 Elastic Service',
      description: 'Standard 12.5 mm ASTM round bar inside linear elastic range.',
      values: { materialId: 'a36_steel', loadKN: 22, areaMm2: 126.7, gaugeMm: 50 },
    },
    {
      id: 'al-yielding',
      label: '6061-T6 Near Yield',
      description: 'Aerospace aluminum bar approaching 0.2% offset yield.',
      values: { materialId: 'al_6061_t6', loadKN: 34, areaMm2: 126.7, gaugeMm: 50 },
    },
    {
      id: 'ti-high-load',
      label: 'Ti-6Al-4V High Load',
      description: 'High-strength titanium alloy tension member.',
      values: { materialId: 'ti_6al_4v', loadKN: 95, areaMm2: 126.7, gaugeMm: 50 },
    },
  ],
  defaultValues: {
    materialId: 'a36_steel',
    loadKN: 22,
    areaMm2: 126.7,
    gaugeMm: 50,
  },
};

function generateCurve(mat: MaterialSpec): {
  curve: StressStrainPoint[];
  utsStrainPct: number;
  yieldStrainPct: number;
  toughnessMJm3: number;
} {
  const E_MPa = mat.modulusGPa * 1000;
  const epsY = mat.yieldMPa / E_MPa;
  const yieldStrainPct = epsY * 100 + (mat.brittle ? 0 : 0.2);
  const epsF = mat.fractureStrainPct / 100;
  const epsUts = mat.brittle ? epsF * 0.92 : Math.max(epsY + 0.005, epsF * 0.62);

  const curve: StressStrainPoint[] = [];
  const elasticSteps = 15;
  for (let i = 0; i <= elasticSteps; i++) {
    const eps = (epsY * i) / elasticSteps;
    curve.push({ strainPct: eps * 100, stressMPa: E_MPa * eps });
  }

  if (mat.brittle) {
    const steps = 15;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const eps = epsY + (epsF - epsY) * t;
      const stress = mat.yieldMPa + (mat.utsMPa - mat.yieldMPa) * Math.sin((t * Math.PI) / 2);
      curve.push({ strainPct: eps * 100, stressMPa: stress });
    }
  } else {
    const hardSteps = 28;
    for (let i = 1; i <= hardSteps; i++) {
      const t = i / hardSteps;
      const eps = epsY + (epsUts - epsY) * t;
      const stress = mat.yieldMPa + (mat.utsMPa - mat.yieldMPa) * Math.pow(t, 0.42);
      curve.push({ strainPct: eps * 100, stressMPa: stress });
    }

    const neckSteps = 18;
    const fractureStress = mat.utsMPa * 0.78;
    for (let i = 1; i <= neckSteps; i++) {
      const t = i / neckSteps;
      const eps = epsUts + (epsF - epsUts) * t;
      const stress = mat.utsMPa - (mat.utsMPa - fractureStress) * Math.pow(t, 1.5);
      curve.push({ strainPct: eps * 100, stressMPa: stress });
    }
  }

  let toughness = 0;
  for (let i = 1; i < curve.length; i++) {
    const de = (curve[i].strainPct - curve[i - 1].strainPct) / 100;
    const avgS = (curve[i].stressMPa + curve[i - 1].stressMPa) / 2;
    toughness += avgS * de;
  }

  return {
    curve,
    utsStrainPct: epsUts * 100,
    yieldStrainPct,
    toughnessMJm3: toughness,
  };
}

function interpolateStrainFromStress(
  curve: StressStrainPoint[],
  targetStress: number,
  utsMPa: number,
): number {
  if (targetStress <= 0) return 0;
  if (targetStress > utsMPa) {
    return curve[curve.length - 1].strainPct;
  }
  for (let i = 1; i < curve.length; i++) {
    const prev = curve[i - 1];
    const curr = curve[i];
    if (curr.stressMPa >= prev.stressMPa && targetStress >= prev.stressMPa && targetStress <= curr.stressMPa) {
      const span = curr.stressMPa - prev.stressMPa;
      const frac = span > 1e-9 ? (targetStress - prev.stressMPa) / span : 0;
      return prev.strainPct + frac * (curr.strainPct - prev.strainPct);
    }
  }
  return curve[curve.length - 1].strainPct;
}

export function calculateStressStrain(
  raw: Record<string, number | string | boolean>,
): CalculationResult<StressStrainGraphData> {
  const materialId = typeof raw.materialId === 'string' ? raw.materialId : 'a36_steel';
  const mat = STRUCTURAL_MATERIALS[materialId] ?? STRUCTURAL_MATERIALS.a36_steel;

  const loadKN = asFiniteNumber(raw.loadKN);
  const areaMm2 = asFiniteNumber(raw.areaMm2);
  const gaugeMm = asFiniteNumber(raw.gaugeMm);

  const issues: ValidationIssue[] = [];
  validateNumberField(issues, 'loadKN', 'Applied Axial Load', loadKN, { min: 0, max: 50000 });
  validateNumberField(issues, 'areaMm2', 'Cross-Sectional Area', areaMm2, { min: 0, exclusiveMin: true, max: 100000 });
  validateNumberField(issues, 'gaugeMm', 'Gauge Length', gaugeMm, { min: 0, exclusiveMin: true, max: 10000 });

  if (issues.length > 0) {
    return { valid: false, issues, warnings: [], metrics: [], graphData: null };
  }

  const appliedStressMPa = (loadKN * 1000) / areaMm2;
  const { curve, utsStrainPct, yieldStrainPct, toughnessMJm3 } = generateCurve(mat);
  const appliedStrainPct = interpolateStrainFromStress(curve, appliedStressMPa, mat.utsMPa);
  const elongationMm = (appliedStrainPct / 100) * gaugeMm;

  const sfYield = appliedStressMPa > 0 ? mat.yieldMPa / appliedStressMPa : Infinity;
  let tone: StatusTone = 'safe';
  let statusLabel = 'Linear Elastic';
  if (appliedStressMPa > mat.utsMPa) {
    tone = 'danger';
    statusLabel = 'Rupture / Exceeds UTS';
  } else if (appliedStressMPa >= mat.yieldMPa) {
    tone = 'caution';
    statusLabel = 'Plastic Yielding';
  }

  const offsetEndStress = Math.min(mat.utsMPa * 1.05, mat.yieldMPa * 1.15);
  const offsetEndStrainPct = 0.2 + (offsetEndStress / (mat.modulusGPa * 1000)) * 100;
  const offsetLine: StressStrainPoint[] = [
    { strainPct: 0.2, stressMPa: 0 },
    { strainPct: offsetEndStrainPct, stressMPa: offsetEndStress },
  ];

  const warnings: string[] = [];
  if (appliedStressMPa > mat.utsMPa) {
    warnings.push(
      `Applied engineering stress (${formatEngineeringNumber(appliedStressMPa)} MPa) exceeds Ultimate Tensile Strength (${mat.utsMPa} MPa). Specimen fracture is predicted.`,
    );
  } else if (appliedStressMPa >= mat.yieldMPa) {
    warnings.push('Specimen has entered permanent plastic deformation beyond yield strength.');
  }

  return {
    valid: true,
    issues: [],
    warnings,
    verdict: {
      tone,
      label: statusLabel,
      detail: `σ = ${formatEngineeringNumber(appliedStressMPa)} MPa · ΔL = ${formatEngineeringNumber(elongationMm, 3)} mm · Yield SF = ${Number.isFinite(sfYield) ? formatEngineeringNumber(sfYield, 2) : '∞'}`,
    },
    metrics: [
      {
        key: 'appliedStress',
        label: 'Applied Stress',
        symbol: 'σ',
        value: formatEngineeringNumber(appliedStressMPa),
        rawValue: appliedStressMPa,
        unit: 'MPa',
        tone,
        statusLabel,
        finePrint: {
          summary: 'Nominal engineering stress computed from applied force and initial area.',
          formula: 'σ = (F × 1000) / A₀',
        },
      },
      {
        key: 'modulus',
        label: "Young's Modulus",
        symbol: 'E',
        value: formatEngineeringNumber(mat.modulusGPa, 1),
        rawValue: mat.modulusGPa,
        unit: 'GPa',
        finePrint: {
          summary: 'Slope of the linear elastic region governing axial stiffness.',
          formula: 'E = σ / ε (for σ ≤ σ_y)',
        },
      },
      {
        key: 'yield',
        label: 'Yield Strength (0.2%)',
        symbol: 'σ_y',
        value: formatEngineeringNumber(mat.yieldMPa, 0),
        rawValue: mat.yieldMPa,
        unit: 'MPa',
        finePrint: {
          summary: 'Stress threshold marking onset of 0.2% permanent plastic strain.',
        },
      },
      {
        key: 'uts',
        label: 'Ultimate Tensile Strength',
        symbol: 'σ_ut',
        value: formatEngineeringNumber(mat.utsMPa, 0),
        rawValue: mat.utsMPa,
        unit: 'MPa',
        finePrint: {
          summary: 'Peak engineering stress sustained prior to localized necking.',
        },
      },
      {
        key: 'elongation',
        label: 'Elongation / Fracture Strain',
        symbol: 'ΔL / ε_f',
        value: `${formatEngineeringNumber(elongationMm, 3)} mm / ${formatEngineeringNumber(mat.fractureStrainPct, 1)}%`,
        unit: '',
        finePrint: {
          summary: 'Current axial extension ΔL alongside material ductility limit ε_f.',
          formula: 'ΔL = ε · L₀',
        },
      },
      {
        key: 'toughness',
        label: 'Modulus of Toughness',
        symbol: 'U_T',
        value: formatEngineeringNumber(toughnessMJm3, 1),
        rawValue: toughnessMJm3,
        unit: 'MJ/m³',
        finePrint: {
          summary: 'Area under the engineering stress–strain curve up to fracture.',
          formula: 'U_T = ∫ σ dε',
        },
      },
    ],
    graphData: {
      material: mat,
      curve,
      offsetLine,
      appliedStressMPa,
      appliedStrainPct,
      yieldStrainPct,
      utsStrainPct,
      modulusGPa: mat.modulusGPa,
      yieldMPa: mat.yieldMPa,
      utsMPa: mat.utsMPa,
      fractureStrainPct: mat.fractureStrainPct,
      toughnessMJm3,
    },
  };
}
