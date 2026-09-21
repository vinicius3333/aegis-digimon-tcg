import { assemblyRequirementFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import { compiled } from "./EX13-063.js";

const cardId = "EX13-063";

const NAME_ONLY = "EX1-050";
const TRAIT_ONLY = "BT5-052";
const OVER_COST = "BT13-074";
const TEXT_ONLY = "EX13-046";
const NON_MATCH = "BT1-012";

const MAT_BIG = "BT6-063";
const MAT_CATCH = "BT8-065";
const MAT_TEXT = TEXT_ONLY;
const MAT_OVER_LEVEL = "BT8-068";

const SENTINEL = "BT1-009";
const NEUTRAL_LV3 = "BT1-013";
const HIGHEST = "BT1-024";
const TIED_HIGHEST = "BT1-042";

const BLACK_LV5 = "BT2-060";
const RED_LV5 = "BT1-020";

const DECK = [SENTINEL, SENTINEL, SENTINEL];

async function publicGaia({ withPayer, accept }: { withPayer: boolean; accept: boolean }) {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: cardId, as: "prince" }, ...(withPayer ? [{ card: MAT_BIG, as: "payer" }] : [])],
        deck: [
          { card: NON_MATCH, as: "one" },
          { card: NON_MATCH, as: "two" },
          { card: NON_MATCH, as: "three" },
        ],
        security: [SENTINEL],
      },
      1: {
        battleArea: [{ card: SENTINEL, as: "redSource" }],
        hand: [{ card: "ST1-16", as: "gaia" }],
        deck: [SENTINEL, SENTINEL],
        security: [SENTINEL],
      },
    },
    {
      autoAcceptOptional: accept,
      autoDeclineOptional: !accept,
      autoSelectCards: true,
      autoChooseOption: true,
      autoOrderTriggers: true,
      preferInstanceIds: preferred,
    },
  );
  s.state.turnSeat = 1;
  s.state.memory = 10;
  await s.ready();
  preferred.push(s.inst("prince").instanceId);
  const gaiaId = s.inst("gaia").instanceId;
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: gaiaId })).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === gaiaId));
  expect(s.state.memory).toBe(2);
  expect(s.state.pendingDecision).toBeUndefined();
  assertNoLoudGap(s);
  return s;
}

describe("EX13-063 PrinceMamemon", () => {
  it("matches the catalog printed text, stats and evolution cost", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "PrinceMamemon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 12000,
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Mutant"],
      evoCosts: [{ color: "Black", level: 5, memoryCost: 3 }],
      effectText:
        "[Assembly -4] 3 Lv.5 or lower [Mamemon] text cards w/different names\n\n[On Play] [When Digivolving] [On Deletion] Reveal the top 3 cards of your deck. You may play 1 play cost 10 or lower Digimon card with [Mamemon] in its name or the [Mutant] trait among them without paying the cost. Trash the rest.\n[On Deletion] Delete 1 of your opponent's highest play cost Digimon.\n[All Turns] All of your Digimon with [Mamemon] in their names gain ＜Blocker＞ and ＜Guard＞ ",
    });
    expect(getCardDefinition(cardId)?.inheritedEffectText ?? "").toBe("");
    expect(getCardDefinition(cardId)?.securityEffectText ?? "").toBe("");
  });

  it("compiles the Assembly recipe, three reveal timings, the deletion and both keyword grants", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);
    expect(compiled.effects.some(({ isInherited }) => isInherited)).toBe(false);

    expect(assemblyRequirementFor(cardId)).toEqual([
      {
        reduceCost: 4,
        materials: [
          {
            count: 3,
            levelMax: 5,
            nameOrTrait: [{ tokens: ["Mamemon"], match: "text" }],
            differentNames: true,
          },
        ],
      },
    ]);
    expect(compiled.assemblyRequirement![0]!.materials[0]!.kinds).toBeUndefined();

    const revealAction = {
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        {
          filter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            playCostLte: 10,
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
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.frequency).toBeUndefined();
      expect(effect.actions).toMatchObject([revealAction]);
      expect((effect.actions[0] as { add: { costDelta?: number }[] }).add[0]!.costDelta).toBeUndefined();
    }

    const onDeletion = compiled.effects.filter(({ trigger }) => trigger === "OnDeletion");
    expect(onDeletion).toHaveLength(2);
    expect(onDeletion[0]!.actions).toMatchObject([revealAction]);
    expect(onDeletion[1]!.actions).toMatchObject([
      {
        kind: "Delete",
        target: {
          filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestPlayCost" },
          count: 1,
        },
      },
    ]);
    const deletion = onDeletion[1]!.actions[0] as { optional?: boolean; cost?: unknown };
    expect(deletion.optional).toBeUndefined();
    expect(deletion.cost).toBeUndefined();

    const mamemonNamed = {
      controller: "mine",
      kind: ["Digimon"],
      nameOrTrait: [{ tokens: ["Mamemon"], match: "name" }],
    };
    const grants = compiled.effects.find(
      (effect) => effect.trigger === "AllTurns" && effect.actions[0]?.kind === "Aura",
    )!;
    expect(grants.actions).toMatchObject([
      {
        kind: "Aura",
        target: { filter: mamemonNamed, count: "all" },
        effect: { kind: "keyword", keyword: { keyword: "Blocker" } },
      },
      {
        kind: "Aura",
        target: { filter: mamemonNamed, count: "all" },
        effect: { kind: "keyword", keyword: { keyword: "Guard" } },
      },
    ]);
    for (const action of grants.actions) {
      expect((action as { while?: unknown; includeLaterEntrants?: unknown }).while).toBeUndefined();
      expect((action as { includeLaterEntrants?: unknown }).includeLaterEntrants).toBeUndefined();
    }

    expect(compiled.effects.some((effect) => effect.actions.some((action) => action.kind === "Replacement"))).toBe(
      false,
    );
  });

  it("Q7414: Assembly accepts a material whose Mamemon reference is only in effect text", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "prince" }],
          trash: [
            { card: MAT_BIG, as: "matBig" },
            { card: MAT_CATCH, as: "matCatch" },
            { card: MAT_TEXT, as: "matText" },
          ],
          deck: [
            { card: NAME_ONLY, as: "freePlay" },
            { card: NON_MATCH, as: "nonMatch" },
            { card: TEXT_ONLY, as: "nearMatch" },
            { card: SENTINEL, as: "untouched" },
          ],
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("prince").instanceId,
        assembly: {
          materialInstanceIds: [
            s.inst("matBig").instanceId,
            s.inst("matCatch").instanceId,
            s.inst("matText").instanceId,
          ],
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === NAME_ONLY));
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.memory).toBe(3);
    const prince = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === cardId)!;
    expect(prince.stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("matText").instanceId,
      s.inst("matCatch").instanceId,
      s.inst("matBig").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId).sort()).toEqual(
      [s.inst("prince").instanceId, s.inst("freePlay").instanceId].sort(),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("nonMatch").instanceId, s.inst("nearMatch").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
    assertNoLoudGap(s);
  });

  it("refuses duplicate names, a Lv.6 [Mamemon], a non-[Mamemon] card and a short count", async () => {
    const declare = async (
      materials: string[],
    ): Promise<{ result: unknown; memory: number; hand: string[]; battleArea: number; prince: string }> => {
      const s = setupEngine({
        0: {
          hand: [{ card: cardId, as: "prince" }],
          trash: [
            { card: MAT_BIG, as: "matBig" },
            { card: MAT_BIG, as: "matBigTwin" },
            { card: MAT_CATCH, as: "matCatch" },
            { card: MAT_TEXT, as: "matText" },
            { card: MAT_OVER_LEVEL, as: "matOverLevel" },
            { card: SENTINEL, as: "matNonMatch" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      });
      s.state.memory = 10;
      await s.ready();
      const result = s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("prince").instanceId,
        assembly: { materialInstanceIds: materials.map((alias) => s.inst(alias).instanceId) },
      } as never);
      return {
        result,
        memory: s.state.memory,
        hand: s.state.players[0]!.hand.map(({ instanceId }) => instanceId),
        battleArea: s.state.players[0]!.battleArea.length,
        prince: s.inst("prince").instanceId,
      };
    };

    const refusals = [
      ["matBig", "matBigTwin", "matText"],
      ["matBig", "matCatch", "matOverLevel"],
      ["matBig", "matCatch", "matNonMatch"],
      ["matBig", "matCatch"],
    ];
    for (const materials of refusals) {
      const attempt = await declare(materials);
      expect(attempt.result).toEqual({ ok: false, reason: "invalid-material" });
      expect(attempt.memory).toBe(10);
      expect(attempt.hand).toEqual([attempt.prince]);
      expect(attempt.battleArea).toBe(0);
    }

    expect((await declare(["matBig", "matCatch", "matText"])).result).toEqual({ ok: true });
  });

  it("free-plays the NAME-matching MetalMamemon when digivolved, and trashes the other two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLACK_LV5, as: "source" }],
          hand: [{ card: cardId, as: "prince" }],
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
        instanceId: s.inst("prince").instanceId,
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
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId).sort()).toEqual(
      [s.inst("prince").instanceId, s.inst("freePlay").instanceId].sort(),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("nearMatch").instanceId, s.inst("nonMatch").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
    assertNoLoudGap(s);
  });

  it("Q7415: applies the Digimon and cost-10 limits to the Mutant alternative too", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLACK_LV5, as: "source" }],
          hand: [{ card: cardId, as: "prince" }],
          deck: [
            { card: SENTINEL, as: "bonusDraw" },
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
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("prince").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === TRAIT_ONLY));
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId).sort()).toEqual(
      [s.inst("prince").instanceId, s.inst("freePlay").instanceId].sort(),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("nearMatch").instanceId, s.inst("nonMatch").instanceId].sort(),
    );
    assertNoLoudGap(s);
  });

  it("Q7415: refuses cost 11 on the Mamemon alternative and text-only on the name alternative", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLACK_LV5, as: "source" }],
          hand: [{ card: cardId, as: "prince" }],
          deck: [
            { card: SENTINEL, as: "bonusDraw" },
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
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("prince").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length >= 3);
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("prince").instanceId,
    ]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("overCost").instanceId, s.inst("nearMatch").instanceId, s.inst("nonMatch").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
    assertNoLoudGap(s);
  });

  it("Q7416: keeps revealed cards out of trash until the play choice finishes", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLACK_LV5, as: "source" }],
          hand: [{ card: cardId, as: "prince" }],
          deck: [
            { card: SENTINEL, as: "bonusDraw" },
            { card: NAME_ONLY, as: "declined" },
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
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("prince").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    const payload = JSON.parse(decision.payloadJson) as { candidateInstanceIds?: string[]; min?: number };
    expect([...(payload.candidateInstanceIds ?? [])].sort()).toEqual(
      [s.inst("declined").instanceId, s.inst("alsoDeclined").instanceId].sort(),
    );
    expect(payload.min ?? 0).toBe(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("declined").instanceId,
        s.inst("alsoDeclined").instanceId,
        s.inst("nonMatch").instanceId,
      ]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("prince").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("declined").instanceId, s.inst("alsoDeclined").instanceId, s.inst("nonMatch").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
    assertNoLoudGap(s);
  });

  it("on deletion reveals, free-plays, and deletes the opponent's most expensive Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "prince" }],
          deck: [
            { card: TRAIT_ONLY, as: "freePlay" },
            { card: NON_MATCH, as: "nonMatch" },
            { card: TEXT_ONLY, as: "nearMatch" },
            { card: SENTINEL, as: "untouched" },
          ],
          security: [SENTINEL],
        },
        1: {
          battleArea: [
            { card: HIGHEST, as: "victim" },
            { card: NEUTRAL_LV3, as: "survivor" },
            { card: SENTINEL, as: "alsoSurvivor" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.memory = 0;
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("prince").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[1]!.trash.length === 1);
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId).sort()).toEqual(
      [s.inst("survivor").instanceId, s.inst("alsoSurvivor").instanceId].sort(),
    );
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("victim").instanceId]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("freePlay").instanceId,
    ]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("prince").instanceId, s.inst("nonMatch").instanceId, s.inst("nearMatch").instanceId].sort(),
    );
    assertNoLoudGap(s);
  });

  it("Q7417: lets the player order both simultaneous On Deletion effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "prince" }],
          deck: [NON_MATCH, NON_MATCH, NON_MATCH, SENTINEL],
          security: [SENTINEL],
        },
        1: { battleArea: [{ card: HIGHEST, as: "victim" }], deck: DECK, security: [SENTINEL] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: false },
    );
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("prince").permanentId], "byEffect");
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const order = s.decisions.findLast(({ req }) => req.kind === "orderTriggers")!.req;
    expect(order.options?.triggerCardIds).toEqual([cardId, cardId]);
    expect(order.options?.triggerKeys).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderTriggers", order: [order.options!.triggerKeys!.at(-1)!] },
      }),
    ).toEqual({ ok: true });
    await deletion;
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(4);
  });

  it("takes exactly one of two tied most-expensive Digimon and nothing when the board is empty", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "prince" }],
          deck: [
            { card: NON_MATCH, as: "one" },
            { card: NON_MATCH, as: "two" },
            { card: NON_MATCH, as: "three" },
            { card: SENTINEL, as: "untouched" },
          ],
          security: [SENTINEL],
        },
        1: {
          battleArea: [
            { card: HIGHEST, as: "tieA" },
            { card: TIED_HIGHEST, as: "tieB" },
            { card: SENTINEL, as: "cheap" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.memory = 0;
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("prince").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[1]!.trash.length === 1);
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    const remaining = s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId);
    expect(remaining).toHaveLength(2);
    expect(remaining).toContain(s.inst("cheap").instanceId);
    const killed = s.state.players[1]!.trash.map(({ instanceId }) => instanceId);
    expect(killed).toHaveLength(1);
    expect([s.inst("tieA").instanceId, s.inst("tieB").instanceId]).toContain(killed[0]);

    const empty = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "prince" }],
          deck: [
            { card: NON_MATCH, as: "one" },
            { card: NON_MATCH, as: "two" },
            { card: NON_MATCH, as: "three" },
          ],
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    empty.state.memory = 0;
    await empty.ready();

    advance(empty.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(empty.engine).verb.deletePermanent([empty.perm("prince").permanentId], "byEffect")).toBe(1);
    advance(empty.engine).verb.leaveEffectResolution();
    await settle(() => empty.state.players[0]!.trash.length === 4);
    await settle(() => empty.state.pendingDecision === undefined);
    await settle();

    expect(empty.state.players[1]!.battleArea).toHaveLength(0);
    expect(empty.state.players[1]!.trash).toHaveLength(0);
    assertNoLoudGap(empty);
  });

  it("grants both keywords to every [Mamemon]-named Digimon of the controller's, and to nobody else", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "prince" },
          { card: MAT_BIG, as: "granted" },
          { card: TEXT_ONLY, as: "textOnly" },
          { card: NEUTRAL_LV3, as: "plain" },
        ],
        deck: DECK,
        security: [SENTINEL],
      },
      1: { battleArea: [{ card: MAT_BIG, as: "opponentNamed" }], deck: DECK, security: [SENTINEL] },
    });
    await s.ready();

    for (const keyword of ["Blocker", "Guard"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm("prince"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("granted"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("textOnly"), keyword)).toBe(false);
      expect(observe(s.engine).hasKeyword(s.perm("plain"), keyword)).toBe(false);
      expect(observe(s.engine).hasKeyword(s.perm("opponentNamed"), keyword)).toBe(false);
    }
  });

  it("stops granting once this card leaves the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "prince" },
            { card: MAT_BIG, as: "granted" },
          ],
          deck: [
            { card: NON_MATCH, as: "one" },
            { card: NON_MATCH, as: "two" },
            { card: NON_MATCH, as: "three" },
          ],
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("granted"), "Blocker")).toBe(true);

    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("prince").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(observe(s.engine).hasKeyword(s.perm("granted"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("granted"), "Guard")).toBe(false);
  });

  it("＜Blocker＞ makes a textless [Mamemon] Digimon a legal blocker, unlike a non-[Mamemon] one", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: NEUTRAL_LV3, as: "attacker" }], deck: DECK, security: [SENTINEL] },
        1: {
          battleArea: [
            { card: cardId, as: "prince" },
            { card: MAT_BIG, as: "granted" },
            { card: NEUTRAL_LV3, as: "plain" },
          ],
          hand: [{ card: NON_MATCH, as: "spareOpponent" }],
          deck: DECK,
          security: [SENTINEL, SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const grantedId = s.perm("granted").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Blocker")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    const window = s.events.find(({ kind }) => kind === "blockWindowOpened") as {
      eligibleBlockerIds?: string[];
      mustBlock?: boolean;
    };
    expect([...(window.eligibleBlockerIds ?? [])].sort()).toEqual([grantedId, s.perm("prince").permanentId].sort());
    expect(window.mustBlock).not.toBe(true);

    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: grantedId })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(grantedId);
  });

  it("＜Guard＞ saves every Digimon in one opponent-effect leave event for a single payment", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "prince" },
            { card: MAT_BIG, as: "payer" },
            { card: NEUTRAL_LV3, as: "allyA" },
            { card: SENTINEL, as: "allyB" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: false, autoChooseOption: true, autoOrderTriggers: false },
    );
    await s.ready();
    const allyA = s.perm("allyA").permanentId;
    const allyB = s.perm("allyB").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    const deletion = advance(s.engine).verb.deletePermanent([allyA, allyB], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const order = s.state.pendingDecision!;
    const payload = JSON.parse(order.payloadJson ?? "{}") as { triggerKeys?: string[] };
    const payerKey = payload.triggerKeys?.find((key) => key.endsWith(`/${MAT_BIG}`));
    expect(payerKey).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderTriggers", order: [payerKey!] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const payerDecision = s.state.pendingDecision!;
    const payerRequest = s.decisions.find(({ req }) => req.decisionId === payerDecision.decisionId)!.req;
    expect(payerRequest.sourceCardId).toBe(MAT_BIG);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: payerDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const princeDecision = s.state.pendingDecision!;
    const princeRequest = s.decisions.find(({ req }) => req.decisionId === princeDecision.decisionId)!.req;
    expect(princeRequest.sourceCardId).toBe(cardId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: princeDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    expect(await deletion).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId).sort()).toEqual(
      [allyA, allyB, s.perm("prince").permanentId].sort(),
    );
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([MAT_BIG]);
  });

  it("＜Guard＞ is not offered against the controller's own effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "prince" },
            { card: MAT_BIG, as: "payer" },
            { card: NEUTRAL_LV3, as: "ally" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("ally").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(
      [cardId, MAT_BIG].sort(),
    );
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([NEUTRAL_LV3]);
  });

  it("cannot pay ＜Guard＞ with a non-[Mamemon] Digimon, so the target leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [{ card: cardId, as: "buried" }] },
            { card: SENTINEL, as: "ally" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Guard")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Guard")).toBe(false);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("ally").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([s.perm("host").permanentId]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([SENTINEL]);
  });

  it("＜Guard＞ does not save PrinceMamemon itself — §16-45-1 protects a holder's OTHER Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "prince" }],
          deck: [
            { card: NON_MATCH, as: "one" },
            { card: NON_MATCH, as: "two" },
            { card: NON_MATCH, as: "three" },
          ],
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("prince").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("prince").instanceId);
  });

  it("lets another Guard holder save PrinceMamemon from public Gaia Force", async () => {
    const s = await publicGaia({ withPayer: true, accept: true });
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("prince").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("payer").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("one").instanceId,
      s.inst("two").instanceId,
      s.inst("three").instanceId,
    ]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("redSource").instanceId,
    ]);
  });

  it.each([false, true])(
    "does not self-save or force a declined Guard payment, with another holder: %s",
    async (withPayer) => {
      const s = await publicGaia({ withPayer, accept: !withPayer });
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual(
        withPayer ? [s.inst("payer").instanceId] : [],
      );
      expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
        [
          s.inst("prince").instanceId,
          s.inst("one").instanceId,
          s.inst("two").instanceId,
          s.inst("three").instanceId,
        ].sort(),
      );
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.players[1]!.trash.map((card) => card.instanceId).sort()).toEqual(
        [s.inst("gaia").instanceId, s.inst("redSource").instanceId].sort(),
      );
    },
  );

  it("lets another granted ＜Guard＞ holder pay to save PrinceMamemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "prince" },
            { card: MAT_BIG, as: "payer" },
          ],
          deck: [
            { card: NON_MATCH, as: "one" },
            { card: NON_MATCH, as: "two" },
            { card: NON_MATCH, as: "three" },
          ],
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("prince").permanentId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([MAT_BIG]);
  });

  it("digivolves from a black Lv.5 Digimon for 3 and refuses a red Lv.5 source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLACK_LV5, as: "source" }],
          hand: [{ card: cardId, as: "prince" }],
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
        instanceId: s.inst("prince").instanceId,
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
        battleArea: [{ card: RED_LV5, as: "source" }],
        hand: [{ card: cardId, as: "prince" }],
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
        instanceId: illegal.inst("prince").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(illegal.perm("source").topCard.cardId).toBe(RED_LV5);
    expect(illegal.state.memory).toBe(3);
    expect(illegal.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      illegal.inst("prince").instanceId,
    ]);
  });
});
