import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-221.js";

describe("P-221 Chaosmon", () => {
  it("has Security Attack +1 and the printed Partition requirement", () => {
    const card = runtimeCompiledCard("P-221")!;
    expect(card.effects.slice(0, 2).map((effect) => effect.keywords)).toEqual([
      [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
      [{ keyword: "Partition", raw: "＜Partition (Yellow Lv.6 & Purple/Black Lv.6)＞" }],
    ]);
  });

  it("grants DNA-only immunity to itself until the opponent's turn ends", () => {
    expect(
      runtimeCompiledCard("P-221")!.effects.find(
        (effect) => effect.trigger === "WhenDigivolving" && effect.actions[0]?.kind === "Restrict",
      ),
    ).toMatchObject({
      actions: [
        {
          kind: "Restrict",
          restriction: "immuneToOpponentEffects",
          duration: "untilOpponentTurnEnd",
          target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
          condition: { kind: "isDnaDigivolving" },
        },
      ],
    });
  });

  it("gives one opposing Digimon -10000 DP on digivolution and when attacking", () => {
    const card = runtimeCompiledCard("P-221")!;
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      expect(
        card.effects.find((effect) => effect.trigger === trigger && effect.actions[0]?.kind === "ModifyDP"),
      ).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            amount: -10000,
            duration: "untilOpponentTurnEnd",
            target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          },
        ],
      });
    }
  });
});
