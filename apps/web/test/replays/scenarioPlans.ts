import { Phase, type GameState, type Intent } from "@aegis/shared";
import { SCENARIO_PLANS, SKIP, type ScenarioPlan } from "../pacing/scenarios";
import { REPLAY_RECORDINGS } from "./recordings";
const passBreeding = (state: GameState) =>
  state.turnSeat !== 0 ? undefined : state.phase === Phase.Breeding ? { type: "endPhase" as const } : SKIP;
const passMain = (state: GameState): Intent | undefined =>
  state.turnSeat === 0 && state.phase === Phase.Main ? { type: "endPhase" } : undefined;
const play =
  (cardId: string) =>
  (state: GameState): Intent | undefined => {
    const card = state.players[0]!.hand.find((entry) => entry.cardId === cardId);
    return card ? { type: "playCard", instanceId: card.instanceId } : undefined;
  };
export const REPLAY_PLANS: readonly ScenarioPlan[] = [
  ...SCENARIO_PLANS.filter((plan) => (REPLAY_RECORDINGS as readonly string[]).includes(plan.id)),
  {
    id: "arena-bt24-silphymon-dna",
    answers: {},
    maxMs: 150000,
    moves: [
      passBreeding,
      (state) => {
        const card = state.players[0]!.hand.find((entry) => entry.cardId === "BT24-037");
        const materials = state.players[0]!.battleArea.filter((entry) =>
          ["BT24-035", "BT24-046"].includes(entry.topCard.cardId),
        );
        return card && materials.length === 2
          ? {
              type: "dnaDigivolve",
              instanceId: card.instanceId,
              materialPermanentIds: materials.map((entry) => entry.permanentId),
            }
          : undefined;
      },
    ],
    finished: (state, resolved) =>
      resolved[0] >= 1 && state.players[0]!.battleArea.some((entry) => entry.topCard.cardId === "BT24-037"),
  },
  {
    id: "phase-pacing-bot-raising-move",
    answers: {},
    maxMs: 150000,
    moves: [passBreeding, passMain],
    finished: (state) => state.turnSeat === 0 && state.turnCount >= 3,
  },
  {
    id: "keyword-pacing-recovery-many",
    answers: {},
    maxMs: 150000,
    moves: [passBreeding, play("BT2-039")],
    finished: (state) => state.players[0]!.securityCount >= 3,
  },
  {
    id: "keyword-pacing-draw-many",
    answers: {},
    maxMs: 150000,
    moves: [passBreeding, play("BT1-041")],
    finished: (_state, resolved) => resolved[0] >= 1,
  },
];
