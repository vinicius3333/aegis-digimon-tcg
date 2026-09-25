import { EffectDuration, EffectTiming, assemblyRequirementFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { cardHasTrait } from "../../engine/cards/cardData.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../BT1/BT1-035.js";
import "../EX3/EX3-018.js";
import { compiled } from "./EX13-076.js";
import "../index.js";

const cardId = "EX13-076";

const ROYAL_LV6 = "BT3-075";
const FREE_LV6 = "BT16-013";
const PRINTED_LV6 = "ST2-10";
const ILLEGAL_LV6 = "BT2-064";

const MAT_ARMADILLO = "BT1-027";
const MAT_HAWKMON = "BT3-009";
const MAT_VEEMON = "BT3-021";
const MAT_WORMMON = "BT3-047";
const MAT_GRANKUWAGA = "BT1-083";
const MAT_ROYAL = ROYAL_LV6;
const MAT_DUPLICATE_NAME = "BT3-032";
const MAT_NON_TRAIT = "BT1-009";

const VICTIM = "BT1-013";
const FILLER_A = "BT1-010";
const FILLER_B = "BT1-011";
const FILLER_C = "BT1-014";

const DECK = [FILLER_A, FILLER_B, FILLER_C];

describe("EX13-076 Imperialdramon: Paladin Mode", () => {
  it("matches the catalog printed text, stats and evolution costs", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "Imperialdramon: Paladin Mode",
      colors: ["White", "Blue", "Green"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 16,
      dp: 16_000,
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Ancient Holy Warrior"],
      evoCosts: [
        { color: "Blue", level: 6, memoryCost: 6 },
        { color: "Green", level: 6, memoryCost: 6 },
      ],
    });
    expect(getCardDefinition(cardId)?.inheritedEffectText ?? "").toBe("");
    expect(getCardDefinition(cardId)?.securityEffectText ?? "").toBe("");
    expect(getCardDefinition(cardId)?.effectText).toContain("[Rule] Trait: Has [Free] Attribute.");
  });

  it("compiles every printed clause into the committed IR", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full" });
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.some(({ isInherited }) => isInherited)).toBe(false);
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);

    expect(
      compiled.effects.filter(({ trigger }) => trigger === "Static").flatMap(({ keywords }) => keywords ?? []),
    ).toEqual([
      { keyword: "Piercing", raw: "＜Piercing＞" },
      { keyword: "Vortex", raw: "＜Vortex＞" },
      { keyword: "Blocker", raw: "＜Blocker＞" },
      { keyword: "Evade", raw: "＜Evade＞" },
    ]);

    expect(compiled.digivolutionRequirement).toEqual([
      { level: 6, traits: ["Free", "Royal Knight"], cost: 5, isAlternate: true },
    ]);

    expect(assemblyRequirementFor(cardId)).toEqual([
      {
        reduceCost: 8,
        materials: [{ count: 6, kinds: ["Digimon"], traits: ["Free", "Royal Knight"], differentNames: true }],
      },
    ]);
    expect(compiled.assemblyRequirement![0]!.materials[0]!.levelMax).toBeUndefined();

    const body = [
      {
        kind: "Suspend",
        optional: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      },
      {
        kind: "SelectBind",
        optional: true,
        abortOnDecline: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, bindAs: "paladinBattleTarget" },
      },
      {
        kind: "GainKeyword",
        keyword: { keyword: "IceClad", raw: "＜Ice Clad＞" },
        duration: "untilEndOfBattle",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      },
      {
        kind: "ReturnTopDigivolutionCards",
        cardsPerTarget: 99,
        position: "bottom",
        target: {
          filter: { controller: "opponent", kind: ["Digimon"] },
          count: 1,
          fromSelectionRef: "paladinBattleTarget",
        },
      },
      {
        kind: "Battle",
        attacker: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        defender: {
          filter: { controller: "opponent", kind: ["Digimon"] },
          count: 1,
          fromSelectionRef: "paladinBattleTarget",
        },
      },
    ];
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"] as const) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-paladin-suspend-battle",
        actions: body,
      });
    }
    const onPlay = compiled.effects.find(({ trigger }) => trigger === "OnPlay")!;
    expect(onPlay.actions[0]).not.toHaveProperty("abortOnDecline");
    expect(onPlay.actions[4]).not.toHaveProperty("optional");

    const battleWon = compiled.effects.find(({ trigger }) => trigger === "AllTurns")!;
    expect(battleWon).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenBattleWon",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Return",
              to: "deckBottom",
              optional: true,
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
            {
              kind: "Unsuspend",
              optional: true,
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            },
          ],
        },
      ],
    });
    expect(battleWon.sharedUseKey).toBeUndefined();

    expect(compiled.effects.find(({ trigger }) => trigger === "Rule")).toMatchObject({
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Free"] }],
    });
  });

  it("carries all four printed keywords and the rule-granted [Free] trait", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: cardId, as: "paladin" }], deck: DECK },
      1: { deck: DECK, security: [FILLER_B] },
    });
    await s.ready();

    for (const keyword of ["Piercing", "Vortex", "Blocker", "Evade"]) {
      expect(observe(s.engine).hasKeyword(s.perm("paladin"), keyword)).toBe(true);
    }
    expect(getCardDefinition(cardId)?.attributes).toEqual(["Vaccine"]);
    expect(cardHasTrait(cardId, "Free")).toBe(true);
    expect(cardHasTrait(cardId, "Royal Knight")).toBe(false);
  });

  const digivolveFrom = async (base: string, memory: number) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "base", under: [FILLER_B] }],
          hand: [{ card: cardId, as: "paladin" }],
          deck: [{ card: FILLER_A, as: "drawn" }, FILLER_C, FILLER_C],
        },
        1: { deck: DECK, security: [FILLER_B] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = memory;
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("paladin").instanceId,
    });
    if (result.ok === true) await settle(() => s.perm("base").topCard.cardId === cardId);
    return s;
  };

  it("digivolves from a Lv.6 [Royal Knight] for the alternate 5, keeping the source stack and drawing 1", async () => {
    const s = await digivolveFrom(ROYAL_LV6, 6);

    expect(s.state.memory).toBe(1);
    const paladin = s.perm("base");
    expect(paladin.topCard.cardId).toBe(cardId);
    expect(paladin.stack.map(({ cardId: id }) => id)).toEqual([FILLER_B, ROYAL_LV6]);
    expect(paladin.currentDP).toBe(16_000);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    for (const keyword of ["Piercing", "Vortex", "Blocker", "Evade"]) {
      expect(observe(s.engine).hasKeyword(paladin, keyword)).toBe(true);
    }
  });

  it("accepts the [Free] half of the same route and charges the printed 6 for a Blue Lv.6 without either trait", async () => {
    const free = await digivolveFrom(FREE_LV6, 6);
    expect(free.state.memory).toBe(1);
    expect(free.perm("base").topCard.cardId).toBe(cardId);

    const printed = await digivolveFrom(PRINTED_LV6, 6);
    expect(printed.state.memory).toBe(0);
    expect(printed.perm("base").topCard.cardId).toBe(cardId);
  });

  it("refuses a Lv.6 with neither the colour nor the traits", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ILLEGAL_LV6, as: "base" }],
          hand: [{ card: cardId, as: "paladin" }],
          deck: DECK,
        },
        1: { deck: DECK, security: [FILLER_B] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("paladin").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("base").topCard.cardId).toBe(ILLEGAL_LV6);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("plays by Assembly from the trash for 8 less, stacking the six materials in printed order", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "paladin" }],
          trash: [
            { card: MAT_ARMADILLO, as: "m1" },
            { card: MAT_HAWKMON, as: "m2" },
            { card: MAT_VEEMON, as: "m3" },
            { card: MAT_WORMMON, as: "m4" },
            { card: MAT_GRANKUWAGA, as: "m5" },
            { card: MAT_ROYAL, as: "m6" },
          ],
          deck: DECK,
          security: [FILLER_B],
        },
        1: { deck: DECK, security: [FILLER_B] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("paladin").instanceId,
        assembly: {
          materialInstanceIds: ["m1", "m2", "m3", "m4", "m5", "m6"].map((alias) => s.inst(alias).instanceId),
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    await settle();

    expect(s.state.memory).toBe(2);
    const paladin = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === cardId)!;
    expect(paladin.stack.map(({ instanceId }) => instanceId)).toEqual(
      ["m6", "m5", "m4", "m3", "m2", "m1"].map((alias) => s.inst(alias).instanceId),
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("refuses a duplicate name, a card with neither printed trait, and a short material count", async () => {
    const declare = async (aliases: string[]) => {
      const s = setupEngine({
        0: {
          hand: [{ card: cardId, as: "paladin" }],
          trash: [
            { card: MAT_ARMADILLO, as: "m1" },
            { card: MAT_HAWKMON, as: "m2" },
            { card: MAT_VEEMON, as: "m3" },
            { card: MAT_WORMMON, as: "m4" },
            { card: MAT_GRANKUWAGA, as: "m5" },
            { card: MAT_ROYAL, as: "m6" },
            { card: MAT_DUPLICATE_NAME, as: "twin" },
            { card: MAT_NON_TRAIT, as: "nonTrait" },
          ],
          deck: DECK,
          security: [FILLER_B],
        },
        1: { deck: DECK, security: [FILLER_B] },
      });
      s.state.memory = 10;
      await s.ready();
      const result = s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("paladin").instanceId,
        assembly: { materialInstanceIds: aliases.map((alias) => s.inst(alias).instanceId) },
      } as never);
      return { result, memory: s.state.memory, board: s.state.players[0]!.battleArea.length };
    };

    for (const aliases of [
      ["m1", "twin", "m2", "m3", "m4", "m5"],
      ["m1", "m2", "m3", "m4", "m5", "nonTrait"],
      ["m1", "m2", "m3", "m4", "m5"],
    ]) {
      const { result, memory, board } = await declare(aliases);
      expect(result).toMatchObject({ ok: false });
      expect(memory).toBe(10);
      expect(board).toBe(0);
    }
  });

  it("Q7457/Q7466 immediately battles the chosen Digimon after returning its whole stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "paladin", under: [FILLER_B] }], deck: DECK, security: [FILLER_B] },
        1: {
          battleArea: [{ card: VICTIM, as: "victim", under: [FILLER_A, FILLER_C] }],
          deck: [{ card: FILLER_B, as: "deckFloor" }],
          security: [FILLER_B],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const victimTopId = s.perm("victim").topCard.instanceId;
    const stackIds = s.perm("victim").stack.map(({ instanceId }) => instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("paladin"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("deckFloor").instanceId,
      ...[...stackIds].reverse(),
    ]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([victimTopId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("paladin").stack).toHaveLength(1);
    expect(
      s.decisions.filter(({ req }) => req.sourceCardId === cardId).map(({ req }) => req.options?.effectTextPart),
    ).toEqual(
      expect.arrayContaining([
        "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may suspend 1 of your opponent's Digimon.",
        "Then, you may return all digivolution cards of 1 of their Digimon to the bottom of the deck and have this Digimon battle it. Compare the number of digivolution cards instead of DP in this battle.",
      ]),
    );
    assertNoLoudGap(s);
  });

  it("Q7458 can choose and battle a Digimon unaffected by this Digimon's effects", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "paladin" }], deck: DECK, security: [FILLER_B] },
        1: { battleArea: [{ card: VICTIM, as: "immune" }], deck: DECK, security: [FILLER_B] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.restrict(s.perm("immune").permanentId, "beAffected", EffectDuration.Permanent);
    expect(observe(s.engine).isRestricted(s.perm("immune"), "beAffected")).toBe(true);

    const firing = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("paladin"));
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(
      s.engine.applyIntent(0, {
        type: "respondEvade",
        permanentId: s.perm("paladin").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await firing;
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("paladin").isSuspended).toBe(true);
    expect(s.state.players[1]!.trash.map(({ cardId: id }) => id)).toContain(VICTIM);
  });

  it("Q7467 may suspend one Digimon but return sources from and battle a different Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "paladin", under: [FILLER_B] }], deck: DECK, security: [FILLER_B] },
        1: {
          battleArea: [
            { card: FILLER_C, as: "suspendedOnly" },
            { card: VICTIM, as: "battleTarget", under: [FILLER_A, FILLER_C] },
          ],
          deck: DECK,
          security: [FILLER_B],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    await s.ready();
    const firing = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("paladin"));

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    let decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("suspendedOnly").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("suspendedOnly").isSuspended);
    expect(s.perm("suspendedOnly").isSuspended).toBe(true);
    const suspendedOnlyId = s.inst("suspendedOnly").instanceId;
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("battleTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await firing;
    await settle();

    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === VICTIM)).toBe(false);
    expect(s.state.players[1]!.deck.some(({ instanceId }) => instanceId === suspendedOnlyId)).toBe(true);
    expect(s.state.players[1]!.deck).toHaveLength(DECK.length + 3);
  });

  it("compares digivolution cards, not DP: a stackless Paladin Mode TIES a 5000 DP victim", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "paladin" }], deck: DECK, security: [FILLER_B] },
        1: {
          battleArea: [{ card: VICTIM, as: "victim" }],
          deck: [{ card: FILLER_B, as: "deckFloor" }],
          security: [FILLER_B],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.perm("paladin").currentDP).toBe(16_000);
    expect(s.perm("victim").currentDP).toBe(5000);

    const paladinId = s.perm("paladin").permanentId;
    const firing = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("paladin"));
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));

    expect(s.events.filter(({ kind }) => kind === "evadePrompt")).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId: paladinId, accept: false })).toEqual({
      ok: true,
    });
    await firing;
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([cardId]);
    assertNoLoudGap(s);
  });

  it("does nothing when the printed 'may' is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "paladin", under: [FILLER_B] }], deck: DECK, security: [FILLER_B] },
        1: {
          battleArea: [{ card: VICTIM, as: "victim", under: [FILLER_A, FILLER_C] }],
          deck: DECK,
          security: [FILLER_B],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("paladin"));
    await settle();

    expect(s.perm("victim").isSuspended).toBe(false);
    expect(s.perm("victim").stack).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(3);
  });

  it("shares one [Once Per Turn] across all three timings and resets on the next own turn", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "paladin" }],
          hand: [{ card: FILLER_A, as: "spare" }],
          deck: DECK,
          security: [FILLER_B],
        },
        1: {
          battleArea: [
            { card: VICTIM, as: "first" },
            { card: FILLER_C, as: "second", under: [FILLER_A, FILLER_B] },
          ],
          hand: [{ card: FILLER_B, as: "spareOpponent" }],
          deck: DECK,
          security: [FILLER_B],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    await s.ready();
    prefer.push(s.perm("first").topCard.instanceId);
    const paladinId = s.perm("paladin").permanentId;
    const secondId = s.perm("second").permanentId;

    const firing = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("paladin"));
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId: paladinId, accept: true })).toEqual({
      ok: true,
    });
    await firing;
    await settle();

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([secondId]);
    expect(s.perm("second").stack).toHaveLength(2);
    expect(s.perm("second").isSuspended).toBe(false);
    expect(s.perm("paladin").isSuspended).toBe(true);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("paladin"));
    await settle();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("paladin"));
    await settle();
    expect(s.perm("second").stack).toHaveLength(2);
    expect(s.perm("second").isSuspended).toBe(false);
    expect(s.events.filter(({ kind }) => kind === "evadePrompt")).toHaveLength(1);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("paladin"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.events.filter(({ kind }) => kind === "evadePrompt")).toHaveLength(1);
  });

  it("returns an opponent Digimon to the deck bottom and unsuspends itself after a won battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "paladin", under: [FILLER_B], suspended: true }],
          deck: DECK,
          security: [FILLER_B],
        },
        1: {
          battleArea: [{ card: VICTIM, as: "target", under: [FILLER_A] }],
          deck: [{ card: FILLER_B, as: "deckFloor" }],
          security: [FILLER_B],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetTopId = s.perm("target").topCard.instanceId;
    const targetStackId = s.perm("target").stack[0]!.instanceId;

    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("paladin").permanentId });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("deckFloor").instanceId,
      targetTopId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([targetStackId]);
    expect(s.perm("paladin").isSuspended).toBe(false);
  });

  it("Q7461: a public attack that wins its immediate battle triggers the return and unsuspends Paladin Mode", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "paladin", under: [FILLER_B] }],
          hand: [{ card: FILLER_A, as: "spare" }],
          deck: DECK,
          security: [FILLER_B],
        },
        1: {
          battleArea: [
            { card: VICTIM, as: "battleTarget", under: [FILLER_A, FILLER_C], suspended: true },
            { card: FILLER_C, as: "returnTarget" },
          ],
          deck: DECK,
          security: [FILLER_B],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 8;
    await s.ready();
    const battleTargetId = s.inst("battleTarget").instanceId;
    const returnTargetId = s.inst("returnTarget").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paladin").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.some(({ instanceId }) => instanceId === returnTargetId));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).not.toContain(battleTargetId);
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toContain(returnTargetId);
    expect(s.perm("paladin").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("Q7462: a public security battle won by Paladin Mode raises its printed battle-won effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "paladin" }],
          hand: [{ card: FILLER_A, as: "spare" }],
          deck: DECK,
          security: [FILLER_B],
        },
        1: {
          battleArea: [{ card: FILLER_C, as: "returnTarget" }],
          deck: DECK,
          security: [{ card: VICTIM, as: "securityDigimon" }, FILLER_B],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 8;
    await s.ready();
    const securityDigimonId = s.inst("securityDigimon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paladin").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined || s.events.length > 0);
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(securityDigimonId);
    expect(
      s.events.some(
        (event) =>
          event.kind === "effectTriggered" && event.sourceCardId === cardId && event.timing === "whenBattleWon",
      ),
    ).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("Q7463: turn player's battle-won trigger activates before opponent's pending On Deletion trigger", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ROYAL_LV6, as: "base", under: [FILLER_B] }],
          hand: [{ card: cardId, as: "paladin" }],
          deck: DECK,
          security: [FILLER_B],
        },
        1: {
          battleArea: [
            { card: "BT1-035", as: "leomon" },
            { card: FILLER_C, as: "returnTarget" },
          ],
          deck: DECK,
          security: [FILLER_B],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("paladin").instanceId,
      }),
    ).toEqual({ ok: true });
    const leomonId = s.inst("leomon").instanceId;
    const returnTargetId = s.inst("returnTarget").instanceId;

    await settle(() => s.state.players[1]!.deck.some(({ instanceId }) => instanceId === returnTargetId));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toContain(returnTargetId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(leomonId);
    expect(s.state.players[1]!.trash.map(({ cardId: id }) => id)).toContain("BT1-035");
    const winTriggerIndex = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === cardId && event.timing === "whenBattleWon",
    );
    const deletionIndex = s.events.findIndex(
      (event) =>
        event.kind === "effectResolved" && event.sourceCardId === "BT1-035" && event.timing === "OnDestroyedAnyone",
    );
    // Q7463: these triggers arise in the same public When Digivolving Battle. The turn
    // player's whenBattleWon trigger activates before the opponent's OnDestroyedAnyone trigger.
    expect(winTriggerIndex).toBeGreaterThanOrEqual(0);
    expect(deletionIndex).toBeGreaterThan(winTriggerIndex);
    assertNoLoudGap(s);
  });

  it("Q7464/Q7465: a loser's own Evade resolves before and prevents deletion without suppressing the battle-won trigger", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "paladin", under: [FILLER_B] }],
          hand: [{ card: FILLER_A, as: "spare" }],
          deck: DECK,
          security: [FILLER_B],
        },
        1: {
          battleArea: [
            { card: FILLER_C, as: "suspendTarget" },
            { card: "EX3-018", as: "coredramon", under: [FILLER_C] },
          ],
          deck: DECK,
          security: [FILLER_B],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false, autoChooseOption: true },
    );
    s.state.memory = 8;
    await s.ready();
    const targetId = s.perm("coredramon").permanentId;
    const topId = s.inst("coredramon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paladin").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    let decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("suspendTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [targetId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    const evadeIndex = s.events.findIndex(({ kind }) => kind === "evadePrompt");
    expect(s.engine.applyIntent(1, { type: "respondEvade", permanentId: targetId, accept: true })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const returnDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: returnDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("suspendTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    const winTriggerIndex = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === cardId && event.timing === "whenBattleWon",
    );
    expect(winTriggerIndex).toBeGreaterThan(evadeIndex);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(topId);
    expect(s.perm("coredramon").isSuspended).toBe(true);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).not.toContain(topId);
    expect(winTriggerIndex).toBeGreaterThanOrEqual(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("Q7459: two public battles during one attack produce only one Piercing security check", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "paladin", under: [FILLER_B] }],
          hand: [{ card: FILLER_A, as: "spare" }],
          deck: DECK,
          security: [FILLER_B],
        },
        1: {
          battleArea: [
            { card: VICTIM, dp: 5000, suspended: true, as: "effectDefender" },
            { card: FILLER_C, as: "returnTarget" },
            { card: VICTIM, dp: 5000, suspended: true, as: "attackDefender" },
          ],
          deck: DECK,
          security: [FILLER_B, FILLER_C],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 8;
    await s.ready();
    preferred.push(s.inst("effectDefender").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paladin").permanentId,
        target: { kind: "permanent", permanentId: s.perm("attackDefender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.filter(({ cardId: id }) => id === VICTIM)).toHaveLength(2);
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("returnTarget").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("Q7460: a battle target's Barrier preserves Piercing after the immediate battle deleted another Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "paladin", under: [FILLER_B] }],
          hand: [{ card: FILLER_A, as: "spare" }],
          deck: DECK,
          security: [FILLER_B],
        },
        1: {
          battleArea: [
            { card: VICTIM, dp: 5000, suspended: true, as: "effectDefender" },
            { card: FILLER_C, as: "returnTarget" },
            { card: "EX13-033", suspended: true, as: "barrierDefender" },
          ],
          deck: DECK,
          security: [
            { card: FILLER_A, as: "barrierCost" },
            { card: FILLER_B, as: "piercingCheck" },
            { card: FILLER_C, as: "bottomSecurity" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 8;
    await s.ready();
    preferred.push(s.inst("effectDefender").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paladin").permanentId,
        target: { kind: "permanent", permanentId: s.perm("barrierDefender").permanentId },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenBarrierDecision: boolean } }).combat;
    await settle(() => combat.hasOpenBarrierDecision);
    expect(
      s.engine.applyIntent(1, {
        type: "respondBarrier",
        permanentId: s.perm("barrierDefender").permanentId,
        accept: true,
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("barrierDefender").permanentId,
    ]);
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("returnTarget").instanceId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("barrierCost").instanceId);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("bottomSecurity").instanceId,
    ]);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("fires the won-battle clause once per turn and resets on the next own turn", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "paladin", under: [FILLER_B], suspended: true }],
          hand: [{ card: FILLER_A, as: "spare" }],
          deck: DECK,
          security: [FILLER_B],
        },
        1: {
          battleArea: [
            { card: VICTIM, as: "first" },
            { card: FILLER_C, as: "second" },
          ],
          hand: [{ card: FILLER_B, as: "spareOpponent" }],
          deck: DECK,
          security: [FILLER_B],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    await s.ready();
    prefer.push(s.perm("first").topCard.instanceId);

    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("paladin").permanentId });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();
    expect(s.perm("paladin").isSuspended).toBe(false);

    s.perm("paladin").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("paladin").permanentId });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("paladin").isSuspended).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    s.perm("paladin").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("paladin").permanentId });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("paladin").isSuspended).toBe(false);
  });

  it("does not fire the won-battle clause for another Digimon's win", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "paladin", under: [FILLER_B], suspended: true },
            { card: FILLER_C, as: "other" },
          ],
          deck: DECK,
          security: [FILLER_B],
        },
        1: { battleArea: [{ card: VICTIM, as: "target" }], deck: DECK, security: [FILLER_B] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("other").permanentId });
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("paladin").isSuspended).toBe(true);
  });

  it("drops the count-comparison grant once the battle it was printed for is over", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "paladin", under: [FILLER_B] }], deck: DECK, security: [FILLER_B] },
        1: {
          battleArea: [{ card: VICTIM, as: "victim", under: [FILLER_A] }],
          deck: DECK,
          security: [FILLER_B],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("paladin"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    expect(observe(s.engine).hasKeyword(s.perm("paladin"), "IceClad")).toBe(false);
  });
  it("ends the source-count grant after public evolution before the next security battle", async () => {
    const stronger = "BT12-112";
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ROYAL_LV6, as: "base" }],
          hand: [{ card: cardId, as: "paladin" }, FILLER_A],
          deck: [FILLER_A, FILLER_C],
          security: [FILLER_C],
        },
        1: {
          battleArea: [{ card: stronger, as: "victim", under: [{ card: FILLER_C, as: "returnedSource" }] }],
          deck: [{ card: FILLER_A, as: "deckTop" }],
          security: [{ card: stronger, as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const paladinId = s.inst("paladin").instanceId;
    const victimId = s.inst("victim").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: paladinId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === victimId) && s.state.pendingDecision === undefined,
    );
    const paladin = s.perm("paladin");
    expect(paladin.currentDP).toBe(16000);
    expect(paladin.stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("deckTop").instanceId,
      s.inst("returnedSource").instanceId,
    ]);
    expect(observe(s.engine).hasKeyword(paladin, "IceClad")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: paladin.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual([baseId, paladinId].sort());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [victimId, s.inst("security").instanceId].sort(),
    );
    expect(s.state.memory).toBe(5);
    assertNoLoudGap(s);
  });
});
