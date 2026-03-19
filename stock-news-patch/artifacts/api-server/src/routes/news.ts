import { Router, type IRouter } from "express";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });

const router: IRouter = Router();

// Simple in-memory cache: symbol → { items, fetchedAt }
const newsCache = new Map<string, { items: NewsItem[]; fetchedAt: number }>();
const NEWS_CACHE_TTL_MS = 5 * 60 * 1000; // 5분

export interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  publishedAt: string; // ISO string
  thumbnail?: string;
}

router.get("/news/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const key = symbol.toUpperCase();
  const now = Date.now();

  const cached = newsCache.get(key);
  if (cached && now - cached.fetchedAt < NEWS_CACHE_TTL_MS) {
    res.json({ symbol: key, news: cached.items });
    return;
  }

  try {
    // yahoo-finance2 search() returns news articles mixed with quotes
    const result = await yahooFinance.search(key, { newsCount: 10, quotesCount: 0 });
    const rawNews = (result as any).news ?? [];

    const items: NewsItem[] = rawNews.map((n: any) => ({
      title: n.title ?? "",
      publisher: n.publisher ?? "",
      link: n.link ?? "#",
      publishedAt: n.providerPublishTime
        ? new Date(n.providerPublishTime * 1000).toISOString()
        : new Date().toISOString(),
      thumbnail: n.thumbnail?.resolutions?.[0]?.url ?? undefined,
    }));

    newsCache.set(key, { items, fetchedAt: now });
    res.json({ symbol: key, news: items });
  } catch (err) {
    console.error(`Failed to fetch news for ${symbol}:`, err);
    res.status(500).json({ error: "fetch_failed", message: "Failed to fetch news" });
  }
});

export default router;
