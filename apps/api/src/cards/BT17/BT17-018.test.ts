import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-018.js";

describe("BT17-018", () => {
  it("models Blast Digivolve", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Counter", isFromHand: true, keywords: [{ keyword: "BlastDigivolve" }] });
  });

  it("deletes opposing Digimon up to a total of 15000 DP", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "Delete", target: { count: "all", totalDpCap: 15000 } });
    }
  });

  it("trashes security based on the number of cards in trash once per turn", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1, scaling: { per: 10, unit: "cards" } }] });
  });
});
