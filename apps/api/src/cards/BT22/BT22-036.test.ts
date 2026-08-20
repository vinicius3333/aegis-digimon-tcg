import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT22-036.js";

describe("BT22-036 Chaperomon", () => {
  it("keeps the Arisa trash-placement digivolution and Puppet Overclock/leave replacement", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ isFromHand: true, condition: { kind: "youHave" } });
    expect(main?.actions[0]).toMatchObject({
      kind: "DigivolveViaPlacement",
      placeCost: {
        kind: "placeFromTrash",
        position: "bottom",
        destination: "digivolutionStack",
        hostFilter: { nameOrTrait: [{ tokens: ["Shoemon"], match: "name" }] },
      },
      into: { isSelfRef: true },
      cost: 3,
      ignoreDigivolutionRequirements: true,
    });
    const endTurn = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(endTurn?.actions[0]).toMatchObject({
      kind: "Attack",
      attackPlayer: true,
      withoutSuspending: true,
      optional: true,
      cost: { kind: "deleteOwn" },
    });
    const inherited = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(inherited).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          excludeOwnEffects: true,
          sourceFilter: { isSelfRef: true },
          cost: { kind: "deleteOwn" },
        },
      ],
    });
  });

  it("publicly places ShoeShoemon from trash and pays exactly 3 for the hand digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-024", as: "shoemon" }],
          hand: [{ card: "BT22-036", as: "chaperomon" }, "BT22-088"],
          trash: [{ card: "BT22-032", as: "shoeShoemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const source = (s.engine as any).cardSourceOf(s.inst("chaperomon"));
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT22-036/"))!.effectKey;

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.inst("chaperomon").instanceId, effectKey })).toEqual({ ok: true });
    await settle(() => s.perm("shoemon").topCard?.cardId === "BT22-036");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT22-036")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT22-032")).toBe(false);
    expect(s.perm("shoemon").stack.map((card) => card.cardId)).toEqual(["EX7-024", "BT22-032", "BT22-036"]);
  });

  it("does not expose the hand effect without Arisa Kinosaki", async () => {
    const s = setupEngine({ 0: { battleArea: ["EX7-024"], hand: [{ card: "BT22-036", as: "chaperomon" }], trash: ["BT22-032"] } });
    const source = (s.engine as any).cardSourceOf(s.inst("chaperomon"));
    const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) => entry.effectKey.startsWith("BT22-036/"));
    if (effect !== undefined) s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.inst("chaperomon").instanceId, effectKey: effect.effectKey });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT22-036")).toBe(true);
  });
});
