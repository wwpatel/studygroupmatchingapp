"use client";

import { useEffect, useRef, useState } from "react";
import { Settings, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme/ThemeProvider";

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-line-soft hover:text-ink"
      >
        <Settings className="size-4.5" strokeWidth={1.9} />
        Settings
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-xl border border-line bg-paper-raised p-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Appearance
          </p>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-sm font-medium transition-colors",
                theme === "light"
                  ? "border-lavender bg-lavender text-black"
                  : "border-line text-ink-soft hover:border-ink/30",
              )}
            >
              <Sun className="size-3.5" /> Light
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-sm font-medium transition-colors",
                theme === "dark"
                  ? "border-lavender bg-lavender text-black"
                  : "border-line text-ink-soft hover:border-ink/30",
              )}
            >
              <Moon className="size-3.5" /> Dark
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
