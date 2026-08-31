import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-050.js";

describe("EX4-050 ShadowSeraphimon", () => {
  it("requires the exact Seraphimon name for its alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toMatchObject([{ namesExact: ["Seraphimon"], cost: 1 }]);
  });

  it("De-Digivolves an opposing Digimon when security is removed during the opponent's turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      actions: [{ kind: "DeDigivolve", amount: 1, target: { filter: { controller: "opponent" } } }],
    });
  });
  it("adds one security and reduces opposing DP by 4000 per own security on deletion", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "SecurityManipulation", op: "addTop", source: "deck", amount: 1 });
    expect(actions?.[1]).toMatchObject({ kind: "ModifyDP", amount: -4000, scaling: { per: 1, unit: "security" } });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-050");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });
  ex4CardBehaviorTests("EX4-050");
});
