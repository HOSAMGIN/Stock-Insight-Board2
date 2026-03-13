import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { format } from "date-fns";
import type { PricePoint } from "@workspace/api-client-react";

interface DeviationChartProps {
  data: PricePoint[];
  symbol: string;
  upColor?: string;
  downColor?: string;
  zoomed?: boolean;
}

export function DeviationChart({
  data,
  symbol,
  upColor = "#4ade80",
  downColor = "#f87171",
  zoomed = false,
}: DeviationChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    dateFormatted: format(new Date(d.date), "MM/dd"),
    isPositive: d.deviationPercent > 0,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const value = payload[0].value;
    const isPos = value > 0;
    return (
      <div className="glass-panel p-3 rounded-lg border border-white/10 shadow-xl">
        <p className="text-sm text-muted-foreground mb-1 font-mono">{label}</p>
        <p className="text-sm font-semibold flex items-center gap-2">
          MA20 이격도:
          <span
            className="font-mono font-bold"
            style={{ color: isPos ? upColor : downColor }}
          >
            {value > 0 ? "+" : ""}{value.toFixed(2)}%
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          종가: {payload[0].payload.close.toFixed(2)}
        </p>
      </div>
    );
  };

  const height = zoomed ? 400 : 250;

  return (
    <div style={{ height }} className="w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--muted))"
            vertical={false}
          />
          <XAxis
            dataKey="dateFormatted"
            stroke="hsl(var(--muted-foreground))"
            fontSize={zoomed ? 12 : 11}
            tickMargin={10}
            fontFamily="monospace"
            minTickGap={zoomed ? 15 : 20}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={zoomed ? 12 : 11}
            tickFormatter={(val) => `${val}%`}
            fontFamily="monospace"
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted)/0.2)" }} />
          <ReferenceLine
            y={0}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="3 3"
          />
          <Bar dataKey="deviationPercent" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isPositive ? upColor : downColor}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
