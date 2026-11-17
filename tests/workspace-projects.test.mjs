import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PROJECT_ID, moveProjectItems, normalizeProjectItems, normalizeProjectName, normalizeProjects } from "../src/lib/workspaceProjects.js";

test("project normalization keeps one default and rejects duplicate or malformed projects", () => {
  const projects = normalizeProjects([
    { id: "work", name: "  Work   Project ", createdAt: 10 },
    { id: "work-2", name: "work project", createdAt: 20 },
    { id: "bad id", name: "Invalid" },
    { id: "default", name: "Imposter" },
  ]);

  assert.equal(projects[0].id, DEFAULT_PROJECT_ID);
  assert.deepEqual(projects.map(({ id, name }) => [id, name]), [
    ["default", ""],
    ["work", "Work Project"],
  ]);
});

test("legacy and unknown project records migrate to General", () => {
  const projects = normalizeProjects([{ id: "school", name: "School" }]);
  const records = normalizeProjectItems([
    { id: "old", title: "Legacy" },
    { id: "known", title: "Known", projectId: "school" },
    { id: "orphan", title: "Orphan", projectId: "removed" },
    null,
  ], projects);

  assert.deepEqual(records.map(({ id, projectId }) => [id, projectId]), [
    ["old", "default"],
    ["known", "school"],
    ["orphan", "default"],
  ]);
});

test("moving project items preserves content and unrelated records", () => {
  const items = [
    { id: "a", projectId: "school", content: "keep" },
    { id: "b", projectId: "default", content: "also keep" },
  ];
  const moved = moveProjectItems(items, "school", "default");
  assert.deepEqual(moved, [
    { id: "a", projectId: "default", content: "keep" },
    items[1],
  ]);
  assert.equal(items[0].projectId, "school");
});

test("project names are trimmed, whitespace-collapsed and length-limited", () => {
  assert.equal(normalizeProjectName("  Science   Notes "), "Science Notes");
  assert.equal(normalizeProjectName("x".repeat(60)).length, 40);
});
