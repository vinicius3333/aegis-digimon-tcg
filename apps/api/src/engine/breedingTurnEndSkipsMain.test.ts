import { ArraySchema } from "@colyseus/schema";
import { EffectTiming, GameState, Phase, PlayerState, type ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { DEFAULT_TURN_END_MIN_MEMORY } from "./MemoryGauge.js";
import { TurnStateMachine, type MainPhaseEnd, type TurnFlowHooks } from "./TurnStateMachine.js";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

/** Minimal two-seat state and no-op hooks, so a test only overrides what it asserts on. */
function machineFixture(overrides: Partial<TurnFlowHooks> = {}): {
  state: GameState;
  machine: TurnStateMachine;
  phases: string[];
  calls: string[];
} {
  const state = new GameState();
  state.players = new ArraySchema<PlayerState>();
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  state.turnSeat = 0;
  state.memory = 0;
  state.isFirstPlayersFirstTurn = true;
  const calls: string[] = [];
  const hooks: TurnFlowHooks = {
    async fireTiming(timing) {
      calls.push(`fireTiming:${EffectTiming[timing]}`);
    },
    async draw() {
      return 0;
    },
    deckCount: () => 10,
    async unsuspendForActivePhase() {
      return [];
    },
    async runBreedingPhase() {
      calls.push("breeding");
    },
    async runMainPhase() {
      calls.push("main");
      return "passed" as MainPhaseEnd;
    },
    isGameOver: () => false,
    declareDeckOutLoss() {},
    async clearDurations() {},
    ...overrides,
  };
  const phases: string[] = [];
  const machine = new TurnStateMachine(state, hooks, undefined, (event: ServerEvent) => {
    if (event.kind === "phaseChanged") phases.push(event.phase);
  });
  return { state, machine, phases, calls };
}

/**
 * Comprehensive Rules §6-1-4-1: the turn end conditions are met when the memory is at 1 or
 * more on the opponent's side and all processing has been resolved for the current phase —
 * "then, the turn will end with the current phase". So a breeding-phase action that pushes
 * the gauge across to the opponent ends the turn IN the breeding phase: the main phase never
 * starts and no [Start of Your Main Phase] effect activates.
 *
 * Official Q&A Q1770 (BT8-094 Digimon Emperor): "During the breeding phase, I move a Digimon
 * from the breeding area to the battle area and due to this card's [Opponent's Turn] effect of
 * my opponent, and the memory gauge moves to 1 or more on my opponent's side. In this case, do
 * I have a main phase?" -> "No, the main phase doesn't take place and the turn ends."
 *
 * FAILS-WHEN-REVERTED: drop the §6-1-4-1 gate in `TurnStateMachine.runTurn` and the machine
 * runs Main unconditionally after breeding, so Phase.Main is entered and BT19-088's
 * [Start of Your Main Phase] memory gain fires on a turn that had already ended.
 */
describe("breeding-phase turn end (§6-1-4-1)", () => {
  it("ends the turn in the breeding phase and never opens Main when the gauge crossed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-088", as: "aiMako" }],
          breeding: { card: "BT1-009", dp: 3000, as: "mover" },
          deck: ["BT1-010", "BT1-010"],
          eggDeck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT8-094", dp: 0, as: "emperor" }, { card: "BT1-009", as: "blocker" }],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });

    await turn;

    const phases = s.events.flatMap((e) => (e.kind === "phaseChanged" ? [e.phase] : []));
    // The +2 from BT8-094 puts the opponent at 1 memory: the turn ends with breeding.
    expect(s.state.memory).toBe(-1);
    expect(phases).not.toContain(Phase.Main);
    expect(phases.at(-1)).toBe(Phase.End);
  });

  it("does not open Main or fire its start timing when breeding left the gauge on the opponent's side", async () => {
    const { state, machine, phases, calls } = machineFixture({
      async runBreedingPhase() {
        calls.push("breeding");
        state.memory = -DEFAULT_TURN_END_MIN_MEMORY; // a breeding trigger crossed the gauge
      },
    });

    await machine.runTurn();

    expect(calls).not.toContain("main");
    expect(calls).not.toContain(`fireTiming:${EffectTiming[EffectTiming.OnStartMainPhase]}`);
    expect(phases).toEqual([Phase.Active, Phase.Draw, Phase.Breeding, Phase.End]);
  });

  it("§6-6-4: when an OnEndTurn effect hands the memory back, the postponed turn continues into Main", async () => {
    let endTurnWindows = 0;
    const { state, machine, phases, calls } = machineFixture({
      async runBreedingPhase() {
        calls.push("breeding");
        state.memory = -DEFAULT_TURN_END_MIN_MEMORY;
      },
      async fireTiming(timing) {
        calls.push(`fireTiming:${EffectTiming[timing]}`);
        if (timing !== EffectTiming.OnEndTurn) return;
        endTurnWindows += 1;
        if (endTurnWindows === 1) state.memory = 0;
      },
      async runMainPhase(_seat) {
        calls.push("main");
        state.memory = -DEFAULT_TURN_END_MIN_MEMORY;
        return "crossed" as MainPhaseEnd;
      },
    });

    await machine.runTurn();

    // The turn that had already ended is resumed, so Main now takes place once, in full —
    // entered as a new phase with its start-of-main timing, not resumed mid-phase.
    expect(calls.filter((call) => call === "main")).toHaveLength(1);
    expect(calls).toContain(`fireTiming:${EffectTiming[EffectTiming.OnStartMainPhase]}`);
    expect(phases).toEqual([Phase.Active, Phase.Draw, Phase.Breeding, Phase.Main, Phase.End]);
  });
});
