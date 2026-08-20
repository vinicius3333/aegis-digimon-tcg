import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT26-049.js";
import "../index.js";

const CARD_ID = "BT26-049";

function source(): CardSource {
  return {
    instanceId: "rosemon",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: {} as CardDefinition,
    permanent: () => ({ permanentId: "rosemon-permanent" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-049 Rosemon", () => {
  it("uses the [Lilamon] alternate evolution path for cost 3 instead of ordinary 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-044", as: "lilamon" }],
          hand: [{ card: CARD_ID, as: "rosemon" }],
          deck: ["BT5-022"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lilamon").permanentId,
        instanceId: s.inst("rosemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lilamon").topCard.instanceId === s.inst("rosemon").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("shares one OPT across When Digivolving/When Attacking and only offers unsuspended opponent cards", async () => {
    const cardSource = source();
    const opponent = [
      { permanentId: "digimon", inBreeding: false, isSuspended: false, topCard: { cardId: "DIGIMON" } },
      { permanentId: "tamer", inBreeding: false, isSuspended: false, topCard: { cardId: "TAMER" } },
      { permanentId: "already", inBreeding: false, isSuspended: true, topCard: { cardId: "DIGIMON" } },
    ];
    const suspend = vi.fn();
    const ctx = {
      source: cardSource,
      game: {
        opponentOf: () => 1 as Seat,
        player: (seat: Seat) => ({ battleArea: seat === 1 ? opponent : [] }),
        definitionOf: (card: { cardId: string }) => ({
          kinds: [card.cardId === "TAMER" ? CardKind.Tamer : CardKind.Digimon],
        }),
      } as unknown as GameAccess,
      ask: {
        chooseTargets: vi.fn(async (_ctx, options: { candidates: string[] }) => {
          expect(options.candidates).toEqual(["digimon", "tamer"]);
          return options.candidates;
        }),
      },
      fx: { suspend },
    } as unknown as EffectContext;
    const effects = [EffectTiming.WhenDigivolving, EffectTiming.OnAllyAttack].map(
      (timing) => module.effectsForTiming(timing, cardSource)[0]!,
    );

    expect(new Set(effects.map(({ effectKey }) => effectKey))).toEqual(new Set([`${CARD_ID}/wd-wa-suspend-2`]));
    await effects[0]!.resolve(ctx);
    expect(suspend).toHaveBeenCalledWith(["digimon", "tamer"]);
  });

  it("plays a cost-4 DATA SQUAD Tamer for free after one opposing Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rosemon" }],
          hand: [{ card: "BT26-091", as: "tamer" }],
        },
        1: { battleArea: [{ card: "BT5-022", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT26-091"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("installs both trigger routes with one instance-scoped key and requires an effect trash under a Tamer", async () => {
    const installed: SubTriggerInstall[] = [];
    const cardSource = source();
    const tamer = {
      permanentId: "tamer",
      controllerSeat: 0 as Seat,
      topCard: { cardId: "TAMER" },
      inBreeding: false,
    };
    const ctx = {
      source: cardSource,
      game: {
        permanentById: () => tamer,
        definitionOf: () => ({ kinds: [CardKind.Tamer] }),
      },
      fx: { subscribeSubTrigger: vi.fn((sub) => installed.push(sub)) } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = module
      .effectsForTiming(EffectTiming.None, cardSource)
      .find(({ effectKey }) => effectKey.endsWith("all-turns-free-play-or-use"))!;

    await effect.resolve(ctx);
    expect(installed).toHaveLength(2);
    expect(new Set(installed.map(({ oncePerTurnKey }) => oncePerTurnKey))).toEqual(
      new Set([`rosemon/${CARD_ID}/all-turns-free-play-or-use`]),
    );
    const trashWatcher = installed.find(({ event }) => event === "whenDigivolutionTrashed")!;
    expect(trashWatcher.matches!({ ...ctx, trigger: { subjectPermanentId: "tamer" } } as EffectContext)).toBe(false);
    expect(
      trashWatcher.matches!({ ...ctx, trigger: { subjectPermanentId: "tamer", byEffectSeat: 1 } } as EffectContext),
    ).toBe(true);
  });
});
