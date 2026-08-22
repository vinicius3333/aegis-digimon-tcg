import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-108.js";

describe("BT13-108 BT13-108", () => {
  it("grants the two opponent-turn effects and keeps the security deletion", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "GrantAuraToOpponents",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GrantAuraToOpponents",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          duration: "untilOpponentTurnEnd",
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" }, count: 1 },
        },
      ],
    });
  });

  it("loads the compiled implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-108", as: "card" }] } });
    await s.ready();
    expect(s.perm("card").topCard?.cardId).toBe("BT13-108");
  });
});
