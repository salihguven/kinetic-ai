// src/components/ChatEmptyState.js
"use client";

import { Plus, MessageSquare, Code2, Mail, Globe } from "lucide-react";
import KineticLogo from "./KineticLogo";

function getGreeting(lang) {
  const hour = new Date().getHours();
  if (lang === "en") {
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

const QUICK_CARDS = [
  {
    key: "chat",
    icon: MessageSquare,
    title: "Sohbete Başla",
    desc: "Aklındaki herhangi bir konuda soru sor.",
    color: "emerald",
    prompt: "Merhaba! Bana kısaca neler yapabildiğini anlatır mısın?",
  },
  {
    key: "code",
    icon: Code2,
    title: "Kod Yardımı Al",
    desc: "Hata ayıkla, fonksiyon yaz veya kodunu incelet.",
    color: "sky",
    prompt: "JavaScript ile bir dizinin elemanlarını tersten yazdıran fonksiyon yaz.",
  },
  {
    key: "write",
    icon: Mail,
    title: "Metin / E-posta Yazdır",
    desc: "Profesyonel bir e-posta veya metin taslağı oluştur.",
    color: "amber",
    prompt: "İşe geç kaldığım için yöneticime kısa, profesyonel bir e-posta yaz.",
  },
  {
    key: "web",
    icon: Globe,
    title: "Güncel Bilgi Sor",
    desc: "Web'den canlı arama yaparak güncel veriler getir.",
    color: "violet",
    prompt: "Bugün dolar kuru ne durumda?",
    enablesWeb: true,
  },
];

const colorClasses = {
  emerald:
    "text-emerald-400 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/5",
  sky: "text-sky-400 border-sky-500/20 hover:border-sky-500/50 hover:bg-sky-500/5",
  amber: "text-amber-400 border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/5",
  violet:
    "text-violet-400 border-violet-500/20 hover:border-violet-500/50 hover:bg-violet-500/5",
};

export default function ChatEmptyState({
  userName,
  lang = "tr",
  darkMode = true,
  hasProviders,
  onOpenProviderModal,
  onQuickPrompt,
}) {
  const greeting = getGreeting(lang);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      {/* Logo */}
      <div className="relative mb-5 animate-fadeSlideUp">
        <div className="pulse-ring" />
        <div className="relative animate-logoFloat">
          <div className="animate-logoGlow rounded-2xl">
            <KineticLogo size={52} darkMode={darkMode} />
          </div>
        </div>
      </div>

      <h2 className="animate-fadeSlideUp delay-1 text-lg font-semibold">
        {greeting}, {userName}
      </h2>
      <p className="animate-fadeSlideUp delay-2 mb-6 mt-1 max-w-md text-xs leading-relaxed opacity-65">
        {hasProviders
          ? "Aşağıdaki hızlı başlangıç kartlarından birini seç ya da doğrudan mesaj yaz."
          : "Başlamak için önce bir yapay zeka sağlayıcısı bağlaman gerekiyor."}
      </p>

      {!hasProviders ? (
        <button
          onClick={onOpenProviderModal}
          className={`animate-fadeSlideUp delay-3 flex min-h-[44px] items-center gap-2 rounded-xl px-5 text-xs font-semibold transition hover:scale-[1.03] ${
            darkMode
              ? "bg-white text-zinc-950 hover:bg-zinc-200"
              : "bg-zinc-900 text-white hover:bg-zinc-800"
          }`}
        >
          <Plus className="h-4 w-4" />
          Yapay Zeka Bağla
        </button>
      ) : (
        <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
          {QUICK_CARDS.map((card, idx) => (
            <button
              key={card.key}
              onClick={() => onQuickPrompt(card.prompt, card.enablesWeb)}
              style={{ animationDelay: `${300 + idx * 90}ms` }}
              className={`animate-fadeSlideUp group flex items-start gap-3 rounded-xl border p-3.5 text-left transition hover:-translate-y-0.5 ${
                darkMode ? "bg-zinc-900/50" : "bg-white"
              } ${colorClasses[card.color]}`}
            >
              <card.icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold">{card.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed opacity-60">{card.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}