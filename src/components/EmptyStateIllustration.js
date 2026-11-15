// src/components/EmptyStateIllustration.js
"use client";

export default function EmptyStateIllustration({ darkMode = true }) {
  const stroke = darkMode ? "#3f3f46" : "#d4d4d8";
  const accent = "#10b981";
  const cardBg = darkMode ? "#18181b" : "#ffffff";

  return (
    <svg
      width="136"
      height="96"
      viewBox="0 0 136 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto mb-3 animate-fadeIn"
    >
      <rect x="14" y="16" width="108" height="66" rx="14" fill={cardBg} stroke={stroke} strokeWidth="1.5" />
      <circle cx="32" cy="34" r="6" fill={accent} fillOpacity="0.2" stroke={accent} strokeWidth="1.5" />
      <rect x="46" y="30" width="56" height="6" rx="3" fill={stroke} />
      <rect x="26" y="50" width="84" height="5" rx="2.5" fill={stroke} fillOpacity="0.6" />
      <rect x="26" y="61" width="60" height="5" rx="2.5" fill={stroke} fillOpacity="0.4" />
      <circle cx="108" cy="18" r="9" fill={accent} />
      <path d="M104.5 18L107 20.5L111.5 15.5" stroke="#09090b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}