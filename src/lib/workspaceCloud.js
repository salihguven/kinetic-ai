import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

export const WORKSPACE_CHANGED_EVENT = "kinetic-workspace-changed";
export const WORKSPACE_REPLACED_EVENT = "kinetic-workspace-replaced";
const MAX_WORKSPACE_BYTES = 800_000;

const safeJson = (key, fallback) => {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const lightChats = (chats) => (Array.isArray(chats) ? chats : []).map((chat) => ({
  ...chat,
  messages: (chat.messages || []).map((message) => ({
    role: message.role,
    content: message.content,
    providerName: message.providerName,
    attachmentNames: message.attachmentNames,
    sources: message.sources,
  })),
}));

export function createWorkspaceSnapshot({ chats, projects, activeProjectId, preferences }) {
  return {
    schemaVersion: 1,
    chats: lightChats(chats),
    projects: Array.isArray(projects) ? projects : [],
    activeProjectId: typeof activeProjectId === "string" ? activeProjectId : "default",
    notes: safeJson("kinetic_ai_notes", []),
    tasks: safeJson("kinetic_ai_tasks", []),
    preferences,
  };
}

export async function loadCloudWorkspace(db, uid) {
  const snapshot = await getDoc(doc(db, "users", uid, "workspace", "state"));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return data?.schemaVersion === 1 && data.payload && typeof data.payload === "object"
    ? data.payload
    : null;
}

export async function saveCloudWorkspace(db, uid, payload) {
  const serialized = JSON.stringify(payload);
  if (new TextEncoder().encode(serialized).byteLength > MAX_WORKSPACE_BYTES) {
    throw new Error("Çalışma alanı bulut kaydı için fazla büyük. Eski sohbetleri silip yeniden deneyin.");
  }
  await setDoc(doc(db, "users", uid, "workspace", "state"), {
    schemaVersion: 1,
    payload,
    updatedAt: serverTimestamp(),
  });
}

export function applyCloudWorkspace(workspace) {
  if (!workspace || typeof window === "undefined") return;
  const write = (key, value) => window.localStorage.setItem(key, JSON.stringify(value));
  write("kinetic_ai_chats", lightChats(workspace.chats));
  write("kinetic_ai_projects", Array.isArray(workspace.projects) ? workspace.projects : []);
  window.localStorage.setItem("kinetic_ai_active_project", workspace.activeProjectId || "default");
  write("kinetic_ai_notes", Array.isArray(workspace.notes) ? workspace.notes : []);
  write("kinetic_ai_tasks", Array.isArray(workspace.tasks) ? workspace.tasks : []);
  if (workspace.preferences && typeof workspace.preferences === "object") {
    const { lang, theme, reasoningLevel, assistantSettings, notifications } = workspace.preferences;
    if (lang === "tr" || lang === "en") window.localStorage.setItem("kinetic_ai_lang", lang);
    if (theme === "dark" || theme === "light") window.localStorage.setItem("kinetic_ai_theme", theme);
    if (typeof reasoningLevel === "string") window.localStorage.setItem("kinetic_ai_reasoning_level", reasoningLevel);
    if (assistantSettings && typeof assistantSettings === "object") window.localStorage.setItem("kinetic_ai_assistant_settings", JSON.stringify(assistantSettings));
    if (notifications === "on" || notifications === "off") window.localStorage.setItem("kinetic_ai_notifications", notifications);
  }
  window.dispatchEvent(new Event(WORKSPACE_REPLACED_EVENT));
}

export function notifyWorkspaceChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(WORKSPACE_CHANGED_EVENT));
}
