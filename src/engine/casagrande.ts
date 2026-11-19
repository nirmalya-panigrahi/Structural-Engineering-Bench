import { CalculationResult, ModuleMetadata, StatusTone, ValidationIssue } from './types';
import { asFiniteNumber, formatEngineeringNumber, validateNumberField } from './validation';

export interface CasagrandeGraphData {
  liquidLimit: number;
  plasticLimit: number;
  plasticityIndex: number;
  aLinePI: number;
  uLinePI: number;
  uscsSymbol: string;
  uscsDescription: string;
  isOrganic: boolean;
  aboveULine: boolean;
}

export const CASAGRANDE_META: ModuleMetadata = {
  id: 'casagrande',
  index: '10',
  name: 'Casagrande Plasticity Chart',
  shortName: 'Casagrande USCS',
  category: 'Geotechnical',
  description: 'Classifies fine-grained soils via Atterberg limits (LL, PL, PI) against the Casagrande A-line and U-line.',
  governingStandard: 'ASTM D2487 / ASTM D4318 Unified Soil Classification System (USCS)',
  equations: [
    {
      title: 'Plasticity Index',
      expression: 'PI = LL − PL',
      note: 'Moisture content range over which the soil exhibits plastic, moldable behavior.',
    },
    {
      title: 'Casagrande A-Line & U-Line',
      expression: 'PI_A = 0.73 · (LL − 20),   PI_U = 0.90 · (LL − 8)',
      note: 'A-line separates inorganic clays (above) from silts (below); U-line marks the upper empirical boundary for natural soils.',
    },
  ],
  assumptions: [
    'Applies to fine-grained soil fractions passing the No. 40 (425 μm) sieve.',
    'Dual symbol CL-ML applies when soil plots above the A-line with 4 ≤ PI ≤ 7.',
    'Liquid Limit LL = 50% separates low plasticity (L) from high plasticity (H) soils.',
  ],
  fields: [
    {
      key: 'liquidLimit',
      label: 'Liquid Limit',
      symbol: 'LL',
      unit: '%',
      kind: 'number',
      min: 0,
      max: 120,
      step: 1,
      finePrint: {
        summary: 'Moisture content at which soil transitions from plastic to liquid behavior (Casagrande cup 25 blows).',
        validRange: 'LL ≥ PL ≥ 0%',
      },
    },
    {
      key: 'plasticLimit',
      label: 'Plastic Limit',
      symbol: 'PL',
      unit: '%',
      kind: 'number',
      min: 0,
      max: 100,
      step: 1,
      finePrint: {
        summary: 'Moisture content below which soil crumbles when rolled into a 3.2 mm thread.',
        validRange: '0% ≤ PL ≤ LL',
      },
    },
    {
      key: 'isOrganic',
      label: 'Organic Soil Behavior',
      kind: 'toggle',
      finePrint: {
        summary: 'Indicates dark color/organic odor or >25% drop in LL after oven drying (classifies as OL or OH below A-line).',
      },
    },
  ],
  presets: [
    {
      id: 'lean-clay',
      label: 'Lean Clay (CL)',
      description: 'Medium plasticity inorganic clay (LL=42%, PL=18%).',
      values: { liquidLimit: 42, plasticLimit: 18, isOrganic: false },
    },
    {
      id: 'fat-clay',
      label: 'Fat Clay (CH)',
      description: 'High-plasticity expansive clay (LL=68%, PL=24%).',
      values: { liquidLimit: 68, plasticLimit: 24, isOrganic: false },
    },
    {
      id: 'elastic-silt',
      label: 'Elastic Silt (MH)',
      description: 'High-LL silt plotting below the A-line (LL=64%, PL=40%).',
      values: { liquidLimit: 64, plasticLimit: 40, isOrganic: false },
    },
    {
      id: 'silty-clay',
      label: 'Silty Clay (CL-ML)',
      description: 'Transitional hatched zone (LL=25%, PL=19%, PI=6%).',
      values: { liquidLimit: 25, plasticLimit: 19, isOrganic: false },
    },
  ],
  defaultValues: {
    liquidLimit: 42,
    plasticLimit: 18,
    isOrganic: false,
  },
};

export function calculateCasagrande(
  raw: Record<string, number | string | boolean>,
): CalculationResult<CasagrandeGraphData> {
  const ll = asFiniteNumber(raw.liquidLimit);
  const pl = asFiniteNumber(raw.plasticLimit);
  const isOrganic = Boolean(raw.isOrganic);

  const issues: ValidationIssue[] = [];
  validateNumberField(issues, 'liquidLimit', 'Liquid Limit (LL)', ll, { min: 0, max: 150 });
  validateNumberField(issues, 'plasticLimit', 'Plastic Limit (PL)', pl, { min: 0, max: 150 });

  if (issues.length === 0 && ll < pl) {
    issues.push({
      field: 'plasticLimit',
      message: `Plastic Limit (${pl}%) cannot exceed Liquid Limit (${ll}%) — PI = LL − PL would be negative.`,
    });
  }

  if (issues.length > 0) {
    return { valid: false, issues, warnings: [], metrics: [], graphData: null };
  }

  const pi = ll - pl;
  const aLinePI = Math.max(0, 0.73 * (ll - 20));
  const uLinePI = Math.max(0, 0.9 * (ll - 8));
  const aboveULine = ll > 8 && pi > uLinePI + 0.05;

  let uscsSymbol = 'ML';
  let uscsDescription = 'Inorganic Silt of Low Plasticity';

  if (pi === 0) {
    uscsSymbol = 'ML (NP)';
    uscsDescription = 'Non-Plastic Silt';
  } else if (ll < 50) {
    if (isOrganic) {
      uscsSymbol = 'OL';
      uscsDescription = 'Organic Silt / Organic Clay (Low Plasticity)';
    } else if (pi >= 4 && pi <= 7 && pi >= aLinePI) {
      uscsSymbol = 'CL-ML';
      uscsDescription = 'Silty Clay (Dual Symbol Zone)';
    } else if (pi > aLinePI && pi > 7) {
      uscsSymbol = 'CL';
      uscsDescription = 'Lean Clay (Low-to-Medium Plasticity)';
    } else if (ll < 25.5 && pi >= aLinePI && pi < 4) {
      uscsSymbol = 'ML';
      uscsDescription = 'Inorganic Silt (Low Plasticity)';
    } else {
      uscsSymbol = 'ML';
      uscsDescription = 'Inorganic Silt / Very Fine Sand';
    }
  } else {
    if (isOrganic) {
      uscsSymbol = 'OH';
      uscsDescription = 'Organic Clay / Silt (High Plasticity)';
    } else if (pi >= aLinePI) {
      uscsSymbol = 'CH';
      uscsDescription = 'Fat Clay (High Plasticity)';
    } else {
      uscsSymbol = 'MH';
      uscsDescription = 'Elastic Silt (High Plasticity)';
    }
  }

  const warnings: string[] = [];
  if (aboveULine) {
    warnings.push(
      `Sample plots above the Casagrande U-line (PI = ${formatEngineeringNumber(pi, 1)}% > U-line ${formatEngineeringNumber(uLinePI, 1)}%). Verify laboratory Atterberg test data for measurement error.`,
    );
  }

  const tone: StatusTone = aboveULine ? 'caution' : 'safe';

  return {
    valid: true,
    issues: [],
    warnings,
    verdict: {
      tone,
      label: `USCS Class: ${uscsSymbol}`,
      detail: `${uscsDescription} · PI = ${formatEngineeringNumber(pi, 1)}%`,
    },
    metrics: [
      {
        key: 'uscs',
        label: 'USCS Group Symbol',
        symbol: 'USCS',
        value: uscsSymbol,
        unit: '',
        tone,
        statusLabel: aboveULine ? 'Verify Lab Data' : 'Valid Region',
        finePrint: {
          summary: uscsDescription,
          standard: 'ASTM D2487 Plasticity Chart',
        },
      },
      {
        key: 'pi',
        label: 'Plasticity Index',
        symbol: 'PI',
        value: formatEngineeringNumber(pi, 1),
        rawValue: pi,
        unit: '%',
        finePrint: {
          summary: 'Difference between Liquid Limit and Plastic Limit.',
          formula: 'PI = LL − PL',
        },
      },
      {
        key: 'aLine',
        label: 'A-Line Threshold at LL',
        symbol: 'PI_A',
        value: formatEngineeringNumber(aLinePI, 1),
        rawValue: aLinePI,
        unit: '%',
        finePrint: {
          summary: pi >= aLinePI ? 'Sample plots on/above A-line (clayey behavior).' : 'Sample plots below A-line (silty/organic behavior).',
          formula: 'PI_A = 0.73(LL − 20)',
        },
      },
      {
        key: 'compressibility',
        label: 'Plasticity / Compressibility',
        symbol: 'Grade',
        value: ll < 30 ? 'Low' : ll < 50 ? 'Medium' : 'High',
        unit: '',
        finePrint: {
          summary: 'Qualitative compressibility level based on Liquid Limit (LL < 50 vs. LL ≥ 50).',
        },
      },
    ],
    graphData: {
      liquidLimit: ll,
      plasticLimit: pl,
      plasticityIndex: pi,
      aLinePI,
      uLinePI,
      uscsSymbol,
      uscsDescription,
      isOrganic,
      aboveULine,
    },
  };
}
