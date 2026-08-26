import { describe, it, expect } from "vitest";
import { GameState, PlayerState, Permanent, CardInstance, type Seat, type ServerEvent } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { MemoryGauge } from "../MemoryGauge.js";
import { ModifierLedger } from "./modifiers.js";
import { SubTriggerRegistry } from "./subtriggers.js";
import { createPrimitives, type PrimitivesEngine, type SelectionPort } from "./primitives.js";
import { createCardSource, type CardStateLookup } from "../cards/CardSource.js";
import { createGameAccess, createEffectContext } from "./context.js";
import { consultLeavePrevention, type LeavePreventionHost } from "./leavePrevention.js";
import { irCardModule } from "./interpreter.js";
import type { EffectContext, RemovalCause } from "./EffectContext.js";
import { EffectTiming } from "@aegis/shared";

// Concrete card ids present in the generated card data (a digivolution-source-bearing
// Digimon so the trash-2-source / suspend / delete costs have material to consume).
const DIGIMON = "AD1-001"; // Digimon, DP 5000

let instanceSeq = 0;
function card(cardId: string, seat: Seat): CardInstance {
  const c = new CardInstance();
  c.instanceId = `i${instanceSeq++}`;
  c.cardId = cardId;
  c.ownerSeat = seat;
  c.faceUp = true;
  return c;
}

interface Harness {
  state: GameState;
  fx: ReturnType<typeof createPrimitives>;
  events: ServerEvent[];
  subTriggers: SubTriggerRegistry;
  /** Queue boolean answers for the prevent "you may pay?" prompt; default true. */
  optionalAnswers: boolean[];
  replacementOrder: number[];
  offeredReplacementIds: number[][];
  replacementFiredKeys: Set<string>;
  /** Resolve the consult exactly as GameEngine does (delegates to the real function). */
  consult(
    permanentIds: string[],
    cause?: RemovalCause,
    resolvingSeat?: Seat,
    opts?: { isBounce?: boolean },
  ): Promise<Set<string>>;
  /** Install a prevent subscription by running a compiled prevent card's effect. */
  installPrevent(sourcePermanent: Permanent, compiled: CompiledCard): Promise<void>;
  sourceContext(sourcePermanent: Permanent, leavingId?: string): EffectContext;
}

function harness(opts?: { turnSeat?: Seat }): Harness {
  instanceSeq = 0;
  const state = new GameState();
  state.turnSeat = opts?.turnSeat ?? 0;
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
  let permanentSeq = 0;
  const reentryGuard = { activeReplacementKeys: new Set<string>() };
  const optionalAnswers: boolean[] = [];
  const replacementOrder: number[] = [];
  const offeredReplacementIds: number[][] = [];
  const replacementFiredKeys = new Set<string>();

  const ask: SelectionPort = {
    selectInstances: async (_seat, candidates, _min, max) => candidates.slice(0, max),
  };

  const permanentById = (id: string): Permanent | undefined => {
    for (const p of state.players) {
      for (const perm of p.battleArea) if (perm.permanentId === id) return perm;
      if (p.breeding?.permanentId === id) return p.breeding;
    }
    return undefined;
  };

  const stateLookup: CardStateLookup = {
    permanentOf: (instanceId) => {
      for (const p of state.players) {
        for (const perm of p.battleArea) {
          if (perm.topCard?.instanceId === instanceId) return perm;
          if (perm.stack.some((c) => c.instanceId === instanceId)) return perm;
        }
      }
      return undefined;
    },
    isOnBattleArea: (instanceId) => {
      for (const p of state.players) {
        for (const perm of p.battleArea) {
          if (perm.topCard?.instanceId === instanceId) return true;
          if (perm.stack.some((c) => c.instanceId === instanceId)) return true;
        }
      }
      return false;
    },
    isSeatsTurn: (seat) => state.turnSeat === seat,
  };

  // The DecisionApi the prevent preventCheck calls (ctx.ask.optional answers the prompt).
  const decisionApi = {
    optional: async () => (optionalAnswers.length ? optionalAnswers.shift()! : true),
    chooseTargets: async () => [],
    selectPermanents: async () => [],
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
    orderReplacements: async (replacements) => {
      offeredReplacementIds.push(replacements.map(({ id }) => id));
      if (replacementOrder.length === 0) return replacements;
      const rank = new Map(replacementOrder.map((id, index) => [id, index]));
      return [...replacements].sort((a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER));
    },
    oncePerTurnFired: (key) => replacementFiredKeys.has(key),
    markOncePerTurnFired: (key) => replacementFiredKeys.add(key),
  };

  const engine: PrimitivesEngine = {
    state,
    emit: (e) => events.push(e),
    nextPermanentId: () => `perm-${permanentSeq++}`,
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
    events,
    subTriggers,
    optionalAnswers,
    replacementOrder,
    offeredReplacementIds,
    replacementFiredKeys,
    consult: (ids, cause = "byEffect", resolvingSeat, o) =>
      consultLeavePrevention(host, ids, cause, resolvingSeat, { isBounce: o?.isBounce, reentryGuard }),
    installPrevent: async (sourcePermanent, compiled) => {
      // The IR files an AllTurns prevent under the continuous/static window (EffectTiming.None);
      // resolving it installs the prevent subscription via runReplacement -> subscribeReplacement.
      const module = irCardModule(`TEST-${sourcePermanent.permanentId}`, compiled);
      const src = createCardSource(sourcePermanent.topCard!, stateLookup);
      const effects = module.effectsForTiming(EffectTiming.None, src);
      for (const e of effects) await e.resolve(sourceContext(sourcePermanent));
    },
    sourceContext,
  };
}

function putPermanent(state: GameState, seat: Seat, permanentId: string, opts?: { sources?: number }): Permanent {
  const p = new Permanent();
  p.permanentId = permanentId;
  p.controllerSeat = seat;
  const top = card(DIGIMON, seat);
  top.instanceId = `${permanentId}-top`;
  p.topCard = top;
  p.baseDP = 5000;
  p.currentDP = 5000;
  for (let i = 0; i < (opts?.sources ?? 0); i++) {
    const s = card(DIGIMON, seat);
    s.instanceId = `${permanentId}-src${i}`;
    p.stack.push(s);
  }
  state.players[seat]?.battleArea.push(p);
  return p;
}

type LeaveCause =
  | "opponentEffect"
  | "byOpponentEffect"
  | "otherThanYourEffect"
  | "byEffect"
  | "otherThanBattle"
  | "any";

// IR builders for prevent scenarios (mirrors what the runtime record emits).
function selfSuspendPrevent(cause: LeaveCause): CompiledCard {
  return {
    effects: [
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            mode: "prevent",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            ...(cause !== "any" ? { leaveCause: cause } : {}),
            cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
            raw: "prevent self by suspending",
          },
        ],
      },
    ],
    coverage: "full",
    residual: [],
  };
}

describe("leave-area prevent: self-protect, suspend cost", () => {
  it("prevents the deletion after paying the suspend cost", async () => {
    const h = harness({ turnSeat: 1 }); // opponent (seat 1) resolves the deletion
    const self = putPermanent(h.state, 0, "p1");
    await h.installPrevent(self, selfSuspendPrevent("byOpponentEffect"));

    await h.fx.deletePermanent([self.permanentId]);

    // The permanent survives (was not moved to trash) and is now suspended (cost paid).
    expect(h.state.players[0]!.battleArea.find((p) => p.permanentId === "p1")).toBeDefined();
    expect(self.isSuspended).toBe(true);
  });

  it("does NOT prevent when the controller declines (cost is all-or-nothing)", async () => {
    const h = harness({ turnSeat: 1 });
    const self = putPermanent(h.state, 0, "p1");
    await h.installPrevent(self, selfSuspendPrevent("byOpponentEffect"));
    h.optionalAnswers.push(false); // decline the "prevent?" prompt

    await h.fx.deletePermanent([self.permanentId]);

    // Declined => the permanent left (deleted), not suspended.
    expect(h.state.players[0]!.battleArea.find((p) => p.permanentId === "p1")).toBeUndefined();
    expect(self.isSuspended).toBe(false);
  });

  it("byOpponentEffect does NOT fire on the controller's OWN deletion", async () => {
    const h = harness({ turnSeat: 0 }); // the owner (seat 0) resolves the deletion
    const self = putPermanent(h.state, 0, "p1");
    await h.installPrevent(self, selfSuspendPrevent("byOpponentEffect"));

    // cause byEffect, resolvingSeat = owner (0) => byOpponentEffect must NOT fire.
    await h.fx.deletePermanent([self.permanentId]);

    expect(h.state.players[0]!.battleArea.find((p) => p.permanentId === "p1")).toBeUndefined();
    expect(self.isSuspended).toBe(false);
  });

  it("accepts opponentEffect as the catalog compiler alias for byOpponentEffect", async () => {
    const h = harness({ turnSeat: 0 });
    const self = putPermanent(h.state, 0, "p1");
    await h.installPrevent(self, selfSuspendPrevent("opponentEffect"));

    await h.fx.deletePermanent([self.permanentId]);

    expect(h.state.players[0]!.battleArea.find((p) => p.permanentId === "p1")).toBeUndefined();
    expect(self.isSuspended).toBe(false);
  });
});

// A filtered prevent (any of your matching Digimon) with a trash-2-sources cost.
function filteredTrashPrevent(affectsAll: boolean): CompiledCard {
  return {
    effects: [
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            mode: "prevent",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            ...(affectsAll ? { affectsAll: true } : {}),
            leaveCause: "byEffect",
            cost: {
              kind: "trash",
              target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 },
            },
            raw: "prevent allies by trashing 2 sources",
          },
        ],
      },
    ],
    coverage: "full",
    residual: [],
  };
}

describe("leave-area simultaneous mixed-mode ordering", () => {
  function installOrderedPair(h: Harness, source: Permanent, log: string[]): { insteadId: number; preventId: number } {
    const insteadId = h.subTriggers.subscribeReplacement({
      event: "wouldLeavePlay",
      sourcePermanentId: source.permanentId,
      sourceInstanceId: source.topCard!.instanceId,
      mode: "instead",
      description: "side effect",
      appliesTo: () => true,
      apply: async () => { log.push("instead"); },
    });
    const preventId = h.subTriggers.subscribeReplacement({
      event: "wouldLeavePlay",
      sourcePermanentId: source.permanentId,
      sourceInstanceId: source.topCard!.instanceId,
      mode: "prevent",
      description: "prevention",
      protects: () => true,
      preventCheck: async () => { log.push("prevent"); return true; },
    });
    return { insteadId, preventId };
  }

  it("runs an ordered non-preventing reaction before prevention", async () => {
    const h = harness();
    const source = putPermanent(h.state, 0, "source");
    const log: string[] = [];
    const ids = installOrderedPair(h, source, log);
    h.replacementOrder.push(ids.insteadId, ids.preventId);
    expect(await h.consult([source.permanentId])).toEqual(new Set([source.permanentId]));
    expect(log).toEqual(["instead", "prevent"]);
  });

  it("runs prevention first but continues to a later non-preventing reaction", async () => {
    const h = harness();
    const source = putPermanent(h.state, 0, "source");
    const log: string[] = [];
    const ids = installOrderedPair(h, source, log);
    h.replacementOrder.push(ids.preventId, ids.insteadId);
    expect(await h.consult([source.permanentId])).toEqual(new Set([source.permanentId]));
    expect(log).toEqual(["prevent", "instead"]);
  });

  it("a successful prevent suppresses only later prevent candidates", async () => {
    const h = harness();
    const source = putPermanent(h.state, 0, "source");
    const log: string[] = [];
    for (const name of ["first", "second"]) h.subTriggers.subscribeReplacement({
      event: "wouldLeavePlay", sourcePermanentId: source.permanentId, mode: "prevent", description: name,
      protects: () => true, preventCheck: async () => { log.push(name); return true; },
    });
    await h.consult([source.permanentId]);
    expect(log).toEqual(["first"]);
  });

  it("a failed or declined prevent permits the next prevent candidate", async () => {
    const h = harness();
    const source = putPermanent(h.state, 0, "source");
    const log: string[] = [];
    h.subTriggers.subscribeReplacement({
      event: "wouldLeavePlay", sourcePermanentId: source.permanentId, mode: "prevent", description: "declined",
      protects: () => true, preventCheck: async () => { log.push("declined"); return false; },
    });
    h.subTriggers.subscribeReplacement({
      event: "wouldLeavePlay", sourcePermanentId: source.permanentId, mode: "prevent", description: "accepted",
      protects: () => true, preventCheck: async () => { log.push("accepted"); return true; },
    });
    expect(await h.consult([source.permanentId])).toEqual(new Set([source.permanentId]));
    expect(log).toEqual(["declined", "accepted"]);
  });

  it("does not offer inapplicable reactions for ordering", async () => {
    const h = harness();
    const source = putPermanent(h.state, 0, "source");
    h.subTriggers.subscribeReplacement({
      event: "wouldLeavePlay", sourcePermanentId: source.permanentId, mode: "instead", description: "inapplicable",
      appliesTo: () => false, apply: async () => undefined,
    });
    h.subTriggers.subscribeReplacement({
      event: "wouldLeavePlay", sourcePermanentId: source.permanentId, mode: "prevent", description: "eligible",
      protects: () => true, preventCheck: async () => true,
    });
    await h.consult([source.permanentId]);
    expect(h.offeredReplacementIds).toEqual([]);
  });

  it("preserves affectsAll and once-per-turn accounting", async () => {
    const h = harness();
    const source = putPermanent(h.state, 0, "source");
    const peer = putPermanent(h.state, 0, "peer");
    h.subTriggers.subscribeReplacement({
      event: "wouldLeavePlay", sourcePermanentId: source.permanentId, mode: "prevent", description: "all",
      affectsAll: true, oncePerTurnKey: "all/opt", protects: () => true, preventCheck: async () => true,
    });
    expect(await h.consult([source.permanentId, peer.permanentId])).toEqual(
      new Set([source.permanentId, peer.permanentId]),
    );
    expect(h.replacementFiredKeys).toEqual(new Set(["all/opt"]));
  });
});

describe("leave-area prevent: filtered protect, affectsAll vs choose-1", () => {
  it("affectsAll:true saves ALL simultaneously-leaving matches on ONE payment", async () => {
    const h = harness({ turnSeat: 1 });
    const src = putPermanent(h.state, 0, "src", { sources: 2 }); // the reaction source (has 2 sources)
    const ally1 = putPermanent(h.state, 0, "a1");
    const ally2 = putPermanent(h.state, 0, "a2");
    await h.installPrevent(src, filteredTrashPrevent(true));

    await h.fx.deletePermanent([ally1.permanentId, ally2.permanentId]);

    // Both allies survive; the source's 2 digivolution cards were trashed (one payment).
    expect(h.state.players[0]!.battleArea.some((p) => p.permanentId === "a1")).toBe(true);
    expect(h.state.players[0]!.battleArea.some((p) => p.permanentId === "a2")).toBe(true);
    expect(src.stack.length).toBe(0);
  });

  it("affectsAll:false (choose-1) saves only as many as the cost can be paid for", async () => {
    const h = harness({ turnSeat: 1 });
    const src = putPermanent(h.state, 0, "src", { sources: 2 }); // only enough sources for ONE payment
    const ally1 = putPermanent(h.state, 0, "a1");
    const ally2 = putPermanent(h.state, 0, "a2");
    await h.installPrevent(src, filteredTrashPrevent(false));

    const prevented = await h.consult([ally1.permanentId, ally2.permanentId], "byEffect", 1);

    // First ally saved (paid 2 sources); second cannot be saved (no sources left to pay).
    expect(prevented.size).toBe(1);
    expect(src.stack.length).toBe(0);
  });

  it("byEffect reaction does NOT protect an OPPONENT's leaving Digimon (filter controller:mine)", async () => {
    const h = harness({ turnSeat: 1 });
    const src = putPermanent(h.state, 0, "src", { sources: 2 });
    const oppDigimon = putPermanent(h.state, 1, "o1");
    await h.installPrevent(src, filteredTrashPrevent(true));

    const prevented = await h.consult([oppDigimon.permanentId], "byEffect", 1);
    expect(prevented.size).toBe(0);
  });
});

// An "instead" replacement (the interpreter's default mode when a Replacement action has no
// `cost` — see runReplacement's mode-inference): a substitute side effect that does NOT
// prevent the leave (mirrors <Decode>, Comprehensive Rules §16-36).
function selfInsteadGainMemory(): CompiledCard {
  return {
    effects: [
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            actions: [{ kind: "GainMemory", amount: 1 }],
            raw: "instead: gain 1 memory",
          },
        ],
      },
    ],
    coverage: "full",
    residual: [],
  };
}

describe("leave-area 'instead' replacement: substitutes a side effect, does NOT prevent", () => {
  it("runs the apply payload AND still lets the permanent leave (Decode semantics)", async () => {
    const h = harness({ turnSeat: 1 });
    const self = putPermanent(h.state, 0, "p1");
    await h.installPrevent(self, selfInsteadGainMemory());

    expect(h.state.memory).toBe(0);
    await h.fx.deletePermanent([self.permanentId]);

    // The side effect ran: seat 0 (self's controller) gained 1 memory. The turn player is
    // seat 1 here, and memory is stored TURN-RELATIVE (MemoryGauge.addMemoryForSeat), so a
    // non-turn-player gain of +1 lowers the turn-relative value by 1.
    expect(h.state.memory).toBe(-1);
    // ...but the removal was NOT prevented: the permanent actually left the battle area.
    expect(h.state.players[0]!.battleArea.find((p) => p.permanentId === "p1")).toBeUndefined();
  });

  it("does nothing when no 'instead' replacement is installed (default-safe)", async () => {
    const h = harness({ turnSeat: 1 });
    const self = putPermanent(h.state, 0, "p1");

    await h.fx.deletePermanent([self.permanentId]);

    expect(h.state.memory).toBe(0);
    expect(h.state.players[0]!.battleArea.find((p) => p.permanentId === "p1")).toBeUndefined();
  });
});

describe("leave-area prevent: cause gating + bounce coverage", () => {
  it("the prevent also voids a hand BOUNCE (returnToHand), not just deletion", async () => {
    const h = harness({ turnSeat: 1 });
    const self = putPermanent(h.state, 0, "p1");
    await h.installPrevent(self, selfSuspendPrevent("byOpponentEffect"));

    await h.fx.returnToHand([self.topCard!.instanceId]);

    // Bounce prevented: still in play, not in hand, cost paid.
    expect(h.state.players[0]!.battleArea.some((p) => p.permanentId === "p1")).toBe(true);
    expect(h.state.players[0]!.hand.length).toBe(0);
    expect(self.isSuspended).toBe(true);
  });

  it("a wouldBeDeleted (deletion-only) reaction does NOT fire on a bounce", async () => {
    const h = harness({ turnSeat: 1 });
    const self = putPermanent(h.state, 0, "p1");
    const compiled: CompiledCard = {
      effects: [
        {
          trigger: "AllTurns",
          actions: [
            {
              kind: "Replacement",
              event: "wouldBeDeleted",
              mode: "prevent",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
              raw: "prevent deletion only",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    };
    await h.installPrevent(self, compiled);

    await h.fx.returnToHand([self.topCard!.instanceId]); // a bounce, not a deletion

    // Deletion-only reaction must NOT intercept the bounce: the permanent leaves to hand.
    expect(h.state.players[0]!.battleArea.some((p) => p.permanentId === "p1")).toBe(false);
    expect(h.state.players[0]!.hand.length).toBe(1);
    expect(self.isSuspended).toBe(false);
  });
});

describe("immediate replacement activation identity", () => {
  it("runs distinct actions with identical prose on one source while suppressing same-action nesting", async () => {
    const h = harness();
    const source = putPermanent(h.state, 0, "source");
    const victim = putPermanent(h.state, 0, "victim");
    let firstActivations = 0;
    let secondActivations = 0;
    let nested = false;

    h.subTriggers.subscribeReplacement({
      event: "wouldBeDeleted",
      mode: "instead",
      sourcePermanentId: source.permanentId,
      sourceInstanceId: source.topCard!.instanceId,
      activationIdentity: "TEST/effect/action-0",
      description: "identical display text",
      apply: async () => {
        firstActivations += 1;
        if (nested) return;
        nested = true;
        await h.consult([victim.permanentId]);
      },
    });
    h.subTriggers.subscribeReplacement({
      event: "wouldBeDeleted",
      mode: "instead",
      sourcePermanentId: source.permanentId,
      sourceInstanceId: source.topCard!.instanceId,
      activationIdentity: "TEST/effect/action-1",
      description: "identical display text",
      apply: async () => {
        secondActivations += 1;
      },
    });

    expect(h.subTriggers.replacementsFor("wouldBeDeleted")).toHaveLength(2);
    await h.consult([victim.permanentId]);

    expect(firstActivations).toBe(1);
    expect(secondActivations).toBe(2);
  });
});
