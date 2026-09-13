import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT13-005.js";
import "./BT13-063.js";
import "./BT13-066.js";
import "./BT13-071.js";
import "../BT2/BT2-064.js";

describe("BT13-005 Dorimon", () => {
  it("draws 1 when its evolved stack attacks with exactly 4 digivolution cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT2-064",
            as: "attacker",
            under: ["BT13-005", "BT13-063", "BT13-066", "BT13-071"],
          },
        ],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
      1: { security: ["BT1-010"] },
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
            card: "BT13-071",
            as: "attacker",
            under: ["BT13-005", "BT13-063", "BT13-066"],
          },
        ],
        deck: [{ card: "BT1-010", as: "deckTop" }],
      },
      1: { security: ["BT1-010"] },
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
