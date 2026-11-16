import Link from "next/link";

export const metadata = {
  title: "Kullanım Koşulları | KineticAI",
  description: "KineticAI hizmetini, kullanıcı API anahtarlarını ve üçüncü taraf AI sağlayıcılarını kullanma koşulları.",
  alternates: { canonical: "/kullanim-kosullari" },
};

const sections = [
  ["Hizmet", "KineticAI; kullanıcıların desteklenen yapay zeka sağlayıcılarını kendi hesapları ve API anahtarlarıyla kullanmasını, sohbetlerini ve tarayıcıda tuttuğu çalışma materyallerini yönetmesini sağlayan bir yazılım arayüzüdür. KineticAI model çıktısını üretmez; istekleri seçilen sağlayıcıya iletir."],
  ["Hesap ve kullanım sınırı", "Hesabınızı korumak ve hizmetin adil kullanımını sürdürmek sizin sorumluluğunuzdadır. Kötüye kullanımı sınırlamak için hesap başına günlük 100 istek sınırı uygulanır. Sınır Türkiye saatiyle her gün yenilenir."],
  ["API anahtarları ve sağlayıcı ücretleri", "Eklediğiniz API anahtarları bu tarayıcıda saklanır ve AI isteği sırasında KineticAI sunucusu üzerinden seçtiğiniz sağlayıcıya iletilir. Anahtarınızın güvenliğinden ve sağlayıcınızın ücret, kota, gizlilik ve kullanım şartlarından siz sorumlusunuz. Anahtarınızı başka kişilerle paylaşmayın."],
  ["İçerik ve güvenli kullanım", "Hizmeti yürürlükteki mevzuata ve başkalarının haklarına uygun kullanın. Başkasının hesabına veya sistemine izinsiz erişmeye, hizmeti kötüye kullanmaya ya da zararlı içerik üretmek için kullanmaya çalışmayın. Kendi içerikleriniz ve bunları sağlayıcılara gönderme yetkiniz size aittir."],
  ["Yanıtların doğruluğu ve kullanılabilirlik", "AI yanıtları veya web arama sonuçları eksik, güncelliğini yitirmiş ya da hatalı olabilir. Önemli bilgileri kaynaklarından doğrulayın. KineticAI, üçüncü taraf sağlayıcıların kesintisiz çalışacağını garanti etmez."],
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#080910] px-5 py-10 text-white sm:px-6 sm:py-14">
      <article className="mx-auto max-w-3xl space-y-7 leading-7 text-gray-300">
        <Link href="/" className="text-emerald-300 hover:underline">← KineticAI ana sayfa</Link>
        <p className="text-xs font-bold uppercase tracking-[3px] text-emerald-400">KineticAI by True Kinetic Studios</p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">Kullanım Koşulları</h1>
        <p className="text-sm text-gray-500">Son güncelleme: 16 Kasım 2026</p>
        {sections.map(([title, body]) => (
          <section key={title}>
            <h2 className="mb-2 text-xl font-bold text-white">{title}</h2>
            <p>{body}</p>
          </section>
        ))}
        <section>
          <h2 className="mb-2 text-xl font-bold text-white">Güncellemeler ve gizlilik</h2>
          <p>Hizmet değişiklikleri <a className="text-emerald-300 underline" href="/updates">Güncellemeler</a> sayfasında yayınlanır. Kişisel verilerin ve tarayıcı verilerinin işlenişi <a className="text-emerald-300 underline" href="/gizlilik-politikasi">Gizlilik Politikası</a> içinde açıklanır.</p>
        </section>
      </article>
    </main>
  );
}
