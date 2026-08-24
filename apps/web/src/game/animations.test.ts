// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useEnterAnimation } from "./animations";

afterEach(() => cleanup());

describe("useEnterAnimation", () => {
  it("marks nothing on the first render", () => {
    const { result } = renderHook(({ keys }) => useEnterAnimation(keys), {
      initialProps: { keys: ["a", "b"] },
    });
    expect([...result.current]).toEqual([]);
  });

  it("marks keys that appear later", () => {
    const { result, rerender } = renderHook(({ keys }) => useEnterAnimation(keys), {
      initialProps: { keys: ["a"] },
    });
    rerender({ keys: ["a", "b"] });
    expect([...result.current]).toEqual(["b"]);
  });

  it("keeps a key marked while it stays present, so the animation is not cut short", () => {
    const { result, rerender } = renderHook(({ keys }) => useEnterAnimation(keys), {
      initialProps: { keys: ["a"] },
    });
    rerender({ keys: ["a", "b"] });
    rerender({ keys: ["a", "b"] });
    expect([...result.current]).toEqual(["b"]);
  });

  it("forgets keys once they leave", () => {
    const { result, rerender } = renderHook(({ keys }) => useEnterAnimation(keys), {
      initialProps: { keys: ["a"] },
    });
    rerender({ keys: ["a", "b"] });
    rerender({ keys: ["a"] });
    expect([...result.current]).toEqual([]);
  });

  it("marks a key that comes back after leaving", () => {
    const { result, rerender } = renderHook(({ keys }) => useEnterAnimation(keys), {
      initialProps: { keys: ["a", "b"] },
    });
    rerender({ keys: ["a"] });
    rerender({ keys: ["a", "b"] });
    expect([...result.current]).toEqual(["b"]);
  });
});
