// src/components/QuotaCard.js
"use client";

import { useState, useEffect } from "react";
import { Zap, Gift, ShieldCheck, Sparkles, Clock } from "lucide-react";

/**
 * REKLAM SDK ENTEGRASYON NOKTASI
 * ---------------------------------
 * Bir reklam ağı (AdMob H5 Games Ads, AdinPlay, Unity Ads vb.) entegre
 * edildiğinde, o SDK'nın yüklenme kodunda şunu tanımlaman yeterli:
 *
 *   window.__kineticAdSDK = {
 *     isReady: () => true/false,       // Gösterilecek bir reklam hazır mı?
 *     show: (onComplete) => {          // Reklamı göster
 *       // reklam bittiğinde:
 *       onComplete(true);  // kullanıcı sonuna kadar izlediyse
 *       onComplete(false); // erken kapattıysa / başarısızsa
 *     },
 *   };
 *
 * Bu obje tanımlı ve isReady() true dönene kadar, buton devre dışı
 * kalır ve kullanıcıya "reklam şu anda mevcut değil" gösterilir.
 * Sahte/simüle edilmiş bir ödül ASLA verilmez.
 */

export default function QuotaCard({
  dailyCount = 0,
  dailyLimit = 100,
  onOpenAccount,
  onBonusEarned,
  darkMode = true,
  lang = "tr",
}) {
  const [bonusLoading, setBonusLoading] = useState(false);
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const [resetTimeText, setResetTimeText] = useState("");
  const [adReady, setAdReady] = useState(false);

  const remaining = Math.max(0, dailyLimit - dailyCount);
  const percentage = Math.min(100, Math.round((dailyCount / dailyLimit) * 100));

  // Gece 00:00'a kalan süreyi hesapla
  useEffect(() => {
    const calcRemaining = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diffMs = midnight - now;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setResetTimeText(`${hours}s ${mins}dk`);
    };
    calcRemaining();
    const interval = setInterval(calcRemaining, 60000);
    return () => clearInterval(interval);
  }, []);

  // Gerçek reklam SDK'sının hazır olup olmadığını periyodik kontrol et
  useEffect(() => {
    const checkAdReady = () => {
      const sdk = typeof window !== "undefined" ? window.__kineticAdSDK : null;
      const ready = Boolean(
        sdk && typeof sdk.isReady === "function" && sdk.isReady()
      );
      setAdReady(ready);
    };

    checkAdReady();
    const interval = setInterval(checkAdReady, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleWatchAdBonus = () => {
    const sdk = typeof window !== "undefined" ? window.__kineticAdSDK : null;
    if (!sdk || typeof sdk.show !== "function" || !adReady) return;

    setBonusLoading(true);
    sdk.show((success) => {
      setBonusLoading(false);
      if (success) {
        setBonusClaimed(true);
        if (onBonusEarned) onBonusEarned(25);
        setTimeout(() => setBonusClaimed(false), 3500);
      }
    });
  };

  // Doluluk rengi
  const barColor =
    percentage > 85 ? "bg-red-500" : percentage > 60 ? "bg-amber-400" : "bg-emerald-400";

  return (
    <div
      className={`rounded-xl border p-3.5 transition-all ${
        darkMode ? "border-zinc-800 bg-zinc-950/80" : "border-zinc-200 bg-zinc-50"
      }`}
    >
      <div className="mb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold">
          <Zap className="h-3.5 w-3.5 text-emerald-400" />
          <span>{lang === "en" ? "Daily Fair Quota" : "Günlük Adil Kota"}</span>
        </div>
        <span className="font-mono text-[11px] opacity-60">
          {dailyCount} / {dailyLimit}
        </span>
      </div>

      {/* İlerleme Çubuğu */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800/50">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] opacity-55">
        <span>{remaining} istek kaldı</span>
        <span>Yenilenme: {resetTimeText}</span>
      </div>

      {/* Bonus / Ödüllü Reklam Butonu */}
      <div className="mt-3 border-t border-zinc-800/40 pt-2.5">
        {bonusClaimed ? (
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 py-1.5 text-center text-[11px] font-semibold text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            +25 Ekstra İstek Eklendi!
          </div>
        ) : (
          <button
            type="button"
            disabled={bonusLoading || !adReady}
            onClick={handleWatchAdBonus}
            title={
              !adReady
                ? "Reklam sağlayıcısı henüz bağlı değil veya şu anda gösterilecek reklam yok."
                : undefined
            }
            className={`flex min-h-[32px] w-full items-center justify-center gap-1.5 rounded-lg border text-[11px] font-medium transition ${
              !adReady
                ? "cursor-not-allowed border-zinc-700/40 text-zinc-500 opacity-50"
                : darkMode
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                : "border-emerald-600/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {!adReady ? (
              <>
                <Clock className="h-3.5 w-3.5" />
                Reklam Şu An Mevcut Değil
              </>
            ) : (
              <>
                <Gift className="h-3.5 w-3.5" />
                {bonusLoading ? "Sponsor Yükleniyor..." : "+25 Ekstra İstek Kazan (Reklam)"}
              </>
            )}
          </button>
        )}
      </div>

      <button
        onClick={onOpenAccount}
        className="mt-2 flex w-full items-center justify-center gap-1 text-[10px] opacity-45 hover:underline hover:opacity-80"
      >
        <ShieldCheck className="h-3 w-3" />
        Hesap & Güvenlik Ayarları
      </button>
    </div>
  );
}