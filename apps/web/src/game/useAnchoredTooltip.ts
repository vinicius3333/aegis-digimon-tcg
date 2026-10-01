import { useEffect, useId, useRef, useState } from "react";

export type AnchoredTooltip<Id extends string> = { id: Id; left: number; top: number; above: boolean };

/* A tooltip pinned to the control that opened it. Hover, focus and a tap all open
   it, since a phone has no hover; a tap elsewhere, Escape, a resize or a scroll
   closes it. The caller renders it, portalled, from `open`. */
export function useAnchoredTooltip<Id extends string>({ preferAbove }: { preferAbove: boolean }) {
  const tooltipId = useId();
  const [open, setOpen] = useState<AnchoredTooltip<Id> | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function cancelClose() {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }
  function closeSoon() {
    if (document.activeElement === trigger.current) return;
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(null), 120);
  }
  function show(id: Id, anchor: HTMLElement) {
    cancelClose();
    trigger.current = anchor;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(240, window.innerWidth - 16);
    const above = window.innerHeight - rect.bottom < 80 || preferAbove;
    setOpen({
      id,
      left: Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8)),
      top: above ? rect.top - 8 : rect.bottom + 8,
      above,
    });
  }
  useEffect(() => {
    if (!open) return;
    function dismiss(event: Event) {
      if (event.type === "keydown" && (event as KeyboardEvent).key !== "Escape") return;
      if (event.type === "pointerdown" && trigger.current?.contains(event.target as Node)) return;
      setOpen(null);
    }
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [open]);
  useEffect(
    () => () => {
      if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    },
    [],
  );
  return { tooltipId, open, show, closeSoon, cancelClose };
}
