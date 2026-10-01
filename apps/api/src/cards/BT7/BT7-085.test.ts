import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT12/BT12-017.js";
import "../BT4/BT4-113.js";
import "../EX1/EX1-071.js";
import "./BT7-011.js";
import "./BT7-085.js";

describe("BT7-085 Takuya Kanbara", () => {
  it("keeps the EmperorGreymon evolution optional after placing five Hybrids", () => {
    const action = runtimeCompiledCard("BT7-085")?.effects[1]?.actions[1];

    expect(action).toMatchObject({
      kind: "Digivolve",
      optional: true,
      payCost: true,
      from: ["hand"],
      into: { nameOrTrait: [{ tokens: ["EmperorGreymon"], match: "nameExact" }] },
      virtualBase: { level: 5, colors: ["Red"] },
      condition: { kind: "namedCountAtLeast", count: 5 },
    });
    expect(runtimeCompiledCard("BT7-085")?.effects[1]?.actions[0]).toMatchObject({
      target: { filter: { nameOrTrait: [{ tokens: ["Hybrid"], match: "traitContains" }] } },
    });
    if (action?.kind !== "Digivolve") throw new Error("BT7-085 evolution action is not Digivolve");
    expect(action.into).not.toHaveProperty("upTo");
  });

  it("places exactly 5 Hybrid cards from trash and digivolves into EmperorGreymon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-085", as: "takuya" }],
          hand: [{ card: "BT12-017", as: "emperor" }],
          trash: ["BT7-011", "BT7-011", "BT7-011", "BT7-011", "BT7-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const source = (s.engine as any).cardSourceOf(s.perm("takuya").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find(
      (effect) => effect.effectKey === "BT7-085/main-digivolve",
    )!.effectKey;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("takuya").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("takuya").topCard?.instanceId === s.inst("emperor").instanceId &&
        observe(s.engine).keywordAmount(s.perm("takuya"), "SecurityAttack") === 1,
    );

    expect(s.state.memory).toBe(1);
    expect(s.perm("takuya").stack).toHaveLength(6);
    expect(s.perm("takuya").currentDP).toBe(13000);
    expect(observe(s.engine).keywordAmount(s.perm("takuya"), "SecurityAttack")).toBe(2);
  });

  it("may decline EmperorGreymon after ordering and placing all five Hybrid cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-085", as: "takuya" }],
          hand: [{ card: "BT7-016", as: "emperor" }],
          trash: [
            { card: "BT7-011", as: "hybridOne" },
            { card: "BT7-008", as: "hybridTwo" },
            { card: "BT7-019", as: "hybridThree" },
            { card: "BT7-035", as: "hybridFour" },
            { card: "BT7-046", as: "hybridFive" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    const source = (s.engine as any).cardSourceOf(s.perm("takuya").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find(
      (effect) => effect.effectKey === "BT7-085/main-digivolve",
    )!.effectKey;
    const hybrids = ["hybridOne", "hybridTwo", "hybridThree", "hybridFour", "hybridFive"].map(
      (alias) => s.inst(alias).instanceId,
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("takuya").topCard.instanceId,
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
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const ordering = s.decisions.at(-1)!.req;
    expect(ordering.sourceCardId).toBe("BT7-085");
    expect(ordering.options?.timing).toBe("Main");
    expect(ordering.options?.effectText).toContain("[Main][Once Per Turn]");
    expect(ordering.options?.effectText).not.toContain("[Inherited]");
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
    await settle(() => s.state.pendingDecision === undefined && s.perm("takuya").stack.length === 5);

    expect(s.perm("takuya").topCard.cardId).toBe("BT7-085");
    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toEqual(hybrids);
    expect(s.state.memory).toBe(4);
  });

  it("gives its host +2000 DP and Security Attack +1 at 10000 DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-014", under: ["BT7-085"], as: "host", dp: 8000 }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(10000);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("removes the inherited DP and Security Attack bonuses on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-014", under: ["BT7-085"], as: "host", dp: 8000 }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(10000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(8000);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });
});

describe("BT7-085 Takuya Kanbara — KB Q&A rulings", () => {
  const HYBRID_TRASH = ["BT7-011", "BT7-011", "BT7-011", "BT7-011", "BT7-011"];

  const activateTakuyaMain = (s: ReturnType<typeof setupEngine>) =>
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("takuya").topCard.instanceId,
      effectKey: "BT7-085/main-digivolve",
    });

  const offersTakuyaMain = (s: ReturnType<typeof setupEngine>) =>
    (observe(s.engine).activatableEffects(s.perm("takuya")) as Array<{ effectKey: string }>).some(
      (entry) => entry.effectKey === "BT7-085/main-digivolve",
    );

  it("activates its inherited effect once a Digimon that can digivolve onto Tamers digivolves onto it (Q1651)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-085", as: "takuya" }],
          hand: [{ card: "BT7-011", as: "burning" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("burning").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT7-011" && s.state.pendingDecision === undefined);

    expect(s.perm("takuya").stack.map((card) => card.cardId)).toEqual(["BT7-085"]);
    expect(s.perm("takuya").currentDP).toBe(8000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("takuya").currentDP).toBe(6000);
  });

  it("may place five Hybrid cards from trash and then decline to digivolve into EmperorGreymon (Q1652)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-085", as: "takuya" }],
          hand: [{ card: "BT12-017", as: "emperor" }],
          trash: HYBRID_TRASH,
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(activateTakuyaMain(s)).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const placePrompt = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: placePrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.decisionId !== placePrompt.decisionId,
    );
    const evolvePrompt = s.state.pendingDecision!;
    const declined = s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: evolvePrompt.decisionId,
      response: { kind: "optional", accept: false },
    });
    expect([true, "decision-pending"]).toContain(declined.ok ? true : declined.reason);
    await settle(() => s.state.pendingDecision === undefined && s.perm("takuya").stack.length === 5);

    expect(s.perm("takuya").topCard.cardId).toBe("BT7-085");
    expect(s.perm("takuya").stack.map((card) => card.cardId)).toEqual(HYBRID_TRASH);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT7-011")).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("emperor").instanceId]);
    expect(s.state.memory).toBe(4);
  });

  it("cannot place only four Hybrid cards from trash when fewer than five are available (Q1653)", async () => {
    const shortTrash = HYBRID_TRASH.slice(0, 4);
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-085", as: "takuya" }],
          hand: [{ card: "BT12-017", as: "emperor" }],
          trash: shortTrash,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(offersTakuyaMain(s)).toBe(false);
    activateTakuyaMain(s);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("takuya").stack).toHaveLength(0);
    expect(s.perm("takuya").topCard.cardId).toBe("BT7-085");
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT7-011")).toHaveLength(4);
    expect(s.state.memory).toBe(4);

    const control = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-085", as: "takuya" }],
          hand: [{ card: "BT12-017", as: "emperor" }],
          trash: HYBRID_TRASH,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    control.state.memory = 4;
    await control.ready();
    expect(offersTakuyaMain(control)).toBe(true);
  });

  it("cannot digivolve into a level 6 Digimon other than EmperorGreymon such as AncientGreymon (Q1654)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-085", as: "takuya" }],
          hand: [
            { card: "BT4-113", as: "ancient" },
            { card: "BT12-017", as: "emperor" },
          ],
          trash: HYBRID_TRASH,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("ancient").instanceId,
      }).ok,
    ).toBe(false);

    expect(activateTakuyaMain(s)).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId !== "BT7-085" && s.state.pendingDecision === undefined);

    expect(s.perm("takuya").topCard.instanceId).toBe(s.inst("emperor").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("ancient").instanceId]);

    const ancientOnly = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-085", as: "takuya" }],
          hand: [{ card: "BT4-113", as: "ancient" }],
          trash: HYBRID_TRASH,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    ancientOnly.state.memory = 10;
    await ancientOnly.ready();

    activateTakuyaMain(ancientOnly);
    await settle(
      () => ancientOnly.state.pendingDecision === undefined && ancientOnly.perm("takuya").stack.length === 5,
    );

    expect(ancientOnly.perm("takuya").topCard.cardId).toBe("BT7-085");
    expect(ancientOnly.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      ancientOnly.inst("ancient").instanceId,
    ]);
    expect(ancientOnly.state.memory).toBe(10);
  });

  it("cannot use Win Rate: 60%! to trash a Hybrid from hand before placing the five cards from trash (Q3261)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-085", as: "takuya" }],
          hand: [
            { card: "EX1-071", as: "winRate" },
            { card: "BT7-011", as: "handHybrid" },
            { card: "BT12-017", as: "emperor" },
          ],
          trash: HYBRID_TRASH.slice(0, 4),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("winRate").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-071"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("handHybrid").instanceId);
    expect(offersTakuyaMain(s)).toBe(false);
    activateTakuyaMain(s);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("takuya").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("handHybrid").instanceId);

    const control = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-085", as: "takuya" }],
          hand: [
            { card: "EX1-071", as: "winRate" },
            { card: "BT7-011", as: "handHybrid" },
            { card: "BT12-017", as: "emperor" },
          ],
          trash: HYBRID_TRASH,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    control.state.memory = 10;
    await control.ready();
    const trashHybrids = control.state.players[0]!.trash.map((card) => card.instanceId);
    control.engine.applyIntent(0, { type: "playCard", instanceId: control.inst("winRate").instanceId });
    await settle(() => control.state.players[0]!.trash.some((card) => card.cardId === "EX1-071"));
    const memoryBeforeEvolve = control.state.memory;

    expect(activateTakuyaMain(control)).toEqual({ ok: true });
    await settle(
      () =>
        control.perm("takuya").topCard.instanceId === control.inst("emperor").instanceId &&
        control.state.pendingDecision === undefined,
    );

    const sources = control.perm("takuya").stack.map((card) => card.instanceId);
    expect(sources).toEqual(expect.arrayContaining(trashHybrids));
    expect(sources).not.toContain(control.inst("handHybrid").instanceId);
    expect(control.state.players[0]!.trash.map((card) => card.instanceId)).toContain(
      control.inst("handHybrid").instanceId,
    );
    expect(control.state.memory).toBe(memoryBeforeEvolve);
  });
});
