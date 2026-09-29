import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT7-029.js";
import "./BT7-021.js";
import "./BT7-087.js";
import "../BT4/BT4-114.js";
import "../EX12/EX12-025.js";
import "../P/P-153.js";

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
    if (action?.kind !== "Digivolve") throw new Error("BT7-087 evolution action is not Digivolve");
    expect(action.into).not.toHaveProperty("upTo");
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
    await s.ready();

    expect(s.state.memory).toBe(1);
    expect(s.perm("koji").stack).toHaveLength(5);
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT7-021")).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("koji"), "cantBeBlocked")).toBe(true);
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

function activateKojiMain(s: EngineSetup) {
  const source = observe(s.engine).cardSource(s.perm("koji"));
  const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find(
    (effect) => effect.effectKey === "BT7-087/main-digivolve",
  )!.effectKey;
  return s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.perm("koji").topCard.instanceId,
    effectKey,
  });
}

function respondOptional(s: EngineSetup, accept: boolean) {
  const decision = s.state.pendingDecision!;
  const result = s.engine.applyIntent(0, {
    type: "respondDecision",
    decisionId: decision.decisionId,
    response: { kind: "optional", accept },
  });
  expect([true, "decision-pending"]).toContain(result.ok ? true : result.reason);
  return decision.decisionId;
}

function handIds(s: EngineSetup, seat: 0 | 1 = 0) {
  return s.state.players[seat]!.hand.map((card) => card.instanceId);
}

describe("BT7-087 Koji Minamoto — KB Q&A rulings", () => {
  it("activates its inherited effect once a Digimon that can digivolve onto Tamers digivolves onto it (Q1657)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-087", as: "koji" },
            { card: "BT1-009", as: "firstBounced" },
            { card: "BT1-009", as: "secondBounced" },
          ],
          hand: [{ card: "BT7-021", as: "kumamon" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).verb.returnToHand([s.perm("firstBounced").topCard.instanceId]);
    await settle();
    expect(s.state.memory).toBe(2);
    expect(observe(s.engine).isRestricted(s.perm("koji"), "cantBeBlocked")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koji").permanentId,
        instanceId: s.inst("kumamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard.instanceId === s.inst("kumamon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("koji").stack.map((card) => card.cardId)).toEqual(["BT7-087"]);
    expect(s.state.memory).toBe(0);

    await advance(s.engine).verb.returnToHand([s.perm("secondBounced").topCard.instanceId]);
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).isRestricted(s.perm("koji"), "cantBeBlocked")).toBe(true);
  });

  it("activates its inherited effect when an opponent's effect returns one of my Digimon to my hand (Q1658)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-029", under: ["BT7-087"], as: "host" },
            { card: "BT1-009", as: "bounced" },
          ],
        },
        1: { battleArea: [{ card: "EX12-025", as: "gawappamon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const bouncedId = s.perm("bounced").topCard.instanceId;
    await s.ready();
    expect(s.state.memory).toBe(0);

    await advance(s.engine).verb.deletePermanent([s.perm("gawappamon").permanentId]);
    await settle(() => handIds(s).includes(bouncedId));
    await settle(() => s.state.memory === 1);

    expect(handIds(s)).toContain(bouncedId);
    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).isRestricted(s.perm("host"), "cantBeBlocked")).toBe(true);
  });

  it("may place 5 Hybrid cards under it and then choose not to digivolve into MagnaGarurumon (Q1659)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-087", as: "koji" }],
          hand: ["BT7-021", "BT7-021", "BT7-021", "BT7-021", "BT7-021", { card: "BT7-029", as: "magna" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(activateKojiMain(s)).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const placeDecisionId = respondOptional(s, true);
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.decisionId !== placeDecisionId,
    );
    expect(s.perm("koji").stack).toHaveLength(5);
    respondOptional(s, false);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("koji").topCard.cardId).toBe("BT7-087");
    expect(s.perm("koji").stack.map((card) => card.cardId)).toEqual(Array(5).fill("BT7-021"));
    expect(handIds(s)).toContain(s.inst("magna").instanceId);
    expect(s.state.memory).toBe(4);
  });

  it("cannot place only 4 Hybrid cards under it when the hand holds just 4 (Q1660)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-087", as: "koji" }],
          hand: ["BT7-021", "BT7-021", "BT7-021", "BT7-021", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const handBefore = handIds(s);

    const result = activateKojiMain(s);
    if (result.ok) await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("koji").stack).toHaveLength(0);
    expect(handIds(s)).toEqual(handBefore);
    expect(s.state.memory).toBe(4);
  });

  it("does not digivolve into another level 6 Digimon such as AncientGarurumon instead of MagnaGarurumon (Q1662)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-087", as: "koji" }],
          hand: ["BT7-021", "BT7-021", "BT7-021", "BT7-021", "BT7-021", { card: "BT4-114", as: "ancient" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(activateKojiMain(s)).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("koji").stack.length === 5);

    expect(s.perm("koji").topCard.cardId).toBe("BT7-087");
    expect(handIds(s)).toContain(s.inst("ancient").instanceId);
    expect(s.state.memory).toBe(5);
  });

  it("keeps can't-be-blocked after P-153 leaves the top and passes it to the next digivolution that turn (Q1661)", async () => {
    const s = setupEngine(
      {
        0: {
          security: ["BT1-009"],
          battleArea: [
            { card: "P-153", as: "magna", under: ["BT7-087"] },
            { card: "BT1-009", as: "bounced" },
          ],
          hand: [{ card: "BT7-021", as: "kumamon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    const permanentId = s.perm("magna").permanentId;
    const p153Id = s.perm("magna").topCard.instanceId;
    const promoted = () => s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === permanentId)!;
    s.state.memory = 5;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(promoted(), "cantBeBlocked")).toBe(false);

    await advance(s.engine).verb.returnToHand([s.perm("bounced").topCard.instanceId]);
    await settle(() => s.state.memory === 6);
    expect(observe(s.engine).isRestricted(promoted(), "cantBeBlocked")).toBe(true);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: permanentId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.security.some((card) => card.instanceId === p153Id),
    );
    expect(promoted().topCard.cardId).toBe("BT7-087");
    expect(observe(s.engine).isRestricted(promoted(), "cantBeBlocked")).toBe(true);

    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: s.inst("kumamon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => promoted().topCard.instanceId === s.inst("kumamon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(4);
    expect(observe(s.engine).isRestricted(promoted(), "cantBeBlocked")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
