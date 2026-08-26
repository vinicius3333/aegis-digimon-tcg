import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-062.js";
describe("EX7-062 Gulfmon", () => {
  it("trashes two cards from hand before deleting within its DP", () =>
    expect(compiled.effects?.[0]?.actions).toMatchObject([
      { kind: "Trash", target: { filter: { zone: "hand", controller: "mine" }, count: 2 } },
      { kind: "Delete", target: { filter: { controller: "opponent", dp: { op: "lte", relativeToSource: true } } } },
    ]));
  it("reduces the trash play-cost ceiling by one per card in hand", () =>
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      target: { filter: { playCostLte: 8, playCostLteScaling: { subtract: 1, unit: "cards" } } },
    }));

  it("plays an isolated card exactly at the reduced cost-6 ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-062", as: "gulfmon" }],
          hand: ["BT1-010", "BT1-011"],
          trash: ["EX7-055"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("gulfmon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-055"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-055")).toBe(true);
  });

  it("rejects an isolated card above the reduced cost-6 ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-062", as: "gulfmon" }],
          hand: ["BT1-010", "BT1-011"],
          trash: ["EX7-057"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("gulfmon"));
    await settle(() => false, 1);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX7-057"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["EX7-062"]);
  });
});
