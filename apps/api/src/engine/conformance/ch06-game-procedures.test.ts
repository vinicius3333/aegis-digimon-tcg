import { describe, it, expect } from "vitest";
import { GameState, PlayerState, Phase, EffectTiming, type Seat } from "@aegis/shared";
import { cite } from "./_kb.js";
import "./not-testable.js";
import { TurnStateMachine, type TurnFlowHooks, type MainPhaseEnd } from "../TurnStateMachine.js";
import { MemoryGauge, PASS_TURN_MEMORY, DEFAULT_TURN_END_MIN_MEMORY } from "../MemoryGauge.js";
import { BreedingPhaseController } from "../BreedingPhaseController.js";
import {
  setupEngine as setup,
  makeInstance as instance,
  makeDigimon as digimon,
  findPermanent,
  settle,
} from "../testkit/harness.js";
import "../../cards/index.js";

/**
 * Comprehensive Rules chapter 6 "Game Procedures" (comprehensive-0006, 0102-0110).
 * See `ch01-game-overview.test.ts` / README.md for the citation contract.
 *
 * comprehensive-0006 (TOC dot-leader) and comprehensive-0102 (bare chapter heading) carry
 * no normative content and are seeded in `not-testable.ts`; the real content chunks are
 * comprehensive-0103 through 0110.
 */

/** A GameState wired for TurnStateMachine tests: two seated players, turn player = seat 0. */
function twoPlayerState(): GameState {
  const state = new GameState();
  for (const seat of [0, 1] as Seat[]) {
    const p = new PlayerState();
    p.seat = seat;
    state.players[seat] = p;
  }
  state.turnSeat = 0;
  state.memory = 0;
  return state;
}

/** A `TurnFlowHooks` fake recording every call (in order) so phase sequencing is directly assertable. */
function recordingHooks(overrides?: Partial<TurnFlowHooks>): { hooks: TurnFlowHooks; log: string[] } {
  const log: string[] = [];
  const hooks: TurnFlowHooks = {
    async fireTiming(timing) {
      log.push(`fireTiming:${EffectTiming[timing]}`);
    },
    async draw(_seat, count) {
      log.push(`draw:${count}`);
      return count;
    },
    deckCount() {
      return 10;
    },
    async unsuspendForActivePhase() {
      log.push("unsuspend");
      return [];
    },
    async runBreedingPhase() {
      log.push("breeding");
    },
    async runMainPhase() {
      log.push("main");
      return "passed";
    },
    isGameOver() {
      return false;
    },
    declareDeckOutLoss() {
      log.push("deckOutLoss");
    },
    async clearDurations() {},
    ...overrides,
  };
  return { hooks, log };
}

describe("§6-1 Turn Procedures (comprehensive-0103)", () => {
  it("6-1-2: a turn proceeds through Active, Draw, Breeding, and Main in that fixed order", async () => {
    cite("comprehensive-0103", "6-1-2 phase order: unsuspend (active), draw, breeding, main");

    const state = twoPlayerState();
    state.isFirstPlayersFirstTurn = false; // so the draw phase actually calls draw (not the skip path)
    const phaseLog: string[] = [];
    const { hooks } = recordingHooks();
    const machine = new TurnStateMachine(state, hooks, undefined, (e) => {
      if (e.kind === "phaseChanged") phaseLog.push(e.phase);
    });

    await machine.runTurn();

    expect(phaseLog).toEqual([Phase.Active, Phase.Draw, Phase.Breeding, Phase.Main, Phase.End]);
  });

  it("6-1-3: the next phase does not begin until the current phase's hook has resolved (Active's unsuspend runs before Draw fires)", async () => {
    const state = twoPlayerState();
    state.isFirstPlayersFirstTurn = false;
    const { hooks, log } = recordingHooks();
    const machine = new TurnStateMachine(state, hooks);

    await machine.runTurn();

    const unsuspendIdx = log.indexOf("unsuspend");
    const drawIdx = log.indexOf("draw:1");
    const breedingIdx = log.indexOf("breeding");
    const mainIdx = log.indexOf("main");
    expect(unsuspendIdx).toBeGreaterThanOrEqual(0);
    expect(unsuspendIdx).toBeLessThan(drawIdx);
    expect(drawIdx).toBeLessThan(breedingIdx);
    expect(breedingIdx).toBeLessThan(mainIdx);
  });
});

describe("§6-1-4 Turn End Conditions (comprehensive-0104)", () => {
  it("6-1-4-1: the turn ends once the opponent's memory reaches the 1-or-more default threshold", () => {
    cite("comprehensive-0104", "6-1-4-1 turn ends when the opponent's memory is at 1 or more");

    const state = twoPlayerState();
    const gauge = new MemoryGauge(state);
    expect(gauge.hasCrossedToOpponent()).toBe(false);

    // Turn-relative memory of -1 means the (non-turn) opponent's own-perspective memory is +1 —
    // exactly DEFAULT_TURN_END_MIN_MEMORY (1), the crossing threshold.
    state.memory = -DEFAULT_TURN_END_MIN_MEMORY;
    expect(gauge.hasCrossedToOpponent()).toBe(true);

    state.memory = -DEFAULT_TURN_END_MIN_MEMORY + 1; // one short of the threshold
    expect(gauge.hasCrossedToOpponent()).toBe(false);
  });
});

describe("§6-2 Unsuspend Phase (comprehensive-0105)", () => {
  it("6-2-1: the Active phase unsuspends the turn player's permanents at the start of the turn", async () => {
    cite("comprehensive-0105", "6-2-1 the turn starts by unsuspending all of the turn player's Digimon/Tamers");

    const s = setup();
    const p0 = s.state.players[0]!;
    const perm = digimon(0, 5000);
    perm.isSuspended = true;
    p0.battleArea.push(perm);

    const { hooks } = recordingHooks({
      async unsuspendForActivePhase(seat) {
        for (const permanent of s.state.players[seat]!.battleArea) permanent.isSuspended = false;
        return [perm.permanentId];
      },
    });
    const machine = new TurnStateMachine(s.state, hooks);
    await machine.runTurn();

    expect(perm.isSuspended).toBe(false);
  });

  it("6-2-1-1: a start-of-turn rule/effect window (OnStartTurn) fires BEFORE the unsuspending processing", async () => {
    cite("comprehensive-0105", "6-2-1-1 rules/effects to process at turn start run before unsuspending");

    const state = twoPlayerState();
    state.isFirstPlayersFirstTurn = false;
    const { hooks, log } = recordingHooks();
    const machine = new TurnStateMachine(state, hooks);
    await machine.runTurn();

    const startTurnIdx = log.indexOf("fireTiming:OnStartTurn");
    const unsuspendIdx = log.indexOf("unsuspend");
    expect(startTurnIdx).toBeGreaterThanOrEqual(0);
    expect(startTurnIdx).toBeLessThan(unsuspendIdx);
  });
});

describe("§6-3 Draw Phase (comprehensive-0106)", () => {
  it("6-3-1-1: the first player skips the draw on their own first turn, but draws normally afterward", async () => {
    cite("comprehensive-0106", "6-3-1-1 the first player's first draw phase is skipped");

    const state = twoPlayerState();
    state.isFirstPlayersFirstTurn = true;
    const { hooks: firstTurnHooks, log: firstTurnLog } = recordingHooks();
    await new TurnStateMachine(state, firstTurnHooks).runTurn();
    expect(firstTurnLog.some((e) => e.startsWith("draw:"))).toBe(false);

    // A later turn (isFirstPlayersFirstTurn cleared, as the real endPhase() does) draws normally.
    state.isFirstPlayersFirstTurn = false;
    const { hooks: laterHooks, log: laterLog } = recordingHooks();
    await new TurnStateMachine(state, laterHooks).runTurn();
    expect(laterLog).toContain("draw:1");
  });

  it("6-3-1: an empty deck on the draw step is a deck-out loss for the turn player, not a draw of 0", async () => {
    const state = twoPlayerState();
    state.isFirstPlayersFirstTurn = false;
    const { hooks, log } = recordingHooks({ deckCount: () => 0 });
    await new TurnStateMachine(state, hooks).runTurn();

    expect(log).toContain("deckOutLoss");
    expect(log.some((e) => e.startsWith("draw:"))).toBe(false);
  });
});

describe("§6-4 Breeding Phase (comprehensive-0107)", () => {
  it("6-4-1: the turn player gets exactly ONE breeding action — a second hatch/move attempt in the same window is rejected", () => {
    cite("comprehensive-0107", "6-4-1 hatch OR move OR do nothing — exactly one action per breeding phase");

    const state = twoPlayerState();
    state.phase = Phase.Breeding;
    const controller = new BreedingPhaseController(state);

    let resolved = false;
    void controller.run(0, false).then(() => {
      resolved = true;
    });
    expect(controller.isOpen).toBe(true);

    expect(controller.actionTaken(0)).toBe(true); // the one allowed action closes the window
    expect(controller.isOpen).toBe(false);
    // A second action in the SAME window (no new run() has been opened) is rejected outright.
    expect(controller.actionTaken(0)).toBe(false);
    void resolved;
  });

  it("6-4-1-3: 'do nothing' (skip) also closes the window, structurally identical to taking an action", () => {
    const state = twoPlayerState();
    state.phase = Phase.Breeding;
    const controller = new BreedingPhaseController(state);
    void controller.run(0, false);

    expect(controller.skip(0)).toBe(true);
    expect(controller.isOpen).toBe(false);
  });

  it("6-4-1: with no legal breeding action available, the window auto-resolves with no client round trip", async () => {
    const state = twoPlayerState();
    state.phase = Phase.Breeding;
    const controller = new BreedingPhaseController(state);

    await controller.run(0, /* autoSkip */ true);
    expect(controller.isOpen).toBe(false); // resolved immediately — no window was ever opened
  });
});

describe("§6-5 Main Phase (comprehensive-0108)", () => {
  it("6-5-1-1-1 / 6-5-1-2-1: playing a Digimon card and digivolving are both legal Main-phase verbs", async () => {
    cite("comprehensive-0108", "6-5-1-1/6-5-1-2 play a Digimon/Tamer card, or digivolve, from the hand");

    const s = setup();
    const p0 = s.state.players[0]!;
    const { requireCardDefinition } = await import("@aegis/shared");
    const card = instance("AD1-001", 0, false);
    p0.hand.push(card);
    s.state.memory = requireCardDefinition("AD1-001").playCost;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId })).toEqual({ ok: true });
    const played = findPermanent(s, 0, "AD1-001");

    const digivolveCard = instance("AD1-002", 0, false); // Lv.5, evolves from Lv.4 Red for cost 3
    p0.hand.push(digivolveCard);
    s.state.memory = 3;
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: played.permanentId,
      instanceId: digivolveCard.instanceId,
    });
    expect(result).toEqual({ ok: true });
    await settle(() => played.topCard?.cardId === "AD1-002", 5000);
    expect(played.topCard?.cardId).toBe("AD1-002");
  });
});

describe("§6-5-1-2-3.. Main Phase, cont'd (comprehensive-0109)", () => {
  it("6-5-1-7-1: declaring a pass immediately moves memory to 3 in the INCOMING turn player's favor", async () => {
    cite("comprehensive-0109", "6-5-1-7-1 passing moves the memory gauge to 3 on the opponent's side");

    const state = twoPlayerState();
    state.isFirstPlayersFirstTurn = false;
    state.memory = 2; // still favors the outgoing turn player — a genuine voluntary pass, not a cross
    const { hooks } = recordingHooks({
      async runMainPhase() {
        return "passed" as MainPhaseEnd;
      },
    });
    const machine = new TurnStateMachine(state, hooks);
    await machine.runTurn();

    // endPhase() applies the pass bonus while still in the OUTGOING player's frame (so it stores
    // as -PASS_TURN_MEMORY there); passTurn() at the top of the next run() iteration negates the
    // gauge into the new turn player's frame, at which point it reads as +3 in their favor. This
    // engine keeps memory turn-relative (documented divergence from source's fixed-seat
    // storage — MemoryGauge.ts), so the turn-relative value right after endPhase() is -3.
    expect(state.memory).toBe(-PASS_TURN_MEMORY);
  });

  it("6-5-1-4: a Main-phase 'link a card from hand' verb exists as a player-facing intent", async () => {
    cite(
      "comprehensive-0109",
      "6-5-1-4 'Linking a Card in the Hand or Battle Area' lists linking as one of the Main " +
        "phase's ordinary turn-player actions ('This action is where 1 card from the hand or " +
        "battle area is linked with 1 of your Digimon in the battle area'); 10-1-3-1/2/3 the " +
        "link procedure: declare and reveal a card, choose a Digimon meeting its printed " +
        "requirement, pay the cost, and plug it in. GameEngine.applyIntent's dispatch table " +
        "carries a 'linkCard' case (actions/link.ts) covering the HAND half of this action, " +
        "wired onto the existing Link primitive (effects/primitives.ts) that already performs " +
        "the actual plug-in.",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    // BT21-009 (Gatchmon): printed link cost 1, requirement "[Link] [Appmon] trait" — it
    // carries the [Appmon] form itself, so a second copy can link to it.
    const target = digimon(0, 2000, "BT21-009");
    p0.battleArea.push(target);
    const loose = instance("BT21-009", 0, false);
    p0.hand.push(loose);
    s.state.memory = 1;

    const result = s.engine.applyIntent(0, {
      type: "linkCard",
      instanceId: loose.instanceId,
      targetPermanentId: target.permanentId,
    });
    expect(result).toEqual({ ok: true });
    await settle(() => target.linked.some((c) => c.instanceId === loose.instanceId));
    expect(target.linked.some((c) => c.instanceId === loose.instanceId)).toBe(true);
  });

  it("6-5-1-4/§10-1-3: linkCard is rejected outside the Main phase", () => {
    cite("comprehensive-0109", "6-5-1-4 linking is a Main phase turn-player action.");

    const s = setup();
    s.state.phase = Phase.End;
    const p0 = s.state.players[0]!;
    const target = digimon(0, 2000, "BT21-009");
    p0.battleArea.push(target);
    const loose = instance("BT21-009", 0, false);
    p0.hand.push(loose);

    const result = s.engine.applyIntent(0, {
      type: "linkCard",
      instanceId: loose.instanceId,
      targetPermanentId: target.permanentId,
    });
    expect(result).toEqual({ ok: false, reason: "wrong-phase" });
  });

  it("6-5-1-4/§10-1-3: linkCard is rejected for a seat that is not the turn player", () => {
    cite("comprehensive-0109", "6-5-1-4 lists linking among the TURN PLAYER's Main phase actions.");

    const s = setup();
    s.state.turnSeat = 0;
    const p1 = s.state.players[1]!;
    const target = digimon(1, 2000, "BT21-009");
    p1.battleArea.push(target);
    const loose = instance("BT21-009", 1, false);
    p1.hand.push(loose);

    const result = s.engine.applyIntent(1, {
      type: "linkCard",
      instanceId: loose.instanceId,
      targetPermanentId: target.permanentId,
    });
    expect(result).toEqual({ ok: false, reason: "not-your-turn" });
  });

  it("§10-1-3-1: linkCard is rejected when the chosen Digimon doesn't meet the link requirement", () => {
    cite("comprehensive-0140", "10-1-3-1 the player chooses 1 of their Digimon that meets the [Link] requirement.");

    const s = setup();
    const p0 = s.state.players[0]!;
    // AD1-001 (Greymon) has no [Appmon] trait, so it fails BT21-009's printed requirement.
    const target = digimon(0, 5000, "AD1-001");
    p0.battleArea.push(target);
    const loose = instance("BT21-009", 0, false);
    p0.hand.push(loose);

    const result = s.engine.applyIntent(0, {
      type: "linkCard",
      instanceId: loose.instanceId,
      targetPermanentId: target.permanentId,
    });
    expect(result).toEqual({ ok: false, reason: "link-requirement-unmet" });
    expect(target.linked.length).toBe(0);
  });

  it("§10-1-3-2: linkCard is rejected when the printed link cost isn't affordable", () => {
    cite("comprehensive-0140", "10-1-3-2 the specified link cost is paid.");

    const s = setup();
    const p0 = s.state.players[0]!;
    const target = digimon(0, 2000, "BT21-009");
    p0.battleArea.push(target);
    const loose = instance("BT21-009", 0, false);
    p0.hand.push(loose);
    // Pin the gauge at the turn player's own far extreme: MaxMemoryCost is 0, so even
    // BT21-009's printed cost of 1 can't be paid.
    s.state.memory = -10;

    const result = s.engine.applyIntent(0, {
      type: "linkCard",
      instanceId: loose.instanceId,
      targetPermanentId: target.permanentId,
    });
    expect(result).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(target.linked.length).toBe(0);
  });
});

describe("§6-6 End of Turn (comprehensive-0110)", () => {
  it("6-6-3: once end-of-turn processing resolves, the non-turn player's turn begins", async () => {
    cite("comprehensive-0110", "6-6-3 once end-of-turn processing resolves, the non-turn player's turn begins");

    const state = twoPlayerState();
    state.isFirstPlayersFirstTurn = false;
    let turns = 0;
    const { hooks } = recordingHooks({
      isGameOver: () => turns >= 2,
      async runMainPhase() {
        turns += 1;
        return "crossed";
      },
    });
    const machine = new TurnStateMachine(state, hooks);
    await machine.run();

    // Two full turns ran (turnCount bumped once per Active phase: the loop runs runTurn() twice
    // before isGameOver() trips). passTurn() only fires BETWEEN iterations (not before the
    // first), so exactly ONE switch happened: the non-turn player (seat 1) is now the turn
    // player — proving 6-6-3's "the non-turn player's turn begins" actually took effect.
    expect(state.turnCount).toBe(2);
    expect(state.turnSeat).toBe(1);
  });

  it("6-6-4: an OnEndTurn effect that moves memory back to 0 or more postpones the end of the turn and continues the Main phase", async () => {
    cite(
      "comprehensive-0110",
      "6-6-4 'If the memory moves to 0 or more at the end of the turn, the end of the turn will " +
        "be postponed and the current phase will continue.' TurnStateMachine re-checks " +
        "MemoryGauge.hasCrossedToOpponent() after the OnEndTurn window: the gauge has to have " +
        "been on the opponent's side going IN and be back on the turn player's side coming OUT " +
        "(§6-6-4 is a MOVE), at which point the Main phase re-runs and the window re-opens.",
    );

    const state = twoPlayerState();
    state.isFirstPlayersFirstTurn = false;
    state.memory = -DEFAULT_TURN_END_MIN_MEMORY; // already crossed: without a move, the turn ends
    const phaseLog: string[] = [];
    let endTurnWindows = 0;
    const { hooks } = recordingHooks({
      // A once-per-turn OnEndTurn effect grants the turn player enough memory to un-cross the
      // gauge — exactly the §6-6-4 postponement trigger (turn-relative memory >= 0 favors the
      // turn player, i.e. the opponent's own-perspective memory drops back below the threshold).
      async fireTiming(timing) {
        if (timing !== EffectTiming.OnEndTurn) return;
        endTurnWindows += 1;
        if (endTurnWindows === 1) state.memory = 0;
      },
      async runMainPhase() {
        return "crossed" as MainPhaseEnd;
      },
    });
    const machine = new TurnStateMachine(state, hooks, undefined, (e) => {
      if (e.kind === "phaseChanged") phaseLog.push(e.phase);
    });

    await machine.runTurn();

    // Postponed once: the Main phase ran a second time and the end-of-turn window re-opened.
    expect(phaseLog.filter((p) => p === Phase.Main).length).toBe(2);
    expect(endTurnWindows).toBe(2);
    // ...and then the turn actually ended — postponement is not a hang.
    expect(phaseLog.at(-1)).toBe(Phase.End);
  });

  it("6-6-4: a turn whose gauge never crossed is not postponed (the rule needs a MOVE, not a value)", async () => {
    cite(
      "comprehensive-0110",
      "6-6-4 read together with 6-1-4-1: the turn end condition is the memory reaching 1 or more " +
        "on the opponent's side. A turn that ends without the gauge ever being over there has " +
        "nothing to move BACK, so no postponement applies and the End phase follows directly.",
    );

    const state = twoPlayerState();
    state.isFirstPlayersFirstTurn = false;
    const phaseLog: string[] = [];
    const { hooks } = recordingHooks({
      async fireTiming(timing) {
        if (timing === EffectTiming.OnEndTurn) state.memory = 0; // no-op: already 0
      },
      async runMainPhase() {
        return "crossed" as MainPhaseEnd;
      },
    });
    const machine = new TurnStateMachine(state, hooks, undefined, (e) => {
      if (e.kind === "phaseChanged") phaseLog.push(e.phase);
    });

    await machine.runTurn();

    expect(phaseLog.filter((p) => p === Phase.Main).length).toBe(1);
    expect(phaseLog.at(-1)).toBe(Phase.End);
  });
});
