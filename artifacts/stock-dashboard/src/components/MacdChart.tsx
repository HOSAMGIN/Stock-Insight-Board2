import React from "react";
import {
  ComposedChart,
  Bar,
  Line,
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

interface MacdChartProps {
  data: PricePoint[];
  macdLine: number;
  signalLine: number;
  macdHistogram: number;
  macdLineColor?: string;
  macdSignalColor?: string;
  macdBullColor?: string;
  macdBearColor?: string;
  zoomed?: boolean;
}

export function MacdChart({
  data,
  macdLine,
  signalLine,
  macdHistogram,
  macdLineColor = "#38bdf8",
  macdSignalColor = "#fb923c",
  macdBullColor = "#4ade80",
  macdBearColor = "#f87171",
  zoomed = false,
}: MacdChartProps) {
  const chartData = data.map((d) => ({
    date: format(new Date(d.date), "MM/dd"),
    macdLine: d.macdLine,
    signalLine: d.signalLine,
    histogram: d.macdHistogram,
    isBullish: d.macdHistogram >= 0,
  }));

  const isBullish = macdLine > signalLine;
  const isCrossoverNow =
    chartData.length >= 2 &&
    chartData[chartData.length - 2].macdLine < chartData[chartData.length - 2].signalLine &&
    macdLine >= signalLine;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="glass-panel p-3 rounded-lg border border-white/10 text-xs font-mono space-y-1">
        <p className="text-muted-foreground mb-1">{label}</p>
        <p style={{ color: macdLineColor }}>MACD: {d.macdLine?.toFixed(4)}</p>
        <p style={{ color: macdSignalColor }}>Signal: {d.signalLine?.toFixed(4)}</p>
        <p style={{ color: d.histogram >= 0 ? macdBullColor : macdBearColor }}>
          Histogram: {d.histogram?.toFixed(4)}
        </p>
      </div>
    );
  };

  const h = zoomed ? 350 : 150;

  return (
    <div className="mt-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">MACD (12, 26, 9)</span>
        <div className="flex items-center gap-2">
          {isCrossoverNow && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse">
              ⚡ 골든 크로스
            </span>
          )}
          <span
            className="text-[10px] font-mono font-bold"
            style={{ color: isBullish ? macdBullColor : macdBearColor }}
          >
            {isBullish ? "▲ 상승 모멘텀" : "▼ 하락 모멘텀"}
          </span>
        </div>
      </div>

      <div className="flex gap-4 mb-2 text-[11px] font-mono">
        <span style={{ color: macdLineColor }}>MACD: {(macdLine ?? 0).toFixed(4)}</span>
        <span style={{ color: macdSignalColor }}>Signal: {(signalLine ?? 0).toFixed(4)}</span>
        <span style={{ color: (macdHistogram ?? 0) >= 0 ? macdBullColor : macdBearColor }}>
          Hist: {(macdHistogram ?? 0) >= 0 ? "+" : ""}{(macdHistogram ?? 0).toFixed(4)}
        </span>
      </div>

      <div style={{ height: h }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--muted))"
              vertical={false}
              opacity={0.4}
            />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              fontSize={zoomed ? 12 : 10}
              tickMargin={6}
              minTickGap={20}
              fontFamily="monospace"
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={zoomed ? 12 : 10}
              tickFormatter={(v) => v.toFixed(2)}
              fontFamily="monospace"
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "3 3" }}
            />
            <ReferenceLine
              y={0}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
              strokeOpacity={0.6}
            />
            <Bar dataKey="histogram" radius={[1, 1, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isBullish ? macdBullColor : macdBearColor}
                  fillOpacity={0.7}
                />
              ))}
            </Bar>
            <Line
              dataKey="macdLine"
              stroke={macdLineColor}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: macdLineColor }}
            />
            <Line
              dataKey="signalLine"
              stroke={macdSignalColor}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              activeDot={{ r: 3, fill: macdSignalColor }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-muted-foreground/70">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5" style={{ backgroundColor: macdLineColor }} />
          MACD
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5" style={{ backgroundColor: macdSignalColor }} />
          Signal
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm opacity-70" style={{ backgroundColor: macdBullColor }} />
          양 /
          <span className="inline-block w-3 h-2 rounded-sm opacity-70 ml-1" style={{ backgroundColor: macdBearColor }} />
          음
        </span>
      </div>
    </div>
  );
}
