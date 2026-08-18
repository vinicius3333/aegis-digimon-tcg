/* What each ruleset preset allows, so the creation form can disable an impossible combination
   instead of only reporting it after a round trip.

   This mirrors `TOURNAMENT_RULES_PRESETS` in `apps/api/src/tournaments/rules/presets.ts`. The
   presets are server-side and are neither in `@aegis/shared` nor served by an endpoint, so the
   client cannot import them. The server stays the authority: it re-validates every field and
   answers with the reason codes this form renders, so a mirror that drifts costs a rejected
   submit, never an invalid tournament. Replace this table the moment the API exposes the presets. */

import type { RulesetOrigin, TournamentStructure } from "@aegis/shared";

export type BestOf = 1 | 3;

export type PresetOption = {
  id: string;
  labelKey: "tournaments.preset.bandaiGeneral" | "tournaments.preset.aegisLightning";
  origin: RulesetOrigin;
  structures: readonly TournamentStructure[];
  bestOfOptions: readonly BestOf[];
  supportsTopCut: boolean;
  supportsBots: boolean;
  supportsUnrestrictedBanlist: boolean;
};

export const TOURNAMENT_PRESETS: readonly PresetOption[] = [
  {
    id: "bandai_general",
    labelKey: "tournaments.preset.bandaiGeneral",
    origin: "bandai_general",
    structures: ["swiss", "single_elimination"],
    bestOfOptions: [3],
    supportsTopCut: true,
    supportsBots: false,
    supportsUnrestrictedBanlist: false,
  },
  {
    id: "aegis_lightning",
    labelKey: "tournaments.preset.aegisLightning",
    origin: "aegis_custom",
    structures: ["single_elimination"],
    bestOfOptions: [1, 3],
    supportsTopCut: false,
    supportsBots: true,
    supportsUnrestrictedBanlist: true,
  },
];

export const DEFAULT_PRESET_ID = "aegis_lightning";

export function findPresetOption(id: string): PresetOption | undefined {
  return TOURNAMENT_PRESETS.find((preset) => preset.id === id);
}
