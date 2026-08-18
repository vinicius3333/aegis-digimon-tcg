import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-007.js";

describe("BT2-007 Pagumon", () => {
  it("trashes exactly the top card of its owner's deck when attacking", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-009", as: "attacker", under: ["BT2-007"] }],
        deck: [
          { card: "BT1-010", as: "top" },
          { card: "BT1-011", as: "remaining" },
        ],
      },
      1: { security: ["BT1-012"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("top").instanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("remaining").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("resolves harmlessly when its owner's deck is empty", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-009", as: "attacker", under: ["BT2-007"] }] },
      1: { security: ["BT1-012"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
