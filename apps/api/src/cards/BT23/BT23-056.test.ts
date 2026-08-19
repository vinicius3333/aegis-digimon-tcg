import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-056.js";

describe("BT23-056 WereGarurumon", () => {
  it("has Blocker", () => {
    expect((compiled.effects.find((entry) => entry.trigger === "Static") as any).actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      duration: "permanent",
    });
  });

  it("grants one opposing Digimon a start-of-main-phase attack only with a CS Tamer", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "SubTrigger",
        event: "startOfYourMainPhase",
        condition: { kind: "youHave", filter: { kind: ["Tamer"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] } },
        on: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        duration: "untilOpponentTurnEnd",
        actions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, isSelf: true } }],
      });
    }
  });

  it("inherited once-per-turn De-Digivolves an opposing Digimon when attack targets change", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "DeDigivolve",
              amount: 1,
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
          ],
        },
      ],
    });
  });
});
