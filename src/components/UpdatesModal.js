"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Loader2, X } from "@/components/KineticIcons";
import { loadPublishedUpdates } from "@/lib/updatesClient";

export default function UpdatesModal({ isOpen, onClose, darkMode, embedded = false }) {
  const [updates, setUpdates] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    loadPublishedUpdates()
      .then((data) => {
        if (!cancelled) {
          setUpdates(data);
          setError("");
          setHasLoaded(true);
        }
      })
      .catch((err) => {
        if (!cancelled && err.name !== "AbortError") setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, retryCount]);

  if (!isOpen) return null;

  const cardClass = darkMode
    ? "border-zinc-800 bg-zinc-950 text-zinc-100"
    : "border-zinc-200 bg-white text-zinc-900";

  return (
    <div
      className={embedded
        ? "flex min-h-0 flex-1 flex-col"
        : "fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"}
      onClick={embedded ? undefined : onClose}
    >
      <section
        role={embedded ? "region" : "dialog"}
        aria-modal={embedded ? undefined : "true"}
        aria-labelledby="updates-title"
        onClick={(event) => !embedded && event.stopPropagation()}
        className={`${embedded
          ? "flex min-h-0 flex-1 flex-col"
          : "max-h-[min(720px,calc(100vh-2rem))] w-full max-w-2xl"} overflow-hidden border shadow-2xl ${cardClass}`}
      >
        <header className={`flex items-center justify-between border-b px-5 py-4 ${darkMode ? "border-zinc-800" : "border-zinc-200"}`}>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-400" />
            <h2 id="updates-title" className="font-semibold">KineticAI güncellemeleri</h2>
          </div>
          {!embedded && (
            <button onClick={onClose} aria-label="Güncellemeleri kapat" className="rounded-lg p-2 opacity-60 transition hover:bg-zinc-800/50 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          )}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {!hasLoaded && !error && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm opacity-60">
              <Loader2 className="h-4 w-4 animate-spin" /> Güncellemeler yükleniyor...
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300" role="alert">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setRetryCount((count) => count + 1);
                }}
                className="mt-3 rounded-lg border border-amber-400/30 px-3 py-1.5 font-medium hover:bg-amber-500/10"
              >
                Tekrar dene
              </button>
            </div>
          )}
          {hasLoaded && !error && updates.length === 0 && (
            <p className="py-16 text-center text-sm opacity-50">Henüz yayınlanmış bir güncelleme yok.</p>
          )}
          {hasLoaded && updates.length > 0 && (
            <div className="space-y-3">
              {updates.map((item) => (
                <article key={item.id} className={`rounded-xl border p-4 ${darkMode ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-200 bg-zinc-50"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{item.title}</h3>
                    <div className="flex items-center gap-2 text-[11px] opacity-50">
                      {item.version && <span>{item.version}</span>}
                      {item.createdAt && <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}</time>}
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 opacity-70">{item.summary || item.description}</p>
                  {(item.articleBody || item.coverImage || item.videoUrl) && <Link href={`/updates/${item.slug || item.id}`} onClick={onClose} className="touch-target mt-2 inline-flex items-center text-sm font-medium text-violet-300 hover:text-violet-200">Ayrıntıları oku →</Link>}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
