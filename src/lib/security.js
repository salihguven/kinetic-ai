// src/lib/security.js

const requestLog = new Map();

export function checkRateLimit(request, limit = 20, windowMs = 60_000) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local-user";

  const now = Date.now();
  const entry = requestLog.get(ip) || { count: 0, startTime: now };

  if (now - entry.startTime > windowMs) {
    entry.count = 1;
    entry.startTime = now;
    requestLog.set(ip, entry);
    return { allowed: true };
  }

  entry.count += 1;
  requestLog.set(ip, entry);

  if (entry.count > limit) {
    return {
      allowed: false,
      message: "Çok hızlı istek gönderiyorsunuz. Güvenlik nedeniyle 1 dakika bekleyin.",
    };
  }

  return { allowed: true };
}

export function validateSafeUrl(url) {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateMessagesSafety(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "Mesaj listesi boş olamaz." };
  }
  if (messages.length > 60) {
    return { ok: false, error: "Sohbet geçmişi çok uzun. Lütfen yeni bir sohbet açın." };
  }
  const lastMsg = messages[messages.length - 1];
  if (typeof lastMsg?.content !== "string" || lastMsg.content.length > 35000) {
    return { ok: false, error: "Tek seferde gönderilen metin 35.000 karakteri geçemez." };
  }
  return { ok: true };
}