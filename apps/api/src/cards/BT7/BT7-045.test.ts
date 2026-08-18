import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-045.js";

describe("BT7-045 Tortomon", () => {
  it("places a green Digimon from hand on top of the deck to give its host +3000 DP when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-049", under: ["BT7-045"], as: "host" }], hand: [{ card: "BT6-049", as: "greenCard" }], deck: [{ card: "BT1-011", as: "existing" }] },
      1: { security: ["BT1-101"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    const baseDP = s.perm("host").currentDP;
    const greenCardId = s.inst("greenCard").instanceId;
    const inheritedSource = (s.engine as any).cardSourceOf(s.perm("host").stack[0]!);
    expect(effectsOf(EffectTiming.OnAllyAttack, inheritedSource).map((effect) => effect.effectKey)).toContain("BT7-045/reveal-green-for-dp");

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === baseDP + 3000);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === greenCardId)).toBe(false);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(greenCardId);
  });
});
