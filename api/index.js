// api/index.js - Vercel Serverless Function
// Uses native https to call Yahoo Finance directly (no external deps for finance data)

const express = require("express");
const cors = require("cors");
const https = require("https");

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "OPTIONS"] }));
app.options("*", cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Symbols ────────────────────────────────────────────────────────────────

const SYMBOLS = ["SOXL","TSLL","NVDA","TSLA","000660.KS","005930.KS","005380.KS","^KS11","^GSPC","^NDX"];
const SYMBOL_NAMES = {
  SOXL:"Direxion Daily Semiconductors Bull 3X", TSLL:"Direxion Daily TSLA Bull 2X",
  NVDA:"NVIDIA Corporation", TSLA:"Tesla, Inc.",
  "000660.KS":"SK하이닉스", "005930.KS":"삼성전자", "005380.KS":"현대자동차",
  "^KS11":"KOSPI", "^GSPC":"S&P 500", "^NDX":"NASDAQ 100",
};
const SYMBOL_DISPLAY = {
  SOXL:"SOXL", TSLL:"TSLL", NVDA:"NVDA", TSLA:"TSLA",
  "000660.KS":"하이닉스", "005930.KS":"삼성전자", "005380.KS":"현대차",
  "^KS11":"KOSPI", "^GSPC":"S&P500", "^NDX":"NDX100",
};
const SYMBOL_CATEGORY = {
  SOXL:"us-stocks", TSLL:"us-stocks", NVDA:"us-stocks", TSLA:"us-stocks",
  "000660.KS":"kr-stocks", "005930.KS":"kr-stocks", "005380.KS":"kr-stocks",
  "^KS11":"indices", "^GSPC":"indices", "^NDX":"indices",
};

// ── HTTP helper ────────────────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
    };
    https.get(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("JSON parse failed: " + data.slice(0, 200))); }
      });
    }).on("error", reject);
  });
}

// ── Yahoo Finance v8 API ───────────────────────────────────────────────────

async function fetchQuote(symbol) {
  const enc = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${enc}?interval=1d&range=6mo`;
  const data = await httpsGet(url);
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);
  return result;
}

// ── Technical indicators ───────────────────────────────────────────────────

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  const gains = [], losses = [];
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gains.push(d > 0 ? d : 0);
    losses.push(d < 0 ? -d : 0);
  }
  let ag = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let al = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < gains.length; i++) {
    ag = (ag * (period - 1) + gains[i]) / period;
    al = (al * (period - 1) + losses[i]) / period;
  }
  if (al === 0) return 100;
  return Math.round((100 - 100 / (1 + ag / al)) * 100) / 100;
}

function calcSMA(closes, period) {
  if (closes.length < period) return null;
  return closes.slice(closes.length - period).reduce((a, b) => a + b, 0) / period;
}

function calcEMA(closes, period) {
  const k = 2 / (period + 1);
  const emas = [closes[0]];
  for (let i = 1; i < closes.length; i++) emas.push(closes[i] * k + emas[i - 1] * (1 - k));
  return emas;
}

function calcBB(closes, period = 20, mult = 2) {
  if (closes.length < period) return null;
  const sl = closes.slice(closes.length - period);
  const sma = sl.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(sl.reduce((acc, v) => acc + (v - sma) ** 2, 0) / period);
  return { upper: sma + mult * std, middle: sma, lower: sma - mult * std };
}

function calcMACD(closes) {
  if (closes.length < 35) return { macdLine: 0, signalLine: 0, histogram: 0 };
  const e12 = calcEMA(closes, 12), e26 = calcEMA(closes, 26);
  const mv = e12.map((v, i) => v - e26[i]);
  const sv = calcEMA(mv, 9);
  const l = mv.length - 1;
  const ml = Math.round(mv[l] * 10000) / 10000;
  const sl2 = Math.round(sv[l] * 10000) / 10000;
  return { macdLine: ml, signalLine: sl2, histogram: Math.round((ml - sl2) * 10000) / 10000 };
}

function detectCross(m20, m60) {
  const len = Math.min(m20.length, m60.length);
  if (len < 2) return "none";
  const start = Math.max(1, len - 5);
  for (let i = len - 1; i >= start; i--) {
    const p20 = m20[i-1], p60 = m60[i-1], c20 = m20[i], c60 = m60[i];
    if (p20 == null || p60 == null || c20 == null || c60 == null) continue;
    if (p20 <= p60 && c20 > c60) return "golden";
    if (p20 >= p60 && c20 < c60) return "dead";
  }
  return "none";
}

function buildHistory(sorted) {
  const closes = sorted.map(d => d.close);
  const e12 = calcEMA(closes, 12), e26 = calcEMA(closes, 26);
  const macdAll = e12.map((v, i) => v - e26[i]);
  const sigAll = calcEMA(macdAll, 9);
  const ma20S = closes.map((_, i) => calcSMA(closes.slice(0, i + 1), 20));
  const ma60S = closes.map((_, i) => calcSMA(closes.slice(0, i + 1), 60));
  return sorted.slice(-30).map(d => {
    const gi = sorted.indexOf(d), cu = closes.slice(0, gi + 1);
    const s20 = calcSMA(cu, 20) ?? d.close, s60 = calcSMA(cu, 60) ?? d.close;
    const bb = calcBB(cu, 20) ?? { upper: s20, middle: s20, lower: s20 };
    const ml = Math.round(macdAll[gi] * 10000) / 10000;
    const sl2 = Math.round(sigAll[gi] * 10000) / 10000;
    const p20 = gi > 0 ? ma20S[gi-1] : null, p60 = gi > 0 ? ma60S[gi-1] : null;
    const c20 = ma20S[gi], c60 = ma60S[gi];
    return {
      date: new Date(d.timestamp * 1000).toISOString().split("T")[0],
      close: Math.round(d.close * 100) / 100,
      ma20: Math.round(s20 * 100) / 100, ma60: Math.round(s60 * 100) / 100,
      deviationPercent: Math.round((s20 ? ((d.close - s20) / s20) * 100 : 0) * 100) / 100,
      bbUpper: Math.round(bb.upper * 100) / 100,
      bbMiddle: Math.round(bb.middle * 100) / 100,
      bbLower: Math.round(bb.lower * 100) / 100,
      macdLine: ml, signalLine: sl2,
      macdHistogram: Math.round((ml - sl2) * 10000) / 10000,
      isGoldenCrossPoint: !!(p20 != null && p60 != null && c20 != null && c60 != null && p20 <= p60 && c20 > c60),
      isDeadCrossPoint: !!(p20 != null && p60 != null && c20 != null && c60 != null && p20 >= p60 && c20 < c60),
    };
  });
}

// ── Main fetch ─────────────────────────────────────────────────────────────

async function fetchStockData(symbol) {
  const result = await fetchQuote(symbol);
  const meta = result.meta;
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];

  // Build sorted array filtering out nulls
  const sorted = timestamps
    .map((ts, i) => ({ timestamp: ts, close: closes[i] }))
    .filter(d => d.close != null && !isNaN(d.close));

  if (sorted.length === 0) throw new Error(`No valid closes for ${symbol}`);

  const closesArr = sorted.map(d => d.close);
  const rsi14 = calcRSI(closesArr);
  const ma20Val = calcSMA(closesArr, 20) ?? closesArr[closesArr.length - 1];
  const ma60Val = calcSMA(closesArr, 60) ?? closesArr[closesArr.length - 1];
  const cur = meta.regularMarketPrice ?? closesArr[closesArr.length - 1];
  const prev = meta.previousClose ?? meta.chartPreviousClose ?? closesArr[closesArr.length - 2] ?? cur;
  const bb = calcBB(closesArr, 20) ?? { upper: ma20Val, middle: ma20Val, lower: ma20Val };
  const macd = calcMACD(closesArr);
  const m20S = closesArr.map((_, i) => calcSMA(closesArr.slice(0, i + 1), 20));
  const m60S = closesArr.map((_, i) => calcSMA(closesArr.slice(0, i + 1), 60));
  const cross = detectCross(m20S, m60S);

  return {
    symbol,
    displaySymbol: SYMBOL_DISPLAY[symbol] ?? symbol,
    name: SYMBOL_NAMES[symbol] ?? (meta.shortName ?? symbol),
    category: SYMBOL_CATEGORY[symbol] ?? "us-stocks",
    currentPrice: Math.round(cur * 100) / 100,
    previousClose: Math.round(prev * 100) / 100,
    changePercent: Math.round((prev ? ((cur - prev) / prev) * 100 : 0) * 100) / 100,
    rsi14, rsiSignal: rsi14 < 30 ? "buy" : rsi14 >= 70 ? "sell" : "neutral",
    ma20: Math.round(ma20Val * 100) / 100,
    ma60: Math.round(ma60Val * 100) / 100,
    ma20DeviationPercent: Math.round((ma20Val ? ((cur - ma20Val) / ma20Val) * 100 : 0) * 100) / 100,
    bbUpper: Math.round(bb.upper * 100) / 100,
    bbMiddle: Math.round(bb.middle * 100) / 100,
    bbLower: Math.round(bb.lower * 100) / 100,
    isTouchingLowerBand: cur <= bb.lower,
    isSuperBuySignal: cur <= bb.lower && rsi14 < 30,
    macdLine: macd.macdLine, signalLine: macd.signalLine, macdHistogram: macd.histogram,
    crossSignal: cross,
    isBestTiming: rsi14 < 30 && cross === "golden",
    historicalPrices: buildHistory(sorted),
    lastUpdated: new Date().toISOString(),
    volume: meta.regularMarketVolume ?? 0,
    currency: meta.currency ?? (symbol.endsWith(".KS") ? "KRW" : "USD"),
  };
}

// ── Cache ──────────────────────────────────────────────────────────────────

let cache = null;
const CACHE_TTL = 60000;
const dynCache = new Map();
const DYN_TTL = 120000;

async function getAllStocks() {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL) return cache.data;
  const results = await Promise.allSettled(SYMBOLS.map(s => fetchStockData(s)));
  const errors = [];
  const data = results.reduce((acc, r) => {
    if (r.status === "fulfilled") acc.push(r.value);
    else { const msg = r.reason?.message ?? String(r.reason); errors.push(msg); console.error("Fetch failed:", msg); }
    return acc;
  }, []);
  if (data.length === 0) throw new Error("All symbols failed. Error: " + errors[0]);
  cache = { data, fetchedAt: now };
  return data;
}

async function getStockBySymbol(symbol) {
  const all = await getAllStocks();
  const found = all.find(s => s.symbol === symbol || s.symbol.toUpperCase() === symbol || s.displaySymbol === symbol);
  if (found) return found;
  const key = symbol.toUpperCase(), now = Date.now();
  const cached = dynCache.get(key);
  if (cached && now - cached.fetchedAt < DYN_TTL) return cached.data;
  try { const data = await fetchStockData(symbol); dynCache.set(key, { data, fetchedAt: now }); return data; }
  catch (e) { console.error("Dynamic fetch failed:", e); return null; }
}


// ── News ───────────────────────────────────────────────────────────────────

const newsCache = new Map();
const NEWS_TTL = 5 * 60 * 1000;

async function fetchNews(symbol) {
  const now = Date.now();
  const cached = newsCache.get(symbol);
  if (cached && now - cached.fetchedAt < NEWS_TTL) return cached.items;

  const enc = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${enc}&newsCount=10&quotesCount=0&enableFuzzyQuery=false`;
  const data = await httpsGet(url);
  const rawNews = data?.news ?? [];

  const items = rawNews.map(n => ({
    title: n.title ?? "",
    publisher: n.publisher ?? "",
    link: n.link ?? "#",
    publishedAt: n.providerPublishTime
      ? new Date(n.providerPublishTime * 1000).toISOString()
      : new Date().toISOString(),
    thumbnail: n.thumbnail?.resolutions?.[0]?.url ?? undefined,
  }));

  newsCache.set(symbol, { items, fetchedAt: now });
  return items;
}

// ── Routes ─────────────────────────────────────────────────────────────────

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.get("/api/stocks", async (_req, res) => {
  try {
    const stocks = await getAllStocks();
    res.json({
      stocks, lastUpdated: new Date().toISOString(),
      superBuySignals: stocks.filter(s => s.isSuperBuySignal).map(s => s.displaySymbol),
      goldenCrossSignals: stocks.filter(s => s.crossSignal === "golden").map(s => s.displaySymbol),
      deadCrossSignals: stocks.filter(s => s.crossSignal === "dead").map(s => s.displaySymbol),
      bestTimingSignals: stocks.filter(s => s.isBestTiming).map(s => s.displaySymbol),
    });
  } catch (err) {
    console.error("stocks error:", err);
    res.status(500).json({ error: "fetch_failed", message: err.message });
  }
});

app.get("/api/stocks/:symbol", async (req, res) => {
  try {
    const stock = await getStockBySymbol(req.params.symbol.toUpperCase());
    if (!stock) return res.status(404).json({ error: "not_found" });
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: "fetch_failed", message: err.message });
  }
});


app.get("/api/news/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const news = await fetchNews(symbol);
    res.json({ symbol, news });
  } catch (err) {
    console.error("news error:", err);
    res.status(500).json({ error: "fetch_failed", message: err.message });
  }
});

app.get("/", (_req, res) => res.json({
  message: "Stock Insight Board API", version: "1.0.0",
  endpoints: ["/api/healthz", "/api/stocks", "/api/stocks/:symbol", "/api/news/:symbol"],
}));

module.exports = app;
