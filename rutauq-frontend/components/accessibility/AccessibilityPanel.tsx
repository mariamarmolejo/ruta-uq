"use client";

import { useEffect, useRef, useState } from "react";
import { Accessibility, X, ZoomIn, ZoomOut, Sun, Zap, Contrast } from "lucide-react";

type FontSize = "normal" | "large" | "xlarge";

interface A11yPrefs {
  fontSize: FontSize;
  highContrast: boolean;
  reduceMotion: boolean;
  grayscale: boolean;
}

const STORAGE_KEY = "rutauq-a11y";

const DEFAULTS: A11yPrefs = {
  fontSize: "normal",
  highContrast: false,
  reduceMotion: false,
  grayscale: false,
};

const FONT_CLASSES: Record<FontSize, string> = {
  normal: "",
  large: "a11y-text-lg",
  xlarge: "a11y-text-xl",
};

function applyPrefs(prefs: A11yPrefs) {
  const html = document.documentElement;

  // Font size — remove all variants then add the active one
  html.classList.remove("a11y-text-lg", "a11y-text-xl");
  if (FONT_CLASSES[prefs.fontSize]) {
    html.classList.add(FONT_CLASSES[prefs.fontSize]);
  }

  html.classList.toggle("high-contrast", prefs.highContrast);
  html.classList.toggle("reduce-motion", prefs.reduceMotion);
  html.classList.toggle("grayscale-mode", prefs.grayscale);
}

export default function AccessibilityPanel() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<A11yPrefs>(DEFAULTS);

  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Restore persisted preferences once on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: A11yPrefs = { ...DEFAULTS, ...JSON.parse(stored) };
        setPrefs(parsed);
        applyPrefs(parsed);
      }
    } catch {
      // Corrupt storage — silently ignore, use defaults
    }
  }, []);

  // Persist and apply whenever preferences change
  useEffect(() => {
    applyPrefs(prefs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Storage unavailable — keep applying in-memory
    }
  }, [prefs]);

  // Close on Escape; trap focus inside panel when open
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Move focus into the panel on open
    panelRef.current?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function update<K extends keyof A11yPrefs>(key: K, value: A11yPrefs[K]) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  function decreaseFontSize() {
    const order: FontSize[] = ["normal", "large", "xlarge"];
    const idx = order.indexOf(prefs.fontSize);
    if (idx > 0) update("fontSize", order[idx - 1]);
  }

  function increaseFontSize() {
    const order: FontSize[] = ["normal", "large", "xlarge"];
    const idx = order.indexOf(prefs.fontSize);
    if (idx < order.length - 1) update("fontSize", order[idx + 1]);
  }

  function resetAll() {
    setPrefs(DEFAULTS);
  }

  const fontSizeLabel: Record<FontSize, string> = {
    normal: "Normal",
    large: "Grande",
    xlarge: "Muy grande",
  };

  return (
    <>
      {/* Floating trigger */}
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir panel de accesibilidad"
        aria-expanded={open}
        aria-controls="a11y-panel"
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-colors hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
      >
        <Accessibility size={22} aria-hidden="true" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        id="a11y-panel"
        ref={panelRef}
        role="dialog"
        aria-label="Opciones de accesibilidad"
        aria-modal="true"
        tabIndex={-1}
        hidden={!open}
        data-a11y-panel
        className={[
          "fixed bottom-20 right-6 z-50 w-72 rounded-xl border border-neutral-200 bg-white shadow-xl",
          "focus:outline-none",
          open ? "block" : "hidden",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-800">
            Accesibilidad
          </h2>
          <button
            onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
            aria-label="Cerrar panel de accesibilidad"
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-1 p-3">

          {/* Font size */}
          <div className="rounded-lg px-3 py-2">
            <p className="mb-2 text-xs font-medium text-neutral-500">
              Tamaño de texto
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={decreaseFontSize}
                disabled={prefs.fontSize === "normal"}
                aria-label="Reducir tamaño de texto"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
              >
                <ZoomOut size={15} aria-hidden="true" />
              </button>
              <span className="flex-1 text-center text-sm text-neutral-700">
                {fontSizeLabel[prefs.fontSize]}
              </span>
              <button
                onClick={increaseFontSize}
                disabled={prefs.fontSize === "xlarge"}
                aria-label="Aumentar tamaño de texto"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
              >
                <ZoomIn size={15} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Toggle rows */}
          {(
            [
              {
                key: "highContrast" as const,
                label: "Alto contraste",
                description: "Aumenta el contraste de colores",
                icon: <Contrast size={16} aria-hidden="true" />,
              },
              {
                key: "reduceMotion" as const,
                label: "Reducir movimiento",
                description: "Desactiva animaciones y transiciones",
                icon: <Zap size={16} aria-hidden="true" />,
              },
              {
                key: "grayscale" as const,
                label: "Escala de grises",
                description: "Aplica filtro de escala de grises",
                icon: <Sun size={16} aria-hidden="true" />,
              },
            ] as const
          ).map(({ key, label, description, icon }) => {
            const id = `a11y-toggle-${key}`;
            return (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-neutral-50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500">{icon}</span>
                  <div>
                    <label
                      htmlFor={id}
                      className="cursor-pointer text-sm font-medium text-neutral-700"
                    >
                      {label}
                    </label>
                    <p className="text-xs text-neutral-400">{description}</p>
                  </div>
                </div>
                <button
                  id={id}
                  role="switch"
                  aria-checked={prefs[key]}
                  aria-label={label}
                  onClick={() => update(key, !prefs[key])}
                  className={[
                    "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1",
                    prefs[key] ? "bg-primary-600" : "bg-neutral-200",
                  ].join(" ")}
                >
                  <span
                    aria-hidden="true"
                    className={[
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                      prefs[key] ? "translate-x-4" : "translate-x-0",
                    ].join(" ")}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 px-4 py-2">
          <button
            onClick={resetAll}
            className="w-full rounded-md py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          >
            Restablecer todo
          </button>
        </div>
      </div>
    </>
  );
}
