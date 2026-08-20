// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
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

    expect(getBattlefieldId()).toBe("classic");
    expect(getCustomBattlefieldSrc()).toBeUndefined();
  });

  it("ignores a stored custom selection with no image behind it", () => {
    setBattlefieldId(CUSTOM_BATTLEFIELD_ID);

    expect(getBattlefieldId()).toBe("classic");
  });
});
