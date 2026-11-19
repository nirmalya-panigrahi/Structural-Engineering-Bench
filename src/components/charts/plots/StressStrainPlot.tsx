import { StressStrainGraphData } from '../../../engine/stressStrain';
import { createLinearMapper, DEFAULT_PADDING, SvgChartFrame } from '../SvgChartFrame';

interface StressStrainPlotProps {
  data: StressStrainGraphData;
}

export function StressStrainPlot({ data }: StressStrainPlotProps) {
  const maxStrain = Math.max(data.fractureStrainPct * 1.12, 1.0);
  const maxStress = Math.max(data.utsMPa, data.appliedStressMPa, 100) * 1.16;

  const mapper = createLinearMapper(
    { xMin: 0, xMax: maxStrain, yMin: 0, yMax: maxStress },
    680,
    400,
    DEFAULT_PADDING,
  );

  const curvePath = data.curve
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${mapper.toPxX(pt.strainPct).toFixed(2)} ${mapper.toPxY(pt.stressMPa).toFixed(2)}`)
    .join(' ');

  const areaPath =
    curvePath +
    ` L ${mapper.toPxX(data.curve[data.curve.length - 1].strainPct).toFixed(2)} ${mapper.toPxY(0).toFixed(2)}` +
    ` L ${mapper.toPxX(0).toFixed(2)} ${mapper.toPxY(0).toFixed(2)} Z`;

  const offsetPath = data.offsetLine
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${mapper.toPxX(pt.strainPct).toFixed(2)} ${mapper.toPxY(pt.stressMPa).toFixed(2)}`)
    .join(' ');

  const opX = mapper.toPxX(data.appliedStrainPct);
  const opY = mapper.toPxY(Math.min(data.appliedStressMPa, maxStress * 0.98));

  return (
    <SvgChartFrame
      title={`Engineering Stress–Strain Curve (${data.material.label})`}
      xLabel="Engineering Strain ε (%)"
      yLabel="Engineering Stress σ (MPa)"
      mapper={mapper}
      probeFormatter={(x, y) => `ε = ${x.toFixed(2)}% · σ = ${y.toFixed(1)} MPa`}
      legend={
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 inline-block" />
            Stress–Strain Curve (Shaded Toughness)
          </span>
          {!data.material.brittle && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-slate-500 inline-block" />
              0.2% Offset Line
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            Applied Load State
          </span>
        </>
      }
    >
      {/* Toughness shaded area */}
      <path d={areaPath} className="fill-blue-600/10" />

      {/* 0.2% offset line */}
      {!data.material.brittle && (
        <path
          d={offsetPath}
          fill="none"
          className="stroke-slate-400 dark:stroke-slate-500"
          strokeDasharray="5 4"
          strokeWidth={1.25}
        />
      )}

      {/* Main Stress-Strain curve */}
      <path d={curvePath} fill="none" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth={2.5} />

      {/* Yield & UTS markers */}
      <circle
        cx={mapper.toPxX(data.yieldStrainPct)}
        cy={mapper.toPxY(data.yieldMPa)}
        r={4}
        className="fill-emerald-600 stroke-white dark:stroke-slate-900"
        strokeWidth={1.5}
      />
      <text
        x={mapper.toPxX(data.yieldStrainPct) + 8}
        y={mapper.toPxY(data.yieldMPa) + 12}
        className="fill-emerald-700 dark:fill-emerald-400 font-mono text-[10px] font-semibold"
      >
        σ_y={data.yieldMPa} MPa
      </text>

      <circle
        cx={mapper.toPxX(data.utsStrainPct)}
        cy={mapper.toPxY(data.utsMPa)}
        r={4}
        className="fill-slate-700 dark:fill-slate-200 stroke-white dark:stroke-slate-900"
        strokeWidth={1.5}
      />
      <text
        x={mapper.toPxX(data.utsStrainPct)}
        y={mapper.toPxY(data.utsMPa) - 9}
        textAnchor="middle"
        className="fill-slate-700 dark:fill-slate-200 font-mono text-[10px] font-semibold"
      >
        UTS={data.utsMPa} MPa
      </text>

      {/* Operating stress line and point */}
      <line
        x1={mapper.padding.left}
        y1={opY}
        x2={opX}
        y2={opY}
        className="stroke-amber-500/70"
        strokeDasharray="3 3"
        strokeWidth={1.25}
      />
      <circle
        cx={opX}
        cy={opY}
        r={5.5}
        className={
          data.appliedStressMPa > data.utsMPa
            ? 'fill-rose-600 stroke-white dark:stroke-slate-900'
            : 'fill-amber-500 stroke-white dark:stroke-slate-900'
        }
        strokeWidth={1.75}
      />
      <text
        x={Math.min(opX + 10, mapper.width - mapper.padding.right - 95)}
        y={Math.max(opY - 10, mapper.padding.top + 14)}
        className="fill-amber-700 dark:fill-amber-300 font-mono text-[10px] font-semibold"
      >
        σ={data.appliedStressMPa.toFixed(1)} MPa
      </text>
    </SvgChartFrame>
  );
}
