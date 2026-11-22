"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function Modal({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    const t = setTimeout(() => {
      ref.current?.querySelector<HTMLElement>("input:not([readonly]), select, textarea")?.focus();
    }, 60);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", key); clearTimeout(t); };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="ovl" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" ref={ref} role="dialog" aria-modal="true" aria-label={title}>
        <div className="mo-h"><h3>{title}</h3>
          <button type="button" className="xbtn" onClick={onClose} aria-label="Close">✕</button></div>
        <div className="mo-b">{children}</div>
        {footer && <div className="mo-f">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
