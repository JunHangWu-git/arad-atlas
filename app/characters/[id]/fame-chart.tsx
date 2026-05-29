"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

interface FamePoint {
  fame: number | null;
  level: number | null;
  capturedAt: number;
}

interface FameChartProps {
  points: FamePoint[];
}

interface ChartDatum {
  date: string;
  fame: number | null;
  rawDate: Date;
}

interface FameTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number | string | null; payload?: ChartDatum }>;
}

function FameTooltip({ active, payload }: FameTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const entry = payload[0];
  const datum = entry?.payload;
  if (!datum) return null;

  const fame = typeof entry.value === "number" ? entry.value : null;

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">
        {datum.rawDate.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
      <p className="font-semibold text-amber-400">
        {fame != null ? fame.toLocaleString() : "—"} fame
      </p>
    </div>
  );
}

function formatDateTick(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatFameTick(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(value);
}

export function FameChart({ points }: FameChartProps) {
  const data: ChartDatum[] = points.map((p) => {
    const rawDate = new Date(p.capturedAt);
    return {
      date: rawDate.toISOString(),
      fame: p.fame,
      rawDate,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickLine={false}
          tickFormatter={formatDateTick}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          width={60}
          tickFormatter={formatFameTick}
        />
        <Tooltip content={<FameTooltip />} />
        <Line
          type="monotone"
          dataKey="fame"
          dot={false}
          strokeWidth={2}
          stroke="#f59e0b"
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
