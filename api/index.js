// api/index.js - Vercel Serverless Function Entry Point
// All dependencies are inlined to avoid module resolution issues on Vercel

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Stock symbols & metadata ───────────────────────────────────────────────

const SYMBOLS = [
  "SOXL",
  "TSLL",
  "NVDA",
  "TSLA",
  "000660.KS",
  "005930.KS",
  "005380.KS",
  "^KS11",
  "^GSPC",
  "^NDX",
];

const SYMBOL_NAMES = {
  SOXL: "Direxion Daily Semiconductors Bull 3X",
  TSLL: "Direxion Daily TSLA Bull 2X",
  NVDA: "NVIDIA Corporation",
  TSLA: "Tesla, Inc.",
  "000660.KS": "SK하이닉스",
  "005930.KS": "삼성전자",
  "005380.KS": "현대자동차",
  "^KS11": "KOSPI",
  "^GSPC": "S&P 500",
  "^NDX": "NASDAQ 100",
};

const SYMBOL_DISPLAY = {
  SOXL: "SOXL",
  TSLL: "TSLL",
  NVDA: "NVDA",
  TSLA: "TSLA",
  "000660.KS": "하이닉스",
  "005930.KS": "삼성전자",
  "005380.KS": "현대차",
  "^KS11": "KOSPI",
  "^GSPC": "S&P500",
  "^NDX": "NDX100",
};

const SYMBOL_CATEGORY = {
  SOXL: "us-stocks",
  TSLL: "us-stocks",
  NVDA: "us-stocks",
  TSLA: "us-stocks",
  "000660.KS": "kr-stocks",
  "005930.KS": "kr-stocks",
  "005380.KS": "kr-stocks",
  "^KS11": "indices",
  "^GSPC": "indices",
  "^NDX": "indices",
};

// ── Technical indicator helpers ────────────────────────────────────────────

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  const gains = [];
  const losses = [];
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }
  if (avgLoss === 0) return 100;
  return Math.round((100 - 100 / (1 + avgGain / avgLoss)) * 100) / 100;
}

function calcSMA(closes, period) {
  if (closes.length < period) return null;
  const slice = closes.slice(closes.length - period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calcEMA(closes, period) {
  const k = 2 / (period + 1);
  const emas = [];
  let ema = closes[0];
  emas.push(ema);
  for (let i = 1; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    emas.push(ema);
  }
  return emas;
}

function calcBollingerBands(closes, period = 20, multiplier = 2) {
  if (closes.length < period) return null;
  const slice = closes.slice(closes.length - period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((acc, val) => acc + (val - sma) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);
  return {
    upper: sma + multiplier * stdDev,
    middle: sma,
    lower: sma - multiplier * stdDev,
  };
}

function calcMACD(closes) {
  if (closes.length < 35) {
    return { macdLine: 0, signalLine: 0, histogram: 0 };
  }
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdValues = ema12.map((v, i) => v - ema26[i]);
  const signalValues = calcEMA(macdValues, 9);
  const last = macdValues.length - 1;
  const macdLine = Math.round(macdValues[last] * 10000) / 10000;
  const signalLine = Math.round(signalValues[last] * 10000) / 10000;
  return {
    macdLine,
    signalLine,
    histogram: Math.round((macdLine - signalLine) * 10000) / 10000,
  };
}

function detectCrossSignal(ma20Series, ma60Series) {
  const LOOKBACK = 5;
  const len = Math.min(ma20Series.length, ma60Series.length);
  if (len < 2) return "none";

  const start = Math.max(1, len - LOOKBACK);
  for (let i = len - 1; i >= start; i--) {
    const prevMa20 = ma20Series[i - 1];
    const prevMa60 = ma60Series[i - 1];
    const currMa20 = ma20Series[i];
    const currMa60 = ma60Series[i];
    if (prevMa20 == null || prevMa60 == null || currMa20 == null || currMa60 == null) continue;

    if (prevMa20 <= prevMa60 && currMa20 > currMa60) return "golden";
    if (prevMa20 >= prevMa60 && currMa20 < currMa60) return "dead";
  }
  return "none";
}

function buildHistoricalPoints(sorted) {
  const closes = sorted.map((d) => d.close);

  const ema12All = calcEMA(closes, 12);
  const ema26All = calcEMA(closes, 26);
  const macdAll = ema12All.map((v, i) => v - ema26All[i]);
  const signalAll = calcEMA(macdAll, 9);

  const last30 = sorted.slice(-30);

  const ma20Series = closes.map((_, i) => calcSMA(closes.slice(0, i + 1), 20));
  const ma60Series = closes.map((_, i) => calcSMA(closes.slice(0, i + 1), 60));

  return last30.map((d) => {
    const globalIdx = sorted.indexOf(d);
    const closesUpTo = closes.slice(0, globalIdx + 1);

    const sma20 = calcSMA(closesUpTo, 20) ?? d.close;
    const sma60 = calcSMA(closesUpTo, 60) ?? d.close;
    const dev = sma20 ? ((d.close - sma20) / sma20) * 100 : 0;

    const bb = calcBollingerBands(closesUpTo, 20) ?? { upper: sma20, middle: sma20, lower: sma20 };

    const macdLine = Math.round(macdAll[globalIdx] * 10000) / 10000;
    const signalLine = Math.round(signalAll[globalIdx] * 10000) / 10000;

    const prevMa20 = globalIdx > 0 ? ma20Series[globalIdx - 1] : null;
    const prevMa60 = globalIdx > 0 ? ma60Series[globalIdx - 1] : null;
    const currMa20 = ma20Series[globalIdx];
    const currMa60 = ma60Series[globalIdx];

    const isGoldenCrossPoint = !!(
      prevMa20 != null && prevMa60 != null && currMa20 != null && currMa60 != null &&
      prevMa20 <= prevMa60 && currMa20 > currMa60
    );
    const isDeadCrossPoint = !!(
      prevMa20 != null && prevMa60 != null && currMa20 != null && currMa60 != null &&
      prevMa20 >= prevMa60 && currMa20 < currMa60
    );

    return {
      date: d.date instanceof Date ? d.date.toISOString().split("T")[0] : String(d.date).split("T")[0],
      close: Math.round(d.close * 100) / 100,
      ma20: Math.round(sma20 * 100) / 100,
      ma60: Math.round(sma60 * 100) / 100,
      deviationPercent: Math.round(dev * 100) / 100,
      bbUpper: Math.round(bb.upper * 100) / 100,
      bbMiddle: Math.round(bb.middle * 100) / 100,
      bbLower: Math.round(bb.lower * 100) / 100,
      macdLine,
      signalLine,
      macdHistogram: Math.round((macdLine - signalLine) * 10000) / 10000,
      isGoldenCrossPoint,
      isDeadCrossPoint,
    };
  });
}

// ── Yahoo Finance fetch ────────────────────────────────────────────────────

async function fetchStockData(symbol) {
  // Dynamic import to handle ESM-only yahoo-finance2
  const { default: yahooFinance } = await import("yahoo-finance2");

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 120);

  const [quote, historical] = await Promise.all([
    yahooFinance.quote(symbol),
    yahooFinance.historical(symbol, {
      period1: startDate.toISOString().split("T")[0],
      period2: endDate.toISOString().split("T")[0],
      interval: "1d",
    }),
  ]);

  const sorted = historical
    .filter((d) => d.close != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((d) => ({ date: d.date, close: d.close }));

  const closes = sorted.map((d) => d.close);

  const rsi14 = calcRSI(closes);
  const rsiSignal = rsi14 < 30 ? "buy" : rsi14 >= 70 ? "sell" : "neutral";

  const ma20Val = calcSMA(closes, 20) ?? closes[closes.length - 1] ?? 0;
  const ma60Val = calcSMA(closes, 60) ?? closes[closes.length - 1] ?? 0;

  const currentPrice = quote.regularMarketPrice ?? closes[closes.length - 1] ?? 0;
  const previousClose = quote.regularMarketPreviousClose ?? closes[closes.length - 2] ?? 0;
  const changePercent = previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : 0;
  const ma20Deviation = ma20Val ? ((currentPrice - ma20Val) / ma20Val) * 100 : 0;

  const bb = calcBollingerBands(closes, 20) ?? { upper: ma20Val, middle: ma20Val, lower: ma20Val };
  const isTouchingLowerBand = currentPrice <= bb.lower;
  const isSuperBuySignal = isTouchingLowerBand && rsi14 < 30;

  const macd = calcMACD(closes);

  const ma20Series = closes.map((_, i) => calcSMA(closes.slice(0, i + 1), 20));
  const ma60Series = closes.map((_, i) => calcSMA(closes.slice(0, i + 1), 60));
  const crossSignal = detectCrossSignal(ma20Series, ma60Series);
  const isBestTiming = rsi14 < 30 && crossSignal === "golden";

  const historicalPrices = buildHistoricalPoints(sorted);
  const currency = quote.currency ?? (symbol.endsWith(".KS") ? "KRW" : "USD");

  return {
    symbol,
    displaySymbol: SYMBOL_DISPLAY[symbol] ?? symbol,
    name: SYMBOL_NAMES[symbol] ?? symbol,
    category: SYMBOL_CATEGORY[symbol] ?? "us-stocks",
    currentPrice: Math.round(currentPrice * 100) / 100,
    previousClose: Math.round(previousClose * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    rsi14,
    rsiSignal,
    ma20: Math.round(ma20Val * 100) / 100,
    ma60: Math.round(ma60Val * 100) / 100,
    ma20DeviationPercent: Math.round(ma20Deviation * 100) / 100,
    bbUpper: Math.round(bb.upper * 100) / 100,
    bbMiddle: Math.round(bb.middle * 100) / 100,
    bbLower: Math.round(bb.lower * 100) / 100,
    isTouchingLowerBand,
    isSuperBuySignal,
    macdLine: macd.macdLine,
    signalLine: macd.signalLine,
    macdHistogram: macd.histogram,
    crossSignal,
    isBestTiming,
    historicalPrices,
    lastUpdated: new Date().toISOString(),
    volume: quote.regularMarketVolume ?? 0,
    currency,
  };
}

// ── Cache ──────────────────────────────────────────────────────────────────

let cache = null;
const CACHE_TTL_MS = 60 * 1000;

const dynamicCache = new Map();
const DYNAMIC_CACHE_TTL_MS = 120 * 1000;

async function getAllStocks() {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache.data;

  const results = await Promise.allSettled(SYMBOLS.map((s) => fetchStockData(s)));
  const data = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);

  results
    .filter((r) => r.status === "rejected")
    .forEach((r) => console.error("Failed to fetch symbol:", r.reason));

  cache = { data, fetchedAt: now };
  return data;
}

async function getStockBySymbol(symbol) {
  const all = await getAllStocks();
  const found = all.find(
    (s) =>
      s.symbol === symbol ||
      s.symbol.toUpperCase() === symbol.toUpperCase() ||
      s.displaySymbol === symbol
  );
  if (found) return found;

  const cacheKey = symbol.toUpperCase();
  const now = Date.now();
  const cached = dynamicCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < DYNAMIC_CACHE_TTL_MS) return cached.data;

  try {
    const data = await fetchStockData(symbol);
    dynamicCache.set(cacheKey, { data, fetchedAt: now });
    return data;
  } catch (err) {
    console.error(`Dynamic fetch failed for ${symbol}:`, err);
    return null;
  }
}

// ── Routes ─────────────────────────────────────────────────────────────────

// Health check
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Get all stocks
app.get("/api/stocks", async (_req, res) => {
  try {
    const stocks = await getAllStocks();
    const superBuySignals = stocks.filter((s) => s.isSuperBuySignal).map((s) => s.displaySymbol);
    const goldenCrossSignals = stocks.filter((s) => s.crossSignal === "golden").map((s) => s.displaySymbol);
    const deadCrossSignals = stocks.filter((s) => s.crossSignal === "dead").map((s) => s.displaySymbol);
    const bestTimingSignals = stocks.filter((s) => s.isBestTiming).map((s) => s.displaySymbol);
    res.json({
      stocks,
      lastUpdated: new Date().toISOString(),
      superBuySignals,
      goldenCrossSignals,
      deadCrossSignals,
      bestTimingSignals,
    });
  } catch (err) {
    console.error("Failed to fetch stocks:", err);
    res.status(500).json({ error: "fetch_failed", message: "Failed to fetch stock data" });
  }
});

// Get stock by symbol
app.get("/api/stocks/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const stock = await getStockBySymbol(symbol.toUpperCase());
    if (!stock) {
      res.status(404).json({ error: "not_found", message: `Symbol ${symbol} not found` });
      return;
    }
    res.json(stock);
  } catch (err) {
    console.error("Failed to fetch stock:", err);
    res.status(500).json({ error: "fetch_failed", message: "Failed to fetch stock data" });
  }
});

// Root
app.get("/", (_req, res) => {
  res.json({ message: "Stock Insight Board API", version: "1.0.0", endpoints: ["/api/healthz", "/api/stocks", "/api/stocks/:symbol"] });
});

module.exports = app;
