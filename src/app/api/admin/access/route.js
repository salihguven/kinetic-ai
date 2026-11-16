
import { NextResponse, connection } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebaseServer";


export async function GET(request) {
  await connection();
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Oturum doğrulanamadı." },
        { status: 401 }
      );
    }

    const token = authorization.slice(7);
    const user = await verifyFirebaseToken(token);

    if (!user) {
      return NextResponse.json(
        { error: "Geçersiz oturum." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      isAdmin: user.isAdmin === true,
      isFounder: user.isFounder === true,
      isTester: user.isTester === true,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error("ADMIN ACCESS ERROR:", error);

    return NextResponse.json(
      { error: "Yetki kontrolü başarısız." },
      { status: 500 }
    );
  }
}
