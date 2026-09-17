import { useEffect, useState } from "react";

export function useElementWidth(element: HTMLElement | null): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!element) return;
    if (typeof ResizeObserver !== "function") {
      setWidth(element.getBoundingClientRect().width);
      return;
    }
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return width;
}
