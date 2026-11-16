// src/lib/aiAdapters.js
import { buildReasoningOptions } from "./reasoning.js";

// Provider endpoints are user-configurable; never follow a redirect to an unchecked host.
const fetch = (input, init = {}) =>
  globalThis.fetch(input, { ...init, redirect: "error" });

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

export function normalizeTokenUsage({ inputTokens, outputTokens, totalTokens } = {}) {
  const toCount = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const count = Number(value);
    return Number.isSafeInteger(count) && count >= 0 && count <= 1_000_000_000
      ? count
      : null;
  };
  const input = toCount(inputTokens);
  const output = toCount(outputTokens);
  let total = toCount(totalTokens);
  if (total === null && input !== null && output !== null) total = input + output;
  if (input === null && output === null && total === null) return null;
  return { inputTokens: input, outputTokens: output, totalTokens: total };
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

export async function callAIProvider({ provider, messages, systemPrompt, reasoningLevel = "auto" }) {
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
      return await callGemini({ apiKey, model, messages, systemPrompt, reasoningLevel });
    case "openai-compatible":
      return await callOpenAICompatible({ baseUrl, apiKey, model, messages, systemPrompt, reasoningLevel });
    case "anthropic":
      return await callAnthropic({ baseUrl, apiKey, model, messages, systemPrompt, reasoningLevel });
    case "ollama":
      return await callOllama({ baseUrl, apiKey, model, messages, systemPrompt });
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
export async function streamAIProvider({ provider, messages, systemPrompt, onToken, reasoningLevel = "auto" }) {
  const { type, baseUrl, apiKey, model } = provider || {};
  if (!type) throw new Error("Sağlayıcı türü (type) eksik.");
  if (!model && type !== "custom") throw new Error("Model adı belirtilmedi.");

  switch (type) {
    case "gemini":
      return await streamGemini({ apiKey, model, messages, systemPrompt, onToken, reasoningLevel });
    case "openai-compatible":
      return await streamOpenAICompatible({ baseUrl, apiKey, model, messages, systemPrompt, onToken, reasoningLevel });
    case "anthropic":
      return await streamAnthropic({ baseUrl, apiKey, model, messages, systemPrompt, onToken, reasoningLevel });
    case "ollama":
      return await streamOllama({ baseUrl, apiKey, model, messages, systemPrompt, onToken });
    case "custom": {
      // Özel endpoint gerçek streaming desteklemiyor; tek seferde al, tek parça gönder.
      const result = await callCustomEndpoint({ baseUrl, apiKey, model, messages, systemPrompt });
      onToken(result.reply);
      return result;
    }
    default:
      throw new Error(`Desteklenmeyen sağlayıcı türü: ${type}`);
  }
}

// ---------------------------------------------------------------------
// GEMINI
// ---------------------------------------------------------------------

async function callGemini({ apiKey, model, messages, systemPrompt, reasoningLevel }) {
  if (!apiKey) throw new Error("Gemini için API Key gerekli.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = buildGeminiBody({ messages, systemPrompt, reasoningLevel, provider: { type: "gemini", model } });

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
  const meta = data?.usageMetadata;
  return {
    reply,
    usage: normalizeTokenUsage({
      inputTokens: meta?.promptTokenCount,
      outputTokens: meta?.candidatesTokenCount,
      totalTokens: meta?.totalTokenCount,
    }),
  };
}

function buildGeminiBody({ messages, systemPrompt, reasoningLevel = "auto", provider }) {
  return {
    ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
    ...buildReasoningOptions(provider, reasoningLevel),
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

async function streamGemini({ apiKey, model, messages, systemPrompt, onToken, reasoningLevel }) {
  if (!apiKey) throw new Error("Gemini için API Key gerekli.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  const body = buildGeminiBody({ messages, systemPrompt, reasoningLevel, provider: { type: "gemini", model } });

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
  let usage = null;

  await readSSELines(res.body, (jsonStr) => {
    try {
      const obj = JSON.parse(jsonStr);
      if (obj?.usageMetadata) {
        const meta = obj.usageMetadata;
        usage = normalizeTokenUsage({
          inputTokens: meta.promptTokenCount,
          outputTokens: meta.candidatesTokenCount,
          totalTokens: meta.totalTokenCount,
        }) || usage;
      }
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
  return { reply: full, usage };
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

async function callOpenAICompatible({ baseUrl, apiKey, model, messages, systemPrompt, reasoningLevel }) {
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
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        ...buildReasoningOptions({ type: "openai-compatible", baseUrl: cleanBase, model }, reasoningLevel),
      }),
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
  const providerUsage = data?.usage;
  return {
    reply,
    usage: normalizeTokenUsage({
      inputTokens: providerUsage?.prompt_tokens ?? providerUsage?.input_tokens,
      outputTokens: providerUsage?.completion_tokens ?? providerUsage?.output_tokens,
      totalTokens: providerUsage?.total_tokens,
    }),
  };
}

async function streamOpenAICompatible({ baseUrl, apiKey, model, messages, systemPrompt, onToken, reasoningLevel }) {
  if (!apiKey && (baseUrl || "").includes("groq.com")) {
    const e = new Error("Groq için API Key girmelisin.");
    e._noOutput = true;
    throw e;
  }

  const cleanBase = (baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
  const url = cleanBase.endsWith("/chat/completions") ? cleanBase : `${cleanBase}/chat/completions`;
  const host = new URL(cleanBase).hostname.toLowerCase();
  const supportsStreamUsage = host === "api.openai.com" || host === "api.groq.com" ||
    host === "openrouter.ai" || host.endsWith(".openrouter.ai");
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
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream: true,
        ...buildReasoningOptions({ type: "openai-compatible", baseUrl: cleanBase, model }, reasoningLevel),
        ...(supportsStreamUsage ? { stream_options: { include_usage: true } } : {}),
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
    const e = new Error(data?.error?.message || data?.message || `API hatası (${res.status})`);
    e._status = res.status;
    e._noOutput = true;
    throw e;
  }

  let full = "";
  let gotAny = false;
  let usage = null;

  await readSSELines(res.body, (jsonStr) => {
    if (jsonStr === "[DONE]") return;
    try {
      const obj = JSON.parse(jsonStr);
      if (obj?.usage) {
        usage = normalizeTokenUsage({
          inputTokens: obj.usage.prompt_tokens ?? obj.usage.input_tokens,
          outputTokens: obj.usage.completion_tokens ?? obj.usage.output_tokens,
          totalTokens: obj.usage.total_tokens,
        }) || usage;
      }
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
  return { reply: full, usage };
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

async function callAnthropic({ baseUrl, apiKey, model, messages, systemPrompt, reasoningLevel }) {
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
      ...buildReasoningOptions({ type: "anthropic", baseUrl: cleanBase, model }, reasoningLevel),
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
  const reply = data?.content?.find((block) => block?.type === "text")?.text;
  if (!reply) throw new Error("Anthropic'ten boş yanıt döndü.");
  const inputTokens = data?.usage?.input_tokens;
  const outputTokens = data?.usage?.output_tokens;
  return {
    reply,
    usage: normalizeTokenUsage({
      inputTokens,
      outputTokens,
      totalTokens: inputTokens != null && outputTokens != null
        ? Number(inputTokens) + Number(outputTokens)
        : null,
    }),
  };
}

async function streamAnthropic({ baseUrl, apiKey, model, messages, systemPrompt, onToken, reasoningLevel }) {
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
        ...buildReasoningOptions({ type: "anthropic", baseUrl: cleanBase, model }, reasoningLevel),
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
  let inputTokens = null;
  let outputTokens = null;

  await readSSELines(res.body, (jsonStr) => {
    try {
      const obj = JSON.parse(jsonStr);
      if (obj.type === "message_start" && obj.message?.usage?.input_tokens != null) {
        inputTokens = obj.message.usage.input_tokens;
      }
      if (obj.type === "message_delta" && obj.usage?.output_tokens != null) {
        outputTokens = obj.usage.output_tokens;
      }
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
  return {
    reply: full,
    usage: normalizeTokenUsage({
      inputTokens,
      outputTokens,
      totalTokens: inputTokens != null && outputTokens != null
        ? Number(inputTokens) + Number(outputTokens)
        : null,
    }),
  };
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

async function callOllama({ baseUrl, apiKey, model, messages, systemPrompt }) {
  if (!baseUrl || !apiKey) throw new Error("Uzak Ollama bağlantısı için HTTPS adresi ve proxy tokeni gerekli.");
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const url = `${cleanBase}/api/chat`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, stream: false, messages: buildOllamaMessages({ messages, systemPrompt }) }),
    signal: AbortSignal.timeout(20000),
  });

  const data = await safeParseJSON(res);
  if (!res.ok) throw new Error(data?.error || "Ollama sunucusuna bağlanılamadı.");
  const reply = data?.message?.content;
  if (!reply) throw new Error("Ollama'dan boş yanıt döndü.");
  return {
    reply,
    usage: normalizeTokenUsage({
      inputTokens: data?.prompt_eval_count,
      outputTokens: data?.eval_count,
      totalTokens: data?.prompt_eval_count != null && data?.eval_count != null
        ? Number(data.prompt_eval_count) + Number(data.eval_count)
        : null,
    }),
  };
}

async function streamOllama({ baseUrl, apiKey, model, messages, systemPrompt, onToken }) {
  if (!baseUrl || !apiKey) {
    const error = new Error("Uzak Ollama bağlantısı için HTTPS adresi ve proxy tokeni gerekli.");
    error._noOutput = true;
    throw error;
  }
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const url = `${cleanBase}/api/chat`;

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
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
  let inputTokens = null;
  let outputTokens = null;
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
        if (obj.prompt_eval_count != null) inputTokens = obj.prompt_eval_count;
        if (obj.eval_count != null) outputTokens = obj.eval_count;
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

  if (buffer.trim()) {
    try {
      const obj = JSON.parse(buffer);
      if (obj.prompt_eval_count != null) inputTokens = obj.prompt_eval_count;
      if (obj.eval_count != null) outputTokens = obj.eval_count;
      const text = obj?.message?.content;
      if (text) {
        gotAny = true;
        full += text;
        onToken(text);
      }
    } catch {
      // Incomplete trailing stream frame.
    }
  }

  if (!gotAny) {
    const e = new Error("Ollama'dan boş yanıt döndü.");
    e._noOutput = true;
    throw e;
  }
  return {
    reply: full,
    usage: normalizeTokenUsage({
      inputTokens,
      outputTokens,
      totalTokens: inputTokens !== null && outputTokens !== null
        ? Number(inputTokens) + Number(outputTokens)
        : null,
    }),
  };
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
  const providerUsage = data?.usage;
  return {
    reply,
    usage: normalizeTokenUsage({
      inputTokens: providerUsage?.prompt_tokens ?? providerUsage?.input_tokens ?? providerUsage?.promptTokenCount,
      outputTokens: providerUsage?.completion_tokens ?? providerUsage?.output_tokens ?? providerUsage?.candidatesTokenCount,
      totalTokens: providerUsage?.total_tokens ?? providerUsage?.totalTokenCount,
    }),
  };
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
