import Link from "next/link";

export const metadata = {
  title: "Gizlilik Politikası | KineticAI",
  description:
    "KineticAI beta hizmetinde hesap, tarayıcı içeriği, AI sağlayıcıları, güvenlik ve Google AdSense verilerinin nasıl işlendiğini öğrenin.",
  alternates: { canonical: "/gizlilik-politikasi" },
};

const sections = [
  {
    title: "Veri sorumlusu ve iletişim",
    body: (
      <>
        Bu politika, True Kinetic Studios adıyla sunulan KineticAI beta hizmetinin mevcut veri akışını açıklar. Gizlilik, erişim, düzeltme veya silme taleplerinizi{" "}
        <a className="text-emerald-300 underline" href="mailto:truekineticservices@gmail.com?subject=KineticAI%20gizlilik%20talebi">
          truekineticservices@gmail.com
        </a>{" "}
        adresine iletebilirsiniz. Başvurunuzda hesabınızla ilişkili e-posta adresini belirtin; API anahtarınızı veya parolanızı e-postaya eklemeyin.
      </>
    ),
  },
  {
    title: "Hesap ve hizmet güvenliği",
    body: "Hesap açma ve oturum açma için Firebase Authentication kullanılır. Hizmeti sunmak, günlük kullanım sınırını ve ayda bir kullanılabilen kota sıfırlama hakkını uygulamak, hesabı korumak için Firebase üzerinde kullanıcı kimliği, e-posta adresi, günlük istek sayısı, sıfırlamanın kullanıldığı ay ve güvenlik/moderasyon durumu işlenebilir. KineticAI bu bilgileri hesap, kota ve güvenlik işlevleri için kullanır.",
  },
  {
    title: "Tarayıcıda saklanan içerik ve API anahtarları",
    body: "Sohbet geçmişi, notlar, görevler, sağlayıcı ayarları ve API anahtarları mevcut tarayıcınızın yerel depolamasında tutulur; KineticAI hesabıyla cihazlar arasında eşitlenmez. Bu tarayıcı verilerini temizlemek kayıtları silebilir. API anahtarları yerel depolamada şifrelenmiş olarak tutulmaz; ortak cihazlarda hesabınızı ve tarayıcı profilinizi koruyun, kullanmadığınız anahtarları sağlayıcınızdan iptal edin.",
  },
  {
    title: "AI istekleri, görseller ve web araması",
    body: "AI isteği gönderdiğinizde mesajınız, eklediğiniz dosya veya görseller ve seçtiğiniz sağlayıcının API anahtarı, yanıtı oluşturmak amacıyla KineticAI sunucusundan geçerek seçtiğiniz sağlayıcıya iletilir. KineticAI uygulama veritabanı sohbet içeriğini ve API anahtarlarını kaydetmez; seçtiğiniz sağlayıcı bunları kendi gizlilik, saklama ve model geliştirme ayarlarına göre işleyebilir. Web araması kullanıldığında sorgunuz ilgili arama kaynağına gönderilebilir: haber aramalarında Google Haberler, bilgi aramalarında Wikipedia, güncel döviz verisi için TCMB kullanılır. Bu hizmetlerin kendi gizlilik koşulları da geçerlidir.",
  },
  {
    title: "Güvenlik için IP adresi işleme",
    body: "İstek hızını sınırlamak ve kötüye kullanımı önlemek için sunucu, isteğin IP adresini geçici olarak bellekteki bir hız sınırı kaydında işler. Bu kayıt sohbet içeriğine veya Firebase kullanıcı profiline eklenmez ve kalıcı bir KineticAI kullanıcı geçmişi oluşturmak için kullanılmaz. Kayıtların çalışma süresi, sunucu belleğinin yaşam döngüsü ve hız sınırı penceresiyle sınırlıdır.",
  },
  {
    title: "Geri bildirim ve hata bildirimleri",
    body: "Geri bildirim formuna yazdığınız bildirim türü, başlık ve açıklama; varsa iletişim e-postanız ve hesabınızla oturum açtıysanız Firebase kullanıcı kimliğiniz, bildirimi incelemek ve yanıtlamak amacıyla Firebase Firestore üzerindeki kısıtlı destek kuyruğunda saklanır. Bildiriminizle birlikte yalnızca sayfa yolu kaydedilir; sohbet metni, API anahtarı, parola ve dosya ekleri toplanmaz. IP adresi kötüye kullanımı sınırlamak için geçici hız sınırı belleğinde işlenir, destek kaydına eklenmez. Kayıtlar destek ve güvenlik amacı sürdüğü müddetçe tutulur; silme veya gizlilik talepleri için iletişim adresini kullanabilirsiniz. Güvenlik bildiriminize gizli anahtar veya kullanıcı verisi eklemeyin.",
  },
  {
    title: "Reklamlar, çerezler ve Google",
    body: (
      <>
        Google AdSense reklam etiketi herkese açık ana sayfada çalışabilir. Reklam etiketi, reklam görünmese bile reklam sunumu veya ölçümü için tarayıcıdan istek başlatabilir. Google ve reklam iş ortakları reklam sunmak, ölçmek veya kişiselleştirmek amacıyla çerezleri okuyabilir ya da yazabilir; web işaretçileri, IP adresleri ve benzeri tanımlayıcıları kullanabilir. Kullanım, reklam ve gizlilik tercihlerinize ve bulunduğunuz bölgedeki gerekliliklere bağlıdır. Google&apos;ın iş ortaklarının sitelerinde veya uygulamalarında veriyi nasıl kullandığına dair açıklamayı{" "}
        <a
          className="text-emerald-300 underline"
          href="https://policies.google.com/technologies/partner-sites?hl=tr"
          target="_blank"
          rel="noreferrer"
        >
          Google&apos;ın veri kullanımı sayfasında
        </a>{" "}
        okuyabilirsiniz. Reklam tercihlerinizi ayrıca{" "}
        <a
          className="text-emerald-300 underline"
          href="https://adssettings.google.com/"
          target="_blank"
          rel="noreferrer"
        >
          Google reklam ayarlarından
        </a>{" "}
        yönetebilirsiniz.
      </>
    ),
  },
  {
    title: "Saklama ve silme",
    body: "Firebase kullanıcı hesabı ve KineticAI kullanıcı kaydı, hesabınız etkin olduğu sürece hizmet ve güvenlik amacıyla tutulur. Hesap ayarlarından, güvenlik için yakın zamanda yeniden giriş yaptıktan sonra hesabınızı silebilirsiniz; bu işlem Firebase kullanıcı hesabını ve KineticAI kullanıcı kaydını siler, mevcut tarayıcıdaki yerel sohbet, not, görev, sağlayıcı ayarı ve API anahtarı kayıtlarını temizler. Başka cihazlardaki eşitlenmemiş tarayıcı verileri için o cihazlarda ayrıca silme yapmanız gerekir. Firebase ve Google'ın altyapı yedekleri veya sağlayıcıların kendi kayıtları kendi saklama politikalarına tabi olabilir.",
  },
  {
    title: "KVKK kapsamındaki başvurular",
    body: (
      <>
        6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında, uygulanabildiği ölçüde kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, işleme amacını ve aktarım yapılan tarafları öğrenme, yanlış verilerin düzeltilmesini veya silinmesini isteme ve kanunda belirtilen diğer haklarınızı kullanma talebinizi yukarıdaki e-posta adresine iletebilirsiniz. Hak ve başvuru sürecinin kapsamı için{" "}
        <a
          className="text-emerald-300 underline"
          href="https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-"
          target="_blank"
          rel="noreferrer"
        >
          Kişisel Verileri Koruma Kurumunun aydınlatma rehberini
        </a>{" "}
        inceleyebilirsiniz.
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#080910] px-5 py-10 text-white sm:px-6 sm:py-14">
      <article className="mx-auto max-w-3xl space-y-7 leading-7 text-gray-300">
        <Link href="/" className="inline-flex min-h-12 items-center text-emerald-300 hover:underline">
          ← KineticAI ana sayfa
        </Link>
        <p className="text-xs font-bold uppercase tracking-[3px] text-emerald-400">
          KineticAI by True Kinetic Studios · BETA
        </p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">Gizlilik Politikası</h1>
        <p className="text-sm text-gray-500">Son güncelleme: 17 Kasım 2026</p>
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-2 text-xl font-bold text-white">{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
        <nav className="flex flex-wrap gap-3 border-t border-white/10 pt-6 text-sm">
          <Link href="/kullanim-kosullari" className="inline-flex min-h-12 items-center text-emerald-300 hover:underline">
            Kullanım koşulları
          </Link>
          <Link href="/iletisim" className="inline-flex min-h-12 items-center text-emerald-300 hover:underline">
            İletişim
          </Link>
        </nav>
      </article>
    </main>
  );
}
