import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-062.js";
describe("EX7-062 HeavyMetaldramon", () => {
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

  it("trashes two hand cards and deletes only an opponent at or below its DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-062", as: "heavy" }],
          hand: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "within", dp: 13000 },
            { card: "BT1-010", as: "above", dp: 13001 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("heavy"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("within").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toContain(
      s.inst("above").instanceId,
    );
  });

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
