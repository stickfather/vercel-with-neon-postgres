"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type FullScreenModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

function cx(...classes: Array<string | null | undefined | false>): string {
  return classes.filter(Boolean).join(" ");
}

function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  return mounted;
}

export function FullScreenModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  className,
}: FullScreenModalProps) {
  const mounted = useMounted();

  const body = useMemo(() => {
    if (!mounted || typeof document === "undefined") {
      return null;
    }
    return document.body;
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted, open]);

  if (!open || !body) {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const content = (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,23,42,0.45)] px-4 py-6 backdrop-blur-sm"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="full-screen-modal-title"
        aria-describedby={description ? "full-screen-modal-description" : undefined}
        className={cx(
          "relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-white/80 bg-white/95 text-brand-ink shadow-[0_24px_58px_rgba(15,23,42,0.18)]",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-brand-ink-muted/10 px-8 py-6">
          <div className="flex flex-col gap-2 pr-8">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-ink-muted">
              Acción requerida
            </span>
            <h2 id="full-screen-modal-title" className="text-2xl font-semibold text-brand-deep">
              {title}
            </h2>
            {description ? (
              <p id="full-screen-modal-description" className="text-sm text-brand-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-deep-soft text-lg font-bold text-brand-deep transition hover:bg-brand-deep-soft/80"
            aria-label="Cerrar ventana"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-6">{children}</div>
        {footer ? <div className="border-t border-brand-ink-muted/10 bg-white/90 px-8 py-5">{footer}</div> : null}
      </div>
    </div>
  );

  return createPortal(content, body);
}
