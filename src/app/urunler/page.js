import Link from "next/link";
import KineticLogo from "@/components/KineticLogo";
import { Monitor, Smartphone } from "@/components/KineticIcons";

export const metadata = {
  title: "Ürünler | KineticAI by True Kinetic Studios",
  description: "KineticAI ürün ailesini keşfedin: şu anda beta olarak kullanılabilen web çalışma alanı ve geliştirme aşamasındaki Android sürümü.",
  alternates: { canonical: "/urunler" },
  openGraph: {
    title: "KineticAI ürün ailesi",
    description: "KineticAI web sürümünü deneyin ve Android uygulamasının yayın durumunu takip edin.",
    type: "website",
    images: [{ url: "/kineticai-hero.webp", width: 1600, height: 900, alt: "KineticAI marka görseli" }],
  },
};

const products = [
  {
    id: "web",
    name: "KineticAI Web",
    platform: "Web uygulaması",
    status: "Beta · Kullanılabilir",
    description: "Sohbetleri, kaynakları ve görevleri tek bir çalışma alanında kullanın. Desteklenen sağlayıcıya kendi API anahtarınızı bağlayın; sağlayıcı ücretleri ve kullanım koşulları ayrıca geçerlidir.",
    action: "Web uygulamasını aç",
    href: "/app",
    available: true,
  },
  {
    id: "android",
    name: "KineticAI for Android",
    platform: "Android",
    status: "Geliştirme aşamasında",
    description: "Android için ayrı bir mobil deneyim üzerinde çalışılıyor. Uygulama henüz Google Play’de yayımlanmadı ve indirme bağlantısı bulunmuyor.",
    available: false,
  },
];

export default function ProductsPage() {
  return (
    <main className="min-h-screen bg-[#080910] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0d0f19]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="touch-target inline-flex items-center gap-2.5 text-base font-semibold tracking-tight"><KineticLogo size={29} />KineticAI</Link>
          <nav aria-label="Sayfa gezinme" className="flex items-center gap-1 sm:gap-3">
            <Link href="/updates" className="touch-target inline-flex items-center rounded-lg px-2 text-xs text-gray-300 transition hover:bg-white/[0.06] hover:text-white sm:px-3 sm:text-sm">Güncellemeler</Link>
            <Link href="/app" className="touch-target inline-flex items-center rounded-xl border border-white/10 px-3 text-xs font-medium transition hover:bg-white/[0.06] sm:px-4 sm:text-sm">KineticAI&apos;ı aç</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-14 pt-8 sm:px-6 sm:pb-20 sm:pt-14">
        <div className="relative isolate overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#10111a] px-5 py-8 sm:px-9 sm:py-11 lg:px-12">
          <div aria-hidden="true" className="absolute inset-y-0 right-0 -z-10 hidden w-[55%] bg-cover bg-center opacity-75 sm:block" style={{ backgroundImage: "linear-gradient(90deg, #10111a 0%, rgba(16,17,26,.45) 48%, rgba(16,17,26,.08) 100%), url('/kineticai-hero.webp')" }} />
          <p className="text-xs font-medium text-violet-300 sm:text-sm">KineticAI · Platformlar</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:mt-4 sm:text-4xl">Tek çalışma alanı. Web’de hazır, Android’de geliştirme aşamasında.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-300 sm:text-base sm:leading-7">KineticAI’ın bugünkü web sürümünü deneyin. Android uygulaması henüz yayımlanmadı; hazır olduğunda burada ve Güncellemeler sayfasında duyurulacak.</p>
        </div>

        <section aria-labelledby="product-list-title" className="mt-9 sm:mt-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2 sm:mb-6">
            <div>
              <h2 id="product-list-title" className="text-xl font-bold sm:text-2xl">KineticAI ürün ailesi</h2>
              <p className="mt-1 text-sm text-gray-400">Platformlar ve yayın durumları</p>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">2 platform</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            {products.map((product) => (
              <article key={product.id} className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#11131e] transition-colors hover:border-white/15 ${product.id === "web" ? "lg:col-span-3" : "lg:col-span-2"}`}>
                {product.id === "web" && <div role="img" aria-label="KineticAI markası için soyut koyu yeşil ve mor ışık görseli" className="relative aspect-[2.2/1] border-b border-white/10 bg-cover bg-center" style={{ backgroundImage: "linear-gradient(0deg, rgba(12,13,20,.8), rgba(12,13,20,.04)), url('/kineticai-hero.webp')" }}><span className="absolute bottom-4 left-5 text-xs font-medium text-white/85 sm:left-7">KineticAI Web · Beta</span></div>}
                <div className="flex flex-1 flex-col p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-300">{product.id === "web" ? <Monitor className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}</span>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">{product.platform}</p>
                      <h3 className="mt-0.5 break-words text-lg font-semibold sm:text-xl">{product.name}</h3>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold sm:text-xs ${product.available ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-amber-400/20 bg-amber-400/10 text-amber-100"}`}>{product.status}</span>
                </div>
                <p className="mt-5 flex-1 text-sm leading-6 text-gray-300 sm:leading-7">{product.description}</p>
                <div className="mt-6 border-t border-white/[0.07] pt-4">
                  {product.available ? (
                    <Link href={product.href} className="touch-target inline-flex items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200">{product.action}<span aria-hidden="true" className="ml-2">→</span></Link>
                  ) : (
                    <span className="inline-flex min-h-12 items-center text-sm text-gray-500">Yayınlandığında Güncellemeler’de duyurulacak</span>
                  )}
                </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-sm sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="leading-6 text-gray-400">Android yayın durumu ve diğer ürün değişiklikleri için KineticAI güncellemelerini takip edin.</p>
          <Link href="/updates" className="touch-target inline-flex shrink-0 items-center font-semibold text-violet-300 hover:text-violet-200">Güncellemelere git →</Link>
        </div>
      </section>

      <footer className="safe-bottom border-t border-white/[0.07] px-4 py-7 text-center text-xs text-gray-500 sm:px-5">
        © KineticAI by True Kinetic Studios
        <nav className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
          <Link href="/hakkimizda" className="touch-target inline-flex items-center hover:text-white">Hakkımızda</Link>
          <Link href="/updates" className="touch-target inline-flex items-center hover:text-white">Güncellemeler</Link>
          <Link href="/geri-bildirim" className="touch-target inline-flex items-center hover:text-white">Hata bildir / öneri</Link>
          <Link href="/iletisim" className="touch-target inline-flex items-center hover:text-white">İletişim</Link>
          <Link href="/gizlilik-politikasi" className="touch-target inline-flex items-center hover:text-white">Gizlilik</Link>
          <Link href="/kullanim-kosullari" className="touch-target inline-flex items-center hover:text-white">Kullanım koşulları</Link>
        </nav>
      </footer>
    </main>
  );
}
