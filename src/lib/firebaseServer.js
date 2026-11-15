// src/lib/firebaseServer.js

import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

export const DAILY_FAIR_LIMIT = 100;
export const MAX_WARNINGS = 3;

export function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function verifyFirebaseToken(idToken) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey || !idToken) return null;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
      apiKey
    )}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  const user = data?.users?.[0];
  if (!user?.localId) return null;

  return {
    uid: user.localId,
    email: user.email || "",
    emailVerified: Boolean(user.emailVerified),
    name: user.displayName || user.email?.split("@")[0] || "Kullanıcı",
  };
}

export async function getFirestoreUserStatus(uid, idToken) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  const today = getTodayKey();
  if (!res.ok) {
    return {
      dailyCount: 0,
      lastResetDate: today,
      warnings: 0,
      banned: false,
      banReason: "",
      role: "user",
    };
  }

  const doc = await res.json();
  const f = doc.fields || {};
  const lastResetDate = f.lastResetDate?.stringValue || today;
  const rawCount = Number(f.dailyCount?.integerValue || 0);

  return {
    dailyCount: lastResetDate === today ? rawCount : 0,
    lastResetDate: today,
    warnings: Number(f.warnings?.integerValue || 0),
    banned: Boolean(f.banned?.booleanValue),
    banReason:
      f.banReason?.stringValue ||
      "Topluluk kurallarını ihlal ettiğiniz için hesabınız askıya alındı.",
    role: f.role?.stringValue || "user",
  };
}

export async function incrementFirestoreUsage(uid, idToken, currentCount) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const today = getTodayKey();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=dailyCount&updateMask.fieldPaths=lastResetDate`;

  await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      fields: {
        dailyCount: { integerValue: String(currentCount + 1) },
        lastResetDate: { stringValue: today },
      },
    }),
  });
}

export async function recordModerationViolation(uid, idToken, currentWarnings, reason) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const nextWarnings = currentWarnings + 1;
  const shouldBan = nextWarnings >= MAX_WARNINGS;
  const banReason = `Otomatik Yasaklama (${nextWarnings}/${MAX_WARNINGS} uyarı): ${reason}`;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=warnings&updateMask.fieldPaths=banned&updateMask.fieldPaths=banReason`;

  await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      fields: {
        warnings: { integerValue: String(nextWarnings) },
        banned: { booleanValue: shouldBan },
        banReason: { stringValue: shouldBan ? banReason : "" },
      },
    }),
  });

  return { warnings: nextWarnings, banned: shouldBan, banReason };
}