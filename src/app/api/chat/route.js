// src/app/api/chat/route.js
import { NextResponse } from "next/server";
import { callAIProvider, streamAIProvider, classifyProviderError } from "@/lib/aiAdapters";
import { checkRateLimit, validateSafeUrl, validateMessagesSafety } from "@/lib/security";
import { checkVpnOrWarp } from "@/lib/vpnGuard";
import { searchLiveWeb } from "@/lib/webSearch";
import {
  MAX_STRIKES,
  checkContentModeration,
  getUserPenaltyStatus,
  addModerationStrike,
} from "@/lib/moderation";
import {
  DAILY_FAIR_LIMIT,
  verifyFirebaseToken,
  getFirestoreUserStatus,
  incrementFirestoreUsage,
} from "@/lib/firebaseServer";

function buildSmartFallbacks(provider, userFallbacks, hasImages) {
  const list = [...(Array.isArray(userFallbacks) ? userFallbacks : [])];

  if (provider.type === "gemini") {
    const geminiBackups = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"];
    for (const m of geminiBackups) {
      if (provider.model !== m) {
        list.push({ ...provider, name: `${provider.name} (Oto-Geçiş)`, model: m });
      }
    }
  }

  if ((provider.baseUrl || "").includes("groq.com")) {
    const groqBackups = hasImages
      ? ["meta-llama/llama-4-scout-17b-16e-instruct"]
      : ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
    for (const m of groqBackups) {
      if (provider.model !== m) {
        list.push({ ...provider, name: `${provider.name} (Oto-Geçiş)`, model: m });
      }
    }
  }

  return list;
}

// Ortak ön kontroller: VPN, rate limit, auth, ceza, ban, günlük limit,
// içerik moderasyonu, provider doğrulama, web arama. Hem stream hem
// stream-olmayan yol bu kontrolleri aynı şekilde kullanır.
async function runPreChecks(request, body) {
  const vpnCheck = await checkVpnOrWarp(request);
  if (vpnCheck.blocked) {
    return { error: { message: vpnCheck.reason, code: "VPN_BLOCKED", status: 403 } };
  }

  const rate = checkRateLimit(request, 25, 60_000);
  if (!rate.allowed) {
    return { error: { message: rate.message, status: 429 } };
  }

  const authHeader = request.headers.get("authorization") || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const firebaseUser = await verifyFirebaseToken(idToken);
  if (!firebaseUser) {
    return { error: { message: "Devam etmek için lütfen giriş yapın.", status: 401 } };
  }

  const penalty = getUserPenaltyStatus(firebaseUser.uid);
  if (penalty.blocked) {
    return {
      error: {
        message: `Hesabınız ${penalty.remainingSeconds} saniye boyunca geçici olarak kısıtlandı.`,
        code: "TEMP_BAN",
        banUntil: penalty.banUntil,
        status: 403,
      },
    };
  }

  const status = await getFirestoreUserStatus(firebaseUser.uid, idToken);
  if (status.banned) {
    return {
      error: { message: `Hesabınız yasaklandı: ${status.banReason}`, code: "BANNED", status: 403 },
    };
  }

  if (status.dailyCount >= DAILY_FAIR_LIMIT) {
    return {
      error: {
        message: `Günlük kullanım sınırına (${DAILY_FAIR_LIMIT}) ulaştınız.`,
        code: "LIMIT_REACHED",
        status: 429,
      },
    };
  }

  const { provider, fallbackProviders = [], messages, systemPrompt, useWebSearch = false } = body;

  const msgCheck = validateMessagesSafety(messages);
  if (!msgCheck.ok) {
    return { error: { message: msgCheck.error, status: 400 } };
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const modCheck = checkContentModeration(lastUserMessage);
  if (modCheck.flagged) {
    const strike = addModerationStrike(firebaseUser.uid, modCheck.reason);
    if (strike.banned) {
      return {
        error: {
          message: "3 kez uygunsuz dil tespit edildi! Sistem 3 dakika kilitlendi.",
          code: "TEMP_BAN",
          banUntil: strike.banUntil,
          status: 403,
        },
      };
    }
    return {
      error: { message: `Uygunsuz dil! Uyarı ${strike.warnings}/${MAX_STRIKES}`, code: "WARNING", status: 400 },
    };
  }

  if (!provider || !provider.type) {
    return { error: { message: "Geçerli bir AI bağlantısı seçin.", status: 400 } };
  }

  if (provider.baseUrl && !validateSafeUrl(provider.baseUrl)) {
    return { error: { message: "Geçersiz API adresi.", status: 400 } };
  }

  let finalSystemPrompt = systemPrompt || "";
  let webSourcesCount = 0;
  if (useWebSearch && lastUserMessage) {
    const webRes = await searchLiveWeb(lastUserMessage.slice(0, 140));
    if (webRes) {
      webSourcesCount = webRes.sourcesCount;
      const todayStr = new Date().toLocaleDateString("tr-TR");
      finalSystemPrompt = `${finalSystemPrompt}\n\n[CANLI WEB ARAMA SONUÇLARI - ${todayStr}]\n${webRes.contextText}`;
    }
  }

  const hasImages = messages.some((m) => Array.isArray(m.images) && m.images.length > 0);

  return {
    ok: true,
    firebaseUser,
    idToken,
    status,
    provider,
    fallbackProviders,
    messages,
    finalSystemPrompt,
    webSourcesCount,
    hasImages,
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const pre = await runPreChecks(request, body);
    if (pre.error) {
      return NextResponse.json(
        { error: pre.error.message, code: pre.error.code, banUntil: pre.error.banUntil },
        { status: pre.error.status }
      );
    }

    const {
      firebaseUser,
      idToken,
      status,
      provider,
      fallbackProviders,
      messages,
      finalSystemPrompt,
      webSourcesCount,
      hasImages,
    } = pre;

    const smartFallbacks = buildSmartFallbacks(provider, fallbackProviders, hasImages);

    // -------------------------------------------------------------
    // STREAMING YOLU (chat ekranı için)
    // -------------------------------------------------------------
    if (body.stream) {
      const encoder = new TextEncoder();

      const sseStream = new ReadableStream({
        async start(controller) {
          const send = (event, data) => {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
          };

          const candidates = [provider, ...smartFallbacks.filter((f) => f && f.type)];
          let succeeded = false;

          for (let i = 0; i < candidates.length; i++) {
            const current = candidates[i];
            let fullReply = "";
            try {
              fullReply = await streamAIProvider({
                provider: current,
                messages,
                systemPrompt: finalSystemPrompt,
                onToken: (chunk) => send("chunk", { text: chunk }),
              });

              await incrementFirestoreUsage(firebaseUser.uid, idToken, status.dailyCount);
              send("done", {
                usedProvider: current.name,
                usedModel: current.model,
                isFallback: i > 0,
                webSourcesCount,
                newDailyCount: status.dailyCount + 1,
              });
              succeeded = true;
              break;
            } catch (err) {
              // Hiç çıktı üretmeden başarısız oldu -> sıradaki sağlayıcıya geç
              if (err._noOutput || fullReply.length === 0) {
                console.warn(`[STREAM] ${current.name} çıktı üretmeden başarısız: ${err.message}`);
                continue;
              }
              // Kısmi çıktı üretildikten sonra koptu -> kullanıcıya bildir, dur.
              const friendly = classifyProviderError({
                status: err._status,
                rawMessage: err.message,
                model: current.model,
              });
              send("error", {
                message: friendly ? friendly.message : err.message,
                friendly: Boolean(friendly),
              });
              succeeded = true; // tekrar fallback denemeyelim, akışı bitir
              break;
            }
          }

          if (!succeeded) {
            // Hiçbir sağlayıcı tek bir token bile üretemedi.
            const lastCandidate = candidates[candidates.length - 1] || provider;
            const friendly = classifyProviderError({
              rawMessage: "quota rate limit",
              model: lastCandidate.model,
            });
            send("error", {
              message:
                friendly?.message ||
                "Hiçbir yapay zeka modeli yanıt veremedi. Lütfen birkaç dakika sonra tekrar deneyin.",
              friendly: Boolean(friendly),
            });
          }

          controller.close();
        },
      });

      return new Response(sseStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // -------------------------------------------------------------
    // ESKİ (STREAM OLMAYAN) YOL — Notlar/Görevler gibi diğer özellikler
    // -------------------------------------------------------------
    let lastError = null;
    try {
      const reply = await callAIProvider({ provider, messages, systemPrompt: finalSystemPrompt });
      await incrementFirestoreUsage(firebaseUser.uid, idToken, status.dailyCount);
      return NextResponse.json({
        reply,
        usedProvider: provider.name,
        usedModel: provider.model,
        isFallback: false,
        webSourcesCount,
        newDailyCount: status.dailyCount + 1,
      });
    } catch (err) {
      console.warn(`[UYARI] ${provider.name} (${provider.model}) başarısız: ${err.message}`);
      lastError = err;
    }

    for (const fb of smartFallbacks) {
      if (!fb || !fb.type) continue;
      try {
        const fbReply = await callAIProvider({ provider: fb, messages, systemPrompt: finalSystemPrompt });
        await incrementFirestoreUsage(firebaseUser.uid, idToken, status.dailyCount);
        return NextResponse.json({
          reply: fbReply,
          usedProvider: fb.name,
          usedModel: fb.model,
          isFallback: true,
          webSourcesCount,
          newDailyCount: status.dailyCount + 1,
        });
      } catch (fbErr) {
        console.warn(`[OTO-GEÇİŞ] ${fb.model} de başarısız: ${fbErr.message}`);
        lastError = fbErr;
      }
    }

    const friendly = classifyProviderError({
      status: lastError?._status,
      rawMessage: lastError?.message || "",
      model: provider.model,
    });

    return NextResponse.json(
      { error: friendly ? friendly.message : lastError?.message || "Yapay zeka modelleri yanıt veremedi." },
      { status: 500 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message || "Sunucu hatası oluştu." }, { status: 500 });
  }
}