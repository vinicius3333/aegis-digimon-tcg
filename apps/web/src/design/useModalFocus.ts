import { useEffect, useRef, type RefObject } from "react";

type Modal = { surface: HTMLElement; focusFirst: boolean; close: () => void };
type Params = { surfaceRef: RefObject<HTMLElement | null>; onClose?: () => void; focusFirst?: boolean };
const modals: Modal[] = [];
const inertOwners = new WeakMap<HTMLElement, { count: number; wasInert: boolean }>();
let lastPress: { control: HTMLElement; at: number } | null = null;
if (typeof document !== "undefined") {
  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const control = target?.closest<HTMLElement>("button, [href], input, select, textarea, [tabindex]");
      lastPress = control ? { control, at: performance.now() } : null;
    },
    true,
  );
  document.addEventListener(
    "keydown",
    () => {
      lastPress = null;
    },
    true,
  );
}

function getControls(surface: HTMLElement) {
  return [
    ...surface.querySelectorAll<HTMLElement>(
      "button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]",
    ),
  ].filter((control) => {
    if (
      control.tabIndex < 0 ||
      control.matches(":disabled") ||
      control.closest('[hidden], [inert], [aria-hidden="true"]')
    ) {
      return false;
    }
    let element: HTMLElement | null = control;
    while (element) {
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }
      element = element.parentElement;
    }
    return true;
  });
}

export function useModalFocus({ surfaceRef, onClose, focusFirst = false }: Params) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!surfaceRef.current) {
      return;
    }
    const surface = surfaceRef.current;
    const document = surface.ownerDocument;
    const window = document.defaultView;
    if (!window) {
      return;
    }
    const { HTMLElement, Node, MutationObserver } = window;
    let active = true;
    const previous =
      lastPress?.control.isConnected && performance.now() - lastPress.at < 1000
        ? lastPress.control
        : document.activeElement;
    const modal: Modal = { surface, focusFirst, close: () => closeRef.current?.() };
    modals.push(modal);
    const inerted = new Set<HTMLElement>();
    function isTopmost() {
      return modals.at(-1) === modal;
    }
    function focusSurface() {
      (focusFirst ? (getControls(surface)[0] ?? surface) : surface).focus();
    }
    function containBackground() {
      if (!active || !isTopmost()) {
        return;
      }
      let branch: HTMLElement = surface;
      while (branch.parentElement) {
        for (const sibling of branch.parentElement.children) {
          if (sibling instanceof HTMLElement && sibling !== branch && !inerted.has(sibling)) {
            const ownership = inertOwners.get(sibling) ?? { count: 0, wasInert: sibling.inert };
            ownership.count += 1;
            inertOwners.set(sibling, ownership);
            inerted.add(sibling);
            sibling.inert = true;
          }
        }
        branch = branch.parentElement;
      }
    }
    function handleFocus(event: FocusEvent) {
      if (isTopmost() && event.target instanceof Node && !surface.contains(event.target)) {
        focusSurface();
      }
    }
    function handleKey(event: globalThis.KeyboardEvent) {
      if (!isTopmost() || (event.key !== "Tab" && event.key !== "Escape")) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.key === "Escape") {
        modal.close();
        return;
      }
      const controls = getControls(surface);
      if (!controls.length) {
        surface.focus();
        return;
      }
      const index = controls.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey ? (index <= 0 ? controls.length - 1 : index - 1) : (index + 1) % controls.length;
      controls[next]?.focus();
    }
    document.addEventListener("keydown", handleKey, true);
    document.addEventListener("focusin", handleFocus, true);
    containBackground();
    focusSurface();
    const observer = new MutationObserver(containBackground);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      active = false;
      observer.disconnect();
      document.removeEventListener("keydown", handleKey, true);
      document.removeEventListener("focusin", handleFocus, true);
      const wasTopmost = isTopmost();
      modals.splice(modals.indexOf(modal), 1);
      for (const element of inerted) {
        const ownership = inertOwners.get(element);
        if (ownership && --ownership.count === 0) {
          element.inert = ownership.wasInert;
          inertOwners.delete(element);
        }
      }
      if (wasTopmost && previous instanceof HTMLElement && previous.isConnected) {
        previous.focus();
      }
    };
  }, [surfaceRef, focusFirst]);
}
