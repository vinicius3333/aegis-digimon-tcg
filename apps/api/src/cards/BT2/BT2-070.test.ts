import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-070.js";

describe("BT2-070 Tapirmon", () => {
  it("draws 1 card from its controller's deck on deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-070", as: "tapirmon" }],
        deck: [
          { card: "BT1-010", as: "drawn" },
          { card: "BT1-011", as: "remaining" },
        ],
      },
      1: { deck: [{ card: "BT1-029", as: "opponentTop" }] },
    });

    await advance(s.engine).verb.deletePermanent([s.perm("tapirmon").permanentId]);

    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("remaining").instanceId);
    expect(s.state.players[1]!.deck[0]!.instanceId).toBe(s.inst("opponentTop").instanceId);
  });

  it("resolves without drawing when its controller's deck is empty", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-070", as: "tapirmon" }] } });

    await advance(s.engine).verb.deletePermanent([s.perm("tapirmon").permanentId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("triggers when Tapirmon is deleted in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-084", as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT2-070", as: "tapirmon", suspended: true }],
        deck: [{ card: "BT1-029", as: "drawn" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("tapirmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.hand.length === 1);

    expect(s.state.players[1]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });
});
