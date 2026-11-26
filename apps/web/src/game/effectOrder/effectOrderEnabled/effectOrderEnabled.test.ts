// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("effect order preference", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is off by default", async () => {
    const { isEffectOrderEnabled } = await import("./isEffectOrderEnabled");

    expect(isEffectOrderEnabled()).toBe(false);
  });

  it("stays off when the browser refuses storage", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { isEffectOrderEnabled } = await import("./isEffectOrderEnabled");
    const { setEffectOrderEnabled } = await import("./setEffectOrderEnabled");

    expect(isEffectOrderEnabled()).toBe(false);
    setEffectOrderEnabled(true);
    expect(isEffectOrderEnabled()).toBe(true);
  });

  it("keeps the option on across reloads once the player turns it on, and notifies listeners", async () => {
    const { setEffectOrderEnabled } = await import("./setEffectOrderEnabled");
    const { effectOrderEnabledStore } = await import("./effectOrderEnabledStore");
    const listener = vi.fn<() => void>();
    effectOrderEnabledStore.listeners.add(listener);
    setEffectOrderEnabled(true);

    expect(localStorage.getItem("aegis.effectOrder.enabled")).toBe("true");
    expect(listener).toHaveBeenCalledOnce();

    vi.resetModules();
    const { isEffectOrderEnabled } = await import("./isEffectOrderEnabled");
    expect(isEffectOrderEnabled()).toBe(true);
  });
});
