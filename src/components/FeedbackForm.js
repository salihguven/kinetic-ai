"use client";

import { useState } from "react";
import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { readApiJson } from "@/lib/apiResponse";
import CustomSelect from "@/components/CustomSelect";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const categories = [
  ["feedback", "Genel geri bildirim"],
  ["bug", "Hata bildirimi"],
  ["suggestion", "Özellik önerisi"],
  ["security", "Güvenlik bildirimi"],
];

export default function FeedbackForm({ initialType = "feedback" }) {
  const [type, setType] = useState(initialType);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState({ state: "idle", message: "" });

  async function submit(event) {
    event.preventDefault();
    if (status.state === "sending") return;
    setStatus({ state: "sending", message: "Bildirim gönderiliyor…" });

    try {
      const required = ["apiKey", "authDomain", "projectId", "appId"];
      const configReady = required.every((key) => String(firebaseConfig[key] || "").trim());
      const firebaseApp = configReady ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
      const currentUser = firebaseApp ? getAuth(firebaseApp).currentUser : null;
      const token = currentUser ? await currentUser.getIdToken() : "";
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ type, title, details, email, website, source: window.location.pathname }),
      });
      const data = await readApiJson(response, "Geri bildirim");
      if (!response.ok) throw new Error(data.error || "Bildirim gönderilemedi.");
      setTitle("");
      setDetails("");
      setEmail("");
      setStatus({ state: "success", message: `Bildiriminiz alındı. Referans numarası: ${data.reference}` });
    } catch (error) {
      setStatus({ state: "error", message: error.message || "Bağlantı kurulamadı. Biraz sonra tekrar deneyin." });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="block text-sm font-medium text-gray-200">
        <span id="feedback-type-label">Bildirim türü</span>
        <div className="mt-2">
          <CustomSelect
            ariaLabel="Bildirim türü"
            value={type}
            onChange={setType}
            options={categories.map(([value, label]) => ({ value, label }))}
          />
        </div>
      </div>
      <label className="block text-sm font-medium text-gray-200" htmlFor="feedback-title">Kısa başlık
        <input id="feedback-title" required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Örn. Sohbet ekranında dosya eklenmiyor" className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#090a10] px-4 text-sm text-white outline-none placeholder:text-gray-600 focus-visible:border-violet-400" />
      </label>
      <label className="block text-sm font-medium text-gray-200" htmlFor="feedback-details">Ayrıntılar
        <textarea id="feedback-details" required minLength={12} maxLength={5000} rows={7} value={details} onChange={(event) => setDetails(event.target.value)} placeholder={type === "bug" ? "Ne yaparken oldu? Beklediğiniz ve gördüğünüz sonucu anlatın. Tekrarlama adımları varsa ekleyin." : "Geri bildiriminizi anlaşılır biçimde açıklayın."} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#090a10] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-600 focus-visible:border-violet-400" />
        <span className="mt-1 block text-right text-xs text-gray-500">{details.length}/5000</span>
      </label>
      <label className="block text-sm font-medium text-gray-200" htmlFor="feedback-email">Yanıt için e-posta <span className="font-normal text-gray-500">(isteğe bağlı)</span>
        <input id="feedback-email" type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ornek@eposta.com" autoComplete="email" className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#090a10] px-4 text-sm text-white outline-none placeholder:text-gray-600 focus-visible:border-violet-400" />
      </label>
      <label aria-hidden="true" className="pointer-events-none absolute -left-[10000px] top-auto h-px w-px overflow-hidden">Web sitesi<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
      {status.message && <p role={status.state === "error" ? "alert" : "status"} className={`rounded-xl border p-3 text-sm leading-6 ${status.state === "error" ? "border-red-400/20 bg-red-400/[0.06] text-red-200" : status.state === "success" ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200" : "border-white/10 text-gray-300"}`}>{status.message}</p>}
      <button type="submit" disabled={status.state === "sending"} className="min-h-12 w-full rounded-xl bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-60">{status.state === "sending" ? "Gönderiliyor…" : "Bildirimi gönder"}</button>
    </form>
  );
}
