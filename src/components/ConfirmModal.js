// src/components/ConfirmModal.js
"use client";

import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = "Onayla",
  cancelText = "İptal",
  danger = true,
  onConfirm,
  onCancel,
  darkMode,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl animate-scaleIn ${
          darkMode
            ? "border-zinc-800 bg-zinc-900 text-zinc-100"
            : "border-zinc-200 bg-white text-zinc-900"
        }`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                danger ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg opacity-60 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-5 text-xs leading-relaxed opacity-75">{description}</p>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className={`min-h-[44px] flex-1 rounded-xl border px-4 text-xs font-medium transition ${
              darkMode
                ? "border-zinc-700 hover:bg-zinc-800"
                : "border-zinc-300 hover:bg-zinc-100"
            }`}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[44px] flex-1 rounded-xl px-4 text-xs font-semibold transition ${
              danger
                ? "bg-red-600 text-white hover:bg-red-500"
                : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}