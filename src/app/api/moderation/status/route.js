import { NextResponse, connection } from "next/server";
import {
  verifyFirebaseToken,
  getFirestoreUserStatus,
} from "@/lib/firebaseServer";

export async function GET(request) {
  try {
    await connection();

    const authHeader =
      request.headers.get("authorization") || "";

    const idToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    const firebaseUser = await verifyFirebaseToken(idToken);

    if (!firebaseUser) {
      return NextResponse.json(
        { error: "Oturum doğrulanamadı." },
        { status: 401 }
      );
    }

    const status = await getFirestoreUserStatus(
      firebaseUser.uid
    );

    return NextResponse.json({
      blocked: status.moderationBlocked,
      warnings: status.warnings,
      banUntil: status.moderationBanUntil,
      remainingSeconds: status.remainingSeconds,
    });
  } catch (error) {
    console.error("[MODERATION STATUS]", error);

    return NextResponse.json(
      { error: "Moderasyon durumu alınamadı." },
      { status: 500 }
    );
  }
}
