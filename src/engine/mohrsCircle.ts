import { CalculationResult, ModuleMetadata, ValidationIssue } from './types';
import { asFiniteNumber, formatEngineeringNumber, validateNumberField } from './validation';

export interface MohrsCircleGraphData {
  mode: '2d' | '3d';
  sigmaX: number;
  sigmaY: number;
  sigmaZ: number;
  tauXY: number;
  thetaDeg: number;
  sigmaAvg: number;
  radius2D: number;
  sigma1: number;
  sigma2: number;
  sigma3: number;
  tauMax2D: number;
  tauMax3D: number;
  thetaPDeg: number;
  thetaSDeg: number;
  sigmaXPrime: number;
  sigmaYPrime: number;
  tauXYPrime: number;
}

export const MOHRS_CIRCLE_META: ModuleMetadata = {
  id: 'mohrs-circle',
  index: '01',
  name: "Mohr's Circle (2D & 3D)",
  shortName: "Mohr's Circle",
  category: 'Solid Mechanics',
  description: 'Graphical stress tensor transformation across rotated axes in 2D plane stress and 3D principal space.',
  governingStandard: 'Cauchy Stress Tensor Transformation · Sign Convention: Tensile (+), CCW Shear (+)',
  equations: [
    {
      title: 'Center & Radius (2D)',
      expression: 'σ_avg = (σ_x + σ_y) / 2,   R = √[((σ_x − σ_y)/2)² + τ_xy²]',
      note: 'Defines the 2D circle center on the σ-axis and maximum in-plane shear radius.',
    },
    {
      title: 'Principal Stresses & Plane Angle',
      expression: 'σ_1,2 = σ_avg ± R,   tan(2θ_p) = 2τ_xy / (σ_x − σ_y)',
      note: 'Principal planes carry zero shear stress; 2θ_p on the circle equals 2× physical rotation θ_p.',
    },
    {
      title: '3D Absolute Max Shear',
      expression: 'τ_max,3D = (σ_max − σ_min) / 2',
      note: 'Includes out-of-plane σ_z (σ_z = 0 in plane stress) across the three ordered principals σ_1 ≥ σ_2 ≥ σ_3.',
    },
  ],
  assumptions: [
    'Continuum element under infinitesimal strain with symmetric stress tensor (τ_xy = τ_yx).',
    'Positive normal stress indicates tension; negative indicates compression.',
    'Plot convention places +τ downward on the vertical axis so physical CCW rotation θ corresponds to CCW rotation 2θ on the circle.',
    'In 3D mode, σ_z is treated as an out-of-plane principal stress (τ_xz = τ_yz = 0).',
  ],
  fields: [
    {
      key: 'mode',
      label: 'Analysis Dimension',
      kind: 'select',
      options: [
        { value: '2d', label: '2D Plane Stress' },
        { value: '3d', label: '3D Principal Circles' },
      ],
      finePrint: {
        summary: 'Switches between single in-plane Mohr circle and full 3D tri-circle stress state.',
        assumptions: '3D mode assumes τ_xz = τ_yz = 0 so σ_z is directly one of the three principal stresses.',
      },
    },
    {
      key: 'sigmaX',
      label: 'Normal Stress X',
      symbol: 'σ_x',
      unit: 'MPa',
      kind: 'number',
      min: -2000,
      max: 2000,
      step: 5,
      finePrint: {
        summary: 'Normal stress acting on the x-face perpendicular to the horizontal axis.',
        validRange: '−2000 to +2000 MPa (Tension +, Compression −)',
      },
    },
    {
      key: 'sigmaY',
      label: 'Normal Stress Y',
      symbol: 'σ_y',
      unit: 'MPa',
      kind: 'number',
      min: -2000,
      max: 2000,
      step: 5,
      finePrint: {
        summary: 'Normal stress acting on the y-face perpendicular to the vertical axis.',
        validRange: '−2000 to +2000 MPa (Tension +, Compression −)',
      },
    },
    {
      key: 'sigmaZ',
      label: 'Out-of-Plane Stress Z',
      symbol: 'σ_z',
      unit: 'MPa',
      kind: 'number',
      min: -2000,
      max: 2000,
      step: 5,
      visibleWhen: (v) => v.mode === '3d',
      finePrint: {
        summary: 'Out-of-plane normal stress perpendicular to the x–y plane.',
        assumptions: 'Defaults to 0 MPa for plane stress; set non-zero for triaxial or pressure vessel wall states.',
      },
    },
    {
      key: 'tauXY',
      label: 'In-Plane Shear Stress',
      symbol: 'τ_xy',
      unit: 'MPa',
      kind: 'number',
      min: -1500,
      max: 1500,
      step: 5,
      finePrint: {
        summary: 'Shear stress acting on the x-face in the +y direction.',
        validRange: '−1500 to +1500 MPa',
      },
    },
    {
      key: 'theta',
      label: 'Element Rotation Angle',
      symbol: 'θ',
      unit: 'deg',
      kind: 'number',
      min: -180,
      max: 180,
      step: 1,
      finePrint: {
        summary: 'Counter-clockwise rotation of the transformed x′–y′ coordinate axes.',
        formula: "σ_x' = σ_avg + ((σ_x−σ_y)/2)cos(2θ) + τ_xy·sin(2θ)",
      },
    },
  ],
  presets: [
    {
      id: 'biaxial-shear',
      label: 'Biaxial + Shear',
      description: 'Classic combined tension, compression, and shear state.',
      values: { mode: '2d', sigmaX: 80, sigmaY: -40, sigmaZ: 0, tauXY: 30, theta: 25 },
    },
    {
      id: 'pure-shear',
      label: 'Pure Torsion',
      description: 'Equal and opposite principal stresses at 45°.',
      values: { mode: '2d', sigmaX: 0, sigmaY: 0, sigmaZ: 0, tauXY: 65, theta: 45 },
    },
    {
      id: 'triaxial-vessel',
      label: '3D Pressure Vessel',
      description: 'Hoop, axial, and compressive radial wall stress.',
      values: { mode: '3d', sigmaX: 140, sigmaY: 70, sigmaZ: -25, tauXY: 20, theta: 15 },
    },
  ],
  defaultValues: {
    mode: '2d',
    sigmaX: 80,
    sigmaY: -40,
    sigmaZ: 0,
    tauXY: 30,
    theta: 25,
  },
};

export function calculateMohrsCircle(
  raw: Record<string, number | string | boolean>,
): CalculationResult<MohrsCircleGraphData> {
  const mode = raw.mode === '3d' ? '3d' : '2d';
  const sigmaX = asFiniteNumber(raw.sigmaX);
  const sigmaY = asFiniteNumber(raw.sigmaY);
  const sigmaZ = mode === '3d' ? asFiniteNumber(raw.sigmaZ, 0) : 0;
  const tauXY = asFiniteNumber(raw.tauXY);
  const thetaDeg = asFiniteNumber(raw.theta);

  const issues: ValidationIssue[] = [];
  validateNumberField(issues, 'sigmaX', 'Normal Stress X', sigmaX, { min: -5000, max: 5000 });
  validateNumberField(issues, 'sigmaY', 'Normal Stress Y', sigmaY, { min: -5000, max: 5000 });
  if (mode === '3d') {
    validateNumberField(issues, 'sigmaZ', 'Out-of-Plane Stress Z', sigmaZ, { min: -5000, max: 5000 });
  }
  validateNumberField(issues, 'tauXY', 'In-Plane Shear Stress', tauXY, { min: -5000, max: 5000 });
  validateNumberField(issues, 'theta', 'Rotation Angle', thetaDeg, { min: -360, max: 360 });

  if (issues.length > 0) {
    return { valid: false, issues, warnings: [], metrics: [], graphData: null };
  }

  const sigmaAvg = (sigmaX + sigmaY) / 2;
  const halfDiff = (sigmaX - sigmaY) / 2;
  const radius2D = Math.hypot(halfDiff, tauXY);

  const sigmaA = sigmaAvg + radius2D;
  const sigmaB = sigmaAvg - radius2D;
  const principals = mode === '3d' ? [sigmaA, sigmaB, sigmaZ].sort((a, b) => b - a) : [sigmaA, sigmaB, 0];

  const sigma1 = mode === '3d' ? principals[0] : sigmaA;
  const sigma2 = mode === '3d' ? principals[1] : sigmaB;
  const sigma3 = mode === '3d' ? principals[2] : Math.min(sigmaB, 0);

  const tauMax2D = radius2D;
  const tauMax3D = mode === '3d' ? (sigma1 - sigma3) / 2 : (Math.max(sigmaA, sigmaB, 0) - Math.min(sigmaA, sigmaB, 0)) / 2;

  const twoThetaPRad = Math.atan2(tauXY, halfDiff);
  const thetaPDeg = (twoThetaPRad * 180) / (2 * Math.PI);
  const thetaSDeg = thetaPDeg > 0 ? thetaPDeg - 45 : thetaPDeg + 45;

  const twoThetaRad = (2 * thetaDeg * Math.PI) / 180;
  const sigmaXPrime = sigmaAvg + halfDiff * Math.cos(twoThetaRad) + tauXY * Math.sin(twoThetaRad);
  const sigmaYPrime = sigmaAvg - halfDiff * Math.cos(twoThetaRad) - tauXY * Math.sin(twoThetaRad);
  const tauXYPrime = -halfDiff * Math.sin(twoThetaRad) + tauXY * Math.cos(twoThetaRad);

  const warnings: string[] = [];
  if (mode === '2d' && tauMax3D > tauMax2D + 1e-6) {
    warnings.push(
      `Out-of-plane absolute max shear (${formatEngineeringNumber(tauMax3D)} MPa) exceeds 2D in-plane max shear (${formatEngineeringNumber(tauMax2D)} MPa) because both in-plane principals share the same sign.`,
    );
  }
  if (radius2D < 1e-6) {
    warnings.push('Hydrostatic stress state in x–y plane: Mohr circle degenerates to a point (all planes are principal planes).');
  }

  return {
    valid: true,
    issues: [],
    warnings,
    verdict: {
      tone: 'neutral',
      label: mode === '3d' ? '3D Tri-Circle State' : '2D Plane Stress State',
      detail: `Principal orientation θ_p = ${formatEngineeringNumber(thetaPDeg, 1)}°, Absolute τ_max = ${formatEngineeringNumber(mode === '3d' ? tauMax3D : tauMax2D)} MPa`,
    },
    metrics: [
      {
        key: 'sigma1',
        label: 'Major Principal Stress',
        symbol: 'σ_1',
        value: formatEngineeringNumber(sigma1),
        rawValue: sigma1,
        unit: 'MPa',
        finePrint: {
          summary: 'Algebraically largest normal stress across all plane orientations.',
          formula: 'σ_1 = (σ_x + σ_y)/2 + √[((σ_x − σ_y)/2)² + τ_xy²]',
        },
      },
      {
        key: 'sigma2',
        label: mode === '3d' ? 'Intermediate Principal' : 'Minor Principal Stress',
        symbol: 'σ_2',
        value: formatEngineeringNumber(sigma2),
        rawValue: sigma2,
        unit: 'MPa',
        finePrint: {
          summary: mode === '3d' ? 'Middle ordered principal stress among {σ_A, σ_B, σ_z}.' : 'Algebraically smallest in-plane normal stress.',
        },
      },
      ...(mode === '3d'
        ? [
            {
              key: 'sigma3',
              label: 'Minor Principal Stress',
              symbol: 'σ_3',
              value: formatEngineeringNumber(sigma3),
              rawValue: sigma3,
              unit: 'MPa',
              finePrint: {
                summary: 'Algebraically smallest normal stress in 3D space.',
              },
            },
          ]
        : []),
      {
        key: 'tauMax',
        label: mode === '3d' ? 'Absolute Max Shear' : 'Max In-Plane Shear',
        symbol: mode === '3d' ? 'τ_max,3D' : 'τ_max,2D',
        value: formatEngineeringNumber(mode === '3d' ? tauMax3D : tauMax2D),
        rawValue: mode === '3d' ? tauMax3D : tauMax2D,
        unit: 'MPa',
        finePrint: {
          summary: 'Radius of the governing Mohr circle; critical for Tresca ductile yield checks.',
          formula: mode === '3d' ? 'τ_max,3D = (σ_1 − σ_3)/2' : 'τ_max,2D = R',
        },
      },
      {
        key: 'thetaP',
        label: 'Principal Plane Angle',
        symbol: 'θ_p',
        value: formatEngineeringNumber(thetaPDeg, 2),
        rawValue: thetaPDeg,
        unit: 'deg',
        finePrint: {
          summary: 'Angle from the x-axis to the σ_1 principal plane.',
          formula: 'θ_p = ½ · atan2(τ_xy, (σ_x − σ_y)/2)',
        },
      },
      {
        key: 'transformed',
        label: `Rotated State (${formatEngineeringNumber(thetaDeg, 1)}°)`,
        symbol: "σ_x' / τ_x'y'",
        value: `${formatEngineeringNumber(sigmaXPrime, 1)} / ${formatEngineeringNumber(tauXYPrime, 1)}`,
        unit: 'MPa',
        finePrint: {
          summary: 'Normal and shear stress components on the rotated x′ plane at angle θ.',
          formula: "σ_y' = " + formatEngineeringNumber(sigmaYPrime, 1) + ' MPa',
        },
      },
    ],
    graphData: {
      mode,
      sigmaX,
      sigmaY,
      sigmaZ,
      tauXY,
      thetaDeg,
      sigmaAvg,
      radius2D,
      sigma1,
      sigma2,
      sigma3,
      tauMax2D,
      tauMax3D,
      thetaPDeg,
      thetaSDeg,
      sigmaXPrime,
      sigmaYPrime,
      tauXYPrime,
    },
  };
}
