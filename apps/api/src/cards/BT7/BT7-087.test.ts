import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-087.js";

describe("BT7-087 Koji Minamoto", () => {
  it("keeps the MagnaGarurumon evolution optional after placing five Hybrids", () => {
    const action = runtimeCompiledCard("BT7-087")?.effects[1]?.actions[1];

    expect(action).toMatchObject({
      kind: "Digivolve",
      optional: true,
      payCost: true,
      from: ["hand"],
      into: { nameOrTrait: [{ tokens: ["MagnaGarurumon"], match: "nameExact" }] },
      virtualBase: { level: 5, colors: ["Blue"] },
      condition: { kind: "namedCountAtLeast", count: 5 },
    });
    expect(runtimeCompiledCard("BT7-087")?.effects[1]?.actions[0]).toMatchObject({
      target: { filter: { nameOrTrait: [{ tokens: ["Hybrid"], match: "traitContains" }] } },
    });
    expect(action?.into).not.toHaveProperty("upTo");
  });

  it("places exactly 5 Hybrid cards from hand and digivolves into MagnaGarurumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-087", as: "koji" }],
          hand: ["BT7-021", "BT7-021", "BT7-021", "BT7-021", "BT7-021", { card: "BT7-029", as: "magna" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const source = (s.engine as any).cardSourceOf(s.perm("koji").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find(
      (effect) => effect.effectKey === "BT7-087/main-digivolve",
    )!.effectKey;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("koji").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.instanceId === s.inst("magna").instanceId);

    // There is no opponent Digimon with a matching level, so MagnaGarurumon's
    // optional return cannot be activated and Koji's inherited trigger has no
    // event to observe. The dedicated test below supplies that event.
    expect(s.state.memory).toBe(0);
    // Five placed Hybrids plus the evolved-from Tamer remain as sources.
    expect(s.perm("koji").stack).toHaveLength(6);
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT7-021")).toHaveLength(0);
  });

  it("does not ignore MagnaGarurumon's printed blue level-5 evolution requirement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-087", as: "koji" }],
          hand: ["BT7-021", "BT7-021", "BT7-021", "BT7-021", "BT7-021", { card: "BT18-042", as: "wrongColorMagna" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const source = (s.engine as any).cardSourceOf(s.perm("koji").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find(
      (effect) => effect.effectKey === "BT7-087/main-digivolve",
    )!.effectKey;
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("koji").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("koji").stack.length === 5);

    expect(s.perm("koji").topCard.cardId).toBe("BT7-087");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("wrongColorMagna").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(5);
  });

  it("may leave five ordered Hybrids under Koji without evolving into MagnaGarurumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-087", as: "koji" }],
          hand: [
            { card: "BT7-021", as: "hybridOne" },
            { card: "BT7-021", as: "hybridTwo" },
            { card: "BT7-021", as: "hybridThree" },
            { card: "BT7-021", as: "hybridFour" },
            { card: "BT7-021", as: "hybridFive" },
            { card: "BT7-029", as: "magna" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    const source = (s.engine as any).cardSourceOf(s.perm("koji").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find(
      (effect) => effect.effectKey === "BT7-087/main-digivolve",
    )!.effectKey;
    const hybrids = ["hybridOne", "hybridTwo", "hybridThree", "hybridFour", "hybridFive"].map(
      (alias) => s.inst(alias).instanceId,
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("koji").topCard.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const placeHybrids = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: placeHybrids.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const materials = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: materials.decisionId,
        response: { kind: "selectCards", instanceIds: hybrids },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const ordering = s.decisions.at(-1)!.req;
    expect(ordering.options?.orderDestination).toBe("stackBottom");
    const orderingResult = s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: ordering.decisionId,
      response: { kind: "orderCards", order: hybrids },
    });
    expect([true, "decision-pending"]).toContain(orderingResult.ok ? true : orderingResult.reason);
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.decisionId !== placeHybrids.decisionId,
    );
    const evolve = s.decisions.at(-1)!.req;
    const declineResult = s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: evolve.decisionId,
      response: { kind: "optional", accept: false },
    });
    expect([true, "decision-pending"]).toContain(declineResult.ok ? true : declineResult.reason);
    await settle(() => s.state.pendingDecision === undefined && s.perm("koji").stack.length === 5);

    expect(s.perm("koji").topCard.cardId).toBe("BT7-087");
    expect(s.perm("koji").stack.map((card) => card.instanceId)).toEqual(hybrids);
    expect(s.state.memory).toBe(4);
  });

  it("gains 1 memory and prevents blocking when an effect adds a card to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-029", under: ["BT7-087"], as: "host" },
            { card: "BT7-021", as: "returned" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.returnToHand([s.perm("returned").topCard!.instanceId]);
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).isRestricted(s.perm("host"), "cantBeBlocked")).toBe(true);
  });

  it("uses the inherited add-to-hand effect only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-029", under: ["BT7-087"], as: "host" },
            { card: "BT7-021", as: "firstReturned" },
            { card: "BT7-021", as: "secondReturned" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.returnToHand([s.perm("firstReturned").topCard.instanceId]);
    await settle(() => s.state.memory === 1);
    await advance(s.engine).verb.returnToHand([s.perm("secondReturned").topCard.instanceId]);

    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).isRestricted(s.perm("host"), "cantBeBlocked")).toBe(true);
  });
});
