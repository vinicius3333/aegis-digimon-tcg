import {
  CardColor,
  CardKind,
  EffectTiming,
  digivolutionRequirementsFor,
  type CardDefinition,
  type CardInstance,
  type Seat,
} from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT26-068.js";

const CARD_ID = "BT26-068";

function definition(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: overrides.cardId ?? "TEST",
    set: overrides.set ?? "TEST",
    nameEn: overrides.nameEn ?? "Fixture",
    colors: overrides.colors ?? [CardColor.Purple],
    kinds: overrides.kinds ?? [CardKind.Digimon],
    playCost: overrides.playCost ?? 0,
    dp: overrides.dp ?? 0,
    evoCosts: overrides.evoCosts ?? [],
    maxCountInDeck: overrides.maxCountInDeck ?? 4,
    types: overrides.types ?? [],
    ...overrides,
  };
}

function instance(instanceId: string, cardId = "TEST", ownerSeat = 0 as Seat): CardInstance {
  return { instanceId, cardId, ownerSeat, faceUp: true } as CardInstance;
}

function source(instanceId = "devimon-card"): CardSource {
  return {
    instanceId,
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition({ cardId: CARD_ID, types: ["Fallen Angel", "Iliad", "TS"] }),
    permanent: () => ({ permanentId: `${instanceId}-permanent` }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-068 Devimon", () => {
  it("encodes the conditional draw, opponent-choice discard cost, and inherited draw", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({ kind: "ConditionalBranch", condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 5 } });
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenEffectAddsToOpponentHand",
      actions: [{ kind: "Trash", chooser: "opponent", cost: { kind: "trash", target: { filter: { controllerDefault: "mine", zone: "hand" }, count: 1 } } }],
    });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn" });
  });

  it("carries the exact Lv.3 [TS] alternate evolution path and accepts it from a non-purple base", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    });

    // BT26-008 is a red Lv.3 [TS] Digimon, so only the trait path permits this evolution.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-008", as: "kotemon" }],
          hand: [{ card: CARD_ID, as: "devimon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-009"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kotemon").permanentId,
        instanceId: s.inst("devimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kotemon").topCard.cardId === CARD_ID && s.state.players[1]!.hand.length === 2);

    expect(s.state.memory).toBe(0);
    expect(s.perm("kotemon").stack.map(({ cardId }) => cardId)).toEqual(["BT26-008"]);
    expect(s.state.players[0]!.hand).toHaveLength(3); // evolution draw + printed Draw 2
    expect(s.state.players[1]!.hand).toHaveLength(2);
  });

  it("rejects the trait evolution path from a same-level non-[TS] near-match", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "agumon" }],
        hand: [{ card: CARD_ID, as: "devimon" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("devimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("draws 2 for each player at the exact five-card boundary and not at six", async () => {
    const cardSource = source();
    const draw = vi.fn(async () => []);
    const owner = { hand: Array.from({ length: 5 }, (_, index) => instance(`hand-${index}`)) };
    const game = {
      player: (seat: Seat) => (seat === 0 ? owner : { hand: [] }),
      opponentOf: () => 1 as Seat,
    } as unknown as GameAccess;
    const ctx = { source: cardSource, game, fx: { draw } as unknown as Primitives } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, cardSource)[0]!;

    expect(effect.optional).toBe(false);
    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);
    expect(draw.mock.calls).toEqual([
      [0, 2],
      [1, 2],
    ]);

    owner.hand.push(instance("sixth"));
    draw.mockClear();
    expect(effect.canActivate(ctx)).toBe(false);
    await effect.resolve(ctx);
    expect(draw).not.toHaveBeenCalled();
  });

  it("each of two copies independently pays and resolves the All Turns trigger once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "devimonA" },
            { card: CARD_ID, as: "devimonB" },
          ],
          hand: [
            { card: "BT1-009", as: "costA" },
            { card: "BT1-009", as: "costB" },
            { card: "BT1-009", as: "costC" },
            { card: "BT1-009", as: "costD" },
          ],
        },
        1: {
          hand: [
            { card: "BT1-009", as: "opponentA" },
            { card: "BT1-009", as: "opponentB" },
            { card: "BT1-009", as: "opponentC" },
            { card: "BT1-009", as: "opponentD" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    // No public intent isolates an arbitrary effect-driven hand addition, so drive the
    // production SubTrigger seam after arranging the already-added opponent cards.
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    await settle(() => s.state.players[0]!.hand.length === 2 && s.state.players[1]!.hand.length === 2);

    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(2);
    expect(s.decisions.filter(({ seat, req }) => seat === 1 && req.kind === "selectCards")).toHaveLength(2);

    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[1]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });

  it("releases the once-per-turn reservation when the cost is declined or fails to move", async () => {
    const cardSource = source();
    let subscription: SubTriggerInstall | undefined;
    const subscribeSubTrigger = vi.fn((install: SubTriggerInstall) => {
      subscription = install;
      return "subscription";
    });
    const staticCtx = {
      source: cardSource,
      fx: { subscribeSubTrigger } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.None, cardSource)[0]!;
    await effect.resolve(staticCtx);

    expect(subscription).toBeDefined();
    // The static builder must inject a source-instance-scoped key; the card must not
    // install its former card-global key itself.
    expect(subscription!.oncePerTurnKey).toBe(`${cardSource.instanceId}/${CARD_ID}/opponent-hand-added-trade-trash`);

    const ownCard = instance("own-card");
    const opponentCard = instance("opponent-card", "TEST", 1 as Seat);
    const game = {
      player: (seat: Seat) => (seat === 0 ? { hand: [ownCard] } : { hand: [opponentCard] }),
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
    } as unknown as GameAccess;
    const opponentSelect = vi.fn(async () => [opponentCard.instanceId]);
    const declinedCtx = {
      source: cardSource,
      trigger: { effectAddedToHandSeat: 1 as Seat },
      game,
      ask: {
        optional: vi.fn(async () => false),
        selectCards: vi.fn(async () => [ownCard.instanceId]),
        opponent: { selectCards: opponentSelect },
      },
      fx: { trash: vi.fn(async () => []) } as unknown as Primitives,
    } as unknown as EffectContext;
    await subscription!.run(declinedCtx);
    expect(declinedCtx.oncePerTurnActivationDeclined).toBe(true);
    expect(opponentSelect).not.toHaveBeenCalled();

    const failedCtx = {
      ...declinedCtx,
      oncePerTurnActivationDeclined: false,
      ask: { ...declinedCtx.ask, optional: vi.fn(async () => true) },
    } as EffectContext;
    await subscription!.run(failedCtx);
    expect(failedCtx.oncePerTurnActivationDeclined).toBe(true);
    expect(opponentSelect).not.toHaveBeenCalled();
  });

  it("resolves the inherited draw-then-trash once from a realistic Devimon evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-074",
              as: "cerberusmon",
              dp: 12000,
              under: [{ card: CARD_ID, as: "inheritedDevimon" }],
            },
          ],
          hand: [{ card: "BT1-009", as: "startingHand" }],
          deck: [
            { card: "BT1-009", as: "firstDraw" },
            { card: "BT1-009", as: "secondDraw" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnAllyAttack, s.perm("cerberusmon"));
    await settle(() => s.state.players[0]!.deck.length === 1 && s.state.players[0]!.trash.length === 1);

    await advance(s.engine).fire(EffectTiming.OnAllyAttack, s.perm("cerberusmon"));

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});
