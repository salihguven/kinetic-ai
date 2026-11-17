// src/components/LandingContent.js
"use client";

import {
  MessageSquare,
  BookOpen,
  CheckSquare,
  Zap,
  Sun,
  Moon,
  X,
} from "@/components/KineticIcons";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AuthScreen from "./AuthScreen";
import KineticLogo from "./KineticLogo";
import BetaBadge from "./BetaBadge";
import Reveal from "./Reveal";

const features = [
  {
    icon: MessageSquare,
    title: "Sohbet",
    desc: "Kendi sağlayıcı anahtarınızı bağlayın; modeller arasında aynı sohbet alanından geçiş yapın.",
  },
  {
    icon: BookOpen,
    title: "Notlar (Kaynak Stüdyosu)",
    desc: "Metin ve dosyalardan özet, çalışma rehberi veya kısa testler hazırlayın.",
  },
  {
    icon: CheckSquare,
    title: "Görevler",
    desc: "Hedefleri uygulanabilir adımlara ayırın ve ilerlemeyi tek ekranda izleyin.",
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
  const [authMode, setAuthMode] = useState(null);
  const closeAuthButtonRef = useRef(null);

  useEffect(() => {
    if (!authMode) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    closeAuthButtonRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setAuthMode(null);
        return;
      }
      if (event.key === "Tab") {
        const dialog = closeAuthButtonRef.current?.closest('[role="dialog"]');
        const focusable = dialog?.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [authMode]);

  return (
    <div
      className={`relative min-h-screen overflow-hidden transition-colors safe-top safe-bottom ${
        darkMode ? "theme-dark bg-zinc-950 text-zinc-100" : "theme-light bg-zinc-50 text-zinc-900"
      }`}
    >
      {/* İçerik */}
      <div className="relative z-10">
        {/* HEADER */}
        <header className="sticky top-0 z-30 mx-auto flex max-w-6xl items-center justify-between gap-3 border-b border-white/[0.06] bg-zinc-950/70 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 animate-fadeSlideUp">
            <KineticLogo size={30} darkMode={darkMode} />
            <span className="text-sm font-semibold tracking-tight">KineticAI</span>
            <BetaBadge darkMode={darkMode} />
          </div>
          <nav aria-label="Ana gezinme" className="hidden items-center gap-1 md:flex">
            <Link href="/urunler" className="touch-target inline-flex items-center rounded-lg px-3 text-sm opacity-75 transition hover:bg-white/5 hover:opacity-100">Ürünler</Link>
            <a href="#nasil-calisir" className="touch-target inline-flex items-center rounded-lg px-3 text-sm opacity-75 transition hover:bg-white/5 hover:opacity-100">Nasıl çalışır?</a>
            <Link href="/updates" className="touch-target inline-flex items-center rounded-lg px-3 text-sm opacity-75 transition hover:bg-white/5 hover:opacity-100">Güncellemeler</Link>
            <button type="button" onClick={() => setAuthMode("login")} className={`ml-1 inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold transition ${darkMode ? "bg-white text-zinc-950 hover:bg-zinc-200" : "bg-zinc-900 text-white hover:bg-zinc-800"}`}>Giriş yap</button>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
          <Link href="/urunler" className="touch-target inline-flex items-center rounded-lg px-2 text-xs font-medium md:hidden">Ürünler</Link>
          <Link href="/updates" className="touch-target inline-flex items-center rounded-lg px-2 text-xs font-medium md:hidden">Güncellemeler</Link>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`touch-target flex items-center justify-center rounded-xl border p-2 transition ${
              darkMode
                ? "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900"
            }`}
            title="Tema Değiştir"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          </div>
        </header>

        {/* HERO */}
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12 lg:min-h-[620px] lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:py-16">
          <div className="relative z-10 text-center lg:text-left">
            <p className="mb-4 animate-fadeSlideUp text-xs font-medium text-violet-300 sm:text-sm">KineticAI · Beta</p>

            <h1 className="animate-fadeSlideUp delay-2 mx-auto max-w-2xl text-[clamp(2rem,7vw,3.25rem)] font-semibold leading-[1.12] tracking-tight lg:mx-0">
              Yapay zekâ araçlarınız,
              <br className="hidden sm:block" /> tek bir <span className="text-violet-300">çalışma alanında.</span>
            </h1>

            <p className="animate-fadeSlideUp delay-3 mx-auto mt-4 max-w-xl text-sm leading-6 opacity-70 sm:mt-5 sm:text-base sm:leading-7 lg:mx-0">
              KineticAI; sohbetlerinizi, kaynaklarınızı ve görevlerinizi kendi bağladığınız yapay zekâ sağlayıcılarıyla aynı yerde düzenlemenize yardımcı olur.
            </p>

            <div className="animate-fadeSlideUp delay-4 mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
            <button
              type="button"
              onClick={() => setAuthMode("register")}
              className={`group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold transition hover:scale-[1.02] ${
                darkMode
                  ? "bg-white text-zinc-950 hover:bg-zinc-200"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              Hemen Ücretsiz Başla
              <Zap className="h-4 w-4 transition group-hover:rotate-12" />
            </button>
              <Link href="/urunler" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-zinc-500/20 px-5 text-sm font-medium transition hover:bg-white/[0.05]">Ürünleri keşfet</Link>
            </div>
            <p className="mt-4 text-xs opacity-50">Beta sürümü · Sağlayıcı ücretleri kendi hesabınıza aittir</p>
          </div>

          <div
            role="img"
            aria-label="KineticAI için koyu zeminde yeşil ve mor akış çizgilerinden oluşan soyut marka görseli"
            className="relative aspect-[1.35/1] w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#080910] shadow-2xl shadow-emerald-950/20 sm:aspect-[1.65/1] lg:aspect-[1.1/1]"
            style={{ backgroundImage: "linear-gradient(90deg, rgba(8,9,16,.12), rgba(8,9,16,0) 68%), url('/kineticai-hero.webp')", backgroundPosition: "center", backgroundSize: "cover" }}
          >
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#080910]/90 via-[#080910]/25 to-transparent px-5 pb-5 pt-16 sm:px-7 sm:pb-7">
              <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-emerald-300">KineticAI · Beta</p>
              <p className="mt-1 text-sm font-medium text-white sm:text-base">Kendi çalışma alanınız. Kendi sağlayıcılarınız.</p>
            </div>
          </div>
        </section>

        {/* ÖZELLİKLER — scroll'da sırayla beliriyor */}
        <section id="ozellikler" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16">
          <Reveal>
            <div className="mb-7 max-w-2xl sm:mb-9">
              <p className="mb-2 text-sm font-medium text-violet-300">Çalışma alanı</p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Sohbetten işe, aynı yerde devam edin.</h2>
            </div>
          </Reveal>
          <div className="grid gap-3 md:grid-cols-3 md:gap-4">
            {features.map((f, idx) => (
              <Reveal key={f.title} delay={idx * 120}>
                <div
                  className={`h-full rounded-xl border p-5 sm:p-6 ${
                    darkMode ? "border-zinc-800/80 bg-zinc-900/35" : "border-zinc-200 bg-white/75"
                  }`}
                >
                  <f.icon className="mb-4 h-5 w-5 text-emerald-400" strokeWidth={1.7} />
                  <h3 className="mb-2 text-base font-semibold">{f.title}</h3>
                  <p className="text-sm leading-6 opacity-70">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="nasil-calisir" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16">
          <Reveal>
            <p className="mb-2 text-sm font-medium text-violet-300">Başlangıç</p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Üç adımda çalışma alanınızı kurun.</h2>
            <p className="mb-7 mt-3 max-w-2xl text-sm leading-6 opacity-65 sm:mb-9 sm:text-base sm:leading-7">
              Kendi model erişiminizi seçin; çalışma alanı sohbeti, kaynakları ve takip edeceğiniz işleri bir arada tutar.
            </p>
          </Reveal>
          <div className={`grid gap-0 border-y ${darkMode ? "divide-zinc-800 border-zinc-800" : "divide-zinc-200 border-zinc-200"} md:grid-cols-3 md:divide-x`}>
            {[
              ["01", "Bir sağlayıcı bağlayın", "Desteklenen sağlayıcıdan aldığınız API anahtarını güvenli bağlantı üzerinden doğrulayın. Ücret ve sağlayıcı kotası o hesabın koşullarına bağlıdır."],
              ["02", "Sohbet edin veya kaynak çalışın", "Metin ya da dosya ekleyin; yanıtı akış halinde alın. Not Stüdyosu ve Görevler bölümleri ayrı iş akışları için hazırdır."],
              ["03", "Yanıtı kontrol edin ve dışa aktarın", "Güncel web araması kullanıldığında kaynakları yanıttan açın. Sohbeti Markdown olarak dışa aktarın veya daha sonra geçmişte arayın."],
            ].map(([number, title, description]) => (
              <Reveal key={number}>
                <article className="h-full border-b border-inherit py-5 md:border-b-0 md:px-5 lg:px-7">
                  <span className="font-mono text-sm font-medium text-emerald-400">{number}</span>
                  <h3 className="mt-2 text-base font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 opacity-70">{description}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* SSS — scroll'da sırayla beliriyor */}
        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <Reveal>
            <p className="mb-2 text-sm font-medium text-violet-300">Yardım</p>
            <h2 className="mb-7 text-2xl font-semibold tracking-tight sm:mb-9 sm:text-3xl">Merak edilenler</h2>
          </Reveal>
          <div className="space-y-3">
            {faqs.map((item, idx) => (
              <Reveal key={item.q} delay={idx * 90}>
                <details
                  className={`rounded-xl border p-4 sm:p-5 ${
                    darkMode ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-200 bg-white/80"
                  }`}
                >
                  <summary className="min-h-8 cursor-pointer text-base font-medium">{item.q}</summary>
                  <p className="mt-3 text-sm leading-6 opacity-70">{item.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer className={`border-t px-4 py-9 sm:px-6 sm:py-12 ${darkMode ? "border-zinc-900" : "border-zinc-200"}`}>
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 text-sm sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2"><KineticLogo size={27} darkMode={darkMode} /><span className="font-semibold">KineticAI</span><BetaBadge darkMode={darkMode} /></div>
              <p className="mt-3 max-w-xs text-xs leading-5 opacity-60">True Kinetic Studios tarafından geliştirilen bağımsız beta çalışma alanı.</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide opacity-50">Ürün</h2>
              <ul className="mt-3 space-y-2.5 opacity-75"><li><Link href="/urunler" className="hover:underline">Ürünler</Link></li><li><Link href="/updates" className="hover:underline">Güncellemeler</Link></li><li><a href="/hakkimizda" className="hover:underline">Hakkımızda</a></li></ul>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide opacity-50">Destek</h2>
              <ul className="mt-3 space-y-2.5 opacity-75"><li><Link href="/geri-bildirim?type=bug" className="hover:underline">Hata bildir</Link></li><li><Link href="/geri-bildirim?type=suggestion" className="hover:underline">Özellik öner</Link></li><li><Link href="/geri-bildirim?type=security" className="hover:underline">Güvenlik bildirimi</Link></li><li><a href="/iletisim" className="hover:underline">İletişim</a></li></ul>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide opacity-50">Yasal</h2>
              <ul className="mt-3 space-y-2.5 opacity-75"><li><a href="/gizlilik-politikasi" className="hover:underline">Gizlilik politikası</a></li><li><a href="/kullanim-kosullari" className="hover:underline">Kullanım koşulları</a></li><li><Link href="/geri-bildirim?type=feedback" className="hover:underline">Geri bildirim gönder</Link></li></ul>
            </div>
          </div>
          <div className="mx-auto mt-8 max-w-6xl border-t pt-5 text-xs opacity-55" style={{ borderColor: darkMode ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.1)" }}>
            <p>© 2026 KineticAI by True Kinetic Studios.</p>
          </div>
        </footer>
      </div>

      {authMode && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthMode(null); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={authMode === "register" ? "KineticAI hesabı oluştur" : "KineticAI giriş"}
            className="relative max-h-[min(94dvh,52rem)] w-full overflow-y-auto overscroll-contain rounded-t-3xl border border-white/10 bg-[#090a10] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6"
          >
            <button
              ref={closeAuthButtonRef}
              type="button"
              aria-label="Giriş penceresini kapat"
              onClick={() => setAuthMode(null)}
              className="touch-target absolute right-3 top-3 z-10 flex items-center justify-center rounded-xl border border-white/10 bg-black/30 text-gray-300 transition hover:bg-white/10"
            ><X className="h-4 w-4" /></button>
            <AuthScreen key={authMode} darkMode={darkMode} setDarkMode={setDarkMode} embedded initialMode={authMode} />
          </section>
        </div>
      )}
    </div>
  );
}
