import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-068.js";

describe("BT2-068 Impmon", () => {
  it("trashes the top 3 cards of its controller's deck on deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-068", as: "impmon" }],
        deck: [
          { card: "BT1-010", as: "first" },
          { card: "BT1-011", as: "second" },
          { card: "BT1-012", as: "third" },
          { card: "BT1-013", as: "remaining" },
        ],
      },
      1: { deck: [{ card: "BT1-029", as: "opponentTop" }] },
    });

    await advance(s.engine).verb.deletePermanent([s.perm("impmon").permanentId]);

    for (const alias of ["first", "second", "third"]) {
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst(alias).instanceId)).toBe(true);
    }
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("remaining").instanceId);
    expect(s.state.players[1]!.deck[0]!.instanceId).toBe(s.inst("opponentTop").instanceId);
  });

  it("trashes all remaining cards when its controller's deck has fewer than 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-068", as: "impmon" }],
        deck: [
          { card: "BT1-010", as: "first" },
          { card: "BT1-011", as: "second" },
        ],
      },
    });

    await advance(s.engine).verb.deletePermanent([s.perm("impmon").permanentId]);

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(3);
  });

  it("triggers when Impmon is deleted in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT2-068", as: "impmon", suspended: true }],
        deck: [
          { card: "BT1-029", as: "first" },
          { card: "BT1-030", as: "second" },
          { card: "BT1-031", as: "third" },
        ],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("impmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.deck.length === 0);

    expect(s.state.players[1]!.trash).toHaveLength(4);
  });
});
