import { CalculationResult, ModuleMetadata, ValidationIssue } from './types';
import { asFiniteNumber, formatEngineeringNumber, validateNumberField } from './validation';

export type AshbyAxisPair = 'E_rho' | 'sigma_rho';

export interface AshbyMaterialFamily {
  id: string;
  name: string;
  family: string;
  color: string;
  rhoMin: number;
  rhoMax: number;
  eMin: number;
  eMax: number;
  sigmaMin: number;
  sigmaMax: number;
}

export const ASHBY_FAMILIES: AshbyMaterialFamily[] = [
  {
    id: 'steels',
    name: 'Carbon & Alloy Steels',
    family: 'Metals',
    color: '#2563EB',
    rhoMin: 7700,
    rhoMax: 8000,
    eMin: 195,
    eMax: 215,
    sigmaMin: 250,
    sigmaMax: 1400,
  },
  {
    id: 'al_alloys',
    name: 'Aluminum Alloys',
    family: 'Metals',
    color: '#0284C7',
    rhoMin: 2650,
    rhoMax: 2850,
    eMin: 68,
    eMax: 74,
    sigmaMin: 100,
    sigmaMax: 520,
  },
  {
    id: 'ti_alloys',
    name: 'Titanium Alloys',
    family: 'Metals',
    color: '#0D9488',
    rhoMin: 4400,
    rhoMax: 4600,
    eMin: 105,
    eMax: 120,
    sigmaMin: 450,
    sigmaMax: 1100,
  },
  {
    id: 'cfrp',
    name: 'CFRP Composites',
    family: 'Composites',
    color: '#7C3AED',
    rhoMin: 1500,
    rhoMax: 1650,
    eMin: 70,
    eMax: 180,
    sigmaMin: 550,
    sigmaMax: 1500,
  },
  {
    id: 'ceramics',
    name: 'Technical Ceramics (Al₂O₃ / SiC)',
    family: 'Ceramics',
    color: '#D97706',
    rhoMin: 3100,
    rhoMax: 3950,
    eMin: 300,
    eMax: 440,
    sigmaMin: 250,
    sigmaMax: 600,
  },
  {
    id: 'polymers',
    name: 'Engineering Polymers (PEEK / Nylon)',
    family: 'Polymers',
    color: '#DB2777',
    rhoMin: 1100,
    rhoMax: 1450,
    eMin: 1.8,
    eMax: 4.5,
    sigmaMin: 40,
    sigmaMax: 110,
  },
  {
    id: 'timber',
    name: 'Structural Timber (∥ Grain)',
    family: 'Natural',
    color: '#16A34A',
    rhoMin: 450,
    rhoMax: 750,
    eMin: 9,
    eMax: 16,
    sigmaMin: 30,
    sigmaMax: 75,
  },
  {
    id: 'foams',
    name: 'Structural Polymer Foams',
    family: 'Foams',
    color: '#64748B',
    rhoMin: 60,
    rhoMax: 300,
    eMin: 0.03,
    eMax: 0.35,
    sigmaMin: 0.5,
    sigmaMax: 5,
  },
];

export interface RankedAshbyCandidate {
  id: string;
  name: string;
  family: string;
  color: string;
  xGeoMean: number;
  yGeoMean: number;
  indexValue: number;
  meetsThreshold: boolean;
}

export interface AshbyGraphData {
  axisPair: AshbyAxisPair;
  slopeM: number;
  targetIndex: number;
  yLabel: string;
  yUnit: string;
  candidates: RankedAshbyCandidate[];
}

export const ASHBY_CHART_META: ModuleMetadata = {
  id: 'ashby-chart',
  index: '07',
  name: 'Ashby Material Selection Chart',
  shortName: 'Ashby Selection',
  category: 'Materials',
  description: 'Log–log material property map overlaying performance index guidelines M = Y^(1/m) / ρ to rank structural candidates.',
  governingStandard: 'Ashby Material Selection Methodology · Log–Log Performance Index Guidelines',
  equations: [
    {
      title: 'Performance Index Guideline',
      expression: 'M = Y^(1 / m) / ρ   ⟺   log(Y) = m · log(ρ) + m · log(M)',
      note: 'In log–log space, iso-performance lines appear as straight lines of slope m.',
    },
    {
      title: 'Common Structural Slopes (Stiffness–Density)',
      expression: 'm = 1: Tie (E/ρ) · m = 2: Beam (E¹/²/ρ) · m = 3: Plate (E¹/³/ρ)',
      note: 'Higher slope m rewards lightweight lower-density materials like CFRP, timber, and aluminum.',
    },
  ],
  assumptions: [
    'Material bubbles span typical commercial engineering bounds (min–max range) plotted with geometric centroids.',
    'Property units: Density ρ in kg/m³, Young’s Modulus E in GPa, Yield Strength σ_y in MPa.',
    'Target index M is evaluated using Y^(1/m) / (ρ / 1000) (using Mg/m³ or g/cm³ scaling for readable magnitudes).',
  ],
  fields: [
    {
      key: 'axisPair',
      label: 'Property Map Axes',
      kind: 'select',
      options: [
        { value: 'E_rho', label: 'Modulus (E) vs. Density (ρ)' },
        { value: 'sigma_rho', label: 'Strength (σ_y) vs. Density (ρ)' },
      ],
      finePrint: {
        summary: 'Selects stiffness-limited (E–ρ) or strength-limited (σ_y–ρ) design map.',
      },
    },
    {
      key: 'slopeM',
      label: 'Performance Index Slope',
      symbol: 'm',
      kind: 'number',
      min: 0.5,
      max: 4,
      step: 0.5,
      finePrint: {
        summary: 'Log–log guideline slope m in M = Y^(1/m)/ρ. Use 1 (tie), 2 (stiffness beam), 1.5 (strength beam), or 3 (plate).',
        validRange: '0.5 to 4.0',
      },
    },
    {
      key: 'targetIndex',
      label: 'Target Index Threshold',
      symbol: 'M_min',
      kind: 'number',
      min: 0.1,
      max: 500,
      step: 0.5,
      finePrint: {
        summary: 'Minimum required performance index M (using ρ in g/cm³ so values lie in a clean 1–50 range).',
      },
    },
  ],
  presets: [
    {
      id: 'light-beam',
      label: 'Lightweight Stiff Beam (m=2)',
      description: 'Maximizes E¹/² / ρ for minimum-mass bending deflection.',
      values: { axisPair: 'E_rho', slopeM: 2, targetIndex: 5.5 },
    },
    {
      id: 'axial-tie',
      label: 'Specific Stiffness Tie (m=1)',
      description: 'Maximizes E / ρ for tension members and aerospace struts.',
      values: { axisPair: 'E_rho', slopeM: 1, targetIndex: 25 },
    },
    {
      id: 'strong-plate',
      label: 'Strong Light Panel (m=2)',
      description: 'Strength-to-density trade-off maximizing σ_y¹/² / ρ.',
      values: { axisPair: 'sigma_rho', slopeM: 2, targetIndex: 10 },
    },
  ],
  defaultValues: {
    axisPair: 'E_rho',
    slopeM: 2,
    targetIndex: 5.5,
  },
};

export function calculateAshbyChart(
  raw: Record<string, number | string | boolean>,
): CalculationResult<AshbyGraphData> {
  const axisPair: AshbyAxisPair = raw.axisPair === 'sigma_rho' ? 'sigma_rho' : 'E_rho';
  const slopeM = asFiniteNumber(raw.slopeM);
  const targetIndex = asFiniteNumber(raw.targetIndex);

  const issues: ValidationIssue[] = [];
  validateNumberField(issues, 'slopeM', 'Performance Index Slope', slopeM, {
    min: 0.2,
    max: 5,
  });
  validateNumberField(issues, 'targetIndex', 'Target Index Threshold', targetIndex, {
    min: 0,
    exclusiveMin: true,
    max: 10000,
  });

  if (issues.length > 0) {
    return { valid: false, issues, warnings: [], metrics: [], graphData: null };
  }

  const candidates: RankedAshbyCandidate[] = ASHBY_FAMILIES.map((f) => {
    const xGeoMean = Math.sqrt(f.rhoMin * f.rhoMax);
    const yMin = axisPair === 'E_rho' ? f.eMin : f.sigmaMin;
    const yMax = axisPair === 'E_rho' ? f.eMax : f.sigmaMax;
    const yGeoMean = Math.sqrt(yMin * yMax);
    const rhoGcm3 = xGeoMean / 1000;
    const indexValue = Math.pow(yGeoMean, 1 / slopeM) / rhoGcm3;

    return {
      id: f.id,
      name: f.name,
      family: f.family,
      color: f.color,
      xGeoMean,
      yGeoMean,
      indexValue,
      meetsThreshold: indexValue >= targetIndex,
    };
  }).sort((a, b) => b.indexValue - a.indexValue);

  const qualifying = candidates.filter((c) => c.meetsThreshold);
  const top = candidates[0];
  const runnerUp = candidates[1];

  const warnings: string[] = [];
  if (qualifying.length === 0) {
    warnings.push(
      `No standard material family centroid meets target index M ≥ ${formatEngineeringNumber(targetIndex, 1)}. Lower M_min or adjust geometry/slope.`,
    );
  }

  const yLabel = axisPair === 'E_rho' ? "Young's Modulus (E)" : 'Yield Strength (σ_y)';
  const yUnit = axisPair === 'E_rho' ? 'GPa' : 'MPa';

  return {
    valid: true,
    issues: [],
    warnings,
    verdict: {
      tone: qualifying.length > 0 ? 'safe' : 'caution',
      label: qualifying.length > 0 ? `${qualifying.length} Qualifying Families` : 'Target Exceeds Library',
      detail: `Top candidate: ${top.name} (M = ${formatEngineeringNumber(top.indexValue, 2)})`,
    },
    metrics: [
      {
        key: 'topCandidate',
        label: 'Top Ranked Family',
        symbol: '#1',
        value: top.name,
        unit: '',
        tone: top.meetsThreshold ? 'safe' : 'caution',
        statusLabel: top.meetsThreshold ? 'Qualifies' : 'Below Target',
        finePrint: {
          summary: `Centroid: ρ = ${Math.round(top.xGeoMean)} kg/m³, ${axisPair === 'E_rho' ? 'E' : 'σ_y'} = ${formatEngineeringNumber(top.yGeoMean, 1)} ${yUnit}.`,
        },
      },
      {
        key: 'topIndex',
        label: 'Peak Performance Index',
        symbol: 'M_max',
        value: formatEngineeringNumber(top.indexValue, 2),
        rawValue: top.indexValue,
        unit: '',
        finePrint: {
          summary: `Evaluated as Y^(1/${slopeM}) / (ρ / 1000).`,
        },
      },
      {
        key: 'runnerUp',
        label: 'Runner-Up Candidate',
        symbol: '#2',
        value: runnerUp.name,
        unit: '',
        finePrint: {
          summary: `Performance index M = ${formatEngineeringNumber(runnerUp.indexValue, 2)}.`,
        },
      },
      {
        key: 'qualifyingCount',
        label: 'Qualifying Families',
        symbol: 'N_pass',
        value: `${qualifying.length} / ${candidates.length}`,
        rawValue: qualifying.length,
        unit: 'families',
        finePrint: {
          summary: 'Families whose centroid index M exceeds the specified guideline threshold.',
        },
      },
    ],
    graphData: {
      axisPair,
      slopeM,
      targetIndex,
      yLabel,
      yUnit,
      candidates,
    },
  };
}
