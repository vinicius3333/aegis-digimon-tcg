import type { MatchReplay, ReplayFrame } from "@aegis/shared/replays";
import type { GameState } from "@aegis/shared/schema/GameState";
import { Zone, type Seat } from "@aegis/shared/schema/enums";

export type ReplayPlayerStats = {
  attacks: number;
  securityChecks: number;
  blocks: number;
  lostInBattle: number;
  lostToEffects: number;
  digivolutions: number;
  cardsPlayed: number;
  memorySpent: number;
  effects: number;
};

export type ReplayDrawnCard = { cardId: string; byEffect: boolean };
export type ReplayTurnDraws = { turn: number; frameIndex: number; cards: ReplayDrawnCard[] };

export type ReplayPlayerReport = {
  seat: Seat;
  openingHand: string[];
  startingHand: string[];
  redrew: boolean;
  draws: ReplayTurnDraws[];
  stats: ReplayPlayerStats;
};

type Params = { replay: MatchReplay };
type FrameParams = { frame: ReplayFrame; previous: ReplayFrame | undefined; seat: Seat };

const SEATS = [0, 1] as const satisfies readonly Seat[];

export function buildReplayPlayerReports({ replay }: Params): [ReplayPlayerReport, ReplayPlayerReport] {
  const [first, second] = SEATS.map((seat) => buildReport({ replay, seat }));
  return [first!, second!];
}

function buildReport({ replay, seat }: { replay: MatchReplay; seat: Seat }): ReplayPlayerReport {
  const opening = replay.frames[0]!.state.players[seat]!.hand;
  const setupEnd = replay.frames.findIndex((frame) => frame.state.turnCount > 0);
  const starting = replay.frames[Math.max(0, setupEnd - 1)]!.state.players[seat]!.hand;
  const draws: ReplayTurnDraws[] = [];
  const stats = createStats();
  replay.frames.forEach((frame, index) => {
    const previous = replay.frames[index - 1];
    countEvents({ frame, previous, seat, stats });
    const cards = findDrawnCards({ frame, previous, seat });
    if (cards.length === 0 || frame.state.turnCount === 0) {
      return;
    }
    const last = draws.at(-1);
    if (last?.turn === frame.state.turnCount) {
      last.cards.push(...cards);
    } else {
      draws.push({ turn: frame.state.turnCount, frameIndex: index, cards });
    }
  });
  const openingIds = new Set(opening.map((card) => card.instanceId));
  return {
    seat,
    openingHand: opening.map((card) => card.cardId),
    startingHand: starting.map((card) => card.cardId),
    redrew: starting.length !== opening.length || starting.some((card) => !openingIds.has(card.instanceId)),
    draws,
    stats,
  };
}

function createStats(): ReplayPlayerStats {
  return {
    attacks: 0,
    securityChecks: 0,
    blocks: 0,
    lostInBattle: 0,
    lostToEffects: 0,
    digivolutions: 0,
    cardsPlayed: 0,
    memorySpent: 0,
    effects: 0,
  };
}

function countEvents({ frame, previous, seat, stats }: FrameParams & { stats: ReplayPlayerStats }): void {
  for (const event of frame.events) {
    if (event.kind === "attackDeclared" && event.seat === seat) {
      stats.attacks += 1;
    } else if (event.kind === "securityChecked" && event.seat !== seat) {
      stats.securityChecks += 1;
    } else if (event.kind === "blocked" && findOwner(event.blockerPermanentId, frame, previous) === seat) {
      stats.blocks += 1;
    } else if (event.kind === "digivolved" && event.seat === seat) {
      stats.digivolutions += 1;
    } else if (event.kind === "cardPlayed" && event.seat === seat) {
      stats.cardsPlayed += 1;
    } else if (event.kind === "effectTriggered" && event.seat === seat) {
      stats.effects += 1;
    } else if (event.kind === "memoryChanged" && event.reason === "payCost") {
      stats.memorySpent += getPaidMemory({ from: event.from, to: event.to, payer: seat, state: frame.state });
    } else if (event.kind === "cardsMoved") {
      for (const deleted of event.deletedPermanents ?? []) {
        if (deleted.seat !== seat) {
          continue;
        }
        if (event.battleDeletion) {
          stats.lostInBattle += 1;
        } else {
          stats.lostToEffects += 1;
        }
      }
    }
  }
}

function getPaidMemory({ from, to, payer, state }: { from: number; to: number; payer: Seat; state: GameState }) {
  const towardOpponent = from - to;
  if (state.turnSeat === payer) {
    return Math.max(0, towardOpponent);
  }
  return Math.max(0, -towardOpponent);
}

function findOwner(permanentId: string, ...frames: (ReplayFrame | undefined)[]): Seat | undefined {
  for (const frame of frames) {
    for (const seat of SEATS) {
      if (frame?.state.players[seat]?.battleArea.some((permanent) => permanent.permanentId === permanentId)) {
        return seat;
      }
    }
  }
  return undefined;
}

function findDrawnCards({ frame, previous, seat }: FrameParams): ReplayDrawnCard[] {
  const moves = frame.events.filter(
    (event) =>
      event.kind === "cardsMoved" &&
      event.from === Zone.Deck &&
      event.to === Zone.Hand &&
      (event.fromSeat ?? event.seat) === seat,
  );
  if (moves.length === 0 || previous === undefined) {
    return [];
  }
  const hand = new Map(frame.state.players[seat]!.hand.map((card) => [card.instanceId, card.cardId]));
  const before = new Set(previous.state.players[seat]!.hand.map((card) => card.instanceId));
  const unclaimed = [...hand.keys()].filter((id) => !before.has(id));
  const claim = (matches: (id: string) => boolean): string | undefined => {
    const position = unclaimed.findIndex(matches);
    return position < 0 ? undefined : unclaimed.splice(position, 1)[0];
  };
  const cards: ReplayDrawnCard[] = [];
  for (const move of moves) {
    if (move.kind !== "cardsMoved") {
      continue;
    }
    move.instanceIds.forEach((id, position) => {
      const known = hand.get(id) ?? move.cardIds?.[position];
      const claimed = claim((candidate) => candidate === id || known === undefined || hand.get(candidate) === known);
      const cardId = known ?? hand.get(claimed ?? "");
      if (cardId !== undefined) {
        cards.push({ cardId, byEffect: move.handAddition === "transfer" });
      }
    });
  }
  return cards;
}
