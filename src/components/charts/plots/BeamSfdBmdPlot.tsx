import React, { useRef, useState } from 'react';
import { BeamGraphData } from '../../../engine/beamSfdBmd';
import { createLinearMapper, formatTick, niceTicks } from '../SvgChartFrame';

interface BeamSfdBmdPlotProps {
  data: BeamGraphData;
}

export function BeamSfdBmdPlot({ data }: BeamSfdBmdPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const width = 680;
  const height = 470;
  const padL = 62;
  const padR = 26;

  // Vertical bands:
  // Band 1: Beam Schematic (y: 16..84)
  // Band 2: Shear Force V(x) (y: 108..262)
  // Band 3: Bending Moment M(x) (y: 292..442)
  const vMaxRange = Math.max(data.vMaxAbs * 1.25, 10);
  const mAbsMax = Math.max(Math.abs(data.mMaxPos), Math.abs(data.mMinNeg), 10) * 1.22;

  const sfdMapper = createLinearMapper(
    { xMin: 0, xMax: data.lengthM, yMin: -vMaxRange, yMax: vMaxRange },
    width,
    470,
    { top: 108, right: padR, bottom: 208, left: padL },
  );

  const bmdMapper = createLinearMapper(
    { xMin: 0, xMax: data.lengthM, yMin: -mAbsMax, yMax: mAbsMax },
    width,
    470,
    { top: 294, right: padR, bottom: 28, left: padL },
  );

  const xTicks = niceTicks(0, data.lengthM, 6);
  const vTicks = niceTicks(-vMaxRange, vMaxRange, 4);
  const mTicks = niceTicks(-mAbsMax, mAbsMax, 4);

  const sfdLine = data.samples
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${sfdMapper.toPxX(pt.x).toFixed(2)} ${sfdMapper.toPxY(pt.shear).toFixed(2)}`)
    .join(' ');
  const sfdArea =
    `M ${sfdMapper.toPxX(0).toFixed(2)} ${sfdMapper.toPxY(0).toFixed(2)} ` +
    data.samples.map((pt) => `L ${sfdMapper.toPxX(pt.x).toFixed(2)} ${sfdMapper.toPxY(pt.shear).toFixed(2)}`).join(' ') +
    ` L ${sfdMapper.toPxX(data.lengthM).toFixed(2)} ${sfdMapper.toPxY(0).toFixed(2)} Z`;

  const bmdLine = data.samples
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${bmdMapper.toPxX(pt.x).toFixed(2)} ${bmdMapper.toPxY(pt.moment).toFixed(2)}`)
    .join(' ');
  const bmdArea =
    `M ${bmdMapper.toPxX(0).toFixed(2)} ${bmdMapper.toPxY(0).toFixed(2)} ` +
    data.samples.map((pt) => `L ${bmdMapper.toPxX(pt.x).toFixed(2)} ${bmdMapper.toPxY(pt.moment).toFixed(2)}`).join(' ') +
    ` L ${bmdMapper.toPxX(data.lengthM).toFixed(2)} ${bmdMapper.toPxY(0).toFixed(2)} Z`;

  // Lookup nearest sample at hoverX
  const nearestSample =
    hoverX !== null
      ? data.samples.reduce((best, curr) =>
          Math.abs(curr.x - hoverX) < Math.abs(best.x - hoverX) ? curr : best,
        )
      : null;

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    if (px < padL || px > width - padR) {
      setHoverX(null);
      return;
    }
    setHoverX(sfdMapper.toDataX(px));
  };

  const beamY = 54;
  const x0 = sfdMapper.toPxX(0);
  const xL = sfdMapper.toPxX(data.lengthM);
  const xLoad = sfdMapper.toPxX(data.pointLoadPosM);

  return (
    <div className="space-y-2.5">
      <div className="relative w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
            Beam Schematic, Shear Force (SFD) &amp; Bending Moment (BMD)
          </span>
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {nearestSample
              ? `x = ${nearestSample.x.toFixed(2)} m · V = ${nearestSample.shear.toFixed(1)} kN · M = ${nearestSample.moment.toFixed(1)} kN·m`
              : 'Hover beam to probe V(x) and M(x)'}
          </span>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Beam Shear Force and Bending Moment Diagrams"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverX(null)}
          className="w-full h-auto block cursor-crosshair select-none"
        >
          {/* Band 1: Beam Schematic */}
          {/* UDL distributed arrows */}
          {Math.abs(data.udlKNm) > 1e-6 && (
            <g>
              <line x1={x0} y1={beamY - 22} x2={xL} y2={beamY - 22} className="stroke-amber-500" strokeWidth={1.5} />
              {Array.from({ length: 9 }).map((_, idx) => {
                const ax = x0 + ((xL - x0) * idx) / 8;
                return (
                  <line
                    key={idx}
                    x1={ax}
                    y1={beamY - 22}
                    x2={ax}
                    y2={beamY - 6}
                    className="stroke-amber-500"
                    strokeWidth={1.25}
                  />
                );
              })}
              <text x={(x0 + xL) / 2} y={beamY - 27} textAnchor="middle" className="fill-amber-700 dark:fill-amber-400 font-mono text-[10px]">
                w = {data.udlKNm} kN/m
              </text>
            </g>
          )}

          {/* Point Load arrow */}
          {Math.abs(data.pointLoadKN) > 1e-6 && (
            <g>
              <line x1={xLoad} y1={beamY - 36} x2={xLoad} y2={beamY - 5} className="stroke-rose-600" strokeWidth={2.25} />
              <polygon
                points={`${xLoad},${beamY - 4} ${xLoad - 4},${beamY - 12} ${xLoad + 4},${beamY - 12}`}
                className="fill-rose-600"
              />
              <text x={xLoad + 7} y={beamY - 24} className="fill-rose-700 dark:fill-rose-400 font-mono text-[10px] font-semibold">
                P = {data.pointLoadKN} kN
              </text>
            </g>
          )}

          {/* Beam body */}
          <line x1={x0} y1={beamY} x2={xL} y2={beamY} className="stroke-slate-800 dark:stroke-slate-200" strokeWidth={5} strokeLinecap="butt" />

          {/* Supports */}
          {data.supportType === 'simply_supported' ? (
            <polygon
              points={`${x0},${beamY + 3} ${x0 - 7},${beamY + 15} ${x0 + 7},${beamY + 15}`}
              className="fill-slate-600 dark:fill-slate-300"
            />
          ) : (
            <rect x={x0 - 6} y={beamY - 14} width={6} height={28} className="fill-slate-700 dark:fill-slate-300" />
          )}

          {data.supportType !== 'cantilever' && (
            <circle cx={xL} cy={beamY + 9} r={6} className="fill-none stroke-slate-600 dark:stroke-slate-300" strokeWidth={2} />
          )}

          {/* Band 2: Shear Force Diagram */}
          <text x={padL} y={100} className="fill-slate-700 dark:fill-slate-200 text-[11px] font-semibold">
            Shear Force V(x) [kN]
          </text>
          {vTicks.map((t) => (
            <g key={`vt-${t}`}>
              <line x1={padL} y1={sfdMapper.toPxY(t)} x2={width - padR} y2={sfdMapper.toPxY(t)} className="stroke-slate-100 dark:stroke-slate-800" />
              <text x={padL - 8} y={sfdMapper.toPxY(t) + 3} textAnchor="end" className="fill-slate-500 font-mono text-[10px]">
                {formatTick(t)}
              </text>
            </g>
          ))}
          <line x1={padL} y1={sfdMapper.toPxY(0)} x2={width - padR} y2={sfdMapper.toPxY(0)} className="stroke-slate-300 dark:stroke-slate-600" />
          <rect x={padL} y={108} width={width - padL - padR} height={154} fill="none" className="stroke-slate-200 dark:stroke-slate-700" />
          <path d={sfdArea} className="fill-blue-600/15" />
          <path d={sfdLine} fill="none" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth={2} />

          {/* Band 3: Bending Moment Diagram */}
          <text x={padL} y={286} className="fill-slate-700 dark:fill-slate-200 text-[11px] font-semibold">
            Bending Moment M(x) [kN·m]
          </text>
          {mTicks.map((t) => (
            <g key={`mt-${t}`}>
              <line x1={padL} y1={bmdMapper.toPxY(t)} x2={width - padR} y2={bmdMapper.toPxY(t)} className="stroke-slate-100 dark:stroke-slate-800" />
              <text x={padL - 8} y={bmdMapper.toPxY(t) + 3} textAnchor="end" className="fill-slate-500 font-mono text-[10px]">
                {formatTick(t)}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <g key={`bx-${t}`}>
              <line x1={bmdMapper.toPxX(t)} y1={108} x2={bmdMapper.toPxX(t)} y2={262} className="stroke-slate-100 dark:stroke-slate-800/60" />
              <line x1={bmdMapper.toPxX(t)} y1={294} x2={bmdMapper.toPxX(t)} y2={442} className="stroke-slate-100 dark:stroke-slate-800/60" />
              <text x={bmdMapper.toPxX(t)} y={458} textAnchor="middle" className="fill-slate-500 font-mono text-[10px]">
                {formatTick(t)} m
              </text>
            </g>
          ))}
          <line x1={padL} y1={bmdMapper.toPxY(0)} x2={width - padR} y2={bmdMapper.toPxY(0)} className="stroke-slate-300 dark:stroke-slate-600" />
          <rect x={padL} y={294} width={width - padL - padR} height={148} fill="none" className="stroke-slate-200 dark:stroke-slate-700" />
          <path d={bmdArea} className="fill-emerald-600/15" />
          <path d={bmdLine} fill="none" className="stroke-emerald-600 dark:stroke-emerald-400" strokeWidth={2} />

          {/* Inflection point markers */}
          {data.inflectionPointsM.map((ix, idx) => (
            <g key={idx}>
              <circle cx={bmdMapper.toPxX(ix)} cy={bmdMapper.toPxY(0)} r={4.5} className="fill-amber-500 stroke-white dark:stroke-slate-900" strokeWidth={1.5} />
              <text
                x={bmdMapper.toPxX(ix)}
                y={bmdMapper.toPxY(0) - 9}
                textAnchor="middle"
                className="fill-amber-700 dark:fill-amber-300 font-mono text-[10px] font-semibold"
              >
                M=0 ({ix.toFixed(2)}m)
              </text>
            </g>
          ))}

          {/* Interactive vertical cursor */}
          {nearestSample && (
            <g className="pointer-events-none">
              <line
                x1={sfdMapper.toPxX(nearestSample.x)}
                y1={beamY}
                x2={sfdMapper.toPxX(nearestSample.x)}
                y2={442}
                className="stroke-blue-500/50"
                strokeDasharray="3 3"
              />
              <circle cx={sfdMapper.toPxX(nearestSample.x)} cy={sfdMapper.toPxY(nearestSample.shear)} r={4} className="fill-blue-600" />
              <circle cx={bmdMapper.toPxX(nearestSample.x)} cy={bmdMapper.toPxY(nearestSample.moment)} r={4} className="fill-emerald-600" />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
