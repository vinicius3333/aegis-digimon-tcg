import { afterEach, expect, it, vi } from "vitest";
import { observeVisibleControls } from "./observeVisibleControls";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("ignores empty controls and stops its frame observer on page exit", () => {
  let width = 0;
  let stopped: (() => void) | undefined;
  const control = {
    checkVisibility: vi.fn<() => boolean>(() => true),
    getBoundingClientRect: () => ({ width, height: 40 }),
  } as unknown as Element;
  let frame = () => {};
  vi.stubGlobal("document", { querySelectorAll: () => [control] });
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
    frame = callback;
    return 7;
  });
  vi.stubGlobal("addEventListener", (_event: string, callback: () => void) => {
    stopped = callback;
  });
  const cancel = vi.fn<(frame: number) => void>();
  vi.stubGlobal("cancelAnimationFrame", cancel);
  const visibleAt = observeVisibleControls();
  frame();
  expect(visibleAt(control)).toBeUndefined();
  width = 100;
  frame();
  expect(visibleAt(control)).toBeDefined();
  expect(control.checkVisibility).toHaveBeenCalledWith({ checkVisibilityCSS: true });
  stopped?.();
  expect(cancel).toHaveBeenCalledWith(7);
});

it("records the first visible frame instead of the driver's later receipt", () => {
  let at = 100;
  let visible = false;
  let frame = () => {};
  const control = {
    checkVisibility: () => visible,
    getBoundingClientRect: () => ({ width: 100, height: 40 }),
  } as Element;
  vi.spyOn(performance, "now").mockImplementation(() => at);
  vi.stubGlobal("document", { querySelectorAll: () => [control] });
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal("addEventListener", () => {});
  vi.stubGlobal("cancelAnimationFrame", () => {});
  const visibleAt = observeVisibleControls();
  frame();
  expect(visibleAt(control)).toBeUndefined();
  at = 5_900;
  visible = true;
  frame();
  at = 6_700;
  frame();
  expect(visibleAt(control)).toBe(5_900);
});
