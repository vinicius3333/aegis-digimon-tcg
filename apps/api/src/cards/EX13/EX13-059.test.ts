import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import { compiled } from "./EX13-059.js";

const cardId = "EX13-059";

const NAME_ONLY = "EX1-050";
const TRAIT_ONLY = "BT5-052";
const BOTH_HALVES = "BT6-063";
const OVER_COST = "BT3-071";
const TEXT_ONLY = "EX13-046";
const NON_MATCH = "BT1-012";

const SENTINEL = "BT1-009";
const NEUTRAL_LV3 = "BT1-013";
const CHEAP_TIE = "BT2-042";
const EXPENSIVE = "BT1-019";

const BLACK_LV4 = "BT2-056";
const RED_LV4 = "BT1-014";
const BLACK_LV6 = "BT2-064";

const DECK = [SENTINEL, SENTINEL, SENTINEL];

describe("EX13-059 BigMamemon", () => {
  it("matches the catalog printed text, stats and evolution cost", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "BigMamemon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Mutant"],
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      effectText:
        "[When Digivolving] [On Deletion] Reveal the top 3 cards of your deck. You may play 1 play cost 7 or lower Digimon card with [Mamemon] in its name or the [Mutant] trait among them without paying the cost. Trash the rest.\n[End of Your Turn] [Once Per Turn] By deleting 1 of your Digimon with [Mamemon] in its name, delete 1 of your opponent's Digimon with the lowest play cost.",
      inheritedEffectText:
        "[End of Your Turn] [Once Per Turn] By deleting 1 of your Digimon with [Mamemon] in its name, delete all of your opponent's Digimon with the lowest play cost.",
    });
    expect(getCardDefinition(cardId)?.securityEffectText ?? "").toBe("");
  });

  it("compiles the two reveal timings and both [End of Your Turn] deletions", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(compiled.assemblyRequirement).toBeUndefined();
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);

    const revealSlot = {
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        {
          filter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            playCostLte: 7,
            nameOrTrait: [
              { tokens: ["Mamemon"], match: "name" },
              { tokens: ["Mutant"], match: "trait", orPrevious: true },
            ],
          },
          count: 1,
          to: "play",
          optional: true,
        },
      ],
      rest: "trash",
    };
    for (const trigger of ["WhenDigivolving", "OnDeletion"] as const) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.isInherited).toBeUndefined();
      expect(effect.actions).toMatchObject([revealSlot]);
      expect((effect.actions[0] as { add: { costDelta?: number }[] }).add[0]!.costDelta).toBeUndefined();
    }

    const endOfTurn = compiled.effects.filter(({ trigger }) => trigger === "EndOfYourTurn");
    expect(endOfTurn).toHaveLength(2);
    const deleteCost = {
      kind: "deleteOwn",
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Mamemon"], match: "name" }],
        },
        count: 1,
      },
    };
    expect(endOfTurn.find(({ isInherited }) => isInherited === undefined)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" },
            count: 1,
          },
          cost: deleteCost,
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
    expect(endOfTurn.find(({ isInherited }) => isInherited === true)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" },
            count: "all",
          },
          cost: deleteCost,
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
    for (const effect of endOfTurn) {
      expect((effect.actions[0] as { allowCostWithoutTarget?: boolean }).allowCostWithoutTarget).toBeUndefined();
    }
  });

  it("free-plays the NAME-matching MetalMamemon when digivolved, and trashes the other two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLACK_LV4, as: "source" }],
          hand: [{ card: cardId, as: "big" }],
          deck: [
            { card: SENTINEL, as: "bonusDraw" },
            { card: NAME_ONLY, as: "freePlay" },
            { card: TEXT_ONLY, as: "nearMatch" },
            { card: NON_MATCH, as: "nonMatch" },
            { card: SENTINEL, as: "untouched" },
          ],
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("big").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === NAME_ONLY));
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.memory).toBe(0);
    expect(s.perm("source").topCard.cardId).toBe(cardId);
    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("source").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("big").instanceId,
      s.inst("freePlay").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("nearMatch").instanceId, s.inst("nonMatch").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
    assertNoLoudGap(s);
  });

  it("free-plays the [Mutant]-TRAIT Garbagemon on deletion although its name answers nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "big" }],
          deck: [
            { card: TEXT_ONLY, as: "nearMatch" },
            { card: TRAIT_ONLY, as: "freePlay" },
            { card: NON_MATCH, as: "nonMatch" },
            { card: SENTINEL, as: "untouched" },
          ],
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 0;
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("big").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === TRAIT_ONLY));
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("freePlay").instanceId,
    ]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("big").instanceId, s.inst("nearMatch").instanceId, s.inst("nonMatch").instanceId].sort(),
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
    assertNoLoudGap(s);
  });

  it("refuses a play cost 8 [Mamemon] card and a text-only near-match, trashing all three", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "big" }],
          deck: [
            { card: OVER_COST, as: "overCost" },
            { card: TEXT_ONLY, as: "nearMatch" },
            { card: NON_MATCH, as: "nonMatch" },
            { card: SENTINEL, as: "untouched" },
          ],
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 0;
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("big").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[0]!.trash.length >= 4);
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [
        s.inst("big").instanceId,
        s.inst("overCost").instanceId,
        s.inst("nearMatch").instanceId,
        s.inst("nonMatch").instanceId,
      ].sort(),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
    assertNoLoudGap(s);
  });

  it("trashes every revealed card when the printed 'You may' is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "big" }],
          deck: [
            { card: BOTH_HALVES, as: "declined" },
            { card: TRAIT_ONLY, as: "alsoDeclined" },
            { card: NON_MATCH, as: "nonMatch" },
            { card: SENTINEL, as: "untouched" },
          ],
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoChooseOption: true },
    );
    s.state.memory = 0;
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("big").permanentId], "byEffect");

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    const payload = JSON.parse(decision.payloadJson) as { candidateInstanceIds?: string[]; min?: number };
    expect([...(payload.candidateInstanceIds ?? [])].sort()).toEqual(
      [s.inst("declined").instanceId, s.inst("alsoDeclined").instanceId].sort(),
    );
    expect(payload.min ?? 0).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    expect(await deletion).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [
        s.inst("big").instanceId,
        s.inst("declined").instanceId,
        s.inst("alsoDeclined").instanceId,
        s.inst("nonMatch").instanceId,
      ].sort(),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
    assertNoLoudGap(s);
  });

  it("deletes the opponent's cheapest Digimon at the end of a real turn, paying with a [Mamemon] Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "big" },
            { card: BOTH_HALVES, as: "fodder" },
          ],
          hand: [{ card: NEUTRAL_LV3, as: "spare" }],
          deck: Array(10).fill(SENTINEL),
          security: [SENTINEL],
        },
        1: {
          battleArea: [
            { card: SENTINEL, as: "cheapest" },
            { card: EXPENSIVE, as: "survivor" },
          ],
          deck: Array(10).fill(SENTINEL),
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    await advance(s.engine).runTurn(0);
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("survivor").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cheapest").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("lets the controller pay with another [Mamemon] Digimon, leaving this one in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "big" },
            { card: BOTH_HALVES, as: "fodder" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
        1: {
          battleArea: [
            { card: SENTINEL, as: "cheapest" },
            { card: EXPENSIVE, as: "survivor" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    await s.ready();

    const firing = advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("big"));

    await settle(() => s.state.pendingDecision !== undefined);
    const costDecision = s.state.pendingDecision!;
    expect(costDecision.kind).toBe("chooseTargets");
    const costPayload = JSON.parse(costDecision.payloadJson) as {
      candidateInstanceIds?: string[];
      targetFate?: string;
    };
    expect(costPayload.targetFate).toBe("delete");
    expect([...(costPayload.candidateInstanceIds ?? [])].sort()).toEqual(
      [s.perm("big").permanentId, s.perm("fodder").permanentId].sort(),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: costDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("fodder").permanentId] },
      }),
    ).toEqual({ ok: true });
    await firing;
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([BOTH_HALVES]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("survivor").instanceId,
    ]);
  });

  it("may pay with itself — the clause says '1 of your Digimon', not '1 of your other Digimon'", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "big" }],
          deck: [
            { card: BOTH_HALVES, as: "chained" },
            { card: NON_MATCH, as: "nonMatch" },
            { card: NON_MATCH, as: "alsoNonMatch" },
            { card: SENTINEL, as: "untouched" },
          ],
          security: [SENTINEL],
        },
        1: {
          battleArea: [
            { card: SENTINEL, as: "cheapest" },
            { card: EXPENSIVE, as: "survivor" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("big"));
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("survivor").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("chained").instanceId,
    ]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("big").instanceId, s.inst("nonMatch").instanceId, s.inst("alsoNonMatch").instanceId].sort(),
    );
  });

  it("cannot pay with a [Mutant] Digimon or one that prints [Mamemon] only in its text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [cardId] },
            { card: TRAIT_ONLY, as: "mutantOnly" },
            { card: TEXT_ONLY, as: "textOnly" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
        1: { battleArea: [{ card: SENTINEL, as: "safe" }], deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("safe").instanceId,
    ]);
  });

  it("does not pay the cost when the opponent has no Digimon to delete", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "big" },
            { card: BOTH_HALVES, as: "fodder" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("big"));
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(
      [cardId, BOTH_HALVES].sort(),
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("fires once per turn and resets on the controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "big" },
            { card: BOTH_HALVES, as: "firstFodder" },
            { card: BOTH_HALVES, as: "secondFodder" },
          ],
          hand: [{ card: NEUTRAL_LV3, as: "spare" }],
          deck: Array(10).fill(SENTINEL),
          security: [SENTINEL],
        },
        1: {
          battleArea: [
            { card: SENTINEL, as: "firstVictim" },
            { card: CHEAP_TIE, as: "secondVictim" },
            { card: EXPENSIVE, as: "survivor" },
          ],
          hand: [{ card: NEUTRAL_LV3, as: "spareOpponent" }],
          deck: Array(10).fill(SENTINEL),
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    await s.ready();

    const answerWith = async (preferredId: string): Promise<void> => {
      await settle(() => s.state.pendingDecision !== undefined);
      const decision = s.state.pendingDecision!;
      const candidates =
        (JSON.parse(decision.payloadJson) as { candidateInstanceIds?: string[] }).candidateInstanceIds ?? [];
      expect(candidates).toContain(preferredId);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "chooseTargets", instanceIds: [preferredId] },
        }),
      ).toEqual({ ok: true });
    };

    const firstFiring = advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("big"));
    await answerWith(s.perm("firstFodder").permanentId);
    await answerWith(s.perm("firstVictim").permanentId);
    await firstFiring;
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId).sort()).toEqual(
      [s.inst("secondVictim").instanceId, s.inst("survivor").instanceId].sort(),
    );
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([BOTH_HALVES]);

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("big"));
    await settle(() => s.state.pendingDecision === undefined);
    await settle();
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(1);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;

    const secondFiring = advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("big"));
    await answerWith(s.perm("secondFodder").permanentId);
    await secondFiring;
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("survivor").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([BOTH_HALVES, BOTH_HALVES]);
  });

  it("deletes EVERY tied cheapest opponent Digimon from under a host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [{ card: cardId, as: "inherited" }] },
            { card: BOTH_HALVES, as: "fodder" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
        1: {
          battleArea: [
            { card: SENTINEL, as: "firstVictim" },
            { card: CHEAP_TIE, as: "secondVictim" },
            { card: EXPENSIVE, as: "survivor" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("inherited").instanceId]);

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("survivor").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("firstVictim").instanceId, s.inst("secondVictim").instanceId].sort(),
    );
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([s.perm("host").permanentId]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([BOTH_HALVES]);
  });

  it("does not grant the inherited deletion without EX13-059 in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [SENTINEL] },
            { card: BOTH_HALVES, as: "fodder" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
        1: {
          battleArea: [
            { card: SENTINEL, as: "firstVictim" },
            { card: CHEAP_TIE, as: "secondVictim" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("keeps the inherited clause alive through a real digivolution, preserving source identity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "big", under: [{ card: BLACK_LV4, as: "source" }] },
            { card: BOTH_HALVES, as: "fodder" },
          ],
          hand: [{ card: BLACK_LV6, as: "hiAndromon" }],
          deck: [{ card: SENTINEL, as: "bonusDraw" }, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: {
          battleArea: [
            { card: SENTINEL, as: "firstVictim" },
            { card: CHEAP_TIE, as: "secondVictim" },
            { card: EXPENSIVE, as: "survivor" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("big").permanentId,
        instanceId: s.inst("hiAndromon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("big").topCard.cardId === BLACK_LV6);
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.perm("big").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("source").instanceId,
      s.inst("big").instanceId,
    ]);

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("big"));
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("survivor").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([BOTH_HALVES]);
  });

  it("digivolves from a black Lv.4 Digimon for 3 and refuses a red Lv.4 source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLACK_LV4, as: "source" }],
          hand: [{ card: cardId, as: "big" }],
          deck: [{ card: SENTINEL, as: "bonusDraw" }, NON_MATCH, NON_MATCH, NON_MATCH],
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("big").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === cardId);
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.memory).toBe(0);
    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("source").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: RED_LV4, as: "source" }],
        hand: [{ card: cardId, as: "big" }],
        deck: DECK,
        security: [SENTINEL],
      },
      1: { deck: DECK, security: [SENTINEL] },
    });
    illegal.state.memory = 3;
    await illegal.ready();

    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("source").permanentId,
        instanceId: illegal.inst("big").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(illegal.perm("source").topCard.cardId).toBe(RED_LV4);
    expect(illegal.state.memory).toBe(3);
    expect(illegal.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      illegal.inst("big").instanceId,
    ]);
  });
});
