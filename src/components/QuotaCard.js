"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Zap } from "lucide-react";

export default function QuotaCard({ dailyCount = 0, dailyLimit = 100, onOpenAccount, darkMode = true, lang = "tr" }) {
  const [resetTimeText, setResetTimeText] = useState("");
  const remaining = Math.max(0, dailyLimit - dailyCount);
  const percentage = Math.min(100, Math.round((dailyCount / dailyLimit) * 100));

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit",
      }).formatToParts(now);
      const date = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
      const midnight = Date.UTC(Number(date.year), Number(date.month) - 1, Number(date.day) + 1) - 3 * 60 * 60 * 1000;
      const minutesLeft = Math.max(0, Math.floor((midnight - now.getTime()) / 60_000));
      setResetTimeText(`${Math.floor(minutesLeft / 60)}s ${minutesLeft % 60}dk`);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 60_000);
    return () => clearInterval(timer);
  }, []);

  const barColor = percentage > 85 ? "bg-red-500" : percentage > 60 ? "bg-amber-400" : "bg-emerald-400";

  return (
    <section
      aria-label={lang === "en" ? "Daily usage quota" : "Günlük kullanım kotası"}
      className={`rounded-xl border p-3.5 ${darkMode ? "border-zinc-800 bg-zinc-950/80" : "border-zinc-200 bg-zinc-50"}`}
    >
      <div className="mb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold">
          <Zap className="h-3.5 w-3.5 text-emerald-500" />
          <span>{lang === "en" ? "Daily quota" : "Günlük kota"}</span>
        </div>
        <span className="font-mono text-[11px] tabular-nums opacity-70">{dailyCount} / {dailyLimit}</span>
      </div>
      <div
        className={`h-2 w-full overflow-hidden rounded-full ${darkMode ? "bg-zinc-800/70" : "bg-zinc-300"}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={dailyLimit}
        aria-valuenow={Math.min(dailyCount, dailyLimit)}
        aria-label={lang === "en" ? "Daily request usage" : "Günlük istek kullanımı"}
      >
        <div className={`h-full rounded-full transition-[width] duration-500 ${barColor}`} style={{ width: `${percentage}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] opacity-60">
        <span>{lang === "en" ? `${remaining} requests left` : `${remaining} istek kaldı`}</span>
        <span>{lang === "en" ? `Resets in ${resetTimeText}` : `Yenilenme: ${resetTimeText}`}</span>
      </div>
      <p className={`mt-3 border-t pt-2.5 text-center text-[10px] opacity-50 ${darkMode ? "border-zinc-800/50" : "border-zinc-300"}`}>
        {lang === "en" ? "Rewarded ads are not enabled." : "Ödüllü reklam kotası etkin değil."}
      </p>
      <button
        type="button"
        onClick={onOpenAccount}
        className="mt-2 flex min-h-[32px] w-full items-center justify-center gap-1 text-[10px] opacity-60 hover:underline hover:opacity-90"
      >
        <ShieldCheck className="h-3 w-3" />
        {lang === "en" ? "Account & security" : "Hesap ve güvenlik ayarları"}
      </button>
    </section>
  );
}
