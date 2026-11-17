import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {
  applyBackupSnapshot,
  BACKUP_STORAGE_KEYS,
  createBackupSnapshot,
  decryptWorkspaceBackup,
  encryptWorkspaceBackup,
  normalizeBackupSnapshot,
} from "../src/lib/encryptedBackup.js";

const passphrase = "correct horse battery staple 42";

function makeSnapshot() {
  return {
    kinetic_ai_chats: JSON.stringify([{
      id: "chat-1",
      title: "Project conversation",
      updatedAt: 123,
      projectId: "school",
      messages: [
        { role: "user", content: "Remember this conversation." },
        { role: "assistant", content: "Saved locally.", sources: [{ title: "Docs", url: "https://example.com" }] },
        { role: "system", content: "This must not be imported." },
      ],
    }]),
    kinetic_ai_notes: JSON.stringify([{
      id: "note-1", title: "Biology", content: "Photosynthesis notes", active: true, projectId: "school",
    }]),
    kinetic_ai_tasks: JSON.stringify([{
      id: "task-1", title: "Review notes", priority: "high", done: false, projectId: "school",
    }]),
    kinetic_ai_projects: JSON.stringify([{ id: "school", name: "School", createdAt: 123 }]),
    kinetic_ai_active_project: "school",
    kinetic_ai_lang: "tr",
    kinetic_ai_theme: "dark",
    kinetic_ai_reasoning_level: "medium",
    kinetic_ai_assistant_settings: JSON.stringify({
      assistantPreset: "tutor", customInstruction: "Be concise", autoFallback: true,
      chainMode: false, bridgeRole: "review", secondaryProviderId: "provider-2", apiKey: "discard-me",
    }),
    kinetic_ai_notifications: "off",
  };
}

function storageFrom(values) {
  const map = new Map(Object.entries(values));
  return {
    map,
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); },
  };
}

test("encrypted backup round-trip keeps workspace data, strips unsupported fields, and excludes API keys", async () => {
  const source = makeSnapshot();
  const envelope = await encryptWorkspaceBackup(source, passphrase, webcrypto);
  assert.equal(envelope.includes("Remember this conversation"), false);
  assert.equal(envelope.includes("discard-me"), false);

  const restored = await decryptWorkspaceBackup(envelope, passphrase, webcrypto);
  const chats = JSON.parse(restored.kinetic_ai_chats);
  const settings = JSON.parse(restored.kinetic_ai_assistant_settings);
  assert.equal(chats[0].messages.length, 2);
  assert.equal(chats[0].projectId, "school");
  assert.equal(JSON.parse(restored.kinetic_ai_notes)[0].projectId, "school");
  assert.equal(JSON.parse(restored.kinetic_ai_tasks)[0].priority, "high");
  assert.equal(settings.customInstruction, "Be concise");
  assert.equal("apiKey" in settings, false);
  assert.equal(restored.kinetic_ai_active_project, "school");
  assert.equal(restored.kinetic_ai_notifications, "off");
  assert.equal(Object.keys(restored).some((key) => key.includes("providers")), false);
});

test("encrypted backup rejects a wrong passphrase and modified ciphertext", async () => {
  const envelope = await encryptWorkspaceBackup(makeSnapshot(), passphrase, webcrypto);
  await assert.rejects(
    decryptWorkspaceBackup(envelope, "a different passphrase 123", webcrypto),
    /Could not decrypt/,
  );

  const parsed = JSON.parse(envelope);
  const bytes = Buffer.from(parsed.ciphertext, "base64");
  bytes[0] ^= 0x01;
  parsed.ciphertext = bytes.toString("base64");
  await assert.rejects(
    decryptWorkspaceBackup(JSON.stringify(parsed), passphrase, webcrypto),
    /Could not decrypt/,
  );
});

test("backup normalization rejects unsupported keys and credential-like notes", () => {
  assert.throws(() => normalizeBackupSnapshot({ ...makeSnapshot(), kinetic_ai_providers: "[]" }), /unsupported field/i);
  assert.throws(() => normalizeBackupSnapshot({
    ...makeSnapshot(),
    kinetic_ai_notes: JSON.stringify([{ id: "secret", title: "Credentials", content: "private" }]),
  }), /key or secret/i);
});

test("backup snapshot only reads the explicit allowlist", () => {
  const source = storageFrom({
    ...makeSnapshot(),
    kinetic_ai_providers: JSON.stringify([{ apiKey: "provider-secret" }]),
  });
  const snapshot = createBackupSnapshot(source);
  assert.deepEqual(Object.keys(snapshot), [...BACKUP_STORAGE_KEYS]);
  assert.equal("kinetic_ai_providers" in snapshot, false);
});

test("restoring workspace data leaves saved provider credentials untouched", () => {
  const providerData = JSON.stringify([{ id: "provider", apiKey: "local-secret" }]);
  const storage = storageFrom({ kinetic_ai_providers: providerData });
  assert.equal(applyBackupSnapshot(storage, makeSnapshot()), true);
  assert.equal(storage.getItem("kinetic_ai_providers"), providerData);
});

test("restore rolls stored values back if a write fails partway through", () => {
  const original = Object.fromEntries(BACKUP_STORAGE_KEYS.map((key) => [key, `old:${key}`]));
  const storage = storageFrom(original);
  const setItem = storage.setItem;
  let failOnce = true;
  storage.setItem = (key, value) => {
    if (key === "kinetic_ai_tasks" && failOnce) {
      failOnce = false;
      throw new Error("quota exceeded");
    }
    setItem(key, value);
  };

  assert.equal(applyBackupSnapshot(storage, makeSnapshot()), false);
  for (const key of BACKUP_STORAGE_KEYS) assert.equal(storage.getItem(key), original[key]);
});
