import { MohrCoulombGraphData } from '../../../engine/mohrCoulomb';
import { createLinearMapper, DEFAULT_PADDING, SvgChartFrame } from '../SvgChartFrame';

interface MohrCoulombPlotProps {
  data: MohrCoulombGraphData;
}

export function MohrCoulombPlot({ data }: MohrCoulombPlotProps) {
  const width = 680;
  const height = 400;
  const plotW = width - DEFAULT_PADDING.left - DEFAULT_PADDING.right;
  const plotH = height - DEFAULT_PADDING.top - DEFAULT_PADDING.bottom;

  const maxNormal = Math.max(data.sigma1KPa * 1.18, 120);
  const maxEnvAtMax = data.cohesionKPa + maxNormal * Math.tan((data.frictionDeg * Math.PI) / 180);
  const reqYMax = Math.max(data.mobRadiusKPa * 1.25, data.limitRadiusKPa * 1.15, maxEnvAtMax * 1.05, 50);

  // Isotropic upper-half-plane Mohr semicircle scaling so circle looks truly circular
  const spanX = Math.max(maxNormal, (reqYMax * plotW) / plotH);
  const spanY = (spanX * plotH) / plotW;

  const mapper = createLinearMapper(
    { xMin: 0, xMax: spanX, yMin: 0, yMax: spanY },
    width,
    height,
    DEFAULT_PADDING,
  );

  const cx = mapper.toPxX(data.sigmaCenterKPa);
  const cy = mapper.toPxY(0);
  const rMobPx = Math.abs(mapper.toPxX(data.sigmaCenterKPa + data.mobRadiusKPa) - cx);
  const rLimPx = Math.abs(mapper.toPxX(data.sigmaCenterKPa + data.limitRadiusKPa) - cx);

  const envY0 = data.cohesionKPa;
  const envYEnd = data.cohesionKPa + spanX * Math.tan((data.frictionDeg * Math.PI) / 180);

  return (
    <SvgChartFrame
      title="Mohr–Coulomb Shear Strength Failure Envelope"
      xLabel="Effective Normal Stress σ (kPa, Compression +)"
      yLabel="Shear Stress τ (kPa)"
      mapper={mapper}
      showZeroAxes={false}
      probeFormatter={(x, y) => `σ = ${x.toFixed(1)} kPa · τ = ${y.toFixed(1)} kPa`}
      tooltipDetails={(sigma) => {
        const phiRad = (data.frictionDeg * Math.PI) / 180;
        const tauEnv = data.cohesionKPa + Math.max(0, sigma) * Math.tan(phiRad);
        const dx = sigma - data.sigmaCenterKPa;
        const r2 = data.mobRadiusKPa * data.mobRadiusKPa;
        const tauCircle = r2 >= dx * dx ? Math.sqrt(r2 - dx * dx) : null;
        return [
          { label: 'Envelope τ_f(σ)', value: `${tauEnv.toFixed(1)} kPa` },
          {
            label: 'Circle τ(σ)',
            value: tauCircle !== null ? `${tauCircle.toFixed(1)} kPa` : 'Outside Circle',
          },
          { label: 'Safety Factor FS', value: data.factorOfSafety.toFixed(2) },
          { label: 'Failure Plane θ_f', value: `${data.failureAngleDeg.toFixed(1)}°` },
        ];
      }}
      legend={
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-rose-600 inline-block" />
            Failure Envelope (τ = c + σ tan φ)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 inline-block" />
            Mobilized Stress Circle
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-emerald-600 inline-block" />
            Limiting Failure Circle (FS = 1.0)
          </span>
        </>
      }
    >
      {/* Failure region above envelope */}
      <polygon
        points={`${mapper.toPxX(0)},${mapper.toPxY(envY0)} ${mapper.toPxX(spanX)},${mapper.toPxY(envYEnd)} ${mapper.toPxX(spanX)},${mapper.padding.top} ${mapper.toPxX(0)},${mapper.padding.top}`}
        className="fill-rose-500/8"
      />

      {/* Limiting tangent circle */}
      {rLimPx > 1 && (
        <path
          d={`M ${cx - rLimPx} ${cy} A ${rLimPx} ${rLimPx} 0 0 1 ${cx + rLimPx} ${cy}`}
          fill="none"
          className="stroke-emerald-600/70"
          strokeDasharray="5 4"
          strokeWidth={1.5}
        />
      )}

      {/* Mobilized Mohr Semicircle */}
      {rMobPx > 0.5 && (
        <path
          d={`M ${cx - rMobPx} ${cy} A ${rMobPx} ${rMobPx} 0 0 1 ${cx + rMobPx} ${cy}`}
          className={
            data.factorOfSafety < 1
              ? 'fill-rose-600/15 stroke-rose-600'
              : 'fill-blue-600/12 stroke-blue-600 dark:stroke-blue-400'
          }
          strokeWidth={2.25}
        />
      )}

      {/* Failure Envelope Line */}
      <line
        x1={mapper.toPxX(0)}
        y1={mapper.toPxY(envY0)}
        x2={mapper.toPxX(spanX)}
        y2={mapper.toPxY(envYEnd)}
        className="stroke-rose-600 dark:stroke-rose-400"
        strokeWidth={2.25}
      />

      {/* Critical Plane Radius Vector (2*theta_f) */}
      <line
        x1={cx}
        y1={cy}
        x2={mapper.toPxX(data.normalStressKPa)}
        y2={mapper.toPxY(data.appliedShearKPa)}
        className="stroke-amber-500"
        strokeDasharray="3 3"
        strokeWidth={1.5}
      />
      <circle
        cx={mapper.toPxX(data.normalStressKPa)}
        cy={mapper.toPxY(data.appliedShearKPa)}
        r={4.5}
        className="fill-amber-500 stroke-white dark:stroke-slate-900"
        strokeWidth={1.5}
      />
      <text
        x={mapper.toPxX(data.normalStressKPa) - 6}
        y={mapper.toPxY(data.appliedShearKPa) - 9}
        textAnchor="end"
        className="fill-amber-700 dark:fill-amber-300 font-mono text-[10px] font-semibold"
      >
        θ_f={data.failureAngleDeg.toFixed(1)}°
      </text>

      {/* Sigma 3 and Sigma 1 markers */}
      <circle cx={mapper.toPxX(data.sigma3KPa)} cy={cy} r={3.5} className="fill-blue-600" />
      <text x={mapper.toPxX(data.sigma3KPa)} y={cy - 8} textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 font-mono text-[10px]">
        σ₃={data.sigma3KPa}
      </text>
      <circle cx={mapper.toPxX(data.sigma1KPa)} cy={cy} r={3.5} className="fill-blue-600" />
      <text x={mapper.toPxX(data.sigma1KPa)} y={cy - 8} textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 font-mono text-[10px]">
        σ₁={data.sigma1KPa}
      </text>
    </SvgChartFrame>
  );
}
