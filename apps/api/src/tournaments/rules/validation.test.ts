import type { CreateTournamentInput } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { BANDAI_GENERAL_PRESET } from "./presets.js";
import { defaultBanlistPolicy, validateCreateTournament, type TournamentValidationCode } from "./validation.js";

const CREATED_AT = Date.parse("2025-06-01T00:00:00Z");

function competitive(overrides: Partial<CreateTournamentInput> = {}): CreateTournamentInput {
  return {
    name: "Regional Qualifier",
    structure: "swiss",
    topCut: true,
    bestOf: 3,
    startsAt: CREATED_AT + 86_400_000,
    maxPlayers: 64,
    allowBots: false,
    rulesetPreset: "bandai_general",
    banlist: { mode: "current" },
    ...overrides,
  };
}

function lightning(overrides: Partial<CreateTournamentInput> = {}): CreateTournamentInput {
  return competitive({
    name: "Lightning Cup",
    structure: "single_elimination",
    topCut: false,
    bestOf: 1,
    rulesetPreset: "aegis_lightning",
    banlist: { mode: "none" },
    ...overrides,
  });
}

function codes(input: CreateTournamentInput): TournamentValidationCode[] {
  const result = validateCreateTournament(input, CREATED_AT);
  return result.ok ? [] : result.errors.map((error) => error.code);
}

describe("validateCreateTournament", () => {
  it("accepts the official competitive event and freezes its rules and banlist", () => {
    const result = validateCreateTournament(competitive(), CREATED_AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.preset.id).toBe("bandai_general");
    expect(result.value.rules.version).toBe(BANDAI_GENERAL_PRESET.version);
    expect(result.value.rules.match.winsRequired).toBe(2);
    expect(result.value.banlistCards.length).toBeGreaterThan(0);
  });

  it("accepts the lightning cup with bots and no banlist", () => {
    const result = validateCreateTournament(lightning({ allowBots: true }), CREATED_AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.banlistCards).toEqual([]);
    expect(result.value.rules.origin).toBe("aegis_custom");
  });

  it("trims the name it hands back", () => {
    const result = validateCreateTournament(competitive({ name: "  Spaced Cup  " }), CREATED_AT);
    expect(result.ok && result.value.input.name).toBe("Spaced Cup");
  });

  it("rejects Top Cut on a single-elimination event, which is already a bracket", () => {
    expect(codes(lightning({ topCut: true }))).toContain("top_cut_requires_swiss");
  });

  it("rejects Top Cut on a preset that does not offer it", () => {
    expect(codes(lightning({ structure: "swiss", topCut: true }))).toEqual(
      expect.arrayContaining(["top_cut_not_supported_by_preset", "structure_not_allowed_by_preset"]),
    );
  });

  it("rejects bots outside a custom ruleset", () => {
    expect(codes(competitive({ allowBots: true }))).toEqual(["bots_require_custom_ruleset"]);
  });

  it("rejects an unrestricted banlist outside a custom ruleset", () => {
    expect(codes(competitive({ banlist: { mode: "none" } }))).toEqual(["unrestricted_banlist_requires_custom_ruleset"]);
  });

  it("rejects a best-of the preset does not offer", () => {
    expect(codes(competitive({ bestOf: 1 }))).toEqual(["best_of_not_allowed_by_preset"]);
    expect(codes(lightning({ bestOf: 3 }))).toEqual([]);
  });

  it("rejects a structure the preset does not offer", () => {
    expect(codes(lightning({ structure: "swiss" }))).toEqual(["structure_not_allowed_by_preset"]);
  });

  it("rejects an unknown preset without also reporting preset-relative failures", () => {
    expect(codes(competitive({ rulesetPreset: "no_such_preset", allowBots: true }))).toEqual(["unknown_preset"]);
  });

  it("rejects an as_of_set banlist naming a set with no release date", () => {
    expect(codes(competitive({ banlist: { mode: "as_of_set", setId: "BT999" } }))).toEqual(["banlist_set_unknown"]);
    expect(codes(competitive({ banlist: { mode: "as_of_set", setId: "BT7" } }))).toEqual([]);
  });

  it("rejects an unknown banlist mode", () => {
    const input = competitive({ banlist: { mode: "whenever" } as never });
    expect(codes(input)).toEqual(["banlist_mode_unknown"]);
  });

  it("rejects an out-of-range field size and a name that is too short or too long", () => {
    expect(codes(competitive({ maxPlayers: 1 }))).toEqual(["max_players_out_of_range"]);
    expect(codes(competitive({ maxPlayers: 2048 }))).toEqual(["max_players_out_of_range"]);
    expect(codes(competitive({ maxPlayers: 8.5 }))).toEqual(["max_players_out_of_range"]);
    expect(codes(competitive({ name: "GG" }))).toEqual(["name_too_short"]);
    expect(codes(competitive({ name: "x".repeat(81) }))).toEqual(["name_too_long"]);
  });

  it("rejects a start time that is not a usable instant", () => {
    expect(codes(competitive({ startsAt: Number.NaN }))).toEqual(["starts_at_invalid"]);
    expect(codes(competitive({ startsAt: 0 }))).toEqual(["starts_at_invalid"]);
  });

  it("rejects a start time well in the past but tolerates clock drift around 'now'", () => {
    expect(codes(competitive({ startsAt: CREATED_AT - 3_600_000 }))).toEqual(["starts_at_in_past"]);
    expect(codes(competitive({ startsAt: CREATED_AT - 60_000 }))).toEqual([]);
    expect(codes(competitive({ startsAt: CREATED_AT }))).toEqual([]);
  });

  it("normalizes an as_of_set spelling into the frozen policy", () => {
    const result = validateCreateTournament(
      competitive({ banlist: { mode: "as_of_set", setId: " bt7 " } }),
      CREATED_AT,
    );
    expect(result.ok && result.value.input.banlist).toEqual({ mode: "as_of_set", setId: "BT7" });
  });

  it("defaults an omitted banlist to the list in force for a preset that forbids none", () => {
    expect(defaultBanlistPolicy("bandai_general")).toEqual({ mode: "current" });
    expect(defaultBanlistPolicy("aegis_lightning")).toEqual({ mode: "none" });
    // An unknown preset gets the harmless default; `unknown_preset` is the real rejection.
    expect(defaultBanlistPolicy("no_such_preset")).toEqual({ mode: "none" });
  });

  it("reports every independent failure at once rather than stopping at the first", () => {
    expect(codes(competitive({ name: "x", maxPlayers: 0, allowBots: true }))).toEqual(
      expect.arrayContaining(["name_too_short", "max_players_out_of_range", "bots_require_custom_ruleset"]),
    );
  });

  it("names the offending field on every rejection", () => {
    const result = validateCreateTournament(competitive({ allowBots: true }), CREATED_AT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toEqual({ code: "bots_require_custom_ruleset", field: "allowBots" });
  });

  it("freezes a different banlist for as_of_set than for current", () => {
    const asOfSet = validateCreateTournament(competitive({ banlist: { mode: "as_of_set", setId: "BT7" } }), CREATED_AT);
    const current = validateCreateTournament(competitive(), CREATED_AT);
    expect(asOfSet.ok && current.ok).toBe(true);
    if (!asOfSet.ok || !current.ok) return;
    expect(asOfSet.value.banlistCards.length).toBeLessThan(current.value.banlistCards.length);
  });
});
