import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { en } from "../i18n/en";
import { isAnnouncedPhase, phaseBannerFrom } from "./phaseBanner";

describe("phaseBannerFrom", () => {
  it("announces every turn phase, excluding the idle state", () => {
    for (const phase of [Phase.Active, Phase.Draw, Phase.Breeding, Phase.Main, Phase.End]) {
      expect(isAnnouncedPhase(phase), phase).toBe(true);
      expect(phaseBannerFrom({ phase, turnSeat: 0, viewerSeat: 0, key: 1 })?.phase).toBe(phase);
    }
    for (const phase of [Phase.None, "unknown"]) {
      expect(isAnnouncedPhase(phase)).toBe(false);
      expect(phaseBannerFrom({ phase, turnSeat: 0, viewerSeat: 0, key: 1 })).toBeNull();
    }
  });

  it("prints a real label for each announced phase", () => {
    for (const phase of [Phase.Active, Phase.Draw, Phase.Breeding, Phase.Main, Phase.End]) {
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
