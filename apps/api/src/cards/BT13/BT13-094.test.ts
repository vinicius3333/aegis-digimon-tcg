import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-094.js";

describe("BT13-094 BT13-094", () => {
  it("matches Kristy Damon's printed phase, aura, and security effects", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ match: "trait", tokens: ["Avian", "Bird"] }],
            },
          },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "GrantAuraToOpponents",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          effectText: "[On Deletion] You may play 1 [Biyomon] from your hand or trash without paying the cost.",
          duration: "untilOpponentTurnEnd",
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    });
  });

  it("loads the compiled implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-094", as: "card" }] } });
    await s.ready();
    expect(s.perm("card").topCard?.cardId).toBe("BT13-094");
  });
});
