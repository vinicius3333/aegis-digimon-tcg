import { GameState, Phase, type Intent, type Seat, type ServerEvent } from "@aegis/shared";
import { GameEngine } from "../engine/GameEngine.js";
import { BLUE_DECK, RED_DECK, type Decklist } from "../engine/testDecks.js";
import { BotPlayer } from "./BotPlayer.js";
import { createEvaluationPolicy, type BotPolicy } from "./policy.js";
import { resolveBotProfile, type BotProfile, type BotProfileName } from "./profiles.js";
import "../cards/index.js";

/**
 * Headless bot-vs-bot match runner.
 *
 * It wires a real `GameEngine` to two `BotPlayer` seats through exactly the callbacks
 * `AegisRoom` uses (`requestDecision`, `emit`, `onActionSettled`), so what the benchmark
 * measures is the shipping code path and not a simplified stand-in. The only substitution
 * is the think delay: seats are given a microtask yield instead of a timer, which removes
 * ~2s per action without changing a single decision.
 */

export interface SeatConfig {
  profile?: BotProfileName | BotProfile;
  policy?: BotPolicy;
  deck?: Decklist;
  label?: string;
}

export interface MatchOptions {
  seed: number;
  seats: readonly [SeatConfig, SeatConfig];
  /** Abort a match that has not ended by this turn, scoring it as a draw. */
  turnLimit?: number;
}

export interface SeatStats {
  label: string;
  attacksDeclared: number;
  securityCardsTaken: number;
  digimonPlayed: number;
  digivolutions: number;
  turnsTaken: number;
  /** Every decision latency sample (ms) this seat's policy spent choosing an action. */
  decisionLatenciesMs: number[];
}

export interface MatchResult {
  seed: number;
  winnerSeat: Seat | undefined;
  reason: string;
  turnCount: number;
  timedOut: boolean;
  rejections: { seat: Seat; intent: string; reason: string }[];
  errors: string[];
  seats: [SeatStats, SeatStats];
}

const DEFAULT_TURN_LIMIT = 60;

function emptyStats(label: string): SeatStats {
  return {
    label,
    attacksDeclared: 0,
    securityCardsTaken: 0,
    digimonPlayed: 0,
    digivolutions: 0,
    turnsTaken: 0,
    decisionLatenciesMs: [],
  };
}

/** Run one complete match between two bot seats and report what happened. */
export async function runBotMatch(options: MatchOptions): Promise<MatchResult> {
  const turnLimit = options.turnLimit ?? DEFAULT_TURN_LIMIT;
  const state = new GameState();
  const stats: [SeatStats, SeatStats] = [
    emptyStats(options.seats[0].label ?? String(options.seats[0].profile ?? "seat0")),
    emptyStats(options.seats[1].label ?? String(options.seats[1].profile ?? "seat1")),
  ];
  const rejections: MatchResult["rejections"] = [];
  const errors: string[] = [];
  const bots: (BotPlayer | undefined)[] = [undefined, undefined];
  let finished = false;
  let winnerSeat: Seat | undefined;
  let reason = "unfinished";

  const engine = new GameEngine(state, {
    seed: options.seed,
    requestDecision: (seat, request) => {
      bots[seat]?.onDecisionRequested(request);
    },
    onActionSettled: (seat, intentType) => {
      bots[seat]?.onActionSettled(intentType);
    },
    emit: (event: ServerEvent) => {
      recordEvent(event, state, stats);
      if (event.kind === "gameOver") {
        finished = true;
        reason = event.reason;
        winnerSeat = event.result.outcome === "win" ? event.result.winnerSeat : undefined;
      }
      bots[0]?.onEvent(event);
      bots[1]?.onEvent(event);
    },
  });

  for (const seat of [0, 1] as const) {
    const config = options.seats[seat];
    const send = (intent: Intent) => {
      try {
        const result = engine.applyIntent(seat, intent);
        if (!result.ok) rejections.push({ seat, intent: intent.type, reason: result.reason });
        return result;
      } catch (error) {
        errors.push(`seat ${seat} ${intent.type}: ${String(error)}`);
        return { ok: false as const, reason: "not-implemented" as const };
      }
    };
    const seed = options.seed + seat * 7919;
    const policy =
      config.policy ?? createEvaluationPolicy({ profile: resolveBotProfile(config.profile), seed });
    bots[seat] = new BotPlayer(seat, state, send, {
      policy: timed(policy, stats[seat].decisionLatenciesMs),
      seed,
      thinkDelay: microtask,
    });
  }

  engine.seatPlayer(0, "bot-0", {
    displayName: stats[0].label,
    deck: options.seats[0].deck ?? RED_DECK,
  });
  engine.seatPlayer(1, "bot-1", {
    displayName: stats[1].label,
    deck: options.seats[1].deck ?? BLUE_DECK,
  });
  engine.startMatch();

  // Drive the cooperative loop: every bot action is scheduled on the macrotask queue, so
  // yielding repeatedly is all that is needed to let the match play itself out. A match
  // that wedges (an unanswered engine window) stops making progress, which is what the
  // stall detector watches for — otherwise the loop would spin forever.
  let ticksSinceProgress = 0;
  let progressSignature = "";
  let timedOut = false;
  for (;;) {
    await microtask();
    if (finished) break;
    if (state.turnCount > turnLimit) {
      timedOut = true;
      break;
    }
    const signature = `${state.turnCount}:${state.phase}:${state.memory}:${state.pendingDecision?.decisionId ?? ""}`;
    if (signature === progressSignature) {
      ticksSinceProgress += 1;
      if (ticksSinceProgress > 5_000) {
        errors.push(`match stalled at ${signature}`);
        break;
      }
    } else {
      progressSignature = signature;
      ticksSinceProgress = 0;
    }
  }

  return {
    seed: options.seed,
    winnerSeat,
    reason: finished ? reason : timedOut ? "turnLimit" : "stalled",
    turnCount: state.turnCount,
    timedOut,
    rejections,
    errors,
    seats: stats,
  };
}

/**
 * Wrap a policy so every Main-phase action choice is timed. Only `chooseMainAction` is
 * instrumented: it is the one that enumerates and scores the whole candidate set, so it
 * bounds the cost of every other decision the policy makes.
 */
function timed(policy: BotPolicy, samples: number[]): BotPolicy {
  return {
    ...policy,
    chooseMainAction(view) {
      const start = process.hrtime.bigint();
      const intent = policy.chooseMainAction(view);
      samples.push(Number(process.hrtime.bigint() - start) / 1e6);
      return intent;
    },
  };
}

function recordEvent(event: ServerEvent, state: GameState, stats: [SeatStats, SeatStats]): void {
  switch (event.kind) {
    case "attackDeclared":
      stats[event.seat].attacksDeclared += 1;
      break;
    case "securityChecked":
      // `seat` is the seat whose security was checked, so the attacker took the card.
      stats[event.seat === 0 ? 1 : 0].securityCardsTaken += 1;
      break;
    case "cardPlayed":
      if (state.turnSeat === 0 || state.turnSeat === 1) stats[state.turnSeat].digimonPlayed += 1;
      break;
    case "digivolved":
      if (state.turnSeat === 0 || state.turnSeat === 1) stats[state.turnSeat].digivolutions += 1;
      break;
    case "phaseChanged":
      if (event.phase === Phase.Breeding) stats[event.turnSeat].turnsTaken += 1;
      break;
  }
}

function microtask(): Promise<void> {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

export interface SeriesOptions {
  games: number;
  baseSeed?: number;
  seats: readonly [SeatConfig, SeatConfig];
  turnLimit?: number;
  /** Swap which seat plays first half-way through so seat advantage cancels out. */
  alternateSeats?: boolean;
}

export interface SeriesResult {
  games: number;
  /** Wins credited to the configuration listed first in `seats`, regardless of seat. */
  winsA: number;
  winsB: number;
  draws: number;
  /** Wins / decisive games for configuration A. */
  winRateA: number;
  averageTurns: number;
  totalRejections: number;
  /** Rejections attributed to each configuration, so a baseline's noise stays its own. */
  rejectionsA: number;
  rejectionsB: number;
  rejectionReasons: Record<string, number>;
  errors: string[];
  statsA: AggregateStats;
  statsB: AggregateStats;
}

export interface AggregateStats {
  label: string;
  attacksPerTurn: number;
  securityTakenPerGame: number;
  digimonPlayedPerGame: number;
  digivolutionsPerGame: number;
  medianDecisionMs: number;
  p95DecisionMs: number;
  maxDecisionMs: number;
}

/** Play `games` matches between two configurations and aggregate the outcome. */
export async function runBotSeries(options: SeriesOptions): Promise<SeriesResult> {
  const baseSeed = options.baseSeed ?? 1;
  const alternate = options.alternateSeats ?? true;
  let winsA = 0;
  let winsB = 0;
  let draws = 0;
  let totalTurns = 0;
  let totalRejections = 0;
  let rejectionsA = 0;
  let rejectionsB = 0;
  const rejectionReasons: Record<string, number> = {};
  const errors: string[] = [];
  const rawA: SeatStats[] = [];
  const rawB: SeatStats[] = [];

  for (let game = 0; game < options.games; game += 1) {
    const swap = alternate && game % 2 === 1;
    const seats = (swap ? [options.seats[1], options.seats[0]] : [options.seats[0], options.seats[1]]) as [
      SeatConfig,
      SeatConfig,
    ];
    const result = await runBotMatch({ seed: baseSeed + game * 104_729, seats, turnLimit: options.turnLimit });

    const seatOfA: Seat = swap ? 1 : 0;
    if (result.winnerSeat === undefined) draws += 1;
    else if (result.winnerSeat === seatOfA) winsA += 1;
    else winsB += 1;

    totalTurns += result.turnCount;
    totalRejections += result.rejections.length;
    for (const rejection of result.rejections) {
      if (rejection.seat === seatOfA) rejectionsA += 1;
      else rejectionsB += 1;
      const key = `${rejection.intent}:${rejection.reason}`;
      rejectionReasons[key] = (rejectionReasons[key] ?? 0) + 1;
    }
    errors.push(...result.errors);
    rawA.push(result.seats[seatOfA]);
    rawB.push(result.seats[seatOfA === 0 ? 1 : 0]);
  }

  const decisive = winsA + winsB;
  return {
    games: options.games,
    winsA,
    winsB,
    draws,
    winRateA: decisive === 0 ? 0 : winsA / decisive,
    averageTurns: totalTurns / options.games,
    totalRejections,
    rejectionsA,
    rejectionsB,
    rejectionReasons,
    errors,
    statsA: aggregate(options.seats[0].label ?? "A", rawA),
    statsB: aggregate(options.seats[1].label ?? "B", rawB),
  };
}

function aggregate(label: string, samples: readonly SeatStats[]): AggregateStats {
  const games = Math.max(1, samples.length);
  const totalTurns = Math.max(1, samples.reduce((sum, sample) => sum + sample.turnsTaken, 0));
  const latencies = samples.flatMap((sample) => sample.decisionLatenciesMs).sort((a, b) => a - b);
  const quantile = (fraction: number): number =>
    latencies.length === 0 ? 0 : latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * fraction))]!;

  return {
    label,
    attacksPerTurn: samples.reduce((sum, sample) => sum + sample.attacksDeclared, 0) / totalTurns,
    securityTakenPerGame: samples.reduce((sum, sample) => sum + sample.securityCardsTaken, 0) / games,
    digimonPlayedPerGame: samples.reduce((sum, sample) => sum + sample.digimonPlayed, 0) / games,
    digivolutionsPerGame: samples.reduce((sum, sample) => sum + sample.digivolutions, 0) / games,
    medianDecisionMs: quantile(0.5),
    p95DecisionMs: quantile(0.95),
    maxDecisionMs: latencies[latencies.length - 1] ?? 0,
  };
}
