import { ASHBY_FAMILIES, AshbyGraphData } from '../../../engine/ashbyChart';
import { createLinearMapper, DEFAULT_PADDING, SvgChartFrame } from '../SvgChartFrame';

interface AshbyPlotProps {
  data: AshbyGraphData;
}

export function AshbyPlot({ data }: AshbyPlotProps) {
  const logXMin = Math.log10(40);
  const logXMax = Math.log10(12000);
  const logYMin = data.axisPair === 'E_rho' ? Math.log10(0.02) : Math.log10(0.3);
  const logYMax = data.axisPair === 'E_rho' ? Math.log10(600) : Math.log10(2200);

  const mapper = createLinearMapper(
    { xMin: logXMin, xMax: logXMax, yMin: logYMin, yMax: logYMax },
    680,
    410,
    DEFAULT_PADDING,
  );

  const xTicks = [50, 100, 300, 1000, 3000, 10000].map((v) => Math.log10(v));
  const yTicks = (
    data.axisPair === 'E_rho'
      ? [0.05, 0.1, 0.5, 1, 5, 10, 50, 100, 300]
      : [0.5, 1, 5, 10, 50, 100, 500, 1500]
  ).map((v) => Math.log10(v));

  // Performance index iso-line: Y = (M * (rho/1000))^m
  const guideX1 = 50;
  const guideX2 = 10000;
  const guideY1 = Math.pow(data.targetIndex * (guideX1 / 1000), data.slopeM);
  const guideY2 = Math.pow(data.targetIndex * (guideX2 / 1000), data.slopeM);

  const passMap = new Map(data.candidates.map((c) => [c.id, c]));

  return (
    <SvgChartFrame
      title={`Ashby Selection Chart: ${data.yLabel} vs. Density (Slope m = ${data.slopeM})`}
      xLabel="Density ρ (kg/m³, Log Scale)"
      yLabel={`${data.yLabel} (${data.yUnit}, Log Scale)`}
      mapper={mapper}
      xTicks={xTicks}
      yTicks={yTicks}
      formatX={(lv) => `${Math.round(Math.pow(10, lv))}`}
      formatY={(lv) => {
        const val = Math.pow(10, lv);
        return val < 1 ? val.toFixed(2) : `${Math.round(val)}`;
      }}
      showZeroAxes={false}
      probeFormatter={(lx, ly) =>
        `ρ = ${Math.round(Math.pow(10, lx))} kg/m³ · Y = ${Math.pow(10, ly).toFixed(2)} ${data.yUnit}`
      }
      tooltipDetails={(lx, ly) => {
        const rho = Math.pow(10, lx);
        const yVal = Math.pow(10, ly);
        const guidelineY = Math.pow(data.targetIndex * (rho / 1000), data.slopeM);
        const cursorIndex = Math.pow(Math.max(1e-6, yVal), 1 / data.slopeM) / (rho / 1000);
        const hoveredFamily = ASHBY_FAMILIES.find((fam) => {
          const fyMin = data.axisPair === 'E_rho' ? fam.eMin : fam.sigmaMin;
          const fyMax = data.axisPair === 'E_rho' ? fam.eMax : fam.sigmaMax;
          return rho >= fam.rhoMin && rho <= fam.rhoMax && yVal >= fyMin && yVal <= fyMax;
        });
        const top = data.candidates[0];
        return [
          {
            label: 'Family Region',
            value: hoveredFamily ? hoveredFamily.name.split('(')[0].trim() : 'Outside Bubbles',
          },
          { label: 'Cursor Index M', value: cursorIndex.toFixed(2) },
          { label: 'Threshold Y_min', value: `${guidelineY.toFixed(2)} ${data.yUnit}` },
          {
            label: 'Top Candidate',
            value: top ? `${top.name.split('(')[0].trim()} (M=${top.indexValue.toFixed(1)})` : '—',
          },
        ];
      }}
      legend={
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 inline-block" />
            Iso-Performance Guideline (M = {data.targetIndex})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            Qualifying Families (Above Line)
          </span>
        </>
      }
    >
      {/* Optimal shaded region above guideline */}
      <polygon
        points={`${mapper.toPxX(Math.log10(guideX1))},${mapper.toPxY(Math.log10(guideY1))} ${mapper.toPxX(Math.log10(guideX2))},${mapper.toPxY(Math.log10(guideY2))} ${mapper.toPxX(Math.log10(guideX2))},${mapper.padding.top} ${mapper.toPxX(Math.log10(guideX1))},${mapper.padding.top}`}
        className="fill-emerald-500/8"
      />

      {/* Material Family Bubbles */}
      {ASHBY_FAMILIES.map((fam) => {
        const yMin = data.axisPair === 'E_rho' ? fam.eMin : fam.sigmaMin;
        const yMax = data.axisPair === 'E_rho' ? fam.eMax : fam.sigmaMax;
        const px1 = mapper.toPxX(Math.log10(fam.rhoMin));
        const px2 = mapper.toPxX(Math.log10(fam.rhoMax));
        const py1 = mapper.toPxY(Math.log10(yMax));
        const py2 = mapper.toPxY(Math.log10(yMin));

        const cx = (px1 + px2) / 2;
        const cy = (py1 + py2) / 2;
        const rx = Math.max(12, (px2 - px1) / 2 + 8);
        const ry = Math.max(10, (py2 - py1) / 2 + 6);
        const cand = passMap.get(fam.id);
        const qualifies = cand?.meetsThreshold ?? false;

        return (
          <g key={fam.id}>
            <ellipse
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              fill={fam.color}
              fillOpacity={qualifies ? 0.24 : 0.08}
              stroke={fam.color}
              strokeWidth={qualifies ? 2 : 1}
              strokeDasharray={qualifies ? undefined : '3 3'}
            />
            <text
              x={cx}
              y={cy - ry - 4}
              textAnchor="middle"
              className="fill-slate-700 dark:fill-slate-200 text-[9.5px] font-medium"
            >
              {fam.name.split('(')[0].trim()}
            </text>
          </g>
        );
      })}

      {/* Iso-Performance Guideline */}
      <line
        x1={mapper.toPxX(Math.log10(guideX1))}
        y1={mapper.toPxY(Math.log10(guideY1))}
        x2={mapper.toPxX(Math.log10(guideX2))}
        y2={mapper.toPxY(Math.log10(guideY2))}
        className="stroke-blue-600 dark:stroke-blue-400"
        strokeWidth={2.25}
      />
    </SvgChartFrame>
  );
}
