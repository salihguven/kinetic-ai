
import { NextResponse, connection } from "next/server";
import { getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { verifyFirebaseToken } from "@/lib/firebaseServer";


export async function GET(request) {
  await connection();
  try {
    // 1. İstek sahibini doğrula
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Oturum gerekli." },
        { status: 401 }
      );
    }

    const token = authorization.slice(7);
    const currentUser = await verifyFirebaseToken(token);

    if (!currentUser) {
      return NextResponse.json(
        { error: "Geçersiz oturum." },
        { status: 401 }
      );
    }

    // 2. Yalnızca Admin erişebilir
    if (currentUser.isAdmin !== true) {
      return NextResponse.json(
        { error: "Bu işlem için Admin yetkisi gerekli." },
        { status: 403 }
      );
    }

    // 3. Sayfalama parametreleri
    const { searchParams } = new URL(request.url);

    const requestedLimit = Number(searchParams.get("limit") || 50);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(100, Math.max(1, Math.trunc(requestedLimit)))
      : 50;

    const pageToken =
      searchParams.get("pageToken") || undefined;

    // 4. Firebase Authentication kullanıcılarını getir
    const app = getApps()[0];

    if (!app) {
      throw new Error("Firebase Admin başlatılmamış.");
    }

    const auth = getAuth(app);

    const result = await auth.listUsers(
      limit,
      pageToken
    );

    // 5. Hassas olmayan kullanıcı bilgilerini döndür
    const users = result.users.map((user) => ({
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "İsimsiz kullanıcı",
      photoURL: user.photoURL || null,
      emailVerified: user.emailVerified,
      disabled: user.disabled,
      creationTime: user.metadata.creationTime,
      lastSignInTime: user.metadata.lastSignInTime || null,
      role: user.customClaims?.admin === true
        ? "admin"
        : user.customClaims?.tester === true
          ? "tester"
          : "user",
    }));

    return NextResponse.json({
      success: true,
      users,
      nextPageToken: result.pageToken || null,
      totalReturned: users.length,
    });
  } catch (error) {
    console.error("ADMIN USERS ERROR:", error);

    return NextResponse.json(
      { error: "Kullanıcılar yüklenemedi." },
      { status: 500 }
    );
  }
}
