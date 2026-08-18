import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-046.js";

describe("BT5-046 Terriermon Assistant", () => {
  it("Digi-Bursts 1 to reveal and add a green Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-046", as: "terrier", under: ["BT1-009"] }], deck: ["BT5-047"] } }, { autoSelectCards: true });
    const source = (s.engine as any).cardSourceOf(s.perm("terrier").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT5-046/"))!.effectKey;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.perm("terrier").topCard!.instanceId, effectKey })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT5-047"));
    expect(s.perm("terrier").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT5-047")).toBe(true);
  });
});
