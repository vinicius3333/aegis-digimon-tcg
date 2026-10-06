// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useDecisionSourceMask } from "./useDecisionSourceMask";

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

it("follows the exact physical source across movement and clears it when it leaves the field", () => {
  let next: FrameRequestCallback | undefined;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    next = callback;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const first = document.createElement("div");
  first.dataset.drop = "perm-you";
  first.dataset.id = "first-copy";
  const second = first.cloneNode() as HTMLDivElement;
  second.dataset.id = "second-copy";
  document.body.append(first, second);
  vi.spyOn(first, "getBoundingClientRect").mockReturnValue(new DOMRect(50, 50, 100, 150));
  const bounds = vi.spyOn(second, "getBoundingClientRect").mockReturnValue(new DOMRect(300, 200, 100, 150));
  const view = renderHook(({ id }) => useDecisionSourceMask(id), {
    initialProps: { id: "second-copy" as string | undefined },
  });
  expect(view.result.current).toEqual({
    "--decision-source-mask":
      "polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, 294px 194px, 406px 194px, 406px 356px, 294px 356px, 294px 194px)",
  });
  bounds.mockReturnValue(new DOMRect(400, 220, 100, 150));
  act(() => next?.(16));
  expect(Object.values(view.result.current ?? {})[0]).toContain("394px 214px");
  second.remove();
  act(() => next?.(32));
  expect(view.result.current).toBeUndefined();
  view.rerender({ id: undefined });
  expect(view.result.current).toBeUndefined();
});
