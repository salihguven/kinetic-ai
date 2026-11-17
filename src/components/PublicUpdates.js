"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { loadPublishedUpdates } from "@/lib/updatesClient";

const categoryLabels = {
  feature: "Yeni özellik",
  improvement: "İyileştirme",
  fix: "Hata düzeltmesi",
  announcement: "Duyuru",
};

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
    <div className="mt-7 space-y-3 sm:mt-10 sm:space-y-4" aria-live="polite">
      {loading && (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-gray-400 sm:p-6">
          Güncellemeler yükleniyor…
        </p>
      )}
      {error && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200 sm:p-6" role="alert">
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
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-400 sm:p-8">
          Henüz yayınlanmış bir güncelleme yok.
        </p>
      )}
      {updates.map((item) => (
        <article key={item.id} className="rounded-2xl border border-white/10 bg-[#11131e] p-4 transition-colors hover:border-white/15 sm:p-7">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="rounded-full bg-violet-500/15 px-3 py-1 text-[11px] font-bold text-violet-300">{categoryLabels[item.category] || "Güncelleme"}</span>
            {item.version && <span className="text-xs text-gray-400">Sürüm {item.version}</span>}
            {item.createdAt && (
              <time dateTime={item.createdAt} className="text-xs text-gray-500 sm:ml-auto">
                {new Date(item.createdAt).toLocaleDateString("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" })}
              </time>
            )}
          </div>
          <h2 className="mt-4 break-words text-lg font-bold leading-snug sm:text-2xl">{item.title}</h2>
          {item.coverImage && (
            <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-xl border border-white/10 sm:mt-5">
              <Image src={item.coverImage} alt={item.coverAlt || `${item.title} güncelleme görseli`} fill sizes="(max-width: 768px) 100vw, 900px" loading="lazy" className="object-cover" />
            </div>
          )}
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-300 sm:mt-3 sm:text-base sm:leading-7">{item.summary || item.description}</p>
          {item.videoUrl && <p className="mt-3 text-xs font-medium text-gray-500">Video yazının ayrıntılarında</p>}
          {(item.articleBody || item.coverImage || item.videoUrl) && (
            <Link href={`/updates/${item.slug || item.id}`} className="touch-target mt-3 inline-flex items-center rounded-lg text-sm font-semibold text-violet-300 transition hover:text-violet-200 sm:mt-4">
              Ayrıntıları oku <span aria-hidden="true" className="ml-2">→</span>
            </Link>
          )}
        </article>
      ))}
    </div>
  );
}
