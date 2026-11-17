import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import PublicUpdates from "@/components/PublicUpdates";
import KineticLogo from "@/components/KineticLogo";
import { getAdminDb } from "@/lib/firebaseServer";
import { normalizePublicUpdate } from "@/lib/updateContent";

async function loadUpdates() {
  try {
    const snapshot = await getAdminDb()
      .collection("updates")
      .where("status", "==", "published")
      .limit(100)
      .get();
    return snapshot.docs
      .map((doc) => normalizePublicUpdate(doc.id, doc.data()))
      .sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""))
      .slice(0, 50);
  } catch (error) {
    console.error("PUBLIC UPDATES PAGE ERROR:", error.code || error.message);
    return null;
  }
}

async function UpdateEntries() {
  await connection();
  const updates = await loadUpdates();
  return <PublicUpdates initialUpdates={updates} />;
}

function UpdatesLoading() {
  return (
    <p className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-gray-400">
      Güncellemeler yükleniyor…
    </p>
  );
}

export default function UpdatesPage() {
  return (
    <main className="min-h-screen bg-[#080910] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0d0f19]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="touch-target inline-flex items-center gap-2.5 text-base font-semibold tracking-tight">
            <KineticLogo size={29} /> KineticAI
          </Link>
          <nav className="flex items-center gap-1 sm:gap-3" aria-label="Sayfa gezinme">
            <Link href="/urunler" className="touch-target hidden items-center rounded-lg px-3 text-sm text-gray-400 transition hover:text-white sm:inline-flex">Ürünler</Link>
            <Link href="/app" className="touch-target inline-flex items-center rounded-lg border border-white/10 px-3 text-xs text-gray-200 transition hover:bg-white/[0.06] sm:px-4 sm:text-sm">Uygulamayı aç</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid items-center gap-6 rounded-3xl border border-white/[0.08] bg-[#0e1018] p-4 sm:gap-8 sm:p-7 lg:grid-cols-[minmax(0,1fr)_19rem] lg:p-9">
          <div className="min-w-0 py-2 sm:py-3">
            <p className="text-xs font-medium text-violet-300 sm:text-sm">KineticAI · Ürün notları</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:mt-4 sm:text-4xl">Ürün güncellemeleri</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400 sm:mt-4 sm:text-base sm:leading-7">
              KineticAI&apos;de yayınlanan yeni özellikleri, iyileştirmeleri ve önemli değişiklikleri takip edin. Büyük sürümlerde ayrıntılı açıklamalar ve ürün görselleri de paylaşılır.
            </p>
          </div>
          <div role="img" aria-label="KineticAI yeşil ve mor ışık akışlarıyla hazırlanan marka görseli" className="relative aspect-[16/8] overflow-hidden rounded-2xl border border-white/10 bg-[#080910] lg:aspect-[1.2/1]" style={{ backgroundImage: "linear-gradient(0deg, rgba(8,9,16,.35), rgba(8,9,16,.04)), url('/kineticai-hero.webp')", backgroundPosition: "center", backgroundSize: "cover" }}>
            <span className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/80 sm:bottom-4 sm:left-4">KineticAI · Beta</span>
          </div>
        </div>

        <Suspense fallback={<UpdatesLoading />}>
          <UpdateEntries />
        </Suspense>
      </section>

      <footer className="safe-bottom border-t border-white/[0.07] px-4 py-7 text-center text-xs text-gray-500 sm:px-5 sm:py-8">
        © KineticAI by True Kinetic Studios
        <nav className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
          <Link href="/urunler" className="touch-target inline-flex items-center hover:text-white">Ürünler</Link>
          <Link href="/geri-bildirim?type=bug" className="touch-target inline-flex items-center hover:text-white">Hata bildir</Link>
          <Link href="/geri-bildirim?type=suggestion" className="touch-target inline-flex items-center hover:text-white">Özellik öner</Link>
          <Link href="/iletisim" className="touch-target inline-flex items-center hover:text-white">İletişim</Link>
          <Link href="/gizlilik-politikasi" className="touch-target inline-flex items-center hover:text-white">Gizlilik</Link>
          <Link href="/kullanim-kosullari" className="touch-target inline-flex items-center hover:text-white">Kullanım koşulları</Link>
        </nav>
      </footer>
    </main>
  );
}
