"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, RotateCcw, Zap } from "lucide-react";

export default function QuotaCard({
  dailyCount = 0,
  dailyLimit = 100,
  onResetQuota,
  tokenUsage = null,
  modelTokenUsage = {},
  monthlyResetAvailable = false,
  monthlyResetUsed = false,
  resetLoading = false,
  resetError = "",
  darkMode = true,
  lang = "tr",
}) {
  const [resetTimeText, setResetTimeText] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const remaining = Math.max(0, dailyLimit - dailyCount);
  const percentage = Math.min(100, Math.round((dailyCount / dailyLimit) * 100));
  const totalTokens = Math.max(0, Number(tokenUsage?.totalTokens) || 0);
  const sortedModelUsage = Object.entries(modelTokenUsage || {})
    .filter(([, value]) => value && Number(value.totalTokens) > 0)
    .sort(([, left], [, right]) => Number(right.totalTokens) - Number(left.totalTokens));
  const locale = lang === "en" ? "en-US" : "tr-TR";
  const formatTokens = (count) => Number(count || 0).toLocaleString(locale);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit",
      }).formatToParts(now);
      const date = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
      const midnight = Date.UTC(Number(date.year), Number(date.month) - 1, Number(date.day) + 1) - 3 * 60 * 60 * 1000;
      const minutesLeft = Math.max(0, Math.floor((midnight - now.getTime()) / 60_000));
      const hours = Math.floor(minutesLeft / 60);
      const minutes = minutesLeft % 60;
      setResetTimeText(lang === "en" ? `${hours}h ${minutes}m` : `${hours} sa ${minutes} dk`);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 60_000);
    return () => clearInterval(timer);
  }, [lang]);

  const barColor = percentage > 85 ? "bg-red-500" : percentage > 60 ? "bg-amber-400" : "bg-emerald-400";

  return (
    <section
      aria-label={lang === "en" ? "Daily usage quota" : "Günlük kullanım kotası"}
      className={`rounded-xl border p-3 ${darkMode ? "border-zinc-800 bg-zinc-950/80" : "border-zinc-300 bg-zinc-100/80"}`}
    >
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-semibold">
          <Zap className="h-3.5 w-3.5 text-emerald-500" />
          <span>{lang === "en" ? "Daily quota" : "Günlük kota"}</span>
        </div>
        <span className="shrink-0 font-mono text-xs tabular-nums opacity-75">{dailyCount.toLocaleString(lang === "en" ? "en-US" : "tr-TR")} / {dailyLimit.toLocaleString(lang === "en" ? "en-US" : "tr-TR")}</span>
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
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] opacity-65">
        <span>{lang === "en" ? `${remaining} requests left` : `${remaining} istek kaldı`}</span>
        <span>{lang === "en" ? `Resets in ${resetTimeText}` : `Yenilenme: ${resetTimeText}`}</span>
      </div>
      <button
        type="button"
        aria-expanded={detailsOpen}
        onClick={() => setDetailsOpen((open) => !open)}
        className={`mt-2 flex min-h-10 w-full items-center justify-between gap-3 border-t px-1 pt-2 text-left text-xs transition hover:opacity-100 ${darkMode ? "border-zinc-800/60" : "border-zinc-300"}`}
      >
        <span className="min-w-0 truncate">
          {lang === "en" ? "Tokens today" : "Bugünkü token"}
          <span className="ml-2 font-mono font-semibold tabular-nums">{formatTokens(totalTokens)}</span>
        </span>
        {detailsOpen ? <ChevronUp className="h-4 w-4 shrink-0 opacity-60" /> : <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />}
      </button>
      {detailsOpen && (
        <div className={`space-y-2 rounded-xl px-2 py-2 ${darkMode ? "bg-zinc-900/70" : "bg-white/70"}`}>
          <p className="text-[10px] leading-relaxed opacity-60">
            {lang === "en"
              ? "Counts reported by your AI provider; some providers do not return token usage."
              : "AI sağlayıcının bildirdiği gerçek sayım; bazı sağlayıcılar token kullanımını iletmez."}
          </p>
          {sortedModelUsage.length ? (
            <ul className="max-h-36 space-y-1 overflow-y-auto" aria-label={lang === "en" ? "Token usage by model" : "Modele göre token kullanımı"}>
              {sortedModelUsage.map(([key, usage]) => (
                <li key={key} className="flex min-w-0 items-start justify-between gap-2 text-[11px]">
                  <span className="min-w-0 truncate opacity-75" title={`${usage.providerType || ""} · ${usage.model || "Model"}`}>
                    {usage.model || "Model"}
                    <span className="ml-1 text-[9px] opacity-50">{usage.providerType}</span>
                  </span>
                  <span className="shrink-0 font-mono tabular-nums">{formatTokens(usage.totalTokens)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-1 text-center text-[11px] opacity-55">
              {lang === "en" ? "No provider-reported usage yet today." : "Bugün henüz sağlayıcıdan token verisi gelmedi."}
            </p>
          )}
        </div>
      )}
      {monthlyResetAvailable ? (
        <button
          type="button"
          onClick={onResetQuota}
          disabled={resetLoading}
          className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 text-center text-[11px] font-semibold text-emerald-400 transition hover:bg-emerald-500/15 disabled:cursor-wait disabled:opacity-60"
        >
          {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          <span>{lang === "en" ? "Use this month's free reset" : "Bu ayın ücretsiz sıfırlamasını kullan"}</span>
        </button>
      ) : monthlyResetUsed ? (
        <p className="mt-1 flex min-h-8 items-center justify-center gap-1.5 px-2 text-center text-[11px] opacity-60">
          <RotateCcw className="h-3.5 w-3.5 shrink-0" />
          {lang === "en" ? "This month's free reset has been used." : "Bu ayki ücretsiz sıfırlama kullanıldı."}
        </p>
      ) : null}
      {resetError && (
        <p role="alert" className="mt-2 rounded-lg border border-red-500/25 bg-red-500/10 p-2 text-center text-[11px] leading-relaxed text-red-400">
          {resetError}
        </p>
      )}
    </section>
  );
}
