import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-079.js";
import "../BT10/BT10-073.js";

describe("BT5-079 BlackWarGrowlmon", () => {
  it("Digi-Bursts 3 to play a purple level 3 without its On Play effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-079", as: "growl", under: ["BT1-009", "BT1-010", "BT1-011"] }], trash: [{ card: "BT10-073", as: "rookie" }], deck: ["BT10-073", "BT10-073", "BT10-073", "BT10-073"] } }, { autoSelectCards: true, autoAcceptOptional: true });
    const source = (s.engine as any).cardSourceOf(s.perm("growl").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT5-079/"))!.effectKey;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.perm("growl").topCard!.instanceId, effectKey })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("rookie").instanceId));

    expect(s.perm("growl").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it("deletes another own Digimon to unsuspend its host, which can attack again", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-081", as: "host", under: ["BT5-079"] }, { card: "BT5-071", as: "cost" }] },
      1: { security: ["BT1-009", "BT1-010"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const combat = (s.engine as any).combat as { isAttacking: boolean };
    const costPermanentId = s.perm("cost").permanentId;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]?.security.length === 1 && !combat.isAttacking);

    expect(s.state.players[0]?.battleArea.some((permanent) => permanent.permanentId === costPermanentId)).toBe(false);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
  });

  it("does not unsuspend when no other Digimon can be deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-081", as: "host", under: ["BT5-079"] }] }, 1: { security: ["BT1-009"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]?.security.length === 0);
    expect(s.perm("host").isSuspended).toBe(true);
  });
});
