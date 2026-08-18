import { describe, it, expect } from "vitest";
import { EffectTiming, type CardInstance, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type {
  DecisionApi,
  EffectContext,
  GameAccess,
  Primitives,
} from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX1-020.js";

// A3 for EX1-020 (Plesiomon):
//   [Your Turn][Once Per Turn] When one of YOUR OPPONENT's Digimon's digivolution
//     cards is trashed, <Draw 2>. Modeled as a turnTiming installing a one-shot
//     subscribeSubTrigger on "whenDigivolutionTrashed".
//   [Your Turn] Static: this Digimon can attack opponent's unsuspended Digimon with
//     no digivolution cards.
//
// FAILS-WHEN-REVERTED: the legacy declarative effect record has no executable action for the
// draw-on-divi-trashed trigger; grantCanAttackUnsuspended is also absent.

const SELF_INST = "self-inst";
const SELF_PERM = "plesiomon-perm";
const OPP_DIGIMON_PERM = "opp-digimon-perm";

function card(instanceId: string, cardId: string, seat: Seat = 0): CardInstance {
  return { instanceId, cardId, ownerSeat: seat, faceUp: true } as CardInstance;
}

function makeSource(isOnField = true, isOwnersTurn = true): CardSource {
  return {
    instanceId: SELF_INST,
    cardId: "EX1-020",
    ownerSeat: 0 as Seat,
    definition: {
      cardId: "EX1-020",
      set: "EX1",
      nameEn: "Plesiomon",
      kinds: ["Digimon"] as never,
      colors: ["Blue"] as never,
      playCost: 9,
      dp: 10000,
      level: 6,
      evoCosts: [],
      maxCountInDeck: 4,
    },
    permanent: () =>
      ({
        permanentId: SELF_PERM,
        controllerSeat: 0 as Seat,
        topCard: { instanceId: SELF_INST, cardId: "EX1-020", ownerSeat: 0 as Seat, faceUp: true } as never,
        stack: [] as CardInstance[],
        isSuspended: false,
        baseDP: 10000,
        currentDP: 10000,
      }) as never,
    isOnBattleArea: () => isOnField,
    isOwnersTurn: () => isOwnersTurn,
    hasColor: () => false,
  };
}

interface SubTriggerInstall {
  event: string;
  sourcePermanentId?: string;
  once?: boolean;
  expiresOnTurnEndOf?: Seat;
  description?: string;
  matches?: (ctx: EffectContext) => boolean;
  run: (ctx: EffectContext) => Promise<void>;
}

function makeCtx(
  source: CardSource,
  opts: {
    isOwnersTurn?: boolean;
    opponentDigimonSeat?: Seat;
  } = {},
): {
  ctx: EffectContext;
  recorder: { calls: { verb: string; args: unknown[] }[] };
  capturedSubTrigger: SubTriggerInstall | undefined;
} {
  const { opponentDigimonSeat = 1 } = opts;

  const recorder: { calls: { verb: string; args: unknown[] }[] } = { calls: [] };
  let capturedSubTrigger: SubTriggerInstall | undefined;

  const players = [
    {
      seat: 0 as Seat,
      hand: [],
      security: [],
      battleArea: [
        {
          permanentId: SELF_PERM,
          topCard: card(SELF_INST, "EX1-020", 0),
          isSuspended: false,
          stack: [] as CardInstance[],
          baseDP: 10000,
          currentDP: 10000,
        },
      ],
      deck: [],
      trash: [],
    },
    {
      seat: 1 as Seat,
      hand: [],
      security: [],
      battleArea: [
        {
          permanentId: OPP_DIGIMON_PERM,
          topCard: card("opp-top", "OPP-DIGIMON", opponentDigimonSeat),
          isSuspended: false,
          controllerSeat: 1 as Seat,
          stack: [card("opp-divi-1", "OPP-DIVI", opponentDigimonSeat)],
          baseDP: 5000,
          currentDP: 5000,
        },
      ],
      deck: [],
      trash: [],
    },
  ];

  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) => {
      for (const player of players) {
        const perm = player.battleArea.find((p: { permanentId: string }) => p.permanentId === id);
        const oppFirst = players[1]?.battleArea[0];
        if (perm !== undefined) return { ...perm, controllerSeat: perm === oppFirst ? 1 : 0 } as never;
      }
      return undefined;
    },
    definitionOf: (_c: { cardId: string }) =>
      ({
        cardId: _c.cardId,
        kinds: ["Digimon"],
        nameEn: "Test",
        level: 5,
        playCost: 7,
        colors: ["Blue"],
      }) as never,
  };

  const fx: Partial<Primitives> = {
    subscribeSubTrigger: (sub: SubTriggerInstall) => {
      recorder.calls.push({ verb: "subscribeSubTrigger", args: [sub] });
      capturedSubTrigger = sub;
      return 1;
    },
    grantCanAttackUnsuspended: (...args) => {
      recorder.calls.push({ verb: "grantCanAttackUnsuspended", args });
    },
    draw: async (...args) => {
      recorder.calls.push({ verb: "draw", args });
      return [];
    },
  };

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  const ctx: EffectContext = {
    source,
    trigger: {},
    game,
    fx: fx as Primitives,
    ask,
  };

  return { ctx, recorder, capturedSubTrigger };
}

describe("EX1-020 Plesiomon", () => {
  const module = getEffectModule("EX1-020");

  it("is registered on import", () => {
    expect(module, "EX1-020 must self-register").toBeDefined();
  });

  it("produces an OnStartTurn effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source)).toHaveLength(1);
  });

  it("produces a None (static) effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
  });

  it("[Your Turn] turnTiming installs subscribeSubTrigger for whenDigivolutionTrashed", async () => {
    // FAILS-WHEN-REVERTED: the legacy fallback installs no subscribeSubTrigger call
    const source = makeSource(true, true);
    const { ctx, recorder } = makeCtx(source);
    const effects = module!.effectsForTiming(EffectTiming.OnStartTurn, source);
    await effects[0]!.resolve(ctx);

    const subCalls = recorder.calls.filter((c) => c.verb === "subscribeSubTrigger");
    expect(subCalls).toHaveLength(1);
    const sub = subCalls[0]!.args[0] as SubTriggerInstall;
    expect(sub.event).toBe("whenDigivolutionTrashed");
    expect(sub.once).toBe(true);
    expect(sub.expiresOnTurnEndOf).toBe(0); // owner seat
  });

  it("[Your Turn] the installed SubTrigger calls draw 2 when it fires", async () => {
    // FAILS-WHEN-REVERTED: no draw call in IR
    const source = makeSource(true, true);
    const { ctx, recorder, capturedSubTrigger: subRef } = makeCtx(source);
    const effects = module!.effectsForTiming(EffectTiming.OnStartTurn, source);
    await effects[0]!.resolve(ctx);

    // Now manually fire the subtrigger's run callback
    const subCalls = recorder.calls.filter((c) => c.verb === "subscribeSubTrigger");
    const sub = subCalls[0]!.args[0] as SubTriggerInstall;

    const firedRecorder: { calls: { verb: string; args: unknown[] }[] } = { calls: [] };
    const fireFx: Partial<Primitives> = {
      draw: async (...args) => {
        firedRecorder.calls.push({ verb: "draw", args });
        return [];
      },
    };
    const fireCtx: EffectContext = {
      ...ctx,
      fx: fireFx as Primitives,
    };
    await sub.run(fireCtx);

    const drawCalls = firedRecorder.calls.filter((c) => c.verb === "draw");
    expect(drawCalls).toHaveLength(1);
    expect(drawCalls[0]!.args[1]).toBe(2);
  });

  it("[Static] calls grantCanAttackUnsuspended on self permanent", async () => {
    // FAILS-WHEN-REVERTED: IR has no grantCanAttackUnsuspended call
    const source = makeSource(true, true);
    const { ctx, recorder } = makeCtx(source);
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    await effects[0]!.resolve(ctx);

    const grantCalls = recorder.calls.filter((c) => c.verb === "grantCanAttackUnsuspended");
    expect(grantCalls).toHaveLength(1);
    expect(grantCalls[0]!.args[0]).toBe(SELF_PERM);
  });

  it("[Static] grantCanAttackUnsuspended includes noDigivolutionCards option", async () => {
    const source = makeSource(true, true);
    const { ctx, recorder } = makeCtx(source);
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    await effects[0]!.resolve(ctx);

    const grantCalls = recorder.calls.filter((c) => c.verb === "grantCanAttackUnsuspended");
    expect(grantCalls).toHaveLength(1);
    // Third arg is the opts object
    const grantOpts = grantCalls[0]!.args[2] as { noDigivolutionCards?: boolean } | undefined;
    expect(grantOpts?.noDigivolutionCards).toBe(true);
  });
});
