import Link from "next/link";

export const metadata = {
  title: "KineticAI hakkında | True Kinetic Studios",
  description: "KineticAI'nin amacı, çalışma biçimi, yapay zeka araçları ve kaynak yaklaşımı hakkında bilgi edinin.",
  alternates: { canonical: "/hakkimizda" },
};

const sections = [
  {
    title: "Tek çalışma alanı, seçtiğiniz modeller",
    body: "KineticAI, True Kinetic Studios tarafından geliştirilen bağımsız bir yapay zeka çalışma alanıdır. Kullanıcılar desteklenen sağlayıcılardaki kendi API anahtarlarını bağlar; sohbetlerini, yerel notlarını ve görevlerini aynı arayüzde yönetir. KineticAI bir model sağlayıcısı değildir ve kullanıcı adına sağlayıcı hesabı açmaz.",
  },
  {
    title: "İşe yarayan araçlara odaklanıyoruz",
    body: "Sohbet alanı akışlı yanıt, geçmişte arama, sohbeti yeniden adlandırma, Markdown dışa aktarma, görsel ve dosya ekleri ile sesle yazmayı destekler. Kaynak Stüdyosu seçtiğiniz metinleri ve dosyaları özetlemeye veya çalışma materyaline dönüştürmeye; Görevler bölümü de hedefleri izlenebilir adımlara ayırmaya yardımcı olur.",
  },
  {
    title: "Güncel bilgi ve kaynaklar",
    body: "Güncel bilgi gerektiren sorularda KineticAI web aramasını otomatik başlatabilir. Son haberler tarihe göre süzülür ve kullanılan kaynaklar yanıtın altında gösterilir. Güncel döviz sorularında TCMB'nin günlük gösterge verisi kullanılır; bu veri anlık piyasa fiyatı veya banka işlem teklifi değildir. Kaynak bulunamadığında modelden değer tahmin etmemesi istenir.",
  },
  {
    title: "Şeffaf kullanım sınırları",
    body: "KineticAI hesabında kötüye kullanımı sınırlamak için günlük 100 istek sınırı vardır. Sağlayıcınızın API ücretleri, kendi kullanım limitleri ve verileri saklama koşulları ayrıca geçerlidir. Yapay zeka çıktıları hata içerebilir; önemli bilgileri ve kararları asıl kaynaklardan doğrulayın.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#080910] px-5 py-10 text-white sm:px-6 sm:py-14">
      <article className="mx-auto max-w-3xl space-y-7 leading-7 text-gray-300">
        <Link href="/" className="text-emerald-300 hover:underline">← KineticAI ana sayfa</Link>
        <p className="text-xs font-bold uppercase tracking-[3px] text-emerald-400">True Kinetic Studios</p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">KineticAI hakkında</h1>
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-2 text-xl font-bold text-white">{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
        <p>Ürün geliştirmelerini <a className="text-emerald-300 underline underline-offset-2" href="/updates">KineticAI güncellemeleri</a> sayfasında yayınlıyoruz. Gizlilik yaklaşımımız için <a className="text-emerald-300 underline underline-offset-2" href="/gizlilik-politikasi">Gizlilik Politikası</a> sayfasını okuyabilirsiniz.</p>
      </article>
    </main>
  );
}
