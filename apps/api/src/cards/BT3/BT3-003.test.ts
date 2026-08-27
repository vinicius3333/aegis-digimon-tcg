import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-003.js";

describe("BT3-003 Upamon", () => {
  it("draws 1 when attacking with 3 or fewer security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-032", as: "host", under: ["BT3-003"] }],
        security: ["BT1-010", "BT1-011", "BT1-012"],
        deck: [{ card: "BT1-013", as: "drawn" }],
      },
      1: { security: ["BT1-014"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("does not draw when attacking with 4 security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-032", as: "host", under: ["BT3-003"] }],
        security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        deck: [{ card: "BT1-014", as: "top" }],
      },
      1: { security: ["BT1-011"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("top").instanceId)).toBe(true);
  });
});
