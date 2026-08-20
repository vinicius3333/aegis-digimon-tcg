import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT26-066.js";
import "../index.js";

const CARD_ID = "BT26-066";

describe("BT26-066 Salamon", () => {
  it("digivolves from a non-purple level 2 [TS] Digimon for alternate cost 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-001", as: "base" }],
        hand: [{ card: CARD_ID, as: "salamon" }],
        deck: ["BT5-022"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("salamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("salamon").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("at start of main digivolves a Titan into a Titan from trash at printed cost minus 2", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "salamon" }],
          trash: [{ card: "BT26-074", as: "cerberusmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("salamon").permanentId, s.inst("cerberusmon").instanceId);
    s.state.memory = 5;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("salamon"));
    await settle(() => s.perm("salamon").topCard.instanceId === s.inst("cerberusmon").instanceId);

    expect(s.state.memory).toBe(3); // BT26-074 ordinary printed cost 4, reduced by 2
    expect(s.perm("salamon").stack.map((card) => card.cardId)).toEqual([CARD_ID]);
  });

  it("enforces the exact hand-size boundary and Titan-only pools", () => {
    const source = {
      ownerSeat: 0 as Seat,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as CardSource;
    const titan = { instanceId: "titan", cardId: "TITAN" };
    const near = { instanceId: "near", cardId: "NEAR" };
    const permanent = { permanentId: "host", inBreeding: false, topCard: titan };
    const definitions: Record<string, Partial<CardDefinition>> = {
      TITAN: { kinds: [CardKind.Digimon], types: ["Titan"] },
      NEAR: { kinds: [CardKind.Digimon], types: ["Titanic"] },
    };
    const player = {
      hand: Array.from({ length: 5 }, (_, i) => ({ instanceId: `h${i}` })),
      battleArea: [permanent],
      trash: [titan, near],
    };
    const ctx = {
      source,
      game: {
        player: () => player,
        definitionOf: (card: { cardId: string }) => definitions[card.cardId]!,
      },
    } as unknown as EffectContext;
    const effect = module.effectsForTiming(EffectTiming.OnStartMainPhase, source)[0]!;

    expect(effect.canActivate(ctx)).toBe(true);
    player.hand.push({ instanceId: "sixth" });
    expect(effect.canActivate(ctx)).toBe(false);
    player.hand.pop();
    player.trash.splice(0, 1);
    expect(effect.canActivate(ctx)).toBe(false);
  });

  it("inherited trigger evolves only once per turn after its owner's hand is trashed from", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-074", as: "host", under: [{ card: CARD_ID, as: "salamon-source" }] }],
          hand: [
            { card: "BT5-022", as: "discard-one" },
            { card: "BT5-022", as: "discard-two" },
          ],
          trash: [
            { card: "P-209", as: "first-evolution" },
            { card: "BT26-079", as: "second-evolution" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("first-evolution").instanceId, s.inst("second-evolution").instanceId);
    s.state.memory = 8;
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("discard-one").instanceId], 0);
    await settle(() => s.perm("host").topCard.instanceId === s.inst("first-evolution").instanceId);
    expect(s.state.memory).toBe(6); // P-209 ordinary printed cost 3, reduced by 1

    await advance(s.engine).verb.trash([s.inst("discard-two").instanceId], 0);
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("first-evolution").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("second-evolution").instanceId);
  });

  it("the inherited filter accepts exact Titamon or Titan, but not a near name or trait", async () => {
    const source = {
      ownerSeat: 0 as Seat,
      permanent: () => ({ permanentId: "host" }),
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as CardSource;
    const cards = [
      { instanceId: "exact-name", cardId: "EXACT" },
      { instanceId: "trait", cardId: "TRAIT" },
      { instanceId: "near-name", cardId: "NEAR_NAME" },
      { instanceId: "near-trait", cardId: "NEAR_TRAIT" },
      { instanceId: "option", cardId: "OPTION" },
    ];
    const definitions: Record<string, Partial<CardDefinition>> = {
      HOST: { kinds: [CardKind.Digimon], types: ["Titan"] },
      EXACT: { kinds: [CardKind.Digimon], nameEn: "Titamon", types: [] },
      TRAIT: { kinds: [CardKind.Digimon], nameEn: "Other", types: ["Titan"] },
      NEAR_NAME: { kinds: [CardKind.Digimon], nameEn: "Titamon X", types: [] },
      NEAR_TRAIT: { kinds: [CardKind.Digimon], nameEn: "Other", types: ["Titanic"] },
      OPTION: { kinds: [CardKind.Option], nameEn: "Titamon", types: ["Titan"] },
    };
    let watcher: Parameters<Primitives["subscribeSubTrigger"]>[0] | undefined;
    const offered: string[][] = [];
    const ctx = {
      source,
      game: {
        player: () => ({ trash: cards }),
        permanentById: () => ({ permanentId: "host", inBreeding: false, topCard: { cardId: "HOST" } }),
        definitionOf: (card: { cardId: string }) => definitions[card.cardId]!,
      } as unknown as GameAccess,
      ask: {
        optional: vi.fn(async () => true),
        selectCards: vi.fn(async (_ctx, options: { candidates: string[] }) => {
          offered.push(options.candidates);
          return [];
        }),
      },
      fx: { subscribeSubTrigger: vi.fn((registered) => (watcher = registered)) },
    } as unknown as EffectContext;

    await module.effectsForTiming(EffectTiming.None, source)[0]!.resolve(ctx);
    expect(watcher).toBeDefined();
    await watcher!.run({ ...ctx, trigger: { handTrashedSeat: 0 } } as EffectContext);
    expect(offered).toEqual([["exact-name", "trait"]]);
  });
});
