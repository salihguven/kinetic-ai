// src/lib/vpnGuard.js

const ipCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 dakika

function isLocalOrPrivateIP(ip) {
  if (!ip) return true;
  return (
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("::ffff:127.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") ||
    ip === "local-user"
  );
}

export function getClientIP(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "local-user";
}

export async function checkVpnOrWarp(request) {
  const ip = getClientIP(request);

  // Localhost geliştirme ortamında kendi bilgisayarını kilitleme
  if (isLocalOrPrivateIP(ip)) {
    return { blocked: false, ip };
  }

  // Önbellekte varsa tekrar sorma
  const cached = ipCache.get(ip);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(
        ip
      )}?fields=status,proxy,hosting,isp,org,as`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) return { blocked: false, ip };
    const data = await res.json();
    if (data.status !== "success") return { blocked: false, ip };

    const meta = `${data.isp || ""} ${data.org || ""} ${data.as || ""}`.toLowerCase();
    const isWarp = meta.includes("cloudflare") || meta.includes("as13335") || meta.includes("warp");
    const isKnownVpn =
      data.proxy === true ||
      data.hosting === true ||
      meta.includes("vpn") ||
      meta.includes("mullvad") ||
      meta.includes("nord") ||
      meta.includes("proton") ||
      meta.includes("expressvpn") ||
      meta.includes("surfshark");

    let result = { blocked: false, ip };
    if (isWarp) {
      result = {
        blocked: true,
        reason: "Cloudflare WARP tespit edildi. Güvenlik nedeniyle WARP kapalıyken erişebilirsiniz.",
        ip,
      };
    } else if (isKnownVpn) {
      result = {
        blocked: true,
        reason: "VPN veya Proxy bağlantısı tespit edildi. Lütfen VPN'i kapatıp tekrar deneyin.",
        ip,
      };
    }

    ipCache.set(ip, { time: Date.now(), result });
    return result;
  } catch {
    return { blocked: false, ip };
  }
}