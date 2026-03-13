import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, GripVertical, Settings2, Palette, LayoutList } from "lucide-react";
import { useChartSettingsContext } from "@/context/ChartSettingsContext";
import { DEFAULT_COLORS, DEFAULT_ORDER, INDICATOR_LABELS, type ChartColors } from "@/hooks/useChartSettings";

interface SettingsPanelProps {
  onClose: () => void;
}

const COLOR_GROUPS: { label: string; items: { key: keyof ChartColors; label: string }[] }[] = [
  {
    label: "가격 & 이동평균",
    items: [
      { key: "priceColor", label: "종가 선" },
      { key: "ma20Color", label: "MA20 선" },
      { key: "ma60Color", label: "MA60 선" },
    ],
  },
  {
    label: "RSI",
    items: [
      { key: "rsiOversoldColor", label: "과매도 구간 (< 30)" },
      { key: "rsiNeutralColor", label: "중립 구간" },
      { key: "rsiOverboughtColor", label: "과매수 구간 (> 70)" },
    ],
  },
  {
    label: "볼린저 밴드",
    items: [
      { key: "bbUpperColor", label: "상단 밴드" },
      { key: "bbMiddleColor", label: "중심선 (SMA20)" },
      { key: "bbLowerColor", label: "하단 밴드" },
    ],
  },
  {
    label: "MACD",
    items: [
      { key: "macdLineColor", label: "MACD 선" },
      { key: "macdSignalColor", label: "시그널 선" },
      { key: "macdBullColor", label: "양봉 히스토그램" },
      { key: "macdBearColor", label: "음봉 히스토그램" },
    ],
  },
  {
    label: "MA20 이격도",
    items: [
      { key: "deviationUpColor", label: "양(+) 이격 바" },
      { key: "deviationDownColor", label: "음(-) 이격 바" },
    ],
  },
];

function DraggableList({
  items,
  onChange,
}: {
  items: string[];
  onChange: (newOrder: string[]) => void;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIdx(idx);
  };
  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    onChange(next);
    setDragIdx(null);
    setOverIdx(null);
  };
  const handleDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <ul className="space-y-1.5">
      {items.map((id, idx) => (
        <li
          key={id}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={() => handleDrop(idx)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm font-mono cursor-grab active:cursor-grabbing transition-all select-none ${
            dragIdx === idx
              ? "opacity-40 border-primary/40 bg-primary/10"
              : overIdx === idx
              ? "border-primary/50 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]"
              : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
          }`}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
          <span className="text-xs font-mono bg-white/10 rounded px-1.5 py-0.5 text-muted-foreground w-6 text-center shrink-0">
            {idx + 1}
          </span>
          <span className="text-foreground/80">{INDICATOR_LABELS[id] ?? id}</span>
        </li>
      ))}
    </ul>
  );
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { colors, order, updateColor, setOrder, resetColors, resetOrder } = useChartSettingsContext();
  const [activeTab, setActiveTab] = useState<"colors" | "order">("colors");

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Scrim */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        {/* Panel */}
        <motion.div
          className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-[#0d1117] border-l border-white/10 flex flex-col shadow-2xl"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">차트 설정</span>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/8 shrink-0">
            {(["colors", "order"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-mono font-semibold transition-colors border-b-2 ${
                  activeTab === tab
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                {tab === "colors" ? (
                  <>
                    <Palette className="w-3.5 h-3.5" />
                    색상 커스텀
                  </>
                ) : (
                  <>
                    <LayoutList className="w-3.5 h-3.5" />
                    지표 순서
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "colors" && (
              <div className="p-5 space-y-6">
                {COLOR_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-[11px] font-mono font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3">
                      {group.label}
                    </p>
                    <div className="space-y-2">
                      {group.items.map(({ key, label }) => (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/3 border border-white/6 hover:border-white/10 transition-colors"
                        >
                          <span className="text-xs font-mono text-foreground/80">{label}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-mono text-muted-foreground/50">
                              {colors[key]}
                            </span>
                            <label className="relative cursor-pointer">
                              <input
                                type="color"
                                value={colors[key]}
                                onChange={(e) => updateColor(key, e.target.value)}
                                className="sr-only"
                              />
                              <div
                                className="w-7 h-7 rounded-lg border-2 border-white/20 hover:border-white/40 transition-colors shadow-inner"
                                style={{ backgroundColor: colors[key] }}
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  onClick={resetColors}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/10 hover:border-white/20 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors bg-white/3 hover:bg-white/5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  기본값으로 초기화
                </button>
              </div>
            )}

            {activeTab === "order" && (
              <div className="p-5 space-y-6">
                <div>
                  <p className="text-[11px] font-mono font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1">
                    기본 지표
                  </p>
                  <p className="text-[10px] text-muted-foreground/40 font-mono mb-3">
                    드래그하여 순서를 변경하세요
                  </p>
                  <DraggableList
                    items={order.basic}
                    onChange={(newOrder) => setOrder("basic", newOrder)}
                  />
                </div>

                <div>
                  <p className="text-[11px] font-mono font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1">
                    고급 지표
                  </p>
                  <p className="text-[10px] text-muted-foreground/40 font-mono mb-3">
                    "볼린저 밴드 · MACD 보기" 섹션 안의 순서
                  </p>
                  <DraggableList
                    items={order.advanced}
                    onChange={(newOrder) => setOrder("advanced", newOrder)}
                  />
                </div>

                <button
                  onClick={resetOrder}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/10 hover:border-white/20 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors bg-white/3 hover:bg-white/5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  기본 순서로 초기화
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
