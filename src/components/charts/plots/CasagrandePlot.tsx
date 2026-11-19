import { CasagrandeGraphData } from '../../../engine/casagrande';
import { createLinearMapper, DEFAULT_PADDING, SvgChartFrame } from '../SvgChartFrame';

interface CasagrandePlotProps {
  data: CasagrandeGraphData;
}

export function CasagrandePlot({ data }: CasagrandePlotProps) {
  const maxLL = Math.max(100, Math.ceil(data.liquidLimit / 20) * 20);
  const maxPI = Math.max(60, Math.ceil((Math.max(data.plasticityIndex, 0.9 * (maxLL - 8)) * 1.1) / 10) * 10);

  const mapper = createLinearMapper(
    { xMin: 0, xMax: maxLL, yMin: 0, yMax: maxPI },
    680,
    400,
    DEFAULT_PADDING,
  );

  // A-line starts at (20, 0) -> (maxLL, 0.73*(maxLL-20))
  const aEndPI = 0.73 * (maxLL - 20);
  // U-line starts at (8, 0) -> (maxLL, 0.9*(maxLL-8))
  const uEndPI = 0.9 * (maxLL - 8);

  return (
    <SvgChartFrame
      title="Casagrande Plasticity Chart (ASTM D2487 USCS)"
      xLabel="Liquid Limit LL (%)"
      yLabel="Plasticity Index PI = LL − PL (%)"
      mapper={mapper}
      showZeroAxes={false}
      probeFormatter={(x, y) => `LL = ${x.toFixed(1)}% · PI = ${y.toFixed(1)}%`}
      legend={
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 inline-block" />
            A-Line: PI = 0.73(LL − 20)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-rose-600 inline-block" />
            U-Line: PI = 0.90(LL − 8)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            Soil Sample ({data.uscsSymbol})
          </span>
        </>
      }
    >
      {/* CL-ML hatched transitional zone (4 <= PI <= 7, above A-line, LL < 50) */}
      <polygon
        points={`${mapper.toPxX(12.44)},${mapper.toPxY(4)} ${mapper.toPxX(25.48)},${mapper.toPxY(4)} ${mapper.toPxX(29.59)},${mapper.toPxY(7)} ${mapper.toPxX(15.78)},${mapper.toPxY(7)}`}
        className="fill-amber-500/18 stroke-amber-500/60"
        strokeWidth={1}
      />

      {/* LL = 50 vertical boundary */}
      <line
        x1={mapper.toPxX(50)}
        y1={mapper.padding.top}
        x2={mapper.toPxX(50)}
        y2={mapper.height - mapper.padding.bottom}
        className="stroke-slate-400 dark:stroke-slate-500"
        strokeWidth={1.5}
      />

      {/* Horizontal PI=4 and PI=7 helper lines up to A-line */}
      <line x1={mapper.toPxX(8 + 4 / 0.9)} y1={mapper.toPxY(4)} x2={mapper.toPxX(25.48)} y2={mapper.toPxY(4)} className="stroke-slate-400/60" strokeDasharray="3 3" />
      <line x1={mapper.toPxX(8 + 7 / 0.9)} y1={mapper.toPxY(7)} x2={mapper.toPxX(29.59)} y2={mapper.toPxY(7)} className="stroke-slate-400/60" strokeDasharray="3 3" />

      {/* A-Line */}
      <line
        x1={mapper.toPxX(20)}
        y1={mapper.toPxY(0)}
        x2={mapper.toPxX(maxLL)}
        y2={mapper.toPxY(aEndPI)}
        className="stroke-blue-600 dark:stroke-blue-400"
        strokeWidth={2.25}
      />

      {/* U-Line */}
      <line
        x1={mapper.toPxX(8)}
        y1={mapper.toPxY(0)}
        x2={mapper.toPxX(maxLL)}
        y2={mapper.toPxY(uEndPI)}
        className="stroke-rose-600 dark:stroke-rose-400"
        strokeDasharray="5 4"
        strokeWidth={1.75}
      />

      {/* USCS Region Labels */}
      <text x={mapper.toPxX(35)} y={mapper.toPxY(22)} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 font-mono text-xs font-semibold">
        CL
      </text>
      <text x={mapper.toPxX(70)} y={mapper.toPxY(46)} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 font-mono text-xs font-semibold">
        CH
      </text>
      <text x={mapper.toPxX(38)} y={mapper.toPxY(5)} textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 font-mono text-xs font-semibold">
        ML / OL
      </text>
      <text x={mapper.toPxX(72)} y={mapper.toPxY(16)} textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 font-mono text-xs font-semibold">
        MH / OH
      </text>
      <text x={mapper.toPxX(21)} y={mapper.toPxY(5.6)} textAnchor="middle" className="fill-amber-700 dark:fill-amber-400 font-mono text-[9px] font-semibold">
        CL-ML
      </text>

      {/* Soil Sample Point */}
      <circle
        cx={mapper.toPxX(data.liquidLimit)}
        cy={mapper.toPxY(data.plasticityIndex)}
        r={6}
        className={
          data.aboveULine
            ? 'fill-rose-600 stroke-white dark:stroke-slate-900'
            : 'fill-amber-500 stroke-white dark:stroke-slate-900'
        }
        strokeWidth={2}
      />
      <text
        x={mapper.toPxX(data.liquidLimit) + 10}
        y={mapper.toPxY(data.plasticityIndex) - 8}
        className="fill-slate-900 dark:fill-slate-50 font-mono text-[11px] font-semibold"
      >
        {data.uscsSymbol} ({data.liquidLimit}, {data.plasticityIndex})
      </text>
    </SvgChartFrame>
  );
}
