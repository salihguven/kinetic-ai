// src/components/PermissionModal.js
"use client";

import { Bell, ShieldCheck, X } from "@/components/KineticIcons";

export default function PermissionModal({
  isOpen,
  onAllow,
  onDeny,
  darkMode,
  lang = "tr",
}) {
  if (!isOpen) return null;

  const isEn = lang === "en";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl animate-scaleIn ${
          darkMode
            ? "border-zinc-800 bg-zinc-900 text-zinc-100"
            : "border-zinc-200 bg-white text-zinc-900"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <Bell className="h-5 w-5" />
          </div>
          <button
            onClick={onDeny}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg opacity-60 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="mb-1.5 text-sm font-semibold">
          {isEn ? "Enable Response Notifications?" : "Yanıt Bildirimlerini Aç?"}
        </h3>
        <p className="mb-4 text-xs leading-relaxed opacity-75">
          {isEn
            ? "When you run long AI Bridge chains or switch tabs, KineticAI can notify you as soon as your answer is ready. No spam or marketing alerts."
            : "Uzun AI Köprüsü işlemleri sırasında başka sekmeye geçtiğinde, yanıtın hazır olur olmaz sana haber verebilmemiz için bildirim izni istiyoruz. Reklam bildirimi gönderilmez."}
        </p>

        <div className="mb-5 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-2.5 text-[11px] text-emerald-400">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>
            {isEn
              ? "You can revoke this anytime in browser settings."
              : "Bu izni dilediğin zaman tarayıcı ayarlarından kapatabilirsin."}
          </span>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onDeny}
            className={`min-h-[44px] flex-1 rounded-xl border px-4 text-xs font-medium ${
              darkMode ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"
            }`}
          >
            {isEn ? "Not Now" : "Şimdi Değil"}
          </button>
          <button
            type="button"
            onClick={onAllow}
            className={`min-h-[44px] flex-1 rounded-xl px-4 text-xs font-semibold ${
              darkMode
                ? "bg-white text-zinc-950 hover:bg-zinc-200"
                : "bg-zinc-900 text-white hover:bg-zinc-800"
            }`}
          >
            {isEn ? "Allow" : "İzin Ver"}
          </button>
        </div>
      </div>
    </div>
  );
}