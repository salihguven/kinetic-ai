
import { NextResponse, connection } from "next/server";
import { getAdminAuth, verifyFirebaseToken, getAdminDb } from "@/lib/firebaseServer";

const jsonNoStore = (body, status = 200) => NextResponse.json(body, {
  status,
  headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" },
});

export async function GET(request) {
  await connection();
  try {
    // 1. İstek sahibini doğrula
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonNoStore({ error: "Oturum gerekli.", code: "UNAUTHENTICATED" }, 401);
    }

    const token = authorization.slice(7);
    const currentUser = await verifyFirebaseToken(token);

    if (!currentUser) {
      return jsonNoStore({ error: "Geçersiz oturum.", code: "UNAUTHENTICATED" }, 401);
    }

    // 2. Yalnızca Admin erişebilir
    if (currentUser.isAdmin !== true) {
      return jsonNoStore({ error: "Bu işlem için Admin yetkisi gerekli.", code: "FORBIDDEN" }, 403);
    }

    // 3. Sayfalama parametreleri
    const { searchParams } = new URL(request.url);

    const requestedLimit = Number(searchParams.get("limit") || 50);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(100, Math.max(1, Math.trunc(requestedLimit)))
      : 50;

    const requestedPageToken = searchParams.get("pageToken") || "";
    if (requestedPageToken.length > 4096) {
      return jsonNoStore({ error: "Sayfalama işareti geçersiz.", code: "INVALID_PAGE_TOKEN" }, 400);
    }
    const pageToken = requestedPageToken || undefined;

    // 4. Firebase Authentication kullanıcılarını getir
    const result = await getAdminAuth().listUsers(limit, pageToken);

    let profileSnapshots = [];
    let profileDataError = "";
    if (result.users.length > 0) {
      try {
        const db = getAdminDb();
        profileSnapshots = await db.getAll(...result.users.map((user) => db.collection("users").doc(user.uid)));
      } catch (error) {
        profileDataError = "Firestore kullanıcı profilleri okunamadı; hesap listesi gösteriliyor ancak KineticAI yasak durumu bilinmiyor. Firestore erişimini kontrol edin.";
        console.error("ADMIN USERS PROFILE LOOKUP ERROR:", error.code || error.name || "unknown");
      }
    }

    // 5. Hassas olmayan kullanıcı bilgilerini döndür
    const users = result.users.map((user, index) => ({
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "İsimsiz kullanıcı",
      photoURL: user.photoURL || null,
      emailVerified: user.emailVerified,
      disabled: user.disabled,
      creationTime: user.metadata.creationTime,
      lastSignInTime: user.metadata.lastSignInTime || null,
      banned: profileDataError ? null : profileSnapshots[index]?.data()?.banned === true,
      banStatusAvailable: !profileDataError,
      banReason: profileDataError ? "" : profileSnapshots[index]?.data()?.banReason || "",
      role: user.customClaims?.founder === true
        ? "founder"
        : user.customClaims?.admin === true
          ? "admin"
          : user.customClaims?.tester === true
            ? "tester"
            : "user",
    }));

    return jsonNoStore({
      success: true,
      users,
      nextPageToken: result.pageToken || null,
      totalReturned: users.length,
      profileDataAvailable: !profileDataError,
      profileDataError: profileDataError || undefined,
    });
  } catch (error) {
    const errorCodes = [];
    let currentError = error;
    for (let depth = 0; currentError && depth < 5; depth += 1, currentError = currentError.cause) {
      if (currentError.code) errorCodes.push(String(currentError.code));
    }
    console.error("ADMIN USERS ERROR:", errorCodes.join(",") || error.name || "unknown");
    const errorCodeSet = new Set(errorCodes);
    const userFacingError = [...errorCodeSet].some((code) => ["ENOTFOUND", "ECONNRESET", "ETIMEDOUT", "14", "UNAVAILABLE"].includes(code))
      ? "Firebase Authentication servisine ulaşılamadı. Sunucunun DNS/internet erişimini kontrol edin."
      : errorCodeSet.has("auth/insufficient-permission")
        ? "Firebase servis hesabında kullanıcıları listeleme yetkisi yok. Firebase Admin yetkilerini kontrol edin."
        : errorCodeSet.has("app/invalid-credential") || errorCodeSet.has("auth/invalid-credential")
          ? "Firebase Admin servis hesabı veya proje kimliği geçersiz. FIREBASE_SERVICE_ACCOUNT_KEY ayarını kontrol edin."
          : "Firebase Authentication kullanıcı listesi yüklenemedi. Admin servis hesabı yapılandırmasını kontrol edin.";

    return jsonNoStore({
      error: userFacingError,
      code: "ADMIN_USER_LIST_FAILED",
    }, 500);
  }
}
