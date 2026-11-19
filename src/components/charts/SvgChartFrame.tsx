import React, { useCallback, useRef, useState } from 'react';

export interface ChartBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface ChartPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const DEFAULT_PADDING: ChartPadding = {
  top: 24,
  right: 28,
  bottom: 46,
  left: 62,
};

export function niceTicks(min: number, max: number, approxCount = 6): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [0];
  const rawStep = (max - min) / Math.max(2, approxCount);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const niceNorm = norm <= 1.5 ? 1 : norm <= 3 ? 2 : norm <= 7 ? 5 : 10;
  const step = niceNorm * mag;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= max + step * 1e-6; t += step) {
    ticks.push(Math.abs(t) < 1e-9 ? 0 : Number(t.toPrecision(10)));
  }
  return ticks;
}

export function formatTick(val: number): string {
  if (Math.abs(val) >= 1e5 || (Math.abs(val) > 0 && Math.abs(val) < 1e-2)) {
    return val.toExponential(1);
  }
  if (Math.abs(val - Math.round(val)) < 1e-6) {
    return String(Math.round(val));
  }
  return Number(val.toFixed(2)).toString();
}

export interface ChartCoordinateMapper {
  width: number;
  height: number;
  padding: ChartPadding;
  bounds: ChartBounds;
  toPxX: (x: number) => number;
  toPxY: (y: number) => number;
  toDataX: (px: number) => number;
  toDataY: (px: number) => number;
}

export function createLinearMapper(
  bounds: ChartBounds,
  width = 680,
  height = 400,
  padding = DEFAULT_PADDING,
): ChartCoordinateMapper {
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const spanX = Math.max(1e-9, bounds.xMax - bounds.xMin);
  const spanY = Math.max(1e-9, bounds.yMax - bounds.yMin);

  return {
    width,
    height,
    padding,
    bounds,
    toPxX: (x) => padding.left + ((x - bounds.xMin) / spanX) * plotW,
    toPxY: (y) => padding.top + (1 - (y - bounds.yMin) / spanY) * plotH,
    toDataX: (px) => bounds.xMin + ((px - padding.left) / plotW) * spanX,
    toDataY: (px) => bounds.yMin + (1 - (px - padding.top) / plotH) * spanY,
  };
}

interface SvgChartFrameProps {
  title: string;
  xLabel: string;
  yLabel: string;
  mapper: ChartCoordinateMapper;
  xTicks?: number[];
  yTicks?: number[];
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
  invertY?: boolean;
  showZeroAxes?: boolean;
  children: React.ReactNode;
  legend?: React.ReactNode;
  probeFormatter?: (dataX: number, dataY: number) => string;
}

export function SvgChartFrame({
  title,
  xLabel,
  yLabel,
  mapper,
  xTicks,
  yTicks,
  formatX = formatTick,
  formatY = formatTick,
  invertY = false,
  showZeroAxes = true,
  children,
  legend,
  probeFormatter,
}: SvgChartFrameProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [probe, setProbe] = useState<{ px: number; py: number; x: number; y: number } | null>(null);

  const { width, height, padding, bounds, toPxX, toPxY, toDataX, toDataY } = mapper;
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const resolvedXTicks = xTicks ?? niceTicks(bounds.xMin, bounds.xMax, 6);
  const resolvedYTicks = yTicks ?? niceTicks(bounds.yMin, bounds.yMax, 5);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const px = ((e.clientX - rect.left) / rect.width) * width;
      const py = ((e.clientY - rect.top) / rect.height) * height;
      if (
        px < padding.left ||
        px > width - padding.right ||
        py < padding.top ||
        py > height - padding.bottom
      ) {
        setProbe(null);
        return;
      }
      setProbe({
        px,
        py,
        x: toDataX(px),
        y: invertY ? -toDataY(py) : toDataY(py),
      });
    },
    [width, height, padding, toDataX, toDataY, invertY],
  );

  return (
    <div className="space-y-2.5">
      <div className="relative w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{title}</span>
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums min-h-[16px]">
            {probe
              ? probeFormatter
                ? probeFormatter(probe.x, probe.y)
                : `(${formatX(probe.x)}, ${formatY(probe.y)})`
              : 'Hover plot to inspect coordinates'}
          </span>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={title}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setProbe(null)}
          className="w-full h-auto block cursor-crosshair select-none"
        >
          <defs>
            <clipPath id={`clip-${title.replace(/[^a-zA-Z0-9]/g, '')}`}>
              <rect x={padding.left} y={padding.top} width={plotW} height={plotH} />
            </clipPath>
          </defs>

          {/* Gridlines */}
          {resolvedXTicks.map((t) => {
            const x = toPxX(t);
            return (
              <g key={`xg-${t}`}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  className="stroke-slate-100 dark:stroke-slate-800/80"
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={height - padding.bottom + 16}
                  textAnchor="middle"
                  className="fill-slate-500 dark:fill-slate-400 font-mono text-[10px]"
                >
                  {formatX(t)}
                </text>
              </g>
            );
          })}

          {resolvedYTicks.map((t) => {
            const y = toPxY(t);
            const displayTick = invertY ? -t : t;
            return (
              <g key={`yg-${t}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  className="stroke-slate-100 dark:stroke-slate-800/80"
                  strokeWidth={1}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-500 dark:fill-slate-400 font-mono text-[10px]"
                >
                  {formatY(displayTick)}
                </text>
              </g>
            );
          })}

          {/* Zero axes */}
          {showZeroAxes && bounds.xMin < 0 && bounds.xMax > 0 && (
            <line
              x1={toPxX(0)}
              y1={padding.top}
              x2={toPxX(0)}
              y2={height - padding.bottom}
              className="stroke-slate-300 dark:stroke-slate-600"
              strokeWidth={1.25}
            />
          )}
          {showZeroAxes && bounds.yMin < 0 && bounds.yMax > 0 && (
            <line
              x1={padding.left}
              y1={toPxY(0)}
              x2={width - padding.right}
              y2={toPxY(0)}
              className="stroke-slate-300 dark:stroke-slate-600"
              strokeWidth={1.25}
            />
          )}

          {/* Plot frame border */}
          <rect
            x={padding.left}
            y={padding.top}
            width={plotW}
            height={plotH}
            fill="none"
            className="stroke-slate-300 dark:stroke-slate-700"
            strokeWidth={1}
          />

          {/* Clipped plot content */}
          <g clipPath={`url(#clip-${title.replace(/[^a-zA-Z0-9]/g, '')})`}>{children}</g>

          {/* Crosshair probe */}
          {probe && (
            <g className="pointer-events-none">
              <line
                x1={probe.px}
                y1={padding.top}
                x2={probe.px}
                y2={height - padding.bottom}
                className="stroke-blue-500/40"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <line
                x1={padding.left}
                y1={probe.py}
                x2={width - padding.right}
                y2={probe.py}
                className="stroke-blue-500/40"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
            </g>
          )}

          {/* Axis Labels */}
          <text
            x={padding.left + plotW / 2}
            y={height - 10}
            textAnchor="middle"
            className="fill-slate-600 dark:fill-slate-300 text-[11px] font-medium"
          >
            {xLabel}
          </text>
          <text
            x={16}
            y={padding.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${padding.top + plotH / 2})`}
            className="fill-slate-600 dark:fill-slate-300 text-[11px] font-medium"
          >
            {yLabel}
          </text>
        </svg>
      </div>

      {legend && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-xs text-slate-600 dark:text-slate-400">
          {legend}
        </div>
      )}
    </div>
  );
}
