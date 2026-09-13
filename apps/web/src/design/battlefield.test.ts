// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CUSTOM_BATTLEFIELD_ID,
  battlefieldStyle,
  clearCustomBattlefield,
  getBattlefieldId,
  getCustomBattlefieldSrc,
  setBattlefieldId,
  setCustomBattlefield,
} from "./battlefield";

const image = "data:image/webp;base64,AAAA";

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
