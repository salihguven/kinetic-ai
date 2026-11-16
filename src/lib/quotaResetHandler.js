import { QuotaResetError } from "./quotaReset.js";

function json(body, status) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function handleQuotaReset(request, dependencies) {
  const { checkRateLimit, verifyFirebaseToken, resetMonthlyQuota } = dependencies;
  const rate = checkRateLimit(request, 4, 60_000);
  if (!rate.allowed) return json({ error: rate.message, code: "RATE_LIMITED" }, 429);

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const user = await verifyFirebaseToken(token);
  if (!user?.uid) {
    return json({ error: "Oturum doğrulanamadı. Yeniden giriş yapın.", code: "UNAUTHENTICATED" }, 401);
  }

  try {
    const result = await resetMonthlyQuota(user.uid);
    return json({ success: true, ...result }, 200);
  } catch (error) {
    if (error instanceof QuotaResetError || error?.name === "QuotaResetError") {
      const status = error.code === "PROFILE_NOT_FOUND" ? 404 : 409;
      return json({ error: error.message, code: error.code }, status);
    }
    console.error("MONTHLY QUOTA RESET ERROR:", error?.code || error?.message || "unknown");
    return json({ error: "Kota şu anda sıfırlanamadı. Biraz sonra tekrar deneyin.", code: "RESET_UNAVAILABLE" }, 503);
  }
}
