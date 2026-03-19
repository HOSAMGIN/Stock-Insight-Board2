import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStockNews } from "@/hooks/useStockNews";
import { Newspaper, BarChart2 as ChartIcon, ExternalLink, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RsiGauge } from "@/components/RsiGauge";
import { DeviationChart } from "@/components/DeviationChart";
import { BollingerChart } from "@/components/BollingerChart";
import { MacdChart } from "@/components/MacdChart";
import { MaCrossChart } from "@/components/MaCrossChart";
import { BodyPositionGauge } from "@/components/BodyPositionGauge";
import { ZoomableChart } from "@/components/ZoomModal";
import { useChartSettingsContext } from "@/context/ChartSettingsContext";
import { formatPrice, formatPercent, formatVolume } from "@/lib/utils";
import type { StockData } from "@workspace/api-client-react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Zap,
  Star,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StockCardProps {
  data: StockData;
  index: number;
}

export function StockCard({ data, index }: StockCardProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<"chart" | "news">("chart");
  const { colors, order } = useChartSettingsContext();

  // 뉴스는 탭을 열 때만 fetch
  const { data: newsData, isLoading: newsLoading, isError: newsError } = useStockNews(
    data.symbol,
    activeTab === "news"
  );

  const isUp = data.changePercent > 0;
  const ChangeIcon = isUp ? ArrowUpRight : ArrowDownRight;
  const isIndex = data.category === "indices";
  const currency = data.currency ?? "USD";

  const getRsiBadgeVariant = (signal: string) => {
    if (signal === "buy") return "success";
    if (signal === "sell") return "destructive";
    return "neutral";
  };

  const getRsiLabel = (signal: string) => {
    if (signal === "buy") return "매수 적기";
    if (signal === "sell") return "매도 검토";
    return "중립";
  };

  // ── Indicator renderers (keyed by ID) ──────────────────────────────────
  const basicIndicators: Record<string, React.ReactNode> = {
    rsi: (
      <div key="rsi" className="mt-5 space-y-2">
        <div className="flex justify-between items-end">
          <span className="text-xs font-medium text-muted-foreground">RSI 지수 현황</span>
          <span className="text-xs font-mono text-muted-foreground">
            {data.rsi14 < 30 ? "과매도" : data.rsi14 > 70 ? "과매수" : "정상 범위"}
          </span>
        </div>
        <ZoomableChart
          title="RSI (14)"
          extra={
            <p className="text-sm font-mono text-muted-foreground">
              현재값:{" "}
              <span className="text-foreground font-bold text-lg">{data.rsi14.toFixed(2)}</span>
            </p>
          }
        >
          {(zoomed) => (
            <RsiGauge
              value={data.rsi14}
              oversoldColor={colors.rsiOversoldColor}
              neutralColor={colors.rsiNeutralColor}
              overboughtColor={colors.rsiOverboughtColor}
              zoomed={zoomed}
            />
          )}
        </ZoomableChart>
      </div>
    ),

    deviation: (
      <div key="deviation" className="mt-6">
        <ZoomableChart
          title={`MA20 이격도 — ${data.displaySymbol}`}
          extra={
            <p className="text-sm font-mono text-muted-foreground">
              현재:{" "}
              <span
                className="font-bold"
                style={{ color: data.ma20DeviationPercent > 0 ? colors.deviationUpColor : colors.deviationDownColor }}
              >
                {formatPercent(data.ma20DeviationPercent)}
              </span>
            </p>
          }
        >
          {(zoomed) => (
            <>
              {!zoomed && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-muted-foreground">MA20 이격도 (최근 30일)</span>
                  <div className="font-mono text-xs">
                    현재:{" "}
                    <span
                      style={{
                        color:
                          data.ma20DeviationPercent > 0
                            ? colors.deviationUpColor
                            : colors.deviationDownColor,
                      }}
                    >
                      {formatPercent(data.ma20DeviationPercent)}
                    </span>
                  </div>
                </div>
              )}
              <DeviationChart
                data={data.historicalPrices}
                symbol={data.displaySymbol}
                upColor={colors.deviationUpColor}
                downColor={colors.deviationDownColor}
                zoomed={zoomed}
              />
            </>
          )}
        </ZoomableChart>
      </div>
    ),

    body: (
      <div key="body">
        <BodyPositionGauge
          historicalPrices={data.historicalPrices}
          currentPrice={data.currentPrice}
          rsi14={data.rsi14}
        />
      </div>
    ),
  };

  const advancedIndicators: Record<string, React.ReactNode> = {
    macross: (
      <div key="macross">
        <ZoomableChart title={`MA 크로스 — ${data.displaySymbol}`}>
          {(zoomed) => (
            <MaCrossChart
              data={data.historicalPrices}
              currency={currency}
              crossSignal={data.crossSignal}
              priceColor={colors.priceColor}
              ma20Color={colors.ma20Color}
              ma60Color={colors.ma60Color}
              zoomed={zoomed}
            />
          )}
        </ZoomableChart>
      </div>
    ),

    bollinger: (
      <div key="bollinger" className="border-t border-white/5 pt-4">
        <ZoomableChart title={`볼린저 밴드 — ${data.displaySymbol}`}>
          {(zoomed) => (
            <BollingerChart
              data={data.historicalPrices}
              currentPrice={data.currentPrice}
              currency={currency}
              isTouchingLowerBand={data.isTouchingLowerBand}
              priceColor={colors.priceColor}
              bbUpperColor={colors.bbUpperColor}
              bbMiddleColor={colors.bbMiddleColor}
              bbLowerColor={colors.bbLowerColor}
              zoomed={zoomed}
            />
          )}
        </ZoomableChart>
      </div>
    ),

    macd: (
      <div key="macd" className="border-t border-white/5 pt-4">
        <ZoomableChart title={`MACD — ${data.displaySymbol}`}>
          {(zoomed) => (
            <MacdChart
              data={data.historicalPrices}
              macdLine={data.macdLine}
              signalLine={data.signalLine}
              macdHistogram={data.macdHistogram}
              macdLineColor={colors.macdLineColor}
              macdSignalColor={colors.macdSignalColor}
              macdBullColor={colors.macdBullColor}
              macdBearColor={colors.macdBearColor}
              zoomed={zoomed}
            />
          )}
        </ZoomableChart>
      </div>
    ),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
    >
      <Card
        className={`glass-panel overflow-hidden border-t-2 transition-all duration-300 group h-full ${
          data.isBestTiming
            ? "border-t-amber-400 shadow-[0_0_28px_rgba(251,191,36,0.3)]"
            : data.isSuperBuySignal
            ? "border-t-green-400 shadow-[0_0_24px_rgba(74,222,128,0.25)]"
            : data.crossSignal === "golden"
            ? "border-t-emerald-500/70 shadow-[0_0_16px_rgba(52,211,153,0.15)]"
            : data.crossSignal === "dead"
            ? "border-t-red-500/50"
            : "border-t-transparent hover:border-t-primary/50"
        }`}
      >
        {/* Banners */}
        {data.isBestTiming && (
          <motion.div
            className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 flex items-center gap-2"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Star className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400" />
            <span className="text-[11px] font-bold font-mono text-amber-400 tracking-wide">
              베스트 타이밍 — 골든크로스 + RSI 과매도 동시 발생
            </span>
          </motion.div>
        )}
        {data.isSuperBuySignal && !data.isBestTiming && (
          <motion.div
            className="bg-green-500/15 border-b border-green-500/30 px-4 py-1.5 flex items-center gap-2"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Zap className="w-3.5 h-3.5 text-green-400 shrink-0" />
            <span className="text-[11px] font-bold font-mono text-green-400 tracking-wide">
              역대급 매수 기회 — 볼린저 하단 + RSI 과매도
            </span>
          </motion.div>
        )}
        {data.crossSignal === "golden" && !data.isBestTiming && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-1 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-bold font-mono text-emerald-400 tracking-wide">
              추세 전환: 강력 매수 신호 — 골든크로스
            </span>
          </div>
        )}
        {data.crossSignal === "dead" && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-1 flex items-center gap-2">
            <TrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-[11px] font-bold font-mono text-red-400 tracking-wide">
              하락 추세: 주의 — 데드크로스
            </span>
          </div>
        )}

        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold tracking-tight font-mono text-foreground">
                  {data.displaySymbol}
                </h2>
                {data.isBestTiming && (
                  <span title="베스트 타이밍">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  </span>
                )}
                <Badge
                  variant={getRsiBadgeVariant(data.rsiSignal)}
                  className="font-sans px-2 text-xs"
                >
                  {getRsiLabel(data.rsiSignal)}
                </Badge>
                {data.crossSignal === "golden" && (
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    골든
                  </span>
                )}
                {data.crossSignal === "dead" && (
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                    데드
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-tight">{data.name}</p>
            </div>
            <div className="text-right shrink-0 ml-2">
              <div className="text-xl font-mono font-bold">
                {formatPrice(data.currentPrice, currency)}
              </div>
              <div className="text-xs text-muted-foreground font-mono">{currency}</div>
              <div
                className={`flex items-center justify-end font-mono text-sm mt-0.5 ${
                  isUp ? "text-up" : "text-down"
                }`}
              >
                <ChangeIcon className="w-3.5 h-3.5 mr-0.5" />
                {formatPercent(data.changePercent)}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 mt-2 bg-background/50 rounded-lg p-3 border border-white/5">
            <div className="space-y-0.5">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="w-3 h-3" /> RSI (14)
              </div>
              <div className="font-mono text-base font-medium">{data.rsi14.toFixed(2)}</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <BarChart2 className="w-3 h-3" /> 거래량
              </div>
              <div className="font-mono text-base font-medium">
                {isIndex ? "—" : formatVolume(data.volume)}
              </div>
            </div>
          </div>

          {/* 차트 / 뉴스 탭 */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "chart" | "news")}
            className="mt-4"
          >
            <TabsList className="w-full h-8 bg-background/50 border border-white/5">
              <TabsTrigger value="chart" className="flex-1 text-xs font-mono gap-1.5 h-full">
                <ChartIcon className="w-3 h-3" /> 차트
              </TabsTrigger>
              <TabsTrigger value="news" className="flex-1 text-xs font-mono gap-1.5 h-full">
                <Newspaper className="w-3 h-3" /> 뉴스
              </TabsTrigger>
            </TabsList>

            {/* 차트 탭 */}
            <TabsContent value="chart" className="mt-0">
              {/* Basic indicators — rendered in user-defined order */}
              {order.basic.map((id) => basicIndicators[id] ?? null)}

              {/* Advanced charts toggle */}
              <button
                onClick={() => setShowAdvanced((v) => !v)}
                className="w-full mt-5 flex items-center justify-center gap-1.5 text-xs font-mono text-muted-foreground/70 hover:text-muted-foreground transition-colors py-2 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/3"
              >
                {showAdvanced ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                {showAdvanced ? "고급 지표 접기" : "볼린저 밴드 · MACD 보기"}
              </button>

              {/* Advanced indicators — rendered in user-defined order */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-6 pt-4 border-t border-white/5">
                      {order.advanced.map((id) => advancedIndicators[id] ?? null)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* 뉴스 탭 */}
            <TabsContent value="news" className="mt-3">
              {newsLoading && (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-1.5 p-3 rounded-lg border border-white/5">
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  ))}
                </div>
              )}

              {newsError && (
                <div className="text-xs font-mono text-destructive/70 text-center py-6">
                  뉴스를 불러오지 못했습니다.
                </div>
              )}

              {!newsLoading && !newsError && (!newsData || newsData.length === 0) && (
                <div className="text-xs font-mono text-muted-foreground/50 text-center py-6">
                  관련 뉴스가 없습니다.
                </div>
              )}

              {!newsLoading && newsData && newsData.length > 0 && (
                <div className="space-y-2">
                  {newsData.map((article, i) => (
                    <a
                      key={i}
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex gap-3 p-2.5 rounded-lg border border-white/5 hover:border-primary/20 hover:bg-primary/5 transition-all"
                    >
                      {article.thumbnail && (
                        <img
                          src={article.thumbnail}
                          alt=""
                          className="w-14 h-14 rounded object-cover shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-snug text-foreground/90 group-hover:text-foreground line-clamp-2 transition-colors">
                          {article.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-muted-foreground/60">
                          <span className="truncate">{article.publisher}</span>
                          <span>·</span>
                          <Clock className="w-2.5 h-2.5 shrink-0" />
                          <span className="shrink-0">
                            {new Date(article.publishedAt).toLocaleDateString("ko-KR", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
