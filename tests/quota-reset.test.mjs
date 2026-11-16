import test from "node:test";
import assert from "node:assert/strict";
import {
  getIstanbulDateKey,
  getIstanbulMonthKey,
  resetMonthlyQuotaTransaction,
} from "../src/lib/quotaReset.js";
import { handleQuotaReset } from "../src/lib/quotaResetHandler.js";

const regularRequest = new Request("https://kinetic.example/api/account/quota-reset", {
  method: "POST",
  headers: { authorization: "Bearer valid-token" },
});

function createFakeDb(initialUser, { serialize = false } = {}) {
  let user = initialUser ? { ...initialUser } : null;
  let queue = Promise.resolve();
  const userRef = { id: "user-record" };

  return {
    get user() {
      return user ? { ...user } : null;
    },
    collection(name) {
      assert.equal(name, "users");
      return { doc: () => userRef };
    },
    async runTransaction(callback) {
      let unlock;
      const previous = queue;
      if (serialize) queue = new Promise((resolve) => { unlock = resolve; });
      await previous;
      try {
        return await callback({
          get: async (ref) => {
            assert.equal(ref, userRef);
            return { exists: Boolean(user), data: () => ({ ...user }) };
          },
          set: (ref, patch, options) => {
            assert.equal(ref, userRef);
            assert.equal(options.merge, true);
            user = { ...user, ...patch };
          },
        });
      } finally {
        unlock?.();
      }
    },
  };
}

test("Istanbul month and date keys follow the local month boundary", () => {
  const instant = new Date("2026-11-30T21:30:00.000Z");
  assert.equal(getIstanbulDateKey(instant), "2026-12-01");
  assert.equal(getIstanbulMonthKey(instant), "2026-12");
});

test("a reset zeroes today's usage and records the monthly claim", async () => {
  const db = createFakeDb({
    dailyCount: 100,
    lastResetDate: "2026-11-16",
    monthlyQuotaResetMonth: "2026-10",
    name: "Salih",
    tokenUsageDate: "2026-11-16",
    dailyTokenUsage: { inputTokens: 4, outputTokens: 8, totalTokens: 12 },
  });
  const now = new Date("2026-11-16T12:00:00.000Z");

  const result = await resetMonthlyQuotaTransaction(db, "signed-in-user", now);

  assert.deepEqual(result, { dailyCount: 0, monthlyQuotaResetMonth: "2026-11" });
  assert.equal(db.user.dailyCount, 0);
  assert.equal(db.user.lastResetDate, "2026-11-16");
  assert.equal(db.user.monthlyQuotaResetMonth, "2026-11");
  assert.equal(db.user.name, "Salih");
  assert.deepEqual(db.user.dailyTokenUsage, { inputTokens: 4, outputTokens: 8, totalTokens: 12 });
});

test("replaying a reset in the same month is rejected", async () => {
  const db = createFakeDb({
    dailyCount: 35,
    lastResetDate: "2026-11-16",
    monthlyQuotaResetMonth: "2026-11",
  });

  await assert.rejects(
    resetMonthlyQuotaTransaction(db, "signed-in-user", new Date("2026-11-16T12:00:00.000Z")),
    { code: "ALREADY_USED" }
  );
  assert.equal(db.user.dailyCount, 35);
});

test("an unused daily quota does not consume the monthly reset", async () => {
  const db = createFakeDb({ dailyCount: 0, lastResetDate: "2026-11-16" });

  await assert.rejects(
    resetMonthlyQuotaTransaction(db, "signed-in-user", new Date("2026-11-16T12:00:00.000Z")),
    { code: "NO_QUOTA_TO_RESET" }
  );
  assert.equal(db.user.monthlyQuotaResetMonth, undefined);
});

test("yesterday's quota cannot be reset or consume this month's claim", async () => {
  const db = createFakeDb({ dailyCount: 100, lastResetDate: "2026-11-15" });

  await assert.rejects(
    resetMonthlyQuotaTransaction(db, "signed-in-user", new Date("2026-11-16T12:00:00.000Z")),
    { code: "NO_QUOTA_TO_RESET" }
  );
  assert.equal(db.user.monthlyQuotaResetMonth, undefined);
});

test("a concurrent replay can only claim one monthly reset", async () => {
  const db = createFakeDb({ dailyCount: 100, lastResetDate: "2026-11-16" }, { serialize: true });
  const now = new Date("2026-11-16T12:00:00.000Z");
  const results = await Promise.allSettled([
    resetMonthlyQuotaTransaction(db, "signed-in-user", now),
    resetMonthlyQuotaTransaction(db, "signed-in-user", now),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected" && result.reason.code === "ALREADY_USED").length, 1);
  assert.equal(db.user.dailyCount, 0);
});

test("missing and invalid credentials are rejected before quota mutation", async () => {
  let resetCalls = 0;
  const response = await handleQuotaReset(
    new Request("https://kinetic.example/api/account/quota-reset", { method: "POST" }),
    {
      checkRateLimit: () => ({ allowed: true }),
      verifyFirebaseToken: async (token) => token ? { uid: "user-from-token" } : null,
      resetMonthlyQuota: async () => { resetCalls += 1; },
    }
  );

  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "UNAUTHENTICATED");
  assert.equal(resetCalls, 0);
});

test("a caller cannot choose another user's UID in the request body", async () => {
  let resetUid;
  const response = await handleQuotaReset(
    new Request("https://kinetic.example/api/account/quota-reset", {
      method: "POST",
      headers: { authorization: "Bearer signed-user-token", "content-type": "application/json" },
      body: JSON.stringify({ uid: "victim-user", monthlyQuotaResetMonth: "2099-01", dailyCount: 0 }),
    }),
    {
      checkRateLimit: () => ({ allowed: true }),
      verifyFirebaseToken: async (token) => token === "signed-user-token" ? { uid: "verified-user" } : null,
      resetMonthlyQuota: async (uid) => {
        resetUid = uid;
        return { dailyCount: 0, monthlyQuotaResetMonth: "2026-11" };
      },
    }
  );

  assert.equal(response.status, 200);
  assert.equal(resetUid, "verified-user");
});

test("rate limits are checked before authentication or reset work", async () => {
  let verifyCalls = 0;
  let resetCalls = 0;
  const response = await handleQuotaReset(regularRequest, {
    checkRateLimit: () => ({ allowed: false, message: "rate-limited" }),
    verifyFirebaseToken: async () => { verifyCalls += 1; return { uid: "user" }; },
    resetMonthlyQuota: async () => { resetCalls += 1; },
  });

  assert.equal(response.status, 429);
  assert.equal(verifyCalls, 0);
  assert.equal(resetCalls, 0);
});
