// src/components/LandingContent.js
"use client";

import {
  MessageSquare,
  BookOpen,
  CheckSquare,
  Zap,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";
import AuthScreen from "./AuthScreen";
import KineticLogo from "./KineticLogo";
import AuthBackground from "./AuthBackground";
import Reveal from "./Reveal";

const features = [
  {
    icon: MessageSquare,
    title: "Sohbet",
    desc: "OpenAI, Gemini, Groq ve OpenRouter gibi sağlayıcıları kendi API anahtarınızla bağlayın. KineticAI içindeki günlük limit ve sağlayıcı koşulları geçerlidir.",
  },
  {
    icon: BookOpen,
    title: "Notlar (Kaynak Stüdyosu)",
    desc: "Dosya veya metin kaynaklarınızı yükleyin; AI yardımıyla özet çıkarın, çalışma rehberi oluşturun veya testler üretin.",
  },
  {
    icon: CheckSquare,
    title: "Görevler",
    desc: "Hedeflerinizi yazın, yapay zeka bunları uygulanabilir görev listelerine bölsün. İlerlemenizi tek ekrandan takip edin.",
  },
];

const faqs = [
  {
    q: "KineticAI tamamen ücretsiz mi?",
  a: "Evet. KineticAI ücretsiz sunulur ve kötüye kullanımı önlemek için günlük 100 istek sınırı uygular. Kullandığınız yapay zeka sağlayıcısı kendi ücret ve kotalarını ayrıca uygulayabilir.",
  },
  {
    q: "Verilerim nerede saklanıyor?",
            a: "Sohbetler, notlar, görevler ve sağlayıcı ayarları bu tarayıcıda tutulur. Bir AI isteği gönderdiğinizde mesajınız ve sağlayıcı anahtarınız, isteği seçtiğiniz modele iletmek için KineticAI sunucusu üzerinden geçer; sohbet içeriği KineticAI hesabınızda saklanmaz.",
  },
  {
    q: "Hangi yapay zeka sağlayıcılarını bağlayabilirim?",
    a: "OpenAI, Google Gemini, Groq ve OpenRouter üzerinden sunulan tüm modelleri kendi API anahtarınızla bağlayabilirsiniz.",
  },
  {
    q: "Hesabımı silebilir miyim?",
    a: "Evet. Hesap ayarlarından hesabınızı ve KineticAI hesabına bağlı kullanım kaydını silebilirsiniz. Bu tarayıcıdaki sohbet, not ve görev verileri de temizlenir; başka cihazlardaki yerel verileri o cihazlardan ayrıca kaldırmanız gerekir.",
  },
];

export default function LandingContent({ darkMode, setDarkMode }) {
  return (
    <div
      className={`relative min-h-screen overflow-hidden transition-colors safe-top safe-bottom ${
        darkMode ? "theme-dark bg-zinc-950 text-zinc-100" : "theme-light bg-zinc-50 text-zinc-900"
      }`}
    >
      {/* Tüm sayfayı kaplayan sabit (fixed) ağ animasyonu */}
      <div className="fixed inset-0 z-0">
        <AuthBackground darkMode={darkMode} />
      </div>

      {/* İçerik, arka planın üstünde */}
      <div className="relative z-10">
        {/* HEADER */}
        <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2 animate-fadeSlideUp">
            <KineticLogo size={30} darkMode={darkMode} />
            <span className="text-sm font-bold">KineticAI</span>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`rounded-xl border p-2 transition hover:scale-110 ${
              darkMode
                ? "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900"
            }`}
            title="Tema Değiştir"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </header>

        {/* HERO */}
        <section className="mx-auto flex max-w-5xl flex-col items-center px-5 pb-14 pt-8 text-center">
          <div className="relative mb-7 animate-fadeSlideUp">
            <div className="pulse-ring" />
            <div className="pulse-ring" style={{ animationDelay: "0.8s" }} />
            <div className="relative animate-logoFloat">
              <div className="animate-logoGlow rounded-3xl">
                <KineticLogo size={68} darkMode={darkMode} />
              </div>
            </div>
          </div>

          <span className="mb-5 inline-flex animate-fadeSlideUp delay-1 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-400">
            <Sparkles className="h-3 w-3" /> Kendi anahtarınızla AI çalışma alanı
          </span>

          <h1 className="animate-fadeSlideUp delay-2 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Kendi <span className="gradient-text">Yapay Zekanızı</span> Bağlayın,
            <br className="hidden sm:block" /> Tek Çalışma Alanında Yönetin
          </h1>

          <p className="animate-fadeSlideUp delay-3 mx-auto mt-5 max-w-2xl text-sm opacity-70 sm:text-base">
            KineticAI; OpenAI, Gemini, Groq ve OpenRouter gibi sağlayıcıları tek bir arayüzde
            birleştiren, sohbet, not çıkarma ve görev planlama araçları sunan ücretsiz ve
            modüler bir yapay zeka çalışma alanıdır.
          </p>

          <div className="animate-fadeSlideUp delay-4 mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#giris"
              className={`group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition hover:scale-[1.03] ${
                darkMode
                  ? "bg-white text-zinc-950 hover:bg-zinc-200"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              Hemen Ücretsiz Başla
              <Zap className="h-4 w-4 transition group-hover:rotate-12" />
            </a>
          </div>
        </section>

        {/* ÖZELLİKLER — scroll'da sırayla beliriyor */}
        <section className="mx-auto max-w-5xl px-5 py-10">
          <Reveal>
            <h2 className="mb-6 text-center text-xl font-semibold">Neler Yapabilirsiniz?</h2>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map((f, idx) => (
              <Reveal key={f.title} delay={idx * 120}>
                <div
                  className={`h-full rounded-2xl border p-5 backdrop-blur-sm transition hover:-translate-y-1 hover:border-emerald-500/40 ${
                    darkMode ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-200 bg-white/80"
                  }`}
                >
                  <f.icon className="mb-3 h-5 w-5 text-emerald-400" />
                  <h3 className="mb-1.5 font-medium">{f.title}</h3>
                  <p className="text-xs leading-relaxed opacity-70">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-10">
          <Reveal>
            <h2 className="mb-3 text-center text-xl font-semibold">KineticAI nasıl kullanılır?</h2>
            <p className="mx-auto mb-6 max-w-2xl text-center text-sm leading-relaxed opacity-65">
              Kendi model erişiminizi seçin; çalışma alanı sohbeti, kaynakları ve takip edeceğiniz işleri bir arada tutar.
            </p>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["01", "Bir sağlayıcı bağlayın", "Desteklenen sağlayıcıdan aldığınız API anahtarını güvenli bağlantı üzerinden doğrulayın. Ücret ve sağlayıcı kotası o hesabın koşullarına bağlıdır."],
              ["02", "Sohbet edin veya kaynak çalışın", "Metin ya da dosya ekleyin; yanıtı akış halinde alın. Not Stüdyosu ve Görevler bölümleri ayrı iş akışları için hazırdır."],
              ["03", "Yanıtı kontrol edin ve dışa aktarın", "Güncel web araması kullanıldığında kaynakları yanıttan açın. Sohbeti Markdown olarak dışa aktarın veya daha sonra geçmişte arayın."],
            ].map(([number, title, description]) => (
              <Reveal key={number}>
                <article className={`h-full rounded-2xl border p-5 ${darkMode ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-200 bg-white/80"}`}>
                  <span className="font-mono text-sm font-bold text-emerald-400">{number}</span>
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-2 text-xs leading-relaxed opacity-70">{description}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* SSS — scroll'da sırayla beliriyor */}
        <section className="mx-auto max-w-3xl px-5 py-10">
          <Reveal>
            <h2 className="mb-6 text-center text-xl font-semibold">Sıkça Sorulan Sorular</h2>
          </Reveal>
          <div className="space-y-3">
            {faqs.map((item, idx) => (
              <Reveal key={item.q} delay={idx * 90}>
                <details
                  className={`rounded-xl border p-4 backdrop-blur-sm transition hover:border-emerald-500/30 ${
                    darkMode ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-200 bg-white/80"
                  }`}
                >
                  <summary className="cursor-pointer text-sm font-medium">{item.q}</summary>
                  <p className="mt-2 text-xs leading-relaxed opacity-70">{item.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        {/* LOGIN / REGISTER — scroll'da beliriyor */}
        <section id="giris" className="px-5 py-14">
          <Reveal>
            <AuthScreen darkMode={darkMode} setDarkMode={setDarkMode} embedded />
          </Reveal>
        </section>

        {/* FOOTER */}
        <footer
          className={`border-t px-5 py-8 text-center text-xs opacity-60 ${
            darkMode ? "border-zinc-900" : "border-zinc-200"
          }`}
        >
          <div className="mb-2 flex flex-wrap justify-center gap-4">
            <a href="/hakkimizda" className="hover:underline">Hakkımızda</a>
            <a href="/iletisim" className="hover:underline">İletişim</a>
            <a href="/gizlilik-politikasi" className="hover:underline">Gizlilik Politikası</a>
            <a href="/kullanim-kosullari" className="hover:underline">Kullanım Koşulları</a>
          </div>
          <p>© KineticAI by True Kinetic Studios.</p>
        </footer>
      </div>
    </div>
  );
}
