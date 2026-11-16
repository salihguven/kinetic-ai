import { NextResponse, connection } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { checkRateLimit } from "@/lib/security";
import { getAdminAuth, getAdminDb, verifyFirebaseToken } from "@/lib/firebaseServer";

export async function POST(request) {
  await connection();
  try {
    const rate = checkRateLimit(request, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: rate.message }, { status: 429 });
    }

    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const actor = await verifyFirebaseToken(token);
    if (!actor) {
      return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });
    }
    if (!actor.isAdmin) {
      return NextResponse.json({ error: "Admin yetkisi gerekli." }, { status: 403 });
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 4_000) {
      return NextResponse.json({ error: "İstek çok büyük." }, { status: 413 });
    }

    let rawBody;
    try {
      rawBody = await request.text();
    } catch {
      return NextResponse.json({ error: "İstek gövdesi okunamadı." }, { status: 400 });
    }
    if (new TextEncoder().encode(rawBody).byteLength > 4_000) {
      return NextResponse.json({ error: "İstek çok büyük." }, { status: 413 });
    }
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "İstek JSON biçiminde değil." }, { status: 400 });
    }

    const { uid, banned, reason = "" } = body || {};
    if (typeof uid !== "string" || uid.length < 1 || uid.length > 128 || uid.includes("/")) {
      return NextResponse.json({ error: "Kullanıcı kimliği geçersiz." }, { status: 400 });
    }
    if (typeof banned !== "boolean") {
      return NextResponse.json({ error: "Yasaklama durumu geçersiz." }, { status: 400 });
    }
    if (typeof reason !== "string" || reason.length > 300) {
      return NextResponse.json({ error: "Yasaklama nedeni 300 karakteri aşamaz." }, { status: 400 });
    }
    if (banned && uid === actor.uid) {
      return NextResponse.json({ error: "Kendi yönetici hesabınızı yasaklayamazsınız." }, { status: 400 });
    }

    let target;
    try {
      target = await getAdminAuth().getUser(uid);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
      }
      throw error;
    }

    const targetClaims = target.customClaims || {};
    if ((targetClaims.admin === true || targetClaims.founder === true) && !actor.isFounder) {
      return NextResponse.json({ error: "Yönetici hesaplarında bu işlem yalnızca kurucu tarafından yapılabilir." }, { status: 403 });
    }

    const db = getAdminDb();
    const banReason = banned ? (reason.trim() || "Yönetici tarafından yasaklandı.") : "";
    await db.collection("users").doc(uid).set({
      banned,
      banReason,
      bannedAt: banned ? FieldValue.serverTimestamp() : FieldValue.delete(),
      banUpdatedAt: FieldValue.serverTimestamp(),
      banUpdatedBy: actor.uid,
    }, { merge: true });

    return NextResponse.json({ success: true, uid, banned, banReason });
  } catch (error) {
    console.error("ADMIN USER BAN ERROR:", error.code || error.message);
    return NextResponse.json({ error: "Kullanıcı durumu güncellenemedi." }, { status: 500 });
  }
}
