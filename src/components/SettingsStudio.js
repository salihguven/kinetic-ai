"use client";

import {
  BarChart3, Bell, Check, ChevronRight, Cloud, Globe, Link2, Moon,
  ShieldCheck, Smartphone, Sparkles, Sun, UserRound,
} from "@/components/KineticIcons";
import QuotaCard from "@/components/QuotaCard";
import EncryptedBackupCard from "@/components/EncryptedBackupCard";

export default function SettingsStudio({
  lang = "tr", darkMode, setDarkMode, setLang, notificationsEnabled,
  onRequestNotifications, userProfile, onOpenAccount, onManageProviders, quota,
}) {
  const isEn = lang === "en";
  const card = "rounded-2xl border p-4 md:p-5 " +
    (darkMode ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-200 bg-white");
  const subtext = darkMode ? "text-zinc-400" : "text-zinc-600";
  const upcoming = [
    {
      icon: Smartphone,
      title: isEn ? "Android app" : "Android uygulaması",
      description: isEn
        ? "A dedicated Android experience with install and notification improvements."
        : "Kurulum, ekran düzeni ve bildirim desteği geliştirilmiş özel Android deneyimi.",
    },
    {
      icon: BarChart3,
      title: isEn ? "Usage history and cost insights" : "Kullanım geçmişi ve maliyet görünümü",
      description: isEn
        ? "Multi-day trends and comparable costs where providers expose reliable pricing data."
        : "Sağlayıcı güvenilir fiyat verisi sunduğunda çok günlük eğilimler ve karşılaştırmalı maliyetler.",
    },
    {
      icon: Cloud,
      title: isEn ? "Cross-device encrypted sync" : "Cihazlar arası şifreli eşitleme",
      description: isEn
        ? "Optional sync across devices with clear data controls. Encrypted file backup is available below."
        : "Veri kontrolü sende kalacak şekilde isteğe bağlı cihaz eşitleme. Şifreli dosya yedeği aşağıda kullanılabilir.",
    },
  ];
  return (
    <section className="flex-1 overflow-y-auto p-4 md:p-7">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-500">{isEn ? "Preferences" : "Tercihler"}</p>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{isEn ? "Settings" : "Ayarlar"}</h2>
          <p className={"mt-2 max-w-2xl text-sm leading-relaxed " + subtext}>
            {isEn ? "Manage app preferences, account and usage in one place." : "Uygulama tercihlerini, hesabını ve kullanımını tek yerden yönet."}
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className={card} aria-labelledby="settings-general">
            <h3 id="settings-general" className="mb-3 text-sm font-semibold">{isEn ? "General" : "Genel"}</h3>
            <div className="divide-y divide-zinc-800/40">
              <button type="button" onClick={() => setDarkMode((value) => !value)} aria-pressed={darkMode} className="flex min-h-14 w-full items-center gap-3 text-left">
                {darkMode ? <Moon className="h-4 w-4 shrink-0 text-emerald-500" /> : <Sun className="h-4 w-4 shrink-0 text-amber-500" />}
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium">{isEn ? "Appearance" : "Görünüm"}</span>
                  <span className={"mt-0.5 block text-[11px] " + subtext}>{darkMode ? (isEn ? "Dark theme" : "Koyu tema") : (isEn ? "Light theme" : "Açık tema")}</span>
                </span>
                <span className={"rounded-lg px-2.5 py-1.5 text-[11px] " + (darkMode ? "bg-zinc-800" : "bg-zinc-100")}>{isEn ? "Change" : "Değiştir"}</span>
              </button>
              <button type="button" onClick={() => setLang((value) => value === "tr" ? "en" : "tr")} className="flex min-h-14 w-full items-center gap-3 text-left">
                <Globe className="h-4 w-4 shrink-0 text-sky-500" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium">{isEn ? "Language" : "Dil"}</span>
                  <span className={"mt-0.5 block text-[11px] " + subtext}>{isEn ? "English" : "Türkçe"}</span>
                </span>
                <span className={"rounded-lg px-2.5 py-1.5 text-[11px] " + (darkMode ? "bg-zinc-800" : "bg-zinc-100")}>{lang.toUpperCase()}</span>
              </button>
              <button type="button" onClick={onRequestNotifications} aria-pressed={notificationsEnabled} className="flex min-h-14 w-full items-center gap-3 text-left">
                <Bell className="h-4 w-4 shrink-0 text-violet-500" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium">{isEn ? "Notifications" : "Bildirimler"}</span>
                  <span className={"mt-0.5 block text-[11px] " + subtext}>{notificationsEnabled ? (isEn ? "Enabled" : "Açık") : (isEn ? "Off" : "Kapalı")}</span>
                </span>
                <span className={"flex h-5 w-9 items-center rounded-full p-0.5 transition " + (notificationsEnabled ? "bg-emerald-500" : darkMode ? "bg-zinc-700" : "bg-zinc-300")}>
                  <span className={"h-4 w-4 rounded-full bg-white transition " + (notificationsEnabled ? "translate-x-4" : "translate-x-0")} />
                </span>
              </button>
              <button type="button" onClick={onManageProviders} className="flex min-h-14 w-full items-center gap-3 text-left">
                <Link2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium">{isEn ? "API connections" : "API bağlantıları"}</span>
                  <span className={"mt-0.5 block text-[11px] " + subtext}>
                    {isEn ? "Manage providers and refresh available models." : "Sağlayıcıları yönet ve kullanılabilir modelleri yenile."}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 opacity-55" />
              </button>
            </div>
          </section>

          <section className={card} aria-labelledby="settings-account">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 id="settings-account" className="text-sm font-semibold">{isEn ? "Account and privacy" : "Hesap ve gizlilik"}</h3>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className={"rounded-xl p-3 " + (darkMode ? "bg-zinc-950/70" : "bg-zinc-50")}>
              <p className="truncate text-xs font-semibold">{userProfile?.name || (isEn ? "Signed in" : "Oturum açık")}</p>
              <p className={"mt-0.5 truncate text-[11px] " + subtext}>{userProfile?.email}</p>
            </div>
            <p className={"mt-3 text-xs leading-relaxed " + subtext}>
              {isEn
                ? "Connected AI providers receive the messages and selected notes you send to them. Do not add passwords, recovery codes or private credentials to notes or prompts."
                : "Bağlı AI sağlayıcısı, gönderdiğin mesajları ve seçtiğin notları alır. Şifre, kurtarma kodu veya özel anahtarları notlara ya da mesajlara ekleme."}
            </p>
            <button type="button" onClick={onOpenAccount} className="mt-3 flex min-h-12 w-full items-center justify-between rounded-xl border border-zinc-700/30 px-3 text-left text-xs font-medium transition hover:bg-zinc-800/10">
              <span className="flex items-center gap-2"><UserRound className="h-4 w-4" />{isEn ? "Account security and deletion" : "Hesap güvenliği ve silme"}</span>
              <ChevronRight className="h-4 w-4 opacity-55" />
            </button>
          </section>

          <div className="lg:col-span-2">
            <QuotaCard {...quota} darkMode={darkMode} lang={lang} />
          </div>
        </div>

        <EncryptedBackupCard darkMode={darkMode} lang={lang} />

        <section className={card} aria-labelledby="settings-token-guide">
          <h3 id="settings-token-guide" className="text-sm font-semibold">{isEn ? "What changes token use?" : "Token kullanımı neye göre artar?"}</h3>
          <p className={"mt-1 text-xs leading-relaxed " + subtext}>
            {isEn
              ? "There is no fixed multiplier: model tokenizer, conversation history and output length change the total. The estimates below are only for comparing request size; provider-reported usage is the reliable count."
              : "Sabit bir kat oranı yoktur: modelin tokenizer'ı, sohbet geçmişi ve yanıt uzunluğu toplamı değiştirir. Aşağıdakiler yalnızca istek boyutunu kıyaslayan yaklaşık değerlerdir; güvenilir sayaç sağlayıcının bildirdiği kullanımdır."}
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {[
              [isEn ? "Chat · 1× baseline" : "Sohbet · 1× temel", isEn ? "Current message plus the conversation history sent with it." : "Mevcut mesaj ve istekle birlikte gönderilen sohbet geçmişi."],
              [isEn ? "Notes · source-dependent" : "Notlar · kaynağa bağlı", isEn ? "Selected source text is added to the question; its estimate appears beside the notebook." : "Seçili kaynak metni soruya eklenir; yaklaşık oran Notlar ekranında görünür."],
              [isEn ? "Tasks · prompt + 5–7 outputs" : "Görevler · istek + 5–7 çıktı", isEn ? "A short goal is sent, then the model's generated task list also consumes tokens." : "Kısa hedef gönderilir; modelin oluşturduğu görev listesi de token kullanır."],
            ].map(([title, description]) => (
              <article key={title} className={"rounded-xl p-3 " + (darkMode ? "bg-zinc-950/60" : "bg-zinc-50")}>
                <h4 className="text-xs font-semibold">{title}</h4>
                <p className={"mt-1 text-[11px] leading-relaxed " + subtext}>{description}</p>
              </article>
            ))}
          </div>
          <p className={"mt-3 text-[11px] leading-relaxed " + subtext}>
            {isEn
              ? "Higher reasoning can use more provider tokens. KineticAI sends a depth setting only to models known to support it; other models keep their own default."
              : "Yüksek düşünme seviyesi sağlayıcıda daha fazla token kullanabilir. KineticAI bu ayarı yalnızca desteklediği bilinen modellere gönderir; diğerleri kendi varsayılanını kullanır."}
          </p>
        </section>

        <section className={card + " border-violet-500/20"} aria-labelledby="settings-upcoming">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400"><Sparkles className="h-4 w-4" /></span>
            <div>
              <h3 id="settings-upcoming" className="text-sm font-semibold">{isEn ? "Coming soon" : "Yakında"}</h3>
              <p className={"mt-1 text-xs leading-relaxed " + subtext}>
                {isEn
                  ? "Planned improvements. No release dates are promised; availability will be announced in Updates."
                  : "Planlanan geliştirmeler. Yayın tarihi sözü verilmiyor; hazır olduğunda Güncellemeler bölümünde duyurulacak."}
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {upcoming.map(({ icon: Icon, title, description }) => (
              <article key={title} className={"rounded-xl border p-3 " + (darkMode ? "border-zinc-800 bg-zinc-950/40" : "border-zinc-200 bg-zinc-50")}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Icon className="h-4 w-4 text-violet-400" />
                  <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[9px] font-semibold text-violet-400">{isEn ? "Coming soon" : "Yakında"}</span>
                </div>
                <h4 className="text-xs font-semibold">{title}</h4>
                <p className={"mt-1.5 text-[11px] leading-relaxed " + subtext}>{description}</p>
              </article>
            ))}
          </div>
          <p className={"mt-3 flex items-center gap-1.5 text-[10px] " + subtext}>
            <Check className="h-3 w-3 text-emerald-500" />
            {isEn ? "These features are not available in the current beta." : "Bu özellikler mevcut beta sürümünde kullanıma açık değildir."}
          </p>
        </section>

        <p className={`flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] leading-relaxed ${subtext}`}>
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
          <span>
            {isEn
              ? "Available now: organize chats, notes and tasks with Projects, follow provider-reported daily token usage by model, and create encrypted local backups. API setup guides are inside Add API connection."
              : "Şimdi kullanılabilir: Sohbet, not ve görevlerini Projeler ile düzenle, sağlayıcının bildirdiği günlük token kullanımını model bazında gör ve şifreli yerel yedek oluştur. API kurulum rehberleri bağlantı ekleme ekranında."}
          </span>
        </p>
      </div>
    </section>
  );
}
