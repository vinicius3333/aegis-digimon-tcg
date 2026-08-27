import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-009.js";

describe("BT7-009 Huckmon", () => {
  it("adds all revealed Sistermon cards to hand when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", under: ["BT7-009"], as: "host" }],
          deck: [
            { card: "BT6-082", as: "sister1" },
            { card: "BT6-084", as: "sister2" },
            "BT1-010",
            "BT1-011",
            "BT1-012",
          ],
        },
        1: { security: ["BT1-101"] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("sister1").instanceId, s.inst("sister2").instanceId]),
    );
  });

  it("does not search again after its once-per-turn inherited effect has resolved", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", under: ["BT7-009"], as: "host" }],
          deck: [
            { card: "BT6-082", as: "firstSister" },
            { card: "BT6-084", as: "secondSister" },
            "BT1-010",
            "BT1-011",
            "BT1-012",
            { card: "BT6-082", as: "thirdSister" },
          ],
        },
        1: { security: ["BT1-101"] },
      },
      { autoSelectCards: true },
    );
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" as const },
      });

    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(attack()).toEqual({ ok: true });

    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("thirdSister").instanceId)).toBe(true);
  });
});
