import test from "node:test";
import assert from "node:assert/strict";
import { validateFeedbackPayload } from "../src/lib/feedback.js";
import { checkRateLimit } from "../src/lib/security.js";

const valid = {
  type: "bug",
  title: "Dosya ekleme hatası",
  details: "Sohbet ekranında PNG eklemeye çalışınca dosya eklenmiyor.",
  email: "USER@example.com",
  source: "/app",
};

test("feedback payload accepts supported reports and normalizes contact details", () => {
  const result = validateFeedbackPayload(valid);
  assert.equal(result.ok, true);
  assert.equal(result.value.email, "user@example.com");
  assert.equal(result.value.source, "/app");
});

test("feedback payload rejects unsupported categories and short content", () => {
  assert.equal(validateFeedbackPayload({ ...valid, type: "admin" }).ok, false);
  assert.equal(validateFeedbackPayload({ ...valid, details: "Too short" }).ok, false);
});

test("feedback payload enforces field limits and email syntax", () => {
  assert.equal(validateFeedbackPayload({ ...valid, title: "a".repeat(121) }).ok, false);
  assert.equal(validateFeedbackPayload({ ...valid, details: "a".repeat(5001) }).ok, false);
  assert.equal(validateFeedbackPayload({ ...valid, email: "not-an-email" }).ok, false);
});

test("feedback source paths are reduced to a safe allowlisted path", () => {
  assert.equal(validateFeedbackPayload({ ...valid, source: "https://attacker.example" }).value.source, "other");
  assert.equal(validateFeedbackPayload({ ...valid, source: "/app?token=secret" }).value.source, "other");
});

test("feedback rate limits are scoped to this endpoint", () => {
  const ip = `192.0.2.${Math.floor(Math.random() * 250) + 1}`;
  const request = () => new Request("https://kinetic.example/api/feedback", { headers: { "x-forwarded-for": ip } });
  const namespace = `feedback-test-${Math.random()}`;
  assert.equal(checkRateLimit(request(), 1, 60_000, namespace).allowed, true);
  assert.equal(checkRateLimit(request(), 1, 60_000, namespace).allowed, false);
  assert.equal(checkRateLimit(request(), 1, 60_000, `${namespace}-other`).allowed, true);
});
