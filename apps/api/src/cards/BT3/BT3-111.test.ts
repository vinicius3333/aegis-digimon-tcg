import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-111.js";

describe("BT3-111 Imperialdramon: Dragon Mode", () => {
  it("reduces its cost over Paildramon and unsuspends after deleting in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-027", as: "paildramon" }],
        hand: [{ card: "BT3-111", as: "imperialdramon" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
      1: {
        battleArea: [{ card: "BT1-010", dp: 1000, suspended: true, as: "defender" }],
        security: ["BT1-011"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("paildramon").permanentId,
        instanceId: s.inst("imperialdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("paildramon").topCard.cardId === "BT3-111" &&
        s.state.memory === 2 &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
      5000,
    );
    expect(s.state.memory).toBe(2);
    expect(observe(s.engine).hasPierce(s.perm("paildramon"))).toBe(true);

    const defenderId = s.perm("defender").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paildramon").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === defenderId) &&
        !s.perm("paildramon").isSuspended &&
        s.state.players[1]!.security.length === 0,
      5000,
    );

    expect(s.perm("paildramon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
