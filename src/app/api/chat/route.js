// src/app/api/chat/route.js
import { NextResponse } from "next/server";
import { callAIProvider } from "@/lib/aiAdapters";
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

  // 1. Google Gemini takılırsa AYNI API KEY ile hemen diğer boş Gemini modellerini sırayla dene!
  if (provider.type === "gemini") {
    const geminiBackups = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"];
    for (const m of geminiBackups) {
      if (provider.model !== m) {
        list.push({
          ...provider,
          name: `${provider.name} (Oto-Geçiş)`,
          model: m,
        });
      }
    }
  }

  // 2. Groq takılırsa AYNI API KEY ile diğer Groq modellerini dene!
  if ((provider.baseUrl || "").includes("groq.com")) {
    const groqBackups = hasImages
      ? ["meta-llama/llama-4-scout-17b-16e-instruct"]
      : ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
    for (const m of groqBackups) {
      if (provider.model !== m) {
        list.push({
          ...provider,
          name: `${provider.name} (Oto-Geçiş)`,
          model: m,
        });
      }
    }
  }

  return list;
}

export async function POST(request) {
  try {
    const vpnCheck = await checkVpnOrWarp(request);
    if (vpnCheck.blocked) {
      return NextResponse.json({ error: vpnCheck.reason, code: "VPN_BLOCKED" }, { status: 403 });
    }

    const rate = checkRateLimit(request, 25, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: rate.message }, { status: 429 });
    }

    const authHeader = request.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const firebaseUser = await verifyFirebaseToken(idToken);
    if (!firebaseUser) {
      return NextResponse.json({ error: "Devam etmek için lütfen giriş yapın." }, { status: 401 });
    }

    const penalty = getUserPenaltyStatus(firebaseUser.uid);
    if (penalty.blocked) {
      return NextResponse.json(
        {
          error: `Hesabınız ${penalty.remainingSeconds} saniye boyunca geçici olarak kısıtlandı.`,
          code: "TEMP_BAN",
          banUntil: penalty.banUntil,
        },
        { status: 403 }
      );
    }

    const status = await getFirestoreUserStatus(firebaseUser.uid, idToken);
    if (status.banned) {
      return NextResponse.json(
        { error: `Hesabınız yasaklandı: ${status.banReason}`, code: "BANNED" },
        { status: 403 }
      );
    }

    if (status.dailyCount >= DAILY_FAIR_LIMIT) {
      return NextResponse.json(
        { error: `Günlük kullanım sınırına (${DAILY_FAIR_LIMIT}) ulaştınız.`, code: "LIMIT_REACHED" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      provider,
      fallbackProviders = [],
      messages,
      systemPrompt,
      useWebSearch = false,
    } = body;

    const msgCheck = validateMessagesSafety(messages);
    if (!msgCheck.ok) {
      return NextResponse.json({ error: msgCheck.error }, { status: 400 });
    }

    const lastUserMessage =
      [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const modCheck = checkContentModeration(lastUserMessage);
    if (modCheck.flagged) {
      const strike = addModerationStrike(firebaseUser.uid, modCheck.reason);
      if (strike.banned) {
        return NextResponse.json(
          {
            error: "3 kez uygunsuz dil tespit edildi! Sistem 3 dakika kilitlendi.",
            code: "TEMP_BAN",
            banUntil: strike.banUntil,
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        {
          error: `Uygunsuz dil! Uyarı ${strike.warnings}/${MAX_STRIKES}`,
          code: "WARNING",
        },
        { status: 400 }
      );
    }

    if (!provider || !provider.type) {
      return NextResponse.json({ error: "Geçerli bir AI bağlantısı seçin." }, { status: 400 });
    }

    if (provider.baseUrl && !validateSafeUrl(provider.baseUrl)) {
      return NextResponse.json({ error: "Geçersiz API adresi." }, { status: 400 });
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

    // 1. ÖNCE ANA MODELİ DENE (Max 8 Saniye)
    let lastError = null;
    try {
      const reply = await callAIProvider({
        provider,
        messages,
        systemPrompt: finalSystemPrompt,
      });
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
      console.warn(`[UYARI] ${provider.name} (${provider.model}) başarısız oldu: ${err.message}. Hemen yedek modele geçiliyor!`);
      lastError = err;
    }

    // 2. ANA MODEL TAKILDIĞI AN HİÇ BEKLEMEDEN DİĞER MODELLERE GEÇ!
    const smartFallbacks = buildSmartFallbacks(provider, fallbackProviders, hasImages);
    for (const fb of smartFallbacks) {
      if (!fb || !fb.type) continue;
      console.log(`[OTO-GEÇİŞ] Deneniyor -> ${fb.name} (${fb.model})`);
      try {
        const fbReply = await callAIProvider({
          provider: fb,
          messages,
          systemPrompt: finalSystemPrompt,
        });
        console.log(`[OTO-GEÇİŞ] Başarılı! Cevap ${fb.model} üzerinden kurtarıldı.`);
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
      }
    }

    return NextResponse.json(
      { error: lastError?.message || "Yapay zeka modelleri yanıt veremedi." },
      { status: 500 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}