import test from "node:test";
import assert from "node:assert/strict";
import { checkContentModeration } from "../src/lib/moderation.js";

test("ordinary notebook actions and repeated greetings are not false positives", () => {
  for (const text of [
    "Kaynak Özeti Çıkar",
    "Verilen kaynaklar yok.",
    "Merhabalar Merhabalar Merhabalar Merhabalar",
    "Analiz için kaynakları özetle.",
  ]) {
    assert.equal(checkContentModeration(text).flagged, false, text);
  }
});

test("explicit whole-word profanity and supported inflections are still detected", () => {
  assert.equal(checkContentModeration("Bu şerefsiz.").flagged, true);
  assert.equal(checkContentModeration("Siktir git.").flagged, true);
});
