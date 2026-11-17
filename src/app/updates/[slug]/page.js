import { cache } from "react";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getAdminDb } from "@/lib/firebaseServer";
import KineticLogo from "@/components/KineticLogo";
import { formatLegacyUpdateBody, normalizeUpdateImage, normalizeUpdateVideo } from "@/lib/updateContent";

const getPublishedArticle = cache(async (slug) => {
  try {
    const db = getAdminDb();
    let snapshot = await db.collection("updates").where("slug", "==", slug).limit(1).get();
    if (snapshot.empty) {
      const legacy = await db.collection("updates").doc(slug).get();
      if (!legacy.exists || legacy.data()?.status !== "published") return null;
      const data = legacy.data();
      if (!hasArticleContent(data)) return null;
      return serializeArticle(legacy.id, data);
    }
    const doc = snapshot.docs[0];
    const data = doc.data();
    if (data.status !== "published" || !hasArticleContent(data)) return null;
    return serializeArticle(doc.id, data);
  } catch (error) {
    console.error("PUBLIC UPDATE ARTICLE ERROR:", error.code || error.message);
    return null;
  }
});

function hasArticleContent(data = {}) {
  return Boolean(
    String(data.articleBody || "").trim() ||
    String(data.description || "").trim().length > 280 ||
    String(data.coverImage || "").trim() ||
    String(data.videoUrl || "").trim()
  );
}

function serializeArticle(id, data) {
  const createdAt = data.createdAt?.toDate?.()?.toISOString() || null;
  return {
    id,
    title: String(data.title || "KineticAI güncellemesi"),
    description: String(data.summary || data.description || "KineticAI ürün güncellemesi."),
    version: String(data.version || ""),
    category: String(data.category || "feature"),
    slug: String(data.slug || id),
    articleBody: String(data.articleBody || formatLegacyUpdateBody(data.description || "")),
    coverImage: normalizeUpdateImage(data.coverImage),
    coverAlt: String(data.coverAlt || "").slice(0, 200),
    videoUrl: normalizeUpdateVideo(data.videoUrl),
    createdAt,
  };
}

const categoryLabels = {
  feature: "Yeni özellik",
  improvement: "İyileştirme",
  fix: "Hata düzeltmesi",
  announcement: "Duyuru",
};

function extractHeadings(markdown) {
  const counts = new Map();
  return String(markdown || "").split("\n").flatMap((line) => {
    const match = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (!match) return [];
    const text = match[2].replace(/[*_`]/g, "").trim();
    const base = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("tr-TR").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "bolum";
    const count = counts.get(base) || 0;
    counts.set(base, count + 1);
    return [{ level: match[1].length, text, id: count ? `${base}-${count + 1}` : base }];
  });
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) return { title: "Güncelleme bulunamadı | KineticAI", robots: { index: false, follow: false } };

  return {
    title: `${article.title} | KineticAI güncellemeleri`,
    description: article.description.slice(0, 300),
    alternates: { canonical: `/updates/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description.slice(0, 300),
      url: `/updates/${article.slug}`,
      publishedTime: article.createdAt || undefined,
      images: article.coverImage ? [{ url: article.coverImage }] : [{ url: "/kineticai-hero.webp", width: 1600, height: 900, alt: "KineticAI marka görseli" }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description.slice(0, 200),
      images: [article.coverImage || "/kineticai-hero.webp"],
    },
  };
}

async function WaitForRequest() {
  await connection();
  return null;
}

function DynamicMetadataMarker() {
  return (
    <Suspense fallback={null}>
      <WaitForRequest />
    </Suspense>
  );
}

function ArticleLoading() {
  return (
    <main className="min-h-screen bg-[#080910] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-3xl animate-pulse">
        <div className="h-4 w-40 rounded bg-white/10" />
        <div className="mt-6 h-10 max-w-2xl rounded bg-white/10" />
        <div className="mt-4 h-5 max-w-xl rounded bg-white/[0.06]" />
        <div className="mt-10 aspect-video rounded-2xl bg-white/[0.04]" />
      </div>
    </main>
  );
}

async function UpdateArticleContent({ params }) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) notFound();

  const articleUrl = `https://truekinetichub.com.tr/updates/${article.slug}`;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.createdAt || undefined,
    dateModified: article.createdAt || undefined,
    mainEntityOfPage: articleUrl,
    image: article.coverImage
      ? [article.coverImage.startsWith("https://") ? article.coverImage : `https://truekinetichub.com.tr${article.coverImage}`]
      : undefined,
    author: { "@type": "Organization", name: "True Kinetic Studios" },
    publisher: { "@type": "Organization", name: "KineticAI by True Kinetic Studios" },
  };
  const headings = extractHeadings(article.articleBody);
  let markdownHeadingIndex = 0;

  return (
    <main className="min-h-screen bg-[#080910] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema).replace(/</g, "\\u003c") }} />
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0d0f19]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="touch-target inline-flex items-center gap-2.5 text-base font-semibold tracking-tight"><KineticLogo size={29} />KineticAI</Link>
          <Link href="/updates" className="touch-target inline-flex items-center rounded-lg px-3 text-sm text-gray-300 transition hover:bg-white/[0.06] hover:text-white">← <span className="ml-2">Tüm güncellemeler</span></Link>
        </div>
      </header>

      <article className="mx-auto max-w-5xl px-4 pb-14 pt-8 sm:px-6 sm:pb-20 sm:pt-12">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 font-semibold text-violet-200">{categoryLabels[article.category] || "Güncelleme"}</span>
            {article.version && <span className="text-gray-400">Sürüm {article.version}</span>}
            {article.createdAt && <time className="text-gray-500 sm:ml-auto" dateTime={article.createdAt}>{new Date(article.createdAt).toLocaleDateString("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" })}</time>}
          </div>
          <h1 className="mt-5 break-words text-3xl font-semibold leading-tight tracking-tight sm:mt-7 sm:text-4xl">{article.title}</h1>
          <p className="mt-4 text-base leading-7 text-gray-300 sm:text-lg sm:leading-8">{article.description}</p>
        </div>

        {article.coverImage && (
          <figure className="relative mx-auto mt-8 aspect-[16/9] max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] sm:mt-10 sm:rounded-3xl">
            <Image src={article.coverImage} alt={article.coverAlt || `${article.title} güncelleme görseli`} fill priority sizes="(max-width: 768px) 100vw, 960px" className="object-cover" />
          </figure>
        )}

        {article.videoUrl && (
          <figure className="relative mx-auto mt-8 aspect-video max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-black sm:mt-10 sm:rounded-3xl">
            {article.videoUrl.startsWith("/") || article.videoUrl.startsWith("https://firebasestorage.googleapis.com/") ? (
              <video controls preload="metadata" playsInline className="h-full w-full" aria-label={`${article.title} videosu`}><source src={article.videoUrl} /></video>
            ) : (
              <iframe src={article.videoUrl} title={`${article.title} videosu`} className="h-full w-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
            )}
          </figure>
        )}

        <div className="mx-auto mt-8 grid max-w-5xl gap-8 sm:mt-12 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12">
          <div className="min-w-0">
            {headings.length > 1 && (
              <details className="mb-7 rounded-xl border border-white/10 bg-white/[0.025] p-4 lg:hidden">
                <summary className="min-h-8 cursor-pointer text-sm font-semibold">Bu yazıda</summary>
                <nav aria-label="Yazı içeriği" className="mt-3 space-y-1 border-l border-white/10 pl-3">
                  {headings.map((heading) => <a key={heading.id} href={`#${heading.id}`} className={`block py-1 text-sm text-gray-400 hover:text-white ${heading.level === 3 ? "pl-3" : ""}`}>{heading.text}</a>)}
                </nav>
              </details>
            )}
            <div className="markdown-body break-words text-[15px] leading-7 text-gray-300 sm:text-base sm:leading-8">
              {article.articleBody ? <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children }) => { const item = headings[markdownHeadingIndex++]; return <h2 id={item?.id}>{children}</h2>; },
                  h3: ({ children }) => { const item = headings[markdownHeadingIndex++]; return <h3 id={item?.id}>{children}</h3>; },
                }}
              >{article.articleBody}</ReactMarkdown> : <p className="text-gray-400">Bu güncellemede ek yazı bulunmuyor. Eklenen görsel veya videoyu bu sayfada görüntüleyebilirsiniz.</p>}
            </div>
            <div className="mt-10 border-t border-white/10 pt-6 text-sm text-gray-400">
              <p>KineticAI by True Kinetic Studios</p>
              <Link href="/updates" className="touch-target mt-4 inline-flex items-center font-medium text-violet-300 hover:text-violet-200">← Güncelleme arşivine dön</Link>
            </div>
          </div>
          {headings.length > 1 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-2xl border border-white/10 bg-[#11131e] p-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Bu yazıda</h2>
                <nav aria-label="Yazı içeriği" className="mt-3 space-y-1 border-l border-white/10 pl-3">
                  {headings.map((heading) => <a key={heading.id} href={`#${heading.id}`} className={`block py-1.5 text-xs leading-5 text-gray-400 transition hover:text-white ${heading.level === 3 ? "pl-3" : ""}`}>{heading.text}</a>)}
                </nav>
              </div>
            </aside>
          )}
        </div>
      </article>

      <footer className="safe-bottom border-t border-white/[0.07] px-4 py-7 text-center text-xs text-gray-500 sm:px-5">
        © KineticAI by True Kinetic Studios
        <nav className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
          <Link href="/gizlilik-politikasi" className="touch-target inline-flex items-center hover:text-white">Gizlilik</Link>
          <Link href="/kullanim-kosullari" className="touch-target inline-flex items-center hover:text-white">Kullanım koşulları</Link>
          <Link href="/iletisim" className="touch-target inline-flex items-center hover:text-white">İletişim</Link>
          <Link href="/geri-bildirim" className="touch-target inline-flex items-center hover:text-white">Geri bildirim</Link>
        </nav>
      </footer>
    </main>
  );
}

export default function UpdateArticlePage({ params }) {
  return (
    <>
      <DynamicMetadataMarker />
      <Suspense fallback={<ArticleLoading />}>
        <UpdateArticleContent params={params} />
      </Suspense>
    </>
  );
}
