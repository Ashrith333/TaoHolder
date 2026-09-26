"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";

/** Bottom sheet on phone, centred dialog on laptop. Closes on scrim tap and Esc.
 *  Portalled to <body> so a parent with backdrop-filter/transform cannot trap it. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="fade-in relative max-h-[90svh] w-full overflow-y-auto rounded-t-[20px] border border-line bg-s1 p-5 pb-8 md:max-w-[440px] md:rounded-[20px]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-s3 md:hidden" />
        <h2 className="mb-4 text-[22px] font-extrabold">{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
