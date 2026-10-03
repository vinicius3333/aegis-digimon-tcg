// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useMediaQuery } from "./useMediaQuery";

it("updates card sizing on resize when the media-query change event is delayed", () => {
  const query = { matches: false, addEventListener: vi.fn<() => void>(), removeEventListener: vi.fn<() => void>() };
  vi.stubGlobal("matchMedia", () => query);
  const view = renderHook(() => useMediaQuery("(width < 600px)"));
  expect(view.result.current).toBe(false);
  query.matches = true;
  act(() => window.dispatchEvent(new Event("resize")));
  expect(view.result.current).toBe(true);
  view.unmount();
  vi.unstubAllGlobals();
});
