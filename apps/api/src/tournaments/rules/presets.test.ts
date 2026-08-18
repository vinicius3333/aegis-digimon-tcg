import { describe, expect, it } from "vitest";
import { computeStandingsReport } from "../standings/index.js";
import {
  AEGIS_LIGHTNING_PRESET,
  BANDAI_GENERAL_PRESET,
  findPreset,
  LEGACY_DEFAULT_PRESET_ID,
  rulesSnapshot,
  TOURNAMENT_RULES_PRESETS,
} from "./presets.js";

const MINUTE = 60_000;

describe("tournament ruleset presets", () => {
  it("gives the official competitive preset the manual's best-of-three clocks", () => {
    expect(rulesSnapshot(BANDAI_GENERAL_PRESET, 3).match).toEqual({
      winsRequired: 2,
      swissDurationMs: 45 * MINUTE,
      topCutDurationMs: 55 * MINUTE,
      finalDurationMs: null,
      overtimeMs: 5 * MINUTE,
    });
  });

  it("gives the official competitive preset the manual's attendance, timeout and standings policy", () => {
    const rules = rulesSnapshot(BANDAI_GENERAL_PRESET, 3);
    expect(rules.origin).toBe("bandai_general");
    expect(rules.attendance).toEqual({ joinGraceMs: 5 * MINUTE, gameLossAtMs: 5 * MINUTE, matchLossAtMs: 10 * MINUTE });
    expect(rules.timeout).toEqual({
      swiss: "extra_turns_then_draw",
      elimination: "extra_turns_then_state_tiebreak",
      swissExtraTurns: 3,
      eliminationExtraTurns: 5,
      stateTiebreakers: [
        "more_security",
        "more_deck_cards_excluding_digi_egg",
        "more_digimon_in_battle_area",
        "last_security_removal",
      ],
    });
    expect(rules.standings).toEqual({
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      byePoints: 3,
      winRateFloor: 0.33,
      tiebreakers: ["points", "match_win_rate", "opponent_match_win_rate", "head_to_head", "judge_random_draw"],
    });
  });

  // The criteria a preset emits must be the criteria the standings projection consumes, spelled
  // the same way. They used to differ and an alias layer bridged them, which meant a typo in a
  // preset degraded silently into a dropped tiebreaker. Pinning membership here is what stops the
  // divergence coming back.
  it("emits tiebreakers the standings projection resolves without translation", () => {
    for (const preset of TOURNAMENT_RULES_PRESETS)
      for (const tiebreaker of preset.standings.tiebreakers)
        expect(() =>
          computeStandingsReport({ ledger: [], standings: { ...preset.standings, tiebreakers: [tiebreaker] } }),
        ).not.toThrow();
  });

  it("populates every optional rules field on every preset, so downstream code never hardcodes one", () => {
    for (const preset of TOURNAMENT_RULES_PRESETS) {
      for (const bestOf of preset.bestOfOptions) {
        const rules = rulesSnapshot(preset, bestOf);
        expect(rules.standings.winRateFloor).toBeTypeOf("number");
        expect(rules.timeout.swissExtraTurns).toBeTypeOf("number");
        expect(rules.timeout.eliminationExtraTurns).toBeTypeOf("number");
        expect(rules.timeout.stateTiebreakers?.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the lightning cup on a custom origin so bots and best-of-one stay off the official preset", () => {
    expect(AEGIS_LIGHTNING_PRESET.origin).toBe("aegis_custom");
    expect(AEGIS_LIGHTNING_PRESET.supportsBots).toBe(true);
    expect(AEGIS_LIGHTNING_PRESET.bestOfOptions).toEqual([1, 3]);
    expect(BANDAI_GENERAL_PRESET.supportsBots).toBe(false);
    expect(BANDAI_GENERAL_PRESET.supportsUnrestrictedBanlist).toBe(false);
  });

  it("gives the lightning cup a finite final so a short event always ends", () => {
    expect(rulesSnapshot(AEGIS_LIGHTNING_PRESET, 1).match.finalDurationMs).toBe(25 * MINUTE);
    expect(rulesSnapshot(BANDAI_GENERAL_PRESET, 3).match.finalDurationMs).toBeNull();
  });

  it("snapshots by value, so mutating a snapshot cannot reach the preset", () => {
    const snapshot = rulesSnapshot(BANDAI_GENERAL_PRESET, 3);
    (snapshot.standings.tiebreakers as string[]).push("bogus");
    (snapshot.timeout.stateTiebreakers as string[]).push("bogus");
    snapshot.match.overtimeMs = 1;
    expect(rulesSnapshot(BANDAI_GENERAL_PRESET, 3).standings.tiebreakers).toHaveLength(5);
    expect(rulesSnapshot(BANDAI_GENERAL_PRESET, 3).timeout.stateTiebreakers).toHaveLength(4);
    expect(rulesSnapshot(BANDAI_GENERAL_PRESET, 3).match.overtimeMs).toBe(5 * MINUTE);
  });

  it("resolves presets by id and rejects unknown ones", () => {
    for (const preset of TOURNAMENT_RULES_PRESETS) expect(findPreset(preset.id)).toBe(preset);
    expect(findPreset("no_such_preset")).toBeUndefined();
    expect(findPreset(LEGACY_DEFAULT_PRESET_ID)).toBe(AEGIS_LIGHTNING_PRESET);
  });

  it("versions every preset and keeps the ids unique", () => {
    expect(new Set(TOURNAMENT_RULES_PRESETS.map((preset) => preset.id)).size).toBe(TOURNAMENT_RULES_PRESETS.length);
    for (const preset of TOURNAMENT_RULES_PRESETS) expect(preset.version).toMatch(/^[a-z_]+\/\d+\.\d+\.\d+$/);
  });
});
