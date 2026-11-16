
// src/lib/firebaseServer.js

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const DAILY_FAIR_LIMIT = 100;
export const MAX_WARNINGS = 3;
export const BAN_DURATION_MS = 3 * 60 * 1000;

export function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Firebase Admin başlatma
function getAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY tanımlanmamış.");
  }

  let serviceAccount;

  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error("Firebase servis hesabı JSON formatı geçersiz.");
  }

  serviceAccount.private_key =
    serviceAccount.private_key?.replace(/\\n/g, "\n");

  return initializeApp({
    credential: cert(serviceAccount),
    projectId:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      serviceAccount.project_id,
  });
}

function getDb() {
  return getFirestore(getAdminApp());
}

// Firebase kullanıcı doğrulama

export async function verifyFirebaseToken(idToken) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey || !idToken) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.error(
        "[FIREBASE AUTH]",
        res.status,
        await res.text()
      );
      return null;
    }

    const data = await res.json();
    const user = data?.users?.[0];

    if (!user?.localId) return null;

    return {
      uid: user.localId,
      email: user.email || "",
      emailVerified: Boolean(user.emailVerified),
      name:
        user.displayName ||
        user.email?.split("@")[0] ||
        "Kullanıcı",
    };
  } catch (error) {
    console.error("[FIREBASE AUTH]", error);
    return null;
  }
}


// Kullanıcı ve moderasyon durumunu getir
export async function getFirestoreUserStatus(uid) {
  const db = getDb();
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();

  const today = getTodayKey();
  const data = snap.exists ? snap.data() : {};

  const now = Date.now();
  const moderationBanUntil = Number(data.moderationBanUntil || 0);
  const moderationBlocked = moderationBanUntil > now;

  const lastResetDate = data.lastResetDate || today;

  return {
    dailyCount:
      lastResetDate === today
        ? Number(data.dailyCount || 0)
        : 0,

    lastResetDate: today,

    warnings: moderationBlocked
      ? Number(data.warnings || 0)
      : moderationBanUntil > 0
        ? 0
        : Number(data.warnings || 0),

    moderationBanUntil: moderationBlocked
      ? moderationBanUntil
      : 0,

    moderationBlocked,

    remainingSeconds: moderationBlocked
      ? Math.ceil((moderationBanUntil - now) / 1000)
      : 0,

    banned: Boolean(data.banned),

    banReason: data.banReason || "",

    role: data.role || "user",
  };
}

// Günlük kullanım sayacı
export async function incrementFirestoreUsage(uid) {
  const db = getDb();
  const ref = db.collection("users").doc(uid);
  const today = getTodayKey();

  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const data = snap.exists ? snap.data() : {};

    const current =
      data.lastResetDate === today
        ? Number(data.dailyCount || 0)
        : 0;

    const next = current + 1;

    transaction.set(
      ref,
      {
        dailyCount: next,
        lastResetDate: today,
      },
      { merge: true }
    );

    return next;
  });
}

// Atomik moderasyon uyarısı
export async function recordModerationViolation(uid, reason) {
  const db = getDb();
  const ref = db.collection("users").doc(uid);

  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const data = snap.exists ? snap.data() : {};

    const now = Date.now();

    const existingBanUntil = Number(
      data.moderationBanUntil || 0
    );

    // Aktif ceza varsa yeni uyarı oluşturma.
    if (existingBanUntil > now) {
      return {
        warnings: Number(data.warnings || 0),
        banned: true,
        banUntil: existingBanUntil,
        remainingSeconds: Math.ceil(
          (existingBanUntil - now) / 1000
        ),
        reason: data.moderationReason || reason,
      };
    }

    // Süresi dolmuş cezanın ardından sayaç sıfırlanır.
    const currentWarnings =
      existingBanUntil > 0
        ? 0
        : Number(data.warnings || 0);

    const nextWarnings = currentWarnings + 1;

    const shouldBan = nextWarnings >= MAX_WARNINGS;

    const banUntil = shouldBan
      ? now + BAN_DURATION_MS
      : 0;

    transaction.set(
      ref,
      {
        warnings: shouldBan ? MAX_WARNINGS : nextWarnings,
        moderationBanUntil: banUntil,
        moderationReason: reason,
        moderationUpdatedAt: now,
      },
      { merge: true }
    );

    return {
      warnings: shouldBan ? MAX_WARNINGS : nextWarnings,
      banned: shouldBan,
      banUntil,
      remainingSeconds: shouldBan
        ? Math.ceil(BAN_DURATION_MS / 1000)
        : 0,
      reason,
    };
  });
}
