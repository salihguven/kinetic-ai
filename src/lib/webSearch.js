// Live public sources used to ground time-sensitive answers.

function stripHtml(text = "") {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, value) => decodeCodePoint(value, 10))
    .replace(/&#x([\da-f]+);/gi, (_, value) => decodeCodePoint(value, 16))
    .trim();
}

function decodeCodePoint(value, radix) {
  const point = Number.parseInt(value, radix);
  return Number.isInteger(point) && point >= 0 && point <= 0x10ffff
    ? String.fromCodePoint(point)
    : "";
}

function extractTag(block, tag) {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(block);
  return match ? stripHtml(match[1]) : "";
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

async function searchGoogleNews(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    `${query} when:7d`
  )}&hl=tr&gl=TR&ceid=TR:tr`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) return [];

    const xml = await response.text();
    const now = Date.now();
    return xml
      .split("<item>")
      .slice(1)
      .map((item) => ({
        title: extractTag(item, "title"),
        url: extractTag(item, "link"),
        date: extractTag(item, "pubDate"),
        source: extractTag(item, "source") || "Google Haberler",
      }))
      .filter((item) => {
        const publishedAt = Date.parse(item.date);
        const age = now - publishedAt;
        return item.title && isHttpsUrl(item.url) && Number.isFinite(publishedAt) &&
          age >= -6 * 60 * 60 * 1000 && age <= 7 * 24 * 60 * 60 * 1000;
      })
      .slice(0, 4);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function searchWikipedia(query) {
  const url = `https://tr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    query
  )}&utf8=&format=json&srlimit=3`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      redirect: "error",
      headers: { "User-Agent": "KineticAI/1.0 (Educational Web App)" },
    });
    if (!response.ok) return [];

    const data = await response.json();
    return (data?.query?.search || []).map((result) => ({
      title: result.title,
      snippet: stripHtml(result.snippet),
      url: `https://tr.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, "_"))}`,
      source: "Wikipedia TR",
      date: null,
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function containsAnyTerm(text, terms) {
  const alternatives = terms
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}_])(?:${alternatives})(?=$|[^\\p{L}\\p{N}_])`, "iu").test(text);
}

const QUERY_STOP_WORDS = new Set([
  "kimdir", "nedir", "nasıl", "nasil", "ne", "kim", "mi", "mı", "mu", "mü",
  "ile", "için", "icin", "hakkında", "hakkinda", "anlat", "bana", "lütfen", "lutfen",
  "what", "who", "where", "when", "why", "how", "does", "did", "is", "are", "the", "a", "an",
  "about", "please", "tell", "me", "explain", "find", "search", "latest", "current", "today",
]);

function normalizedTerms(text = "") {
  return [...new Set(
    text.toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ı/g, "i")
      .match(/[\p{L}\p{N}]+/gu) || []
  )].filter((term) => term.length > 1 && !QUERY_STOP_WORDS.has(term));
}

export function filterRelevantSources(query, sources = []) {
  const terms = normalizedTerms(query);
  if (!terms.length) return [];

  const required = terms.length === 1 ? 1 : Math.max(2, Math.ceil(terms.length * 0.6));
  return sources
    .map((source) => {
      const searchable = normalizedTerms(`${source.title || ""} ${source.snippet || ""}`).join(" ");
      const matchedTerms = terms.filter((term) => new RegExp(`(?:^| )${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?= |$)`, "u").test(searchable));
      return { source, score: matchedTerms.length / terms.length, matched: matchedTerms.length };
    })
    .filter(({ matched }) => matched >= required)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map(({ source }) => source);
}

// Put country-specific dollar names before the generic "dolar" match.
const FX_CURRENCIES = [
  { code: "CAD", names: ["cad", "kanada doları", "kanada dolarını", "kanada dolarının"] },
  { code: "AUD", names: ["aud", "avustralya doları", "avustralya dolarını", "avustralya dolarının"] },
  { code: "USD", names: ["usd", "dolar", "dolara", "doları", "doların", "dolardan", "dollar"] },
  { code: "EUR", names: ["eur", "euro", "avro"] },
  { code: "GBP", names: ["gbp", "sterlin", "sterlini", "pound"] },
  { code: "CHF", names: ["chf", "isviçre frangı", "isviçre frangını", "frank"] },
  { code: "JPY", names: ["jpy", "yen"] },
];

function getExchangeRateCurrency(query) {
  const asksForRate = containsAnyTerm(query, [
    "kur", "kuru", "kurlar", "döviz", "exchange", "rate", "kaç", "kac",
    "ne kadar", "how much", "today", "bugün", "bugun", "güncel", "guncel",
    "current", "now", "value", "quote", "fiyat", "price", "tl", "try",
    "alış", "alıs", "satış", "satis", "buy", "sell",
  ]);
  if (!asksForRate) return null;
  return FX_CURRENCIES.find(({ names }) => containsAnyTerm(query, names)) || null;
}

async function searchOfficialExchangeRate(currency) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);

  try {
    const response = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", {
      signal: controller.signal,
      cache: "no-store",
      redirect: "error",
      headers: { "User-Agent": "KineticAI/1.0 (official exchange-rate lookup)" },
    });
    if (!response.ok) return null;

    const xml = await response.text();
    const date = /<Tarih_Date\b[^>]*\bTarih="([^"]+)"/i.exec(xml)?.[1] || null;
    const entryPattern = new RegExp(`<Currency\\b[^>]*\\bCurrencyCode="${currency.code}"[^>]*>([\\s\\S]*?)<\\/Currency>`, "i");
    const block = entryPattern.exec(xml)?.[1];
    if (!block || !date) return null;

    const read = (tag) => new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i").exec(block)?.[1]?.trim() || null;
    const buying = read("ForexBuying");
    const selling = read("ForexSelling");
    const unit = read("Unit");
    if (!buying && !selling) return null;

    return {
      title: `${currency.code}/TRY gösterge kuru · ${date}`,
      snippet: `TCMB günlük gösterge kuru. Döviz alış: ${buying || "veri yok"} TRY; döviz satış: ${selling || "veri yok"} TRY. Birim: ${unit || "1"} ${currency.code}. Bu anlık piyasa fiyatı veya banka işlem teklifi değildir.`,
      url: "https://www.tcmb.gov.tr/kurlar/today.xml",
      source: "Türkiye Cumhuriyet Merkez Bankası (TCMB)",
      date,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function isTimeSensitiveQuery(query = "") {
  return containsAnyTerm(query, [
    "today", "now", "current", "currently", "latest", "recent", "this week", "this month",
    "bugün", "bugun", "şimdi", "simdi", "güncel", "guncel", "son durum", "son dakika",
    "bu hafta", "bu ay", "kur", "kuru", "kurlar", "döviz", "borsa", "hisse", "stock",
    "altın", "altin", "gold", "bitcoin", "ethereum", "crypto", "kripto", "score", "skor",
    "haber", "news", "hava durumu", "weather", "forecast", "price", "fiyat", "faiz",
    "seçim", "secim", "election", "başkan", "baskan", "bakan", "regulation", "mevzuat",
    "yasa", "law",
  ]);
}

export async function searchLiveWeb(query, { includeNews = false } = {}) {
  if (!query || query.trim().length < 2) return null;

  const currency = getExchangeRateCurrency(query);
  if (currency) {
    // Never substitute a news headline for a current exchange-rate quote.
    const rate = await searchOfficialExchangeRate(currency);
    return rate ? { sources: [rate], contextText: formatSourceContext([rate]) } : null;
  }

  const [newsResult, wikiResult] = await Promise.allSettled([
    includeNews ? searchGoogleNews(query) : Promise.resolve([]),
    searchWikipedia(query),
  ]);
  const news = newsResult.status === "fulfilled" ? newsResult.value : [];
  const wiki = wikiResult.status === "fulfilled" ? wikiResult.value : [];
  const sources = filterRelevantSources(query, [...news, ...wiki]);
  if (sources.length === 0) return null;

  return { sources, contextText: formatSourceContext(sources) };
}

function formatSourceContext(sources) {
  const formatted = sources
    .map((source, index) => {
      const extra = source.snippet ? `\nÖzet: ${source.snippet}` : "";
      const date = source.date ? `\nTarih: ${source.date}` : "";
      return `[${index + 1}] ${source.title} (${source.source})${date}${extra}\nKaynak URL: ${source.url}`;
    })
    .join("\n\n");
  return `<UNTRUSTED_WEB_RESULTS>\n${formatted}\n</UNTRUSTED_WEB_RESULTS>`;
}
