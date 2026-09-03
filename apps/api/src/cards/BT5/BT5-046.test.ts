import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { internalsOf } from "../../engine/testkit/internals.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-004.js";
import "./BT5-046.js";

describe("BT5-046 Terriermon Assistant", () => {
  it("Digi-Bursts 1 to reveal and add a green Digimon", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT5-046", as: "terrier", under: ["BT5-004"] }], deck: ["BT5-047"] } },
      { autoSelectCards: true },
    );
    const source = internalsOf(s.engine).cardSourceOf(s.perm("terrier").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT5-046/"),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("terrier").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT5-047"));
    expect(s.perm("terrier").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT5-047")).toBe(true);
  });

  it("bottoms a revealed non-green card after paying Digi-Burst", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-046", as: "terrier", under: ["BT5-004"] }],
          deck: ["BT1-010", "BT5-047"],
        },
      },
      { autoSelectCards: true },
    );
    const revealedNonMatch = s.state.players[0]!.deck[0]!;
    const source = internalsOf(s.engine).cardSourceOf(s.perm("terrier").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT5-046/"),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("terrier").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("terrier").stack.length === 0 &&
        s.state.players[0]!.deck.some((card) => card.instanceId === revealedNonMatch.instanceId),
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("terrier").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT5-047", "BT1-010"]);
  });

  it("does not expose the Main effect when Digi-Burst has no source card to trash", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-046", as: "terrier" }], deck: ["BT5-047"] },
    });
    internalsOf(s.engine).syncActivatableEffects();
    expect(s.perm("terrier").activatableEffectsJson).toBe("");
  });
});
