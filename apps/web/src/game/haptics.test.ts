import { afterEach, describe, expect, it, vi } from "vitest";

import { NARRATION_TAP_VIBRATION_MS, vibrateNarrationAdvance } from "./haptics";

function stubVibrate() {
  const vibrate = vi.fn<(pattern: number) => boolean>();
  vi.stubGlobal("navigator", { vibrate });
  return vibrate;
}

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal("window", { matchMedia: (query: string) => ({ matches: reduce && query.includes("reduced-motion") }) });
}

describe("vibrateNarrationAdvance", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("buzzes once for the tap", () => {
    stubReducedMotion(false);
    const vibrate = stubVibrate();
    vibrateNarrationAdvance();
    expect(vibrate).toHaveBeenCalledExactlyOnceWith(NARRATION_TAP_VIBRATION_MS);
  });

  it("stays still when the player asked for reduced motion", () => {
    stubReducedMotion(true);
    const vibrate = stubVibrate();
    vibrateNarrationAdvance();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("does nothing on a device with no vibration motor", () => {
    stubReducedMotion(false);
    vi.stubGlobal("navigator", {});
    expect(() => vibrateNarrationAdvance()).not.toThrow();
  });
});
