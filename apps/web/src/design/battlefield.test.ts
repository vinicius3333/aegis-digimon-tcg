// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  BATTLEFIELDS,
  CUSTOM_BATTLEFIELD_ID,
  battlefieldStyle,
  clearCustomBattlefield,
  getBattlefieldId,
  getCustomBattlefieldSrc,
  setBattlefieldId,
  setCustomBattlefield,
  useBattlefieldStyle,
} from "./battlefield";

const image = "data:image/webp;base64,AAAA";

describe("portrait battlefield", () => {
  it.each(BATTLEFIELDS.filter((field) => field.src))("keeps desktop art and selects portrait art for $id", (field) => {
    expect(String(battlefieldStyle(field.id).backgroundImage)).toContain(field.src);
    expect(String(battlefieldStyle(field.id, true).backgroundImage)).toContain(field.portraitSrc);
  });

  it("preserves classic and custom surfaces in portrait", () => {
    expect(battlefieldStyle("classic", true)).toEqual(battlefieldStyle("classic"));
    setCustomBattlefield(image);
    expect(String(battlefieldStyle(CUSTOM_BATTLEFIELD_ID, true).backgroundImage)).toContain(image);
    clearCustomBattlefield();
  });

  it("switches art when the arena changes orientation without changing the selected scenery", () => {
    let portrait = true;
    const listeners = new Set<() => void>();
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        get matches() {
          return portrait;
        },
        addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
      })),
    );
    setBattlefieldId("tropical");
    const { result, unmount } = renderHook(() => useBattlefieldStyle());
    expect(String(result.current.backgroundImage)).toContain("aegis-arena-tropical-portrait.webp");
    act(() => {
      portrait = false;
      for (const listener of listeners) listener();
    });
    expect(String(result.current.backgroundImage)).toContain("aegis-arena-tropical.webp");
    expect(getBattlefieldId()).toBe("tropical");
    unmount();
    expect(listeners.size).toBe(0);
    vi.unstubAllGlobals();
  });
});

describe("custom battlefield", () => {
  beforeEach(() => {
    clearCustomBattlefield();
    setBattlefieldId("classic");
  });

  it("selects the uploaded image and paints it on the board", () => {
    setCustomBattlefield(image);

    expect(getBattlefieldId()).toBe(CUSTOM_BATTLEFIELD_ID);
    expect(getCustomBattlefieldSrc()).toBe(image);
    expect(String(battlefieldStyle(CUSTOM_BATTLEFIELD_ID).backgroundImage)).toContain(image);
  });

  it("falls back to the default board once the image is removed", () => {
    setCustomBattlefield(image);
    clearCustomBattlefield();

    expect(getBattlefieldId()).toBe("tropical");
    expect(getCustomBattlefieldSrc()).toBeUndefined();
  });

  it("ignores a stored custom selection with no image behind it", () => {
    setBattlefieldId(CUSTOM_BATTLEFIELD_ID);

    expect(getBattlefieldId()).toBe("classic");
  });
});

describe("initial battlefield preference", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("uses Tropical Arena and its art when no choice was saved", async () => {
    const fresh = await import("./battlefield");
    expect(fresh.getBattlefieldId()).toBe("tropical");
    expect(String(fresh.battlefieldStyle(fresh.getBattlefieldId()).backgroundImage)).toContain(
      "aegis-arena-tropical.webp",
    );
  });

  it.each(["classic", "sanctum", "tropical"])("preserves the explicit saved %s choice", async (choice) => {
    localStorage.setItem("aegis.battlefield", choice);
    const fresh = await import("./battlefield");
    expect(fresh.getBattlefieldId()).toBe(choice);
  });

  it("uses Tropical Arena for an unavailable saved playmat", async () => {
    localStorage.setItem("aegis.battlefield", "removed-playmat");
    const fresh = await import("./battlefield");
    expect(fresh.getBattlefieldId()).toBe("tropical");
    expect(fresh.battlefieldById("removed-playmat").id).toBe("tropical");
  });
});
