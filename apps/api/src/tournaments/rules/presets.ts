import type { RulesetOrigin, TournamentRules, TournamentStructure } from "@aegis/shared";

/**
 * Versioned ruleset presets. Every competitive number the engine needs — match clocks, overtime,
 * attendance penalties, timeout policy, standings points and tiebreaker order — lives here as data
 * and is snapshotted onto a tournament at creation. Nothing downstream may hardcode a duration or a
 * point value: a later edit here must never change an event that already exists.
 *
 * Sources: the official Tournament Rules Manual (§3.5 match structure, §5.2 end of time, §5.4
 * points and tiebreakers, §6 lateness infractions) as transcribed in
 * `the official tournament rules`.
 */

const MINUTE_MS = 60_000;

/**
 * `swissDurationMs` is the base round clock: Swiss rounds, and also the rounds of a plain
 * single-elimination event, which has no Swiss phase of its own. `topCutDurationMs` applies only
 * while a Top Cut phase is running, and `finalDurationMs` only to the deciding match; `null` means
 * no limit.
 */
export type MatchClocks = TournamentRules["match"];

export type BestOf = 1 | 3;

export type TournamentRulesPreset = {
  id: string;
  label: string;
  version: string;
  origin: RulesetOrigin;
  structures: readonly TournamentStructure[];
  bestOfOptions: readonly BestOf[];
  supportsTopCut: boolean;
  /** Bots have no precedent in the official rules, so only a custom ruleset may admit them. */
  supportsBots: boolean;
  /** Dropping banlist enforcement is a casual affordance, not an official format. */
  supportsUnrestrictedBanlist: boolean;
  clocks: Readonly<Record<BestOf, MatchClocks>>;
  attendance: TournamentRules["attendance"];
  timeout: TournamentRules["timeout"];
  standings: TournamentRules["standings"];
};

/**
 * Manual §5.4: points first, then own match-win rate excluding byes, then the opponents' average,
 * then head-to-head, and only as a last resort a draw for final position (never for a match result).
 *
 * Spelled in the STANDINGS projection's vocabulary (`StandingsTiebreaker` in
 * `standings/computeStandings.ts`), which is the only vocabulary anything actually consumes. The
 * presets used to emit `match_points`/`own_match_win_rate`/`random_final_position` and the
 * projection translated them back, which meant one criterion had two authoritative names and a
 * typo in either was invisible. Snapshots frozen under the older preset versions still carry the
 * old spelling for ever, so the alias translation in `SwissProgram.standingsConfig` stays — it now
 * serves history rather than a live divergence.
 */
const MANUAL_TIEBREAKERS = [
  "points",
  "match_win_rate",
  "opponent_match_win_rate",
  "head_to_head",
  "judge_random_draw",
] as const;

const MANUAL_STANDINGS: TournamentRules["standings"] = {
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  byePoints: 3,
  tiebreakers: MANUAL_TIEBREAKERS,
  // Manual §5.4: a win rate below 0.33 counts as 0.33, both for a player's own rate and inside the
  // opponents' average.
  winRateFloor: 0.33,
};

/**
 * Manual §5.2: elimination cannot end in a draw. After the extra turns, compare game wins, then walk
 * this list in order until one player is ahead.
 */
const MANUAL_STATE_TIEBREAKERS = [
  "more_security",
  "more_deck_cards_excluding_digi_egg",
  "more_digimon_in_battle_area",
  "last_security_removal",
] as const;

/**
 * Manual §5.2: when time runs out mid-game the current turn becomes turn 0 and a fixed number of
 * further turns is played — three in Swiss, five in elimination, where a winner must emerge.
 */
const MANUAL_TIMEOUT: TournamentRules["timeout"] = {
  swiss: "extra_turns_then_draw",
  elimination: "extra_turns_then_state_tiebreak",
  swissExtraTurns: 3,
  eliminationExtraTurns: 5,
  stateTiebreakers: MANUAL_STATE_TIEBREAKERS,
};

/**
 * The manual states the lateness infraction as "warning within 5 minutes, game loss at 5, match
 * loss at 10", and in adjacent passages mixes "5 or more" with "more than 5". A digital product
 * cannot ship that ambiguity, so the boundary is pinned: lateness up to but not including
 * `joinGraceMs` is a warning only, `gameLossAtMs` is the first instant a game loss applies, and
 * `matchLossAtMs` the first instant the whole match is lost.
 *
 * All three are offsets from ONE origin: the moment the round is published. Round publication
 * writes `join_deadline_at = published_at + joinGraceMs` (the "join by" instant the UI counts down
 * to), and the deadline scheduler derives the origin back out of it to place the penalties. They
 * are NOT offsets from the join deadline — reading them that way would put the game loss at ten
 * minutes late instead of five.
 */
const MANUAL_ATTENDANCE: TournamentRules["attendance"] = {
  joinGraceMs: 5 * MINUTE_MS,
  gameLossAtMs: 5 * MINUTE_MS,
  matchLossAtMs: 10 * MINUTE_MS,
};

export const BANDAI_GENERAL_PRESET: TournamentRulesPreset = {
  id: "bandai_general",
  label: "Official competitive",
  version: "bandai_general/1.1.0",
  origin: "bandai_general",
  structures: ["swiss", "single_elimination"],
  // The official competitive preset is best-of-three only; best-of-one belongs to casual play and
  // is offered by the custom presets instead.
  bestOfOptions: [3],
  supportsTopCut: true,
  supportsBots: false,
  supportsUnrestrictedBanlist: false,
  clocks: {
    1: {
      winsRequired: 1,
      swissDurationMs: 25 * MINUTE_MS,
      topCutDurationMs: 55 * MINUTE_MS,
      finalDurationMs: null,
      overtimeMs: 5 * MINUTE_MS,
    },
    3: {
      winsRequired: 2,
      swissDurationMs: 45 * MINUTE_MS,
      topCutDurationMs: 55 * MINUTE_MS,
      finalDurationMs: null,
      overtimeMs: 5 * MINUTE_MS,
    },
  },
  attendance: MANUAL_ATTENDANCE,
  timeout: MANUAL_TIMEOUT,
  standings: MANUAL_STANDINGS,
};

/**
 * Short Aegis-native event: single elimination, opens as soon as the field fills, and may complete
 * the bracket with bots. Deliberately `aegis_custom` — everything it allows beyond the manual
 * (bots, best-of-one, unrestricted decks) is gated on that origin.
 */
export const AEGIS_LIGHTNING_PRESET: TournamentRulesPreset = {
  id: "aegis_lightning",
  label: "Aegis lightning cup",
  version: "aegis_lightning/1.1.0",
  origin: "aegis_custom",
  structures: ["single_elimination"],
  bestOfOptions: [1, 3],
  supportsTopCut: false,
  supportsBots: true,
  supportsUnrestrictedBanlist: true,
  clocks: {
    1: {
      winsRequired: 1,
      swissDurationMs: 25 * MINUTE_MS,
      topCutDurationMs: null,
      finalDurationMs: 25 * MINUTE_MS,
      overtimeMs: 5 * MINUTE_MS,
    },
    3: {
      winsRequired: 2,
      swissDurationMs: 45 * MINUTE_MS,
      topCutDurationMs: null,
      finalDurationMs: 45 * MINUTE_MS,
      overtimeMs: 5 * MINUTE_MS,
    },
  },
  attendance: MANUAL_ATTENDANCE,
  timeout: MANUAL_TIMEOUT,
  standings: MANUAL_STANDINGS,
};

export const TOURNAMENT_RULES_PRESETS: readonly TournamentRulesPreset[] = [
  BANDAI_GENERAL_PRESET,
  AEGIS_LIGHTNING_PRESET,
];

/**
 * The preset a creation request with no ruleset of its own resolves to. It reproduces exactly what
 * every tournament created before the program existed already was — single elimination, best-of-one,
 * no Top Cut, no banlist enforcement — which is also what migration 003 backfills legacy rows to.
 */
export const LEGACY_DEFAULT_PRESET_ID = AEGIS_LIGHTNING_PRESET.id;

export function findPreset(id: string): TournamentRulesPreset | undefined {
  return TOURNAMENT_RULES_PRESETS.find((preset) => preset.id === id);
}

/** The immutable rules snapshot frozen onto a tournament at creation. */
export function rulesSnapshot(preset: TournamentRulesPreset, bestOf: BestOf): TournamentRules {
  return {
    version: preset.version,
    origin: preset.origin,
    match: { ...preset.clocks[bestOf] },
    attendance: { ...preset.attendance },
    timeout: {
      ...preset.timeout,
      stateTiebreakers: preset.timeout.stateTiebreakers && [...preset.timeout.stateTiebreakers],
    },
    standings: { ...preset.standings, tiebreakers: [...preset.standings.tiebreakers] },
  };
}
