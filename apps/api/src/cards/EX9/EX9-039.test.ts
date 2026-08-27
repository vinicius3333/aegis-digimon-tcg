import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-039.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-039", () => {
  it("has Training and suspends an opposing Digimon on play or digivolution, then may attack", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Training",
      raw: "＜Training＞",
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "PlaceUnder", optional: true },
          { kind: "Suspend", scaling: { unit: "digivolutionCards", per: 1, filter: { faceDown: true } } },
          { kind: "Attack", attackPlayer: false, optional: true },
        ],
      });
  });
  it("inherits suspension of an opposing Digimon or Tamer on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } } }],
    }));

  it("places a hand card face-down, scales suspension from this stack, and permits the optional attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-039",
              as: "source",
              dp: 12000,
              under: [
                { card: "BT1-009", faceUp: false },
                { card: "BT1-009", faceUp: true },
              ],
            },
          ],
          hand: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "opponent1", dp: 1000 },
            { card: "BT1-010", as: "opponent2", dp: 1000 },
            { card: "BT1-010", as: "opponent3", dp: 1000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.perm("source").stack.map((card) => card.faceUp)).toEqual([false, true, false]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(1);
  });
});
