// src/lib/moderation.js
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const PENALTY_FILE = path.join(DATA_DIR, "penalties.json");

const BAD_WORDS = [
  "piç",
  "pic",
  "orospu",
  "oç",
  "oc",
  "amk",
  "aq",
  "amına",
  "amina",
  "yarrak",
  "yarak",
  "sik",
  "sikerim",
  "sikeyim",
  "siktir",
  "göt",
  "götveren",
  "kahpe",
  "pezevenk",
  "ibne",
  "puşt",
  "şerefsiz",
  "serefsiz",
  "fuck",
  "bitch",
  "asshole",
  "motherfucker",
];

export const MAX_STRIKES = 3;
export const BAN_DURATION_MS = 3 * 60 * 1000; // 3 dakika ceza

function readPenalties() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(PENALTY_FILE)) {
      fs.writeFileSync(PENALTY_FILE, "{}", "utf-8");
      return {};
    }
    return JSON.parse(fs.readFileSync(PENALTY_FILE, "utf-8")) || {};
  } catch {
    return {};
  }
}

function writePenalties(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PENALTY_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // ignore
  }
}

export function checkContentModeration(text = "") {
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return { flagged: false };

  const words = normalized.split(" ");
  for (const bad of BAD_WORDS) {
    if (words.includes(bad) || (bad.length >= 4 && normalized.includes(bad))) {
      return {
        flagged: true,
        reason: "Uygunsuz dil / küfür kullanımı",
      };
    }
  }

  return { flagged: false };
}

export function getUserPenaltyStatus(uid) {
  const all = readPenalties();
  const entry = all[uid];
  if (!entry) return { blocked: false, warnings: 0, banUntil: 0, remainingSeconds: 0 };

  const now = Date.now();
  if (entry.banUntil && entry.banUntil > now) {
    return {
      blocked: true,
      warnings: entry.warnings,
      banUntil: entry.banUntil,
      remainingSeconds: Math.ceil((entry.banUntil - now) / 1000),
    };
  }

  if (entry.banUntil && entry.banUntil <= now) {
    delete all[uid];
    writePenalties(all);
    return { blocked: false, warnings: 0, banUntil: 0, remainingSeconds: 0 };
  }

  return { blocked: false, warnings: entry.warnings || 0, banUntil: 0, remainingSeconds: 0 };
}

export function addModerationStrike(uid, reason) {
  const all = readPenalties();
  const current = getUserPenaltyStatus(uid);
  const nextWarnings = current.warnings + 1;

  if (nextWarnings >= MAX_STRIKES) {
    const banUntil = Date.now() + BAN_DURATION_MS;
    all[uid] = { warnings: nextWarnings, banUntil, reason };
    writePenalties(all);
    return {
      warnings: nextWarnings,
      banned: true,
      banUntil,
      remainingSeconds: Math.ceil(BAN_DURATION_MS / 1000),
      reason,
    };
  }

  all[uid] = { warnings: nextWarnings, banUntil: 0, reason };
  writePenalties(all);
  return {
    warnings: nextWarnings,
    banned: false,
    banUntil: 0,
    remainingSeconds: 0,
    reason,
  };
}