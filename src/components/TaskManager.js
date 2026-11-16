// src/components/TaskManager.js
"use client";

import { useState, useEffect } from "react";
import CustomSelect from "./CustomSelect";
import {
  Check,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Flag,
} from "lucide-react";

export default function TaskManager({ activeProvider, onAskAI, darkMode }) {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [goalInput, setGoalInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [tasksLoaded, setTasksLoaded] = useState(false);

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

    try {
      const res = await onAskAI({
        messages: [
          {
            role: "user",
            content: `Şu hedefi gerçekleştirmek için 5 ila 7 adet net, uygulanabilir alt görev oluştur ve SADECE bir JSON metin dizisi (string array) olarak döndür. Başka açıklama yazma.\n\nHedef: "${goalInput.trim()}"\nÖrnek format: ["Görev 1", "Görev 2"]`,
          },
        ],
        systemPrompt: "Sen üretkenlik ve proje planlama uzmanısın. Sadece JSON array döndür.",
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
      }));

      setTasks((prev) => [...generated, ...prev]);
      setGoalInput("");
    } catch (err) {
      setError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === "active") return !t.done;
    if (filter === "done") return t.done;
    return true;
  });

  const completedCount = tasks.filter((t) => t.done).length;
  const optClass = darkMode ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-900";
  const boxClass = darkMode
    ? "border-zinc-800/80 bg-zinc-900/40"
    : "border-zinc-200 bg-white";

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-5 p-4 md:p-6 animate-fadeIn">
      {/* AI PLANLAYICI */}
      <div className={`rounded-2xl border p-4 ${boxClass}`}>
        <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span>AI ile Hedefi Görevlere Böl</span>
        </div>
        <form onSubmit={handleGenerateAITasks} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            placeholder="Örn: Next.js portföy sitesi yap ve yayınla..."
            className="min-h-[42px] flex-1 rounded-xl border border-zinc-700/50 bg-transparent px-3 text-xs outline-none"
          />
          <button
            type="submit"
            disabled={aiLoading || !goalInput.trim()}
            className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-semibold disabled:opacity-40 ${
              darkMode
                ? "bg-white text-zinc-950 hover:bg-zinc-200"
                : "bg-zinc-900 text-white hover:bg-zinc-800"
            }`}
          >
            {aiLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Plan Oluştur
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      {/* GÖREV LİSTESİ */}
      <div className={`flex flex-1 flex-col rounded-2xl border p-5 ${boxClass}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">Görev Yöneticisi</h2>
            <p className="text-xs opacity-55">
              {completedCount} / {tasks.length} görev tamamlandı
            </p>
          </div>

          <div className="flex gap-1 rounded-xl border border-zinc-700/40 p-1 text-[11px]">
            {[
              { id: "all", label: "Tümü" },
              { id: "active", label: "Yapılacak" },
              { id: "done", label: "Biten" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`min-h-[32px] rounded-lg px-3 transition ${
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
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Yeni görev ekle..."
            className="min-h-[42px] min-w-[180px] flex-1 rounded-xl border border-zinc-700/50 bg-transparent px-3 text-xs outline-none"
          />
          <div className="w-40">
         <CustomSelect
           value={priority}
           onChange={(val) => setPriority(val)}
           darkMode={darkMode}
           searchable={false}
           options={[
             { value: "low", label: "Düşük Öncelik" },
             { value: "medium", label: "Orta Öncelik" },
             { value: "high", label: "Yüksek Öncelik" },
           ]}
         />
       </div>
          <button
            type="submit"
            className="flex min-h-[42px] items-center gap-1 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Ekle
          </button>
        </form>

        <div className="flex-1 divide-y divide-zinc-800/40 overflow-y-auto pr-1">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-xs opacity-55">
              Gösterilecek görev yok. Yukarıdan ekle veya AI ile plan oluştur!
            </div>
          ) : (
            filteredTasks.map((t) => (
              <div
                key={t.id}
                className={`group flex items-center justify-between gap-3 py-3 text-xs transition ${
                  t.done ? "opacity-50" : ""
                }`}
              >
                <button
                  onClick={() =>
                    setTasks((prev) =>
                      prev.map((item) =>
                        item.id === t.id ? { ...item, done: !item.done } : item
                      )
                    )
                  }
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
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
                      ? "Yüksek"
                      : t.priority === "medium"
                      ? "Orta"
                      : "Düşük"}
                  </span>
                  <button
                    onClick={() => setTasks((prev) => prev.filter((item) => item.id !== t.id))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg opacity-35 transition hover:bg-red-500/10 hover:text-red-400 hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
