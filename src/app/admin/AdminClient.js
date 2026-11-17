
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Ban, Download, ShieldCheck } from "@/components/KineticIcons";
import CustomSelect from "@/components/CustomSelect";
import { readApiJson } from "@/lib/apiResponse";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseAuth() {
  const requiredConfig = ["apiKey", "authDomain", "projectId", "appId"];
  const missingConfig = requiredConfig.filter((key) => !String(firebaseConfig[key] || "").trim());
  if (missingConfig.length > 0) {
    throw new Error(`Admin panel Firebase web ayarları eksik: ${missingConfig.join(", ")}. .env.local dosyasını doldurup geliştirme sunucusunu yeniden başlatın.`);
  }
  const app = getApps()[0] || initializeApp(firebaseConfig);
  return getAuth(app);
}

const navigation = [
  { id: "dashboard", label: "Genel Bakış", icon: "◫" },
  { id: "users", label: "Kullanıcılar", icon: "♙" },
  { id: "updates", label: "Güncellemeler", icon: "↗" },
  { id: "feedback", label: "Geri bildirimler", icon: "✉" },
];

const formatDate = (date) => {
  if (!date) return "Henüz giriş yapmadı";

  return new Date(date).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function AdminClient() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [users, setUsers] = useState([]);
  const [usersPageToken, setUsersPageToken] = useState("");
  const [nextUsersPageToken, setNextUsersPageToken] = useState("");
  const [usersPageHistory, setUsersPageHistory] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [feedbackReports, setFeedbackReports] = useState([]);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackActionId, setFeedbackActionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [usersError, setUsersError] = useState("");
  const [usersWarning, setUsersWarning] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState("");
  const [mediaUploadMessage, setMediaUploadMessage] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    version: "",
    category: "feature",
    articleBody: "",
    coverImage: "",
    coverAlt: "",
    videoUrl: "",
  });

  const [accessDenied, setAccessDenied] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [banActionUid, setBanActionUid] = useState("");
  const [exportingUsers, setExportingUsers] = useState(false);

  const loadDashboard = useCallback(async (firebaseUser, showRefresh = false, requestedPageToken = "") => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");
    setUsersError("");
    setUsersWarning("");
    setSuccess("");

    try {
      // Custom claims update after token refresh; force renewal so newly
      // promoted admins can open the panel immediately after signing in.
      const token = await firebaseUser.getIdToken(true);

      const accessResponse = await fetch("/api/admin/access", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const accessData = await readApiJson(accessResponse, "Admin erişim kontrolü");

      if (accessResponse.status === 401 || accessResponse.status === 403) {
        setAccessDenied(true);
        return;
      }
      if (!accessResponse.ok) {
        throw new Error(accessData.error || `Admin erişim kontrolü başarısız (HTTP ${accessResponse.status}).`);
      }
      if (accessData.isAdmin !== true) {
        setAccessDenied(true);
        return;
      }

      setAccessDenied(false);
      setIsFounder(accessData.isFounder === true);

      const usersParams = new URLSearchParams({ limit: "100" });
      if (requestedPageToken) usersParams.set("pageToken", requestedPageToken);
      const [usersResult, updatesResult, feedbackResult] = await Promise.allSettled([
        fetch(`/api/admin/users?${usersParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }).then(async (response) => ({ response, data: await readApiJson(response, "Kullanıcı listesi") })),
        fetch("/api/admin/updates", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }).then(async (response) => ({ response, data: await readApiJson(response, "Güncelleme listesi") })),
        fetch("/api/admin/feedback", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }).then(async (response) => ({ response, data: await readApiJson(response, "Geri bildirimler") })),
      ]);

      if (usersResult.status === "fulfilled" && usersResult.value.response.ok && Array.isArray(usersResult.value.data.users)) {
        setUsers(usersResult.value.data.users);
        setUsersPageToken(requestedPageToken);
        setNextUsersPageToken(usersResult.value.data.nextPageToken || "");
        setUsersWarning(usersResult.value.data.profileDataAvailable === false
          ? usersResult.value.data.profileDataError || "Firestore kullanıcı profilleri okunamadı. KineticAI yasak durumu bilinmediği için yasaklama kontrolleri kapatıldı."
          : "");
      } else {
        const message = usersResult.status === "rejected"
          ? usersResult.reason?.message
          : usersResult.value.data.error || `Kullanıcılar yüklenemedi (HTTP ${usersResult.value.response.status}).`;
        setUsersError(message || "Kullanıcı listesi alınamadı. Firebase Authentication ve servis hesabını kontrol edin.");
      }

      if (updatesResult.status === "fulfilled" && updatesResult.value.response.ok && Array.isArray(updatesResult.value.data.updates)) {
        setUpdates(updatesResult.value.data.updates);
      } else {
        const message = updatesResult.status === "rejected"
          ? updatesResult.reason?.message
          : updatesResult.value.data.error || `Güncellemeler yüklenemedi (HTTP ${updatesResult.value.response.status}).`;
        setError(message || "Güncelleme listesi alınamadı.");
      }

      if (feedbackResult.status === "fulfilled" && feedbackResult.value.response.ok && Array.isArray(feedbackResult.value.data.reports)) {
        setFeedbackReports(feedbackResult.value.data.reports);
        setFeedbackError("");
      } else {
        const message = feedbackResult.status === "rejected"
          ? feedbackResult.reason?.message
          : feedbackResult.value.data.error || `Geri bildirimler yüklenemedi (HTTP ${feedbackResult.value.response.status}).`;
        setFeedbackError(message || "Geri bildirim listesi alınamadı.");
      }
    } catch (err) {
      setError(err.message || "Bir bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const auth = getFirebaseAuth();
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);

        if (!firebaseUser) {
          setLoading(false);
          setAccessDenied(true);
          return;
        }

        loadDashboard(firebaseUser);
      });
    } catch (authError) {
      window.setTimeout(() => {
        setError(authError.message || "Firebase web ayarları okunamadı.");
        setLoading(false);
        setAccessDenied(true);
      }, 0);
    }

    return () => unsubscribe();
  }, [loadDashboard]);

  const filteredUsers = useMemo(() => {
    return users.filter((item) => {
      const query = search.toLowerCase();

      const matchesSearch =
        (item.email || "").toLowerCase().includes(query) ||
        (item.displayName || "").toLowerCase().includes(query) ||
        (item.uid || "").toLowerCase().includes(query);

      const matchesRole =
        roleFilter === "all" || item.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((u) => u.role === "admin" || u.role === "founder").length,
    founders: users.filter((u) => u.role === "founder").length,
    testers: users.filter((u) => u.role === "tester").length,
    verified: users.filter((u) => u.emailVerified).length,
    disabled: users.filter((u) => u.disabled).length,
    banned: users.filter((u) => u.banned).length,
  }), [users]);

  async function toggleUserBan(item) {
    if (!user || banActionUid) return;
    if (item.banStatusAvailable === false) {
      setError("Bu kullanıcının Firestore yasak durumu okunamadı. Yasaklama işlemi için önce veritabanı bağlantısını düzeltin.");
      return;
    }
    const nextBanned = !item.banned;
    const reason = nextBanned
      ? window.prompt("Yasaklama nedeni (en fazla 300 karakter):", "Topluluk kurallarının ihlali.")
      : "";
    if (nextBanned && reason === null) return;
    if (nextBanned && !reason.trim()) {
      setError("Yasaklama nedeni boş bırakılamaz.");
      return;
    }
    if (reason.length > 300) {
      setError("Yasaklama nedeni 300 karakteri aşamaz.");
      return;
    }
    const prompt = nextBanned
      ? `${item.email || item.uid} hesabını KineticAI kullanımından yasaklamak istiyor musunuz?\n\nNeden: ${reason}`
      : `${item.email || item.uid} hesabının yasağını kaldırmak istiyor musunuz?`;
    if (!window.confirm(prompt)) return;

    setBanActionUid(item.uid);
    setError("");
    setSuccess("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/users/ban", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid: item.uid,
          banned: nextBanned,
          reason,
        }),
      });
      const data = await readApiJson(response, "Kullanıcı durumu");
      if (!response.ok || data.success !== true) {
        throw new Error(data.error || `Kullanıcı durumu değiştirilemedi (HTTP ${response.status}).`);
      }

      await loadDashboard(user, true, usersPageToken);
      setSuccess(nextBanned ? "Kullanıcı yasaklandı." : "Kullanıcı yasağı kaldırıldı.");
    } catch (err) {
      setError(err.message || "Kullanıcı durumu değiştirilemedi.");
    } finally {
      setBanActionUid("");
    }
  }

  async function downloadFilteredUsers() {
    if (!user || exportingUsers || users.length === 0) return;
    setExportingUsers(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const allUsers = [];
      let pageToken = "";
      do {
        const params = new URLSearchParams({ limit: "100" });
        if (pageToken) params.set("pageToken", pageToken);
        const response = await fetch(`/api/admin/users?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await readApiJson(response, "Kullanıcı dışa aktarma");
        if (!response.ok || !Array.isArray(data.users)) {
          throw new Error(data.error || `Kullanıcı sayfası alınamadı (HTTP ${response.status}).`);
        }
        allUsers.push(...data.users);
        pageToken = data.nextPageToken || "";
      } while (pageToken);

      const query = search.trim().toLowerCase();
      const exportUsers = allUsers.filter((item) => {
        const matchesSearch = !query ||
          (item.email || "").toLowerCase().includes(query) ||
          (item.displayName || "").toLowerCase().includes(query) ||
          (item.uid || "").toLowerCase().includes(query);
        const matchesRole = roleFilter === "all" || item.role === roleFilter;
        return matchesSearch && matchesRole;
      });
      if (exportUsers.length === 0) {
        setError("Seçili arama ve role uygun kullanıcı bulunamadı.");
        return;
      }

      const headers = ["UID", "E-posta", "Ad", "Rol", "E-posta doğrulandı", "Firebase devre dışı", "KineticAI yasaklı", "Yasak nedeni", "Kayıt tarihi", "Son giriş"];
      const protectFormula = (value) => {
        const text = String(value ?? "");
        return /^[\s\u0000-\u001f]*[=+@-]/.test(text) ? `'${text}` : text;
      };
      const cell = (value) => `"${protectFormula(value).replace(/"/g, '""')}"`;
      const rows = exportUsers.map((item) => [
        item.uid,
        item.email,
        item.displayName,
        item.role,
        item.emailVerified ? "Evet" : "Hayır",
        item.disabled ? "Evet" : "Hayır",
        item.banned === null ? "Bilinmiyor" : item.banned ? "Evet" : "Hayır",
        item.banReason,
        item.creationTime,
        item.lastSignInTime,
      ]);
      const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}`;
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `kineticai-users-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSuccess(`${exportUsers.length} kullanıcı kaydı CSV olarak indirildi.`);
    } catch (err) {
      setError(err.message || "Kullanıcı verileri indirilemedi.");
    } finally {
      setExportingUsers(false);
    }
  }

  async function publishUpdate(event) {
    event.preventDefault();

    if (!user || publishing) return;

    setPublishing(true);
    setError("");
    setSuccess("");

    try {
      const token = await user.getIdToken();

      const response = await fetch("/api/admin/updates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await readApiJson(response, "Güncelleme yayını");

      if (!response.ok) {
        throw new Error(data.error || "Güncelleme yayınlanamadı.");
      }

      setForm({ title: "", description: "", version: "", category: "feature", articleBody: "", coverImage: "", coverAlt: "", videoUrl: "" });
      setMediaUploadMessage(null);
      setSuccess("Güncelleme başarıyla yayınlandı.");

      await loadDashboard(user, true);
    } catch (err) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  }

  async function uploadUpdateMedia(event, kind) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file || !user || uploadingMedia || publishing) return;

    const mimeExtensions = kind === "image"
      ? { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" }
      : { "video/mp4": "mp4", "video/webm": "webm", "video/ogg": "ogv" };
    const extension = mimeExtensions[file.type];
    const sizeLimit = kind === "image" ? 8 * 1024 * 1024 : 50 * 1024 * 1024;
    if (!extension || file.size === 0 || file.size > sizeLimit) {
      setMediaUploadMessage({ kind, error: true, text: kind === "image"
        ? "PNG, JPG, WebP veya AVIF görsel seçin (en fazla 8 MB)."
        : "MP4, WebM veya OGV video seçin (en fazla 50 MB)." });
      return;
    }

    setUploadingMedia(kind);
    setMediaUploadMessage(null);
    try {
      if (!firebaseConfig.storageBucket) throw new Error("Firebase Storage bucket ayarı bulunamadı.");
      const tokenResult = await user.getIdTokenResult(true);
      if (tokenResult.claims.admin !== true) throw new Error("Yükleme için Firebase admin yetkisi gerekiyor.");
      const fileHead = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      const signature = Array.from(fileHead).map((byte) => String.fromCharCode(byte)).join("");
      const validSignature = kind === "image"
        ? (file.type === "image/jpeg" ? fileHead[0] === 0xff && fileHead[1] === 0xd8 && fileHead[2] === 0xff
          : file.type === "image/png" ? signature.startsWith("\x89PNG\r\n\x1a\n")
            : file.type === "image/webp" ? signature.startsWith("RIFF") && signature.slice(8, 12) === "WEBP"
              : signature.slice(4, 12).includes("ftyp") && /avif|avis/.test(signature.slice(8, 16)) )
        : (file.type === "video/mp4" ? signature.slice(4, 8) === "ftyp"
          : file.type === "video/webm" ? fileHead[0] === 0x1a && fileHead[1] === 0x45 && fileHead[2] === 0xdf && fileHead[3] === 0xa3
            : signature.startsWith("OggS"));
      if (!validSignature) throw new Error("Dosya içeriği seçilen medya türüyle uyuşmuyor.");

      const app = getApps()[0] || initializeApp(firebaseConfig);
      const storage = getStorage(app);
      const objectName = `${Date.now()}-${globalThis.crypto.randomUUID()}.${extension}`;
      const objectRef = ref(storage, `updates/${user.uid}/${objectName}`);
      await uploadBytes(objectRef, file, {
        contentType: file.type,
        cacheControl: "public,max-age=31536000,immutable",
      });
      const downloadUrl = await getDownloadURL(objectRef);
      setForm((current) => ({ ...current, [kind === "image" ? "coverImage" : "videoUrl"]: downloadUrl }));
      setMediaUploadMessage({ kind, text: kind === "image" ? "Görsel yüklendi ve forma eklendi." : "Video yüklendi ve forma eklendi." });
    } catch (uploadError) {
      setMediaUploadMessage({ kind, error: true, text: uploadError.code === "storage/unauthorized"
        ? "Firebase Storage erişimi reddedildi. storage.rules dosyasındaki admin yükleme kuralının projeye dağıtıldığını kontrol edin."
        : uploadError.message || "Medya yüklenemedi. Storage ayarlarını ve bağlantıyı kontrol edin." });
    } finally {
      setUploadingMedia("");
    }
  }

  async function updateFeedbackStatus(report, status) {
    if (!user || feedbackActionId) return;
    setFeedbackActionId(report.id);
    setError("");
    setSuccess("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: report.id, status }),
      });
      const data = await readApiJson(response, "Bildirim durumu");
      if (!response.ok || data.success !== true) throw new Error(data.error || "Bildirim durumu değiştirilemedi.");
      setFeedbackReports((reports) => reports.map((item) => item.id === report.id ? { ...item, status } : item));
      setSuccess("Bildirim durumu güncellendi.");
    } catch (err) {
      setError(err.message || "Bildirim durumu değiştirilemedi.");
    } finally {
      setFeedbackActionId("");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080910] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-5" />
          <p className="text-sm text-gray-400">KineticAI yönetim merkezi açılıyor...</p>
        </div>
      </div>
    );
  }

  if (!user || accessDenied) {
    return (
      <div className="min-h-[100dvh] bg-[#080910] px-5 text-white grid place-items-center safe-top safe-bottom">
        <div className="w-full max-w-md text-center">
          <p className="font-mono text-7xl font-semibold tracking-tight text-white">404</p>
          <h1 className="mt-4 text-xl font-semibold">Sayfa bulunamadı</h1>
          <p className="mt-2 text-sm leading-6 text-gray-400">Aradığın sayfa mevcut olmayabilir veya taşınmış olabilir.</p>
          <Link href="/" className="touch-target mt-6 inline-flex items-center justify-center rounded-xl border border-white/10 px-5 text-sm font-medium transition hover:bg-white/[0.06]">
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    );
  }

  const currentPage = navigation.find((item) => item.id === activeTab);

  return (
    <div className="min-h-screen bg-[#080910] text-white flex">

      {/* Mobile backdrop */}
      {mobileMenu && (
        <button
          aria-label="Menüyü kapat"
          onClick={() => setMobileMenu(false)}
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 z-50 h-dvh w-[min(265px,calc(100vw-2rem))] shrink-0 border-r border-white/[0.07] bg-[#0d0f19] flex flex-col pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ${
        mobileMenu ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        <div className="h-[88px] px-7 flex items-center justify-between border-b border-white/[0.07]">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center font-black text-lg shadow-lg shadow-violet-900/30">
              K
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight">
                Kinetic<span className="text-violet-400">AI</span>
              </div>
              <div className="text-[10px] tracking-[2px] uppercase text-gray-500">
                Control Center
              </div>
            </div>
          </Link>
            <button aria-label="Menüyü kapat" onClick={() => setMobileMenu(false)} className="touch-target md:hidden text-gray-400 text-xl">×</button>
        </div>

        <div className="px-5 pt-8">
          <p className="text-[10px] uppercase tracking-[2px] text-gray-600 font-bold px-3 mb-4">
            Yönetim
          </p>

          <nav className="space-y-1.5">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition ${
                  activeTab === item.id
                    ? "bg-violet-500/15 text-violet-300 border border-violet-500/20"
                    : "text-gray-500 hover:text-white hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <span className="text-xl w-6 text-center">{item.icon}</span>
                {item.label}
                {activeTab === item.id && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-5">
          <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/5 border border-violet-500/10 p-4 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-emerald-300">Yönetim oturumu açık</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-5">
              Firebase güvenli kimlik doğrulaması etkin.
            </p>
          </div>

          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 text-violet-300 flex items-center justify-center font-bold">
              {(user.email || "A")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{user.email}</p>
              <p className="text-[10px] text-violet-400 mt-1">{isFounder ? "KURUCU" : "ADMIN"}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">

        {/* Header */}
        <header className="min-h-[72px] pt-[env(safe-area-inset-top)] border-b border-white/[0.07] bg-[#0b0d15]/80 backdrop-blur-xl sticky top-0 z-30 px-3 sm:px-5 md:px-9 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button aria-label="Yönetim menüsünü aç" onClick={() => setMobileMenu(true)} className="touch-target md:hidden text-2xl text-gray-400">
              ☰
            </button>
            <div>
              <div className="text-[11px] text-gray-500 mb-1">
                KineticAI / Admin / {currentPage?.label}
              </div>
              <h1 className="text-lg md:text-xl font-bold">{currentPage?.label}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-emerald-300 font-medium">Admin aktif</span>
            </div>

            <button
              onClick={() => loadDashboard(user, true, usersPageToken)}
              disabled={refreshing}
              className="h-10 px-4 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-sm transition disabled:opacity-50"
            >
              <span className={refreshing ? "inline-block animate-spin mr-2" : "mr-2"}>↻</span>
              <span className="hidden sm:inline">Yenile</span>
            </button>
          </div>
        </header>

        <div className="p-3 sm:p-5 md:p-9 max-w-[1600px] mx-auto">

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/[0.07] text-red-300 p-4 text-sm flex justify-between gap-3">
              {error}
              <button onClick={() => setError("")}>×</button>
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300 p-4 text-sm flex justify-between gap-3">
              {success}
              <button onClick={() => setSuccess("")}>×</button>
            </div>
          )}

          {/* DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">

              <section className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-r from-[#211642] via-[#17152e] to-[#101a32] p-7 md:p-10">
                <div className="absolute -right-20 -top-32 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
                <div className="absolute right-20 -bottom-40 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
                <div className="relative max-w-2xl">
                  <span className="inline-flex items-center gap-2 rounded-full bg-violet-400/10 border border-violet-300/20 px-3 py-1.5 text-[10px] font-bold tracking-wider text-violet-300 uppercase mb-5">
                    ✦ KineticAI Management
                  </span>
                  <h2 className="text-3xl md:text-4xl font-black leading-tight">
                    Yönetim merkezine
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-blue-300">
                      hoş geldin.
                    </span>
                  </h2>
                  <p className="text-sm text-gray-400 mt-4 leading-6 max-w-lg">
                    Kullanıcılarını yönet, sistem durumunu incele ve KineticAI güncellemelerini tek merkezden yayınla.
                  </p>
                  <button
                    onClick={() => setActiveTab("updates")}
                    className="mt-7 rounded-xl bg-white text-[#171329] px-5 py-3 text-sm font-bold hover:bg-violet-100 transition"
                  >
                    Güncelleme yayınla →
                  </button>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-lg">Sistem istatistikleri</h3>
                    <p className="text-xs text-gray-500 mt-1">Firebase üzerinden alınan kullanıcı verileri</p>
                  </div>
                  <span className="text-[10px] text-gray-600">İlk 100 hesap</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
                  <StatCard label="Toplam kullanıcı" value={stats.total} icon="♙" color="violet" detail="Yüklenen hesaplar" />
                  <StatCard label="E-posta onaylı" value={stats.verified} icon="✓" color="emerald" detail="Doğrulanmış hesaplar" />
                  <StatCard label="Yönetici" value={stats.admins} icon="◇" color="blue" detail={`${stats.founders} kurucu`} />
                  <StatCard label="Tester hesapları" value={stats.testers} icon="⌘" color="blue" detail="Tester yetkisi olanlar" />
                  <StatCard label="Devre dışı hesaplar" value={stats.disabled} icon="⊘" color="amber" detail="Kapalı hesaplar" />
                  <StatCard label="KineticAI yasağı" value={stats.banned} icon="⊗" color="amber" detail="Yasaklı hesaplar" />
                  <StatCard label="Yeni bildirim" value={feedbackError ? "—" : feedbackReports.filter((report) => report.status === "new").length} icon="✉" color="violet" detail={feedbackError ? "Veri alınamadı" : `${feedbackReports.length} son kayıt`} />
                </div>
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                <div className="xl:col-span-2 rounded-2xl border border-white/[0.07] bg-[#10121d] overflow-hidden">
                  <div className="p-5 md:p-6 flex items-center justify-between border-b border-white/[0.06]">
                    <div>
                      <h3 className="font-bold">Son kullanıcılar</h3>
                      <p className="text-xs text-gray-500 mt-1">Firebase kullanıcı kayıtları</p>
                    </div>
                    <button onClick={() => setActiveTab("users")} className="text-xs text-violet-300 hover:text-white">
                      Tümünü gör →
                    </button>
                  </div>

                  <div className="divide-y divide-white/[0.05]">
                    {users.slice(0, 5).map((item) => (
                      <div key={item.uid} className="flex items-center gap-3 px-5 md:px-6 py-4">
                        <Avatar name={item.displayName || item.email} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.displayName}</p>
                          <p className="text-xs text-gray-500 truncate mt-1">{item.email}</p>
                        </div>
                        <RoleBadge role={item.role} />
                      </div>
                    ))}
                    {users.length === 0 && (
                      <p className="p-6 text-sm text-gray-500">Henüz kullanıcı bulunamadı.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-[#10121d] p-6">
                  <h3 className="font-bold">Sistem özeti</h3>
                  <p className="text-xs text-gray-500 mt-1 mb-6">Mevcut yönetim verileri</p>

                  <div className="space-y-5">
                    <SummaryRow label="Yönetici" value={stats.admins} color="violet" />
                    <SummaryRow label="Kurucu" value={stats.founders} color="blue" />
                    <SummaryRow label="Tester" value={stats.testers} color="blue" />
                    <SummaryRow label="Yasaklı kullanıcı" value={stats.banned} color="amber" />
                    <SummaryRow label="Normal kullanıcı" value={users.filter((u) => u.role === "user").length} color="gray" />
                    <SummaryRow label="Güncellemeler" value={updates.length} color="emerald" />
                    <SummaryRow label="Yeni geri bildirim" value={feedbackError ? "—" : feedbackReports.filter((report) => report.status === "new").length} color="violet" />
                  </div>

                  <div className="mt-7 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/10 p-4">
                    <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                      Yönetim API&apos;si erişilebilir
                    </div>
                    <p className="text-[11px] text-gray-500 mt-2 leading-5">
                      Bu durum son başarılı veri yüklemesine dayalıdır.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/[0.07] bg-[#10121d] p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold">Son güncellemeler</h3>
                    <p className="text-xs text-gray-500 mt-1">Yayın geçmişi</p>
                  </div>
                  <button onClick={() => setActiveTab("updates")} className="text-xs text-violet-300">
                    Yönet →
                  </button>
                </div>

                {updates.length === 0 ? (
                  <p className="text-sm text-gray-500">Henüz güncelleme yayınlanmadı.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {updates.slice(0, 3).map((item) => (
                      <div key={item.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <div className="flex justify-between gap-3">
                          <p className="text-sm font-semibold">{item.title}</p>
                          <span className="text-[10px] text-violet-300 whitespace-nowrap">{item.version}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-3 line-clamp-2">{item.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* USERS */}
          {activeTab === "users" && (
            <div className="space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Kullanıcı yönetimi</h2>
                  <p className="text-sm text-gray-500 mt-2">
                    Kayıtlı hesapları incele ve yetki durumlarını görüntüle.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {filteredUsers.length} kullanıcı gösteriliyor
                  </span>
                  <button
                    type="button"
                    onClick={downloadFilteredUsers}
                    disabled={users.length === 0 || exportingUsers}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Download size={15} aria-hidden="true" />
                    {exportingUsers ? "Hazırlanıyor…" : "CSV indir"}
                  </button>
                </div>
              </div>

              {usersError && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-200">
                  <span>{usersError}</span>
                  <button type="button" onClick={() => loadDashboard(user, true, usersPageToken)} className="min-h-10 rounded-lg border border-white/10 px-3 text-xs font-semibold hover:bg-white/[0.05]">Yeniden dene</button>
                </div>
              )}

              {usersWarning && (
                <div role="status" className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm leading-relaxed text-amber-200">
                  {usersWarning}
                </div>
              )}

              <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
                <MiniStat label="Toplam" value={stats.total} />
                <MiniStat label="Admin" value={stats.admins} />
                <MiniStat label="Kurucu" value={stats.founders} />
                <MiniStat label="Tester" value={stats.testers} />
                <MiniStat label="Yasaklı" value={usersWarning ? "—" : stats.banned} />
                <MiniStat label="Onaylı e-posta" value={stats.verified} />
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-[#10121d] overflow-hidden">
                <div className="p-4 md:p-5 flex flex-col md:flex-row gap-3 border-b border-white/[0.06]">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">⌕</span>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="E-posta, isim veya UID ara..."
                      className="w-full h-11 rounded-xl bg-[#080a12] border border-white/[0.07] pl-11 pr-4 text-sm outline-none focus:border-violet-500/50"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="w-full min-w-40 sm:w-48">
                      <CustomSelect
                        ariaLabel="Kullanıcı rolüne göre filtrele"
                        value={roleFilter}
                        onChange={setRoleFilter}
                        options={[
                          { value: "all", label: "Tüm roller" },
                          { value: "founder", label: "Kurucu" },
                          { value: "admin", label: "Admin" },
                          { value: "tester", label: "Tester" },
                          { value: "user", label: "Kullanıcı" },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[980px]">
                    <thead className="bg-white/[0.025] text-[10px] uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="px-6 py-4">Kullanıcı</th>
                        <th className="px-6 py-4">UID</th>
                        <th className="px-6 py-4">Yetki</th>
                        <th className="px-6 py-4">E-posta</th>
                        <th className="px-6 py-4">Son giriş</th>
                        <th className="px-6 py-4">Durum</th>
                        <th className="px-6 py-4">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredUsers.map((item) => (
                        <tr key={item.uid} className="hover:bg-white/[0.025] transition">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={item.displayName || item.email} />
                              <div>
                                <p className="text-sm font-semibold">{item.displayName}</p>
                                <p className="text-xs text-gray-500 mt-1">{item.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                            {item.uid.slice(0, 12)}...
                          </td>
                          <td className="px-6 py-4"><RoleBadge role={item.role} /></td>
                          <td className="px-6 py-4">
                            <span className={item.emailVerified ? "text-emerald-400" : "text-amber-400"}>
                              {item.emailVerified ? "✓ Onaylı" : "○ Onaysız"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400">
                            {formatDate(item.lastSignInTime)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col items-start gap-1.5">
                              <StatusBadge disabled={item.disabled} />
                              <span className={`inline-flex items-center gap-1.5 text-[11px] ${item.banStatusAvailable === false ? "text-amber-300" : item.banned ? "text-red-300" : "text-gray-500"}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${item.banStatusAvailable === false ? "bg-amber-400" : item.banned ? "bg-red-400" : "bg-gray-600"}`} />
                                {item.banStatusAvailable === false ? "Yasak durumu bilinmiyor" : item.banned ? "KineticAI yasaklı" : "KineticAI erişimi açık"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {(() => {
                              const privilegedTarget = item.role === "admin" || item.role === "founder";
                              const cannotManage = item.uid === user?.uid || (privilegedTarget && !isFounder);
                              const banStatusUnavailable = item.banStatusAvailable === false;
                              const isBusy = banActionUid === item.uid;
                              return (
                                <button
                                  type="button"
                                  onClick={() => toggleUserBan(item)}
                                  disabled={cannotManage || banStatusUnavailable || Boolean(banActionUid)}
                                  title={banStatusUnavailable ? "Firestore yasak durumu okunamadı" : cannotManage ? (item.uid === user?.uid ? "Kendi hesabınızda bu işlem yapılamaz" : "Yönetici hesaplarını yalnızca kurucu yönetebilir") : undefined}
                                  className={`inline-flex min-w-[135px] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${item.banned ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300 hover:bg-emerald-500/10" : "border-red-500/20 bg-red-500/[0.06] text-red-300 hover:bg-red-500/10"}`}
                                >
                                  {item.banned ? <ShieldCheck size={14} aria-hidden="true" /> : <Ban size={14} aria-hidden="true" />}
                                  {isBusy ? "İşleniyor…" : banStatusUnavailable ? "Durum alınamadı" : item.banned ? "Yasağı kaldır" : "Yasakla"}
                                </button>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {users.length === 0 && (
                    <div className="p-12 text-center">
                      {loading || refreshing ? (
                        <>
                          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                          <p role="status" className="text-sm text-gray-400">Firebase kullanıcıları yükleniyor…</p>
                        </>
                      ) : usersError ? (
                        <>
                          <div className="mb-3 text-3xl text-amber-300">!</div>
                          <p className="text-sm text-gray-300">Kullanıcı verisi alınamadı.</p>
                          <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-gray-500">{usersError}</p>
                          <button
                            type="button"
                            onClick={() => loadDashboard(user, true, usersPageToken)}
                            className="mt-4 min-h-11 rounded-xl border border-white/10 px-4 text-xs font-semibold hover:bg-white/[0.05]"
                          >
                            Yeniden dene
                          </button>
                        </>
                      ) : search || roleFilter !== "all" ? (
                        <>
                          <div className="mb-3 text-3xl text-gray-600">⌕</div>
                          <p className="text-sm text-gray-400">Aramana uygun kullanıcı bulunamadı.</p>
                        </>
                      ) : (
                        <>
                          <div className="mb-3 text-3xl text-gray-600">♙</div>
                          <p className="text-sm text-gray-400">Firebase Authentication&apos;da henüz kullanıcı yok.</p>
                        </>
                      )}
                    </div>
                  )}
                  {users.length > 0 && filteredUsers.length === 0 && (
                    <div className="p-12 text-center">
                      <div className="mb-3 text-3xl text-gray-600">⌕</div>
                      <p className="text-sm text-gray-400">Aramana uygun kullanıcı bulunamadı.</p>
                    </div>
                  )}
                </div>
              </div>

              {(usersPageHistory.length > 0 || nextUsersPageToken) && (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={loading || refreshing || usersPageHistory.length === 0}
                    onClick={() => {
                      const previousToken = usersPageHistory[usersPageHistory.length - 1] || "";
                      setUsersPageHistory((history) => history.slice(0, -1));
                      loadDashboard(user, true, previousToken);
                    }}
                    className="min-h-10 rounded-xl border border-white/10 px-4 text-xs font-medium disabled:opacity-40"
                  >Önceki 100</button>
                  <span className="text-xs text-gray-500">{usersPageHistory.length + 1}. sayfa · {users.length} hesap</span>
                  <button
                    type="button"
                    disabled={loading || refreshing || !nextUsersPageToken}
                    onClick={() => {
                      setUsersPageHistory((history) => [...history, usersPageToken]);
                      loadDashboard(user, true, nextUsersPageToken);
                    }}
                    className="min-h-10 rounded-xl border border-white/10 px-4 text-xs font-medium disabled:opacity-40"
                  >Sonraki 100</button>
                </div>
              )}

              <p className="text-xs text-gray-600">
                Her sayfada 100 Firebase Authentication hesabı görüntülenir. CSV, arama ve rol filtresine uyan tüm hesap kayıtlarını sayfalar halinde indirir. KineticAI yasağı uygulama erişimini engeller; Firebase hesabını veya kota kayıtlarını silmez.
              </p>
            </div>
          )}

          {activeTab === "feedback" && (
            <section className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold">Geri bildirim kuyruğu</h2>
                <p className="mt-2 text-sm text-gray-500">Hata raporlarını, güvenlik bildirimlerini ve ürün önerilerini inceleyip durumlandır.</p>
              </div>
              {feedbackError ? (
                <div role="alert" className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-200">{feedbackError}</div>
              ) : feedbackReports.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-[#10121d] px-5 py-12 text-center">
                  <p className="text-base font-semibold">Henüz bildirim yok</p>
                  <p className="mt-2 text-sm text-gray-500">Kullanıcıların gönderdiği geri bildirimler burada listelenir.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feedbackReports.map((report) => (
                    <article key={report.id} className="rounded-2xl border border-white/[0.08] bg-[#10121d] p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words text-base font-semibold">{report.title}</h3>
                            <span className="rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-2.5 py-1 text-[11px] text-violet-200">{{ feedback: "Geri bildirim", bug: "Hata", suggestion: "Öneri", security: "Güvenlik" }[report.type] || "Bildirim"}</span>
                          </div>
                          <p className="mt-2 text-xs text-gray-500">{formatDate(report.createdAt)} · {report.source} · {report.contactEmail || "Yanıt e-postası yok"}</p>
                        </div>
                        <div className="min-w-36">
                          <CustomSelect
                            ariaLabel={`${report.title} durumu`}
                            value={report.status}
                            disabled={feedbackActionId === report.id}
                            onChange={(status) => updateFeedbackStatus(report, status)}
                            options={[
                              { value: "new", label: "Yeni" },
                              { value: "reviewing", label: "İnceleniyor" },
                              { value: "resolved", label: "Çözüldü" },
                              { value: "closed", label: "Kapatıldı" },
                            ]}
                          />
                        </div>
                      </div>
                      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-gray-300">{report.details}</p>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3 text-xs text-gray-500">
                        <span>Ref: <code className="font-mono">{report.id}</code>{report.userId ? ` · Hesap: ${report.userId}` : " · Misafir bildirimi"}</span>
                        {report.contactEmail && <a className="text-violet-300 hover:text-violet-200" href={`mailto:${encodeURIComponent(report.contactEmail)}?subject=${encodeURIComponent(`KineticAI bildiriminiz: ${report.title}`)}`}>E-posta ile yanıtla</a>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* UPDATES */}
          {activeTab === "updates" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Güncelleme merkezi</h2>
                <p className="text-sm text-gray-500 mt-2">
                  KineticAI kullanıcılarına sürüm notları ve duyurular yayınla.
                </p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

                <form
                  onSubmit={publishUpdate}
                  className="xl:col-span-3 rounded-2xl border border-white/[0.07] bg-[#10121d] p-4 sm:p-6 md:p-8 space-y-5"
                >
                  <div className="flex items-center gap-3 pb-5 border-b border-white/[0.06]">
                    <div className="w-11 h-11 rounded-xl bg-violet-500/15 text-violet-300 flex items-center justify-center text-xl">✎</div>
                    <div>
                      <h3 className="font-bold">Yeni yayın oluştur</h3>
                      <p className="text-xs text-gray-500 mt-1">Yeni bir güncelleme hazırla</p>
                    </div>
                  </div>

                  <Field label="Güncelleme başlığı">
                    <input
                      required
                      maxLength={120}
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Örn. KineticAI yeni arayüzü"
                      className="admin-input"
                    />
                  </Field>

                  <Field label="Sürüm numarası">
                    <input
                      maxLength={30}
                      value={form.version}
                      onChange={(e) => setForm({ ...form, version: e.target.value })}
                      placeholder="Örn. 2.1.0"
                      className="admin-input"
                    />
                  </Field>

                  <Field label="Tür">
                    <CustomSelect
                      ariaLabel="Güncelleme türü"
                      value={form.category}
                      onChange={(category) => setForm((current) => ({ ...current, category }))}
                      options={[
                        { value: "feature", label: "Yeni özellik" },
                        { value: "improvement", label: "İyileştirme" },
                        { value: "fix", label: "Hata düzeltmesi" },
                        { value: "announcement", label: "Duyuru" },
                      ]}
                    />
                  </Field>

                  <Field label="Kısa açıklama">
                    <textarea
                      required
                      maxLength={280}
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Güncellemenin özünü bir iki cümlede anlat..."
                      className="admin-input resize-y"
                    />
                    <p className="text-right text-[10px] text-gray-600 mt-2">
                      {form.description.length}/280
                    </p>
                  </Field>

                  <Field label="Ayrıntılı yazı (isteğe bağlı)">
                    <textarea
                      maxLength={20000}
                      rows={12}
                      value={form.articleBody}
                      onChange={(e) => setForm({ ...form, articleBody: e.target.value })}
                      placeholder="Büyük bir sürümse nelerin değiştiğini başlıklar ve paragraflarla anlat. Markdown başlıkları ve listeler kullanılabilir."
                      className="admin-input resize-y"
                    />
                    <p className="mt-2 text-xs leading-5 text-gray-500">Ayrıntılı içerik eklenirse güncelleme kartından bu yazının sayfasına bağlantı verilir.</p>
                  </Field>

                  <Field label="Kapak görseli (isteğe bağlı)">
                    <input
                      maxLength={300}
                      value={form.coverImage}
                      onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                      placeholder="/updates/ozellik-gorseli.webp"
                      className="admin-input"
                    />
                    <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/15 px-4 text-center text-sm text-gray-300 transition hover:border-violet-400/50 hover:bg-white/[0.025]">
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={Boolean(uploadingMedia) || publishing} onChange={(event) => uploadUpdateMedia(event, "image")} className="sr-only" />
                      {uploadingMedia === "image" ? "Görsel yükleniyor…" : "Cihazdan görsel seç · en fazla 8 MB"}
                    </label>
                    <p className="mt-2 text-xs leading-5 text-gray-500">Dosyayı doğrudan yükleyin veya bu projedeki bir public görsel yolunu girin.</p>
                    {(form.coverImage.startsWith("/") && !form.coverImage.startsWith("//") && !form.coverImage.includes("..") && !form.coverImage.includes("\\") && /\.(?:png|jpe?g|webp|avif)$/i.test(form.coverImage) || form.coverImage.startsWith("https://firebasestorage.googleapis.com/")) && (
                      <div className="relative mt-3 aspect-video max-w-lg overflow-hidden rounded-xl border border-white/10 bg-black/30">
                        <Image src={form.coverImage} alt={form.coverAlt || "Güncelleme kapak görseli önizlemesi"} fill unoptimized sizes="(max-width: 768px) 100vw, 512px" className="object-cover" />
                      </div>
                    )}
                    {mediaUploadMessage?.kind === "image" && <p className={`mt-2 text-xs leading-5 ${mediaUploadMessage.error ? "text-red-300" : "text-emerald-300"}`} role={mediaUploadMessage.error ? "alert" : "status"}>{mediaUploadMessage.text}</p>}
                  </Field>

                  <Field label="Görsel açıklaması (erişilebilirlik için)">
                    <input maxLength={200} value={form.coverAlt} onChange={(e) => setForm({ ...form, coverAlt: e.target.value })} placeholder="Görselde ne gösteriliyor?" className="admin-input" />
                  </Field>

                  <Field label="Video (isteğe bağlı)">
                    <input maxLength={500} value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="YouTube/Vimeo bağlantısı veya /updates/demo.mp4" className="admin-input" />
                    <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/15 px-4 text-center text-sm text-gray-300 transition hover:border-violet-400/50 hover:bg-white/[0.025]">
                      <input type="file" accept="video/mp4,video/webm,video/ogg" disabled={Boolean(uploadingMedia) || publishing} onChange={(event) => uploadUpdateMedia(event, "video")} className="sr-only" />
                      {uploadingMedia === "video" ? "Video yükleniyor…" : "Cihazdan video seç · en fazla 50 MB"}
                    </label>
                    <p className="mt-2 text-xs leading-5 text-gray-500">YouTube/Vimeo bağlantısı veya doğrudan yükleme. Video dosyaları herkese açık güncelleme sayfasında oynatılır.</p>
                    {form.videoUrl && <p className="mt-2 break-all text-xs text-violet-300">Video adresi girildi · Yayın öncesinde ayrıntı sayfasında gösterilir. Yalnızca paylaşma hakkınız olan medyayı ekleyin.</p>}
                    {mediaUploadMessage?.kind === "video" && <p className={`mt-2 text-xs leading-5 ${mediaUploadMessage.error ? "text-red-300" : "text-emerald-300"}`} role={mediaUploadMessage.error ? "alert" : "status"}>{mediaUploadMessage.text}</p>}
                  </Field>

                  <button
                    disabled={publishing || Boolean(uploadingMedia)}
                    className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:brightness-110 disabled:opacity-50 py-3.5 font-bold text-sm shadow-lg shadow-violet-900/20 transition"
                  >
                    {publishing ? "Yayın hazırlanıyor..." : "↗  Güncellemeyi yayınla"}
                  </button>
                </form>

                <div className="xl:col-span-2 rounded-2xl border border-white/[0.07] bg-[#10121d] p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-bold">Yayın geçmişi</h3>
                      <p className="text-xs text-gray-500 mt-1">{updates.length} kayıt</p>
                    </div>
                    <span className="text-xl text-violet-300">◷</span>
                  </div>

                  {updates.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-3xl text-gray-600 mb-3">↗</div>
                      <p className="text-sm text-gray-400">Henüz yayın yok.</p>
                      <p className="text-xs text-gray-600 mt-2">İlk güncellemeni buradan oluşturabilirsin.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[700px] overflow-y-auto">
                      {updates.map((item) => (
                        <article key={item.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-sm font-semibold">{item.title}</h4>
                            <span className="shrink-0 rounded-md bg-violet-500/10 px-2 py-1 text-[10px] text-violet-300">
                              {item.version || "Sürüm yok"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 leading-5 mt-3 whitespace-pre-wrap">
                            {item.description}
                          </p>
                          <p className="text-[10px] text-gray-600 mt-4">
                            {formatDate(item.createdAt)}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <footer className="mt-12 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row justify-between gap-3 text-[10px] text-gray-600">
            <span>© 2026 KineticAI · Administration</span>
            <span>Güvenli yönetim merkezi</span>
          </footer>
        </div>
      </main>

      <style jsx global>{`
        .admin-input {
          display: block;
          width: 100%;
          background: #080a12;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          padding: 13px 15px;
          color: white;
          font-size: 13px;
          outline: none;
          transition: border-color .2s;
        }
        .admin-input:focus {
          border-color: rgba(139,92,246,.65);
        }
        .admin-input::placeholder {
          color: #55576a;
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, icon, color, detail }) {
  const colors = {
    violet: "text-violet-300 bg-violet-500/10 border-violet-500/10",
    emerald: "text-emerald-300 bg-emerald-500/10 border-emerald-500/10",
    blue: "text-blue-300 bg-blue-500/10 border-blue-500/10",
    amber: "text-amber-300 bg-amber-500/10 border-amber-500/10",
  };

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#10121d] p-5 hover:border-white/[0.13] transition">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg ${colors[color]}`}>
          {icon}
        </span>
      </div>
      <p className="text-3xl font-black mt-5">{value}</p>
      <p className="text-[10px] text-gray-600 mt-2">{detail}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-[#10121d] border border-white/[0.06] p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, color }) {
  const colors = {
    violet: "bg-violet-400",
    blue: "bg-blue-400",
    gray: "bg-gray-500",
    emerald: "bg-emerald-400",
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span className={`w-2 h-2 rounded-full ${colors[color]}`} />
        {label}
      </div>
      <span className="font-bold text-sm">{value}</span>
    </div>
  );
}

function Avatar({ name }) {
  const letter = (name || "?").trim()[0]?.toUpperCase() || "?";

  return (
    <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-violet-500/30 to-blue-500/20 border border-white/[0.08] flex items-center justify-center text-sm font-bold text-violet-200">
      {letter}
    </div>
  );
}

function RoleBadge({ role }) {
  const styles = {
    founder: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    admin: "bg-violet-500/10 text-violet-300 border-violet-500/20",
    tester: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    user: "bg-white/[0.05] text-gray-400 border-white/[0.08]",
  };

  const current = styles[role] || styles.user;

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${current}`}>
      {(role || "user").toUpperCase()}
    </span>
  );
}

function StatusBadge({ disabled }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] ${disabled ? "text-red-400" : "text-emerald-400"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${disabled ? "bg-red-400" : "bg-emerald-400"}`} />
      {disabled ? "Devre dışı" : "Aktif"}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
