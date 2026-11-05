export function observeVisibleControls(): (element: Element) => number | undefined {
  const visibleAt = new WeakMap<Element, number>();
  let frame = 0;
  function sample() {
    for (const element of document.querySelectorAll('button, [role="dialog"], [role="region"]')) {
      if (visibleAt.has(element) || !element.checkVisibility({ checkVisibilityCSS: true })) {
        continue;
      }
      const bounds = element.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0) {
        visibleAt.set(element, performance.now());
      }
    }
    frame = requestAnimationFrame(sample);
  }
  frame = requestAnimationFrame(sample);
  addEventListener("pagehide", () => cancelAnimationFrame(frame), { once: true });
  return (element) => visibleAt.get(element);
}
