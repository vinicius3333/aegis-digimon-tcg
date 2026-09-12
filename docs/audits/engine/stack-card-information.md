# Stack card information audit

## Status and contract

Bounded correction at baseline `3f014c5d7`, 2026-09-12. The official comprehensive manual v4.2, updated 2026-08-18, §4-7-9 treats a face-down card under another card as having no referenceable card information. Reviewed local full chunk `comprehensive-0293` has SHA-256 `1220b7f0fc0cb6ccc76d4ad371d1f788922a265df857413971108e64da24bc0f`. Source: [official manual](https://world.digimoncard.com/rule/pdf/general_rule.pdf). Giromon's committed catalog and local Q7058 were also read. This is not a complete hidden-information or collection certificate.

## Public proof and counterfactual

`apps/api/src/engine/conformance/keyword-succession-lifecycle.test.ts`, `public Giromon placement hides $0 from Succession`, contains three legal public sequences. BT26-055 evolves over black level-4 BT3-067, optionally places BT26-080, BT22-010 or neutral BT1-023 from hand face down, and declines the separate deletion. BT26-080 then normally evolves over Giromon and attacks the opponent's security. The test asserts exact bottom-to-top physical source identities and face state, native-only deletion of one of two neutral opponents, native Security Attack +1 checking exactly two security cards, 13000 DP, suspended attacker/controller, memory, hand/deck/security/trash and no pending decision or loud engine gap. No fake face state or manually conferred effect is used.

On the unchanged baseline, the hidden Bacchusmon causes an extra deletion and hidden Meramon changes the host's DP to 17000 instead of 13000: **2 failed, 21 passed**. The neutral hidden source is the negative control. Meramon's printed inheritance is +2000 DP; the observed +4000 difference is recorded without claiming its numerical cause has been independently isolated. The corrected focused command covering this suite, kernel and both Giromon/Meramon colocated files passes **4 files, 61 tests**.

## Implementation and open obligations

The effect kernel rejects a live physical source whose matching stack card is face down before top-card, inherited or conferred placement eligibility. The existing narrow continuous self-color-waiver exception remains available for Option-use preflight when a hidden stacked Option will be paid to trash and used; it does not activate that Option’s ordinary buried effects. GrantStatic excludes face-down physical stack cards before definition lookup/filtering in structured grants, raw copied effects and fallback grants. This avoids hidden sources providing effects or masking eligible visible definitions. No card IR, catalog, registration or generated effects artifact changes.

The initial full run found six failures (42353 passes): four old tests incorrectly assembled active inherited sources face down, and two Option-use cost preflights exposed the overbroad guard. The inherited fixtures now explicitly use face-up sources (BT10-006, BT8-079, BT8-006 and BT20-080); the narrow self-waiver exception is retained. The corrected six-file regression passes 43 tests, including both real hidden-Option cost/use paths. These fixture tests are supplemental regression, not additional legal public hidden-source certificates.

The three public sequences prove the demonstrated copied and inherited source leak. Highest visible matching sources around a hidden candidate, raw/fallback public producers, hidden off-field snapshots, source-turnover/visibility transitions, native keyword scans, dynamic names and other numerical/card-information readers remain open. Existing green regressions do not certify those obligations. BT22's historical complete status is reopened and BT22-010 capped provisionally at 8/10; BT26-080 retains its existing cap. Independent read-only review found no blocker for this bounded change.

## Delivery gates

Final full default API: **5112 files, 42359 tests passed**, zero expected failures, 54.67 seconds. Shared/API/web workspace typecheck passed. Scoped Oxlint, twelve-file Oxfmt, current 66-set index, layout (one file/four tests), clean diff check and independent read-only review pass. The exception remains a privileged preflight projection; hidden unpaid waiver, mixed static actions and DUAL consumer equivalence are not certified.
