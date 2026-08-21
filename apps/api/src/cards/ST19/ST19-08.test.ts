import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST19-08.js";

describe("ST19-08 ShoeShoemon", () => {
  it("plays a LIBERATOR Tamer costing 4 or less from hand without cost in security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "ST19-08", as: "shoe", faceUp: true }], hand: [{ card: "ST19-14", as: "tamer" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("shoe"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST19-14")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(false);
  });

  it("matches the errata and inherited security-DP catalog text", () => {
    expect(getCardDefinition("ST19-08")).toMatchObject({
      inheritedEffectText: "[Your Turn] All of your opponent's security Digimon get -3000 DP.",
      effectText: expect.stringContaining("＜Overclock ([Puppet] trait)＞"),
    });
  });
});
