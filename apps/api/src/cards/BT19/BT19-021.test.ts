import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-021 Xiquemon", () => {
  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s returns exactly one opposing level-3 Digimon and leaves level 4 in play",
    async (timing) => {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT19-021", as: "xique" }] },
        1: { battleArea: [
          { card: "BT19-018", as: "level3" },
          { card: "BT19-019", as: "level4" },
        ] },
      }, { autoSelectCards: true });
      const level3Id = s.perm("level3").permanentId;
      await advance(s.engine).fireForPermanent(timing, s.perm("xique"));
      expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === level3Id)).toBe(false);
      expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT19-018"]);
      expect(s.perm("level4").topCard?.cardId).toBe("BT19-019");
    },
  );

  it("is always Aquatic without granting that trait to another Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-021", as: "xique" }, { card: "BT1-009", as: "other" },
    ] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("xique"), "Aquatic")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("other"), "Aquatic")).toBe(false);
  });

  it("grants inherited Jamming only to its evolution host", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-023", as: "host", under: ["BT19-021"] },
      { card: "BT19-023", as: "plain" },
    ] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Jamming")).toBe(false);
  });
});
