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

/**
 * Hata mesajını inceleyip "kota doldu" veya "token/bağlam limiti aşıldı"
 * durumlarını tespit eder. Tespit edilirse kullanıcıya öğretici, ne
 * yapması gerektiğini anlatan bir mesaj döndürür. Aksi halde null döner.
 */
export function classifyProviderError({ status, rawMessage = "", model = "" }) {
  const msg = (rawMessage || "").toLowerCase();

  const isQuota =
    status === 429 ||
    /quota|rate limit|rate_limit|resource_exhausted|too many requests/.test(msg);

  const isTokenLimit =
    /context_length_exceeded|maximum context length|too long|token limit|exceeds the model.?s maximum|max_tokens/.test(
      msg
    );

  if (isQuota) {
    return {
      kind: "quota",
      message:
        `⚠️ **${model || "Seçili model"}** şu anda kullanım kotası doldu veya çok fazla istek alıyor.\n\n` +
        `**Ne yapabilirsin:**\n` +
        `- Birkaç dakika bekleyip tekrar dene\n` +
        `- Sol menüden **farklı bir model** seç (örn. Groq veya Gemini)\n` +
        `- Kendi API anahtarınla bağladığın sağlayıcılarda bu kotalar genellikle çok daha yüksektir`,
    };
  }

  if (isTokenLimit) {
    return {
      kind: "token",
      message:
        `⚠️ Mesajın veya sohbet geçmişin, **${model || "seçili model"}** için izin verilen ` +
        `maksimum uzunluğu aşıyor.\n\n` +
        `**Ne yapabilirsin:**\n` +
        `- **Yeni bir sohbet** başlat (geçmiş çok uzamış olabilir)\n` +
        `- Mesajını kısalt veya eklediğin dosyayı küçült\n` +
        `- Daha büyük bağlam penceresine sahip bir model seç`,
    };
  }

  return null;
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

/**
 * STREAMING SÜRÜMÜ: aynı mantık, ama metni parça parça onToken ile verir.
 * Hata, hiç parça gönderilmeden (ilk token'dan önce) oluşursa err._noOutput = true
 * işaretlenir, böylece çağıran taraf bunun fallback'e geçmesi gerektiğini anlar.
 */
export async function streamAIProvider({ provider, messages, systemPrompt, onToken }) {
  const { type, baseUrl, apiKey, model } = provider || {};
  if (!type) throw new Error("Sağlayıcı türü (type) eksik.");
  if (!model && type !== "custom") throw new Error("Model adı belirtilmedi.");

  switch (type) {
    case "gemini":
      return await streamGemini({ apiKey, model, messages, systemPrompt, onToken });
    case "openai-compatible":
      return await streamOpenAICompatible({ baseUrl, apiKey, model, messages, systemPrompt, onToken });
    case "anthropic":
      return await streamAnthropic({ baseUrl, apiKey, model, messages, systemPrompt, onToken });
    case "ollama":
      return await streamOllama({ baseUrl, model, messages, systemPrompt, onToken });
    case "custom": {
      // Özel endpoint gerçek streaming desteklemiyor; tek seferde al, tek parça gönder.
      const full = await callCustomEndpoint({ baseUrl, apiKey, model, messages, systemPrompt });
      onToken(full);
      return full;
    }
    default:
      throw new Error(`Desteklenmeyen sağlayıcı türü: ${type}`);
  }
}

// ---------------------------------------------------------------------
// GEMINI
// ---------------------------------------------------------------------

async function callGemini({ apiKey, model, messages, systemPrompt }) {
  if (!apiKey) throw new Error("Gemini için API Key gerekli.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = buildGeminiBody({ messages, systemPrompt });

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    if (err.name === "TimeoutError") {
      throw new Error(`Gemini modeli (${model}) 8 saniye içinde yanıt vermedi.`);
    }
    throw new Error(`Gemini bağlantı hatası: ${err.message}`);
  }

  const data = await safeParseJSON(res);
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Gemini API hatası (HTTP ${res.status})`);
    err._status = res.status;
    throw err;
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const reply = parts.map((p) => p.text || "").join("\n").trim();
  if (!reply) throw new Error("Gemini boş yanıt döndürdü.");
  return reply;
}

function buildGeminiBody({ messages, systemPrompt }) {
  return {
    ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
    contents: messages.map((m) => {
      const parts = [{ text: m.content || "Bu görseli açıkla." }];
      if (Array.isArray(m.images) && m.images.length > 0) {
        for (const img of m.images) {
          parts.push({
            inline_data: { mime_type: img.mimeType || "image/jpeg", data: img.base64 },
          });
        }
      }
      return { role: m.role === "assistant" ? "model" : "user", parts };
    }),
  };
}

async function streamGemini({ apiKey, model, messages, systemPrompt, onToken }) {
  if (!apiKey) throw new Error("Gemini için API Key gerekli.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  const body = buildGeminiBody({ messages, systemPrompt });

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    const e = new Error(`Gemini bağlantı hatası: ${err.message}`);
    e._noOutput = true;
    throw e;
  }

  if (!res.ok) {
    const data = await safeParseJSON(res);
    const e = new Error(data?.error?.message || `Gemini API hatası (HTTP ${res.status})`);
    e._status = res.status;
    e._noOutput = true;
    throw e;
  }

  let full = "";
  let gotAny = false;

  await readSSELines(res.body, (jsonStr) => {
    try {
      const obj = JSON.parse(jsonStr);
      const parts = obj?.candidates?.[0]?.content?.parts || [];
      const text = parts.map((p) => p.text || "").join("");
      if (text) {
        gotAny = true;
        full += text;
        onToken(text);
      }
    } catch {
      // parçalı/geçersiz JSON parçası, yoksay
    }
  });

  if (!gotAny) {
    const e = new Error("Gemini boş yanıt döndürdü.");
    e._noOutput = true;
    throw e;
  }
  return full;
}

// ---------------------------------------------------------------------
// OPENAI UYUMLU (OpenAI, Groq, OpenRouter vb.)
// ---------------------------------------------------------------------

function buildOpenAIMessages({ messages, systemPrompt }) {
  return [
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
}

async function callOpenAICompatible({ baseUrl, apiKey, model, messages, systemPrompt }) {
  if (!apiKey && (baseUrl || "").includes("groq.com")) {
    throw new Error("Groq için API Key girmelisin.");
  }

  const cleanBase = (baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
  const url = cleanBase.endsWith("/chat/completions") ? cleanBase : `${cleanBase}/chat/completions`;
  const headers = {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
  const formattedMessages = buildOpenAIMessages({ messages, systemPrompt });

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, messages: formattedMessages }),
      signal: AbortSignal.timeout(12000),
    });
  } catch (err) {
    if (err.name === "TimeoutError") throw new Error(`Model (${model}) zaman aşımına uğradı.`);
    throw err;
  }

  const data = await safeParseJSON(res);
  if (!res.ok) {
    const err = new Error(data?.error?.message || data?.message || `API hatası (${res.status})`);
    err._status = res.status;
    throw err;
  }
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) throw new Error("Modelden boş yanıt döndü.");
  return reply;
}

async function streamOpenAICompatible({ baseUrl, apiKey, model, messages, systemPrompt, onToken }) {
  if (!apiKey && (baseUrl || "").includes("groq.com")) {
    const e = new Error("Groq için API Key girmelisin.");
    e._noOutput = true;
    throw e;
  }

  const cleanBase = (baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
  const url = cleanBase.endsWith("/chat/completions") ? cleanBase : `${cleanBase}/chat/completions`;
  const headers = {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
  const formattedMessages = buildOpenAIMessages({ messages, systemPrompt });

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, messages: formattedMessages, stream: true }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    const e = new Error(`Bağlantı hatası: ${err.message}`);
    e._noOutput = true;
    throw e;
  }

  if (!res.ok) {
    const data = await safeParseJSON(res);
    const e = new Error(data?.error?.message || data?.message || `API hatası (${res.status})`);
    e._status = res.status;
    e._noOutput = true;
    throw e;
  }

  let full = "";
  let gotAny = false;

  await readSSELines(res.body, (jsonStr) => {
    if (jsonStr === "[DONE]") return;
    try {
      const obj = JSON.parse(jsonStr);
      const delta = obj?.choices?.[0]?.delta?.content;
      if (delta) {
        gotAny = true;
        full += delta;
        onToken(delta);
      }
    } catch {
      // yoksay
    }
  });

  if (!gotAny) {
    const e = new Error("Modelden boş yanıt döndü.");
    e._noOutput = true;
    throw e;
  }
  return full;
}

// ---------------------------------------------------------------------
// ANTHROPIC (Claude)
// ---------------------------------------------------------------------

function buildAnthropicMessages({ messages }) {
  return messages.map((m) => {
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
}

async function callAnthropic({ baseUrl, apiKey, model, messages, systemPrompt }) {
  if (!apiKey) throw new Error("Claude için API Key gerekli.");
  const cleanBase = (baseUrl || "https://api.anthropic.com/v1").replace(/\/+$/, "");
  const url = cleanBase.endsWith("/messages") ? cleanBase : `${cleanBase}/messages`;

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
      messages: buildAnthropicMessages({ messages }),
    }),
    signal: AbortSignal.timeout(15000),
  });

  const data = await safeParseJSON(res);
  if (!res.ok) {
    const err = new Error(data?.error?.message || "Anthropic API hatası.");
    err._status = res.status;
    throw err;
  }
  const reply = data?.content?.[0]?.text;
  if (!reply) throw new Error("Anthropic'ten boş yanıt döndü.");
  return reply;
}

async function streamAnthropic({ baseUrl, apiKey, model, messages, systemPrompt, onToken }) {
  if (!apiKey) {
    const e = new Error("Claude için API Key gerekli.");
    e._noOutput = true;
    throw e;
  }
  const cleanBase = (baseUrl || "https://api.anthropic.com/v1").replace(/\/+$/, "");
  const url = cleanBase.endsWith("/messages") ? cleanBase : `${cleanBase}/messages`;

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        stream: true,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: buildAnthropicMessages({ messages }),
      }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    const e = new Error(`Bağlantı hatası: ${err.message}`);
    e._noOutput = true;
    throw e;
  }

  if (!res.ok) {
    const data = await safeParseJSON(res);
    const e = new Error(data?.error?.message || "Anthropic API hatası.");
    e._status = res.status;
    e._noOutput = true;
    throw e;
  }

  let full = "";
  let gotAny = false;

  await readSSELines(res.body, (jsonStr) => {
    try {
      const obj = JSON.parse(jsonStr);
      if (obj.type === "content_block_delta" && obj.delta?.text) {
        gotAny = true;
        full += obj.delta.text;
        onToken(obj.delta.text);
      }
    } catch {
      // yoksay
    }
  });

  if (!gotAny) {
    const e = new Error("Anthropic'ten boş yanıt döndü.");
    e._noOutput = true;
    throw e;
  }
  return full;
}

// ---------------------------------------------------------------------
// OLLAMA
// ---------------------------------------------------------------------

function buildOllamaMessages({ messages, systemPrompt }) {
  return [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(Array.isArray(m.images) && m.images.length > 0
        ? { images: m.images.map((img) => img.base64) }
        : {}),
    })),
  ];
}

async function callOllama({ baseUrl, model, messages, systemPrompt }) {
  const cleanBase = (baseUrl || "http://localhost:11434").replace(/\/+$/, "");
  const url = `${cleanBase}/api/chat`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, stream: false, messages: buildOllamaMessages({ messages, systemPrompt }) }),
    signal: AbortSignal.timeout(20000),
  });

  const data = await safeParseJSON(res);
  if (!res.ok) throw new Error(data?.error || "Ollama sunucusuna bağlanılamadı.");
  const reply = data?.message?.content;
  if (!reply) throw new Error("Ollama'dan boş yanıt döndü.");
  return reply;
}

async function streamOllama({ baseUrl, model, messages, systemPrompt, onToken }) {
  const cleanBase = (baseUrl || "http://localhost:11434").replace(/\/+$/, "");
  const url = `${cleanBase}/api/chat`;

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, stream: true, messages: buildOllamaMessages({ messages, systemPrompt }) }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    const e = new Error(`Ollama bağlantı hatası: ${err.message}`);
    e._noOutput = true;
    throw e;
  }

  if (!res.ok) {
    const e = new Error("Ollama sunucusuna bağlanılamadı.");
    e._noOutput = true;
    throw e;
  }

  let full = "";
  let gotAny = false;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        const text = obj?.message?.content;
        if (text) {
          gotAny = true;
          full += text;
          onToken(text);
        }
      } catch {
        // yoksay
      }
    }
  }

  if (!gotAny) {
    const e = new Error("Ollama'dan boş yanıt döndü.");
    e._noOutput = true;
    throw e;
  }
  return full;
}

// ---------------------------------------------------------------------
// ÖZEL ENDPOINT (streaming desteklenmez)
// ---------------------------------------------------------------------

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
    data?.reply || data?.response || data?.text || data?.output || data?.choices?.[0]?.message?.content;
  if (!reply) throw new Error("Özel AI yanıtı okunamadı.");
  return reply;
}

// ---------------------------------------------------------------------
// ORTAK YARDIMCI: SSE satırlarını okuyup "data: ..." gövdelerini verir
// ---------------------------------------------------------------------

async function readSSELines(body, onData) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      const line = part
        .split("\n")
        .find((l) => l.startsWith("data:"));
      if (!line) continue;
      const jsonStr = line.slice(5).trim();
      if (jsonStr) onData(jsonStr);
    }
  }
}