import { Suspense } from "react";
import Link from "next/link";
import KineticLogo from "@/components/KineticLogo";
import FeedbackForm from "@/components/FeedbackForm";

export const metadata = {
  title: "Geri bildirim ve hata bildirimi | KineticAI",
  description: "KineticAI hakkında öneri paylaşın veya karşılaştığınız bir hatayı bildirin.",
  alternates: { canonical: "/geri-bildirim" },
  robots: { index: false, follow: true },
};

async function FeedbackFormRegion({ searchParams }) {
  const params = await searchParams;
  const initialType = ["bug", "suggestion", "feedback", "security"].includes(params?.type) ? params.type : "feedback";
  return <FeedbackForm initialType={initialType} />;
}

export default function FeedbackPage({ searchParams }) {
  return (
    <main className="min-h-screen bg-[#080910] text-white">
      <header className="border-b border-white/[0.08]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="touch-target inline-flex items-center gap-2.5 text-base font-semibold"><KineticLogo size={29} />KineticAI</Link>
          <Link href="/iletisim" className="touch-target inline-flex items-center text-sm text-gray-400 hover:text-white">İletişim</Link>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <p className="text-sm font-medium text-violet-300">Ürün desteği</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Geri bildiriminizi paylaşın</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400 sm:text-base sm:leading-7">Hata, öneri veya güvenlik konusunu ekibe iletin. Bildirimler incelenmek üzere özel destek kuyruğuna kaydedilir.</p>
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#10121b] p-4 sm:p-7">
          <Suspense fallback={<div className="min-h-96 animate-pulse rounded-xl bg-white/[0.03]" aria-label="Geri bildirim formu yükleniyor" />}>
            <FeedbackFormRegion searchParams={searchParams} />
          </Suspense>
        </div>
        <p className="mt-5 text-xs leading-5 text-gray-500">API anahtarı, parola, kurtarma kodu veya özel sohbet içeriği eklemeyin. Veri işleme hakkında <Link className="text-violet-300 underline underline-offset-2" href="/gizlilik-politikasi">Gizlilik Politikası</Link> sayfasına bakın.</p>
      </section>
      <footer className="safe-bottom border-t border-white/[0.07] px-4 py-6 text-center text-xs text-gray-500">© KineticAI by True Kinetic Studios</footer>
    </main>
  );
}
