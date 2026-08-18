import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-025.js";

describe("BT7-025 Beowolfmon", () => {
  it("reduces only its own digivolution cost when the base has a Tamer source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-021", as: "base", under: ["BT7-086"] }],
        hand: [{ card: "BT7-025", as: "beowolfInHand" }],
      },
    });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("beowolfInHand").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("beowolfInHand").instanceId);

    expect(s.state.memory).toBe(2);
  });

  it("returns a Hybrid source as its attack cost, trashes the target's sources, and returns it to hand", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-025", under: [{ card: "BT6-049", as: "hybrid" }], as: "beowolf" }] },
      1: { battleArea: [{ card: "BT6-049", under: [{ card: "BT1-010", as: "targetSource" }], as: "target" }], security: ["BT1-101"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const targetId = s.perm("target").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("beowolf").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("hybrid").instanceId) &&
      s.state.players[1]!.hand.some((card) => card.instanceId === targetId),
    );

    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("targetSource").instanceId)).toBe(true);
  });
});
