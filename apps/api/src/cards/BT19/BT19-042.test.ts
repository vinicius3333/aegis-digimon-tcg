import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-042 Dynasmon (X Antibody)", () => {
  it("preserves every printed clause and its exact boundaries", () => {
    const card = runtimeCompiledCard("BT19-042");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.digivolutionRequirement).toEqual([
      { names: ["Dynasmon"], cost: 1, isAlternate: true },
    ]);

    expect(card?.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Raid", raw: "＜Raid＞" }],
    });
    expect(card?.effects?.[1]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    });

    const digivolving = card?.effects?.find((effect) => effect.trigger === "WhenDigivolving");
    const attacking = card?.effects?.find((effect) => effect.trigger === "WhenAttacking");
    for (const effect of [digivolving, attacking]) {
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
      expect(effect?.actions).toMatchObject([
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          optional: false,
          condition: { kind: "selfDigivolutionStackHasTrait" },
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
          },
        },
        {
          kind: "ModifyDP",
          amount: 6000,
          duration: "untilOpponentTurnEnd",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        },
      ]);
    }

    expect(card?.effects?.find((effect) => effect.trigger === "EndOfYourTurn")).toMatchObject({
      actions: [{
        kind: "SecurityManipulation",
        op: "recover",
        controller: "mine",
        toTop: true,
        amount: 1,
        condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 2 },
      }],
    });
  });
});
