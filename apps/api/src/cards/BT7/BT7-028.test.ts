import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-028.js";

describe("BT7-028 KingWhamon", () => {
  it("plays a level 3 source when attacking and returns an opposing level 4 after trashing its sources", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-028", under: [{ card: "BT1-010", as: "rookie" }], as: "kingwhamon" }] },
      1: { battleArea: [{ card: "BT6-049", under: [{ card: "BT1-011", as: "targetSource" }], as: "target" }], security: ["BT1-101"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const targetId = s.perm("target").topCard!.instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("kingwhamon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("rookie").instanceId) &&
      s.state.players[1]!.hand.some((card) => card.instanceId === targetId),
    );

    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("targetSource").instanceId)).toBe(true);
  });
});
