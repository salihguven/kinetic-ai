
import { NextResponse, connection } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  verifyFirebaseToken,
  getAdminDb,
} from "@/lib/firebaseServer";


// Admin doğrulaması
async function requireAdmin(request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "Oturum gerekli." },
        { status: 401 }
      ),
    };
  }

  const token = authorization.slice(7);
  const user = await verifyFirebaseToken(token);

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Geçersiz oturum." },
        { status: 401 }
      ),
    };
  }

  if (user.isAdmin !== true) {
    return {
      error: NextResponse.json(
        { error: "Admin yetkisi gerekli." },
        { status: 403 }
      ),
    };
  }

  return { user };
}

// Güncellemeleri listele
export async function GET(request) {
  await connection();
  try {
    const auth = await requireAdmin(request);

    if (auth.error) return auth.error;

    const db = getAdminDb();

    const snapshot = await db
      .collection("updates")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const updates = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        title: data.title || "",
        description: data.description || "",
        version: data.version || "",
        status: data.status || "published",
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        createdBy: data.createdBy || "",
      };
    });

    return NextResponse.json({
      success: true,
      updates,
    });
  } catch (error) {
    console.error("ADMIN UPDATES GET ERROR:", error);

    return NextResponse.json(
      { error: "Güncellemeler yüklenemedi." },
      { status: 500 }
    );
  }
}

// Yeni güncelleme oluştur
export async function POST(request) {
  try {
    const auth = await requireAdmin(request);

    if (auth.error) return auth.error;

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 16_000) {
      return NextResponse.json({ error: "İstek boyutu çok büyük." }, { status: 413 });
    }
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 16_000) {
      return NextResponse.json({ error: "İstek boyutu çok büyük." }, { status: 413 });
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "İstek JSON biçiminde değil." }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Güncelleme içeriği geçersiz." }, { status: 400 });
    }

    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const version = String(body.version || "").trim();

    if (!title || !description) {
      return NextResponse.json(
        { error: "Başlık ve açıklama zorunludur." },
        { status: 400 }
      );
    }

    if (title.length > 120 || description.length > 5000) {
      return NextResponse.json(
        { error: "Başlık veya açıklama çok uzun." },
        { status: 400 }
      );
    }

    if (version.length > 30) {
      return NextResponse.json(
        { error: "Sürüm bilgisi çok uzun." },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    const doc = await db.collection("updates").add({
      title,
      description,
      version,
      status: "published",
      createdAt: FieldValue.serverTimestamp(),
      createdBy: auth.user.uid,
      createdByEmail: auth.user.email,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Güncelleme yayınlandı.",
        updateId: doc.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("ADMIN UPDATES POST ERROR:", error);

    return NextResponse.json(
      { error: "Güncelleme yayınlanamadı." },
      { status: 500 }
    );
  }
}
