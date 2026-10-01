"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { pillAccent } from "@/app/components/styles";

type ToastTone = "info" | "error";

type ToastOptions = {
  message: string;
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
};

type ActiveToast = ToastOptions & { id: number };

type ToastContextValue = {
  show: (toast: ToastOptions) => void;
  dismiss: () => void;
};

const DURATION_MS: Record<ToastTone, number> = { info: 6000, error: 8000 };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const nextId = useRef(0);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  // One toast at a time: a new one replaces the current one and restarts the timer.
  const show = useCallback((options: ToastOptions) => {
    clearTimeout(timer.current);
    nextId.current += 1;
    setToast({ ...options, id: nextId.current });
    timer.current = setTimeout(() => setToast(null), DURATION_MS[options.tone ?? "info"]);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
      >
        {toast && (
          <div
            key={toast.id}
            className={`pointer-events-auto flex max-w-[480px] items-center gap-4 rounded-field border border-muted/35 bg-surface px-4 py-3 text-[14px] text-ink shadow-card dark:shadow-card-dark ${
              toast.tone === "error" ? "border-l-[3px] border-l-hl-2" : ""
            }`}
          >
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss();
                }}
                className={`${pillAccent} shrink-0`}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
