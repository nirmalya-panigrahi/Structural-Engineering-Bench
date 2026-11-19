import { CalculationResult, ModuleMetadata, StatusTone, ValidationIssue } from './types';
import { asFiniteNumber, formatEngineeringNumber, validateNumberField } from './validation';

export interface PmPoint {
  momentKNm: number;
  axialKN: number;
  cMm?: number;
}

export interface PmInteractionGraphData {
  widthMm: number;
  depthMm: number;
  fcMPa: number;
  fyMPa: number;
  rhoPct: number;
  demandAxialKN: number;
  demandMomentKNm: number;
  nominalEnvelope: PmPoint[];
  factoredEnvelope: PmPoint[];
  balancedNominal: PmPoint;
  balancedFactored: PmPoint;
  pureCompressionCapKN: number;
  pureBendingFactoredKNm: number;
  utilizationRatio: number;
  isSafe: boolean;
}

export const PM_INTERACTION_META: ModuleMetadata = {
  id: 'pm-interaction',
  index: '09',
  name: 'P–M Interaction Diagram',
  shortName: 'P–M Interaction',
  category: 'Structural',
  description: 'Reinforced concrete column axial load versus bending moment capacity envelope using ACI 318 strain compatibility.',
  governingStandard: 'ACI 318-19 Rectangular Tied Column · Whitney Stress Block (ε_cu = 0.003)',
  equations: [
    {
      title: 'ACI Strength Reduction & Compression Cap',
      expression: 'φP_n,max = 0.80 · φ · [0.85 f\'_c (A_g − A_st) + f_y A_st]',
      note: 'Tied-column φ = 0.65 (compression-controlled) transitioning linearly to φ = 0.90 (tension-controlled, ε_t ≥ 0.005).',
    },
    {
      title: 'Balanced Failure Point',
      expression: 'c_b = d · (0.003 / (0.003 + f_y / E_s))',
      note: 'Simultaneous concrete crushing (ε_c = 0.003) and tension steel yielding (ε_s = ε_y).',
    },
  ],
  assumptions: [
    'Symmetric rectangular column with equal reinforcement layers near top and bottom faces (cover to bar centroid d′ = 60 mm).',
    'Concrete tensile strength neglected; Whitney rectangular stress block factor β₁ per ACI 318 (§22.2.2.4.3).',
    'Steel modulus E_s = 200,000 MPa; uniaxially bent about strong axis h.',
  ],
  fields: [
    {
      key: 'widthMm',
      label: 'Column Width',
      symbol: 'b',
      unit: 'mm',
      kind: 'number',
      min: 200,
      max: 1500,
      step: 25,
      finePrint: {
        summary: 'Cross-sectional width perpendicular to the bending axis.',
        validRange: '200 to 1500 mm',
      },
    },
    {
      key: 'depthMm',
      label: 'Column Depth',
      symbol: 'h',
      unit: 'mm',
      kind: 'number',
      min: 200,
      max: 1500,
      step: 25,
      finePrint: {
        summary: 'Overall column depth parallel to the plane of bending.',
        validRange: '200 to 1500 mm',
      },
    },
    {
      key: 'fcMPa',
      label: "Concrete Compressive Strength",
      symbol: "f'_c",
      unit: 'MPa',
      kind: 'number',
      min: 17,
      max: 85,
      step: 5,
      finePrint: {
        summary: '28-day specified cylinder compressive strength of concrete.',
        standard: 'ACI 318 minimum structural f′_c ≥ 17 MPa (2500 psi)',
      },
    },
    {
      key: 'rhoPct',
      label: 'Steel Reinforcement Ratio',
      symbol: 'ρ_g',
      unit: '%',
      kind: 'number',
      min: 1.0,
      max: 8.0,
      step: 0.2,
      finePrint: {
        summary: 'Longitudinal steel ratio A_st / (b · h).',
        standard: 'ACI 318 §10.6.1 limits: 1.0% ≤ ρ_g ≤ 8.0%',
      },
    },
    {
      key: 'demandAxialKN',
      label: 'Factored Axial Demand',
      symbol: 'P_u',
      unit: 'kN',
      kind: 'number',
      min: -1000,
      max: 15000,
      step: 50,
      finePrint: {
        summary: 'Applied factored axial compression (+P_u) or tension (−P_u) load.',
      },
    },
    {
      key: 'demandMomentKNm',
      label: 'Factored Moment Demand',
      symbol: 'M_u',
      unit: 'kN·m',
      kind: 'number',
      min: 0,
      max: 3000,
      step: 10,
      finePrint: {
        summary: 'Applied factored bending moment M_u ≥ 0 kN·m.',
      },
    },
  ],
  presets: [
    {
      id: 'safe-column',
      label: 'Safe Tied Column',
      description: '400×500 mm column with 2.4% steel safely inside φ-envelope.',
      values: { widthMm: 400, depthMm: 500, fcMPa: 35, rhoPct: 2.4, demandAxialKN: 1800, demandMomentKNm: 220 },
    },
    {
      id: 'balanced-zone',
      label: 'Near Balanced Failure',
      description: 'High moment-axial demand close to balanced knee.',
      values: { widthMm: 400, depthMm: 500, fcMPa: 35, rhoPct: 2.0, demandAxialKN: 1950, demandMomentKNm: 340 },
    },
    {
      id: 'overloaded',
      label: 'Overloaded Section',
      description: 'Factored load pair lies outside ACI design envelope.',
      values: { widthMm: 350, depthMm: 400, fcMPa: 28, rhoPct: 1.5, demandAxialKN: 2100, demandMomentKNm: 290 },
    },
  ],
  defaultValues: {
    widthMm: 400,
    depthMm: 500,
    fcMPa: 35,
    rhoPct: 2.4,
    demandAxialKN: 1800,
    demandMomentKNm: 220,
  },
};

export function calculatePmInteraction(
  raw: Record<string, number | string | boolean>,
): CalculationResult<PmInteractionGraphData> {
  const b = asFiniteNumber(raw.widthMm);
  const h = asFiniteNumber(raw.depthMm);
  const fc = asFiniteNumber(raw.fcMPa);
  const rhoPct = asFiniteNumber(raw.rhoPct);
  const demandAxialKN = asFiniteNumber(raw.demandAxialKN);
  const demandMomentKNm = asFiniteNumber(raw.demandMomentKNm);

  const issues: ValidationIssue[] = [];
  validateNumberField(issues, 'widthMm', 'Column Width', b, { min: 150, max: 3000 });
  validateNumberField(issues, 'depthMm', 'Column Depth', h, { min: 150, max: 3000 });
  validateNumberField(issues, 'fcMPa', 'Concrete Strength', fc, { min: 15, max: 120 });
  validateNumberField(issues, 'rhoPct', 'Steel Reinforcement Ratio', rhoPct, { min: 0.5, max: 8.5 });
  validateNumberField(issues, 'demandAxialKN', 'Factored Axial Demand', demandAxialKN, { min: -5000, max: 50000 });
  validateNumberField(issues, 'demandMomentKNm', 'Factored Moment Demand', demandMomentKNm, { min: 0, max: 10000 });

  if (issues.length > 0) {
    return { valid: false, issues, warnings: [], metrics: [], graphData: null };
  }

  const fy = 420; // Grade 60 rebar (MPa)
  const Es = 200000;
  const cover = Math.min(60, h * 0.15);
  const d = h - cover;
  const dPrime = cover;
  const Ag = b * h;
  const Ast = (rhoPct / 100) * Ag;
  const As = Ast / 2;
  const AsPrime = Ast / 2;

  const beta1 = fc <= 28 ? 0.85 : Math.max(0.65, 0.85 - (0.05 * (fc - 28)) / 7);
  const epsY = fy / Es;

  const p0KN = (0.85 * fc * (Ag - Ast) + fy * Ast) / 1000;
  const pMaxCapKN = 0.8 * 0.65 * p0KN;

  const evalSectionAtC = (c: number) => {
    const a = Math.min(h, beta1 * c);
    const Cc = 0.85 * fc * a * b;
    const epsSPrime = 0.003 * ((c - dPrime) / c);
    const epsS = 0.003 * ((d - c) / c); // positive = tension

    const fsPrime = Math.max(-fy, Math.min(fy, epsSPrime * Es));
    const fs = Math.max(-fy, Math.min(fy, epsS * Es));
    const effFsPrime = a > dPrime ? fsPrime - 0.85 * fc : fsPrime;

    const PnN = Cc + AsPrime * effFsPrime - As * fs;
    const MnNmm =
      Cc * (h / 2 - a / 2) +
      AsPrime * effFsPrime * (h / 2 - dPrime) +
      As * fs * (d - h / 2);

    const phi =
      epsS <= epsY
        ? 0.65
        : epsS >= 0.005
          ? 0.9
          : 0.65 + (0.25 * (epsS - epsY)) / (0.005 - epsY);

    const PnKN = PnN / 1000;
    const MnKNm = Math.max(0, MnNmm / 1e6);
    const phiPnKN = Math.min(pMaxCapKN, phi * PnKN);
    const phiMnKNm = phi * MnKNm;

    return { PnKN, MnKNm, phiPnKN, phiMnKNm, c };
  };

  const cBalanced = d * (0.003 / (0.003 + epsY));
  const bal = evalSectionAtC(cBalanced);

  const cValues: number[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const c = h * 1.4 * Math.pow(1 - t * 0.94, 1.5);
    cValues.push(Math.max(cover * 0.4, c));
  }
  cValues.push(cBalanced);
  cValues.sort((c1, c2) => c2 - c1);

  const nominalEnvelope: PmPoint[] = [{ momentKNm: 0, axialKN: p0KN }];
  const factoredEnvelope: PmPoint[] = [{ momentKNm: 0, axialKN: pMaxCapKN }];

  for (const c of cValues) {
    const res = evalSectionAtC(c);
    nominalEnvelope.push({ momentKNm: res.MnKNm, axialKN: res.PnKN, cMm: c });
    factoredEnvelope.push({ momentKNm: res.phiMnKNm, axialKN: res.phiPnKN, cMm: c });
  }

  const pTensionKN = -(fy * Ast) / 1000;
  nominalEnvelope.push({ momentKNm: 0, axialKN: pTensionKN });
  factoredEnvelope.push({ momentKNm: 0, axialKN: 0.9 * pTensionKN });

  // Interpolate pure bending capacity (P = 0)
  let pureBendingFactoredKNm = 0;
  for (let i = 1; i < factoredEnvelope.length; i++) {
    const prev = factoredEnvelope[i - 1];
    const curr = factoredEnvelope[i];
    if (prev.axialKN >= 0 && curr.axialKN <= 0 && prev.axialKN !== curr.axialKN) {
      const frac = prev.axialKN / (prev.axialKN - curr.axialKN);
      pureBendingFactoredKNm = prev.momentKNm + frac * (curr.momentKNm - prev.momentKNm);
      break;
    }
  }

  // Point-in-polygon / ray-intersection utilization ratio from origin (0, 0) through (Mu, Pu)
  let utilizationRatio = 0;
  const norm = Math.hypot(demandMomentKNm, demandAxialKN);
  if (norm > 1e-6) {
    // Ray from (0,0) in direction (Mu, Pu) against polyline segments of factoredEnvelope
    let maxT = 0;
    for (let i = 1; i < factoredEnvelope.length; i++) {
      const p1 = factoredEnvelope[i - 1];
      const p2 = factoredEnvelope[i];
      // Solve s*(Mu, Pu) = p1 + u*(p2 - p1)
      const dx = p2.momentKNm - p1.momentKNm;
      const dy = p2.axialKN - p1.axialKN;
      const det = demandMomentKNm * -dy - demandAxialKN * -dx;
      if (Math.abs(det) < 1e-9) continue;
      const s = (p1.momentKNm * -dy - p1.axialKN * -dx) / det;
      const u = (demandMomentKNm * p1.axialKN - demandAxialKN * p1.momentKNm) / det;
      if (s > 0 && u >= -1e-4 && u <= 1.0001) {
        maxT = Math.max(maxT, s);
      }
    }
    utilizationRatio = maxT > 1e-9 ? 1 / maxT : 99;
  }

  const isSafe = utilizationRatio <= 1.0;
  let tone: StatusTone = 'safe';
  let statusLabel = 'Within φ-Envelope';
  if (!isSafe) {
    tone = 'danger';
    statusLabel = 'Exceeds Capacity';
  } else if (utilizationRatio > 0.85) {
    tone = 'caution';
    statusLabel = 'Near Capacity (>85%)';
  }

  const warnings: string[] = [];
  if (rhoPct < 1.0 || rhoPct > 8.0) {
    warnings.push(`Steel ratio ρ_g = ${rhoPct}% is outside ACI 318 §10.6.1 limits (1.0% – 8.0%).`);
  }
  if (!isSafe) {
    warnings.push('Factored demand (M_u, P_u) falls outside the ACI 318 φ-factored capacity envelope.');
  }

  return {
    valid: true,
    issues: [],
    warnings,
    verdict: {
      tone,
      label: statusLabel,
      detail: `Utilization D/C = ${formatEngineeringNumber(utilizationRatio * 100, 1)}% · Balanced Point: (${formatEngineeringNumber(bal.phiMnKNm, 0)} kN·m, ${formatEngineeringNumber(bal.phiPnKN, 0)} kN)`,
    },
    metrics: [
      {
        key: 'utilization',
        label: 'Demand / Capacity Ratio',
        symbol: 'D/C',
        value: formatEngineeringNumber(utilizationRatio * 100, 1),
        rawValue: utilizationRatio,
        unit: '%',
        tone,
        statusLabel,
        finePrint: {
          summary: 'Radial distance ratio from origin to demand (M_u, P_u) versus φ-factored envelope.',
        },
      },
      {
        key: 'balancedPoint',
        label: 'Balanced Point (φM_b, φP_b)',
        symbol: 'Bal',
        value: `${formatEngineeringNumber(bal.phiMnKNm, 0)} kN·m / ${formatEngineeringNumber(bal.phiPnKN, 0)} kN`,
        unit: '',
        finePrint: {
          summary: `Nominal balanced point: (${formatEngineeringNumber(bal.MnKNm, 0)} kN·m, ${formatEngineeringNumber(bal.PnKN, 0)} kN).`,
        },
      },
      {
        key: 'pureCompression',
        label: 'Max Axial Cap (0.80φP_0)',
        symbol: 'φP_n,max',
        value: formatEngineeringNumber(pMaxCapKN, 0),
        rawValue: pMaxCapKN,
        unit: 'kN',
        finePrint: {
          summary: 'ACI 318 tied-column minimum eccentricity axial capacity cap.',
        },
      },
      {
        key: 'pureBending',
        label: 'Pure Bending Capacity',
        symbol: 'φM_n0',
        value: formatEngineeringNumber(pureBendingFactoredKNm, 1),
        rawValue: pureBendingFactoredKNm,
        unit: 'kN·m',
        finePrint: {
          summary: 'Factored flexural capacity at zero axial load (P_u = 0).',
        },
      },
    ],
    graphData: {
      widthMm: b,
      depthMm: h,
      fcMPa: fc,
      fyMPa: fy,
      rhoPct,
      demandAxialKN,
      demandMomentKNm,
      nominalEnvelope,
      factoredEnvelope,
      balancedNominal: { momentKNm: bal.MnKNm, axialKN: bal.PnKN },
      balancedFactored: { momentKNm: bal.phiMnKNm, axialKN: bal.phiPnKN },
      pureCompressionCapKN: pMaxCapKN,
      pureBendingFactoredKNm,
      utilizationRatio,
      isSafe,
    },
  };
}
