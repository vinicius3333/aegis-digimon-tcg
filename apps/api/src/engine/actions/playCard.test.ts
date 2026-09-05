import { describe, it, expect } from "vitest";
import { ArraySchema } from "@colyseus/schema";
import {
  GameState,
  PlayerState,
  PendingDecision,
  CardInstance,
  Permanent,
  Phase,
  EffectTiming,
  EffectDuration,
  type Seat,
} from "@aegis/shared";
import { ContinuousEffectLedger } from "../effects/continuous.js";
import {
  validatePlayCard,
  applyPlayCard,
  defaultPlayCardDeps,
  type PlayCardDeps,
  type PlayCardEvent,
  type PlayCardIntent,
} from "./playCard.js";

// Real card ids from the generated card table (packages/shared/src/cards/data).
const DIGIMON = "BT1-009"; // Digimon, playCost 2, dp 3000
const DIGIMON_DP = 3000;
const TAMER = "AD1-019"; // Tamer, playCost 3, dp 0
const OPTION_FREE = "BT1-090"; // Option, playCost 0
const OPTION_COST = "BT1-091"; // Option, playCost 3
const EGG = "BT1-001"; // DigiEgg, playCost -1 (not playable from hand)

let instanceSeq = 0;
function instance(cardId: string, ownerSeat: Seat): CardInstance {
  const ci = new CardInstance();
  ci.instanceId = `inst-${(instanceSeq += 1)}`;
  ci.cardId = cardId;
  ci.ownerSeat = ownerSeat;
  ci.faceUp = true;
  return ci;
}

function player(seat: Seat, handCardIds: string[]): PlayerState {
  const p = new PlayerState();
  p.seat = seat;
  p.sessionId = `s${seat}`;
  p.hand = new ArraySchema<CardInstance>(...handCardIds.map((id) => instance(id, seat)));
  return p;
}

/** A match with seat 0 to move in Main phase, both players seated, gauge at 0. */
function makeState(handForSeat0: string[], handForSeat1: string[] = []): GameState {
  const state = new GameState();
  state.phase = Phase.Main;
  state.turnSeat = 0;
  state.memory = 0;
  state.players = new ArraySchema<PlayerState>(player(0, handForSeat0), player(1, handForSeat1));
  return state;
}

/** Deps wired to the standalone memory defaults plus recording stubs for the rest. */
function makeDeps(overrides: Partial<PlayCardDeps> = {}): {
  deps: PlayCardDeps;
  events: PlayCardEvent[];
  fired: Array<{ timing: EffectTiming; instanceId: string }>;
} {
  const events: PlayCardEvent[] = [];
  const fired: Array<{ timing: EffectTiming; instanceId: string }> = [];
  let permSeq = 0;
  const deps: PlayCardDeps = {
    maxAffordable: defaultPlayCardDeps.maxAffordable,
    payMemory: defaultPlayCardDeps.payMemory,
    nextPermanentId: () => `perm-${(permSeq += 1)}`,
    fireTiming: async (_state, _seat, timing, sourceInstanceId) => {
      fired.push({ timing, instanceId: sourceInstanceId });
    },
    emit: (e) => events.push(e),
    ...overrides,
  };
  return { deps, events, fired };
}

const playIntent = (instanceId: string, targetSlot?: number): PlayCardIntent =>
  targetSlot === undefined ? { type: "playCard", instanceId } : { type: "playCard", instanceId, targetSlot };

const firstInstanceId = (state: GameState, seat: Seat): string => {
  const ci = state.players[seat]?.hand[0];
  if (ci === undefined) throw new Error("expected a hand card");
  return ci.instanceId;
};

describe("validatePlayCard", () => {
  it("rejects when it is not the seat's turn", () => {
    const state = makeState([DIGIMON]);
    state.turnSeat = 1;
    const id = firstInstanceId(state, 0);
    const r = validatePlayCard(state, 0, playIntent(id), defaultPlayCardDeps);
    expect(r).toEqual({ ok: false, reason: "not-your-turn" });
  });

  it("rejects outside the Main phase", () => {
    const state = makeState([DIGIMON]);
    state.phase = Phase.Breeding;
    const id = firstInstanceId(state, 0);
    const r = validatePlayCard(state, 0, playIntent(id), defaultPlayCardDeps);
    expect(r).toEqual({ ok: false, reason: "wrong-phase" });
  });

  it("rejects while a decision is pending", () => {
    const state = makeState([DIGIMON]);
    state.pendingDecision = new PendingDecision();
    const id = firstInstanceId(state, 0);
    const r = validatePlayCard(state, 0, playIntent(id), defaultPlayCardDeps);
    expect(r).toEqual({ ok: false, reason: "decision-pending" });
  });

  it("rejects when the game is over", () => {
    const state = makeState([DIGIMON]);
    state.gameOver = true;
    const id = firstInstanceId(state, 0);
    const r = validatePlayCard(state, 0, playIntent(id), defaultPlayCardDeps);
    expect(r).toEqual({ ok: false, reason: "game-over" });
  });

  it("rejects a card that is not in the seat's hand", () => {
    const state = makeState([DIGIMON]);
    const r = validatePlayCard(state, 0, playIntent("inst-does-not-exist"), defaultPlayCardDeps);
    expect(r).toEqual({ ok: false, reason: "card-not-in-zone" });
  });

  it("rejects a DigiEgg (hatched, never played from hand)", () => {
    const state = makeState([EGG]);
    const id = firstInstanceId(state, 0);
    const r = validatePlayCard(state, 0, playIntent(id), defaultPlayCardDeps);
    expect(r).toEqual({ ok: false, reason: "not-playable-kind" });
  });

  it("rejects when the cost is unaffordable", () => {
    const state = makeState([TAMER]); // cost 3
    // Push the gauge to the turn player's floor so MaxMemoryCost = 0.
    state.memory = -10;
    const id = firstInstanceId(state, 0);
    const r = validatePlayCard(state, 0, playIntent(id), defaultPlayCardDeps);
    expect(r).toEqual({ ok: false, reason: "insufficient-memory" });
  });

  it("rejects a permanent when no battle-area slot is free (invalid target slot)", () => {
    const state = makeState([DIGIMON]);
    const id = firstInstanceId(state, 0);
    const r = validatePlayCard(state, 0, playIntent(id, -1), defaultPlayCardDeps);
    expect(r).toEqual({ ok: false, reason: "no-empty-slot" });
  });

  it("allows another permanent when the battle area already contains 15 cards", () => {
    const state = makeState([DIGIMON]);
    const current = state.players[0]!;
    current.battleArea = new ArraySchema<Permanent>();
    for (let index = 0; index < 15; index += 1) {
      const permanent = new Permanent();
      permanent.permanentId = `existing-${index}`;
      permanent.controllerSeat = 0;
      permanent.topCard = instance(DIGIMON, 0);
      current.battleArea.push(permanent);
    }

    const result = validatePlayCard(state, 0, playIntent(firstInstanceId(state, 0)), defaultPlayCardDeps);

    expect(result.ok).toBe(true);
  });

  it("accepts a legal Digimon play and reports cost + mode", () => {
    const state = makeState([DIGIMON]);
    const id = firstInstanceId(state, 0);
    const r = validatePlayCard(state, 0, playIntent(id), defaultPlayCardDeps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mode).toBe("permanent");
      expect(r.cost).toBe(2);
    }
  });

  it("applies a continuous play-cost modifier (CostModifier play form) to the cost", () => {
    const state = makeState([DIGIMON]); // printed playCost 2
    const id = firstInstanceId(state, 0);
    // A -1 play-cost reducer (e.g. a static effect already recorded in the ledger).
    const r = validatePlayCard(state, 0, playIntent(id), {
      maxAffordable: defaultPlayCardDeps.maxAffordable,
      adjustedPlayCost: (_s, _seat, _def, base) => base - 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.cost).toBe(1); // 2 - 1
  });

  it("floors an over-reduced play cost at 0", () => {
    const state = makeState([DIGIMON]); // printed playCost 2
    const id = firstInstanceId(state, 0);
    const r = validatePlayCard(state, 0, playIntent(id), {
      maxAffordable: defaultPlayCardDeps.maxAffordable,
      adjustedPlayCost: () => -5, // a reducer that would push below 0
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.cost).toBe(0);
  });

  it("treats a dual Digimon+Option card as a permanent play", () => {
    const state = makeState(["BT25-043"]); // Digimon + Option dual, cost 6
    state.memory = 4; // turn player affords 14
    const id = firstInstanceId(state, 0);
    const r = validatePlayCard(state, 0, playIntent(id), defaultPlayCardDeps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mode).toBe("permanent");
  });
});

describe("applyPlayCard - Digimon as a new permanent", () => {
  it("pays memory, places the permanent with DP, and fires On Play", async () => {
    const state = makeState([DIGIMON]);
    const id = firstInstanceId(state, 0);
    const { deps, events, fired } = makeDeps();

    const result = await applyPlayCard(state, 0, playIntent(id), deps);

    expect(result.ok).toBe(true);
    // Memory: turn player paid 2 -> gauge moves to -2 (turn-relative).
    expect(state.memory).toBe(-2);
    // Hand emptied, one permanent created.
    expect(state.players[0]!.hand.length).toBe(0);
    expect(state.players[0]!.battleArea.length).toBe(1);

    const perm = state.players[0]!.battleArea[0]!;
    expect(perm.topCard.cardId).toBe(DIGIMON);
    expect(perm.topCard.instanceId).toBe(id);
    expect(perm.controllerSeat).toBe(0);
    expect(perm.baseDP).toBe(DIGIMON_DP);
    expect(perm.currentDP).toBe(DIGIMON_DP);
    expect(perm.isSuspended).toBe(false);
    expect(perm.inBreeding).toBe(false);
    expect(perm.stack.length).toBe(0);

    // On Play fired for exactly this instance.
    expect(fired).toEqual([{ timing: EffectTiming.OnPlay, instanceId: id }]);

    // Narration: memoryChanged, cardPlayed (with permanentId), cardsMoved hand->battleArea.
    expect(events.some((e) => e.kind === "memoryChanged" && e.to === -2)).toBe(true);
    const played = events.find((e) => e.kind === "cardPlayed");
    expect(played).toMatchObject({ kind: "cardPlayed", seat: 0, cardId: DIGIMON, permanentId: perm.permanentId });
    expect(events.some((e) => e.kind === "cardsMoved" && e.to === "battleArea")).toBe(true);
  });

  it("places a Tamer with 0 DP", async () => {
    const state = makeState([TAMER]);
    const id = firstInstanceId(state, 0);
    const { deps } = makeDeps();

    const result = await applyPlayCard(state, 0, playIntent(id), deps);

    expect(result.ok).toBe(true);
    const perm = state.players[0]!.battleArea[0]!;
    expect(perm.topCard.cardId).toBe(TAMER);
    expect(perm.baseDP).toBe(0);
    expect(perm.currentDP).toBe(0);
    expect(state.memory).toBe(-3);
  });

  it("does not mutate state when validation fails", async () => {
    const state = makeState([TAMER]);
    state.memory = -10; // unaffordable
    const id = firstInstanceId(state, 0);
    const { deps, events, fired } = makeDeps();

    const result = await applyPlayCard(state, 0, playIntent(id), deps);

    expect(result).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(state.players[0]!.hand.length).toBe(1);
    expect(state.players[0]!.battleArea.length).toBe(0);
    expect(state.memory).toBe(-10);
    expect(events).toEqual([]);
    expect(fired).toEqual([]);
  });
});

describe("applyPlayCard - Option resolve then trash", () => {
  it("fires the option activation then moves the card to trash (free option)", async () => {
    const state = makeState([OPTION_FREE]);
    const id = firstInstanceId(state, 0);
    const { deps, events, fired } = makeDeps();

    const result = await applyPlayCard(state, 0, playIntent(id), deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.outcome.mode).toBe("option");
    // Free option: gauge unchanged.
    expect(state.memory).toBe(0);
    // Never becomes a permanent; ends in trash.
    expect(state.players[0]!.battleArea.length).toBe(0);
    expect(state.players[0]!.hand.length).toBe(0);
    expect(state.players[0]!.trash.length).toBe(1);
    expect(state.players[0]!.trash[0]!.instanceId).toBe(id);

    // OnUseOption fired (not OnPlay).
    expect(fired).toEqual([{ timing: EffectTiming.OnUseOption, instanceId: id }]);
    expect(events.some((e) => e.kind === "cardsMoved" && e.to === "trash")).toBe(true);
    expect(events.some((e) => e.kind === "cardPlayed")).toBe(true);
  });

  it("pays cost for a costed option and trashes it", async () => {
    const state = makeState([OPTION_COST]); // cost 3
    const id = firstInstanceId(state, 0);
    const { deps } = makeDeps();

    const result = await applyPlayCard(state, 0, playIntent(id), deps);

    expect(result.ok).toBe(true);
    expect(state.memory).toBe(-3);
    expect(state.players[0]!.trash.length).toBe(1);
  });

  it("reports the card-level adjusted use cost to whenOptionUsed (BT10-032 Q1956)", async () => {
    const state = makeState([OPTION_COST]); // printed 3, card-level adjusted to 1
    const id = firstInstanceId(state, 0);
    let eventCost: number | undefined;
    const { deps } = makeDeps({
      adjustedPlayCost: () => 1,
      fireOptionUsed: async (_instanceId, usedOptionCost) => {
        eventCost = usedOptionCost;
      },
    });

    expect((await applyPlayCard(state, 0, playIntent(id), deps)).ok).toBe(true);
    expect(eventCost).toBe(1);
  });

  it("captures Option use cost before finalization and Main change the board", async () => {
    const state = makeState([OPTION_COST]);
    state.memory = 1;
    const id = firstInstanceId(state, 0);
    let adjustedInstance: CardInstance | undefined;
    let eventCost: number | undefined;
    let projectedCost = 1;
    const { deps } = makeDeps({
      adjustedPlayCost: () => 1,
      optionUseCost: (_state, _seat, adjustedCard) => {
        adjustedInstance = adjustedCard;
        return projectedCost;
      },
      finalizePlayCost: async () => {
        projectedCost = 2;
        return 1;
      },
      fireTiming: async () => {
        projectedCost = 3;
      },
      fireOptionUsed: async (_instanceId, usedOptionCost) => {
        eventCost = usedOptionCost;
      },
    });

    expect((await applyPlayCard(state, 0, playIntent(id), deps)).ok).toBe(true);
    expect(adjustedInstance?.instanceId).toBe(id);
    expect(eventCost).toBe(1);
    expect(projectedCost).toBe(3);
    expect(state.memory).toBe(0);
  });

  it("holds the option on resolvingOption (not trash) during fireTiming, per §9-1-4", async () => {
    const state = makeState([OPTION_FREE]);
    const id = firstInstanceId(state, 0);
    // §9-1-4: a used Option is in NO area while its own [Main] effect resolves, so it must
    // not appear in trash yet. GameEngine.listCandidateInstances() locates it via the
    // dedicated PlayerState.resolvingOption slot instead.
    const { deps } = makeDeps({
      fireTiming: async () => {
        expect(state.players[0]!.trash.length).toBe(0);
        expect(state.players[0]!.resolvingOption?.instanceId).toBe(id);
      },
    });

    const result = await applyPlayCard(state, 0, playIntent(id), deps);
    expect(result.ok).toBe(true);
    expect(state.players[0]!.trash.length).toBe(1);
    expect(state.players[0]!.resolvingOption).toBeUndefined();
  });
});

describe("applyPlayCard - the opponent cannot play on your turn", () => {
  it("rejects a play from the non-turn seat", async () => {
    const state = makeState([DIGIMON], [DIGIMON]);
    const oppId = firstInstanceId(state, 1);
    const { deps } = makeDeps();

    const result = await applyPlayCard(state, 1, playIntent(oppId), deps);

    expect(result).toEqual({ ok: false, reason: "not-your-turn" });
    expect(state.players[1]!.battleArea.length).toBe(0);
  });
});

describe("validatePlayCard - RestrictPlay prohibition (full ledger consult)", () => {
  it("rejects the restricted seat's own play of a matching Option, but not a Digimon", () => {
    // The turn player (seat 0) is the RESTRICTED seat ("you can't use Option cards"): a manual
    // play is its own action, so the prohibition applies (KB EX1-072/Q4673).
    const ledger = new ContinuousEffectLedger();
    ledger.addPlayProhibition(0 as Seat, 1 as Seat, { kinds: ["Option"] }, "play", EffectDuration.UntilOpponentTurnEnd);
    const deps = {
      maxAffordable: defaultPlayCardDeps.maxAffordable,
      playProhibited: (_s: GameState, seat: Seat, def: { dp: number; isToken?: boolean; kinds: string[] }) =>
        ledger.isPlayBlocked(seat, def as never, "play"),
    };

    const stateOption = makeState([OPTION_FREE]);
    const optId = firstInstanceId(stateOption, 0);
    expect(validatePlayCard(stateOption, 0, playIntent(optId), deps)).toEqual({
      ok: false,
      reason: "play-prohibited",
    });

    // A Digimon does not match the Option filter => allowed.
    const stateDigi = makeState([DIGIMON]);
    const digiId = firstInstanceId(stateDigi, 0);
    expect(validatePlayCard(stateDigi, 0, playIntent(digiId), deps).ok).toBe(true);
  });

  it("does NOT prohibit a play when the prohibition is seated on the OTHER player (Q4675 seat scoping)", () => {
    // The prohibition restricts seat 1; seat 0 (the turn player / source player) plays freely.
    const ledger = new ContinuousEffectLedger();
    ledger.addPlayProhibition(1 as Seat, 0 as Seat, { kinds: ["Option"] }, "play", EffectDuration.UntilOpponentTurnEnd);
    const deps = {
      maxAffordable: defaultPlayCardDeps.maxAffordable,
      playProhibited: (_s: GameState, seat: Seat, def: { dp: number; isToken?: boolean; kinds: string[] }) =>
        ledger.isPlayBlocked(seat, def as never, "play"),
    };
    const state = makeState([OPTION_FREE]);
    const optId = firstInstanceId(state, 0);
    expect(validatePlayCard(state, 0, playIntent(optId), deps).ok).toBe(true);
  });
});

describe("applyPlayCard - BeforePayCost finalizePlayCost hook (pay-time interactive reduction)", () => {
  it("pays the FINALIZED (reduced) cost, not the passive cost (consume-site: finalizePlayCost is read)", async () => {
    const state = makeState([DIGIMON]); // printed playCost 2
    const id = firstInstanceId(state, 0);
    let finalizeCalledWith: number | undefined;
    let finalizedMode: string | undefined;
    const { deps } = makeDeps({
      // The pay-time hook reduces the passive cost by 2 (floored at 0) — the EX9-043/BT25-076 shape.
      finalizePlayCost: async (_s, _seat, _instance, _def, base, mode) => {
        finalizeCalledWith = base;
        finalizedMode = mode;
        return Math.max(0, base - 2);
      },
    });
    const before = state.memory;
    const r = await applyPlayCard(state, 0, playIntent(id), deps);
    expect(r.ok).toBe(true);
    // The hook saw the passive cost (2) and the FINAL paid cost was floored to 0.
    expect(finalizeCalledWith).toBe(2);
    expect(finalizedMode).toBe("permanent");
    expect(before - state.memory).toBe(0); // 2 - 2 = 0 paid
    if (r.ok) expect(r.outcome.cost).toBe(0);
  });

  it("identifies an Option declaration to the server-authoritative pay-time hook", async () => {
    const state = makeState([OPTION_COST]);
    state.memory = 3;
    const id = firstInstanceId(state, 0);
    let finalizedMode: string | undefined;
    const { deps } = makeDeps({
      finalizePlayCost: async (_s, _seat, _instance, _def, base, mode) => {
        finalizedMode = mode;
        return base;
      },
    });

    expect((await applyPlayCard(state, 0, playIntent(id), deps)).ok).toBe(true);
    expect(finalizedMode).toBe("option");
  });

  it("preserves use cost when only the amount paid is finalized lower (BT10-032 Q1957)", async () => {
    const state = makeState([OPTION_COST]); // use cost 3, payment reduced to 1
    state.memory = 3;
    const id = firstInstanceId(state, 0);
    let eventCost: number | undefined;
    const { deps } = makeDeps({
      finalizePlayCost: async () => 1,
      fireOptionUsed: async (_instanceId, usedOptionCost) => {
        eventCost = usedOptionCost;
      },
    });

    expect((await applyPlayCard(state, 0, playIntent(id), deps)).ok).toBe(true);
    expect(state.memory).toBe(2);
    expect(eventCost).toBe(3);
  });

  it("pays the passive cost unchanged when no finalizePlayCost dep is supplied (standalone default)", async () => {
    const state = makeState([DIGIMON]); // printed playCost 2
    const id = firstInstanceId(state, 0);
    const { deps } = makeDeps(); // no finalizePlayCost
    const before = state.memory;
    const r = await applyPlayCard(state, 0, playIntent(id), deps);
    expect(r.ok).toBe(true);
    expect(before - state.memory).toBe(2); // full printed cost
  });

  it("re-checks affordability against the finalized cost and rejects if still unaffordable", async () => {
    const state = makeState([TAMER]); // cost 3
    state.memory = 10; // affordable for the passive cost
    const id = firstInstanceId(state, 0);
    const { deps } = makeDeps({
      // A pathological hook that RAISES the cost beyond the gauge (the apply path floors the dep's
      // return at >=0 but re-checks affordability, so an unaffordable finalized cost is rejected).
      finalizePlayCost: async () => 999,
      maxAffordable: () => 5,
    });
    const r = await applyPlayCard(state, 0, playIntent(id), deps);
    expect(r).toEqual({ ok: false, reason: "insufficient-memory" });
  });
});
