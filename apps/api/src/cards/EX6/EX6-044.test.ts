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
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
// The REAL authored IR (a hand-override exports it so the A3 asserts against the on-disk source).
import { compiled as EX6_044 } from "./EX6-044.js";
import "../index.js";

/**
 * Full-machinery A3 for EX6-044 BryweLudramon's conditional-leave-prevention (plan 08-04),
 * composing the EXISTING Replacement-prevent path (leavePrevention.ts / interpreter.ts):
 *
 *   ESS (inherited): "[Opponent's Turn] [RagnaLoardmon] can't leave the battle area other than
 *    by your effects or by deletion."  (documented behavior — inherited rule implementation,
 *    CanUseProtectionCondition = IsOpponentTurn && !IsByEffect(owner's own effect).)
 *
 * KB authority (node tools/kb/query.mjs card EX6-044): Q3771 — a deletion effect activated by the
 * opponent DOES delete a [RagnaLoardmon] carrying this card as a digivolution. So the prevention
 * blocks a MOVE/bounce/return but must NOT block deletion.
 *
 * Open question 4 (resolved): the documented behavior is opponent's-turn-only + inherited; modeled as an
 * `[Opponent's Turn]` inherited Replacement prevent (leaveCause:"otherThanYourEffect",
 * exceptDeletion:true). The opponent's-turn gate is the turnOwnerGuard the IR derives from the
 * "OpponentsTurn" trigger; this harness exercises the prevent subscription directly.
 *
 * FAILS-WHEN-REVERTED:
 *   - change leaveCause "otherThanYourEffect" -> "any": the OWNER's-own-effect bounce is then
 *     wrongly prevented => the "owner bounce allowed" assertion goes RED.
 *   - drop exceptDeletion: a deletion is then wrongly prevented => the "deletion still dies"
 *     (Q3771) assertion goes RED.
 */

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

/** `turnSeat` decides whose turn it is; the prevent only installs on the opponent's turn. */
function harness(opts?: { turnSeat?: Seat }): Harness {
  seq = 0;
  const state = new GameState();
  state.turnSeat = opts?.turnSeat ?? 1; // default: opponent's (seat 1) turn so the ESS is active
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
      // The ESS prevent is filed under the continuous/static window (EffectTiming.None) by the
      // "OpponentsTurn" trigger; resolving it installs the prevent subscription.
      const module = irCardModule("EX6-044", EX6_044);
      const src = createCardSource(sourcePermanent.topCard!, stateLookup);
      const effects = module.effectsForTiming(EffectTiming.None, src);
      for (const e of effects) await e.resolve(sourceContext(sourcePermanent));
    },
  };
}

/**
 * A RagnaLoardmon permanent on seat 0 carrying EX6-044 as a digivolution source (so the inherited
 * ESS is active). topCard name must contain "RagnaLoardmon" for the prevent's self/name gate.
 */
function ragnaLoardmon(state: GameState): Permanent {
  const p = new Permanent();
  p.permanentId = "p-ragna";
  p.controllerSeat = 0;
  const top = card(DIGIMON, 0);
  p.topCard = top;
  p.baseDP = 8000;
  p.currentDP = 8000;
  const ess = card("EX6-044", 0); // the inherited source supplying the protection
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
    const h = harness({ turnSeat: 1 }); // opponent's turn
    const ragna = ragnaLoardmon(h.state);
    await h.installPrevent(ragna);

    // Opponent (seat 1) returns/bounces RagnaLoardmon to hand.
    await h.fx.returnToHand([ragna.topCard!.instanceId]);

    // Still on the battle area; not in seat 0's hand.
    expect(h.state.players[0]!.battleArea.some((p) => p.permanentId === "p-ragna")).toBe(true);
    expect(h.state.players[0]!.hand.length).toBe(0);
  });

  it("ALLOWS the controller's OWN effect to bounce it (otherThanYourEffect)", async () => {
    const h = harness({ turnSeat: 1 });
    const ragna = ragnaLoardmon(h.state);
    await h.installPrevent(ragna);

    // The owner (seat 0) bounces it via their own effect (resolvingSeat = 0).
    const prevented = await h.consult([ragna.permanentId], "byEffect", 0, { isBounce: true });
    expect(prevented.has(ragna.permanentId)).toBe(false);
  });

  it("does NOT prevent a DELETION — RagnaLoardmon still dies (Q3771)", async () => {
    const h = harness({ turnSeat: 1 });
    const ragna = ragnaLoardmon(h.state);
    await h.installPrevent(ragna);

    // Opponent deletes it: a deletion is NOT a "leave other than by deletion" -> not prevented.
    await h.fx.deletePermanent([ragna.permanentId]);

    expect(h.state.players[0]!.battleArea.some((p) => p.permanentId === "p-ragna")).toBe(false);
  });
});

describe("EX6-044 public continuous runtime", () => {
  it("exposes Blocker on a BryweLudramon permanent after public engine setup", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-044", as: "brywe" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("brywe"), "Blocker")).toBe(true);
  });
});
