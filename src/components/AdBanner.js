// src/components/AdBanner.js
"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

export default function AdBanner({
  slotId = "",
  format = "horizontal", // "horizontal" | "box"
  darkMode = true,
}) {
  const adRef = useRef(null);

  useEffect(() => {
    // Gerçek AdSense script'i yüklüyse reklamı tetikle
    if (typeof window !== "undefined" && window.adsbygoogle && slotId) {
      try {
        window.adsbygoogle.push({});
      } catch {
        // ignore
      }
    }
  }, [slotId]);

  // Eğer AdSense slotId henüz girilmemişse (onay bekleniyorsa) şık bir sponsor alanı göster:
  if (!slotId) {
    return (
      <div
        className={`my-3 overflow-hidden rounded-xl border p-3 text-center text-xs transition ${
          format === "box" ? "h-36" : "h-16"
        } flex flex-col items-center justify-center ${
          darkMode
            ? "border-zinc-800/80 bg-zinc-900/30 text-zinc-400"
            : "border-zinc-200 bg-zinc-100/70 text-zinc-600"
        }`}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-70">
          <Sparkles className="h-3 w-3 text-emerald-400" />
          <span>Reklam alanı</span>
        </div>
        <p className="mt-1 text-[10px] opacity-45">
          Bu alan, içerik ile reklamın açıkça ayrılması için ayrılmıştır.
        </p>
      </div>
    );
  }

  // Gerçek Google AdSense Kodu
  return (
    <div ref={adRef} className="my-3 overflow-hidden text-center">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-XXXXXXXXXXXXXXXX"}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
