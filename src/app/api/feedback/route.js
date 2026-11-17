import { NextResponse, connection } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, verifyFirebaseToken } from "@/lib/firebaseServer";
import { checkRateLimit } from "@/lib/security";
import { validateFeedbackPayload } from "@/lib/feedback";
import { isSensitiveSource } from "@/lib/sensitiveContent";
import { readLimitedBody } from "@/lib/readLimitedBody";
const json = (body, status = 200) => NextResponse.json(body, {
  status,
  headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" },
});

export async function POST(request) {
  await connection();
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) return json({ error: "İstek kaynağı doğrulanamadı." }, 403);
    } catch {
      return json({ error: "İstek kaynağı doğrulanamadı." }, 403);
    }
  }
  if (request.headers.get("sec-fetch-site") === "cross-site") return json({ error: "İstek kaynağı doğrulanamadı." }, 403);
  const rate = checkRateLimit(request, 4, 60 * 60 * 1000, "feedback");
  if (!rate.allowed) return json({ error: "Çok sayıda bildirim gönderildi. Bir saat sonra tekrar deneyin." }, 429);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 12_000) return json({ error: "Bildirim boyutu izin verilen sınırı aşıyor." }, 413);
  const requestBody = await readLimitedBody(request, 12_000);
  if (!requestBody.ok) return json({ error: requestBody.error }, 413);

  let body;
  try { body = JSON.parse(requestBody.text); } catch { return json({ error: "Form verisi okunamadı. Sayfayı yenileyip tekrar deneyin." }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Bildirim biçimi geçersiz." }, 400);
  if (typeof body.website === "string" && body.website.trim()) return json({ success: true, reference: "alındı" }, 202);

  const validation = validateFeedbackPayload(body);
  if (!validation.ok) return json({ error: validation.error }, 400);
  const { type, title, details, email, source } = validation.value;
  if (isSensitiveSource("feedback.txt", `${title}\n${details}`)) {
    return json({ error: "Güvenlik nedeniyle API anahtarı, parola veya özel anahtar içeren bildirimler kaydedilmiyor. Gizli kısmı kaldırıp yeniden gönderin." }, 400);
  }

  let user = null;
  const authorization = request.headers.get("authorization") || "";
  if (authorization) {
    if (!authorization.startsWith("Bearer ") || authorization.length > 10_000) return json({ error: "Oturum doğrulanamadı. Yeniden giriş yapıp tekrar deneyin." }, 401);
    user = await verifyFirebaseToken(authorization.slice(7));
    if (!user) return json({ error: "Oturum doğrulanamadı. Yeniden giriş yapıp tekrar deneyin." }, 401);
  }

  try {
    const reference = await getAdminDb().collection("feedback").add({
      type,
      title,
      details,
      contactEmail: email || user?.email || "",
      userId: user?.uid || null,
      source,
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return json({ success: true, reference: reference.id }, 201);
  } catch (error) {
    console.error("FEEDBACK SUBMISSION ERROR:", error.code || error.name || "unknown");
    return json({ error: "Bildirim şu anda kaydedilemedi. Lütfen biraz sonra yeniden deneyin." }, 503);
  }
}
