// src/components/AuthScreen.js
"use client";

import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import {
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sun,
  Moon,
} from "lucide-react";
import KineticLogo from "./KineticLogo";
import LegalModal from "./LegalModal";
import AuthBackground from "./AuthBackground";

function translateFirebaseError(code) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-posta veya şifre hatalı (Google ile kayıt olduysanız 'Google ile Devam Et'i kullanın).";
    case "auth/email-already-in-use":
      return "Bu e-posta adresi ile zaten bir hesap var.";
    case "auth/weak-password":
      return "Şifre en az 6 karakter olmalıdır.";
    case "auth/invalid-email":
      return "Geçerli bir e-posta adresi girin.";
    case "auth/popup-closed-by-user":
      return "Google giriş penceresi kapatıldı.";
    case "auth/too-many-requests":
      return "Çok fazla başarısız deneme. Lütfen biraz bekleyin.";
    default:
      return "İşlem sırasında bir hata oluştu. Bilgileri kontrol edin.";
  }
}

export default function AuthScreen({ darkMode, setDarkMode, embedded = false }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [isLegalOpen, setIsLegalOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");

    if (isRegister && !acceptedTerms) {
      setError("Devam etmek için Kullanım Koşulları ve Gizlilik Politikasını kabul etmelisiniz.");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
        sendEmailVerification(cred.user).catch(() => {});
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      setError(translateFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setInfoMsg("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(translateFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setInfoMsg("");
    if (!email.trim()) {
      setError("Şifre sıfırlama bağlantısı göndermek için önce e-posta adresinizi yazın.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfoMsg("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.");
    } catch (err) {
      setError(translateFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const cardClass = darkMode
    ? "border-zinc-800 bg-zinc-900/70 text-zinc-100"
    : "border-zinc-200 bg-white text-zinc-900 shadow-xl";
  const inputClass = darkMode
    ? "border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-zinc-500"
    : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-900";

  const card = (
    <div className="relative mx-auto w-full max-w-md">
      <div className={`rounded-2xl border p-7 backdrop-blur-md transition-all ${cardClass}`}>
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3">
            <KineticLogo size={44} darkMode={darkMode} />
          </div>
          <h2 className="text-xl font-bold tracking-tight">KineticAI</h2>
          <p className="mt-1 text-xs opacity-60">
            Ücretsiz, açık ve modüler yapay zeka çalışma alanı.
          </p>
        </div>

        <div
          className={`mb-5 grid grid-cols-2 rounded-xl p-1 text-xs font-medium ${
            darkMode ? "bg-zinc-950" : "bg-zinc-100"
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError("");
              setInfoMsg("");
            }}
            className={`rounded-lg py-2 transition ${
              !isRegister
                ? darkMode
                  ? "bg-zinc-800 text-white"
                  : "bg-white text-zinc-900 shadow-sm"
                : "opacity-60"
            }`}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError("");
              setInfoMsg("");
            }}
            className={`rounded-lg py-2 transition ${
              isRegister
                ? darkMode
                  ? "bg-zinc-800 text-white"
                  : "bg-white text-zinc-900 shadow-sm"
                : "opacity-60"
            }`}
          >
            Kayıt Ol
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className={`mb-4 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-medium transition ${
            darkMode
              ? "border-zinc-700 bg-zinc-950 hover:bg-zinc-800"
              : "border-zinc-300 bg-white hover:bg-zinc-50"
          }`}
        >
          <span className="font-bold">G</span>
          <span>Google ile Devam Et</span>
        </button>

        <div className="mb-4 flex items-center gap-3 text-[11px] opacity-40">
          <div className="h-px flex-1 bg-current" />
          <span>veya e-posta ile</span>
          <div className="h-px flex-1 bg-current" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="mb-1 block text-xs opacity-60">Ad Soyad</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 opacity-40" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Adınız"
                  className={`w-full rounded-xl border py-2 pl-9 pr-3 text-sm outline-none ${inputClass}`}
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs opacity-60">E-posta</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 opacity-40" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@mail.com"
                className={`w-full rounded-xl border py-2 pl-9 pr-3 text-sm outline-none ${inputClass}`}
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs opacity-60">Şifre</label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] opacity-60 hover:underline hover:opacity-100"
                >
                  Şifremi Unuttum
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 opacity-40" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 6 karakter"
                className={`w-full rounded-xl border py-2 pl-9 pr-3 text-sm outline-none ${inputClass}`}
              />
            </div>
          </div>

          {isRegister && (
            <label className="flex cursor-pointer items-start gap-2 text-[11px] opacity-75">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 accent-emerald-500"
              />
              <span>
                <button
                  type="button"
                  onClick={() => setIsLegalOpen(true)}
                  className="underline hover:opacity-100"
                >
                  Gizlilik Politikası ve Kullanım Koşullarını
                </button>{" "}
                okudum, kabul ediyorum.
              </span>
            </label>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {infoMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
              darkMode
                ? "bg-white text-zinc-950 hover:bg-zinc-200"
                : "bg-zinc-900 text-white hover:bg-zinc-800"
            }`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isRegister ? "Ücretsiz Hesap Oluştur" : "Giriş Yap"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => setIsLegalOpen(true)}
            className="text-[11px] opacity-45 hover:underline hover:opacity-80"
          >
            Gizlilik Politikası · Kullanım Koşulları · KineticAI by True Kinetic Studios
          </button>
        </div>
      </div>

      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        darkMode={darkMode}
      />
    </div>
  );

  // Gömülü mod: LandingContent zaten kendi arka planını, teması ve
  // header'ını yönetiyor — burada sadece kartı döndürüyoruz.
  if (embedded) {
    return card;
  }

  // Bağımsız (standalone) mod: AuthScreen tek başına tam ekran olarak
  // kullanılırsa kendi arka planını ve tema butonunu kendisi sağlar.
  return (
    <div
      className={`relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4 transition-colors safe-top safe-bottom ${
        darkMode ? "theme-dark bg-zinc-950 text-zinc-100" : "theme-light bg-zinc-50 text-zinc-900"
      }`}
    >
      <AuthBackground darkMode={darkMode} />

      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed right-5 top-5 z-10 rounded-xl border p-2 transition ${
          darkMode
            ? "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
            : "border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900"
        }`}
        title="Tema Değiştir"
      >
        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="relative z-10 w-full">{card}</div>
    </div>
  );
}
