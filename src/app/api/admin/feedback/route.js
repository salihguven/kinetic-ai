import { NextResponse, connection } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, verifyFirebaseToken } from "@/lib/firebaseServer";
import { readLimitedBody } from "@/lib/readLimitedBody";

const json = (body, status = 200) => NextResponse.json(body, {
  status,
  headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" },
});

async function requireAdmin(request) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ") || authorization.length > 10_000) return { response: json({ error: "Oturum gerekli." }, 401) };
  const user = await verifyFirebaseToken(authorization.slice(7));
  if (!user) return { response: json({ error: "Geçersiz oturum." }, 401) };
  if (user.isAdmin !== true) return { response: json({ error: "Bu işlem için yönetici yetkisi gerekli." }, 403) };
  return { user };
}

export async function GET(request) {
  await connection();
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;
    const snapshot = await getAdminDb().collection("feedback").orderBy("createdAt", "desc").limit(100).get();
    const reports = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type || "feedback",
        title: data.title || "",
        details: data.details || "",
        contactEmail: data.contactEmail || "",
        userId: data.userId || "",
        source: data.source || "other",
        status: ["new", "reviewing", "resolved", "closed"].includes(data.status) ? data.status : "new",
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      };
    });
    return json({ success: true, reports });
  } catch (error) {
    console.error("ADMIN FEEDBACK LIST ERROR:", error.code || error.name || "unknown");
    return json({ error: "Bildirimler yüklenemedi. Veritabanı bağlantısını kontrol edin." }, 503);
  }
}

export async function PATCH(request) {
  await connection();
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 2_000) return json({ error: "İstek boyutu geçersiz." }, 413);
  const requestBody = await readLimitedBody(request, 2_000);
  if (!requestBody.ok) return json({ error: "İstek boyutu geçersiz." }, 413);
  let body;
  try { body = JSON.parse(requestBody.text); } catch { return json({ error: "İstek biçimi geçersiz." }, 400); }
  const id = typeof body?.id === "string" ? body.id : "";
  const status = typeof body?.status === "string" ? body.status : "";
  if (!/^[A-Za-z0-9]{10,40}$/.test(id) || !["new", "reviewing", "resolved", "closed"].includes(status)) return json({ error: "Bildirim veya durum geçersiz." }, 400);

  try {
    const ref = getAdminDb().collection("feedback").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return json({ error: "Bildirim bulunamadı." }, 404);
    await ref.update({ status, updatedAt: FieldValue.serverTimestamp(), updatedBy: auth.user.uid });
    return json({ success: true, id, status });
  } catch (error) {
    console.error("ADMIN FEEDBACK UPDATE ERROR:", error.code || error.name || "unknown");
    return json({ error: "Bildirim durumu güncellenemedi." }, 503);
  }
}
