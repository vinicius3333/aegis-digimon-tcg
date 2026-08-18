import type { BanlistPolicy, CreateTournamentInput, TournamentBanlistCard, TournamentRules } from "@aegis/shared";
import { banlistDateForSet, normalizeBanlistPolicy, resolveBanlistPolicy } from "./banlistPolicy.js";
import { findPreset, rulesSnapshot, type BestOf, type TournamentRulesPreset } from "./presets.js";

/**
 * Creation-time validation of a `CreateTournamentInput`. Every rejection carries a stable code so
 * the client, the tests and the logs all name a failure the same way; codes are part of the API and
 * are only ever added, never renamed.
 */
export type TournamentValidationCode =
  | "name_too_short"
  | "name_too_long"
  | "unknown_preset"
  | "structure_not_allowed_by_preset"
  | "best_of_not_allowed_by_preset"
  | "top_cut_requires_swiss"
  | "top_cut_not_supported_by_preset"
  | "bots_require_custom_ruleset"
  | "unrestricted_banlist_requires_custom_ruleset"
  | "banlist_mode_unknown"
  | "banlist_set_unknown"
  | "max_players_out_of_range"
  | "starts_at_invalid"
  | "starts_at_in_past";

export type TournamentValidationError = {
  code: TournamentValidationCode;
  field: keyof CreateTournamentInput;
  detail?: string;
};

/** Everything creation persists, derived once so the route never recomputes a frozen value. */
export type ValidatedTournament = {
  input: CreateTournamentInput;
  preset: TournamentRulesPreset;
  rules: TournamentRules;
  banlistCards: TournamentBanlistCard[];
};

export type ValidationResult =
  | { ok: true; value: ValidatedTournament }
  | { ok: false; errors: TournamentValidationError[] };

export const MIN_TOURNAMENT_NAME_LENGTH = 3;
export const MAX_TOURNAMENT_NAME_LENGTH = 80;
export const MIN_TOURNAMENT_PLAYERS = 2;
export const MAX_TOURNAMENT_PLAYERS = 1024;
/**
 * How far into the past a start time may sit. Organizers legitimately create an event that begins
 * "now" and clocks drift, so a small window is allowed; anything older is a mistake, not an event.
 */
export const STARTS_AT_PAST_TOLERANCE_MS = 5 * 60_000;

/**
 * Validates and normalizes one creation request. `createdAt` is the server clock: it dates a
 * `current` banlist policy and bounds `startsAt`, so a caller can never freeze a banlist from a
 * client-supplied time.
 */
export function validateCreateTournament(input: CreateTournamentInput, createdAt: number): ValidationResult {
  const errors: TournamentValidationError[] = [];
  const name = input.name.trim();
  if (name.length < MIN_TOURNAMENT_NAME_LENGTH) errors.push({ code: "name_too_short", field: "name" });
  if (name.length > MAX_TOURNAMENT_NAME_LENGTH) errors.push({ code: "name_too_long", field: "name" });

  if (
    !Number.isInteger(input.maxPlayers) ||
    input.maxPlayers < MIN_TOURNAMENT_PLAYERS ||
    input.maxPlayers > MAX_TOURNAMENT_PLAYERS
  ) {
    errors.push({ code: "max_players_out_of_range", field: "maxPlayers" });
  }
  if (!Number.isFinite(input.startsAt) || input.startsAt <= 0) {
    errors.push({ code: "starts_at_invalid", field: "startsAt" });
  } else if (input.startsAt < createdAt - STARTS_AT_PAST_TOLERANCE_MS) {
    errors.push({ code: "starts_at_in_past", field: "startsAt" });
  }

  // The competition is already a bracket, so cutting to one is meaningless rather than merely
  // unsupported: rejected regardless of which preset asked for it.
  if (input.structure === "single_elimination" && input.topCut) {
    errors.push({ code: "top_cut_requires_swiss", field: "topCut" });
  }

  const preset = findPreset(input.rulesetPreset);
  if (!preset) {
    errors.push({ code: "unknown_preset", field: "rulesetPreset", detail: input.rulesetPreset });
    return { ok: false, errors };
  }

  if (!preset.structures.includes(input.structure)) {
    errors.push({ code: "structure_not_allowed_by_preset", field: "structure", detail: input.structure });
  }
  if (!preset.bestOfOptions.includes(input.bestOf)) {
    errors.push({ code: "best_of_not_allowed_by_preset", field: "bestOf", detail: String(input.bestOf) });
  }
  if (input.topCut && !preset.supportsTopCut) {
    errors.push({ code: "top_cut_not_supported_by_preset", field: "topCut" });
  }
  if (input.allowBots && !preset.supportsBots) {
    errors.push({ code: "bots_require_custom_ruleset", field: "allowBots" });
  }
  errors.push(...banlistErrors(input.banlist, preset));

  if (errors.length > 0) return { ok: false, errors };
  const banlist = normalizeBanlistPolicy(input.banlist);
  return {
    ok: true,
    value: {
      input: { ...input, name, banlist },
      preset,
      rules: rulesSnapshot(preset, input.bestOf as BestOf),
      banlistCards: resolveBanlistPolicy(banlist, createdAt),
    },
  };
}

/**
 * The banlist policy a payload that omitted one should be judged under. Defaulting everything to
 * `none` would make the official presets unconstructible and blame a field the caller never sent, so
 * a preset that forbids `none` defaults to the banlist in force at creation instead. An explicit
 * `none` is still rejected outside a custom ruleset.
 */
export function defaultBanlistPolicy(rulesetPreset: string): BanlistPolicy {
  return findPreset(rulesetPreset)?.supportsUnrestrictedBanlist === false ? { mode: "current" } : { mode: "none" };
}

function banlistErrors(policy: BanlistPolicy, preset: TournamentRulesPreset): TournamentValidationError[] {
  switch (policy.mode) {
    case "none":
      return preset.supportsUnrestrictedBanlist
        ? []
        : [{ code: "unrestricted_banlist_requires_custom_ruleset", field: "banlist" }];
    case "current":
      return [];
    case "as_of_set":
      return banlistDateForSet(policy.setId) === undefined
        ? [{ code: "banlist_set_unknown", field: "banlist", detail: policy.setId }]
        : [];
    default:
      return [{ code: "banlist_mode_unknown", field: "banlist", detail: JSON.stringify(policy) }];
  }
}
