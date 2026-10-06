import { useEffect, useRef, useState, type PointerEvent } from "react";

/** Move one identity into another slot without losing or duplicating entries. */
export function reorderDecisionItems(items: readonly string[], from: string, to: string): string[] {
  const start = items.indexOf(from);
  const end = items.indexOf(to);
  if (start < 0 || end < 0 || start === end) return [...items];
  const next = [...items];
  next.splice(start, 1);
  next.splice(end, 0, from);
  return next;
}

/** Pointer capture keeps mouse and touch drags attached to the handle; only a valid drop commits. */
export function useDecisionReorder(onReorder: (from: string, to: string) => void) {
  const listRef = useRef<HTMLDivElement>(null);
  const preview = useRef<{ node: HTMLElement; offsetX: number; offsetY: number } | undefined>(undefined);
  const pointer = useRef<{ id: number; item: string; x: number; y: number } | undefined>(undefined);
  const [dragging, setDragging] = useState<string>();
  const [dropTarget, setDropTarget] = useState<string>();
  function targetAt(x: number, y: number) {
    const row = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-reorder-id]");
    return row && listRef.current?.contains(row) ? row.dataset.reorderId : undefined;
  }
  function cancel() {
    preview.current?.node.remove();
    preview.current = undefined;
    pointer.current = undefined;
    setDragging(undefined);
    setDropTarget(undefined);
  }
  useEffect(() => () => preview.current?.node.remove(), []);
  function movePreview(x: number, y: number) {
    const lifted = preview.current;
    if (lifted)
      lifted.node.style.transform = `translate(${x - lifted.offsetX}px, ${y - lifted.offsetY - 8}px) scale(1.025) rotate(-1deg)`;
  }
  function lift(row: HTMLElement, x: number, y: number) {
    const bounds = row.getBoundingClientRect();
    const node = row.cloneNode(true) as HTMLElement;
    // Freeze the rendered row's appearance before moving it outside the scrollable
    // dialog. This decorative snapshot has no controls or duplicate DOM identities.
    const originals = [row, ...row.querySelectorAll<HTMLElement>("*")];
    const copies = [node, ...node.querySelectorAll<HTMLElement>("*")];
    for (let index = 0; index < originals.length; index++) {
      const original = originals[index]!;
      const copy = copies[index]!;
      const computed = getComputedStyle(original);
      copy.style.cssText = Array.from(
        computed,
        (property) => `${property}:${computed.getPropertyValue(property)};`,
      ).join("");
      copy.style.pointerEvents = "none";
      copy.style.animation = "none";
      copy.style.transition = "none";
      copy.removeAttribute("id");
      copy.removeAttribute("data-reorder-id");
      copy.removeAttribute("data-dragging");
      copy.removeAttribute("data-drop-target");
    }
    node.classList.add("decision-reorder-preview");
    node.setAttribute("aria-hidden", "true");
    node.inert = true;
    Object.assign(node.style, {
      position: "fixed",
      top: "0",
      left: "0",
      margin: "0",
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      minWidth: "0",
      maxWidth: "none",
      opacity: "0.94",
      zIndex: "12000",
      transformOrigin: "top left",
      boxShadow: "0 18px 40px rgba(0, 0, 0, 0.4)",
      outline: `2px solid ${getComputedStyle(row).getPropertyValue("--ds-accent")}`,
      outlineOffset: "-2px",
    });
    document.body.append(node);
    preview.current = { node, offsetX: x - bounds.left, offsetY: y - bounds.top };
    movePreview(x, y);
  }
  useEffect(() => {
    if (!dragging) return;
    let frame: number;
    function scroll() {
      const list = listRef.current;
      const active = pointer.current;
      if (list && active) {
        const bounds = list.getBoundingClientRect();
        if (active.x >= bounds.left && active.x <= bounds.right) {
          const edge = 32;
          const delta = active.y < bounds.top + edge ? -6 : active.y > bounds.bottom - edge ? 6 : 0;
          if (delta) {
            list.scrollTop += delta;
            setDropTarget(targetAt(active.x, active.y));
          }
        }
      }
      frame = requestAnimationFrame(scroll);
    }
    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [dragging]);
  return {
    listRef,
    dragging,
    dropTarget,
    cancel,
    handleProps(item: string) {
      return {
        onPointerDown(event: PointerEvent<HTMLButtonElement>) {
          if (event.button !== 0 || pointer.current) return;
          event.preventDefault();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          const row = event.currentTarget.closest<HTMLElement>("[data-reorder-id]");
          if (row) lift(row, event.clientX, event.clientY);
          pointer.current = { id: event.pointerId, item, x: event.clientX, y: event.clientY };
          setDragging(item);
        },
        onPointerMove(event: PointerEvent<HTMLButtonElement>) {
          const active = pointer.current;
          if (active?.id !== event.pointerId) return;
          active.x = event.clientX;
          active.y = event.clientY;
          movePreview(event.clientX, event.clientY);
          setDropTarget(targetAt(event.clientX, event.clientY));
        },
        onPointerUp(event: PointerEvent<HTMLButtonElement>) {
          const active = pointer.current;
          if (active?.id !== event.pointerId) return;
          const target = targetAt(event.clientX, event.clientY);
          cancel();
          if (target && target !== active.item) onReorder(active.item, target);
        },
        onPointerCancel: cancel,
        onLostPointerCapture: cancel,
      };
    },
  };
}
