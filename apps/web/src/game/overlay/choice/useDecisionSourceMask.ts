import { useLayoutEffect, useState, type CSSProperties } from "react";
import { permanentVisualElement } from "../../screen/dropZones";

/** Cut only the scrim's paint; the modal backdrop still captures every pointer. */
export function useDecisionSourceMask(sourcePermanentId: string | undefined): CSSProperties | undefined {
  const [mask, setMask] = useState<{ source: string; polygon: string }>();
  useLayoutEffect(() => {
    setMask(undefined);
    if (!sourcePermanentId) return;
    const sourceId = sourcePermanentId;
    let frame = 0;
    let previous = "";
    function measure() {
      frame = requestAnimationFrame(measure);
      const permanent = Array.from(document.querySelectorAll<HTMLDivElement>("[data-drop][data-id]")).find(
        (node) => node.dataset.id === sourceId,
      );
      if (!permanent) {
        if (previous) setMask(undefined);
        previous = "";
        return;
      }
      const bounds = permanentVisualElement(permanent).getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) {
        if (previous) setMask(undefined);
        previous = "";
        return;
      }
      const left = Math.max(0, bounds.left - 6);
      const top = Math.max(0, bounds.top - 6);
      const right = Math.min(window.innerWidth, bounds.right + 6);
      const bottom = Math.min(window.innerHeight, bounds.bottom + 6);
      if (right <= left || bottom <= top) {
        if (previous) setMask(undefined);
        previous = "";
        return;
      }
      const polygon = `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${left}px ${top}px, ${right}px ${top}px, ${right}px ${bottom}px, ${left}px ${bottom}px, ${left}px ${top}px)`;
      if (polygon === previous) return;
      previous = polygon;
      setMask({ source: sourceId, polygon });
    }
    measure();
    return () => cancelAnimationFrame(frame);
  }, [sourcePermanentId]);
  return mask && mask.source === sourcePermanentId
    ? ({ "--decision-source-mask": mask.polygon } as CSSProperties)
    : undefined;
}
