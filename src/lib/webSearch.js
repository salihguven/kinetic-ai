// src/lib/webSearch.js

function stripHtml(text = "") {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function extractTag(block, tag) {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(block);
  return match ? stripHtml(match[1]) : "";
}

async function searchGoogleNews(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    query
  )}&hl=tr&gl=TR&ceid=TR:tr`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return [];

    const xml = await res.text();
    const items = xml.split("<item>").slice(1, 5);
    return items
      .map((item) => ({
        title: extractTag(item, "title"),
        url: extractTag(item, "link"),
        date: extractTag(item, "pubDate"),
        source: extractTag(item, "source") || "Google Haberler",
      }))
      .filter((i) => i.title && i.url);
  } catch {
    clearTimeout(timer);
    return [];
  }
}

async function searchWikipedia(query) {
  const url = `https://tr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    query
  )}&utf8=&format=json&srlimit=3`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "KineticAI/1.0 (Educational Web App)" },
    });
    clearTimeout(timer);
    if (!res.ok) return [];

    const data = await res.json();
    const results = data?.query?.search || [];
    return results.map((r) => ({
      title: r.title,
      snippet: stripHtml(r.snippet),
      url: `https://tr.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
      source: "Wikipedia TR",
    }));
  } catch {
    clearTimeout(timer);
    return [];
  }
}

export async function searchLiveWeb(query) {
  if (!query || query.trim().length < 2) return null;

  const [newsRes, wikiRes] = await Promise.allSettled([
    searchGoogleNews(query),
    searchWikipedia(query),
  ]);

  const news = newsRes.status === "fulfilled" ? newsRes.value : [];
  const wiki = wikiRes.status === "fulfilled" ? wikiRes.value : [];
  const combined = [...news, ...wiki];

  if (combined.length === 0) return null;

  const formatted = combined
    .map((item, idx) => {
      const extra = item.snippet ? `\nÖzet: ${item.snippet}` : item.date ? `\nTarih: ${item.date}` : "";
      return `[${idx + 1}] ${item.title} (${item.source})${extra}\nKaynak URL: ${item.url}`;
    })
    .join("\n\n");

  return {
    contextText: formatted,
    sourcesCount: combined.length,
  };
}