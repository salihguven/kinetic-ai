import { connection } from "next/server";
import { getAdminDb } from "@/lib/firebaseServer";
import { normalizePublicUpdate } from "@/lib/updateContent";

export default async function sitemap() {
  await connection();
  const base = "https://truekinetichub.com.tr";
  const staticPages = ["/", "/urunler", "/updates", "/hakkimizda", "/iletisim", "/gizlilik-politikasi", "/kullanim-kosullari"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  try {
    const snapshot = await getAdminDb()
      .collection("updates")
      .where("status", "==", "published")
      .limit(100)
      .get();
    const articlePages = snapshot.docs
      .map((doc) => normalizePublicUpdate(doc.id, doc.data()))
      .filter((item) => item.slug && item.articleBody)
      .map((item) => ({
        url: `${base}/updates/${encodeURIComponent(item.slug)}`,
        lastModified: item.createdAt?.toDate?.() || new Date(),
      }));
    return [...staticPages, ...articlePages];
  } catch (error) {
    console.error("SITEMAP UPDATE ARTICLES ERROR:", error.code || error.message);
    return staticPages;
  }
}
