// src/components/TaskManager.js
"use client";

import { useState, useEffect, useRef } from "react";
import CustomSelect from "./CustomSelect";
import {
  Check,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Flag,
  ListTodo,
  FolderInput,
} from "lucide-react";
import ConfirmModal from "./ConfirmModal";
import { TRANSLATIONS } from "@/lib/i18n";
import { formatFriendlyError } from "@/lib/uxHelpers";

export default function TaskManager({ activeProjectId = "default", projects = [], activeProvider, onAskAI, darkMode, lang = "tr", reasoningLevel = "auto" }) {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [goalInput, setGoalInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [movingTaskId, setMovingTaskId] = useState("");
  const goalInputRef = useRef(null);
  const taskInputRef = useRef(null);
  const aiAbortRef = useRef(null);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.tr;
  const projectTasks = tasks.filter((task) => task.projectId === activeProjectId);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem("kinetic_ai_tasks");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setTasks(parsed.filter((task) => task && typeof task.id === "string" && typeof task.title === "string"));
          }
        }
      } catch {
        // Keep an empty workspace when stored data is malformed or unavailable.
      } finally {
        setTasksLoaded(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!tasksLoaded) return;
    try {
      localStorage.setItem("kinetic_ai_tasks", JSON.stringify(tasks));
    } catch {
      // ignore
    }
  }, [tasks, tasksLoaded]);

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setTasks((prev) => [
      {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
        title: newTitle.trim(),
        priority,
        done: false,
        projectId: activeProjectId,
      },
      ...prev,
    ]);
    setNewTitle("");
  };

  const handleGenerateAITasks = async (e) => {
    e.preventDefault();
    if (!goalInput.trim() || aiLoading) return;
    if (!activeProvider) {
      setError("Önce sol menüden bir AI bağlantısı seçin.");
      return;
    }

    setError("");
    setAiLoading(true);
    const controller = new AbortController();
    aiAbortRef.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 60_000);

    try {
      const res = await onAskAI({
        signal: controller.signal,
        useWebSearchOverride: false,
        messages: [
          {
            role: "user",
            content: lang === "en"
              ? `Create 5 to 7 clear, actionable subtasks for this goal. Return ONLY a JSON string array with no explanation.\n\nGoal: "${goalInput.trim()}"\nExample: ["Task 1", "Task 2"]`
              : `Şu hedefi gerçekleştirmek için 5 ila 7 adet net, uygulanabilir alt görev oluştur ve SADECE bir JSON metin dizisi (string array) olarak döndür. Başka açıklama yazma.\n\nHedef: "${goalInput.trim()}"\nÖrnek format: ["Görev 1", "Görev 2"]`,
          },
        ],
        systemPrompt: lang === "en"
          ? "You are a productivity and project planning assistant. Return only a JSON array."
          : "Sen üretkenlik ve proje planlama uzmanısın. Sadece JSON array döndür.",
      });

      const raw = res.reply.trim();
      let parsedList = [];
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          parsedList = JSON.parse(jsonMatch[0]);
        } catch {
          parsedList = [];
        }
      }

      if (!Array.isArray(parsedList) || parsedList.length === 0) {
        parsedList = raw
          .split("\n")
          .map((l) => l.replace(/^[-*\d.)\s"]+/, "").replace(/"?,?$/, "").trim())
          .filter((l) => l.length > 2)
          .slice(0, 7);
      }

      const generated = parsedList.map((t, idx) => ({
        id: `${Date.now()}-${idx}`,
        title: String(t),
        priority: "medium",
        done: false,
        projectId: activeProjectId,
      }));

      if (generated.length === 0) {
        throw new Error(lang === "en"
          ? "The model did not return a usable task list. Try again or add tasks manually."
          : "Model kullanılabilir bir görev listesi döndürmedi. Tekrar deneyin veya görevleri kendiniz ekleyin.");
      }

      setTasks((prev) => [...generated, ...prev]);
      setGoalInput("");
    } catch (err) {
      setError(err.name === "AbortError"
        ? timedOut
          ? lang === "en"
            ? "The request took too long and was stopped. Try again or add tasks manually."
            : "İstek 60 saniyede yanıtlanmadığı için durduruldu. Tekrar deneyebilir veya görevleri kendiniz ekleyebilirsiniz."
          : lang === "en" ? "Request canceled." : "İstek iptal edildi."
        : formatFriendlyError(err.message, lang));
    } finally {
      window.clearTimeout(timeout);
      aiAbortRef.current = null;
      setAiLoading(false);
    }
  };

  const filteredTasks = projectTasks.filter((t) => {
    if (filter === "active") return !t.done;
    if (filter === "done") return t.done;
    return true;
  });

  const completedCount = projectTasks.filter((t) => t.done).length;
  const estimatedPlanInputTokens = Math.ceil((goalInput.length + (lang === "en" ? 190 : 210)) / 4);
  const optClass = darkMode ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-900";
  const boxClass = darkMode
    ? "border-zinc-800/80 bg-zinc-900/40"
    : "border-zinc-200 bg-white";

  return (
    <>
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-5 p-4 md:p-6 animate-fadeIn">
      {/* AI PLANLAYICI */}
      <div className={`rounded-2xl border p-4 ${boxClass}`}>
        <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span>{t.taskPlannerTitle}</span>
        </div>
        <form onSubmit={handleGenerateAITasks} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            ref={goalInputRef}
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            placeholder={t.taskGoalPlaceholder}
            className="min-h-12 flex-1 rounded-xl border border-zinc-700/50 bg-transparent px-3 text-xs outline-none"
          />
          <button
            type={aiLoading ? "button" : "submit"}
            onClick={aiLoading ? () => aiAbortRef.current?.abort() : undefined}
            disabled={!aiLoading && !goalInput.trim()}
            className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-semibold disabled:opacity-40 ${
              darkMode
                ? "bg-white text-zinc-950 hover:bg-zinc-200"
                : "bg-zinc-900 text-white hover:bg-zinc-800"
            }`}
          >
            {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {aiLoading ? t.cancel : t.createPlan}
          </button>
        </form>
        <p className="mt-2 text-[10px] leading-relaxed opacity-55">
          {lang === "en"
            ? `Input estimate ≈ ${estimatedPlanInputTokens.toLocaleString("en-US")} tokens; the model also returns 5–7 task items. ${reasoningLevel === "high" ? "High reasoning may add provider tokens." : "Actual use depends on the model and is shown in the usage counter."}`
            : `Giriş tahmini ≈ ${estimatedPlanInputTokens.toLocaleString("tr-TR")} token; model ayrıca 5–7 görev maddesi üretir. ${reasoningLevel === "high" ? "Yüksek düşünme ek sağlayıcı tokenı kullanabilir." : "Gerçek kullanım modele bağlıdır ve sayaçta görünür."}`}
        </p>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      {/* GÖREV LİSTESİ */}
      <div className={`flex flex-1 flex-col rounded-2xl border p-5 ${boxClass}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">{t.taskManagerTitle}</h2>
            <p className="text-xs opacity-55">
              {completedCount} / {projectTasks.length} {t.tasksCompleted}
            </p>
          </div>

          <div className="flex gap-1 rounded-xl border border-zinc-700/40 p-1 text-[11px]">
            {[
              { id: "all", label: t.filterAll },
              { id: "active", label: t.filterActive },
              { id: "done", label: t.filterDone },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`min-h-12 rounded-lg px-3 transition ${
                  filter === tab.id
                    ? darkMode
                      ? "bg-zinc-800 text-white"
                      : "bg-zinc-900 text-white"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleAddTask} className="mb-4 flex flex-wrap gap-2">
          <input
            type="text"
            ref={taskInputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t.taskTitlePlaceholder}
            className="min-h-12 min-w-[180px] flex-1 rounded-xl border border-zinc-700/50 bg-transparent px-3 text-xs outline-none"
          />
          <div className="w-40">
         <CustomSelect
           value={priority}
           onChange={(val) => setPriority(val)}
           darkMode={darkMode}
           searchable={false}
           options={[
             { value: "low", label: `${t.priorityLow} ${lang === "en" ? "priority" : "öncelik"}` },
             { value: "medium", label: `${t.priorityMedium} ${lang === "en" ? "priority" : "öncelik"}` },
             { value: "high", label: `${t.priorityHigh} ${lang === "en" ? "priority" : "öncelik"}` },
           ]}
         />
       </div>
          <button
            type="submit"
            className="flex min-h-12 items-center gap-1 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.addTask}
          </button>
        </form>

        <div className="flex-1 divide-y divide-zinc-800/40 overflow-y-auto pr-1">
          {filteredTasks.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-4 py-10 text-center">
              <ListTodo className="mb-3 h-8 w-8 text-emerald-400" aria-hidden="true" />
              <h3 className="text-sm font-semibold">
                {projectTasks.length === 0 ? t.noTasksTitle : t.noFilteredTasks}
              </h3>
              <p className="mt-1 max-w-sm text-xs leading-relaxed opacity-65">
                {projectTasks.length === 0 ? t.noTasksDesc : t.noFilteredTasks}
              </p>
              {projectTasks.length === 0 ? (
                <button type="button" onClick={() => taskInputRef.current?.focus()} className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-zinc-950 hover:bg-emerald-400">
                  <Plus className="h-4 w-4" />{t.addTask}
                </button>
              ) : (
                <button type="button" onClick={() => setFilter("all")} className="mt-3 inline-flex min-h-12 items-center rounded-xl px-4 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10">
                  {t.showAllTasks}
                </button>
              )}
            </div>
          ) : (
            filteredTasks.map((t) => (
              <div
                key={t.id}
                className={`group py-3 text-xs transition ${
                  t.done ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() =>
                    setTasks((prev) =>
                      prev.map((item) =>
                        item.id === t.id ? { ...item, done: !item.done } : item
                      )
                    )
                  }
                  className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-left"
                  aria-pressed={t.done}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                      t.done
                        ? "border-emerald-500 bg-emerald-500 text-zinc-950"
                        : "border-zinc-600 opacity-60"
                    }`}
                  >
                    {t.done && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                  </span>
                  <span className={`truncate ${t.done ? "line-through" : "font-medium"}`}>
                    {t.title}
                  </span>
                </button>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium ${
                      t.priority === "high"
                        ? "bg-red-500/15 text-red-400"
                        : t.priority === "medium"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-zinc-500/15 text-zinc-400"
                    }`}
                  >
                    <Flag className="h-2.5 w-2.5" />
                    {t.priority === "high"
                      ? t.priorityHigh
                      : t.priority === "medium"
                      ? t.priorityMedium
                      : t.priorityLow}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMovingTaskId((current) => current === t.id ? "" : t.id)}
                    className="touch-target flex shrink-0 items-center justify-center rounded-lg opacity-60 transition hover:bg-emerald-500/10 hover:text-emerald-400 hover:opacity-100"
                    aria-label={lang === "en" ? `Move ${t.title} to another project` : `${t.title} görevini başka projeye taşı`}
                    title={lang === "en" ? "Move to project" : "Projeye taşı"}
                  >
                    <FolderInput className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(t)}
                    className="touch-target flex shrink-0 items-center justify-center rounded-lg opacity-60 transition hover:bg-red-500/10 hover:text-red-400 hover:opacity-100"
                    aria-label={`${t.deleteTaskTitle} ${t.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {movingTaskId === t.id && (
                  <div className="mt-1 flex flex-wrap gap-1 border-t border-zinc-500/15 pt-1.5">
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        disabled={t.projectId === project.id}
                        onClick={() => {
                          setTasks((previous) => previous.map((task) => task.id === t.id ? { ...task, projectId: project.id } : task));
                          setMovingTaskId("");
                        }}
                        className="min-h-9 rounded-lg px-2 text-[10px] text-emerald-400 hover:bg-emerald-500/10 disabled:cursor-default disabled:text-zinc-500"
                      >
                        {project.id === "default" ? (lang === "en" ? "General" : "Genel") : project.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
    <ConfirmModal
      isOpen={Boolean(pendingDelete)}
      title={t.deleteTaskTitle}
      description={pendingDelete ? `${pendingDelete.title} — ${t.deleteTaskDesc}` : t.deleteTaskDesc}
      confirmText={t.confirm}
      cancelText={t.cancel}
      darkMode={darkMode}
      onCancel={() => setPendingDelete(null)}
      onConfirm={() => {
        if (pendingDelete) setTasks((previous) => previous.filter((item) => item.id !== pendingDelete.id));
        setPendingDelete(null);
      }}
    />
    </>
  );
}
