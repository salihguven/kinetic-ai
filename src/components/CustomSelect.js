// src/components/CustomSelect.js
"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "Seçiniz...",
  darkMode = true,
  searchable = null,
  placement = "auto",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState(null);
  const wrapperRef = useRef(null);
  const menuRef = useRef(null);

  const showSearch = searchable !== null ? searchable : options.length > 6;
  const selectedOption = options.find((o) => String(o.value) === String(value));
  const filtered = query.trim()
    ? options.filter((o) =>
        `${o.label} ${o.sublabel || ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      )
    : options;

  useEffect(() => {
    const handleOutside = (e) => {
      if (!wrapperRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;

    const updatePosition = () => {
      const anchor = wrapperRef.current?.getBoundingClientRect();
      if (!anchor) return;

      const gap = 6;
      const sidePadding = 8;
      const availableAbove = Math.max(96, anchor.top - sidePadding - gap);
      const availableBelow = Math.max(96, window.innerHeight - anchor.bottom - sidePadding - gap);
      const opensAbove = placement === "top" || (placement !== "bottom" && availableBelow < 240 && availableAbove > availableBelow);
      const maxHeight = Math.min(320, opensAbove ? availableAbove : availableBelow);
      const width = Math.min(anchor.width, window.innerWidth - sidePadding * 2);
      const left = Math.max(sidePadding, Math.min(anchor.left, window.innerWidth - width - sidePadding));
      const preferredTop = opensAbove ? anchor.top - maxHeight - gap : anchor.bottom + gap;
      const top = Math.max(sidePadding, Math.min(preferredTop, window.innerHeight - maxHeight - sidePadding));

      setMenuPosition({ top, left, width, maxHeight });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, placement]);

  useLayoutEffect(() => {
    if (!open || !menuPosition) return;
    const anchor = wrapperRef.current?.getBoundingClientRect();
    const menuHeight = menuRef.current?.getBoundingClientRect().height;
    if (!anchor || !menuHeight) return;

    const gap = 6;
    const sidePadding = 8;
    const availableAbove = Math.max(96, anchor.top - sidePadding - gap);
    const availableBelow = Math.max(96, window.innerHeight - anchor.bottom - sidePadding - gap);
    const opensAbove = placement === "top" || (placement !== "bottom" && availableBelow < 240 && availableAbove > availableBelow);
    const preferredTop = opensAbove ? anchor.top - menuHeight - gap : anchor.bottom + gap;
    const top = Math.max(sidePadding, Math.min(preferredTop, window.innerHeight - menuHeight - sidePadding));
    setMenuPosition((current) => current.top === top ? current : { ...current, top });
  }, [open, menuPosition, placement, filtered.length, showSearch]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          setQuery("");
        }}
        className={`flex min-h-[42px] w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition outline-none ${
          open
            ? darkMode
              ? "border-emerald-500/60 bg-zinc-950 text-white"
              : "border-zinc-900 bg-white text-zinc-900"
            : darkMode
            ? "border-zinc-800 bg-zinc-950 text-zinc-100 hover:border-zinc-700"
            : "border-zinc-300 bg-zinc-50 text-zinc-900 hover:border-zinc-400"
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 opacity-55 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && menuPosition && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", top: menuPosition.top, left: menuPosition.left, width: menuPosition.width, maxHeight: menuPosition.maxHeight }}
          className={`z-[1000] overflow-hidden rounded-xl border shadow-2xl animate-scaleIn ${
            darkMode ? "border-zinc-800 bg-zinc-900 text-zinc-100" : "border-zinc-200 bg-white text-zinc-900"
          }`}
        >
          {showSearch && (
            <div
              className={`flex items-center gap-2 border-b px-3 py-2 ${
                darkMode ? "border-zinc-800 bg-zinc-950/60" : "border-zinc-200 bg-zinc-50"
              }`}
            >
              <Search className="h-3.5 w-3.5 shrink-0 opacity-45" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ara..."
                className="w-full bg-transparent text-xs outline-none"
              />
            </div>
          )}

          <div role="listbox" className="space-y-0.5 overflow-y-auto p-1.5" style={{ maxHeight: Math.max(72, menuPosition.maxHeight - (showSearch ? 46 : 0)) }}>
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-xs opacity-50">Sonuç bulunamadı.</div>
            ) : (
              filtered.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                      isSelected
                        ? darkMode
                          ? "bg-emerald-500/15 text-emerald-300 font-medium"
                          : "bg-zinc-900 text-white font-medium"
                        : darkMode
                        ? "text-zinc-200 hover:bg-zinc-800"
                        : "text-zinc-800 hover:bg-zinc-100"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="truncate text-[10px] opacity-55">{opt.sublabel}</div>
                      )}
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
