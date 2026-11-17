const SECTION_HEADING = /^[\p{Lu}\d][\p{Lu}\d\s&/·():-]{3,}$/u;

export function formatLegacyUpdateBody(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => {
      const text = line.trim();
      if (!text) return "";
      if (SECTION_HEADING.test(text)) return `## ${text}`;
      if (/^[•·]\s*/.test(text)) return `- ${text.replace(/^[•·]\s*/, "")}`;
      return text;
    })
    .join("\n");
}

function makeSummary(description) {
  const firstParagraph = description.split(/\n\s*\n/).map((part) => part.trim()).find(Boolean) || description;
  if (firstParagraph.length <= 260) return firstParagraph;
  const clipped = firstParagraph.slice(0, 257);
  return `${clipped.slice(0, clipped.lastIndexOf(" "))}…`;
}

export function normalizeUpdateVideo(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("..") && !raw.includes("\\") && /\.(?:mp4|webm|ogv)(?:\?[a-z0-9=&._-]*)?$/i.test(raw)) return raw;
  const firebaseVideo = normalizeFirebaseDownloadUrl(raw, /\.(?:mp4|webm|ogv)$/i);
  if (firebaseVideo) return firebaseVideo;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return "";
    const host = url.hostname.toLowerCase();
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
      const id = url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})\/?$/)?.[1];
      return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : "";
    }
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] || "";
      return /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : "";
    }
    if (host === "vimeo.com" || host === "www.vimeo.com" || host === "player.vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean).at(-1) || "";
      return /^\d{6,12}$/.test(id) ? `https://player.vimeo.com/video/${id}` : "";
    }
  } catch {
    return "";
  }
  return "";
}

export function normalizeUpdateImage(value) {
  const path = String(value || "").trim();
  if (!path || path.length > 600) return "";
  if (path.startsWith("/") && !path.startsWith("//") && !path.includes("..") && !path.includes("\\") && /\.(?:png|jpe?g|webp|avif)$/i.test(path)) return path;
  return normalizeFirebaseDownloadUrl(path, /\.(?:png|jpe?g|webp|avif)$/i);
}

function normalizeFirebaseDownloadUrl(value, extensionPattern) {
  const bucket = String(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "").trim().toLowerCase();
  if (!bucket) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "firebasestorage.googleapis.com" || url.username || url.password || url.port || url.hash) return "";
    const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (!match || decodeURIComponent(match[1]).toLowerCase() !== bucket) return "";
    const objectPath = decodeURIComponent(match[2]);
    if (!objectPath.startsWith("updates/") || objectPath.includes("..") || objectPath.includes("\\") || !extensionPattern.test(objectPath)) return "";
    if (url.searchParams.get("alt") !== "media" || !/^[a-f\d-]{32,64}$/i.test(url.searchParams.get("token") || "")) return "";
    return url.href;
  } catch {
    return "";
  }
}

export function normalizePublicUpdate(id, data) {
  const description = String(data.description || "").trim();
  const storedBody = String(data.articleBody || "").trim();
  const isLegacyLongPost = !storedBody && description.length > 280;

  return {
    id,
    title: String(data.title || ""),
    description,
    summary: String(data.summary || (isLegacyLongPost ? makeSummary(description) : description)),
    version: String(data.version || ""),
    category: String(data.category || "feature"),
    slug: String(data.slug || id || ""),
    articleBody: storedBody || (isLegacyLongPost ? formatLegacyUpdateBody(description) : ""),
    coverImage: normalizeUpdateImage(data.coverImage),
    coverAlt: String(data.coverAlt || ""),
    videoUrl: normalizeUpdateVideo(data.videoUrl),
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
  };
}
