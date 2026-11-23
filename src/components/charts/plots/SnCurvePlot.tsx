import { SnCurveGraphData } from '../../../engine/snCurve';
import { createLinearMapper, DEFAULT_PADDING, SvgChartFrame } from '../SvgChartFrame';

interface SnCurvePlotProps {
  data: SnCurveGraphData;
}

export function SnCurvePlot({ data }: SnCurvePlotProps) {
  // Log-Log coordinate space: x = log10(N) in [3, 9], y = log10(S)
  const logYMin = Math.log10(Math.max(40, data.seMPa * 0.45));
  const logYMax = Math.log10(Math.max(data.material.sutMPa * 1.15, data.appliedStressMPa * 1.15));

  const mapper = createLinearMapper(
    { xMin: 3, xMax: 9, yMin: logYMin, yMax: logYMax },
    680,
    400,
    DEFAULT_PADDING,
  );

  const xTicks = [3, 4, 5, 6, 7, 8, 9];
  const yTickCandidates = [50, 100, 150, 200, 300, 500, 750, 1000, 1500];
  const yTicks = yTickCandidates
    .map((v) => Math.log10(v))
    .filter((lv) => lv >= logYMin && lv <= logYMax);

  const toPath = (pts: { cycles: number; stressMPa: number }[]) =>
    pts
      .map(
        (pt, i) =>
          `${i === 0 ? 'M' : 'L'} ${mapper.toPxX(Math.log10(pt.cycles)).toFixed(2)} ${mapper.toPxY(Math.log10(pt.stressMPa)).toFixed(2)}`,
      )
      .join(' ');

  const opLogX = data.infiniteLife
    ? 7.5
    : data.cyclesToFailure
      ? Math.min(9, Math.max(3, Math.log10(data.cyclesToFailure)))
      : 3;
  const opLogY = Math.log10(Math.max(10, data.appliedStressMPa));

  return (
    <SvgChartFrame
      title={`Wöhler S–N Curve (${data.material.label})`}
      xLabel="Cycles to Failure N (Log₁₀ Scale)"
      yLabel="Cyclic Stress Amplitude σ_a (MPa, Log Scale)"
      mapper={mapper}
      xTicks={xTicks}
      yTicks={yTicks}
      formatX={(v) => `10^${Math.round(v)}`}
      formatY={(lv) => `${Math.round(Math.pow(10, lv))}`}
      showZeroAxes={false}
      probeFormatter={(lx, ly) =>
        `N = ${Math.pow(10, lx).toExponential(1)} cycles · σ = ${Math.pow(10, ly).toFixed(0)} MPa`
      }
      tooltipDetails={(lx) => {
        const cycles = Math.pow(10, lx);
        const interpCurve = (pts: { cycles: number; stressMPa: number }[]) => {
          for (let i = 1; i < pts.length; i++) {
            const p0 = pts[i - 1];
            const p1 = pts[i];
            if (cycles >= p0.cycles && cycles <= p1.cycles) {
              const t =
                (Math.log10(cycles) - Math.log10(p0.cycles)) /
                (Math.log10(p1.cycles) - Math.log10(p0.cycles));
              const logS =
                Math.log10(p0.stressMPa) +
                t * (Math.log10(p1.stressMPa) - Math.log10(p0.stressMPa));
              return Math.pow(10, logS);
            }
          }
          return pts[pts.length - 1].stressMPa;
        };
        return [
          { label: 'Modified S(N)', value: `${interpCurve(data.modifiedCurve).toFixed(1)} MPa` },
          { label: "Unmodified S'(N)", value: `${interpCurve(data.unmodifiedCurve).toFixed(1)} MPa` },
          { label: 'Endurance S_e', value: `${data.seMPa.toFixed(1)} MPa` },
          {
            label: 'Applied σ_a',
            value: `${data.appliedStressMPa.toFixed(1)} MPa`,
          },
        ];
      }}
      legend={
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 inline-block" />
            Modified S–N (k_a = {data.ka.toFixed(2)})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-slate-400 inline-block" />
            Unmodified Ideal Specimen (S_e′)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            Operating Point
          </span>
        </>
      }
    >
      {/* Unmodified curve */}
      <path
        d={toPath(data.unmodifiedCurve)}
        fill="none"
        className="stroke-slate-400 dark:stroke-slate-500"
        strokeDasharray="5 4"
        strokeWidth={1.5}
      />

      {/* Modified S-N curve */}
      <path d={toPath(data.modifiedCurve)} fill="none" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth={2.5} />

      {/* Endurance limit horizontal reference */}
      <line
        x1={mapper.padding.left}
        y1={mapper.toPxY(Math.log10(data.seMPa))}
        x2={mapper.width - mapper.padding.right}
        y2={mapper.toPxY(Math.log10(data.seMPa))}
        className="stroke-emerald-600/50"
        strokeDasharray="3 3"
        strokeWidth={1.25}
      />
      <text
        x={mapper.width - mapper.padding.right - 6}
        y={mapper.toPxY(Math.log10(data.seMPa)) - 6}
        textAnchor="end"
        className="fill-emerald-700 dark:fill-emerald-400 font-mono text-[10px] font-semibold"
      >
        S_e = {data.seMPa.toFixed(1)} MPa
      </text>

      {/* Operating Point */}
      <circle
        cx={mapper.toPxX(opLogX)}
        cy={mapper.toPxY(opLogY)}
        r={5.5}
        className={
          data.infiniteLife
            ? 'fill-emerald-600 stroke-white dark:stroke-slate-900'
            : 'fill-amber-500 stroke-white dark:stroke-slate-900'
        }
        strokeWidth={1.75}
      />
      <text
        x={Math.min(mapper.toPxX(opLogX) + 10, mapper.width - mapper.padding.right - 110)}
        y={Math.max(mapper.toPxY(opLogY) - 10, mapper.padding.top + 14)}
        className="fill-slate-800 dark:fill-slate-100 font-mono text-[10px] font-semibold"
      >
        {data.infiniteLife
          ? `Infinite Life (${data.appliedStressMPa} MPa)`
          : `N_f ≈ ${data.cyclesToFailure?.toExponential(2)}`}
      </text>
    </SvgChartFrame>
  );
}
