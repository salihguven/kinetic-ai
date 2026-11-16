// src/app/layout.js
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://truekinetichub.com.tr"),
  title: "KineticAI by True Kinetic Studios · AI Çalışma Alanı",
  description: "True Kinetic Studios tarafından geliştirilen KineticAI ile yapay zeka modellerini bağlayın, sohbet edin, not alın ve işlerinizi planlayın.",
  keywords: ["yapay zeka", "AI çalışma alanı", "AI araçları", "KineticAI"],
  authors: [{ name: "True Kinetic Studios" }],
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
