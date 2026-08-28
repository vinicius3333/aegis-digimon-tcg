import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-033.js";

describe("BT2-033 Agumon", () => {
  it("draws when its host attacks while its controller has 3 yellow Tamers in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-035", as: "attacker", under: ["BT2-033"] }, "BT1-087", "BT1-087", "BT1-087"],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
      1: { security: ["BT1-011"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("does not draw with only 2 yellow Tamers", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-035", as: "attacker", under: ["BT2-033"] }, "BT1-087", "BT1-087"],
        deck: [{ card: "BT1-010", as: "topDeck" }],
      },
      1: { security: ["BT1-011"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("counts only the controller's yellow Tamers", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-035", as: "attacker", under: ["BT2-033"] }, "BT1-087", "BT1-087", "BT1-085"],
        deck: [{ card: "BT1-010", as: "topDeck" }],
      },
      1: { battleArea: ["BT1-087"], security: ["BT1-011"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not apply the inherited effect while Agumon is the top card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-033", as: "attacker", dp: 20000 }, "BT1-087", "BT1-087", "BT1-087"],
        deck: [{ card: "BT1-010", as: "topDeck" }],
      },
      1: { security: ["BT1-011"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
