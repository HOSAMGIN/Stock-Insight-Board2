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
