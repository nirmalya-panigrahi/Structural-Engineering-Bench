import { GoodmanGraphData } from '../../../engine/goodman';
import { createLinearMapper, DEFAULT_PADDING, SvgChartFrame } from '../SvgChartFrame';

interface GoodmanPlotProps {
  data: GoodmanGraphData;
}

export function GoodmanPlot({ data }: GoodmanPlotProps) {
  const xMin = Math.min(-data.sy * 0.45, data.sigmaM * 1.2, -50);
  const xMax = Math.max(data.sut * 1.08, data.sigmaM * 1.15);
  const yMax = Math.max(data.sy * 1.08, data.se * 1.25, data.sigmaA * 1.18);

  const mapper = createLinearMapper(
    { xMin, xMax, yMin: 0, yMax },
    680,
    400,
    DEFAULT_PADDING,
  );

  // Safe envelope polygon (Modified Goodman intersected with Langer yield line)
  // Intersection of Goodman (a/Se + m/Sut = 1) and Langer (a + m = Sy)
  const denom = 1 / data.se - 1 / data.sut;
  const mInt = Math.abs(denom) > 1e-6 ? (1 - data.sy / data.se) / (-1 / data.se + 1 / data.sut) : data.sy;
  const aInt = data.sy - mInt;
  const hasInteriorIntersection = mInt > 0 && mInt < data.sy && aInt > 0 && aInt < data.se;

  const safePolyPoints: Array<[number, number]> = [
    [-data.sy, 0],
    [-(data.sy - data.se), data.se],
    [0, data.se],
  ];
  if (hasInteriorIntersection) {
    safePolyPoints.push([mInt, aInt]);
    safePolyPoints.push([data.sy, 0]);
  } else {
    safePolyPoints.push([Math.min(data.sut, data.sy), 0]);
  }
  const safePolyStr = safePolyPoints
    .map(([m, a]) => `${mapper.toPxX(m).toFixed(1)},${mapper.toPxY(a).toFixed(1)}`)
    .join(' ');

  // Gerber parabola points from 0 to Sut
  const gerberPts: string[] = [];
  for (let i = 0; i <= 32; i++) {
    const m = (data.sut * i) / 32;
    const a = data.se * (1 - Math.pow(m / data.sut, 2));
    gerberPts.push(`${i === 0 ? 'M' : 'L'} ${mapper.toPxX(m).toFixed(1)} ${mapper.toPxY(a).toFixed(1)}`);
  }

  return (
    <SvgChartFrame
      title="Goodman / Haigh Fatigue Safe Operating Envelope"
      xLabel="Mean Stress σ_m (MPa)"
      yLabel="Alternating Stress σ_a (MPa)"
      mapper={mapper}
      probeFormatter={(x, y) => `σ_m = ${x.toFixed(1)} MPa · σ_a = ${y.toFixed(1)} MPa`}
      legend={
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 inline-block" />
            Modified Goodman
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-rose-600 inline-block" />
            Langer Yield Line
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-slate-500 inline-block" />
            Soderberg / Gerber
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            Load Point (n = {Number.isFinite(data.governingFactor) ? data.governingFactor.toFixed(2) : '∞'})
          </span>
        </>
      }
    >
      {/* Safe Envelope Shaded Region */}
      <polygon points={safePolyStr} className="fill-emerald-500/12" />

      {/* Gerber Parabola */}
      <path d={gerberPts.join(' ')} fill="none" className="stroke-slate-400 dark:stroke-slate-500" strokeDasharray="2 3" strokeWidth={1.25} />

      {/* Soderberg Line */}
      <line
        x1={mapper.toPxX(0)}
        y1={mapper.toPxY(data.se)}
        x2={mapper.toPxX(data.sy)}
        y2={mapper.toPxY(0)}
        className="stroke-slate-400 dark:stroke-slate-500"
        strokeDasharray="5 4"
        strokeWidth={1.25}
      />

      {/* Modified Goodman Line */}
      <line
        x1={mapper.toPxX(0)}
        y1={mapper.toPxY(data.se)}
        x2={mapper.toPxX(data.sut)}
        y2={mapper.toPxY(0)}
        className="stroke-blue-600 dark:stroke-blue-400"
        strokeWidth={2.25}
      />

      {/* Compressive flat Goodman continuation */}
      <line
        x1={mapper.toPxX(xMin)}
        y1={mapper.toPxY(data.se)}
        x2={mapper.toPxX(0)}
        y2={mapper.toPxY(data.se)}
        className="stroke-blue-600 dark:stroke-blue-400"
        strokeWidth={2}
      />

      {/* Langer Yield Lines (+ and - mean stress) */}
      <line
        x1={mapper.toPxX(0)}
        y1={mapper.toPxY(data.sy)}
        x2={mapper.toPxX(data.sy)}
        y2={mapper.toPxY(0)}
        className="stroke-rose-600 dark:stroke-rose-400"
        strokeWidth={1.75}
      />
      <line
        x1={mapper.toPxX(0)}
        y1={mapper.toPxY(data.sy)}
        x2={mapper.toPxX(-data.sy)}
        y2={mapper.toPxY(0)}
        className="stroke-rose-600 dark:stroke-rose-400"
        strokeWidth={1.75}
      />

      {/* Load Line from origin through design point */}
      <line
        x1={mapper.toPxX(0)}
        y1={mapper.toPxY(0)}
        x2={mapper.toPxX(data.governingFactor >= 1 ? data.intersectM : data.sigmaM)}
        y2={mapper.toPxY(data.governingFactor >= 1 ? data.intersectA : data.sigmaA)}
        className="stroke-amber-500/80"
        strokeDasharray="4 3"
        strokeWidth={1.5}
      />

      {/* Boundary intercept */}
      {Number.isFinite(data.governingFactor) && (
        <circle
          cx={mapper.toPxX(data.intersectM)}
          cy={mapper.toPxY(data.intersectA)}
          r={3.5}
          className="fill-blue-600"
        />
      )}

      {/* Design Point */}
      <circle
        cx={mapper.toPxX(data.sigmaM)}
        cy={mapper.toPxY(data.sigmaA)}
        r={5.5}
        className={
          data.governingFactor >= 1
            ? 'fill-emerald-600 stroke-white dark:stroke-slate-900'
            : 'fill-rose-600 stroke-white dark:stroke-slate-900'
        }
        strokeWidth={1.75}
      />
      <text
        x={mapper.toPxX(data.sigmaM) + 9}
        y={mapper.toPxY(data.sigmaA) - 8}
        className="fill-slate-800 dark:fill-slate-100 font-mono text-[10px] font-semibold"
      >
        ({data.sigmaM}, {data.sigmaA})
      </text>
    </SvgChartFrame>
  );
}
