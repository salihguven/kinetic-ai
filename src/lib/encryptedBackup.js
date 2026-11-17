import { normalizeProjectItems, normalizeProjects, DEFAULT_PROJECT_ID } from "./workspaceProjects.js";
import { isSensitiveSource } from "./sensitiveContent.js";
import { MAX_NOTE_SOURCE_CHARACTERS, MAX_NOTE_SOURCES } from "./sourceLimits.js";
import { normalizeReasoningLevel } from "./reasoning.js";

export const ENCRYPTED_BACKUP_FORMAT = "kineticai-encrypted-workspace";
export const ENCRYPTED_BACKUP_VERSION = 1;
export const BACKUP_KDF_ITERATIONS = 310_000;
export const MAX_BACKUP_PLAINTEXT_BYTES = 2 * 1024 * 1024;
export const MAX_BACKUP_FILE_BYTES = 3 * 1024 * 1024;

export const BACKUP_STORAGE_KEYS = Object.freeze([
  "kinetic_ai_chats",
  "kinetic_ai_notes",
  "kinetic_ai_tasks",
  "kinetic_ai_projects",
  "kinetic_ai_active_project",
  "kinetic_ai_lang",
  "kinetic_ai_theme",
  "kinetic_ai_reasoning_level",
  "kinetic_ai_assistant_settings",
  "kinetic_ai_notifications",
]);

const keySet = new Set(BACKUP_STORAGE_KEYS);
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function fail(message) {
  throw new Error(message);
}

function parseJsonValue(value, key, fallback) {
  if (value === null) return fallback;
  if (typeof value !== "string" || value.length > MAX_BACKUP_PLAINTEXT_BYTES) {
    fail(`Backup field “${key}” is too large or has the wrong type.`);
  }
  try {
    return JSON.parse(value);
  } catch {
    fail(`Backup field “${key}” contains invalid data.`);
  }
}

function safeString(value, maxLength) {
  return typeof value === "string" && value.length <= maxLength ? value : null;
}

function normalizeChats(value, projects) {
  if (!Array.isArray(value) || value.length > 2_000) fail("Backup contains an invalid chat list.");
  const source = value.filter((chat) => chat && typeof chat === "object" && !Array.isArray(chat));
  const withProjects = normalizeProjectItems(source, projects);
  return withProjects.flatMap((chat) => {
    const id = safeString(chat.id, 120);
    const title = safeString(chat.title, 160);
    if (!id || !title || !Array.isArray(chat.messages) || chat.messages.length > 2_000) return [];
    const messages = chat.messages.flatMap((message) => {
      if (!message || typeof message !== "object" || Array.isArray(message)) return [];
      if (message.role !== "user" && message.role !== "assistant") return [];
      if (typeof message.content !== "string" || message.content.length > 500_000) return [];
      const sources = Array.isArray(message.sources)
        ? message.sources.slice(0, 20).flatMap((item) => {
            if (!item || typeof item !== "object") return [];
            const url = safeString(item.url, 2_000);
            const sourceUrl = url ? safeHttpUrl(url) : "";
            const titleText = safeString(item.title, 300);
            if (!sourceUrl || !titleText) return [];
            return [{ url: sourceUrl, title: titleText, source: safeString(item.source, 100) || "", date: safeString(item.date, 80) || "" }];
          })
        : undefined;
      return [{
        role: message.role,
        content: message.content,
        ...(safeString(message.providerName, 240) ? { providerName: message.providerName } : {}),
        ...(Array.isArray(message.attachmentNames)
          ? { attachmentNames: message.attachmentNames.slice(0, 10).map((name) => safeString(name, 200)).filter(Boolean) }
          : {}),
        ...(sources?.length ? { sources } : {}),
      }];
    });
    return [{
      id,
      title,
      messages,
      updatedAt: Number.isFinite(chat.updatedAt) ? chat.updatedAt : 0,
      projectId: chat.projectId,
    }];
  });
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizeNotes(value, projects) {
  if (!Array.isArray(value) || value.length > MAX_NOTE_SOURCES) fail("Backup contains an invalid notes list.");
  const notes = value.flatMap((note) => {
    if (!note || typeof note !== "object" || Array.isArray(note)) return [];
    const id = safeString(note.id, 120);
    const title = safeString(note.title, 300);
    const content = safeString(note.content, MAX_NOTE_SOURCE_CHARACTERS);
    if (!id || !title || !content?.trim()) return [];
    if (isSensitiveSource(title, content)) fail("A note in this backup looks like it contains a key or secret. Remove it before restoring.");
    return [{
      id,
      title,
      content,
      sourceKind: note.sourceKind === "file" ? "file" : "text",
      ...(Number.isFinite(note.fileSizeBytes) ? { fileSizeBytes: Math.max(0, note.fileSizeBytes) } : {}),
      contentBytes: encoder.encode(content).byteLength,
      active: Boolean(note.active),
      projectId: note.projectId,
    }];
  });
  return normalizeProjectItems(notes, projects);
}

function normalizeTasks(value, projects) {
  if (!Array.isArray(value) || value.length > 10_000) fail("Backup contains an invalid task list.");
  const tasks = value.flatMap((task) => {
    if (!task || typeof task !== "object" || Array.isArray(task)) return [];
    const id = safeString(task.id, 120);
    const title = safeString(task.title, 1_000);
    if (!id || !title) return [];
    return [{
      id,
      title,
      priority: ["low", "medium", "high"].includes(task.priority) ? task.priority : "medium",
      done: Boolean(task.done),
      projectId: task.projectId,
    }];
  });
  return normalizeProjectItems(tasks, projects);
}

function normalizeAssistantSettings(value) {
  if (value === null) return null;
  const settings = parseJsonValue(value, "kinetic_ai_assistant_settings", null);
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) fail("Backup assistant settings are invalid.");
  const presets = new Set(["general", "coder", "tutor", "concise"]);
  const roles = new Set(["review", "code", "debate"]);
  return JSON.stringify({
    assistantPreset: presets.has(settings.assistantPreset) ? settings.assistantPreset : "general",
    customInstruction: typeof settings.customInstruction === "string" ? settings.customInstruction.slice(0, 3_000) : "",
    autoFallback: typeof settings.autoFallback === "boolean" ? settings.autoFallback : true,
    chainMode: Boolean(settings.chainMode),
    bridgeRole: roles.has(settings.bridgeRole) ? settings.bridgeRole : "review",
    secondaryProviderId: safeString(settings.secondaryProviderId, 120) || "",
  });
}

export function createBackupSnapshot(storage) {
  const snapshot = {};
  for (const key of BACKUP_STORAGE_KEYS) snapshot[key] = storage.getItem(key);
  return snapshot;
}

export function normalizeBackupSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) fail("Backup data is invalid.");
  if (Object.keys(snapshot).some((key) => !keySet.has(key))) fail("Backup contains an unsupported field.");

  const projectsRaw = parseJsonValue(snapshot.kinetic_ai_projects ?? null, "kinetic_ai_projects", []);
  const projects = normalizeProjects(projectsRaw);
  const validProjectIds = new Set(projects.map((project) => project.id));
  const chats = normalizeChats(parseJsonValue(snapshot.kinetic_ai_chats ?? null, "kinetic_ai_chats", []), projects);
  const notes = normalizeNotes(parseJsonValue(snapshot.kinetic_ai_notes ?? null, "kinetic_ai_notes", []), projects);
  const tasks = normalizeTasks(parseJsonValue(snapshot.kinetic_ai_tasks ?? null, "kinetic_ai_tasks", []), projects);

  const lang = snapshot.kinetic_ai_lang;
  const theme = snapshot.kinetic_ai_theme;
  const reasoning = snapshot.kinetic_ai_reasoning_level;
  const notifications = snapshot.kinetic_ai_notifications;
  if (lang !== null && lang !== "tr" && lang !== "en") fail("Backup language preference is invalid.");
  if (theme !== null && theme !== "dark" && theme !== "light") fail("Backup theme preference is invalid.");
  if (reasoning !== null && normalizeReasoningLevel(reasoning) !== reasoning) fail("Backup reasoning preference is invalid.");
  if (notifications !== null && notifications !== "on" && notifications !== "off") fail("Backup notification preference is invalid.");

  const rawActiveProject = snapshot.kinetic_ai_active_project;
  if (rawActiveProject !== null && (typeof rawActiveProject !== "string" || rawActiveProject.length > 80)) {
    fail("Backup active project is invalid.");
  }

  const normalized = {
    kinetic_ai_chats: JSON.stringify(chats),
    kinetic_ai_notes: JSON.stringify(notes),
    kinetic_ai_tasks: JSON.stringify(tasks),
    kinetic_ai_projects: JSON.stringify(projects),
    kinetic_ai_active_project: validProjectIds.has(rawActiveProject) ? rawActiveProject : DEFAULT_PROJECT_ID,
    kinetic_ai_lang: lang,
    kinetic_ai_theme: theme,
    kinetic_ai_reasoning_level: reasoning,
    kinetic_ai_assistant_settings: normalizeAssistantSettings(snapshot.kinetic_ai_assistant_settings ?? null),
    kinetic_ai_notifications: notifications,
  };
  const byteLength = encoder.encode(JSON.stringify(normalized)).byteLength;
  if (byteLength > MAX_BACKUP_PLAINTEXT_BYTES) fail("Workspace data exceeds the 2 MB encrypted-backup limit.");
  return normalized;
}

function encodeBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function decodeBase64(value, expectedLength) {
  if (typeof value !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    fail("Encrypted backup file has invalid encoding.");
  }
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  if (expectedLength && bytes.length !== expectedLength) fail("Encrypted backup file is incomplete.");
  return bytes;
}

async function deriveBackupKey(passphrase, salt, cryptoApi) {
  const material = await cryptoApi.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return cryptoApi.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: BACKUP_KDF_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptWorkspaceBackup(snapshot, passphrase, cryptoApi = globalThis.crypto) {
  if (typeof passphrase !== "string" || passphrase.length < 12 || passphrase.length > 128) {
    fail("Use a backup passphrase between 12 and 128 characters.");
  }
  if (!cryptoApi?.subtle || typeof cryptoApi.getRandomValues !== "function") fail("Secure encryption is unavailable in this browser.");
  const data = normalizeBackupSnapshot(snapshot);
  const salt = cryptoApi.getRandomValues(new Uint8Array(16));
  const iv = cryptoApi.getRandomValues(new Uint8Array(12));
  const key = await deriveBackupKey(passphrase, salt, cryptoApi);
  const plaintext = encoder.encode(JSON.stringify({
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  }));
  if (plaintext.byteLength > MAX_BACKUP_PLAINTEXT_BYTES) fail("Workspace data exceeds the 2 MB encrypted-backup limit.");
  const ciphertext = await cryptoApi.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return JSON.stringify({
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: BACKUP_KDF_ITERATIONS, salt: encodeBase64(salt) },
    cipher: { name: "AES-GCM", iv: encodeBase64(iv) },
    ciphertext: encodeBase64(new Uint8Array(ciphertext)),
  });
}

export async function decryptWorkspaceBackup(fileText, passphrase, cryptoApi = globalThis.crypto) {
  if (typeof fileText !== "string" || encoder.encode(fileText).byteLength > MAX_BACKUP_FILE_BYTES) fail("Backup file is larger than 3 MB.");
  if (typeof passphrase !== "string" || passphrase.length < 12 || passphrase.length > 128) fail("Use the same backup passphrase (12–128 characters).");
  if (!cryptoApi?.subtle) fail("Secure decryption is unavailable in this browser.");

  let envelope;
  try {
    envelope = JSON.parse(fileText);
  } catch {
    fail("This is not a valid encrypted KineticAI backup file.");
  }
  if (!envelope || envelope.format !== ENCRYPTED_BACKUP_FORMAT || envelope.version !== ENCRYPTED_BACKUP_VERSION) {
    fail("This backup format is not supported.");
  }
  if (
    envelope.kdf?.name !== "PBKDF2" || envelope.kdf?.hash !== "SHA-256" || envelope.kdf?.iterations !== BACKUP_KDF_ITERATIONS ||
    envelope.cipher?.name !== "AES-GCM"
  ) fail("Encrypted backup settings are invalid.");

  const salt = decodeBase64(envelope.kdf.salt, 16);
  const iv = decodeBase64(envelope.cipher.iv, 12);
  const ciphertext = decodeBase64(envelope.ciphertext);
  if (ciphertext.length < 16 || ciphertext.length > MAX_BACKUP_PLAINTEXT_BYTES + 16) fail("Encrypted backup payload is invalid.");
  const key = await deriveBackupKey(passphrase, salt, cryptoApi);

  let plaintext;
  try {
    plaintext = await cryptoApi.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  } catch {
    fail("Could not decrypt this backup. Check the passphrase and file.");
  }

  let payload;
  try {
    payload = JSON.parse(decoder.decode(plaintext));
  } catch {
    fail("Decrypted backup data is damaged.");
  }
  if (!payload || payload.format !== ENCRYPTED_BACKUP_FORMAT || payload.version !== ENCRYPTED_BACKUP_VERSION) {
    fail("Decrypted backup format is invalid.");
  }
  return normalizeBackupSnapshot(payload.data);
}

export function applyBackupSnapshot(storage, snapshot) {
  const normalized = normalizeBackupSnapshot(snapshot);
  let previous;
  try {
    previous = Object.fromEntries(BACKUP_STORAGE_KEYS.map((key) => [key, storage.getItem(key)]));
  } catch {
    return false;
  }
  try {
    for (const key of BACKUP_STORAGE_KEYS) {
      const value = normalized[key];
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    }
    return true;
  } catch {
    for (const key of BACKUP_STORAGE_KEYS) {
      try {
        if (previous[key] === null) storage.removeItem(key);
        else storage.setItem(key, previous[key]);
      } catch {
        // Best-effort rollback if the browser blocks storage writes mid-restore.
      }
    }
    return false;
  }
}
