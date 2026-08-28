import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-026.js";

describe("BT4-026 GaoGamon", () => {
  it("trashes exactly 2 sources for Digi-Burst to draw 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-026", as: "gao", under: ["BT1-001", "BT4-021"] },
            { card: "BT1-038", as: "ally", under: [{ card: "BT1-001", as: "allySource" }] },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    const deckBefore = s.state.players[0]!.deck.length;
    const effectKey = effectsOf(
      EffectTiming.OnDeclaration,
      (s.engine as any).cardSourceOf(s.perm("gao").topCard!),
    ).find((effect) => effect.effectKey.startsWith("BT4-026/"))!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("gao").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === deckBefore - 1);

    expect(s.perm("gao").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    expect(s.perm("ally").stack).toHaveLength(1);
    expect(s.perm("ally").stack[0]!.instanceId).toBe(s.inst("allySource").instanceId);
  });
});
