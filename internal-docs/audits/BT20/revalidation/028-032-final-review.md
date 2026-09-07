# BT20-028–032 final strict review

Scope: committed catalog, local card KB, direct IR modules, and current colocated tests. No tests/builds were executed and existing report scores were not treated as acceptance evidence.

## Findings

No substantive printed-clause or catalog/IR mismatch remains visible in this read-only pass.

- **BT20-028 GigaSeadramon:** Current IR has Security Attack +1, Reboot, Blocker, both When Digivolving and When Attacking once-per-turn source-play clauses, and All Turns once-per-turn De-Digivolve 2. Tests cover exact named [MetalSeadramon]/[X Antibody] source gating, trait-only negative, Rule Name Proto Form positive, level-5 boundary, public source play, shared once-per-turn/reset behavior, and Q4321 self-play. Q4320's missing-source refusal is covered.
- **BT20-029 Pulsemon:** Current IR uses the corrected text matcher for “Pulsemon in its text” and battle-area-only replacement. Tests cover text-only and SEEKERS positives, an ineligible destination at full cost, breeding-area refusal (Q4323), own-turn reduction expiry, inherited battle-delete once-per-turn/reset, simultaneous host/opponent deletion refusal (Q4324), and legal Bibimon evolution. The committed catalog wording and Q4322/Q4323 agree with this implementation.
- **BT20-030 Liollmon:** RevealAdd independently selects one Chaosmon-name/ACCEL-trait Digimon and one ACCEL Option from three, bottoms the remainder, and carries inherited Barrier. Tests cover independent categories, no-match bottoming, category-only availability, public cost, inherited-source versus standalone Barrier, and legal evolution routes. No KB entry exposes a conflict.
- **BT20-031 Liamon:** Both entry triggers target exactly one opposing Digimon for -3000 for the turn; inherited Barrier and ACCEL alternate cost are represented. Tests cover exact play/evolution costs, one-target/controller boundary, no-target behavior, legal ordinary/alternate evolution, inherited-only Barrier, and end-of-turn expiry. No KB entry exposes a conflict.
- **BT20-032 Bulkmon:** Both entry triggers implement the conditional top-security hand action and subsequent recovery threshold; inherited battle-delete memory is once per turn. Tests cover accept/refusal at the 3-security boundary, recovery at 2, no recovery when still above threshold, public stack/evolution, inherited once-per-turn/reset, and simultaneous host/opponent deletion refusal (Q4325). No KB/catalog/IR contradiction is visible.

## Acceptance boundary

These five cards appear behaviorally acceptance-ready from the current source review. Root still owns focused/collection execution, mutation sensitivity, and final delivery gates. The only remaining concerns are execution gates, not a specific unexpressed printed behavior identified here.
