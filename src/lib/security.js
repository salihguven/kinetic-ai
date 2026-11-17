// src/lib/security.js

import { lookup } from "node:dns/promises";

const requestLog = new Map();
let nextRateLimitCleanupAt = 0;
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 15_000;

function pruneExpiredRateLimitEntries(now) {
  if (now < nextRateLimitCleanupAt) return;
  nextRateLimitCleanupAt = now + RATE_LIMIT_CLEANUP_INTERVAL_MS;
  for (const [key, entry] of requestLog) {
    if (entry.expiresAt <= now) requestLog.delete(key);
  }
}

function isPrivateIPv4(host) {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 0 || parts[0] === 10 || parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && (parts[1] === 0 || parts[1] === 168)) ||
    (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
    (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19 || parts[1] === 51)) ||
    (parts[0] === 203 && parts[1] === 0) || parts[0] >= 224;
}

function isPrivateIPv6(host) {
  const value = host.toLowerCase().replace(/^\[|\]$/g, "");
  return value === "::" || value === "::1" || value.startsWith("fe80:") ||
    value.startsWith("fc") || value.startsWith("fd") || value.startsWith("ff") ||
    /^::ffff:(?:0:)?(?:127\.|10\.|192\.168\.|169\.254\.)/.test(value);
}

export function checkRateLimit(request, limit = 20, windowMs = 60_000, namespace = "global") {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local-user";

  const now = Date.now();
  pruneExpiredRateLimitEntries(now);
  const key = `${namespace}:${ip}`;
  const existing = requestLog.get(key);
  if (!existing && requestLog.size >= 20_000) {
    return { allowed: false, message: "Sunucu şu anda yoğun. Lütfen biraz sonra tekrar deneyin." };
  }

  if (!existing || now - existing.startTime > windowMs) {
    const entry = { count: 1, startTime: now, expiresAt: now + windowMs };
    requestLog.set(key, entry);
    return { allowed: true };
  }

  const entry = existing;
  entry.count += 1;

  if (entry.count > limit) {
    return {
      allowed: false,
      message: "Çok hızlı istek gönderiyorsunuz. Güvenlik nedeniyle 1 dakika bekleyin.",
    };
  }

  return { allowed: true };
}

export async function validateSafeUrl(url) {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "metadata.google.internal") return false;
    if (isPrivateIPv4(host) || (host.includes(":") && isPrivateIPv6(host))) return false;
    if (!host.includes(":") && !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
      const addresses = await lookup(host, { all: true, verbatim: true });
      if (!addresses.length || addresses.some(({ address }) => isPrivateIPv4(address) || isPrivateIPv6(address))) return false;
    }
    return true;
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
  let totalChars = 0;
  for (const message of messages) {
    if (!message || !["user", "assistant"].includes(message.role) || typeof message.content !== "string") {
      return { ok: false, error: "Mesaj biçimi geçersiz." };
    }
    totalChars += message.content.length;
    if (message.content.length > 35000 || totalChars > 100000) {
      return { ok: false, error: "Sohbet metni izin verilen sınırı aşıyor." };
    }
    if (message.images !== undefined) {
      if (!Array.isArray(message.images) || message.images.length > 4 || message.images.some((image) =>
        !image || typeof image !== "object" ||
        typeof image.base64 !== "string" || image.base64.length > 5_000_000 ||
        !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(image.mimeType)
      )) {
        return { ok: false, error: "Görsel eki geçersiz veya çok büyük." };
      }
    }
  }
  return { ok: true };
}
