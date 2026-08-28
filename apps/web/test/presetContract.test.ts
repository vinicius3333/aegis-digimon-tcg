/* The web's preset mirror against the server's presets.

   `apps/web/src/tournaments/presets.ts` is a hand-maintained copy of `TOURNAMENT_RULES_PRESETS`,
   because the presets are server-side, are not in `@aegis/shared`, and the creation form needs them
   before any round trip in order to disable a combination the server would reject. A copy drifts,
   and the drift is invisible: the form offers a best-of or a structure the server refuses, and the
   only symptom is a rejected submit the user cannot explain.

   This is the test that makes the drift loud. It lives in `apps/web/test/` rather than beside the
   mirror because it is the ONE place in this repo that can import both sides cleanly — the
   `@aegis-api` alias in `vite.config.ts` reaches the API source, and this directory is outside the
   web tsconfig's `include`, so importing across the package boundary does not break either package's
   `rootDir`. Delete this file the moment the API serves the presets and the mirror goes away. */

import { TOURNAMENT_RULES_PRESETS } from "@aegis-api/tournaments/rules/presets.js";
import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET_ID, findPresetOption, TOURNAMENT_PRESETS } from "../src/tournaments/presets";

describe("the web preset mirror matches the server presets", () => {
  it("mirrors exactly the presets the server ships, in the same order", () => {
    expect(TOURNAMENT_PRESETS.map((preset) => preset.id)).toEqual(TOURNAMENT_RULES_PRESETS.map((preset) => preset.id));
  });

  it("agrees on every field the creation form gates a choice on", () => {
    for (const server of TOURNAMENT_RULES_PRESETS) {
      const mirror = findPresetOption(server.id);
      expect(mirror, `no mirror for preset ${server.id}`).toBeDefined();
      expect({ id: server.id, ...pick(mirror!) }).toEqual({ id: server.id, ...pick(server) });
    }
  });

  it("only offers a best-of the server has a clock for", () => {
    // A form that offered a best-of with no round duration behind it would submit a tournament the
    // server could not clock. The preset carries clocks for every best-of it knows; the mirror must
    // stay a subset of them as well as matching `bestOfOptions` exactly.
    for (const server of TOURNAMENT_RULES_PRESETS) {
      const clocked = Object.keys(server.clocks).map(Number);
      for (const bestOf of findPresetOption(server.id)!.bestOfOptions) expect(clocked).toContain(bestOf);
    }
  });

  it("defaults to a preset that exists on the server", () => {
    expect(TOURNAMENT_RULES_PRESETS.map((preset) => preset.id)).toContain(DEFAULT_PRESET_ID);
  });
});

/** The fields both sides claim to agree on. Durations are compared separately, by best-of. */
function pick(preset: {
  origin: string;
  structures: readonly string[];
  bestOfOptions: readonly number[];
  supportsTopCut: boolean;
  supportsBots: boolean;
  supportsUnrestrictedBanlist: boolean;
}) {
  return {
    origin: preset.origin,
    structures: [...preset.structures],
    bestOfOptions: [...preset.bestOfOptions],
    supportsTopCut: preset.supportsTopCut,
    supportsBots: preset.supportsBots,
    supportsUnrestrictedBanlist: preset.supportsUnrestrictedBanlist,
  };
}
