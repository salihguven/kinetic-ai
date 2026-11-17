// src/components/TutorModal.js
"use client";

import { X, HelpCircle, Zap, Link2, BookOpen, CheckSquare, ShieldCheck } from "@/components/KineticIcons";

export default function TutorModal({ isOpen, onClose, darkMode }) {
  if (!isOpen) return null;

  const cardClass = darkMode
    ? "border-zinc-800 bg-zinc-900 text-zinc-100"
    : "border-zinc-200 bg-white text-zinc-900";

  const steps = [
    {
      icon: Zap,
      title: "1. Ücretsiz Yapay Zeka Bağla",
      desc: "Sol menüdeki 'AI Bağla' butonuna tıkla. Groq (console.groq.com) veya Google Gemini (aistudio.google.com) üzerinden ücretsiz API Key alıp doğrula.",
    },
    {
      icon: Link2,
      title: "2. AI Köprüsü & Görsel Analiz",
      desc: "İki farklı AI bağladığında 'AI Köprüsü'nü açarak birinin yazdığını diğerine denetletebilirsin. Fotoğraf analizi için Gemini veya Llama-4 Vision seç.",
    },
    {
      icon: BookOpen,
      title: "3. Kinetic Notes (NotebookLM)",
      desc: "Üstten 'Kaynak Stüdyosu' sekmesine geçip ders notu veya dosya yükle; AI sadece o kaynaklara bağlı kalarak özet, quiz ve podcast senaryosu üretsin.",
    },
    {
      icon: CheckSquare,
      title: "4. Akıllı Görev Yöneticisi",
      desc: "'Görevler' sekmesine büyük bir hedef yaz ve 'Plan Oluştur' de; yapay zeka hedefini uygulanabilir alt görevlere bölsün.",
    },
    {
      icon: ShieldCheck,
      title: "5. Gizlilik & Güvenlik",
      desc: "API anahtarların sunucumuzda değil, yalnızca kendi tarayıcında saklanır. Dilediğin an Hesap Güvenliği penceresinden hesabını silebilirsin.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn">
      <div className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl ${cardClass}`}>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-semibold">KineticAI Başlangıç Öğreticisi</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 opacity-60 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className={`flex gap-3 rounded-xl border p-3.5 ${
                  darkMode ? "border-zinc-800 bg-zinc-950/70" : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div>
                  <h3 className="text-xs font-semibold">{s.title}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed opacity-70">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className={`rounded-xl px-5 py-2 text-xs font-semibold ${
              darkMode
                ? "bg-white text-zinc-950 hover:bg-zinc-200"
                : "bg-zinc-900 text-white hover:bg-zinc-800"
            }`}
          >
            Anladım, Başlayalım!
          </button>
        </div>
      </div>
    </div>
  );
}