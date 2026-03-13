import React, { useState, useEffect } from "react";
import { useGetStocks } from "@workspace/api-client-react";
import type { StockData } from "@workspace/api-client-react";
import { StockCard } from "@/components/StockCard";
import { SuperBuyAlert } from "@/components/SuperBuyAlert";
import { AddSymbolModal } from "@/components/AddSymbolModal";
import { CustomSymbolCard } from "@/components/CustomSymbolCard";
import { SettingsPanel } from "@/components/SettingsPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomSymbols } from "@/hooks/useCustomSymbols";
import { ChartSettingsProvider } from "@/context/ChartSettingsContext";
import { format } from "date-fns";
import { Clock, AlertTriangle, TerminalSquare, Globe, Building2, TrendingUp, TrendingDown, Star, Zap, Plus, Bookmark, X, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORY_META = {
  "us-stocks": { label: "🇺🇸 미국 주식", icon: Globe, cols: "xl:grid-cols-4" },
  "kr-stocks": { label: "🇰🇷 한국 주식", icon: Building2, cols: "xl:grid-cols-3" },
  "indices": { label: "📊 주요 지수", icon: TrendingUp, cols: "xl:grid-cols-3" },
} as const;

const CATEGORY_ORDER = ["us-stocks", "kr-stocks", "indices"] as const;

function SectionSkeleton({ count, cols }: { count: number; cols: string }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${cols} gap-5`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-panel p-6 rounded-xl space-y-5">
          <div className="flex justify-between items-start">
            <div>
              <Skeleton className="h-7 w-24 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="text-right">
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-4 w-14 ml-auto" />
            </div>
          </div>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-[160px] w-full" />
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [lastAlertKey, setLastAlertKey] = useState("");
  const [testAlertVisible, setTestAlertVisible] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { symbols: customSymbols, addSymbol, removeSymbol } = useCustomSymbols();

  const { data, isLoading, isError, error, isFetching } = useGetStocks({
    query: {
      refetchInterval: 60000,
      refetchOnWindowFocus: true,
    },
  });

  const superBuySymbols = data?.superBuySignals ?? [];
  const alertKey = superBuySymbols.join(",");

  // Re-show alert whenever the set of super-buy symbols changes
  useEffect(() => {
    if (alertKey && alertKey !== lastAlertKey) {
      setAlertDismissed(false);
      setLastAlertKey(alertKey);
    }
  }, [alertKey, lastAlertKey]);

  const showAlert = superBuySymbols.length > 0 && !alertDismissed;

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <img
          src={`${import.meta.env.BASE_URL}images/terminal-bg.png`}
          alt="Terminal Background"
          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
        />
        <div className="glass-panel p-8 rounded-xl max-w-md w-full border-destructive/30 relative z-10">
          <div className="flex items-center gap-3 text-destructive mb-4">
            <AlertTriangle className="w-8 h-8" />
            <h2 className="text-xl font-mono font-bold">SYSTEM_ERROR</h2>
          </div>
          <p className="text-muted-foreground font-mono text-sm mb-4">
            Failed to connect to data feed. Retrying connection...
          </p>
          <div className="bg-background/80 p-4 rounded font-mono text-xs text-destructive overflow-auto">
            {error?.message || "Unknown API Error"}
          </div>
        </div>
      </div>
    );
  }

  const grouped = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = (data?.stocks ?? []).filter((s) => s.category === cat);
      return acc;
    },
    {} as Record<string, StockData[]>
  );

  let cardIndex = 0;

  return (
    <ChartSettingsProvider>
    <div className="min-h-screen relative bg-background pb-20">
      {/* Global super buy alert */}
      {showAlert && (
        <SuperBuyAlert
          symbols={superBuySymbols}
          onDismiss={() => setAlertDismissed(true)}
        />
      )}
      {testAlertVisible && (
        <SuperBuyAlert
          symbols={["SOXL", "TSLL"]}
          onDismiss={() => setTestAlertVisible(false)}
        />
      )}

      {/* Add symbol modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddSymbolModal
            onClose={() => setShowAddModal(false)}
            onAdd={addSymbol}
            existing={customSymbols}
          />
        )}
      </AnimatePresence>

      {/* Chart settings panel */}
      <AnimatePresence>
        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>

      <div className="absolute inset-0 z-0">
        <img
          src={`${import.meta.env.BASE_URL}images/terminal-bg.png`}
          alt="Grid Background"
          className="w-full h-full object-cover opacity-15 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TerminalSquare className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                주식 투자 타이밍 현황판
              </h1>
            </div>
            <p className="text-muted-foreground text-sm flex items-center gap-2 font-mono">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse-slow"></span>
              LIVE MARKET DATA FEED connected
            </p>
          </motion.div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-2 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              종목 추가
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:border-white/20 hover:bg-white/8 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              차트 설정
            </button>

            <button
              onClick={() => setTestAlertVisible(true)}
              className="text-xs font-mono px-3 py-2 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
            >
              ⚡ 알림 테스트
            </button>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex items-center gap-2 text-sm font-mono bg-secondary/50 px-4 py-2 rounded-lg border border-white/5"
            >
              <Clock
                className={
                  isFetching
                    ? "w-4 h-4 text-primary animate-spin"
                    : "w-4 h-4 text-muted-foreground"
                }
              />
              <span className="text-muted-foreground">LAST UPDATED:</span>
              <span className="text-foreground">
                {data?.lastUpdated
                  ? format(new Date(data.lastUpdated), "HH:mm:ss")
                  : "--:--:--"}
              </span>
            </motion.div>
          </div>
        </header>

        {/* Signal Summary Panel */}
        {!isLoading && data && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {/* Best Timing */}
            <div className={`glass-panel rounded-xl p-4 border ${data.bestTimingSignals.length > 0 ? "border-amber-500/40 bg-amber-500/5" : "border-white/5"}`}>
              <div className="flex items-center gap-2 mb-2">
                <Star className={`w-4 h-4 ${data.bestTimingSignals.length > 0 ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
                <span className="text-xs font-mono font-semibold text-muted-foreground">베스트 타이밍</span>
              </div>
              {data.bestTimingSignals.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {data.bestTimingSignals.map((s) => (
                    <span key={s} className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">{s}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono text-muted-foreground/50">해당 종목 없음</p>
              )}
            </div>

            {/* Golden Cross */}
            <div className={`glass-panel rounded-xl p-4 border ${data.goldenCrossSignals.length > 0 ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/5"}`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className={`w-4 h-4 ${data.goldenCrossSignals.length > 0 ? "text-emerald-400" : "text-muted-foreground"}`} />
                <span className="text-xs font-mono font-semibold text-muted-foreground">추세 전환: 골든크로스</span>
              </div>
              {data.goldenCrossSignals.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {data.goldenCrossSignals.map((s) => (
                    <span key={s} className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">{s}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono text-muted-foreground/50">해당 종목 없음</p>
              )}
            </div>

            {/* Dead Cross */}
            <div className={`glass-panel rounded-xl p-4 border ${data.deadCrossSignals.length > 0 ? "border-red-500/40 bg-red-500/5" : "border-white/5"}`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className={`w-4 h-4 ${data.deadCrossSignals.length > 0 ? "text-red-400" : "text-muted-foreground"}`} />
                <span className="text-xs font-mono font-semibold text-muted-foreground">하락 추세: 데드크로스</span>
              </div>
              {data.deadCrossSignals.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {data.deadCrossSignals.map((s) => (
                    <span key={s} className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">{s}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono text-muted-foreground/50">해당 종목 없음</p>
              )}
            </div>

            {/* Super Buy */}
            <div className={`glass-panel rounded-xl p-4 border ${data.superBuySignals.length > 0 ? "border-green-500/40 bg-green-500/5" : "border-white/5"}`}>
              <div className="flex items-center gap-2 mb-2">
                <Zap className={`w-4 h-4 ${data.superBuySignals.length > 0 ? "text-green-400" : "text-muted-foreground"}`} />
                <span className="text-xs font-mono font-semibold text-muted-foreground">역대급 매수 기회</span>
              </div>
              {data.superBuySignals.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {data.superBuySignals.map((s) => (
                    <span key={s} className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30">{s}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono text-muted-foreground/50">해당 종목 없음</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Custom Watchlist Section */}
        <AnimatePresence>
          {customSymbols.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mb-12"
            >
              <div className="flex items-center gap-2 mb-5">
                <Bookmark className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-widest">
                  ⭐ 내 관심 종목
                </h2>
                <span className="text-xs font-mono text-muted-foreground/50 bg-white/5 border border-white/8 rounded-full px-2 py-0.5">
                  {customSymbols.length}
                </span>
                <div className="flex-1 h-px bg-white/5 ml-2" />
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1 text-[11px] font-mono text-primary/70 hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/20"
                >
                  <Plus className="w-3 h-3" />
                  추가
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {customSymbols.map((sym, i) => (
                  <CustomSymbolCard
                    key={sym}
                    symbol={sym}
                    index={i}
                    onRemove={removeSymbol}
                  />
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Empty watchlist CTA */}
        {customSymbols.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-10"
          >
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full glass-panel rounded-xl border border-dashed border-white/10 hover:border-primary/30 transition-colors p-5 flex items-center justify-center gap-3 group"
            >
              <div className="p-2 rounded-lg bg-white/5 group-hover:bg-primary/10 transition-colors">
                <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="text-left">
                <p className="text-sm font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                  관심 종목 추가하기
                </p>
                <p className="text-xs text-muted-foreground/50 font-mono">
                  AAPL, MSFT, 삼성 등 원하는 종목을 추가하세요
                </p>
              </div>
            </button>
          </motion.div>
        )}

        {/* Category Sections */}
        <div className="space-y-12">
          {isLoading
            ? CATEGORY_ORDER.map((cat) => {
                const meta = CATEGORY_META[cat];
                const count = cat === "us-stocks" ? 4 : 3;
                return (
                  <section key={cat}>
                    <div className="flex items-center gap-2 mb-5">
                      <meta.icon className="w-4 h-4 text-muted-foreground" />
                      <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-widest">
                        {meta.label}
                      </h2>
                      <div className="flex-1 h-px bg-white/5 ml-2" />
                    </div>
                    <SectionSkeleton count={count} cols={meta.cols} />
                  </section>
                );
              })
            : CATEGORY_ORDER.map((cat) => {
                const stocks = grouped[cat];
                if (!stocks || stocks.length === 0) return null;
                const meta = CATEGORY_META[cat];
                return (
                  <section key={cat}>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-2 mb-5"
                    >
                      <meta.icon className="w-4 h-4 text-muted-foreground" />
                      <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-widest">
                        {meta.label}
                      </h2>
                      <div className="flex-1 h-px bg-white/5 ml-2" />
                    </motion.div>
                    <div className={`grid grid-cols-1 md:grid-cols-2 ${meta.cols} gap-5`}>
                      {stocks.map((stock) => {
                        const idx = cardIndex++;
                        return <StockCard key={stock.symbol} data={stock} index={idx} />;
                      })}
                    </div>
                  </section>
                );
              })}
        </div>
      </div>
    </div>
    </ChartSettingsProvider>
  );
}
