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
  Upload,
  X,
  FolderInput,
} from "lucide-react";
import MarkdownMessage from "./MarkdownMessage";
import { MessageSkeleton } from "./SkeletonLoader";
import ConfirmModal from "./ConfirmModal";
import { TRANSLATIONS } from "@/lib/i18n";
import { isSensitiveSource } from "@/lib/sensitiveContent";
import { formatFriendlyError } from "@/lib/uxHelpers";
import {
  getTextMetrics,
  MAX_NOTE_CONTEXT_CHARACTERS,
  MAX_NOTE_FILE_BYTES,
  MAX_NOTE_SOURCE_CHARACTERS,
  MAX_NOTE_SOURCES,
} from "@/lib/sourceLimits";
import { getReasoningSupport } from "@/lib/reasoning";

export default function NotebookStudio({ activeProjectId = "default", projects = [], activeProvider, onAskAI, darkMode, lang = "tr", reasoningLevel = "auto" }) {
  const [sources, setSources] = useState([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sourcesLoaded, setSourcesLoaded] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [movingSourceId, setMovingSourceId] = useState("");

  const fileRef = useRef(null);
  const requestAbortRef = useRef(null);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.tr;
  const projectSources = sources.filter((source) => source.projectId === activeProjectId);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem("kinetic_ai_notes");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const validSources = parsed.filter((item) =>
              item && typeof item.id === "string" && typeof item.title === "string" &&
              typeof item.content === "string" && item.content.trim() &&
              !isSensitiveSource(item.title, item.content)
            );
            if (validSources.length !== parsed.length) {
              setError(lang === "en"
                ? "Sensitive files or empty sources were removed from this browser. Do not upload credentials, private keys or recovery codes."
                : "Hassas dosyalar veya boş kaynaklar bu tarayıcıdan kaldırıldı. API anahtarı, özel anahtar ya da kurtarma kodu yüklemeyin.");
            }
            setSources(validSources);
          }
        }
      } catch {
        // Keep an empty workspace when stored data is malformed or unavailable.
      } finally {
        setSourcesLoaded(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [lang]);

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
    const existingKeys = new Set(sources.map((source) => `${source.title.toLocaleLowerCase()}\0${source.content}`));
    let pendingSourceCount = sources.length;
    for (const f of files) {
      if (isSensitiveSource(f.name)) {
        setError(lang === "en"
          ? `${f.name} looks like a credential or recovery file, so it was not added.`
          : `${f.name} bir kimlik bilgisi veya kurtarma dosyası gibi göründüğü için eklenmedi.`);
        continue;
      }
      if (f.size > MAX_NOTE_FILE_BYTES) {
        setError(lang === "en" ? `${f.name} is larger than the 256 KB file limit.` : `${f.name} 256 KB dosya sınırını aşıyor.`);
        continue;
      }
      if (pendingSourceCount >= MAX_NOTE_SOURCES) {
        setError(lang === "en" ? `You can keep up to ${MAX_NOTE_SOURCES} sources at a time.` : `Aynı anda en fazla ${MAX_NOTE_SOURCES} kaynak tutabilirsiniz.`);
        break;
      }
      try {
        const content = await f.text();
        if (!content.trim()) {
          setError(lang === "en" ? `${f.name} is empty. Add a text file with content.` : `${f.name} boş. İçinde metin bulunan bir dosya ekleyin.`);
          continue;
        }
        if (isSensitiveSource(f.name, content)) {
          setError(lang === "en"
            ? `${f.name} contains a credential-like value, so it was not saved or sent.`
            : `${f.name} kimlik bilgisine benzeyen veri içerdiği için kaydedilmedi ve gönderilmedi.`);
          continue;
        }
        const metrics = getTextMetrics(content);
        if (metrics.characters > MAX_NOTE_SOURCE_CHARACTERS) {
          setError(lang === "en"
            ? `${f.name} contains ${metrics.characters.toLocaleString("en-US")} characters; the limit is ${MAX_NOTE_SOURCE_CHARACTERS.toLocaleString("en-US")} characters per source.`
            : `${f.name} ${metrics.characters.toLocaleString("tr-TR")} karakter. Kaynak sınırı ${MAX_NOTE_SOURCE_CHARACTERS.toLocaleString("tr-TR")} karakter.`);
          continue;
        }
        const duplicateKey = `${f.name.toLocaleLowerCase()}\0${content}`;
        if (existingKeys.has(duplicateKey)) {
          setError(lang === "en" ? `${f.name} is already in your source list.` : `${f.name} kaynak listesinde zaten var.`);
          continue;
        }
        existingKeys.add(duplicateKey);
        pendingSourceCount += 1;
        setSources((prev) => [
          {
            id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
            title: f.name,
            content,
            sourceKind: "file",
            projectId: activeProjectId,
            fileSizeBytes: f.size,
            contentBytes: metrics.bytes,
            active: true,
          },
          ...prev,
        ]);
        setError("");
      } catch {
        setError(lang === "en" ? `Could not read ${f.name}. Try a UTF-8 text file.` : `${f.name} okunamadı. UTF-8 metin dosyası deneyin.`);
      }
    }
    e.target.value = "";
  };

  const handleAddTextSource = (e) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteText.trim()) return;
    if (isSensitiveSource(noteTitle, noteText)) {
      setError(lang === "en"
        ? "This source looks like it contains credentials or recovery codes. Remove them before adding it."
        : "Bu kaynak kimlik bilgisi veya kurtarma kodu içeriyor gibi görünüyor. Eklemek için önce bunları kaldırın.");
      return;
    }
    if (sources.length >= MAX_NOTE_SOURCES) {
      setError(lang === "en" ? `You can keep up to ${MAX_NOTE_SOURCES} sources at a time.` : `Aynı anda en fazla ${MAX_NOTE_SOURCES} kaynak tutabilirsiniz.`);
      return;
    }
    const text = noteText.trim();
    const metrics = getTextMetrics(text);
    if (metrics.characters > MAX_NOTE_SOURCE_CHARACTERS) {
      setError(lang === "en"
        ? `Text is ${metrics.characters.toLocaleString("en-US")} characters; the limit is ${MAX_NOTE_SOURCE_CHARACTERS.toLocaleString("en-US")} characters per source.`
        : `Metin ${metrics.characters.toLocaleString("tr-TR")} karakter. Kaynak sınırı ${MAX_NOTE_SOURCE_CHARACTERS.toLocaleString("tr-TR")} karakter.`);
      return;
    }
    if (sources.some((source) => source.title.trim().toLocaleLowerCase() === noteTitle.trim().toLocaleLowerCase() && source.content === text)) {
      setError(lang === "en" ? "This source is already in your list." : "Bu kaynak listede zaten var.");
      return;
    }
    setSources((prev) => [
      {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        title: noteTitle.trim(),
        content: text,
        sourceKind: "text",
        projectId: activeProjectId,
        contentBytes: metrics.bytes,
        active: true,
      },
      ...prev,
    ]);
    setNoteTitle("");
    setNoteText("");
    setShowAddForm(false);
  };

  const activeSources = projectSources.filter((s) => s.active);
  const sourceCharacters = activeSources.reduce((sum, source) => sum + getTextMetrics(source.content).characters, 0);
  const sourceTokensEstimate = Math.ceil(sourceCharacters / 4);
  const questionTokens = Math.max(1, Math.ceil(getTextMetrics(question).characters / 4));
  const reasoningSupported = getReasoningSupport(activeProvider) !== "unsupported";

  const askNotebook = async (promptText, label = null) => {
    if (requestAbortRef.current) return;
    if (!activeProvider) {
      setError(lang === "en" ? "Connect an AI provider before asking a question." : "Soru sormadan önce bir yapay zeka sağlayıcısı bağlayın.");
      return;
    }
    if (activeSources.length === 0) {
      setError(lang === "en" ? "Add or select at least one source first." : "Önce en az bir kaynak ekleyin veya seçin.");
      return;
    }
    if (activeSources.some((source) => isSensitiveSource(source.title, source.content))) {
      setError(lang === "en"
        ? "A selected source contains credential-like data and was blocked from being sent."
        : "Seçili kaynaklardan biri kimlik bilgisine benzeyen veri içeriyor. İçerik gönderilmeden durduruldu.");
      return;
    }
    const sourcesContext = activeSources
      .map((source, index) => `### KAYNAK ${index + 1}: ${source.title}\n${source.content}`)
      .join("\n\n---\n\n");
    const contextCharacterCount = getTextMetrics(sourcesContext).characters;
    if (contextCharacterCount > MAX_NOTE_CONTEXT_CHARACTERS) {
      setError(lang === "en"
        ? `Selected sources total ${contextCharacterCount.toLocaleString("en-US")} characters. Select fewer sources; a request can include up to ${MAX_NOTE_CONTEXT_CHARACTERS.toLocaleString("en-US")} source characters.`
        : `Seçili kaynaklar toplam ${contextCharacterCount.toLocaleString("tr-TR")} karakter. Daha az kaynak seçin; tek istekte en fazla ${MAX_NOTE_CONTEXT_CHARACTERS.toLocaleString("tr-TR")} kaynak karakteri gönderilebilir.`);
      return;
    }

    setError("");
    const controller = new AbortController();
    requestAbortRef.current = controller;
    const userDisplay = label || promptText;
    setMessages((prev) => [...prev, { role: "user", content: userDisplay }]);
    setLoading(true);
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 60_000);

    const systemPrompt = lang === "en"
      ? "You are Kinetic Notes, a source-grounded research assistant. Answer ONLY from the sources below. Do not invent missing facts; say when the sources do not contain the answer. Cite the source title where possible. Respond in English."
      : "Sen Kinetic Notes (kaynak analiz asistanı) yapay zekasısın. SADECE aşağıda verilen kaynaklara dayanarak Türkçe yanıt ver. Kaynaklarda olmayan bilgileri uydurma; eksikse 'Verilen kaynaklarda bu bilgi bulunmuyor' de. Mümkün olduğunca hangi kaynaktan aldığını [Kaynak Adı] şeklinde belirt.";

    const fullUserPrompt = lang === "en"
      ? `SOURCES TO USE:\n\n${sourcesContext}\n\n---\n\nTASK / QUESTION: ${promptText}`
      : `KULLANILACAK KAYNAKLAR:\n\n${sourcesContext}\n\n---\n\nGÖREV / SORU: ${promptText}`;

    try {
      const res = await onAskAI({
        messages: [{ role: "user", content: fullUserPrompt }],
        systemPrompt,
        signal: controller.signal,
        useWebSearchOverride: false,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply,
          providerName: `${res.usedProvider} · ${activeSources.length} ${lang === "en" ? "sources" : "kaynak"}`,
        },
      ]);
    } catch (err) {
      setError(err.name === "AbortError"
        ? timedOut ? t.requestTimeout : (lang === "en" ? "Request canceled." : "İstek iptal edildi.")
        : formatFriendlyError(err.message, lang));
    } finally {
      window.clearTimeout(timeout);
      requestAbortRef.current = null;
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
  const quickTools = lang === "en"
    ? [
        { label: "Summarize", display: "📌 Source summary", prompt: "Summarize all active sources in detail using concise bullet points." },
        { label: "Study guide", display: "📚 Create a study guide", prompt: "Create a study guide from these sources. List key concepts, definitions, and important details." },
        { label: "5-question quiz", display: "📝 Create a 5-question quiz", prompt: "Write five multiple-choice questions based on the sources and add a short answer key at the end." },
        { label: "Podcast script", display: "🎙️ Podcast script", prompt: "Turn the topic in these sources into a natural podcast dialogue between two hosts." },
      ]
    : [
        { label: t.summarize, display: "📌 Kaynak Özeti Çıkar", prompt: "Tüm aktif kaynakların kapsamlı, maddeler halinde özetini çıkar." },
        { label: t.studyGuide, display: "📚 Çalışma Rehberi Oluştur", prompt: "Bu kaynaklardan bir çalışma rehberi oluştur: Ana kavramları, tanımları ve kritik noktaları listele." },
        { label: t.quiz, display: "📝 5 Soruluk Test (Quiz)", prompt: "Bu kaynaklara dayanarak 5 adet çoktan seçmeli test sorusu hazırla ve en alta kısa cevap anahtarını ekle." },
        { label: t.podcast, display: "🎙️ Podcast Senaryosu", prompt: "Bu kaynaklardaki konuyu iki sunucunun birbirine anlattığı akıcı bir podcast diyalog senaryosuna dönüştür." },
      ];

  return (
    <>
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4 md:flex-row animate-fadeIn">
      {/* SOL: KAYNAK LİSTESİ */}
      <div className={`flex max-h-64 w-full flex-col rounded-2xl border p-4 md:max-h-full md:w-80 ${boxClass}`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold">
              {t.notesSources} <span className="opacity-50">({activeSources.length}/{projectSources.length})</span>
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
              title={lang === "en" ? "Maximum file size: 256 KB" : "En fazla 256 KB"}
              className={`min-h-12 rounded-lg border px-3 text-xs font-medium transition ${
                darkMode ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"
              }`}
            >
              {t.addFile}
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={`flex min-h-12 items-center gap-1 rounded-lg px-3 text-xs font-medium transition ${
                darkMode
                  ? "bg-white text-zinc-950 hover:bg-zinc-200"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              {t.addText}
            </button>
          </div>
        </div>

        <p className="mb-2 text-[10px] opacity-45">
          {lang === "en"
            ? `File limit ${Math.round(MAX_NOTE_FILE_BYTES / 1024)} KB · ${MAX_NOTE_SOURCE_CHARACTERS.toLocaleString("en-US")} characters per source · ${MAX_NOTE_SOURCES} sources max`
            : `Dosya sınırı ${Math.round(MAX_NOTE_FILE_BYTES / 1024)} KB · kaynak başına ${MAX_NOTE_SOURCE_CHARACTERS.toLocaleString("tr-TR")} karakter · en fazla ${MAX_NOTE_SOURCES} kaynak`}
        </p>

        {showAddForm && (
          <form
            onSubmit={handleAddTextSource}
            className={`mb-3 space-y-2 rounded-xl border p-3 animate-scaleIn ${
              darkMode ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-zinc-50"
            }`}
          >
            <input
              type="text"
              placeholder={t.sourceTitlePlaceholder}
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="min-h-12 w-full rounded-lg border border-zinc-700/50 bg-transparent px-2.5 py-2 text-xs outline-none"
            />
            <textarea
              rows={3}
              maxLength={MAX_NOTE_SOURCE_CHARACTERS}
              placeholder={t.sourceContentPlaceholder}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full resize-none rounded-lg border border-zinc-700/50 bg-transparent p-2 text-xs outline-none"
            />
            <p className="text-[10px] opacity-55">
              {lang === "en"
                ? `Max ${MAX_NOTE_SOURCE_CHARACTERS.toLocaleString("en-US")} characters per source · ${MAX_NOTE_SOURCES} sources · ${Math.round(MAX_NOTE_FILE_BYTES / 1024)} KB per file.`
                : `Kaynak başına en fazla ${MAX_NOTE_SOURCE_CHARACTERS.toLocaleString("tr-TR")} karakter · ${MAX_NOTE_SOURCES} kaynak · dosya başına ${Math.round(MAX_NOTE_FILE_BYTES / 1024)} KB.`}
            </p>
            <p className="text-right text-[10px] opacity-45">{getTextMetrics(noteText).characters.toLocaleString(lang === "en" ? "en-US" : "tr-TR")} / {MAX_NOTE_SOURCE_CHARACTERS.toLocaleString(lang === "en" ? "en-US" : "tr-TR")}</p>
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="min-h-12 rounded-lg px-3 text-xs opacity-70 hover:opacity-100"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="min-h-12 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-zinc-950"
              >
                {t.addSource}
              </button>
            </div>
          </form>
        )}

        <div className="flex-1 divide-y divide-zinc-800/40 overflow-y-auto pr-1">
          {projectSources.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700/50 p-5 text-center">
              <BookOpen className="mb-3 h-8 w-8 text-emerald-400" aria-hidden="true" />
              <h3 className="text-sm font-semibold">{t.noSourcesTitle}</h3>
              <p className="mt-1 max-w-xs text-xs leading-relaxed opacity-70">{t.noSourcesDesc}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => setShowAddForm(true)} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-emerald-500 px-3 text-xs font-semibold text-zinc-950 hover:bg-emerald-400">
                  <Plus className="h-4 w-4" />{t.addText}
                </button>
                <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-zinc-700/60 px-3 text-xs font-semibold hover:bg-zinc-800/50">
                  <Upload className="h-4 w-4" />{t.addFile}
                </button>
              </div>
            </div>
          ) : (
            projectSources.map((s) => (
              <div
                key={s.id}
                className="group py-2.5 text-xs transition"
              >
                <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() =>
                    setSources((prev) =>
                      prev.map((item) =>
                        item.id === s.id ? { ...item, active: !item.active } : item
                      )
                    )
                  }
                  className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 text-left"
                  aria-pressed={s.active}
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
                      {s.sourceKind === "file" && Number.isFinite(s.fileSizeBytes)
                        ? `${(s.fileSizeBytes / 1024).toLocaleString(lang === "en" ? "en-US" : "tr-TR", { maximumFractionDigits: 1 })} KB · `
                        : ""}
                      {getTextMetrics(s.content).characters.toLocaleString(lang === "en" ? "en-US" : "tr-TR")} {lang === "en" ? "characters" : "karakter"}
                      <span className="opacity-70"> · {(getTextMetrics(s.content).bytes / 1024).toLocaleString(lang === "en" ? "en-US" : "tr-TR", { maximumFractionDigits: 1 })} KB {lang === "en" ? "text" : "metin"}</span>
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMovingSourceId((current) => current === s.id ? "" : s.id)}
                  className="touch-target flex shrink-0 items-center justify-center rounded-lg opacity-60 transition hover:bg-emerald-500/10 hover:text-emerald-400 hover:opacity-100"
                  aria-label={lang === "en" ? `Move ${s.title} to another project` : `${s.title} kaynağını başka projeye taşı`}
                  title={lang === "en" ? "Move to project" : "Projeye taşı"}
                >
                  <FolderInput className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setPendingDelete(s)}
                  className="touch-target flex shrink-0 items-center justify-center rounded-lg opacity-60 transition hover:bg-red-500/10 hover:text-red-400 hover:opacity-100"
                  aria-label={`${t.deleteSourceTitle} ${s.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                </div>
                {movingSourceId === s.id && (
                  <div className="mt-1 flex flex-wrap gap-1 border-t border-zinc-500/15 pt-1.5">
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        disabled={s.projectId === project.id}
                        onClick={() => {
                          setSources((previous) => previous.map((source) => source.id === s.id ? { ...source, projectId: project.id } : source));
                          setMovingSourceId("");
                        }}
                        className="min-h-9 rounded-lg px-2 text-[10px] text-emerald-400 hover:bg-emerald-500/10 disabled:cursor-default disabled:text-zinc-500"
                      >
                        {project.id === "default" ? (lang === "en" ? "General" : "Genel") : project.name}
                      </button>
                    ))}
                  </div>
                )}
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
            {t.quickTools}:
          </span>
          {quickTools.map((tool) => (
            <button
              key={tool.label}
              disabled={loading || activeSources.length === 0}
              title={activeSources.length === 0
                ? (lang === "en" ? "Add or select a source first." : "Önce bir kaynak ekleyin veya seçin.")
                : tool.label}
              onClick={() => askNotebook(tool.prompt, tool.display)}
              className={`min-h-12 rounded-lg border px-3 text-xs font-medium transition disabled:opacity-40 ${
                darkMode
                  ? "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800"
                  : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100"
              }`}
            >
              {tool.label}
            </button>
          ))}
        </div>

        {activeSources.length > 0 && (
          <p className="mb-2 text-[10px] opacity-55">
            {lang === "en"
              ? `Selected source text: about ${sourceTokensEstimate.toLocaleString("en-US")} input tokens${question.trim() ? `; roughly ${Math.max(1, Math.ceil(sourceTokensEstimate / questionTokens))}× the current question` : ""}. Estimate only; the provider reports actual usage.`
              : `Seçili kaynak metni: yaklaşık ${sourceTokensEstimate.toLocaleString("tr-TR")} giriş tokenı${question.trim() ? `; mevcut sorunun yaklaşık ${Math.max(1, Math.ceil(sourceTokensEstimate / questionTokens))} katı` : ""}. Tahmindir; gerçek kullanımı sağlayıcı bildirir.`}
            {reasoningLevel === "high" && reasoningSupported && (lang === "en" ? " High reasoning can add provider tokens." : " Yüksek düşünme ek sağlayıcı tokenı kullanabilir.")}
          </p>
        )}

        <div className="flex-1 space-y-5 overflow-y-auto py-2 pr-1">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center opacity-75">
              <BookOpen className="mb-2.5 h-8 w-8 text-emerald-400" />
              <p className="text-sm font-semibold">Kinetic Notes · {t.notesWelcome}</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed">
                {t.notesWelcomeDesc}
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
            placeholder={t.askAboutSources}
            className="min-h-12 flex-1 bg-transparent px-2.5 text-xs outline-none"
          />
          <button
            onClick={loading ? () => requestAbortRef.current?.abort() : handleSendQuestion}
            disabled={!loading && !question.trim()}
            className={`touch-target flex items-center justify-center rounded-lg disabled:opacity-30 ${
              darkMode ? "bg-white text-zinc-950" : "bg-zinc-900 text-white"
            }`}
          >
            {loading ? <X className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
    <ConfirmModal
      isOpen={Boolean(pendingDelete)}
      title={t.deleteSourceTitle}
      description={pendingDelete ? `${pendingDelete.title} — ${t.deleteSourceDesc}` : t.deleteSourceDesc}
      confirmText={t.confirm}
      cancelText={t.cancel}
      darkMode={darkMode}
      onCancel={() => setPendingDelete(null)}
      onConfirm={() => {
        if (pendingDelete) setSources((previous) => previous.filter((item) => item.id !== pendingDelete.id));
        setPendingDelete(null);
      }}
    />
    </>
  );
}
