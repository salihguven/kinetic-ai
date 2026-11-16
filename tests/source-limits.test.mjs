import test from "node:test";
import assert from "node:assert/strict";
import {
  getTextMetrics,
  MAX_NOTE_CONTEXT_CHARACTERS,
  MAX_NOTE_FILE_BYTES,
  MAX_NOTE_SOURCE_CHARACTERS,
  MAX_NOTE_SOURCES,
} from "../src/lib/sourceLimits.js";

test("notebook limits are strict and user-visible values are bounded", () => {
  assert.equal(MAX_NOTE_FILE_BYTES, 256 * 1024);
  assert.equal(MAX_NOTE_SOURCE_CHARACTERS, 20_000);
  assert.equal(MAX_NOTE_CONTEXT_CHARACTERS, 28_000);
  assert.equal(MAX_NOTE_SOURCES, 12);
});

test("source metrics count Unicode code points and UTF-8 bytes", () => {
  assert.deepEqual(getTextMetrics("Merhaba 🌱"), { characters: 9, bytes: 12 });
});
