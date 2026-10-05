import { useLayoutEffect, useState } from "react";
import { handFocusPlane, type HandFocusPlane } from "./handFocusGeometry";

const cornerSelectors = [".game-hand-card__inspect", ".game-hand-card__inspect svg", ".game-hand-card__pick-badge"];
const cornerProperties = [
  "display",
  "top",
  "right",
  "bottom",
  "left",
  "width",
  "height",
  "min-width",
  "min-height",
  "padding",
  "color",
  "background",
  "border",
  "border-radius",
  "box-shadow",
  "font-size",
];

/** Follow the physical face through layout, scroll and in-flight fan transitions. */
export function useHandFacePlane(row: HTMLDivElement, instanceId: string, { ensureVisible = false, scale = 1.3 } = {}) {
  const [plane, setPlane] = useState<
    (HandFocusPlane & { color: string; corners: { selector: string; properties: [string, string][] }[] }) | null
  >(null);
  useLayoutEffect(() => {
    const slot = [...row.children].find(
      (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.handInstanceId === instanceId,
    );
    if (!slot) return;
    const before = slot.getBoundingClientRect();
    const clip = row.getBoundingClientRect();
    if (ensureVisible && (before.left < clip.left || before.right > clip.right))
      slot.scrollIntoView?.({ inline: "nearest", block: "nearest", behavior: "instant" });
    function measure() {
      if (!slot?.isConnected) return;
      const rect = slot.getBoundingClientRect();
      const style = getComputedStyle(slot);
      const face = slot.firstElementChild;
      if (!face) return;
      const faceStyle = getComputedStyle(face);
      const matrix = style.transform === "none" ? new DOMMatrix() : new DOMMatrix(style.transform);
      const angle = Math.atan2(matrix.b, matrix.a);
      const cos = Math.abs(Math.cos(angle));
      const sin = Math.abs(Math.sin(angle));
      const faceRect = face.getBoundingClientRect();
      const determinant = cos * cos - sin * sin;
      // Recover the unrotated face from painted geometry. Computed CSS widths
      // round fractional pixels and can otherwise shrink a copy by a layout unit.
      const width =
        Math.abs(determinant) > 0.01
          ? (faceRect.width * cos - faceRect.height * sin) / determinant
          : parseFloat(faceStyle.width);
      const height =
        Math.abs(determinant) > 0.01
          ? (faceRect.height * cos - faceRect.width * sin) / determinant
          : parseFloat(faceStyle.height);
      if (!(width > 0 && height > 0)) return;
      setPlane({
        ...handFocusPlane({
          centerX: rect.x + rect.width / 2,
          centerY: rect.y + rect.height / 2,
          width,
          height,
          angle: (angle * 180) / Math.PI,
          viewportWidth: innerWidth,
          scale,
        }),
        color: style.getPropertyValue("--battle-arrow-effect"),
        corners: cornerSelectors.flatMap((selector) => {
          const control = slot.querySelector(selector);
          if (!control) return [];
          const controlStyle = getComputedStyle(control);
          return [
            {
              selector,
              properties: cornerProperties.map((property): [string, string] => [
                property,
                controlStyle.getPropertyValue(property),
              ]),
            },
          ];
        }),
      });
    }
    measure();
    let transitionFrame = 0;
    function trackTransition() {
      cancelAnimationFrame(transitionFrame);
      function tick() {
        measure();
        transitionFrame = requestAnimationFrame(tick);
      }
      transitionFrame = requestAnimationFrame(tick);
    }
    function followTransition(event: TransitionEvent) {
      if (event.target === slot && event.propertyName === "transform") trackTransition();
    }
    function finishTransition(event: TransitionEvent) {
      if (event.target !== slot || event.propertyName !== "transform") return;
      cancelAnimationFrame(transitionFrame);
      measure();
    }
    slot.addEventListener("transitionrun", followTransition);
    slot.addEventListener("transitionend", finishTransition);
    slot.addEventListener("transitioncancel", finishTransition);
    if (
      slot
        .getAnimations?.()
        .some(
          (animation) =>
            "transitionProperty" in animation &&
            animation.transitionProperty === "transform" &&
            animation.playState === "running",
        )
    )
      trackTransition();
    const changes = new MutationObserver(measure);
    changes.observe(slot, { attributes: true, attributeFilter: ["style", "class"] });
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(slot);
    return () => {
      cancelAnimationFrame(transitionFrame);
      slot.removeEventListener("transitionrun", followTransition);
      slot.removeEventListener("transitionend", finishTransition);
      slot.removeEventListener("transitioncancel", finishTransition);
      changes.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      observer?.disconnect();
    };
  }, [row, instanceId, ensureVisible, scale]);
  return plane;
}
