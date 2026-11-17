"use client";

import { useEffect, useState } from "react";
import { FolderKanban, FolderPlus, Pencil, Trash2, X, Check, Loader2 } from "@/components/KineticIcons";
import ConfirmModal from "@/components/ConfirmModal";
import { DEFAULT_PROJECT_ID, MAX_PROJECTS, MAX_PROJECT_NAME_LENGTH, normalizeProjectName } from "@/lib/workspaceProjects";

export default function ProjectManagerModal({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  chatCounts,
  lang = "tr",
  darkMode,
  onCreate,
  onRename,
  onDelete,
  onSelect,
}) {
  const isEn = lang === "en";
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !pendingDelete) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose, pendingDelete]);

  if (!isOpen) return null;

  const surface = darkMode ? "border-zinc-800 bg-zinc-900 text-zinc-100" : "border-zinc-200 bg-white text-zinc-900";
  const field = darkMode ? "border-zinc-700 bg-zinc-950" : "border-zinc-300 bg-zinc-50";
  const projectLabel = (project) => project.id === DEFAULT_PROJECT_ID
    ? (isEn ? "General" : "Genel")
    : project.name;

  const createProject = async (event) => {
    event.preventDefault();
    const name = normalizeProjectName(newName);
    if (!name) {
      setError(isEn ? "Enter a project name." : "Bir proje adı gir.");
      return;
    }
    if (projects.length >= MAX_PROJECTS) {
      setError(isEn ? `You can create up to ${MAX_PROJECTS - 1} named projects.` : `En fazla ${MAX_PROJECTS - 1} isimli proje oluşturabilirsin.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await onCreate(name);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setNewName("");
    } catch {
      setError(isEn ? "The project could not be saved. Try again." : "Proje kaydedilemedi. Yeniden dene.");
    } finally {
      setSaving(false);
    }
  };

  const saveRename = async (projectId) => {
    const name = normalizeProjectName(editingName);
    if (!name) {
      setError(isEn ? "Enter a project name." : "Bir proje adı gir.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await onRename(projectId, name);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setEditingId("");
      setEditingName("");
    } catch {
      setError(isEn ? "The project name could not be saved. Try again." : "Proje adı kaydedilemedi. Yeniden dene.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="project-manager-title" className={`flex max-h-[min(90dvh,42rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${surface}`}>
          <header className={`flex shrink-0 items-start justify-between gap-3 border-b p-4 sm:p-5 ${darkMode ? "border-zinc-800" : "border-zinc-200"}`}>
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400"><FolderKanban className="h-5 w-5" /></span>
              <div>
                <h2 id="project-manager-title" className="text-base font-semibold">{isEn ? "Projects" : "Projeler"}</h2>
                <p className="mt-1 text-xs leading-relaxed opacity-60">{isEn ? "Keep chats, notes and tasks together. Your projects stay in this browser." : "Sohbet, not ve görevlerini birlikte düzenle. Projelerin bu tarayıcıda kalır."}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl opacity-60 hover:bg-zinc-500/10 hover:opacity-100" aria-label={isEn ? "Close" : "Kapat"}><X className="h-5 w-5" /></button>
          </header>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
            <form onSubmit={createProject} className="flex gap-2">
              <input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={MAX_PROJECT_NAME_LENGTH} placeholder={isEn ? "New project name" : "Yeni proje adı"} className={`min-h-12 min-w-0 flex-1 rounded-xl border px-3 text-sm outline-none focus:border-emerald-500 ${field}`} aria-label={isEn ? "New project name" : "Yeni proje adı"} />
              <button type="submit" disabled={saving || projects.length >= MAX_PROJECTS} className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-emerald-500 px-3 text-xs font-semibold text-zinc-950 disabled:opacity-50 sm:px-4"><FolderPlus className="h-4 w-4" /><span className="hidden sm:inline">{isEn ? "Create" : "Oluştur"}</span></button>
            </form>

            {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">{error}</p>}

            <div className="space-y-2">
              {projects.map((project) => {
                const isDefault = project.id === DEFAULT_PROJECT_ID;
                const isActive = project.id === activeProjectId;
                return (
                  <article key={project.id} className={`flex items-center gap-2 rounded-xl border p-2.5 ${isActive ? "border-emerald-500/40 bg-emerald-500/[0.06]" : darkMode ? "border-zinc-800" : "border-zinc-200"}`}>
                    {editingId === project.id ? (
                      <input autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} maxLength={MAX_PROJECT_NAME_LENGTH} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); saveRename(project.id); } if (event.key === "Escape") setEditingId(""); }} className={`min-h-11 min-w-0 flex-1 rounded-lg border px-2.5 text-sm outline-none focus:border-emerald-500 ${field}`} aria-label={isEn ? "Project name" : "Proje adı"} />
                    ) : (
                      <button type="button" onClick={() => { onSelect(project.id); onClose(); }} className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1 text-left">
                        <FolderKanban className={`h-4 w-4 shrink-0 ${isActive ? "text-emerald-400" : "opacity-55"}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{projectLabel(project)}</span>
                          <span className="mt-0.5 block text-[10px] opacity-55">{isEn ? `${chatCounts?.[project.id] || 0} chats` : `${chatCounts?.[project.id] || 0} sohbet`}</span>
                        </span>
                        {isActive && <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-semibold text-emerald-400">{isEn ? "ACTIVE" : "ETKİN"}</span>}
                      </button>
                    )}
                    {editingId === project.id ? (
                      <>
                        <button type="button" disabled={saving} onClick={() => saveRename(project.id)} className="flex h-10 w-10 items-center justify-center rounded-lg text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50" aria-label={isEn ? "Save project name" : "Proje adını kaydet"}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</button>
                        <button type="button" onClick={() => setEditingId("")} className="flex h-10 w-10 items-center justify-center rounded-lg opacity-55 hover:bg-zinc-500/10" aria-label={isEn ? "Cancel editing" : "Düzenlemeyi iptal et"}><X className="h-4 w-4" /></button>
                      </>
                    ) : !isDefault && (
                      <>
                        <button type="button" onClick={() => { setError(""); setEditingId(project.id); setEditingName(project.name); }} className="flex h-10 w-10 items-center justify-center rounded-lg opacity-55 hover:bg-emerald-500/10 hover:text-emerald-400" aria-label={isEn ? `Rename ${project.name}` : `${project.name} adını değiştir`}><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => { setError(""); setPendingDelete(project); }} className="flex h-10 w-10 items-center justify-center rounded-lg opacity-55 hover:bg-red-500/10 hover:text-red-400" aria-label={isEn ? `Delete ${project.name}` : `${project.name} projesini sil`}><Trash2 className="h-4 w-4" /></button>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
            <p className="text-[10px] leading-relaxed opacity-50">{isEn ? "Deleting a project moves its chats, notes and tasks into General; it does not erase them." : "Proje silindiğinde sohbetleri, notları ve görevleri Genel'e taşınır; içerikler silinmez."}</p>
          </div>

          <footer className={`flex shrink-0 justify-end border-t p-3 sm:p-4 ${darkMode ? "border-zinc-800" : "border-zinc-200"}`}>
            <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-zinc-700/40 px-4 text-xs font-medium">{isEn ? "Done" : "Bitti"}</button>
          </footer>
        </section>
      </div>
      <ConfirmModal
        zIndexClass="z-[80]"
        isOpen={Boolean(pendingDelete)}
        title={isEn ? "Delete project?" : "Proje silinsin mi?"}
        description={pendingDelete ? (isEn ? `Chats, notes and tasks in “${projectLabel(pendingDelete)}” will be moved into General.` : `“${projectLabel(pendingDelete)}” içindeki sohbet, not ve görevler Genel'e taşınacak.`) : ""}
        confirmText={isEn ? "Move and delete" : "Taşı ve sil"}
        cancelText={isEn ? "Cancel" : "Vazgeç"}
        darkMode={darkMode}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            try {
              const result = onDelete(pendingDelete.id);
              if (result?.error) setError(result.error);
            } catch {
              setError(isEn ? "Project data could not be moved. Try again." : "Proje verileri taşınamadı. Yeniden dene.");
            }
          }
          setPendingDelete(null);
        }}
      />
    </>
  );
}
