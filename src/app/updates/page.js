import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import PublicUpdates from "@/components/PublicUpdates";
import { getAdminDb } from "@/lib/firebaseServer";

async function loadUpdates() {
  try {
    const snapshot = await getAdminDb()
      .collection("updates")
      .where("status", "==", "published")
      .limit(100)
      .get();
    return snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          version: data.version || "",
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        };
      })
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
      <header className="border-b border-white/10 bg-[#0d0f19]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-6">
          <Link href="/" className="text-xl font-black">
            Kinetic<span className="text-violet-400">AI</span>
          </Link>
          <Link href="/" className="text-sm text-gray-400 transition hover:text-white">
            ← Ana sayfa
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16">
        <p className="text-xs font-bold uppercase tracking-[3px] text-violet-400">
          KineticAI by True Kinetic Studios
        </p>
        <h1 className="mt-4 text-3xl font-black sm:text-5xl">Ürün güncellemeleri</h1>
        <p className="mt-4 max-w-2xl leading-7 text-gray-400">
          KineticAI&apos;de yayınlanan yeni özellikleri, iyileştirmeleri ve önemli değişiklikleri takip edin.
          Her kayıt sürüm bilgisi ve yayın tarihiyle birlikte sunulur.
        </p>

        <Suspense fallback={<UpdatesLoading />}>
          <UpdateEntries />
        </Suspense>
      </section>

      <footer className="border-t border-white/[0.07] px-5 py-8 text-center text-xs text-gray-500">
        © KineticAI by True Kinetic Studios
        <nav className="mt-3 flex justify-center gap-4">
          <Link href="/gizlilik-politikasi" className="hover:text-white">Gizlilik</Link>
          <Link href="/kullanim-kosullari" className="hover:text-white">Kullanım koşulları</Link>
          <Link href="/iletisim" className="hover:text-white">İletişim</Link>
        </nav>
      </footer>
    </main>
  );
}
