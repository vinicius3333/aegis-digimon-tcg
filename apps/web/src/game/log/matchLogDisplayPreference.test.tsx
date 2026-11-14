import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const storageKey = "aegis.match-log-display";
let values: Map<string, string>;

beforeEach(() => {
  values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("match log display preference", () => {
  it("hides both the log popups and the fixed log on a fresh device", async () => {
    const { useMatchLogDisplay } = await import("@/game/log/useMatchLogDisplay");
    const { result } = renderHook(() => useMatchLogDisplay());
    expect(result.current.value).toBe("hidden");
    expect(result.current.showsPopups).toBe(false);
    expect(result.current.showsPanel).toBe(false);
  });

  it("keeps a stored fixed log choice", async () => {
    values.set(storageKey, "panel");
    const { useMatchLogDisplay } = await import("@/game/log/useMatchLogDisplay");
    const { result } = renderHook(() => useMatchLogDisplay());
    expect(result.current.value).toBe("panel");
    expect(result.current.showsPanel).toBe(true);
  });

  it("shows the log popups once the player turns them on and remembers it after reloading", async () => {
    const { useMatchLogDisplay } = await import("@/game/log/useMatchLogDisplay");
    const { matchLogDisplayPreference } = await import("@/game/log/matchLogDisplayPreference");
    const { result } = renderHook(() => useMatchLogDisplay());
    act(() => matchLogDisplayPreference.set("popups"));
    expect(result.current.showsPopups).toBe(true);
    expect(values.get(storageKey)).toBe("popups");
    vi.resetModules();
    const reloaded = await import("@/game/log/matchLogDisplayPreference");
    expect(reloaded.matchLogDisplayPreference.get()).toBe("popups");
  });

  it("hides the match log for an unknown stored value", async () => {
    values.set(storageKey, "constructor");
    const { matchLogDisplayPreference } = await import("@/game/log/matchLogDisplayPreference");
    expect(matchLogDisplayPreference.get()).toBe("hidden");
  });

  it("keeps the session choice when storage refuses the write", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("blocked");
      },
    });
    const { matchLogDisplayPreference } = await import("@/game/log/matchLogDisplayPreference");
    matchLogDisplayPreference.set("both");
    expect(matchLogDisplayPreference.get()).toBe("both");
  });
});
