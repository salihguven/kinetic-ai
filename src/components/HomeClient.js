// src/components/HomeClient.js
"use client";

import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import CustomSelect from "@/components/CustomSelect";
import { readSSE } from "@/lib/sseClient";
import { doc, getDoc } from "firebase/firestore";
import BetaBadge from "@/components/BetaBadge";
import { auth, db } from "@/lib/firebase";
import { TRANSLATIONS } from "@/lib/i18n";
import { getMonthlyQuotaResetStatus } from "@/lib/quotaReset";
import {
  triggerHaptic,
  formatRelativeTime,
  formatFriendlyError,
} from "@/lib/uxHelpers";
import {
  Plus,
  Trash2,
  ArrowUp,
  Bot,
  Link2,
  AlertCircle,
  Sun,
  Moon,
  Copy,
  Check,
  RotateCcw,
  MessageSquare,
  RefreshCw,
  Paperclip,
  Square,
  Download,
  X,
  Search,
  Pencil,
  Mic,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  LogOut,
  BookOpen,
  CheckSquare,
  HelpCircle,
  Sliders,
  Scale,
  Ban,
  Menu,
  Bell,
  Globe,
  Sparkles,
  ArrowLeft,
  ArrowDown,
  UserRound,
  ChevronUp,
  ChevronDown,
  Settings,
  Brain,
} from "lucide-react";
import KineticLogo from "@/components/KineticLogo";
import ChatEmptyState from "@/components/ChatEmptyState";
import ProviderModal from "@/components/ProviderModal";
import MarkdownMessage from "@/components/MarkdownMessage";
import AccountModal from "@/components/AccountModal";
import LegalModal from "@/components/LegalModal";
import TutorModal from "@/components/TutorModal";
import NotebookStudio from "@/components/NotebookStudio";
import TaskManager from "@/components/TaskManager";
import ConfirmModal from "@/components/ConfirmModal";
import PermissionModal from "@/components/PermissionModal";
import UpdatesModal from "@/components/UpdatesModal";
import SettingsStudio from "@/components/SettingsStudio";
import { AppBootSkeleton, MessageSkeleton } from "@/components/SkeletonLoader";
import { getReasoningSupport, normalizeReasoningLevel } from "@/lib/reasoning";

const ASSISTANT_PRESETS = {
  general: {
    label: "Genel Asistan",
    prompt: "Sen KineticAI sisteminin net, dürüst ve yardımcı asistanısın. Türkçe yanıt ver.",
  },
  coder: {
    label: "Yazılım Uzmanı",
    prompt:
      "Sen kıdemli bir yazılım mühendisisin. Temiz, güvenli, hatasız ve açıklamalı kod yaz. Türkçe yanıt ver.",
  },
  tutor: {
    label: "Eğitmen & Öğretici",
    prompt:
      "Sen sabırlı bir öğretmensin. Konuları adım adım, örneklerle ve basit bir dille anlat. Türkçe yanıt ver.",
  },
  concise: {
    label: "Kısa & Net Özetleyici",
    prompt:
      "Gereksiz uzatma yapmadan maddeler halinde kısa, net ve doğrudan sonuca giden Türkçe yanıtlar ver.",
  },
};

const BRIDGE_MODES = {
  review: {
    label: "Denetle & Geliştir",
    system:
      "Birinci yapay zekanın ürettiği cevabı incele, eksiklerini tamamla, hatalarını düzelt ve kullanıcıya kusursuz final cevabı sun. Türkçe yanıt ver.",
    buildPrompt: (q, a) =>
      `Kullanıcının sorusu: "${q}"\n\n1. Yapay Zekanın yanıtı:\n"""\n${a}\n"""\n\nLütfen bu yanıtı geliştirip eksiksiz son haline getir.`,
  },
  code: {
    label: "Kodla & Güvenlik/Test Analizi",
    system:
      "İlk yapay zekanın yazdığı kodu incele; güvenlik açıklarını, olası bug'ları bul, daha temiz hale getir ve test senaryoları ekle. Türkçe yanıt ver.",
    buildPrompt: (q, a) =>
      `Görev: "${q}"\n\n1. Yapay Zekanın ürettiği kod/çözüm:\n"""\n${a}\n"""\n\nKodu denetle, hataları düzelt ve test önerileri sun.`,
  },
  debate: {
    label: "Tartış & Sentezle",
    system:
      "Birinci yapay zekanın fikrine farklı bir açıdan bak, artılarını-eksilerini tart ve iki görüşü birleştiren dengeli bir sentez çıkar. Türkçe yanıt ver.",
    buildPrompt: (q, a) =>
      `Konu/Soru: "${q}"\n\n1. Yapay Zekanın görüşü:\n"""\n${a}\n"""\n\nBu görüşe karşı alternatif perspektif sun ve ortak bir sentez oluştur.`,
  },
};

const getCurrentTimestamp = () => Date.now();

function createEmptyChat() {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    title: "Yeni Sohbet",
    messages: [],
    updatedAt: Date.now(),
  };
}

function getTodayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function applyTokenUsage(profile, dailyTokenUsage, modelTokenUsage) {
  if (!profile || !dailyTokenUsage) return profile;
  const { key, ...modelUsage } = modelTokenUsage || {};
  return {
    ...profile,
    tokenUsageDate: getTodayKey(),
    dailyTokenUsage,
    tokenUsageByModel: key
      ? { ...(profile.tokenUsageByModel || {}), [key]: modelUsage }
      : (profile.tokenUsageByModel || {}),
  };
}

export default function HomeClient() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [lang, setLang] = useState("tr");
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [isConnectionManagerOpen, setIsConnectionManagerOpen] = useState(false);
  const [refreshingProviderId, setRefreshingProviderId] = useState("");
  const [connectionNotice, setConnectionNotice] = useState("");
  const [connectionNoticeIsError, setConnectionNoticeIsError] = useState(false);

  const [providers, setProviders] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [editingChatId, setEditingChatId] = useState("");
  const [editingChatTitle, setEditingChatTitle] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  const [activeProviderId, setActiveProviderId] = useState("");
  const [reasoningLevel, setReasoningLevel] = useState("auto");
  const [reasoningLoaded, setReasoningLoaded] = useState(false);
  const [secondaryProviderId, setSecondaryProviderId] = useState("");
  const [chainMode, setChainMode] = useState(false);
  const [bridgeRole, setBridgeRole] = useState("review");
  const [autoFallback, setAutoFallback] = useState(true);
  const [assistantSettingsLoaded, setAssistantSettingsLoaded] = useState(false);

  const [assistantPreset, setAssistantPreset] = useState("general");
  const [customInstruction, setCustomInstruction] = useState("");
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSlowWait, setIsSlowWait] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [quotaResetLoading, setQuotaResetLoading] = useState(false);
  const [quotaResetError, setQuotaResetError] = useState("");
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [webSearch, setWebSearch] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [banUntil, setBanUntil] = useState(0);
  const [clockNow, setClockNow] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [isPermissionOpen, setIsPermissionOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false });

  const chatScrollRef = useRef(null);
  const chatAtBottomRef = useRef(true);
  const accountMenuRef = useRef(null);
  const voiceSegmentsRef = useRef([]);
  const voiceBaseInputRef = useRef("");
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const speechRecognitionRef = useRef(null);

  useEffect(() => () => speechRecognitionRef.current?.stop(), []);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const closeOnOutside = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      darkMode ? "#09090b" : "#d9dde4"
    );
  }, [lang, darkMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setReasoningLevel(normalizeReasoningLevel(localStorage.getItem("kinetic_ai_reasoning_level")));
      } catch {
        setReasoningLevel("auto");
      } finally {
        setReasoningLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!reasoningLoaded) return;
    try {
      localStorage.setItem("kinetic_ai_reasoning_level", reasoningLevel);
    } catch {
      // The current selection still applies for this page session.
    }
  }, [reasoningLevel, reasoningLoaded]);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.tr;
  const monthlyQuotaReset = getMonthlyQuotaResetStatus(userProfile || {}, new Date(clockNow || 0));
  const optClass = darkMode ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-900";
  const normalizedChatSearch = chatSearch.trim().toLocaleLowerCase(lang === "tr" ? "tr-TR" : "en-US");
  const remainingSec = banUntil
    ? Math.max(0, Math.ceil((banUntil - clockNow) / 1000))
    : 0;

  useEffect(() => {
    const timer = window.setTimeout(() => setClockNow(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const filteredChats = chats.filter((chat) =>
    `${chat.title} ${chat.messages?.map((message) => message.content).join(" ") || ""}`
      .toLocaleLowerCase(lang === "tr" ? "tr-TR" : "en-US")
      .includes(normalizedChatSearch)
  );

  // 1. Firebase Oturum & Ceza Takibi
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setFirebaseUser(null);
        setUserProfile(null);
        window.location.replace("/");
        return;
      }

      setAuthChecking(true);
      const today = getTodayKey();
      const baseProfile = {
        uid: user.uid,
        name: user.displayName || user.email?.split("@")[0] || "Kullanıcı",
        email: user.email || "",
        dailyCount: 0,
        lastResetDate: today,
        monthlyQuotaResetMonth: null,
        tokenUsageDate: today,
        dailyTokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        tokenUsageByModel: {},
        banned: false,
        banReason: "",
      };

      setFirebaseUser(user);

      try {
        const idToken = await user.getIdToken();
        const penRes = await fetch("/api/moderation/status", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (penRes.ok) {
          const penData = await penRes.json();
          if (penData.blocked && penData.remainingSeconds > 0) {
            const now = Date.now();
            setClockNow(now);
            setBanUntil(now + penData.remainingSeconds * 1000);
          }
        }
      } catch {
        // ignore
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await Promise.race([
          getDoc(userRef),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
        ]);

        if (snap.exists()) {
          const data = snap.data();
          const profile = {
            ...baseProfile,
            name: data.name || baseProfile.name,
            dailyCount: data.lastResetDate === today ? Number(data.dailyCount || 0) : 0,
            lastResetDate: today,
            monthlyQuotaResetMonth: data.monthlyQuotaResetMonth || null,
            tokenUsageDate: data.tokenUsageDate === today ? today : null,
            dailyTokenUsage: data.tokenUsageDate === today
              ? data.dailyTokenUsage || baseProfile.dailyTokenUsage
              : baseProfile.dailyTokenUsage,
            tokenUsageByModel: data.tokenUsageDate === today && data.tokenUsageByModel
              ? data.tokenUsageByModel
              : {},
            banned: Boolean(data.banned),
            banReason: data.banReason || "Topluluk kurallarını ihlal ettiniz.",
          };
          setUserProfile(profile);
        } else {
          setUserProfile(baseProfile);
        }
      } catch {
        setUserProfile(baseProfile);
      } finally {
        setAuthChecking(false);
      }
    });

    return () => unsub();
  }, []);

  // 2. Yerel Hafıza (Dil, Tema, Sağlayıcılar, Sohbetler)
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("kinetic_ai_lang");
      // Restoring browser-only preferences after hydration avoids a server/client markup mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedLang === "en" || savedLang === "tr") setLang(savedLang);

      const savedTheme = localStorage.getItem("kinetic_ai_theme");
      if (savedTheme === "light") setDarkMode(false);

      const savedAssistantSettings = localStorage.getItem("kinetic_ai_assistant_settings");
      if (savedAssistantSettings) {
        try {
          const parsed = JSON.parse(savedAssistantSettings);
          if (parsed && typeof parsed === "object") {
            if (Object.hasOwn(ASSISTANT_PRESETS, parsed.assistantPreset)) setAssistantPreset(parsed.assistantPreset);
            if (typeof parsed.customInstruction === "string") setCustomInstruction(parsed.customInstruction.slice(0, 3000));
            if (typeof parsed.autoFallback === "boolean") setAutoFallback(parsed.autoFallback);
            if (typeof parsed.chainMode === "boolean") setChainMode(parsed.chainMode);
            if (Object.hasOwn(BRIDGE_MODES, parsed.bridgeRole)) setBridgeRole(parsed.bridgeRole);
            if (typeof parsed.secondaryProviderId === "string") setSecondaryProviderId(parsed.secondaryProviderId);
          }
        } catch {
          localStorage.removeItem("kinetic_ai_assistant_settings");
        }
      }
      setAssistantSettingsLoaded(true);

      const notificationPreference = localStorage.getItem("kinetic_ai_notifications");
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        setNotificationsEnabled(notificationPreference !== "off");
      }

      const savedProviders = localStorage.getItem("kinetic_ai_providers");
      if (savedProviders) {
        const parsed = JSON.parse(savedProviders);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProviders(parsed);
          setActiveProviderId(parsed[0].id);
          setSecondaryProviderId(parsed[1]?.id || parsed[0].id);
        }
      }

      const savedChats = localStorage.getItem("kinetic_ai_chats");
      if (savedChats) {
        const parsedChats = JSON.parse(savedChats);
        if (Array.isArray(parsedChats) && parsedChats.length > 0) {
          setChats(parsedChats);
          setActiveChatId(parsedChats[0].id);
        } else {
          const initial = createEmptyChat();
          setChats([initial]);
          setActiveChatId(initial.id);
        }
      } else {
        const initial = createEmptyChat();
        setChats([initial]);
        setActiveChatId(initial.id);
      }
    } catch {
      const initial = createEmptyChat();
      setChats([initial]);
      setActiveChatId(initial.id);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("kinetic_ai_lang", lang);
    localStorage.setItem("kinetic_ai_theme", darkMode ? "dark" : "light");
    try {
      localStorage.setItem("kinetic_ai_providers", JSON.stringify(providers));
    } catch {
      // ignore
    }
  }, [providers, lang, darkMode, isLoaded]);

  useEffect(() => {
    if (!assistantSettingsLoaded) return;
    try {
      localStorage.setItem("kinetic_ai_assistant_settings", JSON.stringify({
        assistantPreset,
        customInstruction: customInstruction.slice(0, 3000),
        autoFallback,
        chainMode,
        bridgeRole,
        secondaryProviderId,
      }));
    } catch {
      // Preferences remain active for this session if local storage is unavailable.
    }
  }, [assistantSettingsLoaded, assistantPreset, customInstruction, autoFallback, chainMode, bridgeRole, secondaryProviderId]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      const lightChats = chats.map((c) => ({
        ...c,
        messages: c.messages.map((m) => ({
          role: m.role,
          content: m.content,
          providerName: m.providerName,
          attachmentNames: m.attachmentNames,
          sources: m.sources,
        })),
      }));
      localStorage.setItem("kinetic_ai_chats", JSON.stringify(lightChats));
    } catch {
      // ignore
    }
  }, [chats, isLoaded]);

  // 3. Süreli Ceza Geri Sayımı
  useEffect(() => {
    if (!firebaseUser) return;
    let savedBan = 0;
    try {
      savedBan = Number(localStorage.getItem(`kinetic_ban_${firebaseUser.uid}`) || 0);
    } catch {
      return;
    }
    if (savedBan > Date.now()) {
      const timer = window.setTimeout(() => {
        setClockNow(Date.now());
        setBanUntil(savedBan);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (!banUntil) return;

    const updateTimer = () => {
      const now = Date.now();
      setClockNow(now);
      if (banUntil <= now) {
        setBanUntil(0);
        try {
          if (firebaseUser) localStorage.removeItem(`kinetic_ban_${firebaseUser.uid}`);
        } catch {
          // The ban expires server-side even when browser storage is unavailable.
        }
      }
    };

    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [banUntil, firebaseUser]);

  // 4. Donanım/Tarayıcı Geri Tuşu & Escape Klavye Desteği
  useEffect(() => {
    const handleKeyDownGlobal = (e) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        const currentState = window.history.state || {};
        if (currentState.kineticMobileMenu) {
          window.history.replaceState(
            { ...currentState, kineticMobileMenu: false, kineticTab: activeTab },
            "",
            window.location.href
          );
        }
        setShowSettingsPanel(false);
        setIsModalOpen(false);
        setIsAccountOpen(false);
        setIsLegalOpen(false);
        setIsTutorOpen(false);
        setIsPermissionOpen(false);
        setConfirmState({ open: false });
      }
    };

    const handlePopState = (event) => {
      setMobileMenuOpen(false);
      setActiveTab(event.state?.kineticTab || event.state?.tab || "chat");
    };

    window.addEventListener("keydown", handleKeyDownGlobal);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("keydown", handleKeyDownGlobal);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [mobileMenuOpen, activeTab]);

  // 5. Uzun Süren Yanıtlarda Timeout Alternatifi
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => setIsSlowWait(true), 18000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0];
  const messages = activeChat?.messages || [];
  const lastMessageLength = messages.at(-1)?.content?.length ?? 0;
  const estimatedChatInputTokens = Math.ceil(
    (messages.reduce((sum, message) => sum + String(message.content || "").length, 0) + input.length) / 4
  );

  const scrollConversationToBottom = (behavior = "smooth") => {
    const container = chatScrollRef.current;
    if (!container) return;
    chatAtBottomRef.current = true;
    container.scrollTo({ top: container.scrollHeight, behavior });
    setShowScrollToBottom(false);
  };

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container || !chatAtBottomRef.current) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "auto" });
  }, [activeChatId, messages.length, lastMessageLength, isLoading]);

  if (authChecking) {
    return <AppBootSkeleton darkMode={darkMode} />;
  }

  if (!firebaseUser || !userProfile) {
    return <AppBootSkeleton darkMode={darkMode} />;
  }

  if (userProfile.banned) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 p-6 text-center text-zinc-100 safe-top safe-bottom">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 animate-scaleIn">
          <Ban className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <h1 className="text-lg font-bold text-red-300">Hesabınız Askıya Alındı</h1>
          <p className="mt-2 text-xs opacity-80">{userProfile.banReason}</p>
          <button
            onClick={() => signOut(auth)}
            className="mt-5 min-h-[44px] rounded-xl bg-white px-5 text-xs font-semibold text-zinc-950"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    );
  }

  if (remainingSec > 0) {
    const mins = String(Math.floor(remainingSec / 60)).padStart(2, "0");
    const secs = String(remainingSec % 60).padStart(2, "0");
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 p-6 text-center text-zinc-100 safe-top safe-bottom animate-fadeIn">
        <div className="max-w-md rounded-2xl border border-amber-500/30 bg-amber-500/10 p-7">
          <Ban className="mx-auto mb-3 h-10 w-10 text-amber-400" />
          <h1 className="text-lg font-bold text-amber-300">
            Geçici Kullanım Kısıtlaması
          </h1>
          <p className="mt-2 text-xs leading-relaxed opacity-80">
            Arka arkaya uygunsuz dil / kural ihlali tespit edildiği için tüm AI
            özellikleri geçici olarak devre dışı bırakıldı.
          </p>
          <div className="my-5 font-mono text-4xl font-bold tracking-widest text-white">
            {mins}:{secs}
          </div>
          <p className="text-[11px] opacity-55">
            Süre dolduğunda erişimin otomatik olarak açılacaktır.
          </p>
        </div>
      </div>
    );
  }

  const activeProvider = providers.find((p) => p.id === activeProviderId);
  const activeProviderModels = activeProvider
    ? [...new Set([
        ...(Array.isArray(activeProvider.availableModels)
          ? activeProvider.availableModels.filter((model) => typeof model === "string" && model.trim() && model.length <= 200).slice(0, 250)
          : []),
        ...(activeProvider.model ? [activeProvider.model] : []),
      ])]
    : [];
  const reasoningSupport = getReasoningSupport(activeProvider);
  const secondaryProviderOptions = providers.filter((provider) => provider.id !== activeProviderId);
  const secondaryProvider = secondaryProviderOptions.find((p) => p.id === secondaryProviderId) || secondaryProviderOptions[0] || null;
  const effectiveSystemPrompt =
    customInstruction.trim() ||
    ASSISTANT_PRESETS[assistantPreset]?.prompt ||
    ASSISTANT_PRESETS.general.prompt;

  const switchTab = (tab) => {
    triggerHaptic("light");
    const currentState = window.history.state || {};
    if (currentState.kineticMobileMenu) {
      window.history.replaceState(
        { ...currentState, kineticMobileMenu: false, kineticTab: activeTab },
        "",
        window.location.href
      );
    }
    if (tab !== activeTab) {
      window.history.pushState(
        { ...(window.history.state || {}), kineticTab: tab },
        "",
        window.location.href
      );
    }
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const openMobileMenu = () => {
    if (mobileMenuOpen) return;
    window.history.pushState(
      { ...(window.history.state || {}), kineticTab: activeTab, kineticMobileMenu: true },
      "",
      window.location.href
    );
    setMobileMenuOpen(true);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    const currentState = window.history.state || {};
    if (currentState.kineticMobileMenu) {
      window.history.replaceState(
        { ...currentState, kineticMobileMenu: false, kineticTab: activeTab },
        "",
        window.location.href
      );
    }
  };

  const handleNotificationRequest = async () => {
    triggerHaptic("light");
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      const nextValue = !notificationsEnabled;
      setNotificationsEnabled(nextValue);
      localStorage.setItem("kinetic_ai_notifications", nextValue ? "on" : "off");
      return;
    }
    setIsPermissionOpen(true);
  };

  const handleAllowNotifications = async () => {
    setIsPermissionOpen(false);
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        setNotificationsEnabled(true);
        localStorage.setItem("kinetic_ai_notifications", "on");
        triggerHaptic("success");
      } else {
        setNotificationsEnabled(false);
        localStorage.setItem("kinetic_ai_notifications", "off");
      }
    } catch {
      // ignore
    }
  };

  const runAIRequest = async ({
    providerOverride = null,
    messages: msgHistory,
    systemPrompt,
    signal,
    useWebSearchOverride = webSearch,
  }) => {
    const targetProvider = providerOverride || activeProvider;
    if (!targetProvider) {
      throw new Error(t.noModelsDesc);
    }

    const idToken = await firebaseUser.getIdToken();
    const fallbackProviders = autoFallback
      ? providers.filter((p) => p.id !== targetProvider.id).slice(0, 5)
      : [];

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      signal,
      body: JSON.stringify({
        provider: targetProvider,
        fallbackProviders,
        messages: msgHistory,
        systemPrompt,
        useWebSearch: useWebSearchOverride,
        reasoningLevel,
      }),
    });

    const rawText = await res.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`Sunucu geçersiz yanıt döndürdü (HTTP ${res.status}).`);
    }

    if (!res.ok) {
      if (data.code === "BANNED") {
        setUserProfile((prev) =>
          prev ? { ...prev, banned: true, banReason: data.error } : prev
        );
      }
      if (data.code === "TEMP_BAN" && data.banUntil) {
        setClockNow(getCurrentTimestamp());
        setBanUntil(data.banUntil);
        localStorage.setItem(`kinetic_ban_${firebaseUser.uid}`, String(data.banUntil));
      }
      throw new Error(data.error || "Bir hata oluştu.");
    }

    if (typeof data.newDailyCount === "number") {
      setUserProfile((prev) => (prev ? { ...prev, dailyCount: Math.max(prev.dailyCount || 0, data.newDailyCount) } : prev));
    }

    if (data.dailyTokenUsage) {
      setUserProfile((prev) => applyTokenUsage(prev, data.dailyTokenUsage, data.modelTokenUsage));
    }

    return data;
  };

  const handleNewChat = () => {
    if (isLoading) return;
    triggerHaptic("light");
    switchTab("chat");
    setMobileMenuOpen(false);
    if (activeChat && activeChat.messages.length === 0) {
      setErrorMsg("");
      return;
    }
    const newChat = createEmptyChat();
    setChats((prev) => [newChat, ...prev]);
    chatAtBottomRef.current = true;
    setShowScrollToBottom(false);
    setActiveChatId(newChat.id);
    setErrorMsg("");
  };

  const requestDeleteChat = (id) => {
    if (isLoading) return;
    triggerHaptic("light");
    setConfirmState({
      open: true,
      title: t.confirmDeleteChatTitle,
      description: t.confirmDeleteChatDesc,
      confirmText: t.confirmAction,
      cancelText: t.cancel,
      danger: true,
      onConfirm: () => {
        const filtered = chats.filter((c) => c.id !== id);
        if (filtered.length === 0) {
          const fresh = createEmptyChat();
          setChats([fresh]);
          chatAtBottomRef.current = true;
          setShowScrollToBottom(false);
          setActiveChatId(fresh.id);
        } else {
          setChats(filtered);
          if (activeChatId === id) {
            chatAtBottomRef.current = true;
            setShowScrollToBottom(false);
            setActiveChatId(filtered[0].id);
          }
        }
        setConfirmState({ open: false });
        triggerHaptic("success");
      },
    });
  };

  const beginRenameChat = (event, chat) => {
    event.stopPropagation();
    setEditingChatId(chat.id);
    setEditingChatTitle(chat.title || "");
  };

  const saveRenameChat = (id) => {
    const title = editingChatTitle.trim().slice(0, 80);
    if (!title) return;
    setChats((previous) => previous.map((chat) => chat.id === id ? { ...chat, title, updatedAt: Date.now() } : chat));
    setEditingChatId("");
    setEditingChatTitle("");
  };

  const requestDeleteProvider = (id) => {
    triggerHaptic("light");
    setConfirmState({
      open: true,
      title: t.confirmDeleteModelTitle,
      description: t.confirmDeleteModelDesc,
      confirmText: t.confirmAction,
      cancelText: t.cancel,
      danger: true,
      onConfirm: () => {
        const updated = providers.filter((p) => p.id !== id);
        setProviders(updated);
        if (activeProviderId === id) setActiveProviderId(updated[0]?.id || "");
        if (secondaryProviderId === id) setSecondaryProviderId(updated[0]?.id || "");
        setConfirmState({ open: false });
        if (updated.length === 0) setIsConnectionManagerOpen(false);
        triggerHaptic("success");
      },
    });
  };

  const requestLogout = () => {
    triggerHaptic("light");
    setConfirmState({
      open: true,
      title: t.confirmLogoutTitle,
      description: t.confirmLogoutDesc,
      confirmText: t.confirmAction,
      cancelText: t.cancel,
      danger: false,
      onConfirm: () => {
        setConfirmState({ open: false });
        signOut(auth);
      },
    });
  };

  const performMonthlyQuotaReset = async () => {
    setConfirmState({ open: false });
    setQuotaResetError("");
    setQuotaResetLoading(true);
    try {
      const idToken = await firebaseUser.getIdToken();
      const response = await fetch("/api/account/quota-reset", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.code === "ALREADY_USED") {
          setUserProfile((previous) => previous
            ? { ...previous, monthlyQuotaResetMonth: monthlyQuotaReset.month }
            : previous);
        }
        throw new Error(result.error || t.monthlyResetUnavailable);
      }

      setUserProfile((previous) => previous
        ? {
            ...previous,
            dailyCount: 0,
            lastResetDate: getTodayKey(),
            monthlyQuotaResetMonth: result.monthlyQuotaResetMonth,
          }
        : previous);
      setErrorMsg("");
      setErrorCode("");
      triggerHaptic("success");
    } catch (error) {
      setQuotaResetError(formatFriendlyError(error.message, lang));
    } finally {
      setQuotaResetLoading(false);
    }
  };

  const requestMonthlyQuotaReset = () => {
    if (!monthlyQuotaReset.available || quotaResetLoading || !firebaseUser) return;
    setQuotaResetError("");
    setConfirmState({
      open: true,
      title: t.monthlyResetTitle,
      description: t.monthlyResetDescription,
      confirmText: t.monthlyResetConfirm,
      cancelText: t.cancel,
      danger: false,
      onConfirm: performMonthlyQuotaReset,
    });
  };

  const handleExportChat = () => {
    if (!activeChat || activeChat.messages.length === 0) return;
    triggerHaptic("light");
    const md = activeChat.messages
      .map((m) => {
        const who = m.role === "user" ? "## Kullanıcı" : `## ${m.providerName || "KineticAI"}`;
        return `${who}\n\n${m.content}\n`;
      })
      .join("\n---\n\n");

    const blob = new Blob([`# ${activeChat.title}\n\n${md}`], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kineticai-${activeChat.id.slice(0, 6)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const compressImageToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX_DIM = 1024;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Görsel okunamadı."));
      };
      img.src = url;
    });

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const loaded = [];
    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) {
        setErrorMsg(`'${file.name}' 8MB'dan büyük olduğu için eklenemedi.`);
        continue;
      }

      if (file.type.startsWith("image/")) {
        const m = (activeProvider?.model || "").toLowerCase();
        const isVision =
          m.includes("vision") ||
          m.includes("gpt-4o") ||
          m.includes("pixtral") ||
          m.includes("claude");

        if (!isVision && activeProvider?.type === "openai-compatible") {
          setErrorMsg(
            "Bilgilendirme: Bağlı olduğunuz ücretsiz model sadece metin/kod destekler. Görsel analizi için GPT-4o, Claude veya Vision modeli bağlamalısınız."
          );
        }

        try {
          const compressed = await compressImageToBase64(file);
          loaded.push({
            kind: "image",
            name: file.name,
            mimeType: compressed.mimeType,
            base64: compressed.base64,
          });
        } catch {
          setErrorMsg(`'${file.name}' işlenemedi.`);
        }
      } else {
        const text = await file.text();
        loaded.push({ kind: "text", name: file.name, content: text.slice(0, 25000) });
      }
    }

    setAttachments((prev) => [...prev, ...loaded]);
    e.target.value = "";
  };

  const normalizeProviderUrl = (value) => {
    const trimmed = String(value || "").trim().replace(/\/+$/, "");
    try {
      const url = new URL(trimmed);
      url.hash = "";
      url.searchParams.sort();
      return `${url.origin.toLowerCase()}${url.pathname.replace(/\/+$/, "")}${url.search}`;
    } catch {
      return trimmed.toLowerCase();
    }
  };

  const handleAddProvider = (newProvider) => {
    const duplicate = providers.find((provider) =>
      provider.type === newProvider.type &&
      normalizeProviderUrl(provider.baseUrl) === normalizeProviderUrl(newProvider.baseUrl) &&
      String(provider.apiKey || "") === String(newProvider.apiKey || "")
    );
    if (duplicate) {
      setActiveProviderId(duplicate.id);
      return {
        duplicate: true,
        message: lang === "en"
          ? "This API connection already exists and has been selected. Close this dialog to use it, then change models from the composer."
          : "Bu API bağlantısı zaten kayıtlı ve seçildi. Bu pencereyi kapatıp kullanabilir, modeli sohbet alanından değiştirebilirsin.",
      };
    }

    triggerHaptic("success");
    const updated = [...providers, newProvider];
    setProviders(updated);
    setActiveProviderId(newProvider.id);
    if (!secondaryProviderId) setSecondaryProviderId(newProvider.id);
    return { duplicate: false };
  };

  const updateProviderModel = (providerId, model) => {
    if (typeof model !== "string" || !model.trim() || model.length > 200 || /[\u0000-\u001f\u007f]/.test(model)) return;
    setProviders((previous) => previous.map((provider) =>
      provider.id === providerId ? { ...provider, model: model.trim() } : provider
    ));
  };

  const refreshProviderModels = async (providerId) => {
    const provider = providers.find((item) => item.id === providerId);
    if (!provider || refreshingProviderId) return;
    setRefreshingProviderId(providerId);
    setConnectionNotice("");
    setConnectionNoticeIsError(false);
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const text = await response.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      if (!response.ok) throw new Error(data?.error || (lang === "en" ? `Model list request failed (HTTP ${response.status}).` : `Model listesi alınamadı (HTTP ${response.status}).`));
      const availableModels = Array.isArray(data?.models)
        ? [...new Set(data.models.filter((model) => typeof model === "string" && model.trim() && model.length <= 200 && !/[\u0000-\u001f\u007f]/.test(model)))].slice(0, 250)
        : [];
      setProviders((previous) => previous.map((item) => item.id === providerId
        ? {
            ...item,
            availableModels,
            model: availableModels.includes(item.model) || availableModels.length === 0 ? item.model : availableModels[0],
          }
        : item
      ));
      setConnectionNotice(availableModels.length
        ? (lang === "en" ? `${availableModels.length} models are ready. Choose one from the composer.` : `${availableModels.length} model hazır. Sohbet alanından seçebilirsin.`)
        : (lang === "en" ? "This endpoint did not return a model catalog. You can set its model ID below." : "Bu endpoint model kataloğu döndürmedi. Model kimliğini aşağıdan girebilirsin."));
    } catch (error) {
      setConnectionNotice(error.message || (lang === "en" ? "Could not refresh models." : "Modeller yenilenemedi."));
      setConnectionNoticeIsError(true);
    } finally {
      setRefreshingProviderId("");
    }
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      triggerHaptic("light");
    }
  };

  const appendMessageToChat = (chatId, newMsg) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, newMsg], updatedAt: Date.now() }
          : c
      )
    );
  };

  const generateResponse = async (historyToUse, targetChatId) => {
    if (!activeProvider) {
      setErrorCode("");
      setErrorMsg(t.noModelsDesc);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setErrorMsg("");
    setErrorCode("");
    setIsSlowWait(false);
    setIsLoading(true);

    // Boş bir asistan mesajı hemen ekle, içini akarken dolduracağız.
    const placeholderIndex = historyToUse.length;
    appendMessageToChat(targetChatId, {
      role: "assistant",
      content: "",
      providerName: "",
      streaming: true,
    });

    const updateStreamingMessage = (updater) => {
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== targetChatId) return c;
          const msgs = [...c.messages];
          if (!msgs[placeholderIndex]) return c;
          msgs[placeholderIndex] = updater(msgs[placeholderIndex]);
          return { ...c, messages: msgs };
        })
      );
    };

    try {
      const cleanHistory = historyToUse.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.images ? { images: m.images } : {}),
      }));

      const idToken = await firebaseUser.getIdToken();
      const fallbackProviders = autoFallback
        ? providers.filter((p) => p.id !== activeProvider.id).slice(0, 5)
        : [];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        signal: controller.signal,
        body: JSON.stringify({
          provider: activeProvider,
          fallbackProviders,
          messages: cleanHistory,
          systemPrompt: effectiveSystemPrompt,
          useWebSearch: webSearch,
          reasoningLevel,
          stream: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const requestError = new Error(data.error || `Sunucu hatası (HTTP ${res.status})`);
        requestError.code = data.code || "";
        throw requestError;
      }

      let streamError = null;
      let streamedReplyText = "";

      await readSSE(res, {
        chunk: ({ text }) => {
          streamedReplyText += text;
          updateStreamingMessage((msg) => ({ ...msg, content: msg.content + text }));
        },
        done: ({ usedProvider, usedModel, isFallback, newDailyCount, dailyTokenUsage, modelTokenUsage, webSources = [] }) => {
          const label = isFallback ? `Yedek AI · ${usedProvider} (${usedModel})` : `${usedProvider} · ${usedModel}`;
          updateStreamingMessage((msg) => ({ ...msg, providerName: label, sources: webSources, streaming: false }));
          if (typeof newDailyCount === "number") {
            setUserProfile((prev) => (prev ? { ...prev, dailyCount: Math.max(prev.dailyCount || 0, newDailyCount) } : prev));
          }
          if (dailyTokenUsage) {
            setUserProfile((prev) => applyTokenUsage(prev, dailyTokenUsage, modelTokenUsage));
          }
        },
        error: ({ message }) => {
          streamError = message;
        },
      });

      if (streamError) {
        updateStreamingMessage((msg) => ({
          ...msg,
          streaming: false,
          // Kısmen içerik geldiyse onu koru, altına açıklayıcı hata ekle.
          content: msg.content
            ? `${msg.content}\n\n---\n${streamError}`
            : streamError,
          providerName: msg.providerName || "Sistem Mesajı",
        }));
      }

      triggerHaptic("success");
      if (
        notificationsEnabled &&
        typeof document !== "undefined" &&
        document.hidden &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification("KineticAI", {
          body: lang === "en" ? "Your AI response is ready." : "Yapay zeka yanıtın hazır.",
        });
      }

      // AI Köprüsü (2. aşama) hâlâ non-stream şekilde çalışıyor.
      if (chainMode && secondaryProvider) {
        const firstReplyText = streamedReplyText;

        const lastUserText =
          [...historyToUse].reverse().find((m) => m.role === "user")?.content || "";
        const modeConfig = BRIDGE_MODES[bridgeRole] || BRIDGE_MODES.review;

        try {
          const secondRes = await runAIRequest({
            providerOverride: secondaryProvider,
            messages: [
              { role: "user", content: modeConfig.buildPrompt(lastUserText, firstReplyText) },
            ],
            systemPrompt: modeConfig.system,
            signal: controller.signal,
          });

          appendMessageToChat(targetChatId, {
            role: "assistant",
            content: secondRes.reply,
            providerName: `2. Aşama (${modeConfig.label}) · ${secondRes.usedProvider}`,
          });
        } catch (bridgeErr) {
          if (bridgeErr.name !== "AbortError") {
            setErrorMsg(formatFriendlyError(bridgeErr.message, lang));
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      triggerHaptic("error");
      updateStreamingMessage((msg) => ({
        ...msg,
        streaming: false,
        content: msg.content || "",
      }));
      setErrorCode(err.code || "");
      setErrorMsg(formatFriendlyError(err.message, lang));
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSend = async (customText = null) => {
    const textToSend = typeof customText === "string" ? customText : input;
    if ((!textToSend.trim() && attachments.length === 0) || isLoading || !activeChat) return;
    if (!activeProvider) {
      setIsModalOpen(true);
      return;
    }

    triggerHaptic("light");
    chatAtBottomRef.current = true;
    setShowScrollToBottom(false);

    const textFiles = attachments.filter((a) => a.kind === "text");
    const imageFiles = attachments.filter((a) => a.kind === "image");

    let finalContent = textToSend.trim();
    if (textFiles.length > 0) {
      const filesBlock = textFiles
        .map((f) => `[Eklenen Dosya: ${f.name}]\n\`\`\`\n${f.content}\n\`\`\``)
        .join("\n\n");
      finalContent = finalContent ? `${finalContent}\n\n${filesBlock}` : filesBlock;
    }
    if (!finalContent && imageFiles.length > 0) {
      finalContent = "Bu görseli incele ve açıkla.";
    }

    const userMessage = {
      role: "user",
      content: finalContent,
      images: imageFiles.length > 0 ? imageFiles : undefined,
      attachmentNames: attachments.map((a) => a.name),
    };

    const titleSource = textToSend.trim() || attachments[0]?.name || t.newChat;
    if (typeof customText !== "string") setInput("");
    setAttachments([]);

    const updatedHistory = [...activeChat.messages, userMessage];
    const autoTitle =
      activeChat.messages.length === 0
        ? titleSource.slice(0, 30) + (titleSource.length > 30 ? "..." : "")
        : activeChat.title;

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? { ...c, title: autoTitle, messages: updatedHistory, updatedAt: Date.now() }
          : c
      )
    );

    await generateResponse(updatedHistory, activeChat.id);
  };

  const handleRegenerate = async () => {
    if (isLoading || !activeChat || activeChat.messages.length === 0) return;
    triggerHaptic("light");
    const lastUserIndex = activeChat.messages.map((m) => m.role).lastIndexOf("user");
    if (lastUserIndex === -1) return;

    const trimmedHistory = activeChat.messages.slice(0, lastUserIndex + 1);
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChat.id ? { ...c, messages: trimmedHistory } : c
      )
    );

    await generateResponse(trimmedHistory, activeChat.id);
  };

  const handleCopyMessage = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    triggerHaptic("light");
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg(lang === "en" ? "Voice input is not supported in this browser." : "Bu tarayıcı sesle yazmayı desteklemiyor.");
      return;
    }
    if (isListening) {
      speechRecognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;
    voiceSegmentsRef.current = [];
    voiceBaseInputRef.current = input;
    recognition.lang = lang === "en" ? "en-US" : "tr-TR";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const segment = event.results[index]?.[0]?.transcript?.trim();
        if (segment) voiceSegmentsRef.current[index] = segment;
      }
      const transcript = voiceSegmentsRef.current
        .filter(Boolean)
        .filter((segment, index, all) => index === 0 || segment.toLocaleLowerCase(lang === "en" ? "en-US" : "tr-TR") !== all[index - 1].toLocaleLowerCase(lang === "en" ? "en-US" : "tr-TR"))
        .join(" ")
        .trim();
      if (transcript) {
        const base = voiceBaseInputRef.current.trim();
        setInput(base ? `${base} ${transcript}` : transcript);
      }
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setErrorMsg(lang === "en" ? "Could not access voice input. Check microphone permission." : "Ses tanınamadı. Mikrofon iznini kontrol edin.");
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      if (speechRecognitionRef.current === recognition) speechRecognitionRef.current = null;
    };
    setErrorMsg("");
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setErrorMsg(lang === "en" ? "Voice input could not start." : "Sesle yazma başlatılamadı.");
    }
  };

  return (
    <div
      className={`flex h-dvh overflow-hidden transition-colors safe-top safe-bottom ${darkMode
          ? "theme-dark bg-zinc-950 text-zinc-100"
          : "theme-light bg-zinc-50 text-zinc-900"
        }`}
    >
      {/* MOBİL OVERLAY */}
      {mobileMenuOpen && (
        <div
          onClick={closeMobileMenu}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* SOL KENAR ÇUBUĞU */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-full min-h-0 flex-col overflow-x-hidden overflow-y-auto overscroll-contain border-r p-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] transition-transform duration-200 md:static md:h-dvh md:w-72 md:translate-x-0 md:overflow-hidden md:pt-6 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } ${darkMode ? "border-zinc-800/80 bg-zinc-900" : "border-zinc-200 bg-white"}`}
      >
        {/* Marka & Üst Kontroller */}
        <div className="mb-3 mt-1 flex min-h-10 items-center justify-between gap-2 md:mb-4 md:mt-1">
          <div className="flex items-center gap-2.5">
            <KineticLogo size={32} darkMode={darkMode} />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold tracking-tight">KineticAI</h1>
                <BetaBadge darkMode={darkMode} />
              </div>
              <p className="text-[10px] opacity-50">{t.subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeMobileMenu}
            className="touch-target flex shrink-0 items-center justify-center rounded-xl border border-zinc-700/40 opacity-75 transition hover:bg-zinc-800/40 hover:opacity-100 md:hidden"
            aria-label={t.closeMenu}
            title={t.closeMenu}
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        {/* Mod Sekmeleri */}
        <div
          className={`mb-4 grid grid-cols-3 gap-1 rounded-xl p-1 text-[11px] font-medium ${darkMode ? "bg-zinc-950" : "bg-zinc-100"
            }`}
        >
          <button
            onClick={() => switchTab("chat")}
            className={`flex min-h-12 items-center justify-center gap-1 rounded-lg transition ${activeTab === "chat"
                ? darkMode
                  ? "bg-zinc-800 text-white"
                  : "bg-white text-zinc-900 shadow-sm"
                : "opacity-60 hover:opacity-100"
              }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {t.tabChat}
          </button>
          <button
            onClick={() => switchTab("notebook")}
            className={`flex min-h-12 items-center justify-center gap-1 rounded-lg transition ${activeTab === "notebook"
                ? darkMode
                  ? "bg-zinc-800 text-white"
                  : "bg-white text-zinc-900 shadow-sm"
                : "opacity-60 hover:opacity-100"
              }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            {t.tabNotes}
          </button>
          <button
            onClick={() => switchTab("tasks")}
            className={`flex min-h-12 items-center justify-center gap-1 rounded-lg transition ${activeTab === "tasks"
                ? darkMode
                  ? "bg-zinc-800 text-white"
                  : "bg-white text-zinc-900 shadow-sm"
                : "opacity-60 hover:opacity-100"
              }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {t.tabTasks}
          </button>
        </div>

        {/* Hızlı Butonlar */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            onClick={handleNewChat}
            className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition ${darkMode
                ? "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800"
                : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100"
              }`}
          >
            <Plus className="h-3.5 w-3.5" />
            {t.newChat}
          </button>
          <button
            onClick={() => {
              triggerHaptic("light");
              setIsModalOpen(true);
            }}
            className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium transition ${darkMode
                ? "bg-white text-zinc-950 hover:bg-zinc-200"
                : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
          >
            <Plus className="h-3.5 w-3.5" />
            {t.connectAI}
          </button>
        </div>

        {/* AKTİF MODEL SEÇİCİ */}
        <div className="mb-3">
          <div className="mb-1 flex min-h-9 items-center px-1">
            <label className="block px-1 text-[10px] font-semibold uppercase tracking-wider opacity-45">
              {t.activeAI}
            </label>
          </div>
          {providers.length === 0 ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20"
            >
              <Plus className="h-3.5 w-3.5" />
              {t.noModelsCta}
            </button>
          ) : (
            <CustomSelect
              value={activeProviderId}
              onChange={(val) => {
                triggerHaptic("light");
                setActiveProviderId(val);
              }}
              darkMode={darkMode}
              options={providers.map((p) => ({
                value: p.id,
                label: p.name,
                sublabel: p.model,
              }))}
            />
          )}
        </div>

        {/* Sohbet geçmişi */}
        <div className={`mb-2 flex min-h-10 items-center justify-between border-b px-2 pb-2 text-[11px] font-medium ${darkMode ? "border-zinc-800/50" : "border-zinc-200"}`}>
          <span>{t.chatHistory}</span>
          <span className="rounded-full bg-zinc-500/10 px-2 py-0.5 text-[10px] opacity-60">{chats.length}</span>
        </div>

        {chats.length > 0 && (
          <label className={`mb-2 flex min-h-12 items-center gap-2 rounded-lg border px-2.5 ${darkMode ? "border-zinc-800 bg-zinc-950/50" : "border-zinc-300 bg-zinc-50"}`}>
            <Search className="h-3.5 w-3.5 shrink-0 opacity-45" />
            <input
              value={chatSearch}
              onChange={(event) => setChatSearch(event.target.value)}
              placeholder={t.searchChats}
              aria-label={t.searchChats}
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:opacity-45"
            />
            {chatSearch && <button type="button" onClick={() => setChatSearch("")} aria-label={t.clearSearch} className="touch-target flex items-center justify-center text-xs opacity-60 hover:opacity-100">×</button>}
          </label>
        )}

        {/* TAM BOY FERAH LİSTE ALANI */}
        <div className="mb-3 min-h-0 flex-1 divide-y divide-zinc-800/30 overflow-y-auto overscroll-contain pr-1">
          <>
            {filteredChats.map((chat) => {
              const isCurrent = chat.id === activeChat?.id && activeTab === "chat";
              return (
                <div
                  key={chat.id}
                  className={`group flex min-h-16 items-center justify-between gap-1 rounded-lg px-1.5 py-1 text-xs transition ${isCurrent
                      ? darkMode
                        ? "bg-zinc-800/80 text-white"
                        : "bg-zinc-200/80 text-zinc-900 font-medium"
                      : "opacity-75 hover:bg-zinc-800/30 hover:opacity-100"
                    }`}
                >
                  <div className="min-w-0 flex-1">
                    {editingChatId === chat.id ? (
                      <input
                        autoFocus
                        value={editingChatTitle}
                        maxLength={80}
                        onChange={(event) => setEditingChatTitle(event.target.value)}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                          if (event.key === "Enter") saveRenameChat(chat.id);
                          if (event.key === "Escape") setEditingChatId("");
                        }}
                        onBlur={() => setEditingChatId("")}
                        className="min-h-12 w-full rounded bg-transparent text-xs outline-none ring-1 ring-emerald-500/50"
                        aria-label={lang === "en" ? "Conversation title" : "Sohbet başlığı"}
                      />
                    ) : (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                          triggerHaptic("light");
                          switchTab("chat");
                          chatAtBottomRef.current = true;
                          setShowScrollToBottom(false);
                          setActiveChatId(chat.id);
                          setErrorMsg("");
                        }}
                        className="min-h-12 w-full text-left disabled:cursor-not-allowed"
                        aria-current={isCurrent ? "page" : undefined}
                      >
                        <span className="block truncate">{chat.title}</span>
                        <span className="mt-0.5 block text-[10px] opacity-55">
                          {formatRelativeTime(chat.updatedAt, lang)}
                        </span>
                      </button>
                    )}
                  </div>
                  {editingChatId !== chat.id && (
                    <button
                      type="button"
                      onClick={(event) => beginRenameChat(event, chat)}
                      className="touch-target flex shrink-0 items-center justify-center rounded-lg opacity-55 transition hover:bg-emerald-500/10 hover:text-emerald-500 group-hover:opacity-100"
                      aria-label={lang === "en" ? `Rename ${chat.title}` : `${chat.title} sohbetini yeniden adlandır`}
                      title={lang === "en" ? "Rename chat" : "Sohbeti yeniden adlandır"}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      requestDeleteChat(chat.id);
                    }}
                    className="touch-target flex shrink-0 items-center justify-center rounded-lg opacity-55 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                    aria-label={`${t.deleteChat}: ${chat.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
            {normalizedChatSearch && filteredChats.length === 0 && (
              <div className="mt-3 rounded-xl border border-dashed border-zinc-700/50 px-3 py-5 text-center">
                <Search className="mx-auto mb-2 h-5 w-5 opacity-45" aria-hidden="true" />
                <p className="text-xs opacity-65">{t.noMatchingChats}</p>
                <button type="button" onClick={() => setChatSearch("")} className="mt-2 inline-flex min-h-12 items-center rounded-lg px-3 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10">
                  {t.showAllChats}
                </button>
              </div>
            )}
            </>
          {chats.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-700/50 p-4 text-center">
              <MessageSquare className="mx-auto mb-2 h-5 w-5 opacity-50" aria-hidden="true" />
              <p className="text-xs opacity-65">{lang === "en" ? "Your chats will appear here." : "Sohbetlerin burada görünecek."}</p>
              <button type="button" onClick={handleNewChat} className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10">
                <Plus className="h-3.5 w-3.5" />{t.newChat}
              </button>
            </div>
          )}
        </div>

        {/* HESAP, KOTA & REKLAM KARTI */}
        <div className="relative shrink-0 space-y-2" ref={accountMenuRef}>
          {/* Kullanıcı Profili & Çıkış */}
          {accountMenuOpen && (
            <div
              role="menu"
              aria-label={lang === "en" ? "Account menu" : "Hesap menüsü"}
              className={`absolute inset-x-0 bottom-[calc(100%+0.5rem)] z-50 max-h-[min(70dvh,32rem)] overflow-y-auto rounded-2xl border p-2 shadow-2xl ${darkMode ? "border-zinc-700 bg-zinc-900 text-zinc-100" : "border-zinc-300 bg-white text-zinc-900"}`}
            >
              <div className={`mb-1 rounded-xl px-3 py-3 ${darkMode ? "bg-zinc-950/70" : "bg-zinc-100"}`}>
                <p className="truncate text-xs font-semibold">{userProfile.name}</p>
                <p className="mt-0.5 truncate text-[11px] opacity-55">{userProfile.email}</p>
              </div>
              <button role="menuitem" onClick={() => { setAccountMenuOpen(false); setIsAccountOpen(true); closeMobileMenu(); }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-xs transition hover:bg-zinc-800/10">
                <ShieldCheck className="h-4 w-4 opacity-70" />{lang === "en" ? "Account & security" : "Hesap ve güvenlik"}
              </button>
              <button role="menuitem" onClick={() => { setAccountMenuOpen(false); switchTab("settings"); }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-xs transition hover:bg-zinc-800/10">
                <Settings className="h-4 w-4 opacity-70" />{lang === "en" ? "Settings" : "Ayarlar"}
              </button>
              <button role="menuitem" onClick={() => { setDarkMode((value) => !value); setAccountMenuOpen(false); }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-xs transition hover:bg-zinc-800/10">
                {darkMode ? <Sun className="h-4 w-4 opacity-70" /> : <Moon className="h-4 w-4 opacity-70" />}{lang === "en" ? "Change theme" : "Temayı değiştir"}
              </button>
              <button role="menuitem" onClick={() => { setLang((value) => value === "tr" ? "en" : "tr"); setAccountMenuOpen(false); }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-xs transition hover:bg-zinc-800/10">
                <Globe className="h-4 w-4 opacity-70" />{lang === "en" ? "Language · English" : "Dil · Türkçe"}
              </button>
              <button role="menuitem" onClick={() => { setIsTutorOpen(true); setAccountMenuOpen(false); closeMobileMenu(); }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-xs transition hover:bg-zinc-800/10">
                <HelpCircle className="h-4 w-4 opacity-70" />{lang === "en" ? "Help and guide" : "Yardım ve rehber"}
              </button>
              <div className={`my-1 border-t ${darkMode ? "border-zinc-700" : "border-zinc-200"}`} />
              <button role="menuitem" onClick={() => { setAccountMenuOpen(false); requestLogout(); }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-xs text-red-400 transition hover:bg-red-500/10">
                <LogOut className="h-4 w-4" />{lang === "en" ? "Sign out" : "Oturumu kapat"}
              </button>
            </div>
          )}
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            onClick={() => setAccountMenuOpen((open) => !open)}
            className={`flex min-h-14 w-full items-center gap-3 rounded-xl border p-2.5 text-left transition hover:border-emerald-500/30 ${darkMode ? "border-zinc-800 bg-zinc-950/70" : "border-zinc-200 bg-zinc-50"}`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${darkMode ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-500/10 text-emerald-700"}`}>
              <UserRound className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">{userProfile.name}</span>
              <span className="mt-0.5 block truncate text-[10px] opacity-55">{userProfile.email}</span>
            </span>
            {accountMenuOpen ? <ChevronDown className="h-4 w-4 shrink-0 opacity-55" /> : <ChevronUp className="h-4 w-4 shrink-0 opacity-55" />}
          </button>

          {/* Gizlilik & Kullanım Koşulları */}
          <button
            onClick={() => switchTab("updates")}
            className={`flex min-h-12 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition ${activeTab === "updates" ? "bg-emerald-500/10 text-emerald-500" : `hover:bg-zinc-800/30 hover:underline ${darkMode ? "text-zinc-300" : "text-zinc-600"}`}`}
          >
            <Link2 className="h-3 w-3" />
            {t.updates}
          </button>

          <button
            onClick={() => setIsLegalOpen(true)}
            className="flex min-h-12 w-full items-center justify-center gap-1 text-xs opacity-60 hover:underline hover:opacity-90"
          >
            <Scale className="h-3 w-3" />
            {t.legal}
          </button>
          <p className="pb-1 text-center text-[9px] opacity-35">KineticAI by True Kinetic Studios</p>
        </div>
      </aside>

      {/* SAĞ ANA ALAN */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <header
          className={`relative flex min-h-[56px] items-center justify-between border-b px-4 py-2 md:px-6 ${darkMode ? "border-zinc-800/80" : "border-zinc-200 bg-white/70"
            }`}
        >
          <div className="flex items-center gap-2 text-xs">
            {activeTab !== "chat" ? (
              <button
                onClick={() => switchTab("chat")}
                className="touch-target flex items-center justify-center rounded-xl md:hidden"
                aria-label={t.goBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={openMobileMenu}
                className="touch-target flex items-center justify-center rounded-xl md:hidden"
                aria-label={t.menu}
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            {activeTab === "updates" ? (
            <span className="font-semibold">{t.updates}</span>
            ) : activeTab === "settings" ? (
              <span className="font-semibold">{t.tabSettings}</span>
            ) : activeProvider ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold">{activeProvider.name}</span>
                {activeTab === "chat" && chainMode && secondaryProvider && (
                  <span className="text-emerald-400">→ {secondaryProvider.name}</span>
                )}
                <span
                  className={`hidden rounded-md px-2 py-0.5 text-[11px] sm:inline-block ${darkMode ? "bg-zinc-800 text-zinc-300" : "bg-zinc-200 text-zinc-700"
                    }`}
                >
                  {activeProvider.model}
                </span>
              </div>
            ) : (
              <span className="opacity-50">{t.noModelSelected}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleNotificationRequest}
              className={`flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border transition ${notificationsEnabled
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : darkMode
                    ? "border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                }`}
              title={t.notificationsBtn}
            >
              <Bell className="h-4 w-4" />
            </button>

            {activeTab === "chat" && (
              <>
                <button
                  onClick={() => {
                    triggerHaptic("light");
                    setShowSettingsPanel(!showSettingsPanel);
                  }}
                  className={`flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 text-xs transition ${showSettingsPanel
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                      : darkMode
                        ? "border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                        : "border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                    }`}
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t.settingsBridge}</span>
                </button>

                <button
                  onClick={handleExportChat}
                  disabled={messages.length === 0}
                  className={`flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 text-xs transition disabled:opacity-30 ${darkMode
                      ? "border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                      : "border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                    }`}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t.exportMd}</span>
                </button>
              </>
            )}
          </div>

          {/* AÇILIR ASİSTAN & KÖPRÜ PANELİ */}
          {showSettingsPanel && activeTab === "chat" && (
            <div
              className={`absolute right-2 top-[calc(100%+0.25rem)] z-30 max-h-[min(78dvh,42rem)] w-[min(24rem,calc(100vw-1rem))] space-y-3 overflow-y-auto overscroll-contain rounded-2xl border p-4 shadow-2xl animate-scaleIn ${darkMode
                  ? "border-zinc-800 bg-zinc-900 text-zinc-100"
                  : "border-zinc-200 bg-white text-zinc-900"
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{t.settingsBridge}</span>
                <button
                  onClick={() => setShowSettingsPanel(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg opacity-60 hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="mb-1 block text-[11px] opacity-60">Asistan Kişiliği</label>
                <CustomSelect
                  value={assistantPreset}
                  onChange={(val) => setAssistantPreset(val)}
                  darkMode={darkMode}
                  searchable={false}
                  options={Object.entries(ASSISTANT_PRESETS).map(([k, v]) => ({
                    value: k,
                    label: v.label,
                  }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] opacity-60">
                  Özel Talimat (İsteğe bağlı)
                </label>
                <textarea
                  rows={2}
                  maxLength={3000}
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="Boş bırakılırsa seçili kişilik uygulanır..."
                  className={`w-full resize-none rounded-lg border p-2 text-xs outline-none ${darkMode ? "border-zinc-800 bg-zinc-950" : "border-zinc-300 bg-zinc-50"
                    }`}
                />
              </div>

              <div className="space-y-2 border-t border-zinc-800/50 pt-2.5 text-xs">
                <label className="flex min-h-[36px] cursor-pointer items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 opacity-70" />
                    Otomatik Yedek AI
                  </span>
                  <input
                    type="checkbox"
                    checked={autoFallback}
                    onChange={(e) => setAutoFallback(e.target.checked)}
                    className="h-4 w-4 accent-emerald-500"
                  />
                </label>
                <p className="-mt-1 text-[10px] leading-relaxed opacity-55">
                  {lang === "en"
                    ? "If a provider fails, KineticAI can retry with another connected provider."
                    : "Bir sağlayıcı yanıt vermezse KineticAI bağlı başka bir sağlayıcıyla yeniden deneyebilir."}
                </p>

                <label className="flex min-h-[36px] cursor-pointer items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5 opacity-70" />
                    AI Köprüsü (2 AI Bağla)
                  </span>
                  <input
                    type="checkbox"
                    checked={chainMode}
                    onChange={(e) => setChainMode(e.target.checked)}
                    className="h-4 w-4 accent-emerald-500"
                  />
                </label>
                <p className="-mt-1 text-[10px] leading-relaxed opacity-55">
                  {lang === "en"
                    ? "The second AI reviews the first answer. It makes another provider request and may use more tokens, quota and time."
                    : "İkinci yapay zekâ ilk yanıtı inceler. Ayrı bir sağlayıcı isteği gönderir; ek token, kota ve süre kullanabilir."}
                </p>

                {chainMode && secondaryProviderOptions.length === 0 && (
                  <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-300">
                    {lang === "en"
                      ? "The bridge needs a second, different API connection. Add another provider to enable its review step."
                      : "Köprü için farklı bir ikinci API bağlantısı gerekir. İnceleme adımını kullanmak için başka bir sağlayıcı ekle."}
                  </p>
                )}

                {chainMode && secondaryProviderOptions.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <CustomSelect
                      value={secondaryProvider?.id || ""}
                      onChange={(val) => setSecondaryProviderId(val)}
                      darkMode={darkMode}
                      options={secondaryProviderOptions.map((p) => ({
                        value: p.id,
                        label: `2. AI: ${p.name}`,
                        sublabel: p.model,
                      }))}
                    />
                    <CustomSelect
                      value={bridgeRole}
                      onChange={(val) => setBridgeRole(val)}
                      darkMode={darkMode}
                      searchable={false}
                      options={Object.entries(BRIDGE_MODES).map(([key, cfg]) => ({
                        value: key,
                        label: `Rol: ${cfg.label}`,
                      }))}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        {/* İÇERİK MODLARI */}
        {activeTab === "notebook" && (
          <div className="flex-1 overflow-hidden">
            <NotebookStudio
              activeProvider={activeProvider}
              onAskAI={runAIRequest}
              darkMode={darkMode}
              lang={lang}
              reasoningLevel={reasoningLevel}
            />
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="flex-1 overflow-y-auto">
            <TaskManager
              activeProvider={activeProvider}
              onAskAI={runAIRequest}
              darkMode={darkMode}
              lang={lang}
              reasoningLevel={reasoningLevel}
            />
          </div>
        )}

        {activeTab === "settings" && (
          <SettingsStudio
            lang={lang}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            setLang={setLang}
            notificationsEnabled={notificationsEnabled}
            onRequestNotifications={handleNotificationRequest}
            userProfile={userProfile}
            onOpenAccount={() => setIsAccountOpen(true)}
            onManageProviders={() => {
              setConnectionNotice("");
              setConnectionNoticeIsError(false);
              setIsConnectionManagerOpen(true);
            }}
            quota={{
              dailyCount: userProfile.dailyCount,
              dailyLimit: 100,
              tokenUsage: userProfile.dailyTokenUsage,
              modelTokenUsage: userProfile.tokenUsageByModel,
              onResetQuota: requestMonthlyQuotaReset,
              monthlyResetAvailable: monthlyQuotaReset.available,
              monthlyResetUsed: monthlyQuotaReset.used,
              resetLoading: quotaResetLoading,
              resetError: quotaResetError,
            }}
          />
        )}

        {activeTab === "updates" && (
          <UpdatesModal
            isOpen
            embedded
            onClose={() => switchTab("chat")}
            darkMode={darkMode}
          />
        )}

        {activeTab === "chat" && (
          <>
            <div className="relative min-h-0 flex-1">
            <div
              ref={chatScrollRef}
              onScroll={(event) => {
                const container = event.currentTarget;
                const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 96;
                chatAtBottomRef.current = atBottom;
                setShowScrollToBottom(!atBottom);
              }}
              className="h-full overflow-y-auto px-4 py-6"
            >
              <div className="mx-auto max-w-3xl space-y-6">
                {messages.length === 0 ? (
                  <ChatEmptyState
                    userName={userProfile.name}
                    lang={lang}
                    darkMode={darkMode}
                    hasProviders={providers.length > 0}
                    onOpenProviderModal={() => setIsModalOpen(true)}
                    onQuickPrompt={(prompt, enablesWeb) => {
                      if (enablesWeb) setWebSearch(true);
                      handleSend(prompt);
                    }}
                  />
                ) : (
                  messages.map((msg, idx) => {
                    const isAssistant = msg.role !== "user";
                    const isLastMessage = idx === messages.length - 1;

                    return (
                      <div
                        key={msg.id ?? `${msg.role}-${idx}`}
                        className={`group flex w-full max-w-2xl gap-3 ${!isAssistant ? "ml-auto justify-end" : ""
                          }`}
                      >
                        {isAssistant && (
                          <div
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${darkMode
                                ? "border-zinc-800 bg-zinc-900 text-emerald-400"
                                : "border-zinc-200 bg-white text-zinc-700"
                              }`}
                          >
                            <Bot className="h-4 w-4" />
                          </div>
                        )}

                        <div
                          className={`min-w-0 flex-1 space-y-1.5 ${!isAssistant ? "text-right" : ""
                            }`}
                        >
                          {isAssistant && msg.providerName && (
                            <div className="text-[11px] font-medium opacity-50">
                              {msg.providerName}
                            </div>
                          )}

                          <MarkdownMessage content={msg.content} darkMode={darkMode} />

                          {isAssistant && msg.sources?.length > 0 && (
                            <section
                              aria-label={lang === "en" ? "Sources" : "Kaynaklar"}
                              className={`mt-3 rounded-xl border p-3 text-left ${darkMode ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-200 bg-zinc-100/70"}`}
                            >
                              <h3 className="mb-2 text-[11px] font-semibold opacity-70">
                                {lang === "en" ? "Sources used" : "Yanıtta kullanılan kaynaklar"}
                              </h3>
                              <ul className="space-y-1.5">
                                {msg.sources.map((source, sourceIndex) => (
                                  <li key={`${source.url}-${sourceIndex}`} className="min-w-0">
                                    <a
                                      href={source.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block truncate text-xs text-emerald-500 underline decoration-emerald-500/30 underline-offset-2 hover:decoration-emerald-500"
                                    >
                                      {source.title}
                                    </a>
                                    <span className="text-[10px] opacity-50">
                                      {source.source}{source.date ? ` · ${source.date}` : ""}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </section>
                          )}

                          {msg.streaming && (
                            <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-emerald-400 align-middle" />
                          )}

                          {isAssistant && (
                            <div className="flex items-center gap-2 pt-1 opacity-75 transition group-hover:opacity-100">
                              <button
                                onClick={() => handleCopyMessage(msg.content, idx)}
                                className="flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-[11px] hover:bg-zinc-800/30"
                              >
                                {copiedIndex === idx ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-400" />
                                    <span>{t.copied}</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>{t.copy}</span>
                                  </>
                                )}
                              </button>

                              {isLastMessage && !isLoading && (
                                <button
                                  onClick={handleRegenerate}
                                  className="flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-[11px] hover:bg-zinc-800/30"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span>{t.regenerate}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                {isLoading && isSlowWait && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 animate-fadeIn">
                    <span>{t.timeoutWarning}</span>
                    <button
                      onClick={handleStopGenerating}
                      className="min-h-[36px] rounded-lg bg-amber-400 px-3 font-semibold text-zinc-950"
                    >
                      {t.cancel}
                    </button>
                  </div>
                )}
                {errorMsg && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400 animate-fadeIn">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                    {!isLoading && messages.length > 0 && errorCode !== "LIMIT_REACHED" && (
                      <button
                        onClick={handleRegenerate}
                        className="min-h-12 rounded-lg border border-red-500/40 px-3 font-medium hover:bg-red-500/20"
                      >
                        {t.retry}
                      </button>
                    )}
                    {errorCode === "LIMIT_REACHED" && monthlyQuotaReset.available && (
                      <button
                        type="button"
                        onClick={requestMonthlyQuotaReset}
                        disabled={quotaResetLoading}
                        className="min-h-12 rounded-lg bg-emerald-500 px-3 font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
                      >
                        {lang === "en" ? "Use monthly reset" : "Aylık sıfırlamayı kullan"}
                      </button>
                    )}
                  </div>
                )}

              </div>
            </div>
            {showScrollToBottom && (
              <button
                type="button"
                onClick={() => scrollConversationToBottom("smooth")}
                className={`absolute bottom-4 left-1/2 z-20 flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full border px-4 text-xs font-semibold shadow-lg transition hover:-translate-x-1/2 hover:-translate-y-0.5 ${darkMode ? "border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700" : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"}`}
                aria-label={lang === "en" ? "Scroll to the latest message" : "En aşağıya in"}
              >
                <ArrowDown className="h-4 w-4" />
                {lang === "en" ? "Latest message" : "En aşağıya in"}
              </button>
            )}
            </div>

            {/* Alt Mesaj Kutusu */}
            <div className="px-4 pb-3 pt-2">
              <div className="mx-auto max-w-3xl">
                {attachments.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs ${darkMode
                            ? "border-zinc-800 bg-zinc-900 text-zinc-200"
                            : "border-zinc-300 bg-white text-zinc-800"
                          }`}
                      >
                        {att.kind === "image" ? (
                          <ImageIcon className="h-3.5 w-3.5 opacity-70" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 opacity-70" />
                        )}
                        <span className="max-w-[160px] truncate">{att.name}</span>
                        <button
                          onClick={() =>
                            setAttachments((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="opacity-60 hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className={`flex flex-col gap-1 rounded-2xl border p-2 shadow-sm ${darkMode ? "border-zinc-800 bg-zinc-900/90" : "border-zinc-300 bg-white"
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".txt,.js,.jsx,.ts,.tsx,.py,.json,.md,.csv,.html,.css,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <div className="relative z-20 flex min-w-0 flex-wrap items-center gap-2 px-1 pb-1">
                    <label className="flex shrink-0 items-center gap-1.5 text-[10px] opacity-75">
                      <span>{lang === "en" ? "Model" : "Model"}</span>
                      {activeProvider ? (
                        <span className="block min-w-[180px] max-w-[46vw] sm:max-w-[280px]">
                          <CustomSelect
                            value={activeProvider.model || ""}
                            onChange={(value) => { triggerHaptic("light"); updateProviderModel(activeProvider.id, value); }}
                            darkMode={darkMode}
                            options={activeProviderModels.map((model) => ({ value: model, label: model }))}
                            placeholder={lang === "en" ? "Choose a model" : "Model seç"}
                            placement="top"
                          />
                        </span>
                      ) : (
                        <span className={`rounded-lg border px-2.5 py-2 text-[11px] ${darkMode ? "border-zinc-700 bg-zinc-950" : "border-zinc-300 bg-white"}`}>
                          {lang === "en" ? "Connect an API" : "API bağla"}
                        </span>
                      )}
                    </label>
                    <label className="flex min-h-9 shrink-0 items-center gap-1.5 text-[10px] opacity-75">
                      <Brain className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="sr-only">{lang === "en" ? "Reasoning level" : "Düşünme seviyesi"}</span>
                      <span className="w-[6.5rem]">
                        <CustomSelect
                          value={reasoningLevel}
                          onChange={(value) => setReasoningLevel(normalizeReasoningLevel(value))}
                          darkMode={darkMode}
                          searchable={false}
                          options={[
                            { value: "auto", label: lang === "en" ? "Auto" : "Otomatik" },
                            { value: "low", label: lang === "en" ? "Low" : "Düşük" },
                            { value: "medium", label: lang === "en" ? "Medium" : "Orta" },
                            { value: "high", label: lang === "en" ? "High" : "Yüksek" },
                          ]}
                        />
                      </span>
                    </label>
                  </div>

                  <div className="flex w-full min-w-0 items-end gap-2">

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl opacity-60 transition hover:bg-zinc-800/30 hover:opacity-100"
                    title="Dosya veya Görsel Ekle"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setWebSearch(!webSearch);
                    }}
                    disabled={isLoading}
                    aria-pressed={webSearch}
                    className={`flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl px-2.5 text-xs font-medium transition ${webSearch
                        ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                        : "opacity-60 hover:bg-zinc-800/30 hover:opacity-100"
                      }`}
                    title={lang === "en" ? "Search the web; current exchange rates use the official central-bank feed." : "Web'de ara; güncel döviz sorularında resmi TCMB verisi kullanılır."}
                  >
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">Web</span>
                  </button>

                  <textarea
                    rows={1}
                    value={input}
                    readOnly={isListening}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? (lang === "en" ? "Listening… speak now" : "Dinleniyor… şimdi konuş") : t.inputPlaceholder}
                    className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-1 py-2.5 text-sm outline-none"
                  />

                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    disabled={isLoading}
                    aria-label={isListening ? (lang === "en" ? "Stop voice input" : "Sesle yazmayı durdur") : (lang === "en" ? "Start voice input" : "Sesle yazmayı başlat")}
                    title={isListening ? (lang === "en" ? "Listening…" : "Dinleniyor…") : (lang === "en" ? "Voice input" : "Sesle yaz")}
                    className={`flex min-h-[44px] min-w-[40px] shrink-0 items-center justify-center rounded-xl transition disabled:opacity-30 ${isListening ? "bg-red-500/15 text-red-500 animate-pulse" : "opacity-60 hover:bg-zinc-800/30 hover:opacity-100"}`}
                  >
                    <Mic className="h-4 w-4" />
                  </button>

                  {isLoading ? (
                    <button
                      type="button"
                      onClick={handleStopGenerating}
                      className={`flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl transition ${darkMode
                          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          : "bg-red-100 text-red-600 hover:bg-red-200"
                        }`}
                      title={t.cancel}
                    >
                      <Square className="h-4 w-4 fill-current" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSend()}
                      disabled={!input.trim() && attachments.length === 0}
                      className={`flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl transition disabled:opacity-30 ${darkMode
                          ? "bg-white text-zinc-950 hover:bg-zinc-200"
                          : "bg-zinc-900 text-white hover:bg-zinc-800"
                        }`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                  )}
                  </div>

                  <p className="px-1 text-[10px] leading-relaxed opacity-50">
                    {reasoningLevel !== "auto" && reasoningSupport === "unsupported"
                      ? (lang === "en" ? "This model does not expose a reasoning control; the provider will use its default." : "Bu model düşünme seviyesi ayarını desteklemiyor; sağlayıcının varsayılanı kullanılacak.")
                      : reasoningLevel === "high"
                        ? (lang === "en" ? "High reasoning may use additional provider tokens and increase cost or latency." : "Yüksek düşünme desteklenen modellerde ek token ve maliyet/süre oluşturabilir.")
                        : (lang === "en" ? `Chat input estimate ≈ ${estimatedChatInputTokens.toLocaleString("en-US")} tokens including history. Notes add source text; tasks add generated items. Provider counts are authoritative.` : `Sohbet giriş tahmini ≈ ${estimatedChatInputTokens.toLocaleString("tr-TR")} token (geçmiş dahil). Notlar kaynak metnini, görevler üretilen maddeleri ekler. Gerçek sayaç sağlayıcı verisidir.`)}
                  </p>
                </div>

                <p className="mt-2 text-center text-[10px] opacity-40">
                  {t.disclaimer}
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      {isConnectionManagerOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setIsConnectionManagerOpen(false); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="connection-manager-title"
            className={`flex max-h-[min(90dvh,48rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${darkMode ? "border-zinc-700 bg-zinc-900 text-zinc-100" : "border-zinc-200 bg-white text-zinc-900"}`}
          >
            <header className={`flex shrink-0 items-start justify-between gap-3 border-b p-4 sm:p-5 ${darkMode ? "border-zinc-800" : "border-zinc-200"}`}>
              <div className="min-w-0">
                <h2 id="connection-manager-title" className="text-base font-semibold">
                  {lang === "en" ? "API connections" : "API bağlantıları"}
                </h2>
                <p className="mt-1 text-xs leading-relaxed opacity-60">
                  {lang === "en" ? "Change the active connection or its model here. API keys stay hidden in this list." : "Etkin bağlantıyı veya modelini buradan değiştir. API anahtarları bu listede gösterilmez."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsConnectionManagerOpen(false)}
                className="touch-target flex shrink-0 items-center justify-center rounded-xl opacity-60 hover:bg-zinc-500/10 hover:opacity-100"
                aria-label={lang === "en" ? "Close" : "Kapat"}
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
              {connectionNotice && (
                <p role={connectionNoticeIsError ? "alert" : "status"} className={`rounded-xl border p-3 text-xs leading-relaxed ${connectionNoticeIsError ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"}`}>
                  {connectionNotice}
                </p>
              )}
              {providers.map((provider) => {
                const availableModels = Array.isArray(provider.availableModels)
                  ? [...new Set([
                      ...provider.availableModels.filter((model) => typeof model === "string" && model.trim() && model.length <= 200),
                      ...(provider.model ? [provider.model] : []),
                    ])].slice(0, 250)
                  : (provider.model ? [provider.model] : []);
                const isActive = provider.id === activeProviderId;
                return (
                  <article key={provider.id} className={`rounded-xl border p-3 sm:p-4 ${isActive ? "border-emerald-500/40" : darkMode ? "border-zinc-800" : "border-zinc-200"}`}>
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => { setActiveProviderId(provider.id); triggerHaptic("light"); }}
                        className="min-h-10 min-w-0 flex-1 text-left"
                        aria-pressed={isActive}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-semibold">{provider.name}</span>
                          {isActive && <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">{lang === "en" ? "ACTIVE" : "ETKİN"}</span>}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] opacity-50">{provider.type}</span>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => refreshProviderModels(provider.id)}
                          disabled={Boolean(refreshingProviderId)}
                          className={`touch-target flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-[10px] font-medium transition disabled:opacity-50 ${darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-100"}`}
                          aria-label={lang === "en" ? `Refresh models for ${provider.name}` : `${provider.name} modellerini yenile`}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${refreshingProviderId === provider.id ? "animate-spin" : ""}`} />
                          <span className="hidden sm:inline">{lang === "en" ? "Refresh" : "Yenile"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDeleteProvider(provider.id)}
                          className="touch-target flex items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
                          aria-label={`${lang === "en" ? "Remove" : "Bağlantıyı kaldır"}: ${provider.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <label className="mt-3 block text-[10px] font-medium opacity-60">
                      {lang === "en" ? `Model${availableModels.length ? ` · ${availableModels.length} available` : ""}` : `Model${availableModels.length ? ` · ${availableModels.length} kullanılabilir` : ""}`}
                    </label>
                    {availableModels.length > 0 ? (
                      <div className="mt-1">
                        <CustomSelect
                          value={availableModels.includes(provider.model) ? provider.model : availableModels[0]}
                          onChange={(value) => updateProviderModel(provider.id, value)}
                          darkMode={darkMode}
                          options={availableModels.map((model) => ({ value: model, label: model }))}
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={provider.model || ""}
                        maxLength={200}
                        onChange={(event) => updateProviderModel(provider.id, event.target.value)}
                        placeholder={lang === "en" ? "Model ID (refresh the list if supported)" : "Model kimliği (destekleniyorsa listeyi yenile)"}
                        className={`mt-1 min-h-11 w-full rounded-lg border px-3 text-xs outline-none focus:border-emerald-500/60 ${darkMode ? "border-zinc-700 bg-zinc-950" : "border-zinc-300 bg-zinc-50"}`}
                      />
                    )}
                  </article>
                );
              })}
            </div>

            <footer className={`flex shrink-0 flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:justify-between sm:p-5 ${darkMode ? "border-zinc-800" : "border-zinc-200"}`}>
              <p className="self-center text-[10px] leading-relaxed opacity-50">{lang === "en" ? "Changing a model keeps the same API connection." : "Model değişikliği aynı API bağlantısını kullanır."}</p>
              <button
                type="button"
                onClick={() => { setIsConnectionManagerOpen(false); setIsModalOpen(true); }}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold ${darkMode ? "bg-white text-zinc-950 hover:bg-zinc-200" : "bg-zinc-900 text-white hover:bg-zinc-800"}`}
              >
                <Plus className="h-4 w-4" />{lang === "en" ? "Add API connection" : "API bağlantısı ekle"}
              </button>
            </footer>
          </section>
        </div>
      )}

      <ProviderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddProvider}
        darkMode={darkMode}
      />

      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        firebaseUser={firebaseUser}
        userProfile={userProfile}
        darkMode={darkMode}
      />

      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        darkMode={darkMode}
      />


      <TutorModal
        isOpen={isTutorOpen}
        onClose={() => setIsTutorOpen(false)}
        darkMode={darkMode}
      />

      <PermissionModal
        isOpen={isPermissionOpen}
        onAllow={handleAllowNotifications}
        onDeny={() => setIsPermissionOpen(false)}
        darkMode={darkMode}
        lang={lang}
      />

      <ConfirmModal
        isOpen={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        danger={confirmState.danger}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState({ open: false })}
        darkMode={darkMode}
      />
    </div>
  );
}
