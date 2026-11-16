import Link from "next/link";

export const metadata = {
  title: "İletişim | KineticAI by True Kinetic Studios",
  description: "KineticAI için destek, güvenlik, gizlilik ve ürün geri bildirimi iletişim bilgileri.",
  alternates: { canonical: "/iletisim" },
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#080910] px-5 py-10 text-white sm:px-6 sm:py-14">
      <article className="mx-auto max-w-3xl space-y-6 leading-7 text-gray-300">
        <Link href="/" className="text-emerald-300 hover:underline">← KineticAI ana sayfa</Link>
        <p className="text-xs font-bold uppercase tracking-[3px] text-emerald-400">True Kinetic Studios</p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">İletişim</h1>
        <p>KineticAI desteği, güvenlik bildirimi, gizlilik talebi, telif bildirimi veya ürün öneriniz için e-posta gönderin. Mesajınızda ilgili sayfayı ve karşılaştığınız sorunu anlatmanız çözüm sürecini kolaylaştırır.</p>
        <p>
          <span className="font-semibold text-white">E-posta: </span>
          <a className="text-emerald-300 underline underline-offset-2" href="mailto:info@truekinetichub.com.tr?subject=KineticAI%20ileti%C5%9Fim">info@truekinetichub.com.tr</a>
        </p>
        <p className="text-sm text-gray-500">Kişisel bilgilerin nasıl işlendiğini <a className="text-emerald-300 underline" href="/gizlilik-politikasi">Gizlilik Politikası</a> sayfasında bulabilirsiniz.</p>
      </article>
    </main>
  );
}
