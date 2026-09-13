# Stack card information audit

## Status and contract

Bounded correction at baseline `3f014c5d7`, 2026-09-12. The official comprehensive manual v4.2, updated 2026-08-18, §4-7-9 treats a face-down card under another card as having no referenceable card information. Reviewed local full chunk `comprehensive-0293` has SHA-256 `1220b7f0fc0cb6ccc76d4ad371d1f788922a265df857413971108e64da24bc0f`. Source: [official manual](https://world.digimoncard.com/rule/pdf/general_rule.pdf). Giromon's committed catalog and local Q7058 were also read. This is not a complete hidden-information or collection certificate.

## Public proof and counterfactual

`apps/api/src/engine/conformance/keyword-succession-lifecycle.test.ts`, `public Giromon placement hides $0 from Succession`, contains three legal public sequences. BT26-055 evolves over black level-4 BT3-067, optionally places BT26-080, BT22-010 or neutral BT1-023 from hand face down, and declines the separate deletion. BT26-080 then normally evolves over Giromon and attacks the opponent's security. The test asserts exact bottom-to-top physical source identities and face state, native-only deletion of one of two neutral opponents, native Security Attack +1 checking exactly two security cards, 13000 DP, suspended attacker/controller, memory, hand/deck/security/trash and no pending decision or loud engine gap. No fake face state or manually conferred effect is used.

On the unchanged baseline, the hidden Bacchusmon causes an extra deletion and hidden Meramon changes the host's DP to 17000 instead of 13000: **2 failed, 21 passed**. The neutral hidden source is the negative control. Meramon's printed inheritance is +2000 DP; the observed +4000 difference is recorded without claiming its numerical cause has been independently isolated. The corrected focused command covering this suite, kernel and both Giromon/Meramon colocated files passes **4 files, 61 tests**.

## Implementation and open obligations

The effect kernel rejects a live physical source whose matching stack card is face down before top-card, inherited or conferred placement eligibility. The existing narrow continuous self-color-waiver exception remains available for Option-use preflight when a hidden stacked Option will be paid to trash and used; it does not activate that Option’s ordinary buried effects. GrantStatic excludes face-down physical stack cards before definition lookup/filtering in structured grants, raw copied effects and fallback grants. This avoids hidden sources providing effects or masking eligible visible definitions. No card IR, catalog, registration or generated effects artifact changes.

The initial full run found six failures (42353 passes): four old tests incorrectly assembled active inherited sources face down, and two Option-use cost preflights exposed the overbroad guard. The inherited fixtures now explicitly use face-up sources (BT10-006, BT8-079, BT8-006 and BT20-080); the narrow self-waiver exception is retained. The corrected six-file regression passes 43 tests, including both real hidden-Option cost/use paths. These fixture tests are supplemental regression, not additional legal public hidden-source certificates.

## Finite current-reader map

| Reader shape                                                                                 | Current printed consumers with executable evidence              | Public evidence and boundary                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Highest matching visible stack source copied as effects                                      | BT26-032, BT26-060, BT26-080 and BT26-103 (Succession)          | `stack-visible-source-priority.test.ts` and `keyword-succession-lifecycle.test.ts` prove visible-over-hidden selection and the legal Giromon producer path for the Bacchusmon shape; source identity is not exposed in the decision payload                     |
| Inherited keyword/effect read from a live stack source                                       | EX5-053 inheriting Blocker from EX5-051; P-062 Gammamon watcher | `keyword-blocker-source-changes.test.ts` and `stack-metadata-filtering.test.ts` prove exact live source identity, hidden-source exclusion, and visible-source activation; this is persistent/effect-source matching, not a collection-wide provider certificate |
| Stack placement and position metadata                                                        | BT26-055, BT13-007 and EX6-006 placement providers              | `digivolution-card-placement.md` records exact physical IDs, bottom position, face state, and final stacks for the demonstrated public producers; it does not certify information readers                                                                       |
| Raw/fallback, off-field snapshots, native keyword scans, dynamic names and numerical readers | EX9-054 Negamon scaling plus EX8-045 source-color scaling       | EX9-054 filters face-down stack cards for its named `[Negamon]` scaling predicate, while EX8-045 counts only face-up source colors after EX9-043 places a real trash card face down; paired red and green controls retain exact stack IDs and resolve fully     |

The highest-risk remaining gap is comprehensive rule §15-4-4-4: a triggered effect
losing its source effect before activation. The eighth and ninth cases in
`trigger-ordering-source-departure.test.ts` publicly cover a copied stack effect losing its
source before activation, with a control where the source remains in place. Quantity-only
stack counts remain valid; the correction applies only when a filter asks for card information
such as name, trait, kind, level or color.

The new `stack-metadata-filtering.test.ts` uses the public P-062 attack path: a hidden
Gammamon source does not trigger its `digivolutionStackNameOrTrait` watcher, while a visible
Gammamon source does. It verifies exact security instances and the real Tamer suspension, so
this exercises `permanentMatchesFilter` rather than only the Succession kernel. Negative
identity predicates read only visible cards; hidden cards are not treated as positive matches.

The three public sequences prove the demonstrated copied and inherited source
leak. The legal Succession producer proof and seeded visible-over-hidden cases
cover face-down filtering before highest-visible selection for the demonstrated
Bacchusmon provider shapes; they do not expose source identity in the public
decision payload. Remaining reader rows are provider-specific boundaries, not a
whole-catalog certificate. Historical collection scores remain historical.

## Delivery gates

Final full default API: **5112 files, 42359 tests passed**, zero expected failures, 54.67 seconds. Shared/API/web workspace typecheck passed. Scoped Oxlint, twelve-file Oxfmt, current 66-set index, layout (one file/four tests), clean diff check and independent read-only review pass. The exception remains a privileged preflight projection; hidden unpaid waiver, mixed static actions and DUAL consumer equivalence are not certified.

## Scaling-reader regression

The scaling reader now applies the §4-7-9 information boundary to both affected shapes. `sameLevelDigivolutionPairs` counts only face-up source levels, while `digivolutionCards` continues to count hidden cards only for quantity/state-only filters and refuses hidden cards when the filter requests identity information such as form, level, name, trait, kind, color, or DP. The shared information-key predicate is defined once in `apps/api/src/engine/effects/interpreter/scaling.ts`.

`cards/BT22/BT22-015.test.ts` adds a real-card regression using hidden EX9-039/EX9-043 sources alongside two visible BT22-009 sources: only the visible level pair contributes to the public When Digivolving return count. Existing public EX9-039/EX9-043 and BT9-083 consumers remain in the focused gate; their hidden placement and form-filter paths resolve without exposing hidden definitions. This is a bounded reader regression, not a full hidden-information certificate.
