import { CalculationResult, ModuleMetadata, StatusTone, ValidationIssue } from './types';
import { asFiniteNumber, formatEngineeringNumber, validateNumberField } from './validation';

export type SupportConfig = 'simply_supported' | 'cantilever' | 'propped_cantilever';

export interface BeamSamplePoint {
  x: number;
  shear: number;
  moment: number;
}

export interface BeamGraphData {
  lengthM: number;
  supportType: SupportConfig;
  pointLoadKN: number;
  pointLoadPosM: number;
  udlKNm: number;
  reactionAKN: number;
  reactionBKN: number;
  wallMomentKNm: number;
  samples: BeamSamplePoint[];
  vMaxAbs: number;
  vMaxSigned: number;
  vMaxPosM: number;
  mMaxPos: number;
  mMinNeg: number;
  mAbsMax: number;
  mAbsMaxPosM: number;
  inflectionPointsM: number[];
}

export const BEAM_SFD_BMD_META: ModuleMetadata = {
  id: 'beam-sfd-bmd',
  index: '05',
  name: 'Shear Force & Bending Moment (SFD/BMD)',
  shortName: 'Beam SFD / BMD',
  category: 'Structural',
  description: 'Internal shear force V(x) and bending moment M(x) diagrams across statically determinate and propped cantilever beams.',
  governingStandard: 'Euler–Bernoulli Beam Theory · Sign Convention: +V upward left, +M sagging (tension bottom)',
  equations: [
    {
      title: 'Differential Equilibrium',
      expression: 'dV / dx = −w(x),   dM / dx = V(x)',
      note: 'Slope of shear equals negative load intensity; slope of moment equals shear force.',
    },
    {
      title: 'Propped Cantilever Redundant Reaction',
      expression: 'R_B = (3/8)wL + (Pa² / 2L³)(3L − a)',
      note: 'Derived via Castigliano / compatibility Δ_B = 0 at the roller prop.',
    },
  ],
  assumptions: [
    'Prismatic beam of uniform flexural rigidity EI under small-deflection Euler–Bernoulli theory.',
    'Downward point load P > 0 and downward UDL w > 0; negative values represent uplift.',
    'Internal inflection points represent zero-moment crossings (M(x) = 0) between hogging and sagging curvature.',
  ],
  fields: [
    {
      key: 'supportType',
      label: 'Support Configuration',
      kind: 'select',
      options: [
        { value: 'simply_supported', label: 'Simply Supported (Pin–Roller)' },
        { value: 'cantilever', label: 'Cantilever (Fixed–Free)' },
        { value: 'propped_cantilever', label: 'Propped Cantilever (Fixed–Roller)' },
      ],
      finePrint: {
        summary: 'Boundary conditions at x = 0 (A) and x = L (B).',
        assumptions: 'Propped cantilever exhibits both hogging at the fixed wall and sagging in the span, creating an inflection point.',
      },
    },
    {
      key: 'lengthM',
      label: 'Beam Span Length',
      symbol: 'L',
      unit: 'm',
      kind: 'number',
      min: 0.5,
      max: 50,
      step: 0.5,
      finePrint: {
        summary: 'Clear centerline span length between supports A and B.',
        validRange: 'L > 0 m',
      },
    },
    {
      key: 'pointLoadKN',
      label: 'Point Load',
      symbol: 'P',
      unit: 'kN',
      kind: 'number',
      min: -500,
      max: 500,
      step: 5,
      finePrint: {
        summary: 'Concentrated transverse load acting downward (+P) at distance a from support A.',
      },
    },
    {
      key: 'pointLoadPosM',
      label: 'Point Load Position',
      symbol: 'a',
      unit: 'm',
      kind: 'number',
      min: 0,
      max: 50,
      step: 0.25,
      finePrint: {
        summary: 'Distance from left support A (x = 0) to concentrated load P.',
        validRange: '0 ≤ a ≤ L',
      },
    },
    {
      key: 'udlKNm',
      label: 'Uniform Distributed Load',
      symbol: 'w',
      unit: 'kN/m',
      kind: 'number',
      min: -200,
      max: 200,
      step: 1,
      finePrint: {
        summary: 'Uniformly distributed load intensity applied across full span [0, L].',
      },
    },
  ],
  presets: [
    {
      id: 'ss-combined',
      label: 'Simply Supported + Point + UDL',
      description: '6 m girder with 40 kN off-center load and 12 kN/m dead load.',
      values: { supportType: 'simply_supported', lengthM: 6, pointLoadKN: 40, pointLoadPosM: 2.2, udlKNm: 12 },
    },
    {
      id: 'propped-inflection',
      label: 'Propped Cantilever (Inflection)',
      description: 'Fixed at x=0, roller at x=8m; shows clear zero-moment inflection point.',
      values: { supportType: 'propped_cantilever', lengthM: 8, pointLoadKN: 50, pointLoadPosM: 5, udlKNm: 10 },
    },
    {
      id: 'cantilever-tip',
      label: 'Cantilever Balcony',
      description: '3.5 m overhang with tip load and slab UDL.',
      values: { supportType: 'cantilever', lengthM: 3.5, pointLoadKN: 25, pointLoadPosM: 3.5, udlKNm: 8 },
    },
  ],
  defaultValues: {
    supportType: 'propped_cantilever',
    lengthM: 8,
    pointLoadKN: 50,
    pointLoadPosM: 5,
    udlKNm: 10,
  },
};

export function calculateBeamSfdBmd(
  raw: Record<string, number | string | boolean>,
): CalculationResult<BeamGraphData> {
  const supportType: SupportConfig =
    raw.supportType === 'cantilever' || raw.supportType === 'propped_cantilever'
      ? raw.supportType
      : 'simply_supported';

  const L = asFiniteNumber(raw.lengthM);
  const P = asFiniteNumber(raw.pointLoadKN);
  const a = asFiniteNumber(raw.pointLoadPosM);
  const w = asFiniteNumber(raw.udlKNm);

  const issues: ValidationIssue[] = [];
  validateNumberField(issues, 'lengthM', 'Beam Span Length', L, { min: 0, exclusiveMin: true, max: 200 });
  validateNumberField(issues, 'pointLoadKN', 'Point Load', P, { min: -10000, max: 10000 });
  validateNumberField(issues, 'pointLoadPosM', 'Point Load Position', a, { min: 0, max: 200 });
  validateNumberField(issues, 'udlKNm', 'Uniform Distributed Load', w, { min: -5000, max: 5000 });

  if (issues.length === 0 && a > L) {
    issues.push({
      field: 'pointLoadPosM',
      message: `Point load position a (${a} m) cannot exceed beam span length L (${L} m).`,
    });
  }

  if (issues.length > 0) {
    return { valid: false, issues, warnings: [], metrics: [], graphData: null };
  }

  let reactionA = 0;
  let reactionB = 0;
  let wallMoment = 0; // internal moment at x = 0+

  if (supportType === 'simply_supported') {
    reactionB = (P * a + 0.5 * w * L * L) / L;
    reactionA = P + w * L - reactionB;
    wallMoment = 0;
  } else if (supportType === 'cantilever') {
    reactionB = 0;
    reactionA = P + w * L;
    wallMoment = -(P * a + 0.5 * w * L * L);
  } else {
    const rbUdl = (3 / 8) * w * L;
    const rbPoint = (P * a * a * (3 * L - a)) / (2 * L * L * L);
    reactionB = rbUdl + rbPoint;
    reactionA = P + w * L - reactionB;
    wallMoment = reactionB * L - P * a - 0.5 * w * L * L;
  }

  const evalShear = (x: number, afterPoint: boolean): number => {
    const step = afterPoint ? (x >= a - 1e-9 ? P : 0) : x > a + 1e-9 ? P : 0;
    return reactionA - w * x - step;
  };

  const evalMoment = (x: number): number => {
    const pointTerm = x > a ? P * (x - a) : 0;
    return wallMoment + reactionA * x - 0.5 * w * x * x - pointTerm;
  };

  const numSteps = 160;
  const xCoords = new Set<number>();
  for (let i = 0; i <= numSteps; i++) {
    xCoords.add((L * i) / numSteps);
  }
  xCoords.add(a);
  // Add exact local extremum where V(x) = 0 if inside [0, L]
  if (Math.abs(w) > 1e-9) {
    const xZeroBefore = reactionA / w;
    const xZeroAfter = (reactionA - P) / w;
    if (xZeroBefore > 0 && xZeroBefore < a) xCoords.add(xZeroBefore);
    if (xZeroAfter > a && xZeroAfter < L) xCoords.add(xZeroAfter);
  }

  const sortedX = Array.from(xCoords).sort((x1, x2) => x1 - x2);
  const samples: BeamSamplePoint[] = [];

  for (const x of sortedX) {
    if (Math.abs(x - a) < 1e-9 && Math.abs(P) > 1e-9) {
      const m = evalMoment(x);
      if (x > 1e-9) {
        samples.push({ x, shear: evalShear(x, false), moment: m });
      }
      if (x < L - 1e-9) {
        samples.push({ x, shear: evalShear(x, true), moment: m });
      } else {
        samples.push({ x, shear: evalShear(x, false), moment: m });
      }
    } else {
      samples.push({ x, shear: evalShear(x, x > a), moment: evalMoment(x) });
    }
  }

  let vMaxAbs = 0;
  let vMaxSigned = 0;
  let vMaxPosM = 0;
  let mMaxPos = -Infinity;
  let mMinNeg = Infinity;
  let mAbsMax = 0;
  let mAbsMaxPosM = 0;

  for (const pt of samples) {
    if (Math.abs(pt.shear) > vMaxAbs) {
      vMaxAbs = Math.abs(pt.shear);
      vMaxSigned = pt.shear;
      vMaxPosM = pt.x;
    }
    if (pt.moment > mMaxPos) mMaxPos = pt.moment;
    if (pt.moment < mMinNeg) mMinNeg = pt.moment;
    if (Math.abs(pt.moment) > mAbsMax) {
      mAbsMax = Math.abs(pt.moment);
      mAbsMaxPosM = pt.x;
    }
  }

  // Find interior zero-moment inflection points (strictly inside (0, L))
  const inflectionPointsM: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const curr = samples[i];
    if (curr.x <= 1e-4 || prev.x >= L - 1e-4) continue;
    if ((prev.moment < -1e-6 && curr.moment > 1e-6) || (prev.moment > 1e-6 && curr.moment < -1e-6)) {
      const frac = Math.abs(prev.moment) / (Math.abs(prev.moment) + Math.abs(curr.moment));
      const root = prev.x + frac * (curr.x - prev.x);
      if (root > 0.02 * L && root < 0.98 * L) {
        inflectionPointsM.push(root);
      }
    }
  }

  const warnings: string[] = [];
  if (Math.abs(P) < 1e-9 && Math.abs(w) < 1e-9) {
    warnings.push('Zero applied load: internal shear and bending moment are identically zero along the span.');
  }

  const tone: StatusTone = mAbsMax > 0 ? 'neutral' : 'safe';

  return {
    valid: true,
    issues: [],
    warnings,
    verdict: {
      tone,
      label: supportType === 'propped_cantilever' ? 'Indeterminate (1°)' : 'Statically Determinate',
      detail: `Peak |V| = ${formatEngineeringNumber(vMaxAbs)} kN at x=${formatEngineeringNumber(vMaxPosM, 2)} m · Peak |M| = ${formatEngineeringNumber(mAbsMax)} kN·m at x=${formatEngineeringNumber(mAbsMaxPosM, 2)} m`,
    },
    metrics: [
      {
        key: 'vMax',
        label: 'Peak Shear Force',
        symbol: 'V_max',
        value: formatEngineeringNumber(vMaxSigned),
        rawValue: vMaxSigned,
        unit: 'kN',
        finePrint: {
          summary: `Maximum magnitude shear occurs at x = ${formatEngineeringNumber(vMaxPosM, 2)} m.`,
        },
      },
      {
        key: 'mMax',
        label: 'Max Bending Moment',
        symbol: '|M|_max',
        value: formatEngineeringNumber(mAbsMax),
        rawValue: mAbsMax,
        unit: 'kN·m',
        finePrint: {
          summary: `Sagging max: ${formatEngineeringNumber(Math.max(0, mMaxPos))} kN·m · Hogging min: ${formatEngineeringNumber(Math.min(0, mMinNeg))} kN·m.`,
        },
      },
      {
        key: 'reactions',
        label: supportType === 'cantilever' ? 'Fixed Support Reaction' : 'Support Reactions (R_A / R_B)',
        symbol: 'R_A, R_B',
        value:
          supportType === 'cantilever'
            ? `${formatEngineeringNumber(reactionA)} kN`
            : `${formatEngineeringNumber(reactionA)} / ${formatEngineeringNumber(reactionB)}`,
        unit: supportType === 'cantilever' ? '' : 'kN',
        finePrint: {
          summary:
            supportType === 'cantilever'
              ? `Fixed wall resisting moment M_A = ${formatEngineeringNumber(wallMoment)} kN·m.`
              : `Vertical reactions at x = 0 and x = ${L} m (wall moment M_A = ${formatEngineeringNumber(wallMoment)} kN·m).`,
        },
      },
      {
        key: 'inflection',
        label: 'Inflection Point (M = 0)',
        symbol: 'x_inf',
        value:
          inflectionPointsM.length > 0
            ? inflectionPointsM.map((pt) => `${formatEngineeringNumber(pt, 2)} m`).join(', ')
            : 'None (Interior)',
        unit: '',
        finePrint: {
          summary: 'Span coordinate(s) strictly inside (0, L) where bending moment reverses sign (zero curvature).',
        },
      },
    ],
    graphData: {
      lengthM: L,
      supportType,
      pointLoadKN: P,
      pointLoadPosM: a,
      udlKNm: w,
      reactionAKN: reactionA,
      reactionBKN: reactionB,
      wallMomentKNm: wallMoment,
      samples,
      vMaxAbs,
      vMaxSigned,
      vMaxPosM,
      mMaxPos,
      mMinNeg,
      mAbsMax,
      mAbsMaxPosM,
      inflectionPointsM,
    },
  };
}
