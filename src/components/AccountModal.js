// src/components/AccountModal.js
"use client";

import { useState } from "react";
import {
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  X,
  ShieldCheck,
  Mail,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader2,
} from "lucide-react";

export default function AccountModal({
  isOpen,
  onClose,
  firebaseUser,
  userProfile,
  darkMode,
}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen || !firebaseUser || !userProfile) return null;

  const handleSendVerification = async () => {
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      await sendEmailVerification(firebaseUser);
      setMsg("Doğrulama e-postası gönderildi! Gelen kutunuzu (ve spam klasörünü) kontrol edin.");
    } catch (e) {
      setErr(e.message || "Doğrulama e-postası gönderilemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, firebaseUser.email);
      setMsg("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.");
    } catch (e) {
      setErr(e.message || "Şifre sıfırlama maili gönderilemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setErr("");
    setLoading(true);
    try {
      const idToken = await firebaseUser.getIdToken();
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Hesap silinemedi.");
      }

      try {
        localStorage.removeItem("kinetic_ai_providers");
        localStorage.removeItem("kinetic_ai_chats");
        localStorage.removeItem("kinetic_ai_notes");
        localStorage.removeItem("kinetic_ai_tasks");
        localStorage.removeItem(`kinetic_ban_${firebaseUser.uid}`);
      } catch {
        // The server-side account is already deleted; local cleanup is best effort.
      }
      await signOut(auth);
      onClose();
      window.location.replace("/");
    } catch (error) {
      setErr(error.message || "Hesap silinemedi. Lütfen tekrar giriş yaptıktan sonra yeniden deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const cardClass = darkMode
    ? "border-zinc-800 bg-zinc-900 text-zinc-100"
    : "border-zinc-200 bg-white text-zinc-900";

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className={`max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border p-6 shadow-2xl ${cardClass}`}>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <h2 className="text-base font-semibold">Hesap Güvenliği & Kota</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 opacity-60 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Kullanıcı Özeti */}
          <div
            className={`rounded-xl border p-3.5 ${
              darkMode ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-zinc-50"
            }`}
          >
            <div className="font-semibold">{userProfile.name}</div>
            <div className="mt-0.5 opacity-60">{userProfile.email}</div>
            <div className="mt-2 flex items-center gap-2">
              {firebaseUser.emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> E-posta Doğrulandı
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-400">
                  <AlertTriangle className="h-3 w-3" /> E-posta Doğrulanmadı
                </span>
              )}
            </div>
          </div>

          {/* Güvenlik Butonları */}
          <div className="space-y-2">
            {!firebaseUser.emailVerified && (
              <button
                type="button"
                disabled={loading}
                onClick={handleSendVerification}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2 font-medium text-amber-400 hover:bg-amber-500/20"
              >
                <Mail className="h-3.5 w-3.5" />
                Doğrulama E-postası Gönder
              </button>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={handlePasswordReset}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2 font-medium ${
                darkMode
                  ? "border-zinc-800 hover:bg-zinc-800"
                  : "border-zinc-300 hover:bg-zinc-100"
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Şifre Sıfırlama Bağlantısı Gönder
            </button>
          </div>

          {msg && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400">
              {msg}
            </div>
          )}
          {err && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-400">
              {err}
            </div>
          )}

          {/* Hesabı Sil (KVKK/GDPR) */}
          <div className="border-t border-zinc-800/60 pt-3">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hesabımı ve Verilerimi Kalıcı Olarak Sil
              </button>
            ) : (
              <div className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-red-300">
                  Hesabınız ve KineticAI kayıtlarınız silinir; bu tarayıcıdaki sohbet,
                  not, görev ve sağlayıcı ayarları temizlenir. Diğer cihazlardaki yerel
                  kopyaları o cihazlardan ayrıca silmeniz gerekir.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 rounded-lg border border-zinc-700 py-1.5"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleDeleteAccount}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-600 py-1.5 font-semibold text-white hover:bg-red-500"
                  >
                    {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                    Evet, Sil
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
