// src/components/CustomSelect.js
"use client";

import { useState, useRef, useEffect, useLayoutEffect, useId } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "@/components/KineticIcons";

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "Seçiniz...",
  darkMode = true,
  searchable = null,
  placement = "auto",
  ariaLabel,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);
  const controlId = useId();

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
    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
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
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop || 0;
      const viewportBottom = viewportTop + (viewport?.height || window.innerHeight);
      const availableAbove = Math.max(72, anchor.top - viewportTop - sidePadding - gap);
      const availableBelow = Math.max(72, viewportBottom - anchor.bottom - sidePadding - gap);
      const opensAbove = placement === "top" || (placement !== "bottom" && availableBelow < 240 && availableAbove > availableBelow);
      const maxHeight = Math.min(320, opensAbove ? availableAbove : availableBelow);
      const viewportWidth = viewport?.width || window.innerWidth;
      const width = Math.min(anchor.width, viewportWidth - sidePadding * 2);
      const left = Math.max(sidePadding, Math.min(anchor.left, viewportWidth - width - sidePadding));
      const preferredTop = opensAbove ? anchor.top - maxHeight - gap : anchor.bottom + gap;
      const top = Math.max(viewportTop + sidePadding, Math.min(preferredTop, viewportBottom - maxHeight - sidePadding));

      setMenuPosition({ top, left, width, maxHeight });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    const observer = typeof ResizeObserver !== "undefined" && wrapperRef.current
      ? new ResizeObserver(updatePosition)
      : null;
    if (wrapperRef.current) observer?.observe(wrapperRef.current);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
      observer?.disconnect();
    };
  }, [open, placement]);

  useLayoutEffect(() => {
    if (!open || !menuPosition) return;
    const anchor = wrapperRef.current?.getBoundingClientRect();
    const menuHeight = menuRef.current?.getBoundingClientRect().height;
    if (!anchor || !menuHeight) return;

    const gap = 6;
    const sidePadding = 8;
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop || 0;
    const viewportBottom = viewportTop + (viewport?.height || window.innerHeight);
    const availableAbove = Math.max(72, anchor.top - viewportTop - sidePadding - gap);
    const availableBelow = Math.max(72, viewportBottom - anchor.bottom - sidePadding - gap);
    const opensAbove = placement === "top" || (placement !== "bottom" && availableBelow < 240 && availableAbove > availableBelow);
    const preferredTop = opensAbove ? anchor.top - menuHeight - gap : anchor.bottom + gap;
    const top = Math.max(viewportTop + sidePadding, Math.min(preferredTop, viewportBottom - menuHeight - sidePadding));
    setMenuPosition((current) => current.top === top ? current : { ...current, top });
  }, [open, menuPosition, placement, filtered.length, showSearch]);

  useEffect(() => {
    if (!open || !filtered.length) return;
    const frame = requestAnimationFrame(() => {
      if (showSearch) menuRef.current?.querySelector("input")?.focus();
      else optionRefs.current[activeIndex]?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, filtered.length, activeIndex, showSearch]);

  const moveActive = (nextIndex) => {
    if (!filtered.length) return;
    const index = (nextIndex + filtered.length) % filtered.length;
    setActiveIndex(index);
    optionRefs.current[index]?.focus();
  };

  const handleListKeyDown = (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); moveActive(activeIndex + 1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); moveActive(activeIndex - 1); }
    else if (event.key === "Home") { event.preventDefault(); moveActive(0); }
    else if (event.key === "End") { event.preventDefault(); moveActive(filtered.length - 1); }
    else if (event.key === "Escape") { event.preventDefault(); setOpen(false); wrapperRef.current?.querySelector("button")?.focus(); }
    else if (event.key === "Enter" && filtered[activeIndex]) {
      event.preventDefault();
      onChange(filtered[activeIndex].value);
      setOpen(false);
      setQuery("");
      wrapperRef.current?.querySelector("button")?.focus();
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <button
        type="button"
        id={controlId}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${controlId}-listbox`}
        disabled={disabled}
        onClick={() => {
          const selectedIndex = filtered.findIndex((option) => String(option.value) === String(value));
          setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
          setOpen(!open);
          setQuery("");
        }}
        className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition outline-none md:min-h-[42px] disabled:cursor-not-allowed disabled:opacity-50 ${
          open
            ? darkMode
              ? "border-violet-400/60 bg-zinc-950 text-white"
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
          id={`${controlId}-listbox`}
          role="listbox"
          aria-labelledby={controlId}
          onKeyDown={handleListKeyDown}
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
                onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
                placeholder="Ara..."
                className="w-full bg-transparent text-xs outline-none"
              />
            </div>
          )}

          <div className="space-y-0.5 overflow-y-auto p-1.5 overscroll-contain" style={{ maxHeight: Math.max(56, menuPosition.maxHeight - (showSearch ? 46 : 0)) }}>
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-xs opacity-50">Sonuç bulunamadı.</div>
            ) : (
              filtered.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    ref={(element) => { optionRefs.current[filtered.indexOf(opt)] = element; }}
                    type="button"
                    role="option"
                    tabIndex={filtered.indexOf(opt) === activeIndex ? 0 : -1}
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setQuery("");
                      wrapperRef.current?.querySelector("button")?.focus();
                    }}
                    className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                      isSelected
                        ? darkMode
                          ? "bg-violet-500/15 text-violet-200 font-medium"
                          : "bg-zinc-900 text-white font-medium"
                        : darkMode
                        ? "text-zinc-200 hover:bg-zinc-800"
                        : "text-zinc-800 hover:bg-zinc-100"
                    } ${filtered.indexOf(opt) === activeIndex && !isSelected ? "ring-1 ring-inset ring-violet-400/40" : ""}`}
                  >
                    <div className="min-w-0">
                      <div className="truncate">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="truncate text-[10px] opacity-55">{opt.sublabel}</div>
                      )}
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-violet-300" />}
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
