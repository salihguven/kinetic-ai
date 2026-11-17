export const FEEDBACK_TYPES = Object.freeze(["feedback", "bug", "suggestion", "security"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedSource = /^\/(?:app|updates|urunler|geri-bildirim)?(?:\/[a-z0-9-]*)?$/i;

export function validateFeedbackPayload(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Bildirim biçimi geçersiz." };
  }
  const type = typeof input.type === "string" ? input.type : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const details = typeof input.details === "string" ? input.details.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const source = typeof input.source === "string" && allowedSource.test(input.source) ? input.source : "other";

  if (!FEEDBACK_TYPES.includes(type)) return { ok: false, error: "Lütfen geçerli bir bildirim türü seçin." };
  if (title.length < 4 || title.length > 120 || details.length < 12 || details.length > 5000) {
    return { ok: false, error: "Başlık 4–120, ayrıntılar 12–5000 karakter arasında olmalı." };
  }
  if (email.length > 254 || (email && !emailPattern.test(email))) return { ok: false, error: "E-posta adresini kontrol edin." };
  return { ok: true, value: { type, title, details, email, source } };
}
