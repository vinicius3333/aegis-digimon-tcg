# Sealed engine rules

## Authorized profile and sources

The immutable engine profile is `sealed-v1`. Constructed remains the default for games and replay records without a policy. The profile is an engine contract, not a product configuration or room-admission mode.

The source ledger reviewed on 2026-10-31 uses the current [Digimon Card Game Sealed Battle Regulations](https://world.digimoncard.com/event/pdf/sealed_format_rules.pdf), two pages, retrieved PDF SHA256 `89380d245a429566bf37c6fd6e33aec70ea217043ff8a07a1f0ab9dc513e3060`. The [BT07 prerelease sheet](https://world.digimoncard.com/event/pre-release_BT-07/pdf/sealed_format_rules.pdf) is historical, not the active profile.

The [Comprehensive Rules Manual](https://world.digimoncard.com/rule/pdf/general_rule.pdf), version 4.3, updated 2026-09-18, supplies the underlying mechanics: section 6-4-1 (one breeding action), section 8-1-3 (digivolution requirements and cost), section 9 (Option use), and section 10 (Link). These source identities are retained from the reviewed feature ledger, not a claim of a new source download.

## Policy boundaries

- Main decks contain forty cards; egg decks contain zero to five. Shape validation checks known cards, tokens and correct zones without the constructed same-number or restriction-list cap. It does not establish ownership or authorize allocation.
- Special rule 1 waives the color restriction on digivolution requirements, including ordinary, alternate and DNA recipes. Levels, names, traits, text, cost, source-zone restrictions, material count and distinct identities remain authoritative.
- The illustrated alternate requirement costs four from a level four with Save text: its colors are waived, not its level or Save predicate. The illustrated DNA recipe retains two level-six materials and cost zero.
- Explicit effect selection conditions remain authoritative, including a Hybrid effect selecting a particular Tamer color and a destination color selected by an effect. Option use, Link and DigiXros materials are not globally color-waived.
- Special rule 2 permits a face-up level-three Digimon from hand into an empty breeding area as the phase's single action. It is not played and implies no payment, draw, hatch or On Play trigger. Hatch, placement and moving out remain mutually exclusive actions. Automatic hatch is disabled under this profile so the player can choose placement.

The current regulations supersede historical wording that could be read as limiting the waiver to ordinary printed requirements. Product selection, owned-pool validation, private rooms and tournament lifecycle are outside this independent engine slice.

## Executable regressions

- `sealed-color-and-breeding.test.ts`: placement, no payment/draw/On Play, single action, ordinary waiver, Option colors and action generation.
- `sealed-special-requirements.test.ts`: alternate non-color gates, DNA levels/materials, explicit Hybrid selection, paid/free effect evolution and affordability.
- `sealed-reveal-digivolution.test.ts`: revealed-card evolution.
- `sealedCandidates.test.ts`: policy-aware bot candidates.
- `sealedDigivolveRoutes.test.ts`: server-projected ordinary and indexed alternate choices.
- `sealedPolicyReplay.test.ts`: policy-only room header, recorded placement/evolution, extraction, fresh replay, restored runtime snapshot and schema clone. The fixture activates policy without importing product or tournament configuration.
- `legacyPolicyReplay.test.ts`: an actual policy-absent room recording executes as constructed, including replay from a current runtime snapshot and schema clone.
- `gameRulesPolicy.test.ts`: absent-policy state hydration defaults, shape validation and append-only synchronized field ordering.
- `sealed-rookie-placement.spec.ts`: actual GameScreen placement controls; browser execution and manual media are separate acceptance gates.

Runtime snapshots retain the existing exact-code and schema-layout fingerprint checks. A historical recording can be replayed to produce a current snapshot; this does not promise that binary/runtime snapshots from a different engine revision can be restored across code fingerprints.
