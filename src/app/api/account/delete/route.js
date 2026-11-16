import { NextResponse } from "next/server";
import { deleteFirebaseAccount, verifyFirebaseToken } from "@/lib/firebaseServer";
import { checkRateLimit } from "@/lib/security";

export async function POST(request) {
  const rate = checkRateLimit(request, 5, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: rate.message }, { status: 429 });
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const user = await verifyFirebaseToken(token);
  if (!user) {
    return NextResponse.json({ error: "Oturum doğrulanamadı. Yeniden giriş yapın." }, { status: 401 });
  }

  const authAgeSeconds = Math.floor(Date.now() / 1000) - user.authTime;
  if (!user.authTime || authAgeSeconds < 0 || authAgeSeconds > 5 * 60) {
    return NextResponse.json(
      { error: "Güvenlik için önce çıkış yapıp yeniden giriş yapın.", code: "REAUTH_REQUIRED" },
      { status: 401 }
    );
  }

  try {
    await deleteFirebaseAccount(user.uid);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SELF-SERVICE ACCOUNT DELETE ERROR:", error.code || error.message);
    return NextResponse.json(
      { error: "Hesap silinemedi. Lütfen biraz sonra tekrar deneyin." },
      { status: 503 }
    );
  }
}
