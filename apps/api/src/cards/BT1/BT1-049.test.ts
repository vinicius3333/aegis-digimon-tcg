import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-049.js";
import "./BT1-054.js";

describe("BT1-049 Labramon", () => {
  it("draws 1 when an opposing Digimon is deleted by having its DP reduced to 0", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-052", as: "host", under: ["BT1-049"] },
            { card: "BT1-054", as: "attacker" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-016", as: "target", dp: 2000 }], security: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("does not draw when an opposing Digimon is deleted by an effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-052", as: "host", under: ["BT1-049"] }],
        deck: [{ card: "BT1-010", as: "notDrawn" }],
      },
      1: { battleArea: [{ card: "BT1-016", as: "target" }] },
    });
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.deletePermanent([s.perm("target").permanentId], "byEffect");

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("notDrawn").instanceId);
  });

  it("draws only once when two opposing Digimon are simultaneously deleted at 0 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-052", as: "host", under: ["BT1-049"] }],
        deck: [
          { card: "BT1-010", as: "drawn" },
          { card: "BT1-011", as: "notDrawn" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-016", as: "targetA", dp: 0 },
          { card: "BT1-017", as: "targetB", dp: 0 },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.deletePermanent(
      [s.perm("targetA").permanentId, s.perm("targetB").permanentId],
      "byRule",
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("notDrawn").instanceId);
  });
});
