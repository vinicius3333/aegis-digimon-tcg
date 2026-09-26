import { describe, it, expect } from "vitest";
import {
  GameState,
  PlayerState,
  Permanent,
  CardInstance,
  EffectTiming,
  type Seat,
  type ServerEvent,
} from "@aegis/shared";
import { MemoryGauge } from "../../engine/MemoryGauge.js";
import { ModifierLedger } from "../../engine/effects/modifiers.js";
import { SubTriggerRegistry } from "../../engine/effects/subtriggers.js";
import { createPrimitives, type PrimitivesEngine, type SelectionPort } from "../../engine/effects/primitives.js";
import { createCardSource, type CardStateLookup } from "../../engine/cards/CardSource.js";
import { createGameAccess, createEffectContext } from "../../engine/effects/context.js";
import { consultLeavePrevention, type LeavePreventionHost } from "../../engine/effects/leavePrevention.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import type { EffectContext, RemovalCause } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled as EX6_044 } from "./EX6-044.js";
import "../index.js";

let seq = 0;
function card(cardId: string, seat: Seat): CardInstance {
  seq += 1;
  const c = new CardInstance();
  c.instanceId = `i${seq}`;
  c.cardId = cardId;
  c.ownerSeat = seat;
  c.faceUp = true;
  return c;
}

const DIGIMON = "AD1-001";

interface Harness {
  state: GameState;
  fx: ReturnType<typeof createPrimitives>;
  consult(
    ids: string[],
    cause: RemovalCause,
    resolvingSeat?: Seat,
    opts?: { isBounce?: boolean },
  ): Promise<Set<string>>;
  installPrevent(sourcePermanent: Permanent): Promise<void>;
}

function harness(opts?: { turnSeat?: Seat }): Harness {
  seq = 0;
  const state = new GameState();
  state.turnSeat = opts?.turnSeat ?? 1;
  state.memory = 0;
  for (const seat of [0, 1] as Seat[]) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }

  const events: ServerEvent[] = [];
  const ledger = new ModifierLedger();
  const memory = new MemoryGauge(state, (e) => events.push(e));
  const subTriggers = new SubTriggerRegistry();
  const reentryGuard = { activeReplacementKeys: new Set<string>() };

  const ask: SelectionPort = {
    selectInstances: async (_seat, candidates, _min, max) => candidates.slice(0, max),
  };

  const permanentById = (id: string): Permanent | undefined => {
    for (const p of state.players) for (const perm of p.battleArea) if (perm.permanentId === id) return perm;
    return undefined;
  };

  const stateLookup: CardStateLookup = {
    permanentOf: (instanceId) => {
      for (const p of state.players)
        for (const perm of p.battleArea) {
          if (perm.topCard?.instanceId === instanceId) return perm;
          if (perm.stack.some((c) => c.instanceId === instanceId)) return perm;
        }
      return undefined;
    },
    isOnBattleArea: (instanceId) => {
      for (const p of state.players)
        for (const perm of p.battleArea) {
          if (perm.topCard?.instanceId === instanceId) return true;
          if (perm.stack.some((c) => c.instanceId === instanceId)) return true;
        }
      return false;
    },
    isSeatsTurn: (seat) => state.turnSeat === seat,
  };

  const decisionApi = {
    selectPermanents: async () => [],
    optional: async () => true,
    chooseTargets: async () => [],
    selectCards: async () => [],
    chooseOption: async () => 0,
  };

  const sourceContext = (sourcePermanent: Permanent, leavingId?: string): EffectContext =>
    createEffectContext({
      source: createCardSource(sourcePermanent.topCard!, stateLookup),
      trigger: leavingId ? { deletedPermanentId: leavingId } : {},
      game: createGameAccess(state),
      fx,
      ask: decisionApi,
    });

  const host: LeavePreventionHost = {
    subTriggers,
    permanentById,
    buildContext: (srcPerm, leavingId) => sourceContext(srcPerm, leavingId),
    turnSeat: state.turnSeat,
  };

  const engine: PrimitivesEngine = {
    state,
    emit: (e) => events.push(e),
    nextPermanentId: () => "p-x",
    memory,
    modifiers: ledger,
    subTriggers,
    ask,
    controllerSeat: () => state.turnSeat,
    consultLeavePrevention: (ids, cause, resolvingSeat, o) =>
      consultLeavePrevention(host, ids, cause, resolvingSeat, { isBounce: o?.isBounce, reentryGuard }),
  };

  const fx = createPrimitives(engine);

  return {
    state,
    fx,
    consult: (ids, cause, resolvingSeat, o) =>
      consultLeavePrevention(host, ids, cause, resolvingSeat, { isBounce: o?.isBounce, reentryGuard }),
    installPrevent: async (sourcePermanent) => {
      const module = irCardModule("EX6-044", EX6_044);
      const src = createCardSource(sourcePermanent.topCard!, stateLookup);
      const effects = module.effectsForTiming(EffectTiming.None, src);
      for (const e of effects) await e.resolve(sourceContext(sourcePermanent));
    },
  };
}

function ragnaLoardmon(state: GameState): Permanent {
  const p = new Permanent();
  p.permanentId = "p-ragna";
  p.controllerSeat = 0;
  const top = card(DIGIMON, 0);
  p.topCard = top;
  p.baseDP = 8000;
  p.currentDP = 8000;
  const ess = card("EX6-044", 0);
  p.stack.push(ess);
  state.players[0]!.battleArea.push(p);
  return p;
}

describe("EX6-044 BryweLudramon — conditional leave-prevention (documented behavior inherited documented rule, IsOpponentTurn)", () => {
  it("authors an [Opponent's Turn] inherited wouldLeavePlay prevent, leaveCause otherThanYourEffect, exceptDeletion", () => {
    const prevents = (EX6_044.effects ?? [])
      .filter((e) => e.trigger === "OpponentsTurn" && (e.isInherited ?? false))
      .flatMap((e) => e.actions ?? [])
      .filter((a) => (a as { kind?: string }).kind === "Replacement") as {
      event?: string;
      mode?: string;
      leaveCause?: string;
      exceptDeletion?: boolean;
    }[];
    expect(prevents.length).toBeGreaterThan(0);
    const p = prevents[0]!;
    expect(p.event).toBe("wouldLeavePlay");
    expect(p.mode).toBe("prevent");
    expect(p.leaveCause).toBe("otherThanYourEffect");
    expect(p.exceptDeletion).toBe(true);
  });

  it("PREVENTS an opponent's bounce on the opponent's turn (can't leave other than by your effect)", async () => {
    const h = harness({ turnSeat: 1 });
    const ragna = ragnaLoardmon(h.state);
    await h.installPrevent(ragna);

    await h.fx.returnToHand([ragna.topCard!.instanceId]);

    expect(h.state.players[0]!.battleArea.some((p) => p.permanentId === "p-ragna")).toBe(true);
    expect(h.state.players[0]!.hand.length).toBe(0);
  });

  it("ALLOWS the controller's OWN effect to bounce it (otherThanYourEffect)", async () => {
    const h = harness({ turnSeat: 1 });
    const ragna = ragnaLoardmon(h.state);
    await h.installPrevent(ragna);

    const prevented = await h.consult([ragna.permanentId], "byEffect", 0, { isBounce: true });
    expect(prevented.has(ragna.permanentId)).toBe(false);
  });

  it("does NOT prevent a DELETION — RagnaLoardmon still dies (Q3771)", async () => {
    const h = harness({ turnSeat: 1 });
    const ragna = ragnaLoardmon(h.state);
    await h.installPrevent(ragna);

    await h.fx.deletePermanent([ragna.permanentId]);

    expect(h.state.players[0]!.battleArea.some((p) => p.permanentId === "p-ragna")).toBe(false);
  });
});

describe("EX6-044 public continuous runtime", () => {
  it("publicly pays 3 and places itself under a legal host, de-Digivolving every opponent at or below host DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-010", as: "host" }],
          hand: [{ card: "EX6-044", as: "brywe" }],
        },
        1: {
          battleArea: [
            { card: "BT1-060", as: "lower", under: ["BT1-009"] },
            { card: "EX6-010", as: "equal", under: ["BT1-009"] },
            { card: "EX6-011", as: "higher", under: ["BT1-009"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const [effect] = JSON.parse(s.inst("brywe").activatableEffectsJson || "[]") as Array<{ effectKey: string }>;
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("brywe").instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("host").stack.some((entry) => entry.instanceId === s.inst("brywe").instanceId) &&
        s.perm("lower").topCard?.instanceId === s.inst("lower").instanceId &&
        s.perm("equal").topCard?.instanceId === s.inst("equal").instanceId,
    );

    expect(s.state.players[0]!.hand.some((entry) => entry.instanceId === s.inst("brywe").instanceId)).toBe(false);
    expect(s.perm("host").stack.some((entry) => entry.instanceId === s.inst("brywe").instanceId)).toBe(true);
    expect(s.state.players[1]!.trash.map((entry) => entry.instanceId)).toEqual(
      expect.arrayContaining([s.inst("lower").instanceId, s.inst("equal").instanceId]),
    );
    expect(s.perm("lower").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("equal").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("higher").topCard?.instanceId).toBe(s.inst("higher").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("does not offer its paid Main effect without a legal level-6 or Legend-Arms host (Q3770)", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX6-044", as: "brywe" }] } });
    s.state.memory = 3;
    await s.ready();

    expect(JSON.parse(s.inst("brywe").activatableEffectsJson || "[]")).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((entry) => entry.instanceId === s.inst("brywe").instanceId)).toBe(true);
  });

  it("prevents an opponent's real Option bounce but permits their public deletion effect (Q3771)", async () => {
    const bounce = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-011", as: "ragna", under: ["EX6-044"] }] },
        1: {
          battleArea: [{ card: "EX6-013", as: "blue" }],
          hand: [{ card: "BT13-105", as: "bounce" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    bounce.state.turnSeat = 1;
    bounce.state.memory = 8;
    await bounce.ready();
    expect(bounce.engine.applyIntent(1, { type: "playCard", instanceId: bounce.inst("bounce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      bounce.state.players[1]!.trash.some((entry) => entry.instanceId === bounce.inst("bounce").instanceId),
    );
    expect(
      bounce.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === bounce.inst("ragna").instanceId),
    ).toBe(true);
    expect(bounce.state.players[0]!.hand.some((entry) => entry.instanceId === bounce.inst("ragna").instanceId)).toBe(
      false,
    );

    const deletion = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-011", as: "ragna", under: ["EX6-044"] }] },
        1: {
          battleArea: [{ card: "EX6-011", as: "host" }],
          hand: [{ card: "EX6-010", as: "durandamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    deletion.state.turnSeat = 1;
    deletion.state.memory = 3;
    await deletion.ready();
    const [effect] = JSON.parse(deletion.inst("durandamon").activatableEffectsJson || "[]") as Array<{
      effectKey: string;
    }>;
    expect(effect).toBeDefined();
    expect(
      deletion.engine.applyIntent(1, {
        type: "activateEffect",
        sourceInstanceId: deletion.inst("durandamon").instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !deletion.state.players[0]!.battleArea.some(
          (perm) => perm.topCard?.instanceId === deletion.inst("ragna").instanceId,
        ),
    );
    expect(
      deletion.state.players[0]!.battleArea.some(
        (perm) => perm.topCard?.instanceId === deletion.inst("ragna").instanceId,
      ),
    ).toBe(false);
    expect(
      deletion.state.players[0]!.trash.some((entry) => entry.instanceId === deletion.inst("ragna").instanceId),
    ).toBe(true);
  });

  it("exposes Blocker on a BryweLudramon permanent after public engine setup", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-044", as: "brywe" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("brywe"), "Blocker")).toBe(true);
  });
});
