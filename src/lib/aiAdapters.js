// src/lib/aiAdapters.js

async function safeParseJSON(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `API geçersiz yanıt döndürdü (HTTP ${res.status}). URL veya API Key hatalı olabilir.`
    );
  }
}

export async function callAIProvider({ provider, messages, systemPrompt }) {
  const { type, baseUrl, apiKey, model } = provider || {};

  if (!type) throw new Error("Sağlayıcı türü (type) eksik.");
  if (!model && type !== "custom") throw new Error("Model adı belirtilmedi.");

  const hasImages = messages.some((m) => Array.isArray(m.images) && m.images.length > 0);
  if (hasImages && type === "openai-compatible") {
    const mLower = (model || "").toLowerCase();
    const isVisionModel =
      mLower.includes("vision") ||
      mLower.includes("gpt-4o") ||
      mLower.includes("gpt-4.1") ||
      mLower.includes("llama-4") ||
      mLower.includes("pixtral") ||
      mLower.includes("qwen-vl") ||
      mLower.includes("claude");

    if (!isVisionModel) {
      throw new Error(
        `Seçili model ('${model}') sadece metin destekliyor. Görsel analizi için Google Gemini veya Groq'tan 'meta-llama/llama-4-scout-17b-16e-instruct' modelini seçin.`
      );
    }
  }

  switch (type) {
    case "gemini":
      return await callGemini({ apiKey, model, messages, systemPrompt });

    case "openai-compatible":
      return await callOpenAICompatible({ baseUrl, apiKey, model, messages, systemPrompt });

    case "anthropic":
      return await callAnthropic({ baseUrl, apiKey, model, messages, systemPrompt });

    case "ollama":
      return await callOllama({ baseUrl, model, messages, systemPrompt });

    case "custom":
      return await callCustomEndpoint({ baseUrl, apiKey, model, messages, systemPrompt });

    default:
      throw new Error(`Desteklenmeyen sağlayıcı türü: ${type}`);
  }
}

async function callGemini({ apiKey, model, messages, systemPrompt }) {
  if (!apiKey) throw new Error("Gemini için API Key gerekli.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    ...(systemPrompt
      ? { systemInstruction: { parts: [{ text: systemPrompt }] } }
      : {}),
    contents: messages.map((m) => {
      const parts = [{ text: m.content || "Bu görseli açıkla." }];
      if (Array.isArray(m.images) && m.images.length > 0) {
        for (const img of m.images) {
          parts.push({
            inline_data: {
              mime_type: img.mimeType || "image/jpeg",
              data: img.base64,
            },
          });
        }
      }
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts,
      };
    }),
  };

  const imageCount = messages.filter((m) => m.images?.length).length;
  console.log(`[Gemini] İstek yapılıyor -> Model: ${model} | Görsel: ${imageCount}`);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // GOOGLE'IN BİZİ DAKİKALARCA BEKLETMESİNİ ENGELLEYEN SERT KURAL: MAX 8 SANİYE!
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    if (err.name === "TimeoutError") {
      throw new Error(`Gemini modeli (${model}) 8 saniye içinde yanıt vermedi (Google sunucusu askıda kaldı).`);
    }
    throw new Error(`Gemini bağlantı hatası: ${err.message}`);
  }

  const data = await safeParseJSON(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini API hatası (HTTP ${res.status})`);
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const reply = parts.map((p) => p.text || "").join("\n").trim();

  if (!reply) throw new Error("Gemini boş yanıt döndürdü.");
  console.log(`[Gemini] ${model} başarıyla yanıt verdi!`);
  return reply;
}

async function callOpenAICompatible({ baseUrl, apiKey, model, messages, systemPrompt }) {
  if (!apiKey && (baseUrl || "").includes("groq.com")) {
    throw new Error("Groq için API Key girmelisin.");
  }

  const cleanBase = (baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
  const url = cleanBase.endsWith("/chat/completions")
    ? cleanBase
    : `${cleanBase}/chat/completions`;

  const headers = {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };

  const formattedMessages = [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    ...messages.map((m) => {
      if (Array.isArray(m.images) && m.images.length > 0) {
        return {
          role: m.role,
          content: [
            { type: "text", text: m.content },
            ...m.images.map((img) => ({
              type: "image_url",
              image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
            })),
          ],
        };
      }
      return { role: m.role, content: m.content };
    }),
  ];

  console.log(`[OpenAI/Groq] İstek yapılıyor -> Model: ${model}`);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, messages: formattedMessages }),
      signal: AbortSignal.timeout(12000),
    });
  } catch (err) {
    if (err.name === "TimeoutError") {
      throw new Error(`Model (${model}) zaman aşımına uğradı.`);
    }
    throw err;
  }

  const data = await safeParseJSON(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || `API hatası (${res.status})`);
  }

  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) throw new Error("Modelden boş yanıt döndü.");
  console.log(`[OpenAI/Groq] ${model} başarıyla yanıt verdi!`);
  return reply;
}

async function callAnthropic({ baseUrl, apiKey, model, messages, systemPrompt }) {
  if (!apiKey) throw new Error("Claude için API Key gerekli.");
  const cleanBase = (baseUrl || "https://api.anthropic.com/v1").replace(/\/+$/, "");
  const url = cleanBase.endsWith("/messages") ? cleanBase : `${cleanBase}/messages`;

  const formattedMessages = messages.map((m) => {
    if (Array.isArray(m.images) && m.images.length > 0) {
      return {
        role: m.role,
        content: [
          ...m.images.map((img) => ({
            type: "image",
            source: { type: "base64", media_type: img.mimeType, data: img.base64 },
          })),
          { type: "text", text: m.content },
        ],
      };
    }
    return { role: m.role, content: m.content };
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: formattedMessages,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const data = await safeParseJSON(res);
  if (!res.ok) throw new Error(data?.error?.message || "Anthropic API hatası.");
  const reply = data?.content?.[0]?.text;
  if (!reply) throw new Error("Anthropic'ten boş yanıt döndü.");
  return reply;
}

async function callOllama({ baseUrl, model, messages, systemPrompt }) {
  const cleanBase = (baseUrl || "http://localhost:11434").replace(/\/+$/, "");
  const url = `${cleanBase}/api/chat`;

  const formattedMessages = [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(Array.isArray(m.images) && m.images.length > 0
        ? { images: m.images.map((img) => img.base64) }
        : {}),
    })),
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, stream: false, messages: formattedMessages }),
    signal: AbortSignal.timeout(20000),
  });

  const data = await safeParseJSON(res);
  if (!res.ok) throw new Error(data?.error || "Ollama sunucusuna bağlanılamadı.");
  const reply = data?.message?.content;
  if (!reply) throw new Error("Ollama'dan boş yanıt döndü.");
  return reply;
}

async function callCustomEndpoint({ baseUrl, apiKey, model, messages, systemPrompt }) {
  if (!baseUrl) throw new Error("Özel AI için URL gerekli.");
  const lastMessage = messages[messages.length - 1]?.content || "";
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: model || "custom",
      systemPrompt: systemPrompt || "",
      prompt: lastMessage,
      messages,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const data = await safeParseJSON(res);
  if (!res.ok) throw new Error(data?.error?.message || "Özel endpoint hatası.");
  const reply =
    data?.reply ||
    data?.response ||
    data?.text ||
    data?.output ||
    data?.choices?.[0]?.message?.content;
  if (!reply) throw new Error("Özel AI yanıtı okunamadı.");
  return reply;
}