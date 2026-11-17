
import { NextResponse, connection } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  verifyFirebaseToken,
  getAdminDb,
} from "@/lib/firebaseServer";
import { normalizeUpdateImage, normalizeUpdateVideo } from "@/lib/updateContent";


function createSlug(value) {
  const normalized = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return normalized || "guncelleme";
}

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
        summary: data.summary || data.description || "",
        version: data.version || "",
        category: data.category || "feature",
        slug: data.slug || "",
        articleBody: data.articleBody || "",
        coverImage: data.coverImage || "",
        coverAlt: data.coverAlt || "",
        videoUrl: data.videoUrl || "",
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
    if (contentLength > 96_000) {
      return NextResponse.json({ error: "İstek boyutu çok büyük." }, { status: 413 });
    }
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 96_000) {
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
    const category = String(body.category || "feature");
    const articleBody = String(body.articleBody || "").trim();
    const rawCoverImage = String(body.coverImage || "").trim();
    const coverImage = normalizeUpdateImage(rawCoverImage);
    const coverAlt = String(body.coverAlt || "").trim();
    const rawVideoUrl = String(body.videoUrl || "").trim();
    const videoUrl = normalizeUpdateVideo(rawVideoUrl);

    if (!title || !description) {
      return NextResponse.json(
        { error: "Başlık ve açıklama zorunludur." },
        { status: 400 }
      );
    }

    if (title.length > 120 || description.length > 280 || articleBody.length > 20_000 || rawCoverImage.length > 600 || coverAlt.length > 200 || rawVideoUrl.length > 500) {
      return NextResponse.json(
        { error: "Başlık, kısa açıklama veya ayrıntılı içerik izin verilen uzunluğu aşıyor." },
        { status: 400 }
      );
    }

    const allowedCategories = new Set(["feature", "improvement", "fix", "announcement"]);
    if (!allowedCategories.has(category)) {
      return NextResponse.json({ error: "Güncelleme türü geçersiz." }, { status: 400 });
    }

    if (rawCoverImage && !coverImage) {
      return NextResponse.json({ error: "Kapak görseli yalnızca projedeki public klasöründen bir PNG, JPG, WebP veya AVIF dosyası olabilir." }, { status: 400 });
    }
    if (rawVideoUrl && !videoUrl) {
      return NextResponse.json({ error: "Video için geçerli bir YouTube/Vimeo bağlantısı veya public klasöründeki MP4, WebM ya da OGV yolu kullanın." }, { status: 400 });
    }

    if (version.length > 30) {
      return NextResponse.json(
        { error: "Sürüm bilgisi çok uzun." },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    const updates = db.collection("updates");
    const doc = updates.doc();
    const slug = `${createSlug(title)}-${doc.id.slice(0, 6)}`;
    await doc.set({
      title,
      description,
      summary: description,
      version,
      category,
      slug,
      articleBody,
      coverImage,
      coverAlt,
      videoUrl,
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
        slug,
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
