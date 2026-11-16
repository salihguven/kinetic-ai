// src/app/layout.js
import "katex/dist/katex.min.css";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata = {
  metadataBase: new URL("https://truekinetichub.com.tr"),
  title: "KineticAI by True Kinetic Studios · AI Çalışma Alanı",
  description: "True Kinetic Studios tarafından geliştirilen KineticAI ile yapay zeka modellerini bağlayın, sohbet edin, not alın ve işlerinizi planlayın.",
  keywords: ["yapay zeka", "AI çalışma alanı", "AI araçları", "KineticAI"],
  authors: [{ name: "True Kinetic Studios" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "KineticAI",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/kineticai-192.png",
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className="antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
