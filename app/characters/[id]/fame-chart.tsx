"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
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

export function FameChart({ points }: FameChartProps) {
  const data = points.map((p) => ({
    date: new Date(p.capturedAt).toLocaleString(),
    fame: p.fame,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} width={60} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="fame"
          dot={false}
          strokeWidth={2}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
