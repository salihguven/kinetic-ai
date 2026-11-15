// src/components/KineticLogo.js
"use client";

export default function KineticLogo({ size = 32, darkMode = true }) {
  const bg = darkMode ? "#ffffff" : "#18181b";
  const fg = darkMode ? "#09090b" : "#ffffff";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-300 hover:scale-105"
    >
      <rect width="40" height="40" rx="11" fill={bg} />
      <path
        d="M13 10.5V29.5"
        stroke={fg}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M26.5 11.5L16.5 20L26.5 28.5"
        stroke={fg}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="28.5" cy="20" r="2.6" fill="#10b981" />
    </svg>
  );
}