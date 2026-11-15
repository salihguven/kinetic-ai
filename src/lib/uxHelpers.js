// src/lib/uxHelpers.js

// Güvenli dokunsal geri bildirim (mobil cihazlarda çalışır, masaüstünde sessizce geçer)
export function triggerHaptic(type = "light") {
  if (typeof window === "undefined" || !navigator?.vibrate) return;
  try {
    if (type === "light") navigator.vibrate(10);
    else if (type === "success") navigator.vibrate([12, 30, 18]);
    else if (type === "error") navigator.vibrate([30, 40, 30]);
  } catch {
    // ignore
  }
}

// Cihaz yerel diline göre göreceli zaman formatı ("2 dk önce", "Az önce")
export function formatRelativeTime(timestamp, lang = "tr") {
  if (!timestamp) return "";
  const diffSec = Math.round((timestamp - Date.now()) / 1000);
  const absSec = Math.abs(diffSec);

  const locale = lang === "en" ? "en-US" : "tr-TR";
  if (absSec < 45) return lang === "en" ? "Just now" : "Az önce";

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    if (absSec < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
    if (absSec < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
    return rtf.format(Math.round(diffSec / 86400), "day");
  } catch {
    return new Date(timestamp).toLocaleDateString(locale);
  }
}

// Anlamsız teknik hataları kullanıcı dostu çözüm önerilerine çevir
export function formatFriendlyError(rawError, lang = "tr") {
  const msg = String(rawError || "");
  const lower = msg.toLowerCase();

  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return lang === "en"
      ? "Network connection lost. Please check your internet and try again."
      : "İnternet bağlantısı koptu veya sunucuya ulaşılamıyor. Bağlantını kontrol edip tekrar dene.";
  }
  if (lower.includes("401") || lower.includes("invalid api key") || lower.includes("unauthorized")) {
    return lang === "en"
      ? "Your API key appears invalid or expired. Please reconnect the model."
      : "API anahtarın geçersiz veya süresi dolmuş görünüyor. Modeli silip yeniden bağlamayı dene.";
  }
  if (lower.includes("timeout") || lower.includes("aborted")) {
    return lang === "en"
      ? "The AI provider took too long to respond. Try switching models or retrying."
      : "Yapay zeka sağlayıcısı zaman aşımına uğradı. Tekrar deneyebilir veya başka bir model seçebilirsin.";
  }
  if (!msg || msg === "Bir hata oluştu.") {
    return lang === "en"
      ? "Unexpected response from provider. Please try again in a moment."
      : "Sağlayıcıdan beklenmeyen bir yanıt alındı. Birkaç saniye sonra tekrar dene.";
  }
  return msg;
}