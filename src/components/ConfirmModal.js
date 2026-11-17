// src/components/ConfirmModal.js
"use client";

import { useEffect, useRef } from "react";
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
  zIndexClass = "z-50",
}) {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancelRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll(
        'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel?.();
      }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="kinetic-confirm-title"
      aria-describedby="kinetic-confirm-description"
    >
      <div
        ref={dialogRef}
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
            <h3 id="kinetic-confirm-title" className="text-sm font-semibold">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            type="button"
            className="touch-target flex items-center justify-center rounded-lg opacity-70 hover:opacity-100"
            aria-label={cancelText}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p id="kinetic-confirm-description" className="mb-5 text-xs leading-relaxed opacity-75">{description}</p>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            ref={cancelButtonRef}
            className={`min-h-12 flex-1 rounded-xl border px-4 text-xs font-medium transition ${
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
            className={`min-h-12 flex-1 rounded-xl px-4 text-xs font-semibold transition ${
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
