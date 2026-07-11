const DDG_URL = "https://api.duckduckgo.com/";

async function fetchWithTimeout(url, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function webSearch(query, maxResults = 4) {
  try {
    // DuckDuckGo Instant Answer API (free, no key)
    const url = `${DDG_URL}?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetchWithTimeout(url, 8000);
    if (!res.ok) throw new Error(`DDG HTTP ${res.status}`);
    const data = await res.json();

    const sources = [];

    // RelatedTopics give us the best structured results
    const topics = data.RelatedTopics ?? [];
    for (const t of topics) {
      if (sources.length >= maxResults) break;
      if (t.FirstURL && t.Text) {
        sources.push({ title: t.Text.slice(0, 120), url: t.FirstURL, snippet: t.Text });
      } else if (t.Topics) {
        for (const sub of t.Topics) {
          if (sources.length >= maxResults) break;
          if (sub.FirstURL && sub.Text) {
            sources.push({ title: sub.Text.slice(0, 120), url: sub.FirstURL, snippet: sub.Text });
          }
        }
      }
    }

    // Also use the Abstract if available
    if (data.AbstractURL && data.AbstractText) {
      sources.unshift({ title: data.Heading ?? query, url: data.AbstractURL, snippet: data.AbstractText });
      if (sources.length > maxResults) sources.length = maxResults;
    }

    // If DDG instant answers gave nothing, fall back to HTML scrape via search
    if (sources.length === 0) {
      return await ddgHtmlSearch(query, maxResults);
    }

    const answerText = sources
      .map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet ?? ""}`)
      .join("\n\n");

    return { ok: true, query, answerText, sources };
  } catch (err) {
    // Try HTML fallback before giving up
    try {
      return await ddgHtmlSearch(query, maxResults);
    } catch {
      return {
        ok: false, query, answerText: "", sources: [],
        note: `Web search failed: ${err.message}. Falling back to model knowledge.`,
      };
    }
  }
}

// DuckDuckGo HTML search scraper — parses the lite HTML endpoint
async function ddgHtmlSearch(query, maxResults = 4) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetchWithTimeout(url, 8000);
  if (!res.ok) throw new Error(`DDG HTML ${res.status}`);
  const html = await res.text();

  const sources = [];
  // Extract result titles + URLs from DDG HTML response
  const resultRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
  const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([^<]+)<\/a>/g;

  const urls = [];
  const titles = [];
  const snippets = [];

  let m;
  while ((m = resultRegex.exec(html)) !== null) {
    urls.push(decodeURIComponent(m[1].replace("/l/?uddg=", "").split("&")[0]));
    titles.push(m[2].trim());
  }
  while ((m = snippetRegex.exec(html)) !== null) {
    snippets.push(m[1].trim());
  }

  for (let i = 0; i < Math.min(urls.length, maxResults); i++) {
    sources.push({ title: titles[i] ?? urls[i], url: urls[i], snippet: snippets[i] ?? "" });
  }

  if (sources.length === 0) {
    return { ok: false, query, answerText: "", sources: [], note: "DuckDuckGo returned no results. Using model knowledge." };
  }

  const answerText = sources.map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}`).join("\n\n");
  return { ok: true, query, answerText, sources };
}
