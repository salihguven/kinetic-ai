export function getIstanbulDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getIstanbulMonthKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}`;
}

export class QuotaResetError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "QuotaResetError";
    this.code = code;
  }
}

export function prepareMonthlyQuotaReset(userData, { today, month, resetAt }) {
  if (userData?.banned === true) {
    throw new QuotaResetError("ACCOUNT_RESTRICTED", "Bu hesap için kota sıfırlama kullanılamıyor.");
  }
  if (userData?.monthlyQuotaResetMonth === month) {
    throw new QuotaResetError("ALREADY_USED", "Bu ayki ücretsiz kota sıfırlama hakkınız kullanıldı.");
  }

  const currentCount = userData?.lastResetDate === today
    ? Number(userData.dailyCount || 0)
    : 0;
  if (!Number.isFinite(currentCount) || currentCount <= 0) {
    throw new QuotaResetError("NO_QUOTA_TO_RESET", "Önce bugünkü kotanızdan en az bir istek kullanın.");
  }

  return {
    dailyCount: 0,
    lastResetDate: today,
    monthlyQuotaResetMonth: month,
    monthlyQuotaResetAt: resetAt,
  };
}

export async function resetMonthlyQuotaTransaction(db, uid, now = new Date()) {
  const today = getIstanbulDateKey(now);
  const month = getIstanbulMonthKey(now);
  const ref = db.collection("users").doc(uid);

  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) {
      throw new QuotaResetError("PROFILE_NOT_FOUND", "Kullanıcı hesabı bulunamadı.");
    }

    const patch = prepareMonthlyQuotaReset(snap.data(), {
      today,
      month,
      resetAt: now.toISOString(),
    });
    transaction.set(ref, patch, { merge: true });
    return { dailyCount: 0, monthlyQuotaResetMonth: month };
  });
}

export function getMonthlyQuotaResetStatus(profile = {}, date = new Date()) {
  const month = getIstanbulMonthKey(date);
  const used = profile.monthlyQuotaResetMonth === month;
  const remaining = Math.max(0, Number(profile.dailyLimit ?? 100) - Number(profile.dailyCount || 0));
  return {
    month,
    used,
    available: !used && Number(profile.dailyCount || 0) > 0,
    remaining,
  };
}
