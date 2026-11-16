
// src/lib/firebaseServer.js

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "node:fs";
import { getFirestore } from "firebase-admin/firestore";

export const DAILY_FAIR_LIMIT = 100;
export const MAX_WARNINGS = 3;
export const BAN_DURATION_MS = 3 * 60 * 1000;

export function getTodayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

// Firebase Admin başlatma
function getAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  let raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  // Yerel geliştirmede .env.local değişkeni yoksa dosyadan oku.
  if (!raw && process.env.NODE_ENV !== "production") {
    try {
      raw = readFileSync(
        new URL("../../secrets/service-account.json", import.meta.url),
        "utf8"
      );
    } catch {
      throw new Error(
        "Firebase Service Account bulunamadı. .env.local veya secrets/service-account.json kontrol edilmeli."
      );
    }
  }

  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY Vercel Environment Variables içinde tanımlanmamış."
    );
  }

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

// Firebase Admin Auth
function getAdminAuth() {
  return getAuth(getAdminApp());
}

// Güvenli Firebase kullanıcı doğrulama
export async function verifyFirebaseToken(idToken) {
  if (!idToken) return null;

  try {
    // true: iptal edilmiş tokenları da kontrol et.
    const decoded = await getAdminAuth().verifyIdToken(
      idToken,
      true
    );

    return {
      uid: decoded.uid,
      email: decoded.email || "",
      authTime: Number(decoded.auth_time || 0),
      emailVerified: Boolean(decoded.email_verified),
      name:
        decoded.name ||
        decoded.email?.split("@")[0] ||
        "Kullanıcı",

      // Admin yetkisi yalnızca Firebase Custom Claims üzerinden.
      isAdmin: decoded.admin === true,
      isTester: decoded.tester === true,
    };
  } catch (error) {
    console.error(
      "[FIREBASE TOKEN VERIFICATION]",
      error.code || error.message
    );

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
  const moderationBanUntil = Number(
    data.moderationBanUntil || 0
  );

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

    // Bu alan sadece profil bilgisidir.
    // Admin yetkilendirmesinde KULLANILMAZ.
    role: "user",
  };
}

// Günlük kullanım sayacı
export async function incrementFirestoreUsage(uid, limit = DAILY_FAIR_LIMIT) {
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

    if (current >= limit) {
      const error = new Error("Günlük kullanım sınırına ulaşıldı.");
      error.code = "LIMIT_REACHED";
      throw error;
    }

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

export async function releaseFirestoreUsage(uid) {
  const db = getDb();
  const ref = db.collection("users").doc(uid);
  const today = getTodayKey();

  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) return 0;

    const data = snap.data();
    if (data.lastResetDate !== today) return 0;

    const next = Math.max(0, Number(data.dailyCount || 0) - 1);
    transaction.set(ref, { dailyCount: next, lastResetDate: today }, { merge: true });
    return next;
  });
}

export async function deleteFirebaseAccount(uid) {
  const db = getDb();
  const userRef = db.collection("users").doc(uid);
  const userSnapshot = await userRef.get();

  if (userSnapshot.exists) await userRef.delete();
  try {
    await getAdminAuth().deleteUser(uid);
  } catch (error) {
    if (userSnapshot.exists) {
      try {
        await userRef.set(userSnapshot.data());
      } catch (restoreError) {
        console.error("FIREBASE ACCOUNT PROFILE RESTORE ERROR:", restoreError.code || restoreError.message);
      }
    }
    throw error;
  }
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

// Admin API işlemleri için Firestore bağlantısı
export function getAdminDb() {
  return getFirestore(getAdminApp());
}
