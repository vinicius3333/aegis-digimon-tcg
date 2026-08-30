import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-046.js";

describe("BT1-046 Kudamon", () => {
  it("draws 1 when attacking with exactly 4 cards in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-046", as: "attacker" }],
        hand: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        deck: [{ card: "BT1-014", as: "drawn" }],
      },
      1: { security: ["BT1-015"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 5);
    expect(s.state.players[0]!.hand.at(-1)!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("does not draw when attacking with 5 cards in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-046", as: "attacker" }],
        hand: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        deck: [{ card: "BT1-015", as: "notDrawn" }],
      },
      1: { security: ["BT1-016"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("notDrawn").instanceId);
  });

  it("retains its hand threshold after evolving from a yellow level 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-006", as: "base" }],
        hand: [{ card: "BT1-046", as: "evolving" }],
        deck: [{ card: "BT1-010", as: "evolutionDraw" }, { card: "BT1-011", as: "attackDraw" }],
      },
      1: { security: ["BT1-015"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolving").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("evolutionDraw").instanceId,
      s.inst("attackDraw").instanceId,
    ]);
  });
});
