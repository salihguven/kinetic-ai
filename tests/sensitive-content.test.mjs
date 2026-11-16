import test from "node:test";
import assert from "node:assert/strict";
import { isSensitiveSource } from "../src/lib/sensitiveContent.js";

test("recognizes high-risk credential and recovery file names", () => {
  for (const name of [
    "recovery-codes.txt",
    "google-services.json",
    "kineticai-firebase-adminsdk-private.json",
    ".env.local",
    "server-private-key.pem",
  ]) {
    assert.equal(isSensitiveSource(name), true, name);
  }
});

test("recognizes private keys, service accounts and common API tokens in content", () => {
  assert.equal(isSensitiveSource("notes.txt", '"type":"service_account","private_key":"x"'), true);
  assert.equal(isSensitiveSource("snippet.txt", "-----BEGIN PRIVATE KEY-----"), true);
  assert.equal(isSensitiveSource("snippet.txt", "OPENAI_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz123456"), true);
  assert.equal(isSensitiveSource("code.txt", "AKIA1234567890ABCDEF"), true);
});

test("keeps ordinary notes and source code usable", () => {
  assert.equal(isSensitiveSource("biology-notes.md", "Photosynthesis converts light into chemical energy."), false);
  assert.equal(isSensitiveSource("example.js", "const message = 'hello world';"), false);
});
