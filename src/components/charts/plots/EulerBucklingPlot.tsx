import { EulerBucklingGraphData } from '../../../engine/eulerBuckling';
import { createLinearMapper, DEFAULT_PADDING, SvgChartFrame } from '../SvgChartFrame';

interface EulerBucklingPlotProps {
  data: EulerBucklingGraphData;
}

export function EulerBucklingPlot({ data }: EulerBucklingPlotProps) {
  const maxX = data.curve[data.curve.length - 1]?.slenderness ?? 220;
  const maxY = data.yieldMPa * 1.15;

  const mapper = createLinearMapper(
    { xMin: 0, xMax: maxX, yMin: 0, yMax: maxY },
    680,
    400,
    DEFAULT_PADDING,
  );

  const criticalPath = data.curve
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${mapper.toPxX(pt.slenderness).toFixed(2)} ${mapper.toPxY(Math.min(maxY * 1.2, pt.criticalStressMPa)).toFixed(2)}`)
    .join(' ');

  // Dashed Euler continuation below C_c
  const eulerRefPath = data.curve
    .filter((pt) => pt.slenderness <= data.transitionCc && pt.eulerStressMPa <= maxY * 1.1)
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${mapper.toPxX(pt.slenderness).toFixed(2)} ${mapper.toPxY(pt.eulerStressMPa).toFixed(2)}`)
    .join(' ');

  const pxCc = mapper.toPxX(data.transitionCc);
  const pxOp = mapper.toPxX(data.slenderness);
  const pyOp = mapper.toPxY(data.criticalStressMPa);

  return (
    <SvgChartFrame
      title="Euler–Johnson Column Buckling Curve"
      xLabel="Effective Slenderness Ratio (KL / r)"
      yLabel="Critical Buckling Stress σ_cr (MPa)"
      mapper={mapper}
      probeFormatter={(x, y) => `KL/r = ${x.toFixed(1)} · σ = ${y.toFixed(1)} MPa`}
      legend={
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 inline-block" />
            Governing Buckling Curve (Johnson → Euler)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-slate-400 inline-block" />
            Theoretical Euler Hyperbola
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            Design Column ({data.regime})
          </span>
        </>
      }
    >
      {/* Transition vertical boundary */}
      <line
        x1={pxCc}
        y1={mapper.padding.top}
        x2={pxCc}
        y2={mapper.height - mapper.padding.bottom}
        className="stroke-emerald-600/50"
        strokeDasharray="4 4"
        strokeWidth={1.5}
      />
      <text
        x={pxCc + 6}
        y={mapper.padding.top + 16}
        className="fill-emerald-700 dark:fill-emerald-400 font-mono text-[10px] font-semibold"
      >
        C_c = {data.transitionCc.toFixed(1)}
      </text>

      {/* Yield stress cap reference */}
      <line
        x1={mapper.padding.left}
        y1={mapper.toPxY(data.yieldMPa)}
        x2={mapper.width - mapper.padding.right}
        y2={mapper.toPxY(data.yieldMPa)}
        className="stroke-slate-300 dark:stroke-slate-700"
        strokeDasharray="3 3"
      />
      <text
        x={mapper.width - mapper.padding.right - 6}
        y={mapper.toPxY(data.yieldMPa) - 5}
        textAnchor="end"
        className="fill-slate-500 font-mono text-[10px]"
      >
        σ_y = {data.yieldMPa} MPa
      </text>

      {/* Theoretical Euler hyperbola extension */}
      {eulerRefPath && (
        <path
          d={eulerRefPath}
          fill="none"
          className="stroke-slate-400 dark:stroke-slate-500"
          strokeDasharray="4 3"
          strokeWidth={1.25}
        />
      )}

      {/* Governing Johnson + Euler curve */}
      <path d={criticalPath} fill="none" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth={2.5} />

      {/* Column Operating Point */}
      <circle
        cx={pxOp}
        cy={pyOp}
        r={5.5}
        className="fill-amber-500 stroke-white dark:stroke-slate-900"
        strokeWidth={1.75}
      />
      <text
        x={Math.min(pxOp + 9, mapper.width - mapper.padding.right - 115)}
        y={Math.max(pyOp - 9, mapper.padding.top + 16)}
        className="fill-slate-800 dark:fill-slate-100 font-mono text-[10px] font-semibold"
      >
        ({data.slenderness.toFixed(1)}, {data.criticalStressMPa.toFixed(1)} MPa)
      </text>
    </SvgChartFrame>
  );
}
