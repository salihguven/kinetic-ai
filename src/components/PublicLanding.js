"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import Script from "next/script";
import { auth } from "@/lib/firebase";
import LandingContent from "@/components/LandingContent";

export default function PublicLanding() {
  const [darkMode, setDarkMode] = useState(true);
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setDarkMode(localStorage.getItem("kinetic_ai_theme") !== "light");
      } catch {
        // The default dark theme remains available when storage is disabled.
      }
      setThemeLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!themeLoaded) return;
    try {
      localStorage.setItem("kinetic_ai_theme", darkMode ? "dark" : "light");
    } catch {
      // Theme selection still works for the current page.
    }
  }, [darkMode, themeLoaded]);

  useEffect(() => onAuthStateChanged(auth, (user) => {
    if (user) window.location.replace("/app");
  }), []);

  return (
    <>
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6884932807385231"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <LandingContent darkMode={darkMode} setDarkMode={setDarkMode} />
    </>
  );
}
