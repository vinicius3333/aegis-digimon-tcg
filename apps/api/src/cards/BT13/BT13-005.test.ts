import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT13-005.js";

describe("BT13-005 Dorimon", () => {
  it("draws 1 when its evolved stack attacks with exactly 4 digivolution cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT1-069",
            as: "attacker",
            dp: 12000,
            under: ["BT13-005", "BT1-066", "BT1-067", "BT1-068"],
          },
        ],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
      1: { security: ["BT1-001"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("does not draw when its evolved stack attacks with only 3 digivolution cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT1-069",
            as: "attacker",
            dp: 12000,
            under: ["BT13-005", "BT1-066", "BT1-067"],
          },
        ],
        deck: [{ card: "BT1-010", as: "deckTop" }],
      },
      1: { security: ["BT1-001"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("deckTop").instanceId);
  });
});
