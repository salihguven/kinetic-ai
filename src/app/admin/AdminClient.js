
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Ban, Download, ShieldCheck } from "lucide-react";
import { readApiJson } from "@/lib/apiResponse";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
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

  const [form, setForm] = useState({
    title: "",
    description: "",
    version: "",
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
      const [usersResult, updatesResult] = await Promise.allSettled([
        fetch(`/api/admin/users?${usersParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }).then(async (response) => ({ response, data: await readApiJson(response, "Kullanıcı listesi") })),
        fetch("/api/admin/updates", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }).then(async (response) => ({ response, data: await readApiJson(response, "Güncelleme listesi") })),
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

      setForm({ title: "", description: "", version: "" });
      setSuccess("Güncelleme başarıyla yayınlandı.");

      await loadDashboard(user, true);
    } catch (err) {
      setError(err.message);
    } finally {
      setPublishing(false);
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
      <div className="min-h-screen bg-[#080910] flex items-center justify-center p-6 text-white">
        <div className="max-w-md w-full rounded-3xl border border-white/10 bg-[#11131e] p-10 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center text-3xl mx-auto mb-6">
            ⛨
          </div>
          <h1 className="text-2xl font-bold mb-3">
            {user ? "Erişim reddedildi" : "Giriş gerekli"}
          </h1>
          <p className="text-gray-400 text-sm leading-6">
            {error || (user
              ? "Bu alana erişmek için doğrulanmış Admin yetkisi gerekiyor."
              : "Admin panelini kullanmak için hesabına giriş yapmalısın.")}
          </p>
          <Link href="/" className="inline-flex mt-7 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 transition font-semibold">
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
      <aside className={`fixed md:sticky top-0 left-0 z-50 h-screen w-[265px] shrink-0 border-r border-white/[0.07] bg-[#0d0f19] flex flex-col transition-transform duration-300 ${
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
          <button onClick={() => setMobileMenu(false)} className="md:hidden text-gray-400 text-xl">×</button>
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
        <header className="h-[88px] border-b border-white/[0.07] bg-[#0b0d15]/80 backdrop-blur-xl sticky top-0 z-30 px-5 md:px-9 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenu(true)} className="md:hidden text-2xl text-gray-400">
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

        <div className="p-5 md:p-9 max-w-[1600px] mx-auto">

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
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="h-11 rounded-xl bg-[#080a12] border border-white/[0.07] px-4 text-sm text-gray-300 outline-none"
                    >
                      <option value="all">Tüm roller</option>
                      <option value="founder">Kurucu</option>
                      <option value="admin">Admin</option>
                      <option value="tester">Tester</option>
                      <option value="user">User</option>
                    </select>
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
                  className="xl:col-span-3 rounded-2xl border border-white/[0.07] bg-[#10121d] p-6 md:p-8 space-y-5"
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

                  <Field label="Güncelleme açıklaması">
                    <textarea
                      required
                      maxLength={5000}
                      rows={7}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Bu sürümde neler değişti? Kullanıcılara anlat..."
                      className="admin-input resize-y"
                    />
                    <p className="text-right text-[10px] text-gray-600 mt-2">
                      {form.description.length}/5000
                    </p>
                  </Field>

                  <button
                    disabled={publishing}
                    className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:brightness-110 disabled:opacity-50 py-3.5 font-bold text-sm shadow-lg shadow-violet-900/20 transition"
                  >
                    {publishing ? "Yayın hazırlanıyor..." : "↗  Güncellemeyi yayınla"}
                  </button>
                </form>

                <div className="xl:col-span-2 rounded-2xl border border-white/[0.07] bg-[#10121d] p-6">
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
            <span>© {new Date().getFullYear()} KineticAI · Administration</span>
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
