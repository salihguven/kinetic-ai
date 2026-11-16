import Link from "next/link";

export const metadata = {
  title: "Gizlilik Politikası | KineticAI",
  description: "KineticAI hesap, yerel depolama, yapay zeka sağlayıcıları ve reklam teknolojileri hakkında gizlilik bilgileri.",
  alternates: { canonical: "/gizlilik-politikasi" },
};

const sections = [
  {
    title: "Hesap ve hizmet güvenliği",
    body: "Hesap açma ve giriş için Firebase Authentication kullanılır. KineticAI, hizmeti işletmek ve günlük kullanım sınırını uygulamak için Firebase üzerinde kullanıcı kimliği, e-posta, günlük istek sayısı ve güvenlik/moderasyon durumunu işleyebilir.",
  },
  {
    title: "Tarayıcıda saklanan içerik",
    body: "Sohbet geçmişi, notlar, görevler, sağlayıcı ayarları ve sağlayıcı API anahtarları bu tarayıcının yerel depolamasında tutulur. Bu içerikler KineticAI hesabınızla cihazlar arasında eşitlenmez. Ortak kullanılan cihazlarda hesabınızdan çıkın ve tarayıcı verilerinizi koruyun.",
  },
  {
    title: "AI istekleri ve web araması",
    body: "Bir AI isteği gönderdiğinizde mesaj, eklediğiniz görseller ve seçtiğiniz sağlayıcının API anahtarı isteği modele iletmek için KineticAI sunucusundan geçer. KineticAI uygulama veritabanı bu sohbet içeriğini veya API anahtarını kaydetmez; seçtiğiniz sağlayıcı isteği kendi gizlilik ve saklama koşullarına göre işler. Web araması kullanıldığında sorgu Google Haberler'e, bilgi amaçlı aramalarda Wikipedia'ya; güncel döviz sorularında ise veri almak için TCMB'ye gönderilebilir.",
  },
  {
    title: "Kötüye kullanımın önlenmesi",
    body: "İstek sınırlarını uygulamak için istemci IP bilgisi sunucu belleğinde geçici olarak işlenir. Bu bilgi KineticAI kullanıcı profilinde veya sohbet verisi olarak saklanmaz. Uygulama, VPN bağlantılarını sınıflandırmak üzere IP adresini harici bir analiz servisine göndermeyi kullanmaz.",
  },
  {
    title: "Reklamlar ve çerezler",
    body: "Google AdSense betiği herkese açık ana sayfada yüklenir. Reklam sunulduğunda Google ve iş ortakları reklamları ölçmek veya kişiselleştirmek için çerez ve benzeri teknolojileri kullanabilir. Reklam tercihlerinizi Google reklam ayarları ve tarayıcı ayarlarınızdan yönetebilirsiniz.",
  },
  {
    title: "Hesap ve yerel verilerin silinmesi",
    body: "Hesap ayarlarından yakın zamanda yeniden giriş yaptıktan sonra hesabınızı ve KineticAI hesabına bağlı kullanıcı kaydını silebilirsiniz. Silme işlemi bu tarayıcıdaki yerel sohbet, not, görev ve sağlayıcı verilerini de temizler. Başka tarayıcı veya cihazlarda bulunan yerel veriler eşitlenmediği için o cihazlardan ayrıca silinmelidir.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#080910] px-5 py-10 text-white sm:px-6 sm:py-14">
      <article className="mx-auto max-w-3xl space-y-7 leading-7 text-gray-300">
        <Link href="/" className="text-emerald-300 hover:underline">← KineticAI ana sayfa</Link>
        <p className="text-xs font-bold uppercase tracking-[3px] text-emerald-400">KineticAI by True Kinetic Studios</p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">Gizlilik Politikası</h1>
        <p className="text-sm text-gray-500">Son güncelleme: 16 Kasım 2026</p>
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-2 text-xl font-bold text-white">{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
        <nav className="flex flex-wrap gap-4 border-t border-white/10 pt-6 text-sm">
          <a href="/kullanim-kosullari" className="text-emerald-300 hover:underline">Kullanım koşulları</a>
          <a href="/iletisim" className="text-emerald-300 hover:underline">İletişim</a>
        </nav>
      </article>
    </main>
  );
}
