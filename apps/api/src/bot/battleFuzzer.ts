import type { ServerEvent } from "@aegis/shared";
import type { Decklist } from "../engine/testDecks.js";
import { runBotMatch, type MatchResult } from "./matchHarness.js";
import { analyzePresentationEvents, type PresentationAnomaly } from "./presentationOracle.js";
import type { PresentationRisk } from "./presentationOracle.js";

export interface FuzzDeck {
  id: string;
  deck: Decklist;
}

export interface BattleFuzzOptions {
  decks: readonly FuzzDeck[];
  baseSeed?: number;
  seedsPerMatchup?: number;
  /** Test A-vs-B and B-vs-A separately. */
  orderedSeats?: boolean;
  /** Useful for a quick local/CI sample. Omit for the complete matrix. */
  maximumMatchups?: number;
  turnLimit?: number;
  maximumPresentationBurst?: number;
  runMatch?: typeof runBotMatch;
}

export interface BattleFuzzFailure {
  decks: readonly [string, string];
  seed: number;
  engineErrors: string[];
  rejections: MatchResult["rejections"];
  presentationAnomalies: PresentationAnomaly[];
  reason: string;
  turnCount: number;
}

export interface BattleFuzzRisk {
  decks: readonly [string, string];
  seed: number;
  presentationRisks: PresentationRisk[];
}

export interface BattleFuzzReport {
  deckCount: number;
  matchupCount: number;
  matchCount: number;
  eventCount: number;
  failures: BattleFuzzFailure[];
  risks: BattleFuzzRisk[];
}

export function createMatchups(decks: readonly FuzzDeck[], orderedSeats = true): readonly [FuzzDeck, FuzzDeck][] {
  const matchups: [FuzzDeck, FuzzDeck][] = [];
  for (let left = 0; left < decks.length; left += 1) {
    const firstRight = orderedSeats ? 0 : left;
    for (let right = firstRight; right < decks.length; right += 1) matchups.push([decks[left]!, decks[right]!]);
  }
  return matchups;
}

function publicEvents(result: MatchResult): readonly ServerEvent[] {
  if (!result.events) throw new Error("Battle fuzzer requires runBotMatch({ captureEvents: true }) event capture");
  return result.events;
}

/** Run a reproducible deck matrix and return only compact failure receipts. */
export async function runBattleFuzz(options: BattleFuzzOptions): Promise<BattleFuzzReport> {
  if (options.decks.length === 0) throw new Error("Battle fuzzer needs at least one deck");
  const seedsPerMatchup = options.seedsPerMatchup ?? 1;
  if (!Number.isInteger(seedsPerMatchup) || seedsPerMatchup < 1) throw new Error("seedsPerMatchup must be positive");
  if (
    options.maximumMatchups !== undefined &&
    (!Number.isInteger(options.maximumMatchups) || options.maximumMatchups < 1)
  ) {
    throw new Error("maximumMatchups must be positive");
  }
  const baseSeed = options.baseSeed ?? 20_260_914;
  if (!Number.isSafeInteger(baseSeed) || baseSeed < 0) throw new Error("baseSeed must be a non-negative safe integer");

  const allMatchups = createMatchups(options.decks, options.orderedSeats ?? true);
  const matchups = allMatchups.slice(0, options.maximumMatchups ?? allMatchups.length);
  const runMatch = options.runMatch ?? runBotMatch;
  const failures: BattleFuzzFailure[] = [];
  const risks: BattleFuzzRisk[] = [];
  let eventCount = 0;

  for (let matchupIndex = 0; matchupIndex < matchups.length; matchupIndex += 1) {
    const [left, right] = matchups[matchupIndex]!;
    for (let seedIndex = 0; seedIndex < seedsPerMatchup; seedIndex += 1) {
      const seed = baseSeed + matchupIndex * 104_729 + seedIndex * 7_919;
      if (!Number.isSafeInteger(seed)) throw new Error("Generated seed exceeds the safe integer range");
      const result = await runMatch({
        seed,
        seats: [
          { profile: "balanced", label: left.id, deck: left.deck },
          { profile: "balanced", label: right.id, deck: right.deck },
        ],
        turnLimit: options.turnLimit,
        captureEvents: true,
      });
      const events = publicEvents(result);
      eventCount += events.length;
      const presentation = analyzePresentationEvents(events, { maximumBurst: options.maximumPresentationBurst });
      if (presentation.risks.length > 0) {
        risks.push({ decks: [left.id, right.id], seed, presentationRisks: presentation.risks });
      }
      const failed =
        result.errors.length > 0 ||
        result.rejections.length > 0 ||
        result.reason === "stalled" ||
        presentation.anomalies.length > 0;
      if (failed) {
        failures.push({
          decks: [left.id, right.id],
          seed,
          engineErrors: result.errors,
          rejections: result.rejections,
          presentationAnomalies: presentation.anomalies,
          reason: result.reason,
          turnCount: result.turnCount,
        });
      }
    }
  }

  return {
    deckCount: options.decks.length,
    matchupCount: matchups.length,
    matchCount: matchups.length * seedsPerMatchup,
    eventCount,
    failures,
    risks,
  };
}
