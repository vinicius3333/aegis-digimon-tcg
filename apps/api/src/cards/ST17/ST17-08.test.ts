import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-08 MegaGargomon", () => {
  it("has Blocker and Reboot and suspends and restricts two opposing Digimon/Tamers", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-08", as: "mega" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "opponentDigimon" },
          { card: "ST17-10", as: "opponentTamer" },
        ],
      },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("mega"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("mega"), "Reboot")).toBe(true);
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("mega"));

    expect(s.perm("opponentDigimon").isSuspended).toBe(true);
    expect(s.perm("opponentTamer").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon"), "digivolve")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentTamer"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentTamer"), "digivolve")).toBe(true);
  });

  it("unsuspends itself through the shared once-per-turn When Digivolving/End of Attack effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-08", as: "mega", suspended: true }] },
    }, { autoAcceptOptional: true });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("mega"));
    expect(s.perm("mega").isSuspended).toBe(false);
  });
});
