import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-058.js";

describe("BT16-058", () => {
  it("models Collision", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Collision" }] });
  });

  it("draws by trashing a card and gives opponent Digimon an attack effect when SoC is underneath", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "Draw", amount: 1, optional: true, abortOnDecline: true, cost: { kind: "trash" } });
      expect(effect.actions?.[1]).toMatchObject({ kind: "GrantAuraToOpponents", condition: { kind: "selfDigivolutionStackHasTrait" }, optional: true, duration: "untilOpponentTurnEnd" });
    }
  });

  it("has inherited permanent DP", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] });
  });
});
