// src/components/LegalModal.js
"use client";

import { X, Shield, Scale, AlertTriangle, Database } from "lucide-react";

export default function LegalModal({ isOpen, onClose, darkMode, lang = "tr" }) {
  if (!isOpen) return null;

  const isEn = lang === "en";
  const cardClass = darkMode
    ? "border-zinc-800 bg-zinc-900 text-zinc-100"
    : "border-zinc-200 bg-white text-zinc-900";
  const boxClass = darkMode
    ? "border-zinc-800/80 bg-zinc-950/60"
    : "border-zinc-200 bg-zinc-50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn">
      <div
        className={`flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border shadow-2xl animate-scaleIn ${cardClass}`}
      >
        <div className="flex items-center justify-between border-b border-zinc-800/40 px-6 py-4">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-emerald-400" />
            <h2 className="text-base font-semibold">
              {isEn
                ? "Privacy Policy & Terms of Use"
                : "Gizlilik Politikası ve Kullanım Koşulları"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg opacity-60 transition hover:opacity-100"
            aria-label={isEn ? "Close" : "Kapat"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-6 text-xs leading-relaxed">
          {/* 1. Bireysel Proje Bildirimi */}
          <section className={`rounded-xl border p-4 ${boxClass}`}>
            <h3 className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
              <Shield className="h-4 w-4 text-emerald-400" />
              {isEn
                ? "1. Individual Project & Disclaimer"
                : "1. Bireysel Proje Statüsü ve Sorumluluk Reddi"}
            </h3>
            <p className="opacity-80">
              {isEn ? (
                <>
                  <strong>KineticAI</strong> is an independent, non-commercial, free
                  project developed by an individual (not a registered company or legal
                  entity). The service is provided &quot;as-is&quot; without uptime or
                  accuracy guarantees.
                </>
              ) : (
                <>
                  <strong>KineticAI</strong>, ticari bir şirket veya kurum tarafından değil,
                  bireysel bir geliştirici tarafından tamamen ücretsiz ve açık amaçlı
                  sunulmaktadır. Hizmet &quot;olduğu gibi&quot; (as-is) sağlanır;
                  kesintisiz çalışma veya yanıt doğruluğu garantisi verilmez.
                </>
              )}
            </p>
          </section>

          {/* 2. Veri ve API Anahtarı Gizliliği */}
          <section className={`rounded-xl border p-4 ${boxClass}`}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Database className="h-4 w-4 text-emerald-400" />
              {isEn
                ? "2. API Keys, Local Storage & Account Data"
                : "2. API Anahtarları, Yerel Depolama ve Hesap Verileri"}
            </h3>
            <ul className="list-disc space-y-1.5 pl-4 opacity-80 marker:text-emerald-400">
              <li>
                {isEn ? (
                  <>
                    External AI API keys (Groq, Gemini, OpenAI, etc.), chat histories,
                    Notebook sources, and Task lists are{" "}
                    <strong>never stored on our servers or database.</strong> They remain
                    exclusively in your browser&apos;s local storage.
                  </>
                ) : (
                  <>
                    Eklediğiniz harici AI API anahtarları (Groq, Gemini, OpenAI vb.),
                    sohbet geçmişiniz, Notlar (Notebook) kaynaklarınız ve Görev listeniz{" "}
                    <strong>veritabanımızda veya sunucumuzda saklanmaz.</strong>{" "}
                    Yalnızca kendi tarayıcınızın yerel belleğinde tutulur.
                  </>
                )}
              </li>
              <li>
                {isEn
                  ? "When you send a prompt, your API key is transmitted over encrypted HTTPS solely to forward your request to the AI provider you selected."
                  : "Mesaj gönderdiğinizde API anahtarınız şifreli HTTPS bağlantısı üzerinden yalnızca seçtiğiniz yapay zeka sağlayıcısına iletilmek üzere anlık olarak kullanılır."}
              </li>
              <li>
                {isEn
                  ? "Only your Name, Email, daily usage quota, and moderation status are stored via Google Firebase Authentication & Firestore. You may permanently delete your account anytime from Account Security."
                  : "Kimlik doğrulama ve kota takibi için yalnızca Ad, E-posta, günlük kullanım sayacı ve moderasyon durumu Google Firebase altyapısında tutulur. Hesabınızı dilediğiniz an Hesap Güvenliği penceresinden kalıcı olarak silebilirsiniz."}
              </li>
            </ul>
          </section>

          {/* 3. Kurallar, Kısıtlamalar ve Moderasyon */}
          <section className={`rounded-xl border p-4 ${boxClass}`}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              {isEn
                ? "3. Usage Limits, Moderation & Security"
                : "3. Kullanım Sınırları, Oto-Moderasyon ve Güvenlik"}
            </h3>
            <ul className="list-disc space-y-1.5 pl-4 opacity-80 marker:text-amber-400">
              <li>
                {isEn
                  ? "A fair-use limit of 100 requests per day applies to protect shared infrastructure from automated spam."
                  : "Altyapıyı korumak amacıyla tüm kullanıcılar için günlük 100 istek adil kullanım kotası ve dakika bazlı hız sınırı (rate limit) uygulanır."}
              </li>
              <li>
                {isEn
                  ? "Automated moderation checks for abusive language or spam. After 3 warnings, AI features are temporarily locked; severe violations may lead to permanent account suspension."
                  : "Sistemde otomatik içerik moderasyonu bulunur. Küfür, hakaret veya kötüye kullanımda 3 uyarının ardından tüm AI özellikleri geçici olarak kilitlenir; ağır ihlallerde hesap kalıcı olarak yasaklanabilir."}
              </li>
              <li>
                {isEn
                  ? "Connections through VPNs, Proxies, or Cloudflare WARP may be blocked automatically for security."
                  : "Güvenlik ve spam engelleme amacıyla VPN, Proxy veya Cloudflare WARP üzerinden gelen bağlantılar otomatik olarak kısıtlanabilir."}
              </li>
              <li>
                {isEn
                  ? "Users are solely responsible for complying with the terms of third-party AI APIs they connect and for verifying AI-generated outputs (medical, legal, financial, or code)."
                  : "Bağlanan üçüncü taraf API sağlayıcılarının kullanım şartlarına uymak ve yapay zeka çıktılarının (hukuki, tıbbi, finansal veya kod) doğruluğunu teyit etmek tamamen kullanıcının sorumluluğundadır."}
              </li>
            </ul>
          </section>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800/40 px-6 py-3.5">
          <span className="text-[11px] opacity-45">
            {isEn ? "Last updated: 2026" : "Son güncelleme: 2026"}
          </span>
          <button
            onClick={onClose}
            className={`min-h-[42px] rounded-xl px-5 text-xs font-semibold transition ${
              darkMode
                ? "bg-white text-zinc-950 hover:bg-zinc-200"
                : "bg-zinc-900 text-white hover:bg-zinc-800"
            }`}
          >
            {isEn ? "Got it" : "Okudum, Anladım"}
          </button>
        </div>
      </div>
    </div>
  );
}