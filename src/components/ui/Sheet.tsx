"use client";
import { useEffect } from "react";

/** Bottom sheet on phone, centred dialog on laptop. Closes on scrim tap and Esc. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="fade-in relative max-h-[90svh] w-full overflow-y-auto rounded-t-[20px] border border-line bg-s1 p-5 pb-8 md:max-w-[440px] md:rounded-[20px]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-s3 md:hidden" />
        <h2 className="mb-4 text-[22px] font-extrabold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
