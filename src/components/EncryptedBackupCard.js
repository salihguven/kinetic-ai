"use client";

import { useRef, useState } from "react";
import { Download, FileUp, KeyRound, Loader2, LockKeyhole, ShieldCheck } from "@/components/KineticIcons";
import ConfirmModal from "@/components/ConfirmModal";
import {
  applyBackupSnapshot,
  createBackupSnapshot,
  decryptWorkspaceBackup,
  encryptWorkspaceBackup,
  MAX_BACKUP_FILE_BYTES,
} from "@/lib/encryptedBackup";

export default function EncryptedBackupCard({ darkMode = true, lang = "tr" }) {
  const isEn = lang === "en";
  const fileInputRef = useRef(null);
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingRestore, setPendingRestore] = useState(null);
  const surface = darkMode ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-200 bg-white";
  const subtext = darkMode ? "text-zinc-400" : "text-zinc-600";

  const handleExport = async () => {
    setError("");
    setMessage("");
    if (passphrase.length < 12) {
      setError(isEn ? "Use a passphrase with at least 12 characters." : "En az 12 karakterli bir yedek parolası kullan.");
      return;
    }

    setBusy(true);
    try {
      const fileContent = await encryptWorkspaceBackup(createBackupSnapshot(window.localStorage), passphrase);
      const blob = new Blob([fileContent], { type: "application/vnd.kineticai.backup+json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `kineticai-backup-${new Date().toISOString().slice(0, 10)}.kbackup`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setPassphrase("");
      setMessage(isEn ? "Encrypted backup downloaded." : "Şifreli yedek indirildi.");
    } catch (backupError) {
      setError(backupError instanceof Error ? backupError.message : (isEn ? "Backup could not be created." : "Yedek oluşturulamadı."));
    } finally {
      setBusy(false);
    }
  };

  const handleChooseFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setError("");
    setMessage("");
    setPendingRestore(null);
    if (!file) return;
    if (file.size > MAX_BACKUP_FILE_BYTES) {
      setError(isEn ? "Backup file exceeds the 3 MB limit." : "Yedek dosyası 3 MB sınırını aşıyor.");
      return;
    }
    if (passphrase.length < 12) {
      setError(isEn ? "Enter the backup passphrase first (at least 12 characters)." : "Önce yedek parolasını gir (en az 12 karakter).");
      return;
    }

    setBusy(true);
    try {
      const fileText = await file.text();
      const snapshot = await decryptWorkspaceBackup(fileText, passphrase);
      setPendingRestore({ snapshot, name: file.name });
    } catch (backupError) {
      setError(backupError instanceof Error ? backupError.message : (isEn ? "Backup could not be opened." : "Yedek açılamadı."));
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = () => {
    if (!pendingRestore) return;
    setBusy(true);
    const restored = applyBackupSnapshot(window.localStorage, pendingRestore.snapshot);
    if (!restored) {
      setBusy(false);
      setPendingRestore(null);
      setPassphrase("");
      setError(isEn
        ? "Browser storage could not be fully updated. The app attempted to roll back; check available storage and try again."
        : "Tarayıcı depolaması tamamen güncellenemedi. Geri alma denendi; depolama alanını kontrol edip tekrar dene.");
      return;
    }
    window.location.reload();
  };

  return (
    <section className={`rounded-2xl border p-4 md:p-5 ${surface}`} aria-labelledby="encrypted-backup-title">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500"><LockKeyhole className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <h3 id="encrypted-backup-title" className="text-sm font-semibold">{isEn ? "Encrypted local backup" : "Şifreli yerel yedek"}</h3>
          <p className={`mt-1 text-xs leading-relaxed ${subtext}`}>
            {isEn
              ? "Export chats, notes, tasks, projects and preferences as an encrypted file. This stays on your device; it does not sync to a server."
              : "Sohbet, not, görev, proje ve tercihlerini şifreli dosya olarak dışa aktar. Dosya cihazında kalır; sunucuya eşitlenmez."}
          </p>
        </div>
        <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
      </div>

      <label htmlFor="backup-passphrase" className="mt-4 block text-xs font-medium">{isEn ? "Backup passphrase" : "Yedek parolası"}</label>
      <div className="relative mt-1.5">
        <KeyRound className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${subtext}`} />
        <input
          id="backup-passphrase"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          placeholder={isEn ? "At least 12 characters" : "En az 12 karakter"}
          className={`min-h-11 w-full rounded-xl border pl-10 pr-3 text-sm outline-none focus:border-emerald-500 ${darkMode ? "border-zinc-700 bg-zinc-950" : "border-zinc-300 bg-white"}`}
        />
      </div>
      <p className={`mt-1.5 text-[11px] leading-relaxed ${subtext}`}>
        {isEn
          ? "Keep this passphrase separately. It cannot be recovered. API keys and sign-in data are not included. Chat text and notes may contain personal information."
          : "Parolayı ayrı ve güvenli bir yerde sakla; kurtarılamaz. API anahtarları ve oturum bilgileri yedeğe alınmaz. Sohbetler ve notlar kişisel bilgi içerebilir."}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={handleExport} disabled={busy} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isEn ? "Download encrypted backup" : "Şifreli yedeği indir"}
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-60 ${darkMode ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"}`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
          {isEn ? "Choose backup to restore" : "Geri yüklenecek yedeği seç"}
        </button>
        <input ref={fileInputRef} type="file" accept=".kbackup,application/json" className="sr-only" onChange={handleChooseFile} aria-label={isEn ? "Choose encrypted backup file" : "Şifreli yedek dosyası seç"} />
      </div>

      {message && <p role="status" className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-2.5 text-xs text-emerald-500">{message}</p>}
      {error && <p role="alert" className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 p-2.5 text-xs leading-relaxed text-red-400">{error}</p>}

      <ConfirmModal
        isOpen={Boolean(pendingRestore)}
        title={isEn ? "Replace this browser workspace?" : "Bu tarayıcıdaki çalışma alanı değiştirilsin mi?"}
        description={isEn
          ? `${pendingRestore?.name || "The selected backup"} is valid and encrypted. Restoring it replaces the current chats, notes, tasks, projects and preferences in this browser. API keys remain untouched. This cannot be undone.`
          : `${pendingRestore?.name || "Seçilen yedek"} geçerli ve şifreli. Geri yükleme bu tarayıcıdaki sohbet, not, görev, proje ve tercihlerin yerini alır. API anahtarları korunur. Bu işlem geri alınamaz.`}
        confirmText={isEn ? "Replace and restore" : "Değiştir ve geri yükle"}
        cancelText={isEn ? "Cancel" : "Vazgeç"}
        danger
        darkMode={darkMode}
        onConfirm={handleRestore}
        onCancel={() => setPendingRestore(null)}
      />
    </section>
  );
}
