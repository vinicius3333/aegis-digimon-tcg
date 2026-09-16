import { assemblyRequirementFor, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import { compiled } from "./EX13-060.js";

const CARD_ID = "EX13-060";

const NAME_ONLY_SOURCE = "BT9-064";
const TRAIT_ONLY_SOURCE = "BT20-015";
const NEITHER_SOURCE = "BT2-061";
const CHRONICLE_LV4 = "BT20-051";
const CHRONICLE_LV3 = "BT20-048";
const NON_CHRONICLE_LV4 = "BT13-066";
const CHRONICLE_TAMER = "EX13-072";
const CHRONICLE_OPTION = "BT20-095";
const ALPHAMON_NAMED = "BT20-056";
const NON_MATCH = "BT1-009";

describe("EX13-060 Alphamon", () => {
  it("matches the catalog printed text, stats and evolution costs", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Alphamon",
      colors: ["Black", "Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Holy Warrior", "Royal Knight", "X Antibody", "Chronicle"],
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 5 },
        { color: "Yellow", level: 5, memoryCost: 5 },
      ],
      effectText:
        "[Digivolve] [Grademon]/Lv.5 w/[Chronicle] trait: Cost 4 \n[Assembly -5] Lv.5 × Lv.4 × Lv.3, all w/[Chronicle] trait\n\n[When Digivolving] 1 of your opponent's Digimon gets -8000 DP until their turn ends. Then, if they have 5 or more memory, gain 2 memory.\n[Your Turn] [Once Per Turn] When any of your [Chronicle] trait Digimon or Tamers are played, 1 of your Digimon may attack. Then, you may activate 1 of this Digimon's [When Digivolving] effects.\n[End of Your Turn] [Once Per Turn] You may play 1 [Chronicle] trait card without [Alphamon] in its name from your hand with the cost reduced by 6. It gains ＜Rush＞ for the turn. ",
    });
    expect(getCardDefinition(CARD_ID)?.inheritedEffectText ?? "").toBe("");
  });

  it("compiles every printed clause", () => {
    expect(runtimeCompiledCard(CARD_ID)).toMatchObject({ coverage: "full", residual: [] });

    expect(digivolutionRequirementsFor(CARD_ID)).toEqual([
      { namesExact: ["Grademon"], cost: 4, isAlternate: true },
      { level: 5, traits: ["Chronicle"], cost: 4, isAlternate: true },
    ]);
    expect(assemblyRequirementFor(CARD_ID)).toEqual([
      {
        reduceCost: 5,
        materials: [5, 4, 3].map((level) => ({ count: 1, level, traits: ["Chronicle"] })),
      },
    ]);
    expect(compiled.effects.some((effect) => effect.isInherited === true)).toBe(false);

    const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")!;
    expect(whenDigivolving.frequency).toBeUndefined();
    expect(whenDigivolving.actions).toMatchObject([
      {
        kind: "ModifyDP",
        target: { filter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea" }, count: 1 },
        amount: -8000,
        duration: "untilOpponentTurnEnd",
      },
      {
        kind: "GainMemory",
        amount: 2,
        condition: { kind: "memoryAtLeast", controller: "opponent", value: 5 },
      },
    ]);

    const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(yourTurn.frequency).toBe("OncePerTurn");
    expect(yourTurn.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "whenPlayed",
        sourceFilter: {
          controller: "mine",
          kind: ["Digimon", "Tamer"],
          nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
        },
        actions: [
          {
            kind: "Attack",
            target: { filter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" }, count: 1 },
            optional: true,
          },
          { kind: "ReactivateEffect", fromTrigger: "WhenDigivolving", count: 1, optional: true },
        ],
      },
    ]);

    const endOfYourTurn = compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")!;
    expect(endOfYourTurn.frequency).toBe("OncePerTurn");
    expect(endOfYourTurn.actions).toMatchObject([
      {
        kind: "PlayWithoutCost",
        target: {
          filter: {
            controller: "mine",
            nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
            excludeNames: ["Alphamon"],
          },
          count: 1,
        },
        from: ["hand"],
        payCost: true,
        reduceCostBy: 6,
        optional: true,
      },
      { kind: "GainKeyword", keyword: { keyword: "Rush" }, duration: "forTheTurn" },
    ]);
    expect((endOfYourTurn.actions[0] as { target: { filter: { kind?: unknown } } }).target.filter.kind).toBeUndefined();
  });

  it("takes the [Grademon] half for 4 and refuses the [Chronicle] half on the same source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NAME_ONLY_SOURCE, as: "base" }],
          hand: [{ card: CARD_ID, as: "alphamon" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-010"],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "victim", dp: 12_000 }] },
      },
      { autoSelectCards: true, autoChooseOption: true, autoDeclineOptional: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("alphamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(4);
    expect(s.perm("victim").currentDP).toBe(4000);

    const wrongHalf = setupEngine({
      0: {
        battleArea: [{ card: NAME_ONLY_SOURCE, as: "base" }],
        hand: [{ card: CARD_ID, as: "alphamon" }],
        deck: [NON_MATCH, "BT1-010"],
      },
    });
    wrongHalf.state.memory = 8;
    await wrongHalf.ready();
    expect(
      wrongHalf.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongHalf.perm("base").permanentId,
        instanceId: wrongHalf.inst("alphamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(wrongHalf.perm("base").topCard.cardId).toBe(NAME_ONLY_SOURCE);
    expect(wrongHalf.state.memory).toBe(8);
  });

  it("takes the colourless Lv.5 [Chronicle] half for 4 from a RED source no EvoCost admits", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TRAIT_ONLY_SOURCE, as: "base" }],
          hand: [{ card: CARD_ID, as: "alphamon" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-010"],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "victim", dp: 12_000 }] },
      },
      { autoSelectCards: true, autoChooseOption: true, autoDeclineOptional: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("alphamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(4);

    const wrongHalf = setupEngine({
      0: {
        battleArea: [{ card: TRAIT_ONLY_SOURCE, as: "base" }],
        hand: [{ card: CARD_ID, as: "alphamon" }],
        deck: [NON_MATCH, "BT1-010"],
      },
    });
    wrongHalf.state.memory = 8;
    await wrongHalf.ready();
    expect(
      wrongHalf.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongHalf.perm("base").permanentId,
        instanceId: wrongHalf.inst("alphamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(wrongHalf.perm("base").topCard.cardId).toBe(TRAIT_ONLY_SOURCE);
  });

  it("refuses both header halves for a plain Black Lv.5 and charges the printed 5 instead", async () => {
    for (const alternateRequirementIndex of [0, 1]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: NEITHER_SOURCE, as: "base" }],
          hand: [{ card: CARD_ID, as: "alphamon" }],
          deck: [NON_MATCH, "BT1-010"],
        },
      });
      s.state.memory = 8;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("alphamon").instanceId,
          useAlternateCost: true,
          alternateRequirementIndex,
        }),
      ).toEqual(expect.objectContaining({ ok: false }));
      expect(s.perm("base").topCard.cardId).toBe(NEITHER_SOURCE);
      expect(s.state.memory).toBe(8);
    }

    const printedRoute = setupEngine(
      {
        0: {
          battleArea: [{ card: NEITHER_SOURCE, as: "base" }],
          hand: [{ card: CARD_ID, as: "alphamon" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-010"],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "victim", dp: 12_000 }] },
      },
      { autoSelectCards: true, autoChooseOption: true, autoDeclineOptional: true },
    );
    printedRoute.state.memory = 8;
    await printedRoute.ready();
    expect(
      printedRoute.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: printedRoute.perm("base").permanentId,
        instanceId: printedRoute.inst("alphamon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => printedRoute.perm("base").topCard.cardId === CARD_ID);
    await settle(() => printedRoute.state.pendingDecision === undefined);
    expect(printedRoute.state.memory).toBe(3);
  });

  it("plays through Assembly for 8, stacking the Lv.5 material closest to the played card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "alphamon" }],
          trash: [
            { card: TRAIT_ONLY_SOURCE, as: "m5" },
            { card: CHRONICLE_LV4, as: "m4" },
            { card: CHRONICLE_LV3, as: "m3" },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoSelectCards: true, autoChooseOption: true, autoDeclineOptional: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("alphamon").instanceId,
        assembly: {
          materialInstanceIds: [s.inst("m5").instanceId, s.inst("m4").instanceId, s.inst("m3").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    await settle(() => s.state.pendingDecision === undefined);

    const alphamon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID)!;
    expect(s.state.memory).toBe(0);
    expect(alphamon.stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("m3").instanceId,
      s.inst("m4").instanceId,
      s.inst("m5").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("refuses an Assembly whose Lv.4 slot lacks the [Chronicle] trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "alphamon" }],
          trash: [
            { card: TRAIT_ONLY_SOURCE, as: "m5" },
            { card: NON_CHRONICLE_LV4, as: "badM4" },
            { card: CHRONICLE_LV3, as: "m3" },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoSelectCards: true, autoChooseOption: true, autoDeclineOptional: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("alphamon").instanceId,
        assembly: {
          materialInstanceIds: [s.inst("m5").instanceId, s.inst("badM4").instanceId, s.inst("m3").instanceId],
        },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.memory).toBe(8);
  });

  it("gains 2 memory only when the opponent holds 5 or more, and the debuff survives to their turn end", async () => {
    const rich = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "alphamon", under: ["BT1-010"], dp: 13_000 }],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [
            { card: NON_MATCH, as: "victim", dp: 12_000 },
            { card: "BT1-012", as: "bystander", dp: 12_000 },
          ],
          deck: ["BT1-013"],
          security: ["BT1-014"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    rich.state.memory = -5;
    await rich.ready();

    await advance(rich.engine).fire(EffectTiming.WhenDigivolving, rich.perm("alphamon"));
    await settle(() => rich.state.pendingDecision === undefined);

    expect([rich.perm("victim").currentDP, rich.perm("bystander").currentDP].sort((a, b) => a - b)).toEqual([
      4000, 12_000,
    ]);
    expect(rich.state.memory).toBe(-3);
    assertNoLoudGap(rich);

    const poor = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "alphamon", under: ["BT1-010"], dp: 13_000 }],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "victim", dp: 12_000 }], deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    poor.state.memory = -4;
    await poor.ready();

    await advance(poor.engine).fire(EffectTiming.WhenDigivolving, poor.perm("alphamon"));
    await settle(() => poor.state.pendingDecision === undefined);
    expect(poor.perm("victim").currentDP).toBe(4000);
    expect(poor.state.memory).toBe(-4);
  });

  it("keeps the -8000 through the opponent's turn and lets it lapse when that turn ends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NEITHER_SOURCE, as: "base" }],
          hand: [{ card: CARD_ID, as: "alphamon" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-010"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [{ card: NON_MATCH, as: "victim", dp: 12_000 }],
          deck: ["BT1-013"],
          security: ["BT1-014"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, autoDeclineOptional: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("alphamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("victim").currentDP).toBe(4000);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const theirTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("victim").currentDP).toBe(4000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await theirTurn;
    await settle();

    expect(s.perm("victim").currentDP).toBe(12_000);
  });

  it("lets a Digimon attack and re-runs the [When Digivolving] body when a [Chronicle] TAMER is played", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "alphamon", under: ["BT1-010"], dp: 13_000 }],
          hand: [{ card: CHRONICLE_TAMER, as: "tamer" }],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [{ card: NON_MATCH, as: "victim", dp: 12_000 }],
          deck: ["BT1-013"],
          security: [{ card: "BT1-014", as: "theirSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("alphamon").topCard.instanceId, s.perm("victim").topCard.instanceId);
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => s.perm("alphamon").isSuspended);

    expect(s.perm("alphamon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID, CHRONICLE_TAMER]);
    assertNoLoudGap(s);
  });

  it("re-runs the [When Digivolving] body on a Tamer-driven watcher", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "alphamon", under: ["BT1-010"], dp: 13_000 }],
          hand: [{ card: CHRONICLE_TAMER, as: "tamer" }],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [{ card: NON_MATCH, as: "victim", dp: 12_000 }],
          deck: ["BT1-013"],
          security: [{ card: "BT1-014", as: "theirSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("victim").currentDP).toBe(4000);
  });

  it("fires for a [Chronicle] Digimon, ignores a non-[Chronicle] play, and runs once per turn", async () => {
    const chronicle = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "alphamon", under: ["BT1-010"], dp: 13_000 }],
          hand: [
            { card: CHRONICLE_LV3, as: "dorumon" },
            { card: CHRONICLE_LV3, as: "secondDorumon" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [
            { card: NON_MATCH, as: "victim", dp: 12_000 },
            { card: "BT1-012", as: "second", dp: 12_000 },
          ],
          deck: ["BT1-013"],
          security: [{ card: "BT1-014", as: "theirSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    chronicle.state.memory = 10;
    await chronicle.ready();

    expect(
      chronicle.engine.applyIntent(0, { type: "playCard", instanceId: chronicle.inst("dorumon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => chronicle.state.pendingDecision === undefined);
    const hit = ["victim", "second"].filter((alias) => chronicle.perm(alias).currentDP === 4000);
    expect(hit).toHaveLength(1);
    const other = ["victim", "second"].find((alias) => alias !== hit[0])!;

    expect(
      chronicle.engine.applyIntent(0, { type: "playCard", instanceId: chronicle.inst("secondDorumon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => chronicle.state.pendingDecision === undefined);
    expect(chronicle.perm(other).currentDP).toBe(12_000);

    const plain = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "alphamon", under: ["BT1-010"], dp: 13_000 }],
          hand: [{ card: NON_MATCH, as: "plain" }],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "victim", dp: 12_000 }], deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    plain.state.memory = 10;
    await plain.ready();
    expect(plain.engine.applyIntent(0, { type: "playCard", instanceId: plain.inst("plain").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => plain.state.pendingDecision === undefined);
    expect(plain.perm("victim").currentDP).toBe(12_000);
    expect(plain.perm("alphamon").isSuspended).toBe(false);
  });

  it("declines the optional attack and the optional re-run, leaving the board untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "alphamon", under: ["BT1-010"], dp: 13_000 }],
          hand: [{ card: CHRONICLE_LV3, as: "dorumon" }],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [{ card: NON_MATCH, as: "victim", dp: 12_000 }],
          deck: ["BT1-013"],
          security: [{ card: "BT1-014", as: "theirSecurity" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dorumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("alphamon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("victim").currentDP).toBe(12_000);
    assertNoLoudGap(s);
  });

  it("resets the [Once Per Turn] watcher on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "alphamon", under: ["BT1-010"], dp: 13_000 }],
          hand: [
            { card: CHRONICLE_LV3, as: "first" },
            { card: CHRONICLE_LV3, as: "second" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [
            { card: NON_MATCH, as: "victim", dp: 12_000 },
            { card: "BT1-012", as: "other", dp: 12_000 },
          ],
          deck: ["BT1-013", "BT1-011", "BT1-012"],
          security: ["BT1-014", "BT1-013", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    const firstHit = ["victim", "other"].filter((alias) => s.perm(alias).currentDP === 4000);
    expect(firstHit).toHaveLength(1);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    const secondHit = ["victim", "other"].filter((alias) => s.perm(alias).currentDP === 4000);
    expect(secondHit).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("plays a [Chronicle] Digimon from hand for 6 less and gives it ＜Rush＞", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "alphamon", under: ["BT1-010"], dp: 13_000 }],
          hand: [{ card: TRAIT_ONLY_SOURCE, as: "hisyaryumon" }],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 8;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("alphamon"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === TRAIT_ONLY_SOURCE));
    await settle(() => s.state.pendingDecision === undefined);

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === TRAIT_ONLY_SOURCE)!;
    expect(s.state.memory).toBe(7);
    expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(s);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    await settle();
    const stillThere = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === TRAIT_ONLY_SOURCE)!;
    expect(observe(s.engine).hasKeyword(stillThere, "Rush")).toBe(false);
  });

  it("reaches a [Chronicle] TAMER — the printed subject is '1 card', not '1 Digimon card'", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "alphamon", under: ["BT1-010"], dp: 13_000 }],
          hand: [{ card: CHRONICLE_TAMER, as: "played" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 8;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("alphamon"));
    await settle(() => s.state.players[0]!.hand.length === 0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID, CHRONICLE_TAMER]);
    expect(s.state.memory).toBe(8);
    assertNoLoudGap(s);
  });

  it("never plays a [Chronicle] OPTION, while the same pool reaches a [Chronicle] Digimon", async () => {
    const board = (hand: { card: string; as: string }[]) =>
      setupEngine(
        {
          0: {
            battleArea: [{ card: CARD_ID, as: "alphamon", under: ["BT1-010"], dp: 13_000 }],
            hand,
            deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
            security: ["BT1-013"],
          },
          1: { deck: ["BT1-013"], security: ["BT1-014"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );

    const optionOnly = board([{ card: CHRONICLE_OPTION, as: "option" }]);
    optionOnly.state.memory = 8;
    await optionOnly.ready();
    await advance(optionOnly.engine).fire(EffectTiming.EndOfYourTurn, optionOnly.perm("alphamon"));
    await settle(() => optionOnly.state.pendingDecision === undefined);
    expect(optionOnly.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([CHRONICLE_OPTION]);
    expect(optionOnly.state.players[0]!.battleArea).toHaveLength(1);
    expect(optionOnly.state.memory).toBe(8);

    const withDigimon = board([
      { card: CHRONICLE_OPTION, as: "option" },
      { card: CHRONICLE_LV3, as: "dorumon" },
    ]);
    withDigimon.state.memory = 8;
    await withDigimon.ready();
    await advance(withDigimon.engine).fire(EffectTiming.EndOfYourTurn, withDigimon.perm("alphamon"));
    await settle(() => withDigimon.state.players[0]!.hand.length === 1);
    await settle(() => withDigimon.state.pendingDecision === undefined);
    expect(withDigimon.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([CHRONICLE_OPTION]);
    expect(withDigimon.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([
      CARD_ID,
      CHRONICLE_LV3,
    ]);
  });

  it("offers nothing when the only card in hand has no [Chronicle] trait, and takes the decline", async () => {
    const nonChronicle = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "alphamon", under: ["BT1-010"], dp: 13_000 }],
          hand: [{ card: NON_MATCH, as: "plain" }],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    nonChronicle.state.memory = 8;
    await nonChronicle.ready();
    await advance(nonChronicle.engine).fire(EffectTiming.EndOfYourTurn, nonChronicle.perm("alphamon"));
    await settle(() => nonChronicle.state.pendingDecision === undefined);
    expect(nonChronicle.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([NON_MATCH]);
    expect(nonChronicle.state.players[0]!.battleArea).toHaveLength(1);
    expect(nonChronicle.state.memory).toBe(8);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "alphamon", under: ["BT1-010"], dp: 13_000 }],
          hand: [{ card: CHRONICLE_LV3, as: "dorumon" }],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    declined.state.memory = 8;
    await declined.ready();
    await advance(declined.engine).fire(EffectTiming.EndOfYourTurn, declined.perm("alphamon"));
    await settle(() => declined.state.pendingDecision === undefined);
    expect(declined.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([CHRONICLE_LV3]);
    expect(declined.state.players[0]!.battleArea).toHaveLength(1);
    expect(declined.state.memory).toBe(8);
  });

  it("never offers a [Chronicle] card with [Alphamon] in its name, and runs once per turn", async () => {
    const excluded = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "alphamon", under: ["BT1-010"], dp: 13_000 }],
          hand: [{ card: ALPHAMON_NAMED, as: "otherAlphamon" }],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    excluded.state.memory = 12;
    await excluded.ready();

    await advance(excluded.engine).fire(EffectTiming.EndOfYourTurn, excluded.perm("alphamon"));
    await settle(() => excluded.state.pendingDecision === undefined);

    expect(excluded.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      excluded.inst("otherAlphamon").instanceId,
    ]);
    expect(excluded.state.players[0]!.battleArea).toHaveLength(1);
    expect(excluded.state.memory).toBe(12);

    const twice = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "alphamon", under: ["BT1-010"], dp: 13_000 }],
          hand: [
            { card: CHRONICLE_LV3, as: "first" },
            { card: CHRONICLE_LV3, as: "second" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    twice.state.memory = 8;
    await twice.ready();

    await advance(twice.engine).fire(EffectTiming.EndOfYourTurn, twice.perm("alphamon"));
    await settle(() => twice.state.players[0]!.hand.length === 1);
    await settle(() => twice.state.pendingDecision === undefined);

    await advance(twice.engine).fire(EffectTiming.EndOfYourTurn, twice.perm("alphamon"));
    await settle(() => twice.state.pendingDecision === undefined);
    expect(twice.state.players[0]!.hand).toHaveLength(1);
    expect(twice.state.players[0]!.battleArea).toHaveLength(2);
  });
});
