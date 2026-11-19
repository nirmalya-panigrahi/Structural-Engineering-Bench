import { describe, expect, it } from 'vitest';
import { calculateAshbyChart } from '../engine/ashbyChart';
import { calculateBeamSfdBmd } from '../engine/beamSfdBmd';
import { calculateCasagrande } from '../engine/casagrande';
import { calculateEulerBuckling } from '../engine/eulerBuckling';
import { calculateGoodman } from '../engine/goodman';
import { calculateMohrCoulomb } from '../engine/mohrCoulomb';
import { calculateMohrsCircle } from '../engine/mohrsCircle';
import { calculatePmInteraction } from '../engine/pmInteraction';
import { MODULE_REGISTRY } from '../engine/registry';
import { calculateSnCurve } from '../engine/snCurve';
import { calculateStressStrain } from '../engine/stressStrain';

describe('Engineering Calculation Engines — Blue Pill (Happy Path)', () => {
  it('computes 2D & 3D Mohr Circle principal stresses accurately', () => {
    const res2d = calculateMohrsCircle({
      mode: '2d',
      sigmaX: 80,
      sigmaY: -40,
      tauXY: 30,
      theta: 0,
    });
    expect(res2d.valid).toBe(true);
    expect(res2d.graphData?.sigma1).toBeCloseTo(87.082, 2);
    expect(res2d.graphData?.sigma2).toBeCloseTo(-47.082, 2);
    expect(res2d.graphData?.tauMax2D).toBeCloseTo(67.082, 2);

    const res3d = calculateMohrsCircle({
      mode: '3d',
      sigmaX: 100,
      sigmaY: 60,
      sigmaZ: -50,
      tauXY: 0,
      theta: 15,
    });
    expect(res3d.valid).toBe(true);
    expect(res3d.graphData?.sigma1).toBeCloseTo(100, 2);
    expect(res3d.graphData?.sigma3).toBeCloseTo(-50, 2);
    expect(res3d.graphData?.tauMax3D).toBeCloseTo(75, 2);
  });

  it('computes Stress-Strain elastic stress and toughness', () => {
    const res = calculateStressStrain({
      materialId: 'a36_steel',
      loadKN: 25,
      areaMm2: 100,
      gaugeMm: 50,
    });
    expect(res.valid).toBe(true);
    expect(res.graphData?.appliedStressMPa).toBeCloseTo(250, 2);
    expect(res.graphData?.toughnessMJm3).toBeGreaterThan(50);
  });

  it('computes S-N curve endurance limit and finite vs infinite life', () => {
    const finite = calculateSnCurve({
      materialId: 'steel_1045',
      surfaceId: 'machined',
      stressAmplitude: 350,
    });
    expect(finite.valid).toBe(true);
    expect(finite.graphData?.infiniteLife).toBe(false);
    expect(finite.graphData?.cyclesToFailure).toBeGreaterThan(1000);

    const infinite = calculateSnCurve({
      materialId: 'steel_1045',
      surfaceId: 'ground',
      stressAmplitude: 200,
    });
    expect(infinite.valid).toBe(true);
    expect(infinite.graphData?.infiniteLife).toBe(true);
  });

  it('computes Goodman / Haigh safety factors accurately', () => {
    const res = calculateGoodman({
      sigmaM: 160,
      sigmaA: 80,
      se: 240,
      sy: 480,
      sut: 640,
    });
    expect(res.valid).toBe(true);
    // 1/n_G = 80/240 + 160/640 = 0.3333 + 0.25 = 0.5833 -> n_G = 1.714
    expect(res.graphData?.nGoodman).toBeCloseTo(1.714, 2);
    // n_y = 480 / (160 + 80) = 2.0
    expect(res.graphData?.nYield).toBeCloseTo(2.0, 2);
  });

  it('computes Simply Supported and Propped Cantilever SFD/BMD with inflection points', () => {
    const ss = calculateBeamSfdBmd({
      supportType: 'simply_supported',
      lengthM: 10,
      pointLoadKN: 40,
      pointLoadPosM: 5,
      udlKNm: 0,
    });
    expect(ss.valid).toBe(true);
    expect(ss.graphData?.reactionAKN).toBeCloseTo(20, 3);
    expect(ss.graphData?.mAbsMax).toBeCloseTo(100, 2);

    const propped = calculateBeamSfdBmd({
      supportType: 'propped_cantilever',
      lengthM: 8,
      pointLoadKN: 50,
      pointLoadPosM: 5,
      udlKNm: 10,
    });
    expect(propped.valid).toBe(true);
    expect(propped.graphData?.inflectionPointsM.length).toBeGreaterThan(0);
  });

  it('computes Mohr-Coulomb shear capacity and failure angle', () => {
    const res = calculateMohrCoulomb({
      cohesionKPa: 20,
      frictionDeg: 30,
      sigma3KPa: 100,
      sigma1KPa: 250,
    });
    expect(res.valid).toBe(true);
    expect(res.graphData?.failureAngleDeg).toBeCloseTo(60, 2);
    expect(res.graphData?.factorOfSafety).toBeGreaterThan(1.0);
  });

  it('ranks Ashby material families correctly for stiffness beam m=2', () => {
    const res = calculateAshbyChart({
      axisPair: 'E_rho',
      slopeM: 2,
      targetIndex: 5.5,
    });
    expect(res.valid).toBe(true);
    expect(res.graphData?.candidates[0].id).toBe('cfrp');
  });

  it('transitions Euler vs Johnson column buckling at C_c', () => {
    const res = calculateEulerBuckling({
      endCondition: '1.0',
      lengthMm: 3600,
      radiusGyrationMm: 28,
      areaMm2: 2400,
      modulusGPa: 200,
      yieldMPa: 250,
    });
    expect(res.valid).toBe(true);
    expect(res.graphData?.transitionCc).toBeCloseTo(125.66, 1);
    expect(res.graphData?.regime).toBe('Euler Elastic');
  });

  it('computes Concrete P-M Interaction balanced failure and safe demand check', () => {
    const res = calculatePmInteraction({
      widthMm: 400,
      depthMm: 500,
      fcMPa: 35,
      rhoPct: 2.4,
      demandAxialKN: 1800,
      demandMomentKNm: 220,
    });
    expect(res.valid).toBe(true);
    expect(res.graphData?.isSafe).toBe(true);
    expect(res.graphData?.balancedNominal.axialKN).toBeGreaterThan(1500);
  });

  it('classifies Casagrande Atterberg limits across CL, CH, MH, CL-ML', () => {
    expect(calculateCasagrande({ liquidLimit: 42, plasticLimit: 18, isOrganic: false }).graphData?.uscsSymbol).toBe('CL');
    expect(calculateCasagrande({ liquidLimit: 68, plasticLimit: 24, isOrganic: false }).graphData?.uscsSymbol).toBe('CH');
    expect(calculateCasagrande({ liquidLimit: 64, plasticLimit: 40, isOrganic: false }).graphData?.uscsSymbol).toBe('MH');
    expect(calculateCasagrande({ liquidLimit: 25, plasticLimit: 19, isOrganic: false }).graphData?.uscsSymbol).toBe('CL-ML');
  });

  it('every registered module produces a valid calculation on its defaultValues and presets', () => {
    for (const mod of MODULE_REGISTRY) {
      const defRes = mod.calculate(mod.meta.defaultValues);
      expect(defRes.valid).toBe(true);
      for (const preset of mod.meta.presets) {
        const pRes = mod.calculate(preset.values);
        expect(pRes.valid).toBe(true);
      }
    }
  });
});

describe('Engineering Calculation Engines — Red Pill (Adversarial & Invalid Inputs)', () => {
  it('rejects NaN, Infinity, and empty string inputs across engines', () => {
    const mohr = calculateMohrsCircle({ mode: '2d', sigmaX: '', sigmaY: 0, tauXY: 0, theta: 0 });
    expect(mohr.valid).toBe(false);
    expect(mohr.issues.some((i) => i.field === 'sigmaX')).toBe(true);

    const euler = calculateEulerBuckling({
      endCondition: '1.0',
      lengthMm: Infinity,
      radiusGyrationMm: 20,
      areaMm2: 1000,
      modulusGPa: 200,
      yieldMPa: 250,
    });
    expect(euler.valid).toBe(false);
  });

  it('rejects division-by-zero and non-physical negative dimensions', () => {
    const ss = calculateStressStrain({ materialId: 'a36_steel', loadKN: 20, areaMm2: 0, gaugeMm: 50 });
    expect(ss.valid).toBe(false);
    expect(ss.issues[0].field).toBe('areaMm2');

    const beamZero = calculateBeamSfdBmd({
      supportType: 'simply_supported',
      lengthM: 0,
      pointLoadKN: 10,
      pointLoadPosM: 0,
      udlKNm: 5,
    });
    expect(beamZero.valid).toBe(false);
  });

  it('rejects load placed outside beam span (a > L)', () => {
    const beam = calculateBeamSfdBmd({
      supportType: 'simply_supported',
      lengthM: 5,
      pointLoadKN: 20,
      pointLoadPosM: 7.5,
      udlKNm: 0,
    });
    expect(beam.valid).toBe(false);
    expect(beam.issues[0].field).toBe('pointLoadPosM');
  });

  it('rejects Casagrande PL > LL (negative plasticity index)', () => {
    const res = calculateCasagrande({ liquidLimit: 30, plasticLimit: 45, isOrganic: false });
    expect(res.valid).toBe(false);
    expect(res.issues[0].field).toBe('plasticLimit');
  });

  it('emits warning when Casagrande sample exceeds U-line', () => {
    const res = calculateCasagrande({ liquidLimit: 30, plasticLimit: 4, isOrganic: false });
    expect(res.valid).toBe(true);
    expect(res.graphData?.aboveULine).toBe(true);
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it('rejects Mohr-Coulomb sigma1 < sigma3 and Goodman Sut < Sy', () => {
    const mc = calculateMohrCoulomb({ cohesionKPa: 10, frictionDeg: 30, sigma3KPa: 200, sigma1KPa: 100 });
    expect(mc.valid).toBe(false);
    expect(mc.issues[0].field).toBe('sigma1KPa');

    const goodman = calculateGoodman({ sigmaM: 100, sigmaA: 50, se: 200, sy: 600, sut: 500 });
    expect(goodman.valid).toBe(false);
    expect(goodman.issues[0].field).toBe('sut');
  });
});
