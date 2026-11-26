import type { MatchReplay } from "@aegis/shared/replays";
import type { GameState } from "@aegis/shared/schema/GameState";
import type { Seat } from "@aegis/shared/schema/enums";
import { ReplayAdvantageSource } from "@/replays/analysis/ReplayAdvantageSource";
import { turnPositions } from "@/replays/playback";

export type ReplaySeatStats = {
  memory: number;
  security: number;
  board: number;
  hand: number;
  trash: number;
  deck: number;
};

export type ReplayTurnStats = {
  turn: number;
  seat: Seat;
  startIndex: number;
  endIndex: number;
  peakIndex: number;
  players: [ReplaySeatStats, ReplaySeatStats];
  changes: [ReplaySeatStats, ReplaySeatStats];
  swing: number;
  turningPoint: boolean;
};

export type ReplayAnalysis = {
  source: ReplayAdvantageSource;
  series: number[];
  turns: ReplayTurnStats[];
  keyMoments: ReplayTurnStats[];
};

type Params = { replay: MatchReplay };
type AdvantageMeasure = { source: ReplayAdvantageSource; values: number[]; turningPoint: number; span: number };

const SECURITY_WEIGHT = 3;
const BOARD_WEIGHT = 2;
const HAND_WEIGHT = 1;
const HEURISTIC_TURNING_POINT = 6;
const BOT_TURNING_POINT = 25;
const KEY_MOMENT_COUNT = 3;

export function buildReplayAnalysis({ replay }: Params): ReplayAnalysis {
  const measure = getAdvantageMeasure(replay);
  const positions = turnPositions(replay);
  const turns = positions.flatMap((position, order): ReplayTurnStats[] => {
    if (position.turn === 0) {
      return [];
    }
    const endIndex = (positions[order + 1]?.index ?? replay.frames.length) - 1;
    const beforeIndex = Math.max(0, position.index - 1);
    const swing = measure.values[endIndex]! - measure.values[beforeIndex]!;
    const players = getSeatPair(replay.frames[endIndex]!.state);
    const previous = getSeatPair(replay.frames[beforeIndex]!.state);
    return [
      {
        turn: position.turn,
        seat: position.seat,
        startIndex: position.index,
        endIndex,
        peakIndex: findPeakIndex({ values: measure.values, startIndex: position.index, endIndex, swing }),
        players,
        changes: [subtractStats(players[0], previous[0]), subtractStats(players[1], previous[1])],
        swing,
        turningPoint: Math.abs(swing) >= measure.turningPoint,
      },
    ];
  });
  return {
    source: measure.source,
    series: measure.values.map((value) => Math.min(1, Math.max(0, 0.5 + value / (2 * measure.span)))),
    turns,
    keyMoments: findKeyMoments({ turns, winnerSeat: replay.winnerSeat }),
  };
}

function getAdvantageMeasure(replay: MatchReplay): AdvantageMeasure {
  const advantage = replay.advantage;
  if (advantage !== undefined && advantage.length === replay.frames.length) {
    return {
      source: ReplayAdvantageSource.BOT.value,
      values: advantage.map((value) => Math.round((value - 0.5) * 100)),
      turningPoint: BOT_TURNING_POINT,
      span: 50,
    };
  }
  const values = replay.frames.map((frame) => getHeuristicAdvantage(frame.state));
  return {
    source: ReplayAdvantageSource.HEURISTIC.value,
    values,
    turningPoint: HEURISTIC_TURNING_POINT,
    span: Math.max(1, ...values.map(Math.abs)),
  };
}

function getSeatStats(state: GameState, seat: Seat): ReplaySeatStats {
  const player = state.players[seat]!;
  return {
    memory: state.turnSeat === seat ? state.memory : -state.memory,
    security: player.securityCount,
    board: player.battleArea.length,
    hand: player.handCount,
    trash: player.trash.length,
    deck: player.deckCount,
  };
}

function getSeatPair(state: GameState): [ReplaySeatStats, ReplaySeatStats] {
  return [getSeatStats(state, 0), getSeatStats(state, 1)];
}

function subtractStats(current: ReplaySeatStats, previous: ReplaySeatStats): ReplaySeatStats {
  return {
    memory: current.memory - previous.memory,
    security: current.security - previous.security,
    board: current.board - previous.board,
    hand: current.hand - previous.hand,
    trash: current.trash - previous.trash,
    deck: current.deck - previous.deck,
  };
}

function getHeuristicAdvantage(state: GameState): number {
  const [first, second] = getSeatPair(state);
  return (
    SECURITY_WEIGHT * (first.security - second.security) +
    BOARD_WEIGHT * (first.board - second.board) +
    HAND_WEIGHT * (first.hand - second.hand)
  );
}

type PeakParams = { values: readonly number[]; startIndex: number; endIndex: number; swing: number };

function findPeakIndex({ values, startIndex, endIndex, swing }: PeakParams): number {
  const direction = Math.sign(swing);
  let peakIndex = startIndex;
  let peakChange = 0;
  for (let index = Math.max(1, startIndex); index <= endIndex; index++) {
    const change = direction * (values[index]! - values[index - 1]!);
    if (change > peakChange) {
      peakChange = change;
      peakIndex = index;
    }
  }
  return peakIndex;
}

type KeyMomentParams = { turns: readonly ReplayTurnStats[]; winnerSeat: number };

function findKeyMoments({ turns, winnerSeat }: KeyMomentParams): ReplayTurnStats[] {
  return turns
    .filter((turn) => getImpact(turn, winnerSeat) > 0)
    .sort((first, second) => getImpact(second, winnerSeat) - getImpact(first, winnerSeat))
    .slice(0, KEY_MOMENT_COUNT);
}

function getImpact(turn: ReplayTurnStats, winnerSeat: number): number {
  if (winnerSeat === 0) {
    return turn.swing;
  }
  if (winnerSeat === 1) {
    return -turn.swing;
  }
  return Math.abs(turn.swing);
}
