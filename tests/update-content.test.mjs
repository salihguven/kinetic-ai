import test from "node:test";
import assert from "node:assert/strict";
import { formatLegacyUpdateBody, normalizePublicUpdate, normalizeUpdateImage, normalizeUpdateVideo } from "../src/lib/updateContent.js";

test("legacy update text becomes structured Markdown with concise summary", () => {
  const description = "KineticAI sürümünde yapılan yenilikler.\n\nSOHBET VE MODEL SEÇİMİ\n• Modeli sohbet sırasında değiştirebilirsiniz.\n\nKOTA\n• Günlük sayaç yenilendi.\n\n" + "Yeni geliştirmeler kullanıma sunuldu. ".repeat(12);
  const update = normalizePublicUpdate("oldentry123", { title: "Beta", description });
  assert.equal(update.slug, "oldentry123");
  assert.match(update.summary, /^KineticAI sürümünde yapılan yenilikler\./);
  assert.match(update.articleBody, /^## SOHBET VE MODEL SEÇİMİ/m);
  assert.match(update.articleBody, /^- Modeli sohbet sırasında değiştirebilirsiniz\.$/m);
});

test("video URLs normalize only to supported secure providers or safe local paths", () => {
  assert.equal(normalizeUpdateVideo("https://youtu.be/dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(normalizeUpdateVideo("https://vimeo.com/12345678"), "https://player.vimeo.com/video/12345678");
  assert.equal(normalizeUpdateVideo("/updates/demo.webm"), "/updates/demo.webm");
  assert.equal(normalizeUpdateVideo("javascript:alert(1)"), "");
  assert.equal(normalizeUpdateVideo("https://evil.example/embed/dQw4w9WgXcQ"), "");
  assert.equal(normalizeUpdateVideo("//evil.example/demo.mp4"), "");
});

test("update images accept safe public paths and reject traversal or external URLs", () => {
  assert.equal(normalizeUpdateImage("/updates/launch.webp"), "/updates/launch.webp");
  assert.equal(normalizeUpdateImage("/updates\\launch.webp"), "");
  assert.equal(normalizeUpdateImage("/../secrets.webp"), "");
  assert.equal(normalizeUpdateImage("//example.com/launch.webp"), "");
  assert.equal(normalizeUpdateImage("https://example.com/launch.webp"), "");
});

test("update media accepts only tokenized files in this Firebase Storage bucket", () => {
  const originalBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "kineticai-4a5d6.firebasestorage.app";
  const token = "123e4567-e89b-12d3-a456-426614174000";
  const base = "https://firebasestorage.googleapis.com/v0/b/kineticai-4a5d6.firebasestorage.app/o/updates%2Fuid%2Fasset";
  try {
    assert.equal(normalizeUpdateImage(`${base}.webp?alt=media&token=${token}`).startsWith(base), true);
    assert.equal(normalizeUpdateVideo(`${base}.mp4?alt=media&token=${token}`).startsWith(base), true);
    assert.equal(normalizeUpdateImage(`${base}.webp?alt=media`), "");
    assert.equal(normalizeUpdateVideo(`${base}.mp4?alt=media&token=${token}`.replace("kineticai-4a5d6", "other-project")), "");
    assert.equal(normalizeUpdateImage("https://example.org/updates/asset.webp"), "");
  } finally {
    if (originalBucket === undefined) delete process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    else process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = originalBucket;
  }
});
