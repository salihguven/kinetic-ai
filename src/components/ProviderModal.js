// src/components/ProviderModal.js
"use client";

import { useState } from "react";
import { X, ShieldCheck, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import CustomSelect from "./CustomSelect";

const PRESETS = [
  {
    name: "Groq",
    label: "Groq API",
    type: "openai-compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "",
    placeholderKey: "gsk_...",
    billingLabel: "Ücretsiz limit + ücretli kullanım",
    setup: [
      "Groq Console hesabı oluştur veya giriş yap.",
      "API Keys bölümünde Create API Key seç; anahtarı kopyala ve güvenli yerde tut.",
      "Anahtarı aşağıya yapıştırıp Doğrula'ya bas. KineticAI hesabında kullanılabilir modelleri getirir.",
    ],
    billing: "Ücretsiz katmanda istek ve token hız sınırları var. Daha yüksek limitler için kullanıma göre ücretlenen Developer katmanı bulunuyor.",
    security: "Ücretsiz/ücretli limitler hesap ve modele göre değişebilir. Güncel sınırları Console'daki Limits bölümünden kontrol et.",
    links: [
      { label: "API anahtarı oluştur", href: "https://console.groq.com/keys" },
      { label: "Ücret ve limitler", href: "https://console.groq.com/docs/billing-faqs" },
      { label: "API hızlı başlangıç", href: "https://console.groq.com/docs/quickstart" },
    ],
  },
  {
    name: "OpenRouter",
    label: "OpenRouter API",
    type: "openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "",
    placeholderKey: "sk-or-...",
    billingLabel: "Ücretsiz ve ücretli model seçenekleri",
    setup: [
      "OpenRouter hesabı aç veya giriş yap.",
      "Settings → API Keys sayfasında Create Key seçip bir anahtar oluştur.",
      "Anahtarı yapıştırıp Doğrula'ya bas. Bağlantıdan sonra kullanılabilir modelleri sohbet ekranından değiştirebilirsin.",
    ],
    billing: "Ücretsiz modeller var; model kimliğinin :free varyantı veya openrouter/free yönlendiricisi kullanılabilir. Ücretsiz modellerin hız/günlük sınırları olur. Ücretli modeller kredi bakiyesinden, seçilen modelin fiyatına göre düşer; kredi alımında platform ücreti uygulanabilir.",
    security: "Her modelin fiyatı ve görsel desteği farklıdır. Ücretsiz sanılan bir model yerine seçim ekranında model etiketini ve güncel fiyatını kontrol et.",
    links: [
      { label: "API anahtarı oluştur", href: "https://openrouter.ai/settings/keys" },
      { label: "Ücretsiz modeller", href: "https://openrouter.ai/collections/free-models" },
      { label: "Ücretler ve kredi sistemi", href: "https://openrouter.ai/pricing" },
    ],
  },
  {
    name: "Ollama Uzak Sunucu",
    label: "Ollama (uzak HTTPS sunucusu)",
    type: "ollama",
    baseUrl: "",
    model: "llama3.2",
    placeholderKey: "Bearer proxy tokeni",
    billingLabel: "Yerel ücretsiz / bulut ücretli olabilir",
    setup: [
      "Ollama'yı kendi bilgisayarında veya internete açık bir sunucuda kurup modeli indir.",
      "KineticAI web sunucusu senin bilgisayarındaki localhost adresine erişemez. Bu nedenle herkese açık HTTPS adresi olan, Bearer token ile korunan bir Ollama proxy/sunucusu gerekir.",
      "HTTPS sunucu adresini ve proxy tokenini gir; Doğrula ile bağlantıyı dene. Kurulu modeller bağlantıdan sonra sohbet ekranında listelenir.",
    ],
    billing: "Kendi bilgisayarında yerel çalıştırma için Ollama yazılımı ücretsizdir; donanım ve elektrik sana aittir. Bulut sunucu/proxy kullanırsan sunucu veya bulut model ücretleri çıkabilir.",
    security: "Bu gelişmiş bir kurulumdur. Ollama portunu internete kimlik doğrulamasız açma; KineticAI localhost ve özel ağ adreslerini bilerek engeller.",
    links: [
      { label: "Ollama'yı indir", href: "https://ollama.com/download" },
      { label: "Kurulum rehberi", href: "https://docs.ollama.com/quickstart" },
      { label: "Ollama bulut fiyatları", href: "https://ollama.com/pricing" },
    ],
  },
  {
    name: "Google Gemini",
    label: "Google Gemini API",
    type: "gemini",
    baseUrl: "",
    model: "",
    placeholderKey: "AIzaSy...",
    billingLabel: "Ücretsiz katman + ücretli katman",
    setup: [
      "Google AI Studio'ya Google hesabınla giriş yap.",
      "API keys sayfasında Create API key seç. Yeni anahtar bir Google Cloud projesine bağlanır.",
      "Anahtarı yapıştırıp Doğrula'ya bas; anahtarına açık modeller listelenecek.",
    ],
    billing: "Bazı Gemini modellerinde sınırlı ücretsiz katman bulunur. Ücretli katman için projeye faturalandırma bağlanır ve seçilen modelin token kullanımı ücretlendirilir.",
    security: "Google'ın fiyatlandırma sayfasında ücretsiz katmandaki içeriklerin ürünleri geliştirmek için kullanılabileceği belirtiliyor. Hassas verileri göndermeden önce veri kullanım koşullarını incele.",
    links: [
      { label: "API anahtarı oluştur", href: "https://aistudio.google.com/app/apikey" },
      { label: "Ücret ve ücretsiz katman", href: "https://ai.google.dev/gemini-api/docs/pricing" },
      { label: "Faturalandırmayı ayarla", href: "https://ai.google.dev/gemini-api/docs/billing" },
    ],
  },
  {
    name: "OpenAI",
    label: "OpenAI API (ChatGPT'den ayrı)",
    type: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    model: "",
    placeholderKey: "sk-...",
    billingLabel: "Kullanıma göre ücretli API",
    setup: [
      "OpenAI Platform'a giriş yap ve bir proje seç veya oluştur.",
      "Project API keys bölümünden Create new secret key seç; anahtarı oluştururken uygun proje/izinleri belirle ve kopyala.",
      "API Platform billing bölümünde ödeme yöntemini ve harcama sınırını kontrol et. Anahtarı yapıştırıp Doğrula'ya bas.",
    ],
    billing: "API kullanımı model ve token başına ayrıca ücretlenir. ChatGPT Plus aboneliği normalde API kullanımını içermez; varsa hesabına özel promosyon kredileri ayrıdır.",
    security: "Maliyet model, girdi/çıktı tokenı ve araç kullanımına bağlıdır. Harcama/limit ayarlarını API Platform'dan kontrol et.",
    links: [
      { label: "API anahtarı oluştur", href: "https://platform.openai.com/api-keys" },
      { label: "API model fiyatları", href: "https://platform.openai.com/pricing" },
      { label: "ChatGPT ve API faturalandırması", href: "https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform" },
    ],
  },
  {
    name: "Anthropic Claude",
    label: "Anthropic API (Claude'dan ayrı)",
    type: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    model: "",
    placeholderKey: "sk-ant-...",
    billingLabel: "Ön ödemeli API kredisi",
    setup: [
      "Anthropic Console hesabı aç veya giriş yap.",
      "Billing bölümünde API kullanım kredisi ekle; ardından Settings → API Keys bölümünden anahtar oluştur.",
      "Anahtarı yapıştırıp Doğrula'ya bas. Kullanılabilir Claude modellerini bağlantıdan sonra sohbet ekranından değiştirebilirsin.",
    ],
    billing: "Claude.ai Free/Pro/Max aboneliği API kullanımını kapsamaz. API Console kullanımı için önceden kredi yüklenir ve istekler modelin token fiyatına göre bu bakiyeden düşer.",
    security: "Kredi ve fiyatlandırma koşulları değişebilir; otomatik kredi yükleme açıksa ayrıca kontrol et.",
    links: [
      { label: "API anahtarı oluştur", href: "https://console.anthropic.com/settings/keys" },
      { label: "API fiyatları", href: "https://www.anthropic.com/pricing#api" },
      { label: "Kredi yükleme rehberi", href: "https://support.anthropic.com/en/articles/8977456-how-do-i-pay-for-my-api-usage" },
    ],
  },
  {
    name: "Özel AI",
    label: "Özel AI endpoint",
    type: "custom",
    baseUrl: "",
    model: "custom-model",
    placeholderKey: "İsteğe bağlı Token",
    billingLabel: "Endpoint sağlayıcısına bağlı",
    setup: [
      "Kullandığın AI sunucusunda veya sağlayıcı panelinde API erişimini etkinleştir ve gerekiyorsa anahtar oluştur.",
      "Sağlayıcının HTTPS endpoint adresini, istediği istek biçimini, model kimliğini ve yanıt JSON biçimini öğren. KineticAI; reply, response, text, output veya OpenAI uyumlu choices alanını okuyabilir.",
      "Endpoint adresini ve gerekiyorsa anahtarı girip Doğrula'ya bas. Model kimliği bağlantıdan sonra yönetilebilir; fiyat ve kota endpoint sağlayıcının koşullarına bağlıdır.",
    ],
    billing: "KineticAI bu endpoint için ücret belirlemez. Ücretsiz/ücretli kullanım, kota, gizlilik ve faturalandırmayı endpoint sağlayıcısından doğrula.",
    security: "Yalnızca güvendiğin HTTPS sunucularını kullan. localhost, özel ağ ve güvenli olmayan adresler engellenir.",
    links: [],
  },
];

async function callVerifyEndpoint(providerData) {
  const res = await fetch("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: providerData }),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        "404: '/api/verify' bulunamadı. 'src/app/api/verify/route.js' dosyasının yerini kontrol et."
      );
    }
    throw new Error(data?.error || `Doğrulama hatası (HTTP ${res.status}).`);
  }

  if (!data) {
    throw new Error("Sunucudan boş yanıt döndü. Terminaldeki hatayı kontrol et.");
  }

  return data;
}

export default function ProviderModal({ isOpen, onClose, onAdd, darkMode }) {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [name, setName] = useState(PRESETS[0].name);
  const [type, setType] = useState(PRESETS[0].type);
  const [baseUrl, setBaseUrl] = useState(PRESETS[0].baseUrl);
  const [model, setModel] = useState(PRESETS[0].model);
  const [apiKey, setApiKey] = useState("");

  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [verifyError, setVerifyError] = useState("");

  if (!isOpen) return null;

  const currentPreset = PRESETS[selectedPresetIndex];

  const resetVerification = () => {
    setIsVerified(false);
    setAvailableModels([]);
    setVerifyError("");
  };

  const closeModal = () => {
    setApiKey("");
    resetVerification();
    onClose();
  };

  const handlePresetChange = (index) => {
    const p = PRESETS[index];
    setSelectedPresetIndex(index);
    setType(p.type);
    setBaseUrl(p.baseUrl);
    setModel(p.model);
    setName(p.name);
    setApiKey("");
    resetVerification();
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerifyError("");
    setIsVerified(false);

    try {
      const data = await callVerifyEndpoint({
        type,
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        model: model.trim(),
      });

      setIsVerified(true);
      if (Array.isArray(data.models) && data.models.length > 0) {
        setAvailableModels([...new Set(data.models)].slice(0, 250));
      }
    } catch (err) {
      setVerifyError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsVerifying(true);
    setVerifyError("");
    try {
      const data = isVerified
        ? { models: availableModels }
        : await callVerifyEndpoint({
            type,
            baseUrl: baseUrl.trim(),
            apiKey: apiKey.trim(),
            model: model.trim(),
          });
      const models = Array.isArray(data.models)
        ? [...new Set(data.models.filter((item) => typeof item === "string" && item.trim()))].slice(0, 250)
        : [];
      const preferredModel = model.trim();
      const initialModel = models.includes(preferredModel)
        ? preferredModel
        : models[0] || preferredModel || "custom-model";
      const result = onAdd({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim(),
        type,
        baseUrl: baseUrl.trim(),
        model: initialModel,
        availableModels: models,
        apiKey: apiKey.trim(),
        verified: true,
      });

      if (result?.duplicate) {
        setVerifyError(result.message);
        return;
      }
      setApiKey("");
      resetVerification();
      closeModal();
    } catch (err) {
      setVerifyError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const cardClass = darkMode
    ? "border-zinc-800 bg-zinc-900 text-zinc-100"
    : "border-zinc-200 bg-white text-zinc-900";
  const inputClass = darkMode
    ? "border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-zinc-500"
    : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-900";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm animate-fadeIn">
      <div className={`max-h-[92dvh] w-full max-w-xl overflow-y-auto overscroll-contain rounded-2xl border p-4 shadow-2xl animate-scaleIn sm:p-6 ${cardClass}`}>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <h2 className="text-base font-semibold">Doğrulanmış AI Bağlantısı Ekle</h2>
          </div>
          <button
            onClick={closeModal}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg opacity-60 transition hover:opacity-100"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium opacity-60">
              Sağlayıcı / Şablon
            </label>
            <CustomSelect
              value={selectedPresetIndex}
              onChange={(val) => handlePresetChange(Number(val))}
              darkMode={darkMode}
              searchable={false}
              options={PRESETS.map((p, idx) => ({
                value: idx,
                label: p.label,
              }))}
            />
          </div>

          <section className={`rounded-xl border p-4 ${darkMode ? "border-violet-400/20 bg-violet-400/[0.05]" : "border-violet-200 bg-violet-50/70"}`} aria-live="polite">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">{currentPreset.name} kurulum rehberi</h3>
              <span className={`max-w-[55%] shrink-0 whitespace-normal rounded-full px-2 py-1 text-right text-[10px] font-semibold leading-3 ${darkMode ? "bg-violet-300/10 text-violet-200" : "bg-violet-100 text-violet-700"}`}>
                {currentPreset.billingLabel}
              </span>
            </div>
            <ol className="space-y-2.5 text-xs leading-5 opacity-80">
              {currentPreset.setup.map((step, index) => (
                <li key={step} className="flex gap-2.5">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${darkMode ? "bg-violet-300/15 text-violet-200" : "bg-violet-100 text-violet-700"}`}>
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className={`mt-3 rounded-lg border p-3 text-xs leading-5 ${darkMode ? "border-white/[0.06] bg-black/20" : "border-violet-200/70 bg-white/70"}`}>
              <p><strong>Ücretsiz / ücretli:</strong> {currentPreset.billing}</p>
              <p className="mt-2 opacity-70">{currentPreset.security}</p>
              <p className="mt-2 font-medium">Varsa API ücreti KineticAI&apos;ye değil, doğrudan sağlayıcı hesabına yansır.</p>
            </div>
            {currentPreset.links.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {currentPreset.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex min-h-9 items-center rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition ${darkMode ? "border-white/10 bg-white/[0.04] text-violet-200 hover:bg-white/[0.08]" : "border-violet-200 bg-white text-violet-700 hover:bg-violet-100"}`}
                  >
                    {link.label} ↗
                  </a>
                ))}
              </div>
            )}
          </section>

          <div>
            <label className="mb-1.5 block text-xs font-medium opacity-60">
              Görünen İsim
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`min-h-[44px] w-full rounded-xl border px-3 text-sm outline-none ${inputClass}`}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium opacity-60">
              API Key {type === "ollama" ? "(Proxy tokeni zorunlu)" : type === "custom" ? "(İsteğe bağlı)" : "(Doğrulama zorunlu)"}
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  resetVerification();
                }}
                placeholder={currentPreset.placeholderKey}
                className={`min-h-[44px] flex-1 rounded-xl border px-3 text-sm outline-none ${inputClass}`}
              />
              <button
                type="button"
                onClick={handleVerify}
                disabled={isVerifying}
                className={`flex min-h-[44px] items-center gap-1.5 rounded-xl border px-4 text-xs font-medium transition ${
                  darkMode
                    ? "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                    : "border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                }`}
              >
                {isVerifying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                Doğrula
              </button>
            </div>
            <p className="mt-1.5 text-[11px] leading-4 opacity-55">
              Anahtar gizli bilgi gibidir: kimseyle paylaşma. KineticAI bağlantı ayarını bu tarayıcıda saklar ve istek sırasında KineticAI sunucusu üzerinden seçtiğin sağlayıcıya iletir.
            </p>
          </div>

          <div className={`rounded-xl border px-3 py-3 text-xs leading-relaxed ${darkMode ? "border-zinc-800 bg-zinc-950/60 text-zinc-300" : "border-zinc-200 bg-zinc-50 text-zinc-700"}`}>
            <p className="font-medium">Modeli şimdi seçmen gerekmiyor.</p>
            <p className="mt-1 opacity-70">
              {availableModels.length > 0
                ? `${availableModels.length} kullanılabilir model bulundu. Bağlantıyı kaydedince sohbet alanından istediğini seçebilirsin.`
                : "Bağlantı kaydedildikten sonra sohbet alanından model seçebilir; eski bağlantılar için model listesini yenileyebilirsin."}
            </p>
          </div>

          {type !== "gemini" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium opacity-60">
                API Base URL / Endpoint
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => {
                  setBaseUrl(e.target.value);
                  resetVerification();
                }}
                placeholder={type === "ollama" ? "https://ai.example.com" : type === "custom" ? "https://api.example.com/predict" : "https://api.example.com/v1"}
                className={`min-h-[44px] w-full rounded-xl border px-3 text-sm outline-none ${inputClass}`}
              />
              {type === "ollama" && <p className="mt-1.5 text-[11px] opacity-50">Uzak proxy&apos;de Ollama&apos;nın /api/tags ve /api/chat yolları HTTPS üzerinden erişilebilir olmalı.</p>}
            </div>
          )}

          {isVerified && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Bağlantı doğrulandı. Sağlayıcı ayarını kaydedebilirsin.</span>
            </div>
          )}

          {verifyError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="min-h-[44px] rounded-xl border border-zinc-700/40 px-4 text-sm opacity-80 hover:opacity-100"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className={`min-h-[44px] rounded-xl px-5 text-sm font-medium transition disabled:opacity-50 ${
                darkMode
                  ? "bg-white text-zinc-950 hover:bg-zinc-200"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              {isVerifying ? "Doğrulanıyor..." : "Doğrula ve Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
