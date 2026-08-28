import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-060.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("EX9-060", () => {
  it("has Training and once per turn draws one by placing a hand card underneath on digivolution or attack", () => {
    expect(
      compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Training"))?.keywords,
    ).toContainEqual({ keyword: "Training", raw: "＜Training＞" });
    for (const trigger of ["WhenDigivolving", "WhenAttacking"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        actions: [
          { kind: "Draw", amount: 1, cost: { kind: "place", faceDown: true, destination: "digivolutionStack" } },
        ],
      });
  });
  it("inherits deletion of an opposing level-four-or-lower Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 4 } } } }],
    }));
  it("shares the once-per-turn identity and exact hand placement cost across both triggers", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        optional: true,
        abortOnDecline: true,
        cost: {
          target: { filter: { zone: "hand", controller: "mine" }, count: 1 },
          destination: "digivolutionStack",
          position: "bottom",
          host: "self",
          faceDown: true,
        },
      });
    expect(
      compiled.effects
        ?.filter((entry) => ["WhenDigivolving", "WhenAttacking"].includes(entry.trigger))
        .map((entry) => entry.sharedUseKey),
    ).toEqual(["ir-shared-0", "ir-shared-0"]);
  });
  it("places a hand card face-down underneath and draws one when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-060", as: "source" }], hand: ["BT1-009"], deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.perm("source").stack[0]).toMatchObject({ cardId: "BT1-009", faceUp: false });
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
  });
});
