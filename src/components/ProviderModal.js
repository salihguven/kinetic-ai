// src/components/ProviderModal.js
"use client";

import { useState } from "react";
import { X, ShieldCheck, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import CustomSelect from "./CustomSelect";

const PRESETS = [
  {
    label: "Groq (Ücretsiz & Ultra Hızlı)",
    type: "openai-compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    placeholderKey: "gsk_...",
    hint: "console.groq.com üzerinden ücretsiz API Key alabilirsin (Metin ve Kod için en hızlısı).",
  },
  {
    label: "OpenRouter (Ücretsiz Görsel & Metin AI)",
    type: "openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    placeholderKey: "sk-or-...",
    hint: "openrouter.ai üzerinden ücretsiz anahtar al. ':free' etiketli modeller hem metin hem görsel destekler.",
  },
  {
    label: "Ollama (Uzak HTTPS Sunucusu)",
    type: "ollama",
    baseUrl: "",
    model: "llama3.2",
    placeholderKey: "Bearer proxy tokeni",
    hint: "KineticAI sunucusunun erişebildiği, HTTPS kullanan ve Bearer token isteyen bir Ollama proxy adresi girin. localhost ve özel ağ adresleri güvenlik için engellenir.",
  },
  {
    label: "Google Gemini (Kendi API Anahtarın)",
    type: "gemini",
    baseUrl: "",
    model: "gemini-2.0-flash",
    placeholderKey: "AIzaSy...",
    hint: "aistudio.google.com üzerinden alınan kişisel anahtar (bölgesel kotalara tabidir).",
  },
  {
    label: "OpenAI (ChatGPT)",
    type: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    placeholderKey: "sk-...",
    hint: "OpenAI platformundan alınan API Key.",
  },
  {
    label: "Anthropic (Claude)",
    type: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-3-5-sonnet-latest",
    placeholderKey: "sk-ant-...",
    hint: "Anthropic Console API Key.",
  },
  {
    label: "Özel / Custom AI Endpoint",
    type: "custom",
    baseUrl: "",
    model: "custom-model",
    placeholderKey: "İsteğe bağlı Token",
    hint: "Kendi modelinizin herkese açık HTTPS endpoint adresini girin. localhost ve özel ağ adresleri güvenlik için engellenir.",
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
  const [name, setName] = useState("Groq");
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

  const handlePresetChange = (index) => {
    const p = PRESETS[index];
    setSelectedPresetIndex(index);
    setType(p.type);
    setBaseUrl(p.baseUrl);
    setModel(p.model);
    setName(p.label.split(" (")[0]);
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
        setAvailableModels(data.models);
        if (!data.models.includes(model)) {
          setModel(data.models[0]);
        }
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

    if (!isVerified) {
      setIsVerifying(true);
      setVerifyError("");
      try {
        const data = await callVerifyEndpoint({
          type,
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim(),
          model: model.trim(),
        });

        const finalModel =
          Array.isArray(data.models) &&
          data.models.length > 0 &&
          !data.models.includes(model.trim())
            ? data.models[0]
            : model.trim();

        onAdd({
          id: Date.now().toString(),
          name: name.trim(),
          type,
          baseUrl: baseUrl.trim(),
          model: finalModel,
          apiKey: apiKey.trim(),
          verified: true,
        });
        setApiKey("");
        resetVerification();
        onClose();
      } catch (err) {
        setVerifyError(err.message);
      } finally {
        setIsVerifying(false);
      }
      return;
    }

    onAdd({
      id: Date.now().toString(),
      name: name.trim(),
      type,
      baseUrl: baseUrl.trim(),
      model: model.trim(),
      apiKey: apiKey.trim(),
      verified: true,
    });

    setApiKey("");
    resetVerification();
    onClose();
  };

  const cardClass = darkMode
    ? "border-zinc-800 bg-zinc-900 text-zinc-100"
    : "border-zinc-200 bg-white text-zinc-900";
  const inputClass = darkMode
    ? "border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-zinc-500"
    : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-900";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm animate-fadeIn">
      <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl animate-scaleIn ${cardClass}`}>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <h2 className="text-base font-semibold">Doğrulanmış AI Bağlantısı Ekle</h2>
          </div>
          <button
            onClick={onClose}
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
            <p className="mt-1.5 text-xs opacity-60">{currentPreset.hint}</p>
          </div>

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
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium opacity-60">
              Model {availableModels.length > 0 && `(${availableModels.length} aktif model bulundu)`}
            </label>
            {availableModels.length > 0 ? (
              <CustomSelect
                value={model}
                onChange={(val) => setModel(val)}
                darkMode={darkMode}
                options={availableModels.map((m) => ({ value: m, label: m }))}
              />
            ) : (
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={`min-h-[44px] w-full rounded-xl border px-3 text-sm outline-none ${inputClass}`}
              />
            )}
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
              onClick={onClose}
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
