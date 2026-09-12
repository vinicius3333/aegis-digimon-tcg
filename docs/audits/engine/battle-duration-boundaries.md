# Battle and attack duration boundary audit

Status: in progress. The EX13-076 direct Digimon-battle expiration defect is corrected in the working implementation. A bounded security-to-security DP-duration proof is recorded below; complete security producer coverage, nested-battle duration ownership, and the complete consumer denominator remain open. Neither this mechanism nor EX13 is certified.

## Contract and implementation

Baseline `ce68d82e0`. The committed EX13-076 catalog contract limits the source-count battle comparison to the battle created by its effect. Attack-scoped grants must survive an intermediate battle until the enclosing attack ends. Alliance DP is consequently registered with UntilEndAttack, matching its attack-scoped Security Attack grant.

CombatController now awaits a battle-duration sweep after the complete Digimon-battle result and its reactions. Both direct effect battles and ordinary attacks use this wrapper. EndBattle removes UntilEndBattle grants without removing UntilEndAttack grants in either modifier or continuous ledgers. Final attack cleanup removes both groups synchronously before its first await, preserving the existing removal guarantee while continuous effects are recomputed.

## Source identity

The complete committed text of these current comprehensive-rule chunks was read; SHA-256 pins cover the UTF-8 text, not a line-number approximation:

| Chunk                      | Obligation                                                                                                    | Text SHA-256                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| comprehensive-0149, §11-6  | End of attack processing finishes before the attack ends                                                      | `e8ea58082321d2c61143f7d0d64c9abbf0f0aaecd31970c63449be5204f2826a` |
| comprehensive-0155, §14    | Battle result, losing Digimon deletion, security exception and resolved battle/end-battle reactions           | `5b06ea97b99d6d698c6a1af32e9a3d725f850ddcf288c2f53f3bd003beaefa68` |
| comprehensive-0243, §16-24 | Alliance adds DP and Security Attack for the attack; later supporter changes/removal do not change that grant | `e44a7d2f8998a34292f9974cbca448cd81f2fbf538af8c3db0e1def0b7b44f2b` |

These pins establish the cited source identities. They do not establish complete normative or consumer coverage.

## Behavioral evidence

The ordinary EX13-076 expiration assertion passes. A second public fixture evolves Royal Knight Craniamon into Paladin Mode, pays five memory and draws one, strips the exact enemy source to deck bottom, and wins the generated battle by source count despite sixteen thousand DP against seventeen thousand. After that battle the count-comparison grant is absent. The same Paladin then attacks a seventeen-thousand-DP security Digimon and loses by DP; exact attacker and source cards reach the owner trash, and exact opposing cards reach the opponent trash. The spent once-per-turn evolution clause cannot introduce another comparison grant during this attack.

Separate ledger checks retain an attack-scoped Rush grant and a four-thousand-DP attack modifier through EndBattle, then remove them at EndAttack. These are supplemental boundary checks, not public Alliance or whole-keyword certification.

## Counterfactual checks

Removing the actual awaited EndBattle hook produced two failures in EX13-076: both supplemental and public fixtures observed the comparison grant incorrectly remaining active. Restoring the old EndBattle-or-EndAttack condition in both duration ledgers produced two failures: attack Rush vanished early and attack DP fell from four thousand to three thousand. Every temporary change was restored in a finally block.

The restored implementation passed three focused files and 89 tests. Independent read-only review confirmed synchronous final cleanup resolves the earlier introduced await gap and found no additional blocker in the bounded controller/Alliance diff. Captured Piercing eligibility survives the battle sweep. The restored broader combat, EX4 and boundary/card selection passed 99 files and 1092 tests. Full default API regression passed 5107 files and 42251 tests, with four declared expected failures (42255 total), in 179.69 seconds. The opt-in Postgres lane was not run; no database behavior changed. EX13 sync against `ce68d82e0` synchronized sixty records and reported one semantic change, with zero out-of-set semantic or byte changes. The inspected persisted diff changes only EX13-076 coverage to full and removes the resolved residual. Shared, API and web typechecks passed. Final card/layout checks passed 21 tests across two files; scoped Oxlint, formatted changed files, current 66-set index and diff checks passed. Final EX13 sync check repeated sixty synchronized records, one semantic change and zero out-of-set changes. No temporary mutation remains. Delivered in `d574f9144`; wider obligations below remain open.

## Remaining obligations

- Map the complete normative battle/attack/Alliance obligations beyond these three pinned sections.
- Expire battle-scoped grants after a security battle and before the following check; non-Digimon checks must not falsely start a battle.
- Establish ownership and expiration semantics for nested or sequential battles and grants created during battle-end reactions.
- Complete other Alliance/Piercing consumer shapes, duplicate instances, supporter changes/removal and nested effect-battle interactions; the printed ordinary-battle-to-security path below is proved.
- Inventory every battle- and attack-duration consumer and cover every distinct executable shape.
- Complete mechanism-wide gates and consumer evidence; historical collection scores do not certify this targeted correction.

## Public Alliance and Piercing duration proof

`combat/attackDuration.test.ts` uses printed AD1-009 BlitzGreymon (12000
DP, Alliance and Piercing), neutral BT10-064 Gogmamon (8000 DP), and three
physical BT12-112 Superior Mode cards (17000 DP): a suspended field target
and two security cards. Public attack and Alliance response suspend the
exact ally without changing memory. The 20000-DP attacker wins ordinary
battle and both Piercing security battles; all three opposing physical
cards reach opponent trash and both owner permanents remain. After attack
cleanup the attacker has 12000 DP and Security Attack one. The refusal
control leaves the ally unsuspended, loses the ordinary battle, and makes
no security check; exact attacker trash and retained opponent cards are
asserted. Seeded entries isolate combat; fresh-play behavior is not proved.

Changing the actual GameEngine Alliance DP registration back to
UntilEndBattle makes the paid case fail with one security check instead of
two because it loses the first security battle; the refusal case still
passes. The mutation was restored in finally. Both restored public cases
pass, and the bounded combat/direct-Piercing/advanced-keyword suite passes
21 files and 314 tests. Independent read-only review found no blocker in
card counts, quiet clauses, public sequencing or duration endpoints.
Final proof/layout checks passed two files and six tests after unconditional assertion cleanup; API typecheck, scoped Oxlint, changed-file Oxfmt, current 66-set index and diff checks passed. Opponent trash IDs are compared as a sorted physical-ID array, preventing duplicate IDs from being hidden by a set. The last full default API regression remains the preceding 5107-file result above; this delivery adds tests and ledger evidence without changing engine behavior, and does not rerun that broad gate.

This closes a public ordinary-battle-to-Piercing-check interaction for
printed Alliance. It does not prove supporter changes/removal, duplicate
Alliance instances, granted/inherited/continuous consumer shapes, nested
effect battles or battle-duration expiration within security checks.

## Bounded persisted battle-duration inventory

At baseline `1873b797d`, a recursive scan of committed effects.json duration fields found six
`untilEndOfBattle` occurrences across two cards: EX13-076's three shared
play/evolution/attack clauses and ST2-01's three inherited attack,
opponent-attack and block subscriptions. The direct-module ST2-01 behavior
was inspected against the exact catalog text: Your Turn, plus 1000 DP when
battling an opponent Digimon with no sources. This additional producer was queued for public battle-to-security
expiration and direct-battle trigger fidelity; its correction and bounded
proof are recorded below. This is a bounded persisted-field inventory, not the
complete printed battle-duration or executable-encoding denominator.

## ST2-01 continuous battle correction

Baseline `1873b797d`. A valid public Marsmon play reproduced a missing
Tsunomon bonus: quiet Elecmon is three thousand DP; Marsmon adds three
thousand for the turn, but the generated battle against six-thousand-DP
Gorillamon ties and deletes the host. The printed inherited battle bonus
should instead make it seven thousand and preserve the host. Five existing
card cases passed while the new public path failed. Earlier fixture
corrections (intent field, printed DP/cost arithmetic and tie-verdict
expectation) are not counterfactual evidence.

ST2-01 now encodes a continuous inherited YourTurn modifier gated by the
shared `selfBattlesOpponentMatching` condition. CombatController retains
the innermost active field-battle participants, derives continuous effects
before comparing, and pops the context in finally before deriving again.
The additive GameAccess seam is propagated through collection and
resolution contexts. This avoids inventing attack triggers for a passive
battle condition. The context remains through battle/end-battle reactions
and is absent in security checks. Nested context and participant-removing
future conditions remain unproved.

Eight card tests include public Marsmon no-source and one-source control
and a legal seeded blue line ending in Gryphonmon with Piercing. Marsmon
costs twelve minus five, leaving three from ten memory. After a winning
direct battle, host DP returns to six thousand while Marsmon's turn buff
remains. Against one source, the battle ties and exact host/egg and
victim/source reach the proper owner trash. The Gryphonmon line wins
ordinary battle at twelve thousand, then ties and is deleted against
eleven-thousand-DP security after the conditional bonus disappears.
Exact stack and final physical zones are asserted; public evolution
through the whole line remains open.

Restoring the old card module fails the no-source direct-battle survivor
assertion while one-source control passes. Omitting the actual context pop
fails post-direct-battle DP (seven instead of six thousand) and security
verdict (attacker wrongly wins); one-source control passes. Both mutations
were restored in finally. The restored card plus Alliance and EX13-076
selection passed three files and 27 tests. The broader ST2/combat/IR
registration/resolution/conformance/direct-Piercing selection passed 155
files and 1378 tests. Final full-regression results are recorded below. Type and sync-check gates passed; final card/layout checks passed two files and twelve tests. Scoped lint, changed-file formatting, the current 66-set index, diff checks and independent read-only review passed.

ST2's historical certification is reopened in its sole ledger; Tsunomon
is capped below ten. No full card, collection or mechanism is certified.

Current manual chunk `manual-0019` explicitly distinguishes a Security
Digimon from a normal Digimon; its complete committed text was read and
pinned as UTF-8 SHA-256 `78d175cb381f316a2e27cb4652ca7c7c8c48965fe578874c5e31afc18c3b3664`.
The official starter-deck Q&A PDF was inspected and has no ST2-01 entry;
that absence supplies no additional ruling. The old general-rules Q&A
URL returned 404 on this attempt; cached search excerpts were not treated
as normative proof.

ST2 synchronization against `1873b797d` reported three semantic changes
and sixteen synchronized records, with zero out-of-set semantic or byte
changes. The persisted Tsunomon record now carries the actual continuous
battle condition and modifier. Two pre-existing module/snapshot differences
were also reconciled: ST2-08's inherited aura explicitly excludes breeding,
and ST2-14's zero-source restriction/duration tokens now match its direct
module. Both unchanged modules and complete catalog contracts were read;
the full ST2 selection above includes their existing focused proofs. These
are snapshot-alignment observations, not fresh whole-card certifications.
After this synchronization, only EX13-076 retains three literal
untilEndOfBattle fields; ST2-01 represents its battle rule continuously.

A literal English catalog discovery over main, inherited and Security text
found only ST2-01 containing “when battling” or “while battling”. It does
not establish synonym, implicit condition, runtime-conferral or all-battle
consumer coverage. Complete phase-zero and normative denominators remain
open. The initial workspace typecheck exposed the required ModifyDP duration
and matcher source argument; it was not a green gate. The first full API
run completed with 5108 files and 42256 passing tests, four expected failures
(42260 total), before those fixes. Both fixes were applied after its terminal
result; final workspace typecheck passed shared, API and web, and the final API
run passed 5108 files / 42256 tests, four declared expected failures
(42260 total), in 180.30 seconds. The opt-in real Postgres lane was not
executed; no database behavior changed.
The explicit permanent duration is removed by continuous re-derivation
when the battle context ends, rather than retained as a timed grant.

## Persistent-effect source obligations

The complete committed `comprehensive-0172` (§15-8-2, Persistent Effects)
was read; UTF-8 text SHA-256
`d4b49613685801d2adcd744aeb58471c0a393a33f9f697539d305a9d21e896c6`.
This directly supports replacing Tsunomon's attack subscriptions with a
condition-dependent passive modifier. Every numbered paragraph in this
chunk is retained in the denominator below; the scoped statuses do not
certify the whole persistent-effect mechanism.

| Rule       | Obligation                                                    | Evidence or remaining requirement                                                                                          | Status             |
| ---------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 15-8-2-1   | A persistent effect applies without triggering                | Public Marsmon battle grants DP without declaring an attack for its host; old attack subscription fails                    | Verified ST2 shape |
| 15-8-2-2   | Apply as soon as its activation condition is met              | Both public no-source field battles compare with the required bonus                                                        | Verified ST2 shape |
| 15-8-2-3   | Stop as soon as its activation condition is no longer met     | Direct-battle DP returns to six thousand; Piercing security battle uses eleven thousand; retaining context makes both fail | Verified ST2 shape |
| 15-8-2-4   | Multiple persistent effects overlap                           | Duplicate physical inherited copies and mixed producers must be tested; single-copy tests cannot prove stacking            | Queued             |
| 15-8-2-5   | Later conflicting effects take priority except prohibitions   | Conflicting persistent effects and prohibition precedence require separate public proofs                                   | Queued             |
| 15-8-2-6   | Persistent effects with processing conditions form a category | Category-specific consumers must be identified, including optional/mandatory processing                                    | Queued             |
| 15-8-2-6-1 | Remain activated while processing conditions are met          | Tsunomon has no processing payment; applicable consumer proof required                                                     | Queued             |
| 15-8-2-6-2 | Stop when processing conditions are no longer met             | Tsunomon activation-gate proof is insufficient for processing conditions                                                   | Queued             |

The complete collection and normative scope in the main plan remains open;
these eight paragraphs are one explicit source denominator within it.

The final focused mechanism/collection selection repeated 155 files /
1378 passing tests after the explicit duration, matcher-source and printed
fixture corrections. The `src/cards/ST2` Vitest substring selector also
includes ST20–ST23; this is a broader prefix regression, not an exact
ST2-only count. The full default API run covers the complete current API
test inventory. Final ST2 sync/check both reported sixteen synchronized
records and three in-set semantic changes, with zero out-of-set semantic
or byte changes. The two pre-existing snapshot alignments remain as
described above. Scoped Oxlint is clean; no temporary mutation remains.

## Security-to-security duration correction, 2026-09-12

Baseline `39aadc6ae`. The complete committed comprehensive-0153 (§13-1)
was read: checks proceed one card at a time, a checked Digimon becomes a
Security Digimon, and effects resolve before the battle step. Text SHA-256:
`8a911eb930fd1fbfddbf7cadb49d45c75fb7ee683110ed24ca781bb9653fcc60`. Comprehensive-0155's complete battle procedure, pinned
above, includes Security Digimon battles and reaction processing. These
sources establish this boundary contract, not exhaustive end-battle timing
or replacement certification.

`runSecurityCheck` previously resolved the DP result, card trash and
`whenSecurityBattleEnded` reactions without sweeping battle-scoped grants.
The new optional `SecurityCheckDeps.sweepEndOfBattle` is bound by GameEngine
to the existing battle-only sweep. It is awaited after the actual battle
result and reactions, before another check. The guard is `battle !== undefined`:
a Tamer check, relocated card or absent attacker does not itself complete
a battle. Both modifier and continuous ledgers use this same sweep; the
integration proof below directly probes only the modifier DP grant.

`combat/attackDuration.test.ts` adds three public attack integration cases.
A seeded BT23-047 Examon has printed 15000 DP and Security Attack +1.
Two BT1-084 Omnimon Security Digimon each have 15000 DP; their printed
When Digivolving/When Attacking clauses do not activate as checked cards.
Examon's removal clause has no eligible opponent field objects. The named
`advance(...).ledgers.modifiers` seam arms a +1000 DP grant before the public
attack: no currently established public card produces this pre-security
battle-scoped DP shape. This explicitly seeded producer seam prevents a
whole-card/public-producer certification claim.

| Obligation                                             | Public result                                                                                                                              | Status                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| Battle DP ends before the next Security Digimon battle | First 16000-vs-15000 comparison wins; second 15000 tie deletes Examon, with exact owner trash and both security cards trashed              | Verified seeded DP shape |
| Attack DP survives both battles                        | UntilEndAttack wins both comparisons; Examon remains, then returns to 15000 DP at attack cleanup                                           | Verified seeded DP shape |
| A non-Digimon check does not end a battle              | First checked BT1-085 Tai plays via Security; subsequent Omnimon loses to 16000 DP; Tai and Examon remain, with exact security/trash zones | Verified Tamer control   |

Tai is unsuspended and has no legal deletion target for Examon's clause;
his red-four-source Security Attack aura cannot affect source-free Examon.
All three cases assert two checked events, raw DP battle verdicts, exact
physical live/trash IDs, zero security, ten memory, no pending choice and
no loud implementation gap. Raw securityDigimonDeleted is a comparison
verdict; a checked Security Digimon is trashed rather than actually deleted.

The initial test used an invalid `security` attack target and was corrected
to the public `player` target; that fixture failure is not mutation evidence.
The genuine baseline then failed one case and passed four: the second
Security Digimon comparison incorrectly spared Examon. After the sweep,
all five cases passed. Independent read-only review found no introduced
boundary, fixture or scope blocker. Broader security/combat/conformance,
direct-Piercing, ST2 prefix (including ST20–ST23), EX13-076 and BT23-047
regression passed 163 files / 1250 tests. Final proof/layout passed two files / nine tests; scoped lint, six-file formatting, current 66-set index and diff checks passed.

Open: complete security-battle producer inventory, continuous-grant public
integration, explicit asynchronous reaction/sweep suspension proof, grants
created during reactions, nested battle ownership and every remaining
normative/consumer shape. This correction does not close the overall audit.

Security-boundary gate commands:

- `pnpm --filter @aegis/api exec vitest run src/engine/combat/attackDuration.test.ts --maxWorkers=1 --no-file-parallelism`
- `pnpm --filter @aegis/api exec vitest run src/engine/security src/engine/combat src/engine/conformance src/engine/directBattlePiercing.test.ts src/cards/ST2 src/cards/EX13/EX13-076.test.ts src/cards/BT23/BT23-047.test.ts --maxWorkers=1 --no-file-parallelism`
- `pnpm typecheck` passed shared, API and web.
- `pnpm --filter @aegis/api exec vitest run --maxWorkers=1 --no-file-parallelism`: first run completed with 5107 passing files and one failed file, 42258 passing tests, four declared expected failures and one additional failure (42263 total), in 180.81 seconds. `accounts/routes.profile.test.ts` unauthenticated avatar request received HTTP 404 instead of 401. All seven profile tests pass isolated (902 ms). This broad run is not a green gate; unchanged-input confirmation passed 5108 files / 42259 tests with four declared expected failures (42263 total), in 167.90 seconds. The profile failure did not recur. The first failure remains recorded; its root cause is not established, and it is not presented as a green run.

Final security-boundary delivery: shared/API/web typechecks, 163-file / 1250-test
mechanism regression, nine final proof/layout tests, scoped Oxlint, six-file
Oxfmt, current 66-set index, clean diff checks and independent read-only review
passed. The unchanged-input full API confirmation above is green with the four
known EX13 expected failures at that checkpoint (002, 020, 043, 063). EX13-002 was subsequently resolved by the bounded [name-standardization.md](name-standardization.md) proof; the other three remain open. No Postgres lane was run;
no database behavior changed. No temporary mutation or snapshot change remains.
Complete engine/keyword certification is still open.
