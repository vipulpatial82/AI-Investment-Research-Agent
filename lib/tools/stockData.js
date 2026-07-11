const YAHOO_SEARCH = "https://query1.finance.yahoo.com/v1/finance/search";
const YAHOO_SEARCH_2 = "https://query2.finance.yahoo.com/v1/finance/search";
const YAHOO_QUOTE_V8 = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_QUOTE_V8_2 = "https://query2.finance.yahoo.com/v8/finance/chart";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Origin": "https://finance.yahoo.com",
  "Referer": "https://finance.yahoo.com/",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
};

async function fetchWithTimeout(url, options = {}, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Try query1 first, fall back to query2 on rate-limit/block
async function fetchYahoo(url1, url2, options) {
  const res1 = await fetchWithTimeout(url1, options, 8000);
  if (res1.ok) return res1;
  // 429 or 403 — try the mirror
  return fetchWithTimeout(url2, options, 8000);
}

export async function resolveTicker(companyName) {
  try {
    const params = `?q=${encodeURIComponent(companyName)}&quotesCount=5&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;
    const res = await fetchYahoo(
      `${YAHOO_SEARCH}${params}`,
      `${YAHOO_SEARCH_2}${params}`,
      { headers: HEADERS }
    );
    if (!res.ok) throw new Error(`Yahoo search HTTP ${res.status}`);
    const data = await res.json();
    const quotes = data?.quotes ?? [];
    const equity = quotes.find((q) => q.quoteType === "EQUITY") ?? quotes.find((q) => q.quoteType === "ETF") ?? quotes[0];
    if (!equity) return { note: `No listed ticker found for "${companyName}".` };
    return { ticker: equity.symbol, exchange: equity.exchange, name: equity.longname ?? equity.shortname };
  } catch (err) {
    return { note: `Ticker lookup failed: ${err.message}` };
  }
}

export async function fetchFinancialSnapshot(companyName) {
  const resolved = await resolveTicker(companyName);
  if (!resolved.ticker) {
    return { notes: resolved.note ?? "Could not resolve ticker; qualitative research only." };
  }

  try {
    const params = `/${encodeURIComponent(resolved.ticker)}?interval=1d&range=5d&includePrePost=false`;
    const res = await fetchYahoo(
      `${YAHOO_QUOTE_V8}${params}`,
      `${YAHOO_QUOTE_V8_2}${params}`,
      { headers: HEADERS }
    );
    if (!res.ok) throw new Error(`Yahoo quote HTTP ${res.status}`);
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;

    if (!meta) return { ticker: resolved.ticker, exchange: resolved.exchange, notes: "No quote data returned." };

    return {
      ticker: resolved.ticker,
      exchange: resolved.exchange ?? meta.fullExchangeName ?? meta.exchangeName,
      price: meta.regularMarketPrice ?? null,
      currency: meta.currency ?? null,
      marketCap: meta.marketCap ?? null,
      peRatio: meta.trailingPE ?? null,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
    };
  } catch (err) {
    return { ticker: resolved.ticker, exchange: resolved.exchange, notes: `Quote fetch failed: ${err.message}` };
  }
}
