import { describe, expect, it } from "vitest";
import { CardKind, EffectTiming, digivolutionRequirementsFor, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import "./BT26-021.js";
import "../index.js";
import { compiled } from "./BT26-021.js";

const CARD_ID = "BT26-021";
const MAIN_KEY = "main-play-ts-tamer-from-trash";

it("exposes the printed level-3 TS evolution", () => {
  expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({ level: 3, traits: ["TS"], cost: 2, isAlternate: true });
});

it("encodes normal TS targeting, reduced trash Tamer play, and inherited bottom-source cost", () => {
  expect(compiled.effects).toMatchObject([
    { trigger: "OnPlay", actions: [{ kind: "Restrict", restriction: "attackTargetChange" }] },
    { trigger: "WhenDigivolving", actions: [{ kind: "Restrict", restriction: "attackTargetChange" }] },
    {
      trigger: "Main",
      frequency: "OncePerTurn",
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], reduceCostBy: 2 }],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          actions: [{ kind: "TrashDigivolution", amount: 2, fromTop: false }],
        },
      ],
    },
  ]);
});

function definition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "TEST",
    set: "BT26",
    nameEn: over.nameEn ?? "Test",
    kinds: (over.kinds as never) ?? ([CardKind.Digimon] as never),
    colors: over.colors ?? [],
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 1000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function source(permanentId = "host"): CardSource {
  return {
    instanceId: "gekomon-source",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition({ cardId: CARD_ID }),
    permanent: () => ({ permanentId }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-021 inherited watcher boundaries", () => {
  it("does not spend the once-per-turn budget when its hand-trash cost is declined", async () => {
    const cardSource = source();
    let watcher: SubTriggerInstall | undefined;
    const hand = [{ instanceId: "hand-cost", cardId: "HAND" }];
    const target = {
      permanentId: "target",
      topCard: { cardId: "DIGIMON" },
      stack: [
        { instanceId: "bottom", cardId: "DIGIMON" },
        { instanceId: "next", cardId: "DIGIMON" },
      ],
    };
    const ctx = {
      source: cardSource,
      trigger: { attackerPermanentId: "attacker" },
      game: {
        player: (seat: Seat) => (seat === 0 ? { hand, battleArea: [] } : { hand: [], battleArea: [target] }),
        opponentOf: () => 1 as Seat,
        permanentById: (permanentId: string) => (permanentId === target.permanentId ? target : undefined),
        definitionOf: () => definition(),
      },
      ask: { optional: async () => false, selectCards: async () => [] },
      fx: { subscribeSubTrigger: (subscription: SubTriggerInstall) => (watcher = subscription) },
    } as unknown as EffectContext;

    await getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.None, cardSource)[0]!.resolve(ctx);
    expect(watcher?.matches).toBeUndefined();
    await watcher!.run(ctx);

    expect(ctx.oncePerTurnActivationDeclined).toBe(true);
  });
});

describe("BT26-021 public engine behavior", () => {
  it("plays for 4 and locks one owned TS Digimon's attack target for the turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-013", as: "ownTs" },
            { card: "BT1-009", as: "nonTs" },
          ],
          hand: [{ card: CARD_ID, as: "gekomon" }],
        },
        1: {
          battleArea: [
            { card: "BT25-008", as: "opponentTs" },
            { card: "BT26-017", as: "blocker" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ownTs").permanentId);
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gekomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => {
      return observe(s.engine).isRestricted(s.perm("ownTs"), "attackTargetChange");
    });

    expect(s.state.memory).toBe(0);
    const targetRequest = s.decisions.find(({ req }) => req.kind === "chooseTargets")?.req;
    const gekomon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID)!;
    expect(new Set(targetRequest?.options?.candidateInstanceIds)).toEqual(
      new Set([s.perm("ownTs").permanentId, gekomon.permanentId]),
    );
    expect(observe(s.engine).isRestricted(s.perm("ownTs"), "attackTargetChange")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("nonTs"), "attackTargetChange")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("opponentTs"), "attackTargetChange")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ownTs").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("blocker").isSuspended).toBe(false);

    advance(s.engine).ledgers.continuous.sweep(s.state, "eachTurnEnd", 0);
    expect(observe(s.engine).isRestricted(s.perm("ownTs"), "attackTargetChange")).toBe(false);
  });

  it("uses the Lv.3 TS alternate evolution on a red base for exact cost 2 and rejects a near-miss", async () => {
    const valid = setupEngine({
      0: {
        battleArea: [{ card: "BT25-008", as: "tsBase" }],
        hand: [{ card: CARD_ID, as: "gekomon" }],
      },
    });
    valid.state.memory = 2;
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("tsBase").permanentId,
        instanceId: valid.inst("gekomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(valid.engine).isRestricted(valid.perm("tsBase"), "attackTargetChange"));
    expect(valid.perm("tsBase").topCard.cardId).toBe(CARD_ID);
    expect(valid.state.memory).toBe(0);
    expect(valid.perm("tsBase").stack.map((card) => card.cardId)).toEqual(["BT25-008"]);
    expect(observe(valid.engine).isRestricted(valid.perm("tsBase"), "attackTargetChange")).toBe(true);

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "plainRed" }],
        hand: [{ card: CARD_ID, as: "gekomon" }],
      },
    });
    invalid.state.memory = 2;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plainRed").permanentId,
        instanceId: invalid.inst("gekomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.state.memory).toBe(2);
    expect(invalid.state.players[0]!.hand.map((card) => card.cardId)).toContain(CARD_ID);
  });

  it("two Gekomon do not combine reductions: one activation plays a cost-3 TS Tamer for 1 (Q6983)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "first" },
            { card: CARD_ID, as: "second" },
          ],
          trash: [{ card: "BT24-083", as: "tsTamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("first").topCard.instanceId,
        effectKey: `${CARD_ID}/${MAIN_KEY}`,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-083"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT24-083")).toBe(false);
  });

  it("under a play-cost reduction blocker still plays the TS Tamer for full printed cost (Q6984)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "gekomon" }],
          trash: [{ card: "BT24-083", as: "tsTamer" }],
        },
        1: { battleArea: [{ card: "ST12-03", as: "solarmon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("gekomon").topCard.instanceId,
        effectKey: `${CARD_ID}/${MAIN_KEY}`,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-083"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-083")).toBe(true);
  });

  it("may decline the Main play without moving the Tamer or paying memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "gekomon" }],
          trash: [{ card: "BT24-083", as: "tsTamer" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("gekomon").topCard.instanceId,
        effectKey: `${CARD_ID}/${MAIN_KEY}`,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("tsTamer").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("on either player's attack pays one hand card, trashes exactly the bottom 2 sources, and is once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: [{ card: CARD_ID, as: "source" }] }],
          hand: [
            { card: "BT1-010", as: "firstCost" },
            { card: "BT1-011", as: "secondCost" },
          ],
          security: ["BT1-015", "BT1-016"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "firstAttacker" },
            { card: "BT1-014", as: "secondAttacker" },
            {
              card: "BT1-083",
              as: "target",
              under: [
                { card: "BT1-001", as: "bottom" },
                { card: "BT1-002", as: "next" },
                { card: "BT1-003", as: "third" },
                { card: "BT1-004", as: "fourth" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 2 && s.state.players[0]!.security.length === 1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([
      s.inst("third").instanceId,
      s.inst("fourth").instanceId,
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("secondCost").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("firstCost").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("bottom").instanceId, s.inst("next").instanceId]),
    );
  });
});
