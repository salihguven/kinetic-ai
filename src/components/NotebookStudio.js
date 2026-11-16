// src/components/NotebookStudio.js
"use client";

import { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  FileText,
  Sparkles,
  Send,
  Bot,
  Loader2,
  Check,
} from "lucide-react";
import MarkdownMessage from "./MarkdownMessage";
import { MessageSkeleton } from "./SkeletonLoader";

export default function NotebookStudio({ activeProvider, onAskAI, darkMode }) {
  const [sources, setSources] = useState([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sourcesLoaded, setSourcesLoaded] = useState(false);

  const fileRef = useRef(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem("kinetic_ai_notes");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setSources(parsed.filter((item) => item && typeof item.id === "string" && typeof item.title === "string" && typeof item.content === "string"));
          }
        }
      } catch {
        // Keep an empty workspace when stored data is malformed or unavailable.
      } finally {
        setSourcesLoaded(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!sourcesLoaded) return;
    try {
      localStorage.setItem("kinetic_ai_notes", JSON.stringify(sources));
    } catch {
      // ignore
    }
  }, [sources, sourcesLoaded]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      if (f.size > 2 * 1024 * 1024) continue;
      const content = await f.text();
      setSources((prev) => [
        {
          id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
          title: f.name,
          content: content.slice(0, 20000),
          active: true,
        },
        ...prev,
      ]);
    }
    e.target.value = "";
  };

  const handleAddTextSource = (e) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteText.trim()) return;
    setSources((prev) => [
      {
        id: Date.now().toString(),
        title: noteTitle.trim(),
        content: noteText.trim().slice(0, 20000),
        active: true,
      },
      ...prev,
    ]);
    setNoteTitle("");
    setNoteText("");
    setShowAddForm(false);
  };

  const activeSources = sources.filter((s) => s.active);

  const askNotebook = async (promptText, label = null) => {
    if (!activeProvider) {
      setError("Önce sol menüden bir AI bağlantısı seçmelisiniz.");
      return;
    }
    if (activeSources.length === 0) {
      setError("Lütfen soldan en az 1 kaynak ekleyin veya seçin.");
      return;
    }

    setError("");
    const userDisplay = label || promptText;
    setMessages((prev) => [...prev, { role: "user", content: userDisplay }]);
    setLoading(true);

    const sourcesContext = activeSources
      .map((s, i) => `### KAYNAK ${i + 1}: ${s.title}\n${s.content}`)
      .join("\n\n---\n\n")
      .slice(0, 28000);

    const systemPrompt =
      "Sen Kinetic Notes (NotebookLM benzeri kaynak analiz asistanı) yapay zekasısın. SADECE aşağıda verilen kaynaklara dayanarak Türkçe yanıt ver. Kaynaklarda olmayan bilgileri uydurma; eksikse 'Verilen kaynaklarda bu bilgi bulunmuyor' de. Mümkün olduğunca hangi kaynaktan aldığını [Kaynak Adı] şeklinde belirt.";

    const fullUserPrompt = `KULLANILACAK KAYNAKLAR:\n\n${sourcesContext}\n\n---\n\nGÖREV / SORU: ${promptText}`;

    try {
      const res = await onAskAI({
        messages: [{ role: "user", content: fullUserPrompt }],
        systemPrompt,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply,
          providerName: `${res.usedProvider} · ${activeSources.length} Kaynak`,
        },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuestion = () => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setQuestion("");
    askNotebook(q);
  };

  const boxClass = darkMode
    ? "border-zinc-800/80 bg-zinc-900/40"
    : "border-zinc-200 bg-white";

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4 md:flex-row animate-fadeIn">
      {/* SOL: KAYNAK LİSTESİ */}
      <div className={`flex max-h-64 w-full flex-col rounded-2xl border p-4 md:max-h-full md:w-80 ${boxClass}`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold">
              Kaynaklar <span className="opacity-50">({activeSources.length}/{sources.length})</span>
            </h2>
          </div>
          <div className="flex gap-1.5">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".txt,.md,.csv,.json,.js,.py,.html"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className={`min-h-[36px] rounded-lg border px-2.5 text-[11px] font-medium transition ${
                darkMode ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"
              }`}
            >
              Dosya
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={`flex min-h-[36px] items-center gap-1 rounded-lg px-2.5 text-[11px] font-medium transition ${
                darkMode
                  ? "bg-white text-zinc-950 hover:bg-zinc-200"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Metin
            </button>
          </div>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleAddTextSource}
            className={`mb-3 space-y-2 rounded-xl border p-3 animate-scaleIn ${
              darkMode ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-zinc-50"
            }`}
          >
            <input
              type="text"
              placeholder="Kaynak Başlığı (Örn: Biyoloji Notu)"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-700/50 bg-transparent px-2.5 py-2 text-xs outline-none"
            />
            <textarea
              rows={3}
              placeholder="Not veya makale metnini yapıştır..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full resize-none rounded-lg border border-zinc-700/50 bg-transparent p-2 text-xs outline-none"
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="min-h-[34px] rounded-lg px-2.5 text-[11px] opacity-60 hover:opacity-100"
              >
                İptal
              </button>
              <button
                type="submit"
                className="min-h-[34px] rounded-lg bg-emerald-500 px-3 text-[11px] font-semibold text-zinc-950"
              >
                Kaynağı Ekle
              </button>
            </div>
          </form>
        )}

        <div className="flex-1 divide-y divide-zinc-800/40 overflow-y-auto pr-1">
          {sources.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-700/50 p-5 text-center text-xs opacity-60">
              Henüz kaynak yok. Metin veya dosya ekleyip sadece kaynaklara dayalı analiz yap.
            </div>
          ) : (
            sources.map((s) => (
              <div
                key={s.id}
                className="group flex items-center justify-between gap-2 py-2.5 text-xs transition"
              >
                <button
                  onClick={() =>
                    setSources((prev) =>
                      prev.map((item) =>
                        item.id === s.id ? { ...item, active: !item.active } : item
                      )
                    )
                  }
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                      s.active
                        ? "border-emerald-500 bg-emerald-500 text-zinc-950"
                        : "border-zinc-600 opacity-50"
                    }`}
                  >
                    {s.active && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-medium">
                      <FileText className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      <span className={`truncate ${!s.active ? "opacity-50" : ""}`}>
                        {s.title}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] opacity-45">
                      {s.content.length.toLocaleString("tr-TR")} karakter
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => setSources((prev) => prev.filter((item) => item.id !== s.id))}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg opacity-35 transition hover:bg-red-500/10 hover:text-red-400 hover:opacity-100"
                  aria-label="Kaynağı Sil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SAĞ: KAYNAK STÜDYOSU */}
      <div className={`flex flex-1 flex-col overflow-hidden rounded-2xl border p-4 ${boxClass}`}>
        <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-zinc-800/40 pb-3">
          <span className="flex items-center gap-1.5 text-xs font-medium opacity-60">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            Hızlı Araçlar:
          </span>
          {[
            {
              label: "Özet Çıkar",
              display: "📌 Kaynak Özeti Çıkar",
              prompt: "Tüm aktif kaynakların kapsamlı, maddeler halinde özetini çıkar.",
            },
            {
              label: "Çalışma Rehberi",
              display: "📚 Çalışma Rehberi Oluştur",
              prompt:
                "Bu kaynaklardan bir çalışma rehberi oluştur: Ana kavramları, tanımları ve kritik noktaları listele.",
            },
            {
              label: "5 Soruluk Test",
              display: "📝 5 Soruluk Test (Quiz)",
              prompt:
                "Bu kaynaklara dayanarak 5 adet çoktan seçmeli test sorusu hazırla ve en alta kısa cevap anahtarını ekle.",
            },
            {
              label: "Podcast Senaryosu",
              display: "🎙️ Podcast Senaryosu",
              prompt:
                "Bu kaynaklardaki konuyu iki sunucunun birbirine anlattığı akıcı bir podcast diyalog senaryosuna dönüştür.",
            },
          ].map((tool) => (
            <button
              key={tool.label}
              disabled={loading}
              onClick={() => askNotebook(tool.prompt, tool.display)}
              className={`min-h-[34px] rounded-lg border px-3 text-[11px] font-medium transition disabled:opacity-40 ${
                darkMode
                  ? "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800"
                  : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100"
              }`}
            >
              {tool.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto py-2 pr-1">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center opacity-55">
              <BookOpen className="mb-2.5 h-8 w-8 text-emerald-400" />
              <p className="text-sm font-semibold">Kinetic Notes (Kaynak Stüdyosu)</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed">
                Soldan kaynaklarını seç, yukarıdaki araçlardan birine tıkla veya
                kaynakların hakkında soru sor.
              </p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`flex animate-fadeIn ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.role === "user" ? (
                  <div
                    className={`max-w-lg rounded-2xl px-4 py-2.5 text-xs font-medium ${
                      darkMode ? "bg-zinc-800 text-white" : "bg-zinc-900 text-white"
                    }`}
                  >
                    {m.content}
                  </div>
                ) : (
                  <div className="flex max-w-2xl gap-3">
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                        darkMode ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-zinc-50"
                      }`}
                    >
                      <Bot className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      {m.providerName && (
                        <div className="text-[11px] opacity-50">{m.providerName}</div>
                      )}
                      <MarkdownMessage content={m.content} darkMode={darkMode} />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {loading && <MessageSkeleton darkMode={darkMode} />}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        <div
          className={`mt-3 flex items-center gap-2 rounded-xl border p-1.5 ${
            darkMode ? "border-zinc-800 bg-zinc-950/80" : "border-zinc-300 bg-zinc-50"
          }`}
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendQuestion()}
            placeholder="Seçili kaynaklar hakkında bir soru sor..."
            className="min-h-[40px] flex-1 bg-transparent px-2.5 text-xs outline-none"
          />
          <button
            onClick={handleSendQuestion}
            disabled={loading || !question.trim()}
            className={`flex h-10 w-10 items-center justify-center rounded-lg disabled:opacity-30 ${
              darkMode ? "bg-white text-zinc-950" : "bg-zinc-900 text-white"
            }`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
