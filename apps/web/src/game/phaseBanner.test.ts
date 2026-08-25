import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { en } from "../i18n/en";
import { isAnnouncedPhase, phaseBannerFrom } from "./phaseBanner";

describe("phaseBannerFrom", () => {
  it("announces only the two phases the player acts in", () => {
    expect(isAnnouncedPhase(Phase.Breeding)).toBe(true);
    expect(isAnnouncedPhase(Phase.Main)).toBe(true);
    for (const phase of [Phase.Active, Phase.Draw, Phase.End, Phase.None]) {
      expect(isAnnouncedPhase(phase), phase).toBe(false);
      expect(phaseBannerFrom({ phase, turnSeat: 0, viewerSeat: 0, key: 1 }), phase).toBeNull();
    }
  });

  it("prints a real label for each announced phase", () => {
    for (const phase of [Phase.Breeding, Phase.Main]) {
      const banner = phaseBannerFrom({ phase, turnSeat: 0, viewerSeat: 0, key: 1 });
      expect(en[banner!.labelKey], phase).toBeTruthy();
    }
  });

  it("names whose phase it is from the viewer's side", () => {
    expect(phaseBannerFrom({ phase: Phase.Main, turnSeat: 0, viewerSeat: 0, key: 1 })?.side).toBe("you");
    expect(phaseBannerFrom({ phase: Phase.Main, turnSeat: 1, viewerSeat: 0, key: 1 })?.side).toBe("opp");
  });

  it("carries the key it was handed, so a repeat of the same phase re-mounts", () => {
    expect(phaseBannerFrom({ phase: Phase.Main, turnSeat: 0, viewerSeat: 0, key: 7 })?.key).toBe(7);
  });
});
