import React from "react";

interface RsiGaugeProps {
  value: number;
  oversoldColor?: string;
  neutralColor?: string;
  overboughtColor?: string;
  zoomed?: boolean;
}

export function RsiGauge({
  value,
  oversoldColor = "#4ade80",
  neutralColor = "#64748b",
  overboughtColor = "#f87171",
  zoomed = false,
}: RsiGaugeProps) {
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const position = `${normalizedValue}%`;
  const barH = zoomed ? "h-5" : "h-2";

  const label =
    normalizedValue < 30 ? "과매도" : normalizedValue > 70 ? "과매수" : "중립";
  const labelColor =
    normalizedValue < 30
      ? oversoldColor
      : normalizedValue > 70
      ? overboughtColor
      : neutralColor;

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-xs font-mono text-muted-foreground">
        <span>0</span>
        <span>30</span>
        <span>70</span>
        <span>100</span>
      </div>

      <div className={`relative ${barH} w-full rounded-full bg-secondary overflow-hidden flex`}>
        {/* Buy Zone */}
        <div
          className="h-full w-[30%] border-r border-background/50 transition-colors duration-300"
          style={{ backgroundColor: oversoldColor + "4d" }}
        />
        {/* Neutral Zone */}
        <div
          className="h-full w-[40%] border-r border-background/50 transition-colors duration-300"
          style={{ backgroundColor: neutralColor + "40" }}
        />
        {/* Sell Zone */}
        <div
          className="h-full w-[30%] transition-colors duration-300"
          style={{ backgroundColor: overboughtColor + "4d" }}
        />

        {/* Marker */}
        <div
          className="absolute top-0 bottom-0 w-1 shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10 transition-all duration-1000 ease-out rounded-full"
          style={{
            left: `calc(${position} - 2px)`,
            backgroundColor: "#ffffff",
          }}
        />
      </div>

      {zoomed && (
        <div className="flex justify-between items-center mt-3">
          <div className="text-sm font-mono">
            <span className="text-muted-foreground">현재값: </span>
            <span
              className="font-bold text-xl"
              style={{ color: labelColor }}
            >
              {value.toFixed(2)}
            </span>
          </div>
          <span
            className="text-sm font-mono font-bold px-3 py-1 rounded-full border"
            style={{
              color: labelColor,
              borderColor: labelColor + "60",
              backgroundColor: labelColor + "20",
            }}
          >
            {label}
          </span>
        </div>
      )}
    </div>
  );
}
