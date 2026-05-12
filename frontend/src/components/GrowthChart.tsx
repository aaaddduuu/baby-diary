import type { WHODataPoint } from "../lib/who-data";

interface GrowthChartProps {
  whoData: WHODataPoint[];
  userPoints: { month: number; value: number }[];
  unit: string;
}

const CHART_WIDTH = 340;
const CHART_HEIGHT = 220;
const PADDING = { top: 20, right: 20, bottom: 30, left: 40 };
const INNER_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const INNER_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

function scaleX(month: number): number {
  return PADDING.left + (month / 24) * INNER_WIDTH;
}

function scaleY(value: number, min: number, max: number): number {
  return PADDING.top + INNER_HEIGHT - ((value - min) / (max - min)) * INNER_HEIGHT;
}

function generatePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

export default function GrowthChart({ whoData, userPoints }: GrowthChartProps) {
  const allValues = [
    ...whoData.map(d => d.p3),
    ...whoData.map(d => d.p97),
    ...userPoints.map(p => p.value),
  ];
  const minVal = Math.floor(Math.min(...allValues) - 1);
  const maxVal = Math.ceil(Math.max(...allValues) + 1);

  const p3Path = generatePath(whoData.map(d => ({ x: scaleX(d.month), y: scaleY(d.p3, minVal, maxVal) })));
  const p50Path = generatePath(whoData.map(d => ({ x: scaleX(d.month), y: scaleY(d.p50, minVal, maxVal) })));
  const p97Path = generatePath(whoData.map(d => ({ x: scaleX(d.month), y: scaleY(d.p97, minVal, maxVal) })));

  const userPath = generatePath(userPoints.map(p => ({ x: scaleX(p.month), y: scaleY(p.value, minVal, maxVal) })));

  const yTicks = 5;
  const yStep = (maxVal - minVal) / yTicks;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => Math.round(minVal + i * yStep));

  return (
    <svg width={CHART_WIDTH} height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
      {yLabels.map((label, i) => {
        const y = scaleY(label, minVal, maxVal);
        return (
          <g key={i}>
            <line x1={PADDING.left} y1={y} x2={CHART_WIDTH - PADDING.right} y2={y} stroke="#E2D9C8" strokeWidth={0.5} />
            <text x={PADDING.left - 8} y={y + 4} textAnchor="end" className="fill-gray-400 text-[10px]">
              {label}
            </text>
          </g>
        );
      })}

      {[0, 6, 12, 18, 24].map(month => {
        const x = scaleX(month);
        return (
          <g key={month}>
            <line x1={x} y1={PADDING.top} x2={x} y2={CHART_HEIGHT - PADDING.bottom} stroke="#E2D9C8" strokeWidth={0.5} />
            <text x={x} y={CHART_HEIGHT - 10} textAnchor="middle" className="fill-gray-400 text-[10px]">
              {month}月
            </text>
          </g>
        );
      })}

      <path d={p3Path} fill="none" stroke="#D4607A" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
      <path d={p50Path} fill="none" stroke="#3D4F8C" strokeWidth={1.5} opacity={0.6} />
      <path d={p97Path} fill="none" stroke="#D4607A" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />

      {userPoints.length > 0 && (
        <>
          <path d={userPath} fill="none" stroke="#4AB89A" strokeWidth={2.5} />
          {userPoints.map((p, i) => (
            <circle
              key={i}
              cx={scaleX(p.month)}
              cy={scaleY(p.value, minVal, maxVal)}
              r={4}
              fill="#4AB89A"
              stroke="white"
              strokeWidth={2}
            />
          ))}
        </>
      )}

      <text x={CHART_WIDTH - PADDING.right} y={PADDING.top - 5} textAnchor="end" className="fill-gray-400 text-[9px]">
        P97
      </text>
      <text x={CHART_WIDTH - PADDING.right} y={scaleY(whoData[whoData.length - 1]?.p50 || 0, minVal, maxVal) - 5} textAnchor="end" className="fill-indigo text-[9px]">
        P50
      </text>
      <text x={CHART_WIDTH - PADDING.right} y={CHART_HEIGHT - PADDING.bottom - 5} textAnchor="end" className="fill-gray-400 text-[9px]">
        P3
      </text>
    </svg>
  );
}
