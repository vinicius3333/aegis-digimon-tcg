import { useLayoutEffect, type RefObject } from "react";
import { useMediaQuery } from "../../../design/useMediaQuery";

/** Reserve the physical hand only while its cards are used to answer a mobile decision. */
export function usePromptHandSpace(panelRef: RefObject<HTMLElement | null>, active = true) {
  const mobile = useMediaQuery("(width < 768px), (height < 520px) and (orientation: landscape)");
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const hand = document.querySelector<HTMLElement>(".game-hand-dock");
    if (!mobile || !active || !panel || !hand) return;
    const sibling = panel.previousElementSibling;
    const backdrop = sibling instanceof HTMLElement && sibling.matches(".decision-overlay-backdrop") ? sibling : null;
    const layer = panel.closest<HTMLElement>(".effect-prompt-layer");
    const surfaces = [panel, backdrop, layer].filter((surface): surface is HTMLElement => surface !== null);
    const update = () => {
      if (!hand.querySelector(".game-hand--selecting")) {
        for (const surface of surfaces) surface.style.setProperty("--mobile-prompt-hand-clearance", "0px");
        return;
      }
      const cardTops = [...hand.querySelectorAll<HTMLElement>(".game-hand-card")]
        .map((card) => card.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0)
        .map((rect) => rect.top);
      const row = hand.querySelector<HTMLElement>(".game-hand-scroller") ?? hand;
      const rowBounds = row.getBoundingClientRect();
      const rowTop = rowBounds.height > 0 ? rowBounds.top : hand.getBoundingClientRect().top;
      const top = Math.min(rowTop, ...cardTops);
      for (const surface of surfaces) {
        surface.style.setProperty("--mobile-prompt-hand-clearance", `${Math.max(0, window.innerHeight - top)}px`);
      }
    };
    update();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(update);
    observer?.observe(hand);
    const mutations = new MutationObserver(update);
    mutations.observe(hand, { attributes: true, childList: true, subtree: true });
    window.addEventListener("resize", update);
    hand.addEventListener("transitionend", update);
    return () => {
      observer?.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", update);
      hand.removeEventListener("transitionend", update);
      for (const surface of surfaces) surface.style.removeProperty("--mobile-prompt-hand-clearance");
    };
  }, [active, mobile, panelRef]);
}
