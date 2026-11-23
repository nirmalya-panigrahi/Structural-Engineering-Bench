import { PmInteractionGraphData } from '../../../engine/pmInteraction';
import { createLinearMapper, DEFAULT_PADDING, SvgChartFrame } from '../SvgChartFrame';

interface PmInteractionPlotProps {
  data: PmInteractionGraphData;
}

export function PmInteractionPlot({ data }: PmInteractionPlotProps) {
  const maxM = Math.max(
    ...data.nominalEnvelope.map((p) => p.momentKNm),
    data.demandMomentKNm,
    50,
  ) * 1.15;
  const minP = Math.min(...data.nominalEnvelope.map((p) => p.axialKN), data.demandAxialKN, 0) * 1.15;
  const maxP = Math.max(...data.nominalEnvelope.map((p) => p.axialKN), data.demandAxialKN, 100) * 1.1;

  const mapper = createLinearMapper(
    { xMin: 0, xMax: maxM, yMin: minP, yMax: maxP },
    680,
    410,
    DEFAULT_PADDING,
  );

  const nomPath = data.nominalEnvelope
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${mapper.toPxX(pt.momentKNm).toFixed(2)} ${mapper.toPxY(pt.axialKN).toFixed(2)}`)
    .join(' ');

  const factPath = data.factoredEnvelope
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${mapper.toPxX(pt.momentKNm).toFixed(2)} ${mapper.toPxY(pt.axialKN).toFixed(2)}`)
    .join(' ');

  const factPoly =
    data.factoredEnvelope
      .map((pt) => `${mapper.toPxX(pt.momentKNm).toFixed(1)},${mapper.toPxY(pt.axialKN).toFixed(1)}`)
      .join(' ');

  return (
    <SvgChartFrame
      title={`ACI 318 Column P–M Interaction Diagram (${data.widthMm}×${data.depthMm} mm)`}
      xLabel="Bending Moment Capacity / Demand M (kN·m)"
      yLabel="Axial Load Capacity / Demand P (kN, Compression +)"
      mapper={mapper}
      probeFormatter={(x, y) => `M = ${x.toFixed(1)} kN·m · P = ${y.toFixed(0)} kN`}
      tooltipDetails={(m, p) => {
        let maxT = 0;
        const norm = Math.hypot(m, p);
        if (norm > 1e-6) {
          for (let i = 1; i < data.factoredEnvelope.length; i++) {
            const p1 = data.factoredEnvelope[i - 1];
            const p2 = data.factoredEnvelope[i];
            const dx = p2.momentKNm - p1.momentKNm;
            const dy = p2.axialKN - p1.axialKN;
            const det = m * -dy - p * -dx;
            if (Math.abs(det) < 1e-9) continue;
            const s = (p1.momentKNm * -dy - p1.axialKN * -dx) / det;
            const u = (m * p1.axialKN - p * p1.momentKNm) / det;
            if (s > 0 && u >= -1e-4 && u <= 1.0001) {
              maxT = Math.max(maxT, s);
            }
          }
        }
        const cursorDc = maxT > 1e-9 ? `${((1 / maxT) * 100).toFixed(1)}%` : '—';
        const zone =
          p >= data.balancedFactored.axialKN
            ? 'Compression-Controlled'
            : p >= 0
              ? 'Transition / Tension'
              : 'Net Axial Tension';
        return [
          { label: 'Cursor Zone', value: zone },
          { label: 'Cursor D/C', value: cursorDc },
          {
            label: 'Balanced (φM_b, φP_b)',
            value: `${data.balancedFactored.momentKNm.toFixed(0)}, ${data.balancedFactored.axialKN.toFixed(0)}`,
          },
          {
            label: 'Design D/C',
            value: `${(data.utilizationRatio * 100).toFixed(1)}% (${data.isSafe ? 'Safe' : 'Overload'})`,
          },
        ];
      }}
      legend={
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-slate-500 inline-block" />
            Nominal Strength (M_n, P_n)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 inline-block" />
            ACI Factored Design (φM_n, φP_n)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            Balanced Point
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${data.isSafe ? 'bg-emerald-600' : 'bg-rose-600'}`} />
            Factored Load (M_u, P_u)
          </span>
        </>
      }
    >
      {/* Safe Factored Envelope Fill */}
      <polygon points={factPoly} className="fill-blue-600/10" />

      {/* Nominal Envelope */}
      <path
        d={nomPath}
        fill="none"
        className="stroke-slate-400 dark:stroke-slate-500"
        strokeDasharray="5 4"
        strokeWidth={1.5}
      />

      {/* Factored Design Envelope */}
      <path d={factPath} fill="none" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth={2.5} />

      {/* Balanced Failure Point */}
      <circle
        cx={mapper.toPxX(data.balancedFactored.momentKNm)}
        cy={mapper.toPxY(data.balancedFactored.axialKN)}
        r={4.5}
        className="fill-amber-500 stroke-white dark:stroke-slate-900"
        strokeWidth={1.5}
      />
      <text
        x={mapper.toPxX(data.balancedFactored.momentKNm) + 8}
        y={mapper.toPxY(data.balancedFactored.axialKN)}
        className="fill-amber-700 dark:fill-amber-300 font-mono text-[10px] font-semibold"
      >
        Balanced
      </text>

      {/* Demand Load Vector */}
      <line
        x1={mapper.toPxX(0)}
        y1={mapper.toPxY(0)}
        x2={mapper.toPxX(data.demandMomentKNm)}
        y2={mapper.toPxY(data.demandAxialKN)}
        className={data.isSafe ? 'stroke-emerald-600/60' : 'stroke-rose-600/70'}
        strokeDasharray="3 3"
        strokeWidth={1.5}
      />

      {/* Factored Demand Point */}
      <circle
        cx={mapper.toPxX(data.demandMomentKNm)}
        cy={mapper.toPxY(data.demandAxialKN)}
        r={5.5}
        className={
          data.isSafe
            ? 'fill-emerald-600 stroke-white dark:stroke-slate-900'
            : 'fill-rose-600 stroke-white dark:stroke-slate-900'
        }
        strokeWidth={1.75}
      />
      <text
        x={mapper.toPxX(data.demandMomentKNm) + 9}
        y={mapper.toPxY(data.demandAxialKN) - 8}
        className="fill-slate-800 dark:fill-slate-100 font-mono text-[10px] font-semibold"
      >
        ({data.demandMomentKNm}, {data.demandAxialKN})
      </text>
    </SvgChartFrame>
  );
}
