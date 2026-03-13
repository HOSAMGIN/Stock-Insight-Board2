import { useState, useCallback } from "react";

export interface ChartColors {
  priceColor: string;
  ma20Color: string;
  ma60Color: string;
  rsiOversoldColor: string;
  rsiNeutralColor: string;
  rsiOverboughtColor: string;
  bbUpperColor: string;
  bbLowerColor: string;
  bbMiddleColor: string;
  macdLineColor: string;
  macdSignalColor: string;
  macdBullColor: string;
  macdBearColor: string;
  deviationUpColor: string;
  deviationDownColor: string;
}

export interface IndicatorOrder {
  basic: string[];
  advanced: string[];
}

export interface ChartSettings {
  colors: ChartColors;
  order: IndicatorOrder;
}

export const DEFAULT_COLORS: ChartColors = {
  priceColor: "#38bdf8",
  ma20Color: "#facc15",
  ma60Color: "#a78bfa",
  rsiOversoldColor: "#4ade80",
  rsiNeutralColor: "#64748b",
  rsiOverboughtColor: "#f87171",
  bbUpperColor: "#818cf8",
  bbLowerColor: "#4ade80",
  bbMiddleColor: "#94a3b8",
  macdLineColor: "#38bdf8",
  macdSignalColor: "#fb923c",
  macdBullColor: "#4ade80",
  macdBearColor: "#f87171",
  deviationUpColor: "#4ade80",
  deviationDownColor: "#f87171",
};

export const DEFAULT_ORDER: IndicatorOrder = {
  basic: ["rsi", "deviation", "body"],
  advanced: ["macross", "bollinger", "macd"],
};

export const INDICATOR_LABELS: Record<string, string> = {
  rsi: "RSI 게이지",
  deviation: "MA20 이격도 차트",
  body: "몸통 위치 게이지",
  macross: "MA 크로스 차트",
  bollinger: "볼린저 밴드",
  macd: "MACD",
};

const STORAGE_KEY = "chart-settings-v1";

function loadFromStorage(): ChartSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { colors: DEFAULT_COLORS, order: DEFAULT_ORDER };
    const parsed = JSON.parse(raw) as Partial<ChartSettings>;
    return {
      colors: { ...DEFAULT_COLORS, ...(parsed.colors ?? {}) },
      order: {
        basic: parsed.order?.basic ?? DEFAULT_ORDER.basic,
        advanced: parsed.order?.advanced ?? DEFAULT_ORDER.advanced,
      },
    };
  } catch {
    return { colors: DEFAULT_COLORS, order: DEFAULT_ORDER };
  }
}

function saveToStorage(settings: ChartSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export function useChartSettings() {
  const [settings, setSettings] = useState<ChartSettings>(loadFromStorage);

  const updateColor = useCallback(
    (key: keyof ChartColors, value: string) => {
      setSettings((prev) => {
        const next = { ...prev, colors: { ...prev.colors, [key]: value } };
        saveToStorage(next);
        return next;
      });
    },
    []
  );

  const setOrder = useCallback((type: "basic" | "advanced", order: string[]) => {
    setSettings((prev) => {
      const next = { ...prev, order: { ...prev.order, [type]: order } };
      saveToStorage(next);
      return next;
    });
  }, []);

  const resetColors = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, colors: { ...DEFAULT_COLORS } };
      saveToStorage(next);
      return next;
    });
  }, []);

  const resetOrder = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, order: { ...DEFAULT_ORDER } };
      saveToStorage(next);
      return next;
    });
  }, []);

  return { settings, updateColor, setOrder, resetColors, resetOrder };
}
