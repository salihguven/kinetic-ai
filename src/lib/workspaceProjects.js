export const DEFAULT_PROJECT_ID = "default";
export const MAX_PROJECTS = 50;
export const MAX_PROJECT_NAME_LENGTH = 40;

export function normalizeProjectName(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, MAX_PROJECT_NAME_LENGTH) : "";
}

export function normalizeProjects(value) {
  const normalized = [{ id: DEFAULT_PROJECT_ID, name: "", createdAt: 0 }];
  const ids = new Set([DEFAULT_PROJECT_ID]);
  const names = new Set();

  if (!Array.isArray(value)) return normalized;

  for (const project of value) {
    if (normalized.length >= MAX_PROJECTS || !project || typeof project !== "object" || Array.isArray(project)) continue;
    const id = typeof project.id === "string" ? project.id.trim() : "";
    const name = normalizeProjectName(project.name);
    const normalizedName = name.toLocaleLowerCase("en-US");
    if (!id || !/^[a-zA-Z0-9_-]{1,80}$/.test(id) || ids.has(id) || !name || names.has(normalizedName)) continue;

    ids.add(id);
    names.add(normalizedName);
    normalized.push({
      id,
      name,
      createdAt: Number.isFinite(project.createdAt) ? project.createdAt : 0,
      updatedAt: Number.isFinite(project.updatedAt) ? project.updatedAt : undefined,
    });
  }

  return normalized;
}

export function normalizeProjectItems(items, projects) {
  const ids = new Set((Array.isArray(projects) ? projects : []).map((project) => project?.id));
  ids.add(DEFAULT_PROJECT_ID);
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({
      ...item,
      projectId: ids.has(item.projectId) ? item.projectId : DEFAULT_PROJECT_ID,
    }));
}

export function moveProjectItems(items, fromProjectId, toProjectId) {
  if (!Array.isArray(items) || !fromProjectId || !toProjectId || fromProjectId === toProjectId) return items;
  return items.map((item) => item?.projectId === fromProjectId ? { ...item, projectId: toProjectId } : item);
}
