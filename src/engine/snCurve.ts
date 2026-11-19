import { CalculationResult, ModuleMetadata, StatusTone, ValidationIssue } from './types';
import { asFiniteNumber, formatEngineeringNumber, validateNumberField } from './validation';

export interface FatigueMaterial {
  id: string;
  label: string;
  sutMPa: number;
  hasKnee: boolean;
  fFactor: number;
  enduranceRatio: number;
}

export const FATIGUE_MATERIALS: Record<string, FatigueMaterial> = {
  steel_1045: {
    id: 'steel_1045',
    label: 'AISI 1045 Carbon Steel (Sut = 625 MPa)',
    sutMPa: 625,
    hasKnee: true,
    fFactor: 0.86,
    enduranceRatio: 0.5,
  },
  steel_4140: {
    id: 'steel_4140',
    label: 'AISI 4140 Alloy Steel (Sut = 1020 MPa)',
    sutMPa: 1020,
    hasKnee: true,
    fFactor: 0.78,
    enduranceRatio: 0.5,
  },
  al_7075_t6: {
    id: 'al_7075_t6',
    label: '7075-T6 Aluminum (No Knee, Sut = 572 MPa)',
    sutMPa: 572,
    hasKnee: false,
    fFactor: 0.82,
    enduranceRatio: 0.38,
  },
  ti_6al_4v: {
    id: 'ti_6al_4v',
    label: 'Ti-6Al-4V Fatigue Grade (Sut = 950 MPa)',
    sutMPa: 950,
    hasKnee: true,
    fFactor: 0.80,
    enduranceRatio: 0.45,
  },
};

export interface SurfaceFinishOption {
  id: string;
  label: string;
  aCoeff: number;
  bExp: number;
}

export const SURFACE_FINISHES: Record<string, SurfaceFinishOption> = {
  ground: { id: 'ground', label: 'Ground (Mirror / Precision)', aCoeff: 1.58, bExp: -0.085 },
  machined: { id: 'machined', label: 'Machined or Cold-Drawn', aCoeff: 4.51, bExp: -0.265 },
  hot_rolled: { id: 'hot_rolled', label: 'Hot-Rolled Mill Scale', aCoeff: 57.7, bExp: -0.718 },
  as_forged: { id: 'as_forged', label: 'As-Forged Surface', aCoeff: 272, bExp: -0.995 },
};

export interface SnPoint {
  cycles: number;
  stressMPa: number;
}

export interface SnCurveGraphData {
  material: FatigueMaterial;
  unmodifiedCurve: SnPoint[];
  modifiedCurve: SnPoint[];
  sePrimeMPa: number;
  seMPa: number;
  ka: number;
  appliedStressMPa: number;
  cyclesToFailure: number | null;
  infiniteLife: boolean;
}

export const SN_CURVE_META: ModuleMetadata = {
  id: 'sn-curve',
  index: '03',
  name: 'S–N Curve (Wöhler Diagram)',
  shortName: 'S–N Fatigue',
  category: 'Fatigue & Failure',
  description: 'Log–log Basquin fatigue life curve plotting cyclic stress amplitude versus cycles to failure with surface finish knockdown.',
  governingStandard: "Shigley's Mechanical Engineering Design · Basquin High-Cycle Fatigue (10³–10⁷+ cycles)",
  equations: [
    {
      title: 'Basquin Power Law (10³ ≤ N ≤ 10⁶)',
      expression: 'S_f = a · N^b,   a = (f · S_ut)² / S_e,   b = −(1/3) · log₁₀(f · S_ut / S_e)',
      note: 'Connects 10³-cycle low-cycle transition stress (f·S_ut) to modified endurance limit S_e at 10⁶ cycles.',
    },
    {
      title: 'Marin Surface Factor',
      expression: 'k_a = a_surf · (S_ut)^b_surf ≤ 1.0,   S_e = k_a · S_e\'',
      note: 'Accounts for surface micro-notches from machining, hot-rolling, or forging.',
    },
    {
      title: 'Predicted Cycles to Failure',
      expression: 'N_f = (σ_a / a)^(1 / b)',
      note: 'Ferrous & titanium alloys exhibit an endurance knee at 10⁶ cycles; aluminum alloys continue sloping to 5×10⁸ cycles.',
    },
  ],
  assumptions: [
    'Fully reversed cyclic loading (stress ratio R = −1, zero mean stress σ_m = 0).',
    'Nominal 50% reliability and ambient room temperature (k_b = k_c = k_d = k_e = 1.0) so surface factor k_a is isolated cleanly.',
    'For non-ferrous alloys (7075-T6 Al), endurance strength is defined at N = 5×10⁸ cycles with no horizontal endurance knee.',
  ],
  fields: [
    {
      key: 'materialId',
      label: 'Material Grade',
      kind: 'select',
      options: Object.values(FATIGUE_MATERIALS).map((m) => ({ value: m.id, label: m.label })),
      finePrint: {
        summary: 'Selects ultimate strength S_ut, endurance ratio, and ferrous/non-ferrous knee behavior.',
      },
    },
    {
      key: 'surfaceId',
      label: 'Surface Finish Factor',
      symbol: 'k_a',
      kind: 'select',
      options: Object.values(SURFACE_FINISHES).map((s) => ({ value: s.id, label: s.label })),
      finePrint: {
        summary: 'Applies Shigley Marin empirical surface condition factor k_a = a·(S_ut)^b.',
        standard: 'Shigley Table 6-2 (MPa units)',
      },
    },
    {
      key: 'stressAmplitude',
      label: 'Cyclic Stress Amplitude',
      symbol: 'σ_a',
      unit: 'MPa',
      kind: 'number',
      min: 10,
      max: 1500,
      step: 5,
      finePrint: {
        summary: 'Alternating stress amplitude (σ_max − σ_min) / 2 under fully reversed cycling.',
        validRange: '10 MPa to S_ut',
      },
    },
  ],
  presets: [
    {
      id: '1045-finite',
      label: '1045 Finite Life',
      description: 'Machined 1045 shaft at 310 MPa alternating stress.',
      values: { materialId: 'steel_1045', surfaceId: 'machined', stressAmplitude: 310 },
    },
    {
      id: '1045-infinite',
      label: '1045 Infinite Life',
      description: 'Ground 1045 shaft safely below endurance limit.',
      values: { materialId: 'steel_1045', surfaceId: 'ground', stressAmplitude: 240 },
    },
    {
      id: 'al-7075',
      label: '7075-T6 Wing Spar',
      description: 'Non-ferrous aluminum showing continuous fatigue slope.',
      values: { materialId: 'al_7075_t6', surfaceId: 'machined', stressAmplitude: 210 },
    },
  ],
  defaultValues: {
    materialId: 'steel_1045',
    surfaceId: 'machined',
    stressAmplitude: 310,
  },
};

export function calculateSnCurve(
  raw: Record<string, number | string | boolean>,
): CalculationResult<SnCurveGraphData> {
  const materialId = typeof raw.materialId === 'string' ? raw.materialId : 'steel_1045';
  const surfaceId = typeof raw.surfaceId === 'string' ? raw.surfaceId : 'machined';
  const mat = FATIGUE_MATERIALS[materialId] ?? FATIGUE_MATERIALS.steel_1045;
  const surf = SURFACE_FINISHES[surfaceId] ?? SURFACE_FINISHES.machined;

  const sigmaA = asFiniteNumber(raw.stressAmplitude);
  const issues: ValidationIssue[] = [];
  validateNumberField(issues, 'stressAmplitude', 'Cyclic Stress Amplitude', sigmaA, {
    min: 0,
    exclusiveMin: true,
    max: 5000,
  });

  if (issues.length > 0) {
    return { valid: false, issues, warnings: [], metrics: [], graphData: null };
  }

  const rawKa = surf.aCoeff * Math.pow(mat.sutMPa, surf.bExp);
  const ka = Math.min(1, Math.max(0.15, rawKa));
  const sePrimeMPa = mat.enduranceRatio * mat.sutMPa;
  const seMPa = ka * sePrimeMPa;
  const s1000 = mat.fFactor * mat.sutMPa;

  const kneeCycles = mat.hasKnee ? 1e6 : 5e8;
  const logSpan = Math.log10(kneeCycles) - 3;

  const buildBasquin = (endurance: number) => {
    const b = -Math.log10(s1000 / endurance) / logSpan;
    const a = s1000 / Math.pow(1000, b);
    return { a, b };
  };

  const unmod = buildBasquin(sePrimeMPa);
  const mod = buildBasquin(seMPa);

  const sampleCycles = [1e3, 3e3, 1e4, 3e4, 1e5, 3e5, 1e6, 3e6, 1e7, 1e8, 5e8];
  const unmodifiedCurve: SnPoint[] = sampleCycles.map((N) => ({
    cycles: N,
    stressMPa: mat.hasKnee && N >= 1e6 ? sePrimeMPa : unmod.a * Math.pow(N, unmod.b),
  }));
  const modifiedCurve: SnPoint[] = sampleCycles.map((N) => ({
    cycles: N,
    stressMPa: mat.hasKnee && N >= 1e6 ? seMPa : mod.a * Math.pow(N, mod.b),
  }));

  let infiniteLife = false;
  let cyclesToFailure: number | null = null;
  if (mat.hasKnee && sigmaA <= seMPa) {
    infiniteLife = true;
  } else {
    cyclesToFailure = Math.pow(sigmaA / mod.a, 1 / mod.b);
  }

  const warnings: string[] = [];
  if (sigmaA > mat.sutMPa) {
    warnings.push(
      `Applied amplitude (${formatEngineeringNumber(sigmaA)} MPa) exceeds Ultimate Tensile Strength (${mat.sutMPa} MPa); immediate static fracture occurs at N < 1 cycle.`,
    );
  } else if (sigmaA > s1000) {
    warnings.push('Stress lies in the low-cycle plastic fatigue regime (N < 10³ cycles); strain-life (Coffin–Manson) analysis is recommended.');
  }

  let tone: StatusTone = 'caution';
  let statusLabel = 'Finite High-Cycle Life';
  if (sigmaA > mat.sutMPa) {
    tone = 'danger';
    statusLabel = 'Static Overload';
  } else if (infiniteLife || (cyclesToFailure !== null && cyclesToFailure >= 1e7)) {
    tone = 'safe';
    statusLabel = mat.hasKnee ? 'Infinite Life (σ_a ≤ S_e)' : 'Long-Life (>10⁷ cycles)';
  } else if (cyclesToFailure !== null && cyclesToFailure < 1e4) {
    tone = 'danger';
    statusLabel = 'Low-Cycle Failure';
  }

  return {
    valid: true,
    issues: [],
    warnings,
    verdict: {
      tone,
      label: statusLabel,
      detail: infiniteLife
        ? `Operating below S_e (${formatEngineeringNumber(seMPa, 1)} MPa) — theoretically infinite fatigue life.`
        : `Estimated life N_f = ${cyclesToFailure !== null ? cyclesToFailure.toExponential(2) : '—'} cycles.`,
    },
    metrics: [
      {
        key: 'cyclesToFailure',
        label: 'Cycles to Failure',
        symbol: 'N_f',
        value: infiniteLife ? '∞ (>10⁷)' : cyclesToFailure !== null ? cyclesToFailure.toExponential(2) : '—',
        rawValue: cyclesToFailure ?? undefined,
        unit: 'cycles',
        tone,
        statusLabel,
        finePrint: {
          summary: 'Predicted median cycle count to crack initiation/failure via Basquin equation.',
          formula: 'N_f = (σ_a / a)^(1/b)',
        },
      },
      {
        key: 'seModified',
        label: 'Modified Endurance Limit',
        symbol: 'S_e',
        value: formatEngineeringNumber(seMPa, 1),
        rawValue: seMPa,
        unit: 'MPa',
        finePrint: {
          summary: mat.hasKnee
            ? 'Fatigue endurance limit adjusted for surface finish factor k_a.'
            : 'Fatigue strength at 5×10⁸ cycles (non-ferrous alloys lack a true endurance knee).',
          formula: "S_e = k_a · S_e'",
        },
      },
      {
        key: 'kaFactor',
        label: 'Marin Surface Factor',
        symbol: 'k_a',
        value: formatEngineeringNumber(ka, 3),
        rawValue: ka,
        unit: '—',
        finePrint: {
          summary: `Knockdown factor for ${surf.label.toLowerCase()} finish.`,
          formula: `k_a = ${surf.aCoeff} · (${mat.sutMPa})^(${surf.bExp})`,
        },
      },
      {
        key: 'basquinB',
        label: 'Basquin Slope Exponent',
        symbol: 'b',
        value: formatEngineeringNumber(mod.b, 4),
        rawValue: mod.b,
        unit: '—',
        finePrint: {
          summary: 'Log–log slope of the finite-life S–N line.',
        },
      },
    ],
    graphData: {
      material: mat,
      unmodifiedCurve,
      modifiedCurve,
      sePrimeMPa,
      seMPa,
      ka,
      appliedStressMPa: sigmaA,
      cyclesToFailure,
      infiniteLife,
    },
  };
}
