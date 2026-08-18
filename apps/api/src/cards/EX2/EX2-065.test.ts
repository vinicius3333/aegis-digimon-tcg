import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-065.js";

describe("EX2-065 Ai & Mako", () => {
  it("may suspend when a Digimon attacks to trash the top card of its deck", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-044", as: "attacker" }, { card: "EX2-065", as: "aiMako" }], deck: [{ card: "BT1-001", as: "milled" }] }, 1: { security: ["BT1-002"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("aiMako").isSuspended && s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("milled").instanceId));
    expect(s.perm("aiMako").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("milled").instanceId)).toBe(true);
  });

  it("may digivolve an attacking Beelzemon into Blast Mode from trash for exactly 3 memory", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-044", as: "beelzemon" }, { card: "EX2-065", as: "aiMako" }], deck: ["BT1-001"], trash: [{ card: "EX2-074", as: "blastMode" }] }, 1: { security: ["BT1-002"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("beelzemon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("beelzemon").topCard.instanceId === s.inst("blastMode").instanceId);
    expect(s.perm("beelzemon").topCard.instanceId).toBe(s.inst("blastMode").instanceId);
    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });

  it("does not offer Blast Mode digivolution when the attacker is not Beelzemon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-043", as: "gulfmon" }, { card: "EX2-065", as: "aiMako" }], deck: ["BT1-001"], trash: [{ card: "EX2-074", as: "blastMode" }] }, 1: { security: ["BT1-002"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("gulfmon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("aiMako").isSuspended);
    expect(s.perm("gulfmon").topCard.cardId).toBe("EX2-043");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("blastMode").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10);
    assertNoLoudGap(s);
  });
});
