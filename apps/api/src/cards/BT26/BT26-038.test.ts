import {
  CardColor,
  CardKind,
  EffectDuration,
  EffectTiming,
  digivolutionRequirementsFor,
  type CardDefinition,
  type CardInstance,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT26-038.js";
import "../index.js";

const CARD_ID = "BT26-038";
function def(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "TEST",
    set: "TEST",
    nameEn: "Fixture",
    colors: over.colors ?? [CardColor.Green],
    kinds: over.kinds ?? [CardKind.Digimon],
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 1000,
    evoCosts: over.evoCosts ?? [],
    maxCountInDeck: 4,
    types: over.types ?? [],
    ...over,
  };
}
function inst(instanceId: string, cardId: string): CardInstance {
  return { instanceId, cardId, ownerSeat: 0 as Seat, faceUp: true } as CardInstance;
}
function source(permanent?: Permanent, instanceId = "kuwagamon-card"): CardSource {
  return {
    instanceId,
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: def({ cardId: CARD_ID, level: 4, types: ["Insectoid", "Titan", "TS"] }),
    permanent: () => permanent,
    isOnBattleArea: () => permanent !== undefined,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-038 Kuwagamon", () => {
  it("uses the exact Lv.3 [TS] cost-2 path and rejects an off-color non-TS Lv.3", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT24-009", as: "base" }], hand: [{ card: CARD_ID, as: "kuwa" }], deck: ["BT1-009"] },
    });
    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("kuwa").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "AD1-002", as: "base" }], hand: [{ card: CARD_ID, as: "kuwa" }] },
    });
    illegal.state.memory = 2;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("kuwa").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("on play may suspend either player's Digimon and buffs the chosen own trait Digimon (Q7018)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "kuwa" }], battleArea: [{ card: "BT1-066", as: "own" }] },
        1: { battleArea: [{ card: "AD1-002", as: "opponent" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").permanentId);
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kuwa").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("own").currentDP === 5000);
    await settle();
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("own").isSuspended).toBe(false);
    expect(s.perm("own").currentDP).toBe(5000);
    expect(s.state.memory).toBe(0);
  });

  it("can decline suspension, still performs Then, and enforces trait/controller/zone boundaries", async () => {
    const make = (id: string, cardId: string, inBreeding = false) =>
      ({ permanentId: id, topCard: inst(`${id}-card`, cardId), inBreeding }) as Permanent;
    const host = make("host", CARD_ID),
      titan = make("titan", "TITAN"),
      near = make("near", "NEAR"),
      tamer = make("tamer", "TAMER"),
      breeding = make("breeding", "TITAN", true),
      opponent = make("opponent", "TITAN");
    const defs: Record<string, CardDefinition> = {
      [CARD_ID]: def({ types: ["Insectoid", "Titan"] }),
      TITAN: def({ types: ["Titan"] }),
      NEAR: def({ types: ["Ancient Insect"] }),
      TAMER: def({ kinds: [CardKind.Tamer], types: ["Titan"] }),
    };
    const game = {
      player: (seat: Seat) => ({ battleArea: seat === 0 ? [host, titan, near, tamer, breeding] : [opponent] }),
      definitionOf: (card: CardInstance) => defs[card.cardId]!,
    } as unknown as GameAccess;
    const chooseTargets = vi
      .fn<(...args: any[]) => any>()
      .mockImplementationOnce(async (_ctx, opts: { candidates: string[] }) => {
        expect(new Set(opts.candidates)).toEqual(new Set(["host", "titan", "near", "opponent"]));
        return [];
      })
      .mockImplementationOnce(async (_ctx, opts: { candidates: string[] }) => {
        expect(new Set(opts.candidates)).toEqual(new Set(["host", "titan"]));
        return ["titan"];
      });
    const suspend = vi.fn(),
      modifyDP = vi.fn(),
      cardSource = source(host);
    await module.effectsForTiming(EffectTiming.WhenDigivolving, cardSource)[0]!.resolve({
      source: cardSource,
      game,
      ask: { chooseTargets },
      fx: { suspend, modifyDP } as unknown as Primitives,
    } as unknown as EffectContext);
    expect(suspend).not.toHaveBeenCalled();
    expect(modifyDP).toHaveBeenCalledWith("titan", 3000, EffectDuration.UntilOpponentTurnEnd);
  });

  it("fires When Moving only for this moved permanent", () => {
    const host = { permanentId: "host" } as Permanent,
      cardSource = source(host);
    const effect = module.effectsForTiming(EffectTiming.OnMove, cardSource)[0]!;
    expect(effect.canTrigger({ source: cardSource, trigger: { movedPermanentId: "host" } } as EffectContext)).toBe(
      true,
    );
    expect(effect.canTrigger({ source: cardSource, trigger: { movedPermanentId: "other" } } as EffectContext)).toBe(
      false,
    );
  });

  it("wins a real Security Digimon battle and evolves a legal trait host for exactly 1 less (Q7020)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-081", under: [{ card: CARD_ID, as: "inherited" }], as: "winner" },
            { card: CARD_ID, as: "target" },
          ],
          hand: [{ card: "BT26-042", as: "evolution" }],
          deck: ["BT1-009"],
        },
        1: { security: ["AD1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.instanceId === s.inst("evolution").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("target").stack.some((card) => card.cardId === CARD_ID)).toBe(true);
  });

  it("offers only legal pairs and releases its per-instance OPT on decline or failure", async () => {
    const winner = { permanentId: "winner", topCard: inst("winner-card", "WINNER"), inBreeding: false } as Permanent;
    const legal = { permanentId: "legal", topCard: inst("legal-card", "L4"), inBreeding: false } as Permanent;
    const wrong = { permanentId: "wrong", topCard: inst("wrong-card", "L3"), inBreeding: false } as Permanent;
    const breeding = { permanentId: "breeding", topCard: inst("breed-card", "L4"), inBreeding: true } as Permanent;
    const legalEvo = inst("legal-evo", "L5"),
      illegalEvo = inst("illegal-evo", "L6");
    const defs: Record<string, CardDefinition> = {
      WINNER: def({ level: 6, types: ["Insectoid"] }),
      L3: def({ level: 3, types: ["Insectoid"] }),
      L4: def({ level: 4, types: ["Titan"] }),
      L5: def({ level: 5, types: ["Insectoid"], evoCosts: [{ color: CardColor.Green, level: 4, memoryCost: 3 }] }),
      L6: def({ level: 6, types: ["Titan"], evoCosts: [{ color: CardColor.Green, level: 5, memoryCost: 3 }] }),
    };
    const game = {
      player: () => ({ battleArea: [winner, legal, wrong, breeding], hand: [legalEvo, illegalEvo] }),
      permanentById: (id: string) => [winner, legal, wrong, breeding].find((p) => p.permanentId === id),
      definitionOf: (card: CardInstance) => defs[card.cardId]!,
    } as unknown as GameAccess;
    const installs: SubTriggerInstall[] = [],
      cardSource = source(winner);
    await module.effectsForTiming(EffectTiming.None, cardSource)[0]!.resolve({
      source: cardSource,
      fx: { subscribeSubTrigger: (install: SubTriggerInstall) => installs.push(install) },
    } as unknown as EffectContext);
    const watcher = installs[0]!;
    expect(watcher.oncePerTurnKey).toBe(`${cardSource.instanceId}/${CARD_ID}/inherited-battle-won-digivolve`);
    const declined = {
      source: cardSource,
      trigger: { subjectPermanentId: "winner" },
      game,
      ask: { optional: vi.fn(async () => false) },
      fx: {},
      oncePerTurnActivationDeclined: false,
    } as unknown as EffectContext;
    expect(watcher.matches!(declined)).toBe(true);
    await watcher.run(declined);
    expect(declined.oncePerTurnActivationDeclined).toBe(true);

    const digivolveFromInstance = vi.fn(async () => undefined);
    const failed = {
      ...declined,
      ask: {
        optional: vi.fn(async () => true),
        chooseTargets: vi.fn(async (_ctx, opts: { candidates: string[] }) => {
          expect(opts.candidates).toEqual(["legal"]);
          return ["legal"];
        }),
        selectCards: vi.fn(async (_ctx, opts: { candidates: string[] }) => {
          expect(opts.candidates).toEqual(["legal-evo"]);
          return ["legal-evo"];
        }),
      },
      fx: { digivolveFromInstance },
      oncePerTurnActivationDeclined: false,
    } as unknown as EffectContext;
    await watcher.run(failed);
    expect(digivolveFromInstance).toHaveBeenCalledWith("legal", "legal-evo", { payCost: true, costDelta: -1 });
    expect(failed.oncePerTurnActivationDeclined).toBe(true);
  });

  it("uses independent inherited OPT keys for physical copies", async () => {
    const installs: SubTriggerInstall[] = [];
    for (const cardSource of [
      source({ permanentId: "a" } as Permanent, "copy-a"),
      source({ permanentId: "b" } as Permanent, "copy-b"),
    ]) {
      await module.effectsForTiming(EffectTiming.None, cardSource)[0]!.resolve({
        source: cardSource,
        fx: { subscribeSubTrigger: (install: SubTriggerInstall) => installs.push(install) },
      } as unknown as EffectContext);
    }
    expect(installs.map((i) => i.oncePerTurnKey)).toEqual([
      `copy-a/${CARD_ID}/inherited-battle-won-digivolve`,
      `copy-b/${CARD_ID}/inherited-battle-won-digivolve`,
    ]);
  });
});
