import test from "node:test";
import assert from "node:assert/strict";
import { callAIProvider, normalizeTokenUsage, streamAIProvider } from "../src/lib/aiAdapters.js";
import { recordProviderTokenUsageTransaction } from "../src/lib/tokenUsage.js";

function createFakeDb(initial = {}, { serialize = false } = {}) {
  let user = { ...initial };
  let queue = Promise.resolve();
  const userRef = { id: "test-user" };
  return {
    get user() { return structuredClone(user); },
    collection(name) {
      assert.equal(name, "users");
      return { doc: (uid) => ({ ...userRef, uid }) };
    },
    async runTransaction(callback) {
      let unlock;
      const previous = queue;
      if (serialize) queue = new Promise((resolve) => { unlock = resolve; });
      await previous;
      try {
        return await callback({
          get: async (ref) => ({ exists: Boolean(user), data: () => structuredClone(user), ref }),
          set: (ref, patch, options) => {
            assert.equal(options.merge, true);
            user = { ...user, ...structuredClone(patch) };
          },
        });
      } finally {
        unlock?.();
      }
    },
  };
}

const usage = (inputTokens, outputTokens, totalTokens = inputTokens + outputTokens) => ({
  inputTokens,
  outputTokens,
  totalTokens,
});

test("normalizes provider-reported usage without inventing missing counts", () => {
  assert.deepEqual(normalizeTokenUsage({ inputTokens: 12, outputTokens: 8 }), {
    inputTokens: 12,
    outputTokens: 8,
    totalTokens: 20,
  });
  assert.deepEqual(normalizeTokenUsage({ totalTokens: "37" }), {
    inputTokens: null,
    outputTokens: null,
    totalTokens: 37,
  });
  assert.deepEqual(normalizeTokenUsage({ inputTokens: null, outputTokens: 2, totalTokens: null }), {
    inputTokens: null,
    outputTokens: 2,
    totalTokens: null,
  });
  assert.deepEqual(normalizeTokenUsage({ inputTokens: -1, outputTokens: 2 }), {
    inputTokens: null,
    outputTokens: 2,
    totalTokens: null,
  });
  assert.equal(normalizeTokenUsage({ totalTokens: 1_000_000_001 }), null);
});

test("OpenAI-compatible non-stream adapter returns usage from the provider response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    choices: [{ message: { content: "ok" } }],
    usage: { prompt_tokens: 31, completion_tokens: 9, total_tokens: 40 },
  }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const result = await callAIProvider({
      provider: { type: "openai-compatible", baseUrl: "https://api.openai.com/v1", apiKey: "not-a-real-key", model: "test-model" },
      messages: [{ role: "user", content: "hello" }],
    });
    assert.equal(result.reply, "ok");
    assert.deepEqual(result.usage, { inputTokens: 31, outputTokens: 9, totalTokens: 40 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("streaming OpenAI-compatible adapter captures the terminal usage frame", async () => {
  const originalFetch = globalThis.fetch;
  const frames = [
    { choices: [{ delta: { content: "streamed" } }] },
    { choices: [], usage: { prompt_tokens: 14, completion_tokens: 6, total_tokens: 20 } },
  ].map((frame) => `data: ${JSON.stringify(frame)}\n\n`).join("") + "data: [DONE]\n\n";
  globalThis.fetch = async () => new Response(frames, { status: 200, headers: { "content-type": "text/event-stream" } });
  try {
    const chunks = [];
    const result = await streamAIProvider({
      provider: { type: "openai-compatible", baseUrl: "https://api.openai.com/v1", apiKey: "not-a-real-key", model: "test-model" },
      messages: [{ role: "user", content: "hello" }],
      onToken: (chunk) => chunks.push(chunk),
    });
    assert.equal(result.reply, "streamed");
    assert.deepEqual(chunks, ["streamed"]);
    assert.deepEqual(result.usage, { inputTokens: 14, outputTokens: 6, totalTokens: 20 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("daily and per-model usage accumulates atomically for the Istanbul day", async () => {
  const db = createFakeDb({ name: "Salih", dailyCount: 4 }, { serialize: true });
  const day = new Date("2026-11-16T12:00:00.000Z");
  await Promise.all([
    recordProviderTokenUsageTransaction(db, "verified-uid", "openai-compatible", "gpt-test", usage(10, 5), day),
    recordProviderTokenUsageTransaction(db, "verified-uid", "openai-compatible", "gpt-test", usage(7, 3), day),
    recordProviderTokenUsageTransaction(db, "verified-uid", "gemini", "gemini-test", usage(4, 2), day),
  ]);
  const result = db.user;
  const models = Object.values(result.tokenUsageByModel);
  assert.equal(result.tokenUsageDate, "2026-11-16");
  assert.equal(result.dailyTokenUsage.totalTokens, 31);
  assert.equal(models.find((item) => item.model === "gpt-test").totalTokens, 25);
  assert.equal(models.find((item) => item.model === "gemini-test").totalTokens, 6);
  assert.equal(result.name, "Salih");
  assert.equal(result.dailyCount, 4);
  assert.equal(JSON.stringify(result).includes("not-a-real-key"), false);
});

test("new Istanbul day starts fresh daily and model counters", async () => {
  const db = createFakeDb({
    tokenUsageDate: "2026-11-16",
    dailyTokenUsage: { inputTokens: 200, outputTokens: 50, totalTokens: 250 },
    tokenUsageByModel: { old: { model: "old-model", totalTokens: 250 } },
  });
  await recordProviderTokenUsageTransaction(
    db,
    "verified-uid",
    "gemini",
    "new-model",
    usage(8, 2),
    new Date("2026-11-17T00:10:00.000Z")
  );
  assert.equal(db.user.tokenUsageDate, "2026-11-17");
  assert.equal(db.user.dailyTokenUsage.totalTokens, 10);
  assert.deepEqual(Object.values(db.user.tokenUsageByModel).map((item) => item.model), ["new-model"]);
});

test("missing usage and unrecognized provider data do not change counters", async () => {
  const db = createFakeDb({ dailyTokenUsage: { totalTokens: 15 }, existing: true });
  const now = new Date("2026-11-16T12:00:00.000Z");
  assert.equal(await recordProviderTokenUsageTransaction(db, "uid", "gemini", "m", null, now), null);
  assert.equal(await recordProviderTokenUsageTransaction(db, "uid", "unknown", "m", usage(1, 1), now), null);
  assert.equal(await recordProviderTokenUsageTransaction(db, "uid", "gemini", "m", usage(1, 1, 1_000_000_001), now), null);
  assert.equal(db.user.tokenUsageDate, undefined);
  assert.equal(db.user.dailyTokenUsage.totalTokens, 15);
});

test("model counter storage remains bounded when clients switch among many models", async () => {
  const db = createFakeDb();
  const now = new Date("2026-11-16T12:00:00.000Z");
  for (let i = 0; i < 18; i += 1) {
    await recordProviderTokenUsageTransaction(db, "uid", "openai-compatible", `model-${i}`, usage(1, 1), now);
  }
  assert.equal(Object.keys(db.user.tokenUsageByModel).length, 16);
  assert.equal(db.user.tokenUsageByModel.other.totalTokens, 6);
  assert.equal(db.user.dailyTokenUsage.totalTokens, 36);
});
