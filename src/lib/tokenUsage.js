import { createHash } from "node:crypto";

const MAX_TRACKED_TOKEN_MODELS = 15;
const TOKEN_USAGE_PROVIDERS = new Set([
  "gemini",
  "openai-compatible",
  "anthropic",
  "ollama",
  "custom",
]);

export function getIstanbulUsageDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function validTokenCount(value) {
  if (value === undefined || value === null || value === "") return null;
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 && count <= 1_000_000_000
    ? count
    : null;
}

export async function recordProviderTokenUsageTransaction(
  db,
  uid,
  providerType,
  model,
  usage,
  now = new Date()
) {
  const totalTokens = validTokenCount(usage?.totalTokens);
  if (
    !uid ||
    !TOKEN_USAGE_PROVIDERS.has(providerType) ||
    typeof model !== "string" ||
    !model.trim() ||
    model.length > 200 ||
    totalTokens === null
  ) {
    return null;
  }

  const today = getIstanbulUsageDate(now);
  const ref = db.collection("users").doc(uid);
  const inputTokens = validTokenCount(usage?.inputTokens) ?? 0;
  const outputTokens = validTokenCount(usage?.outputTokens) ?? 0;
  const modelKey = createHash("sha256")
    .update(`${providerType}\0${model.trim()}`)
    .digest("hex")
    .slice(0, 24);

  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const data = snap.exists ? snap.data() : {};
    const isSameDay = data.tokenUsageDate === today;
    const modelUsage = isSameDay && data.tokenUsageByModel && typeof data.tokenUsageByModel === "object"
      ? { ...data.tokenUsageByModel }
      : {};
    let targetKey = modelKey;
    let target = modelUsage[targetKey];

    if (
      !target &&
      Object.keys(modelUsage).filter((key) => key !== "other").length >= MAX_TRACKED_TOKEN_MODELS
    ) {
      targetKey = "other";
      target = modelUsage.other;
    }

    const add = (current, increment) => {
      const base = validTokenCount(current) ?? 0;
      return Math.min(1_000_000_000, base + increment);
    };

    modelUsage[targetKey] = {
      providerType: targetKey === "other" ? "other" : providerType,
      model: targetKey === "other" ? "Diğer modeller" : model.trim(),
      inputTokens: add(target?.inputTokens, inputTokens),
      outputTokens: add(target?.outputTokens, outputTokens),
      totalTokens: add(target?.totalTokens, totalTokens),
    };

    const daily = isSameDay && data.dailyTokenUsage && typeof data.dailyTokenUsage === "object"
      ? data.dailyTokenUsage
      : {};
    const dailyTokenUsage = {
      inputTokens: add(daily.inputTokens, inputTokens),
      outputTokens: add(daily.outputTokens, outputTokens),
      totalTokens: add(daily.totalTokens, totalTokens),
    };

    transaction.set(ref, {
      tokenUsageDate: today,
      dailyTokenUsage,
      tokenUsageByModel: modelUsage,
    }, { merge: true });

    return {
      tokenUsageDate: today,
      dailyTokenUsage,
      modelKey: targetKey,
      modelUsage: modelUsage[targetKey],
    };
  });
}
