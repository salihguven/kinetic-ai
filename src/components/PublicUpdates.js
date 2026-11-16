"use client";

import { useEffect, useState } from "react";
import { loadPublishedUpdates } from "@/lib/updatesClient";

export default function PublicUpdates({ initialUpdates }) {
  const [updates, setUpdates] = useState(initialUpdates || []);
  const [loading, setLoading] = useState(initialUpdates === null);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadPublishedUpdates()
      .then((result) => {
        if (cancelled) return;
        setUpdates(result);
        setError("");
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || "Güncellemeler yüklenemedi.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  return (
    <div className="mt-10 space-y-4" aria-live="polite">
      {loading && (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-gray-400">
          Güncellemeler yükleniyor…
        </p>
      )}
      {error && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-amber-200" role="alert">
          <p>Güncellemeler şu anda yüklenemiyor. Lütfen tekrar deneyin.</p>
          <button
            type="button"
            onClick={() => {
              setError("");
              setLoading(true);
              setRetryCount((count) => count + 1);
            }}
            className="mt-3 rounded-lg border border-amber-400/30 px-3 py-1.5 text-sm hover:bg-amber-500/10"
          >
            Tekrar dene
          </button>
        </div>
      )}
      {!loading && !error && updates.length === 0 && (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-gray-400">
          Henüz yayınlanmış bir güncelleme yok.
        </p>
      )}
      {updates.map((item) => (
        <article key={item.id} className="rounded-2xl border border-white/10 bg-[#11131e] p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-violet-500/15 px-3 py-1 text-[11px] font-bold text-violet-300">GÜNCELLEME</span>
            {item.version && <span className="text-xs text-gray-400">Sürüm {item.version}</span>}
            {item.createdAt && (
              <time dateTime={item.createdAt} className="ml-auto text-xs text-gray-500">
                {new Date(item.createdAt).toLocaleDateString("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" })}
              </time>
            )}
          </div>
          <h2 className="mt-4 text-xl font-bold sm:text-2xl">{item.title}</h2>
          <p className="mt-3 whitespace-pre-wrap leading-7 text-gray-300">{item.description}</p>
        </article>
      ))}
    </div>
  );
}
