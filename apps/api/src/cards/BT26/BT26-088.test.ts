import { describe, it, expect, vi } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import "./BT26-088.js";

// BT26-088 (Hiroko Sagisaka, BT26 Tamer):
//   "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory."
//
// FAILS-WHEN-REVERTED: dropping the opponent-Digimon condition gains memory on an empty board;
// dropping the own-turn gate fires on the opponent's main phase; counting a breeding-area
// Digimon or a Tamer as "a Digimon" satisfies the condition wrongly.

const CARD_ID = "BT26-088";
const MEMORY_KEY = "start-main-gain-memory";

const DIGIMON = "digimon";
const TAMER = "tamer";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "AD1-001",
    set: "BT26",
    nameEn: over.nameEn ?? "Test",
    kinds: (over.kinds as never) ?? ([CardKind.Digimon] as never),
    colors: (over.colors as never) ?? ([] as never),
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "hiroko-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID, kinds: [CardKind.Tamer] as never }),
    permanent: () => ({ permanentId: "hiroko" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

function makeHarness(options: {
  theirs?: { permanentId: string; topCard?: { cardId: string }; inBreeding?: boolean }[];
  source?: CardSource;
}) {
  const players = [
    { seat: 0 as Seat, battleArea: [] },
    { seat: 1 as Seat, battleArea: options.theirs ?? [] },
  ];

  const game: GameAccess = {
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    definitionOf: (card: { cardId: string }) =>
      fakeDef({ kinds: (card.cardId === TAMER ? [CardKind.Tamer] : [CardKind.Digimon]) as never }),
  } as unknown as GameAccess;

  const memory: number[] = [];
  const fx = { gainMemory: vi.fn<(...args: any[]) => any>((n: number) => memory.push(n)) } as unknown as Primitives;

  const source = options.source ?? makeSource();
  const ctx = { source, trigger: {}, game, fx, ask: {} } as unknown as EffectContext;
  return { ctx, memory, source };
}

function memoryEffect(source: CardSource) {
  const module = getEffectModule(CARD_ID);
  expect(module).toBeDefined();
  const effect = module!
    .effectsForTiming(EffectTiming.OnStartMainPhase, source)
    .find((e) => e.effectKey === `${CARD_ID}/${MEMORY_KEY}`);
  expect(effect).toBeDefined();
  return effect!;
}

describe("BT26-088 [Start of Your Main Phase]: gain 1 memory while the opponent has a Digimon", () => {
  it("gains 1 memory when the opponent controls a Digimon", async () => {
    const harness = makeHarness({ theirs: [{ permanentId: "opp-a", topCard: { cardId: DIGIMON } }] });
    const effect = memoryEffect(harness.source);

    expect(effect.canTrigger(harness.ctx)).toBe(true);
    await effect.resolve(harness.ctx);

    expect(harness.memory).toEqual([1]);
  });

  it("does not trigger when the opponent has only Tamers or breeding-area Digimon", () => {
    const tamersOnly = makeHarness({ theirs: [{ permanentId: "opp-tamer", topCard: { cardId: TAMER } }] });
    const breedingOnly = makeHarness({
      theirs: [{ permanentId: "opp-egg", topCard: { cardId: DIGIMON }, inBreeding: true }],
    });
    const empty = makeHarness({});

    expect(memoryEffect(tamersOnly.source).canTrigger(tamersOnly.ctx)).toBe(false);
    expect(memoryEffect(breedingOnly.source).canTrigger(breedingOnly.ctx)).toBe(false);
    expect(memoryEffect(empty.source).canTrigger(empty.ctx)).toBe(false);
  });

  it("gains nothing if the opponent's last Digimon left before the effect resolved", async () => {
    const harness = makeHarness({});
    await memoryEffect(harness.source).resolve(harness.ctx);

    expect(harness.memory).toEqual([]);
  });

  it("does not trigger on the opponent's main phase or from off the battle area", () => {
    const offTurn = makeHarness({
      theirs: [{ permanentId: "opp-a", topCard: { cardId: DIGIMON } }],
      source: makeSource({ isOwnersTurn: () => false }),
    });
    const offField = makeHarness({
      theirs: [{ permanentId: "opp-a", topCard: { cardId: DIGIMON } }],
      source: makeSource({ isOnBattleArea: () => false }),
    });

    expect(memoryEffect(offTurn.source).canTrigger(offTurn.ctx)).toBe(false);
    expect(memoryEffect(offField.source).canTrigger(offField.ctx)).toBe(false);
  });

  it("reduces a TS Digimon's play cost by 2 when its controller has no Digimon", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "P-194", as: "tsDigimon" }], battleArea: [{ card: CARD_ID, as: "hiroko" }] } },
      { autoAcceptOptional: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tsDigimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "P-194"));

    expect(s.perm("hiroko").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("reduces by only 1 when its controller already has a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-194", as: "tsDigimon" }],
          battleArea: [{ card: CARD_ID, as: "hiroko" }, { card: "AD1-001", as: "existing" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 4;

    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tsDigimon").instanceId });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "P-194"));

    expect(s.state.memory).toBe(1);
  });

  it("does not reduce a non-Boss/non-TS Digimon or when the player declines", async () => {
    const ineligible = setupEngine(
      { 0: { hand: [{ card: "AD1-001", as: "plain" }], battleArea: [{ card: CARD_ID, as: "hiroko" }] } },
      { autoAcceptOptional: true },
    );
    ineligible.state.memory = 5;
    ineligible.engine.applyIntent(0, { type: "playCard", instanceId: ineligible.inst("plain").instanceId });
    await settle(() => ineligible.state.players[0]!.battleArea.length === 2);
    expect(ineligible.state.memory).toBe(0);
    expect(ineligible.perm("hiroko").isSuspended).toBe(false);

    const declined = setupEngine(
      { 0: { hand: [{ card: "P-194", as: "tsDigimon" }], battleArea: [{ card: CARD_ID, as: "hiroko" }] } },
      { autoDeclineOptional: true },
    );
    declined.state.memory = 4;
    declined.engine.applyIntent(0, { type: "playCard", instanceId: declined.inst("tsDigimon").instanceId });
    await settle(() => declined.state.players[0]!.battleArea.length === 2);
    expect(declined.state.memory).toBe(0);
    expect(declined.perm("hiroko").isSuspended).toBe(false);
  });

  it("plays itself from Security without paying the cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: CARD_ID, as: "hirokoSecurity" }] },
      1: { battleArea: [{ card: "AD1-004", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const hirokoId = s.inst("hirokoSecurity").instanceId;
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === hirokoId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === hirokoId)).toBe(true);
  });
});
