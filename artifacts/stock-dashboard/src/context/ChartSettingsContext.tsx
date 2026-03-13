import React, { createContext, useContext } from "react";
import {
  useChartSettings,
  DEFAULT_COLORS,
  DEFAULT_ORDER,
  type ChartColors,
  type IndicatorOrder,
} from "@/hooks/useChartSettings";

interface ChartSettingsContextValue {
  colors: ChartColors;
  order: IndicatorOrder;
  updateColor: (key: keyof ChartColors, value: string) => void;
  setOrder: (type: "basic" | "advanced", order: string[]) => void;
  resetColors: () => void;
  resetOrder: () => void;
}

const ChartSettingsContext = createContext<ChartSettingsContextValue>({
  colors: DEFAULT_COLORS,
  order: DEFAULT_ORDER,
  updateColor: () => {},
  setOrder: () => {},
  resetColors: () => {},
  resetOrder: () => {},
});

export function ChartSettingsProvider({ children }: { children: React.ReactNode }) {
  const hook = useChartSettings();
  return (
    <ChartSettingsContext.Provider
      value={{
        colors: hook.settings.colors,
        order: hook.settings.order,
        updateColor: hook.updateColor,
        setOrder: hook.setOrder,
        resetColors: hook.resetColors,
        resetOrder: hook.resetOrder,
      }}
    >
      {children}
    </ChartSettingsContext.Provider>
  );
}

export function useChartSettingsContext() {
  return useContext(ChartSettingsContext);
}
