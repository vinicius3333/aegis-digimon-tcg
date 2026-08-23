import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-059.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("EX9-059", () => {
  it("has Training and once per turn deletes an opposing level-four-or-lower Digimon on digivolving or attacking after placing a hand card underneath", () => {
    expect(
      compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Training"))?.keywords,
    ).toContainEqual({ keyword: "Training", raw: "＜Training＞" });
    for (const trigger of ["WhenDigivolving", "WhenAttacking"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Delete",
            target: { filter: { levelComparison: { op: "lte", value: 4 } } },
            cost: { kind: "place", faceDown: true, destination: "digivolutionStack" },
          },
        ],
      });
  });
  it("inherits once-per-turn draw one and trash one when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", amount: 1 },
        { kind: "Trash", target: { filter: { zone: "hand" } } },
      ],
    }));
  it("shares one once-per-turn identity across digivolving and attacking", () => {
    const effects = ["WhenDigivolving", "WhenAttacking"].map((trigger) =>
      compiled.effects?.find((entry) => entry.trigger === trigger),
    );
    expect(effects[0]).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        {
          optional: true,
          abortOnDecline: true,
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
            count: 1,
          },
          cost: {
            target: { filter: { zone: "hand", controller: "mine" }, count: 1 },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            faceDown: true,
          },
        },
      ],
    });
    expect(effects[1]).toMatchObject({ sharedUseKey: "ir-shared-0" });
  });
  it("places a hand card face-down underneath and deletes an opposing level-four Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-059", as: "source" }], hand: ["BT1-009"] },
        1: { battleArea: [{ card: "EX9-050", as: "target", dp: 4000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.perm("source").stack[0]).toMatchObject({ cardId: "BT1-009", faceUp: false });
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
