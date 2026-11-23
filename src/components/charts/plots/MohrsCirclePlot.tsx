import { MohrsCircleGraphData } from '../../../engine/mohrsCircle';
import { createLinearMapper, DEFAULT_PADDING, SvgChartFrame } from '../SvgChartFrame';

interface MohrsCirclePlotProps {
  data: MohrsCircleGraphData;
}

export function MohrsCirclePlot({ data }: MohrsCirclePlotProps) {
  const width = 680;
  const height = 420;
  const plotW = width - DEFAULT_PADDING.left - DEFAULT_PADDING.right;
  const plotH = height - DEFAULT_PADDING.top - DEFAULT_PADDING.bottom;

  // Determine isotropic bounds so circles are true circles (1:1 aspect ratio)
  const allS =
    data.mode === '3d'
      ? [data.sigma1, data.sigma2, data.sigma3, 0]
      : [data.sigma1, data.sigma2, 0];
  const minS = Math.min(...allS);
  const maxS = Math.max(...allS);
  const maxTau = Math.max(data.mode === '3d' ? data.tauMax3D : data.tauMax2D, 15);
  const centerS = (minS + maxS) / 2;
  const reqHalfSpanX = Math.max((maxS - minS) / 2, maxTau, 20) * 1.25;
  const reqHalfSpanY = Math.max(maxTau * 1.28, (reqHalfSpanX * plotH) / plotW);
  const halfSpanX = Math.max(reqHalfSpanX, (reqHalfSpanY * plotW) / plotH);
  const halfSpanY = (halfSpanX * plotH) / plotW;

  const mapper = createLinearMapper(
    {
      xMin: centerS - halfSpanX,
      xMax: centerS + halfSpanX,
      yMin: -halfSpanY,
      yMax: halfSpanY,
    },
    width,
    height,
    DEFAULT_PADDING,
  );

  // Remember: invertY = true means positive tau points downward visually (dataY = -tau)
  const pxCenter = mapper.toPxX(data.sigmaAvg);
  const pyZero = mapper.toPxY(0);
  const pxRadius2D = Math.abs(mapper.toPxX(data.sigmaAvg + data.radius2D) - pxCenter);

  // Reference point X = (sigmaX, +tauXY) -> plotted at y = -tauXY
  const pxX = mapper.toPxX(data.sigmaX);
  const pyX = mapper.toPxY(-data.tauXY);
  const pxY = mapper.toPxX(data.sigmaY);
  const pyY = mapper.toPxY(data.tauXY);

  // Transformed point X' = (sigmaXPrime, +tauXYPrime)
  const pxXP = mapper.toPxX(data.sigmaXPrime);
  const pyXP = mapper.toPxY(-data.tauXYPrime);
  const pxYP = mapper.toPxX(data.sigmaYPrime);
  const pyYP = mapper.toPxY(data.tauXYPrime);

  // 3D secondary circles
  const c13 = (data.sigma1 + data.sigma3) / 2;
  const r13 = (data.sigma1 - data.sigma3) / 2;
  const c12 = (data.sigma1 + data.sigma2) / 2;
  const r12 = (data.sigma1 - data.sigma2) / 2;
  const c23 = (data.sigma2 + data.sigma3) / 2;
  const r23 = (data.sigma2 - data.sigma3) / 2;

  return (
    <SvgChartFrame
      title={data.mode === '3d' ? "3D Mohr's Circles (Principal Tri-Circle Space)" : "2D Mohr's Circle (Plane Stress State)"}
      xLabel="Normal Stress σ (MPa)"
      yLabel="Shear Stress τ (MPa, + downward)"
      mapper={mapper}
      invertY
      probeFormatter={(x, y) => `σ = ${x.toFixed(1)} MPa · τ = ${y.toFixed(1)} MPa`}
      tooltipDetails={(sigma) => {
        const dx = sigma - data.sigmaAvg;
        const r2 = data.radius2D * data.radius2D;
        const circleTau = r2 >= dx * dx ? Math.sqrt(r2 - dx * dx) : null;
        return [
          {
            label: '2D Circle ±τ(σ)',
            value: circleTau !== null ? `±${circleTau.toFixed(1)} MPa` : 'Outside Circle',
          },
          {
            label: 'Principals σ₁ / σ₂',
            value: `${data.sigma1.toFixed(1)} / ${data.sigma2.toFixed(1)} MPa`,
          },
          {
            label: data.mode === '3d' ? 'Max Shear (3D)' : 'Max Shear (2D)',
            value: `${(data.mode === '3d' ? data.tauMax3D : data.tauMax2D).toFixed(1)} MPa`,
          },
          {
            label: `Rotated (${data.thetaDeg}°)`,
            value: `${data.sigmaXPrime.toFixed(1)}, ${data.tauXYPrime.toFixed(1)} MPa`,
          },
        ];
      }}
      legend={
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 inline-block" />
            2D In-Plane Circle
          </span>
          {data.mode === '3d' && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-slate-500 inline-block" />
              3D Outer &amp; Inner Circles
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            Rotated Plane (θ = {data.thetaDeg}°)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            Principal Stresses (σ₁, σ₂)
          </span>
        </>
      }
    >
      {/* 3D circles if active */}
      {data.mode === '3d' && (
        <g>
          <circle
            cx={mapper.toPxX(c13)}
            cy={pyZero}
            r={Math.abs(mapper.toPxX(c13 + r13) - mapper.toPxX(c13))}
            className="fill-blue-500/5 stroke-slate-500 dark:stroke-slate-400"
            strokeWidth={1.5}
          />
          <circle
            cx={mapper.toPxX(c12)}
            cy={pyZero}
            r={Math.abs(mapper.toPxX(c12 + r12) - mapper.toPxX(c12))}
            className="fill-white/40 dark:fill-slate-900/40 stroke-slate-400 dark:stroke-slate-500"
            strokeDasharray="4 3"
            strokeWidth={1.25}
          />
          <circle
            cx={mapper.toPxX(c23)}
            cy={pyZero}
            r={Math.abs(mapper.toPxX(c23 + r23) - mapper.toPxX(c23))}
            className="fill-white/40 dark:fill-slate-900/40 stroke-slate-400 dark:stroke-slate-500"
            strokeDasharray="4 3"
            strokeWidth={1.25}
          />
        </g>
      )}

      {/* Main 2D circle */}
      <circle
        cx={pxCenter}
        cy={pyZero}
        r={Math.max(1, pxRadius2D)}
        className="fill-blue-600/8 stroke-blue-600 dark:stroke-blue-400"
        strokeWidth={2}
      />

      {/* Initial X-Y diameter line */}
      <line
        x1={pxX}
        y1={pyX}
        x2={pxY}
        y2={pyY}
        className="stroke-slate-400 dark:stroke-slate-500"
        strokeDasharray="4 3"
        strokeWidth={1.25}
      />

      {/* Rotated X'-Y' diameter line */}
      <line
        x1={pxXP}
        y1={pyXP}
        x2={pxYP}
        y2={pyYP}
        className="stroke-amber-500"
        strokeWidth={1.75}
      />

      {/* Reference points X and Y */}
      <circle cx={pxX} cy={pyX} r={4.5} className="fill-slate-700 dark:fill-slate-200 stroke-white dark:stroke-slate-900" strokeWidth={1.5} />
      <text x={pxX + 8} y={pyX - 6} className="fill-slate-700 dark:fill-slate-200 font-mono text-[10px] font-semibold">
        X ({data.sigmaX.toFixed(0)}, {data.tauXY.toFixed(0)})
      </text>

      <circle cx={pxY} cy={pyY} r={4} className="fill-slate-500 dark:fill-slate-400 stroke-white dark:stroke-slate-900" strokeWidth={1.5} />
      <text x={pxY + 8} y={pyY + 12} className="fill-slate-500 dark:fill-slate-400 font-mono text-[10px]">
        Y
      </text>

      {/* Rotated plane X' */}
      <circle cx={pxXP} cy={pyXP} r={5} className="fill-amber-500 stroke-white dark:stroke-slate-900" strokeWidth={1.5} />
      <text x={pxXP + 8} y={pyXP - 6} className="fill-amber-700 dark:fill-amber-300 font-mono text-[10px] font-semibold">
        X′ ({data.sigmaXPrime.toFixed(1)}, {data.tauXYPrime.toFixed(1)})
      </text>

      {/* Principal Stress points */}
      <circle cx={mapper.toPxX(data.sigma1)} cy={pyZero} r={4.5} className="fill-emerald-600 stroke-white dark:stroke-slate-900" strokeWidth={1.5} />
      <text
        x={mapper.toPxX(data.sigma1) + 7}
        y={pyZero - 8}
        className="fill-emerald-700 dark:fill-emerald-400 font-mono text-[10px] font-semibold"
      >
        σ₁={data.sigma1.toFixed(1)}
      </text>

      <circle cx={mapper.toPxX(data.sigma2)} cy={pyZero} r={4.5} className="fill-emerald-600 stroke-white dark:stroke-slate-900" strokeWidth={1.5} />
      <text
        x={mapper.toPxX(data.sigma2) - 8}
        y={pyZero - 8}
        textAnchor="end"
        className="fill-emerald-700 dark:fill-emerald-400 font-mono text-[10px] font-semibold"
      >
        σ₂={data.sigma2.toFixed(1)}
      </text>

      {data.mode === '3d' && (
        <>
          <circle cx={mapper.toPxX(data.sigma3)} cy={pyZero} r={4.5} className="fill-emerald-600 stroke-white dark:stroke-slate-900" strokeWidth={1.5} />
          <text
            x={mapper.toPxX(data.sigma3)}
            y={pyZero + 16}
            textAnchor="middle"
            className="fill-emerald-700 dark:fill-emerald-400 font-mono text-[10px] font-semibold"
          >
            σ₃={data.sigma3.toFixed(1)}
          </text>
        </>
      )}

      {/* Center marker */}
      <circle cx={pxCenter} cy={pyZero} r={3} className="fill-blue-600" />
    </SvgChartFrame>
  );
}
