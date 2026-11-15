// src/app/api/verify/route.js
import { NextResponse } from "next/server";
import { checkRateLimit, validateSafeUrl } from "@/lib/security";
import { callAIProvider } from "@/lib/aiAdapters";

async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function filterAndSortModels(ids, priorityList) {
  const ignored = [
    "whisper",
    "tts",
    "guard",
    "embedding",
    "imagen",
    "veo",
    "aqa",
    "dall-e",
    "sora",
    "audio",
  ];

  return ids
    .filter((id) => !ignored.some((bad) => id.toLowerCase().includes(bad)))
    .sort((a, b) => {
      const aScore = priorityList.findIndex((p) => a.toLowerCase().includes(p));
      const bScore = priorityList.findIndex((p) => b.toLowerCase().includes(p));
      if (aScore !== -1 && bScore !== -1) return aScore - bScore;
      if (aScore !== -1) return -1;
      if (bScore !== -1) return 1;
      return a.localeCompare(b);
    });
}

export async function POST(request) {
  try {
    const rate = checkRateLimit(request, 15, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: rate.message }, { status: 429 });
    }

    const { provider } = await request.json();
    if (!provider || !provider.type) {
      return NextResponse.json({ error: "Geçersiz sağlayıcı bilgisi." }, { status: 400 });
    }

    const { type, baseUrl, apiKey } = provider;

    if (baseUrl && !validateSafeUrl(baseUrl)) {
      return NextResponse.json(
        { error: "Güvenlik engeli: Geçersiz veya izin verilmeyen URL protokolü." },
        { status: 400 }
      );
    }

    // 1. GOOGLE GEMINI DOĞRULAMA
    if (type === "gemini") {
      if (!apiKey) {
        return NextResponse.json({ error: "Gemini API Key boş olamaz." }, { status: 400 });
      }
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
          apiKey
        )}`
      );
      const data = await safeJson(res);
      if (!res.ok) {
        return NextResponse.json(
          { error: data?.error?.message || "Gemini API anahtarı geçersiz!" },
          { status: 401 }
        );
      }

      const rawModels = (data?.models || [])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => m.name.replace("models/", ""));

      const models = filterAndSortModels(rawModels, [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-2.5-pro",
        "gemini-1.5-flash",
      ]);

      return NextResponse.json({ valid: true, models });
    }

    // 2. OPENAI-COMPATIBLE (Groq, OpenRouter, OpenAI) DOĞRULAMA
    if (type === "openai-compatible") {
      if (!apiKey) {
        return NextResponse.json({ error: "API Key zorunludur." }, { status: 400 });
      }
      const rootBase = (baseUrl || "https://api.openai.com/v1")
        .replace(/\/chat\/completions\/?$/, "")
        .replace(/\/+$/, "");

      if (rootBase.includes("openrouter.ai")) {
        const authRes = await fetch("https://openrouter.ai/api/v1/auth/key", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!authRes.ok) {
          return NextResponse.json(
            { error: "OpenRouter API anahtarı geçersiz veya yetkisiz!" },
            { status: 401 }
          );
        }
      }

      const res = await fetch(`${rootBase}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await safeJson(res);
      if (!res.ok) {
        return NextResponse.json(
          { error: data?.error?.message || "API anahtarı doğrulanamadı (Yetkisiz erişim)." },
          { status: 401 }
        );
      }

      const rawModels = (data?.data || []).map((m) => m.id);
      const models = filterAndSortModels(rawModels, [
        "llama-3.3-70b",
        "llama-3.1-8b",
        "llama-4",
        "qwen",
        "gpt-oss",
        "gpt-4o",
        "deepseek",
      ]);

      return NextResponse.json({ valid: true, models });
    }

    // 3. ANTHROPIC (CLAUDE) DOĞRULAMA
    if (type === "anthropic") {
      if (!apiKey) {
        return NextResponse.json({ error: "Anthropic API Key zorunludur." }, { status: 400 });
      }
      const rootBase = (baseUrl || "https://api.anthropic.com/v1").replace(/\/+$/, "");
      const res = await fetch(`${rootBase}/models`, {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      });
      const data = await safeJson(res);
      if (!res.ok) {
        return NextResponse.json(
          { error: data?.error?.message || "Anthropic API anahtarı geçersiz!" },
          { status: 401 }
        );
      }
      const models = (data?.data || []).map((m) => m.id);
      return NextResponse.json({ valid: true, models });
    }

    // 4. OLLAMA DOĞRULAMA
    if (type === "ollama") {
      const rootBase = (baseUrl || "http://localhost:11434").replace(/\/+$/, "");
      const res = await fetch(`${rootBase}/api/tags`);
      const data = await safeJson(res);
      if (!res.ok) {
        return NextResponse.json(
          { error: "Ollama sunucusuna ulaşılamadı. Uygulama açık mı?" },
          { status: 400 }
        );
      }
      const models = (data?.models || []).map((m) => m.name);
      return NextResponse.json({ valid: true, models });
    }

    // 5. ÖZEL ENDPOINT DOĞRULAMA
    if (type === "custom") {
      await callAIProvider({
        provider,
        messages: [{ role: "user", content: "ping" }],
        systemPrompt: "Sadece OK yaz.",
      });
      return NextResponse.json({ valid: true, models: [] });
    }

    return NextResponse.json({ error: "Bilinmeyen tür." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Doğrulama sırasında bağlantı hatası oluştu." },
      { status: 500 }
    );
  }
}