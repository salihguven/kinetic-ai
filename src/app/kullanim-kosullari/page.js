import Link from "next/link";

export const metadata = {
  title: "Kullanım Koşulları | KineticAI",
  description:
    "KineticAI beta hizmetinin kapsamı, API anahtarları, üçüncü taraf sağlayıcı ücretleri ve kullanım koşulları.",
  alternates: { canonical: "/kullanim-kosullari" },
};

const sections = [
  {
    title: "1. Hizmet ve beta durumu",
    body: "KineticAI by True Kinetic Studios; sohbet, not, görev ve kaynak çalışma alanını desteklenen yapay zeka sağlayıcılarına bağlayan beta aşamasındaki bir arayüzdür. Model yanıtlarını KineticAI değil, seçtiğiniz sağlayıcı üretir. Beta süresince özellikler, günlük sınırlar ve arayüz değişebilir; bakım veya sağlayıcı kesintileri hizmeti geçici olarak etkileyebilir.",
  },
  {
    title: "2. Hesap, içerik ve yerel kayıtlar",
    body: "Hesap bilgilerinizi korumak ve hesabınızı başkalarıyla paylaşmamak sizin sorumluluğunuzdadır. Sohbetler, notlar, görevler ve sağlayıcı bağlantıları şu an kullandığınız tarayıcıda saklanır; hesabınıza bağlanarak cihazlar arasında eşitlenmez. Tarayıcı verilerini temizlemek bu içerikleri silebilir. Önemli çalışmalarınızı düzenli olarak dışa aktarın.",
  },
  {
    title: "3. API anahtarları, sağlayıcı koşulları ve ücretler",
    body: "Bağladığınız API anahtarı tarayıcınızın yerel depolamasında tutulur; KineticAI isteği işleyebilmek için anahtarı, mesajı ve ekleri sunucusu üzerinden seçtiğiniz AI sağlayıcısına iletir. KineticAI uygulama veritabanında sohbetleri veya API anahtarlarını saklamaz. Anahtarınızı korumak, sağlayıcının kullanım koşullarını ve veri tercihlerini incelemek, varsa sağlayıcı ücretlerini ve limitlerini takip etmek size aittir. Ücretsiz kullanım katmanları ve fiyatlar sağlayıcı tarafından değiştirilebilir; bağlamadan önce sağlayıcının güncel fiyat sayfasını kontrol edin.",
  },
  {
    title: "4. KineticAI kotası ve ödeme",
    body: "Kötüye kullanımı sınırlamak ve ortak altyapıyı korumak için hesap başına günlük 100 istek sınırı uygulanır ve Türkiye saatiyle yenilenir. Kullanıcı, günlük kotasından en az bir istek kullandıysa takvim ayı başına bir kez KineticAI kotasını sıfırlayabilir. Bu ek hak yalnızca KineticAI günlük sınırını yeniler; bağlı sağlayıcının kotasını, ücretsiz kullanımını veya ücretlerini değiştirmez. Bu metnin güncellendiği tarihte KineticAI içinde ücretli abonelik veya ödeme akışı bulunmamaktadır; üçüncü taraf AI sağlayıcınızın ücretlendirmesi bundan bağımsızdır. Bir plan veya ödeme özelliği eklenirse koşulları satın alma öncesinde ayrıca açıklanır.",
  },
  {
    title: "5. Güvenli ve izin verilen kullanım",
    body: "Hizmeti yürürlükteki mevzuata ve başkalarının haklarına uygun kullanın. Başkasının hesabına veya sistemine izinsiz erişmeyin; hizmetin güvenliğini, hız sınırlarını veya moderasyon önlemlerini aşmaya çalışmayın. Gönderdiğiniz içerikleri ilgili sağlayıcıya iletme hakkına sahip olduğunuzdan emin olun. Kötüye kullanım, güvenlik veya yasal gereklilikler nedeniyle bazı özelliklere erişim geçici ya da kalıcı olarak sınırlandırılabilir.",
  },
  {
    title: "6. Yapay zeka yanıtları ve web kaynakları",
    body: "Yapay zeka yanıtları ve web arama sonuçları hatalı, eksik veya güncelliğini yitirmiş olabilir. Tıbbi, hukuki, finansal, eğitimsel ya da güvenlikle ilgili önemli kararları bir model yanıtına dayanarak vermeyin; bilgileri birincil kaynaklardan doğrulayın. Üçüncü taraf sağlayıcılar ve web siteleri kendi çalışma, erişilebilirlik ve kullanım koşullarından sorumludur.",
  },
  {
    title: "7. Hesabın kapatılması ve değişiklikler",
    body: "Hesabınızı Hesap ve Güvenlik ayarlarından, yakın zamanda yeniden giriş yapmanızın ardından silebilirsiniz. Hesap silme, KineticAI hesabına bağlı kaydı kaldırır ve o tarayıcıdaki KineticAI yerel verilerini temizler; başka cihaz veya tarayıcılardaki eşitlenmemiş verileri ayrıca silmeniz gerekir. Koşullardaki ve ürün davranışındaki önemli değişiklikler Güncellemeler sayfasında duyurulur.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#080910] px-5 py-10 text-white sm:px-6 sm:py-14">
      <article className="mx-auto max-w-3xl space-y-7 leading-7 text-gray-300">
        <Link href="/" className="inline-flex min-h-12 items-center text-emerald-300 hover:underline">
          ← KineticAI ana sayfa
        </Link>
        <p className="text-xs font-bold uppercase tracking-[3px] text-emerald-400">
          KineticAI by True Kinetic Studios · BETA
        </p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">Kullanım Koşulları</h1>
        <p className="text-sm text-gray-500">Son güncelleme: 16 Kasım 2026</p>
        {sections.map(({ title, body }) => (
          <section key={title}>
            <h2 className="mb-2 text-xl font-bold text-white">{title}</h2>
            <p>{body}</p>
          </section>
        ))}
        <section>
          <h2 className="mb-2 text-xl font-bold text-white">8. Gizlilik ve iletişim</h2>
          <p>
            Verilerin hangi amaçlarla işlendiği ve silme talebinin nasıl iletileceği{" "}
            <Link className="text-emerald-300 underline" href="/gizlilik-politikasi">
              Gizlilik Politikası
            </Link>{" "}
            sayfasında açıklanır. Hizmet güncellemeleri için{" "}
            <Link className="text-emerald-300 underline" href="/updates">
              Güncellemeler
            </Link>{" "}
            sayfasını, destek veya gizlilik başvuruları için{" "}
            <Link className="text-emerald-300 underline" href="/iletisim">
              İletişim
            </Link>{" "}
            sayfasını kullanın.
          </p>
        </section>
      </article>
    </main>
  );
}
