# EX7 re-audit review notes

## Coordinator decisions

- Official text and the committed catalog/rules knowledge base are authoritative.
- Card lanes may edit only their assigned card module, focused test, and evidence report.
- Engine gaps remain explicit retained reds until a serialized engine lane resolves them.

## Engine seam queue

- EX7-058 resolved: the live continuous keyword reader now includes keywords printed on token/top-card definitions and inherited stack text. Volée & Zerdrücken exposes Blocker and Retaliation; 145 focused/mechanism regressions pass.
- EX7-018 resolved as a rules/fixture error: inherited Jamming correctly does not apply while Gekomon is the top card. A second public evolution places it in the stack and surfaces Jamming; no engine change was needed.
- EX7-005 resolved: its once-per-turn watcher resets through a continuous real turn loop. The prior limitation manually assigned the next phase; no engine change was needed.
- EX7-004 resolved: watcher re-arms correctly; the retained red used the wrong pre-transition memory baseline. No engine change was needed; mechanism report and 6,774-test engine regression confirm compatibility.
- EX7-006 resolved: recollection works. The retained red crossed the printed four-card hand limit after legitimate draws and expected an incomplete post-evolution stack. No engine change; mechanism report and 6,774-test regression green.

## Fixture traps

- No Digi-Egg cards in deck or security.
- No injected timing may count as behavioral proof.
# EX7-010 — Q3831 breeding-area static grant

- The public battle-area trait-grant behavior passes.
- A retained `it.fails` proves the engine currently allows EX7-066 to use EX7-010's Three Musketeers grant while EX7-010 is in breeding, contrary to Q3831.
- Resolved as a false fixture: EX7-066 was independently legal by matching EX7-010's printed red color. Purple EX7-071 is rejected, no breeding trait is granted, and EX7-010 is promoted to 8/10 without an engine change.

# EX7-011 — §15-7-5 payable `by` condition

- Public play/evolution positives pass, including exact costs, draw, stack placement, threshold, decline, and Piercing.
- A retained `it.fails` expects the payable Option placement to occur even when no opposing Digimon meets the following deletion ceiling.
- Resolved by the serialized shared-resolver lane with a narrow predicate for self-hosted loose-card placement conditions; EX7-011 is promoted to 8/10 after focused, mechanism, full-engine, typecheck and static proof.

# EX7-013 — Q3832 hand-add watcher

- Resolved as a fixture-direction error: the fixture declined BT10-077's optional activation and expected seat 0's discarded hand cards in seat 1's trash.
- Corrected public behavior is green: seat 1 trashes its BT1-104 stack cost, then seat 0 trashes five cards from its own hand.
- A focused real-watcher mechanism regression proves the same event and zone direction; no production engine change was required.

# EX7-015 — Q3840 DigiXros cost reduction

- Resolved by passing the existing continuous play-cost-reduction policy into DigiXros validation.
- Under EX7-015, legal DigiXros materials are still placed under the played Digimon but apply zero cost reduction; unrestricted DigiXros retains its printed reduction.
- Focused, generic mechanism, conformance/interaction, full-engine, typecheck, and static gates are green.

# EX7-014 — Q3835 breeding move restriction

- Resolved by making the generic effect-driven move-to-breeding primitive honor active `playOrMove` restrictions before extraction.
- Q6509 effect-play behavior remains green and the full engine regression passes.

# EX7-023 — Q3844 dynamic suspension restriction

- Resolved by routing continuous all-target source-relative restrictions through the existing live player-scoped predicate ledger.
- The predicate re-evaluates both source and target stacks and consistently treats `suspend` and `beSuspended` as equivalent.
- Public Q3844, focused mechanism, proportional conformance, full-engine, typecheck, and static gates are green.

# EX7-014 — Q3836/Q6718 DigiXros replacement identity

- Resolved by consulting leave replacements before DigiXros consumes a field material and marking the declaration as a player action.
- EX7-014's replacement activates with the correct source identity; public card and dedicated mechanism tests are ordinary green.

# EX7-027 — inherited leave-prevention reset

- Resolved as a fixture error: the intervening public attack hit a 5000-DP Security Digimon, so the 1000-DP host correctly spent its newly reset prevention and second Puppet before the next opponent turn.
- Inert Option security isolates the intended re-suspension step. The next opponent attack consumes the second Puppet and preserves the host, proving reset through the real turn loop.
- Card plus leave-prevention/subtrigger mechanism suites pass 56/56; no engine change was required.

# EX7-028 — inherited for-the-turn modifier persistence

- Public battle deletion proves both Q3846 branches and optional refusal; public evolution proves exact legal and illegal stack boundaries.
- Resolved as a fixture error: the public BT1-039 host had only enough hand cards to pay its first three-card unsuspend cost, so the second resolution did not preserve the intended same-turn state.
- Funding both printed costs proves two public attacks while -4000 DP remains live, followed by real turn expiry and next-turn re-arm.
- Card plus modifier/subtrigger mechanism suites pass 73/73; no engine change was required.

# EX7-029 — On Play modifier lifetime

- Resolved as a fixture error: after public play the active player had no legal Main action, so production auto-passed and correctly expired both `untilYourTurnEnd` modifiers.
- Keeping a legal follow-up card in hand holds Main open. Both -8000 DP changes persist until the explicit end-phase intent and then expire.
- All 9 focused tests pass; no engine change was required.

# EX7-030 — Q3847 simultaneous Overclock triggers

- Resolved by retaining deleted Token instances as transient candidates when a nested On Deletion window is deferred behind its causing effect.
- Familiar's already-triggered effect now survives removal-from-game and combines with Cendrillmon's When Attacking effect for Q3847's observable 3000 DP.
- Focused/token/Overclock/prevention suites pass 38/38.

# EX7-018 — inherited static recomputation after evolution

- Resolved as a rules/fixture error: the former red expected an inherited effect while EX7-018 was the top card.
- A second legal public evolution places EX7-018 under EX7-022; the exact stack and inherited Jamming are both observable.
- No engine change was required.

# EX7-044 — RevealAdd place-under cleanup

- Resolved as an illegal-fixture error: BT1-001 through BT1-004 are Digi-Eggs, so rule processing correctly removed them from the main deck.
- The corrected public flow uses neutral Digimon, places the selected Option, returns every remaining revealed card to the chosen bottom destination/order, and performs the conditional deletion.
- EX7-044 and the shared reveal mechanism suite pass 126/126; no engine change was required.

# EX7-049 — Q3855 future-entrant evolution restriction

- Resolved with the interpreter's live player-scoped restriction path and an explicit `whileMatchesTargetFilter` marker on EX7-049.
- The predicate covers future qualifying battle-area level 4s while preserving Q3853 immunity and Q3854 breeding exclusion; the same evolution pair succeeds after expiry.
- Focused plus processing-condition mechanism tests pass 10/10.

# EX7-058 — token keyword registration

- Resolved by binding the live ledger's printed-keyword reader to top-card and inherited-stack definitions.
- Public evolution creates the canonical token with correct stats and now exposes both Blocker and Retaliation.
- Focused EX7-058, interaction, and keyword parser regressions are green.

# EX7-059 — Q6391 Tamer Blast Digivolve base

- Resolved in Blast validation: a Tamer base may ignore an alternate requirement's level gate during Blast, but must still satisfy its printed identity/text gates.
- Public Counter over BT18-093 now exposes and resolves EX7-059, while ordinary Blast Digivolve and Blast DNA regressions remain green.
- Focused and proportional Blast suites pass 54/54.
- Retained as a top-level `it.fails`; queue for serialized Blast Digivolve candidate validation that supports text-qualified Tamers while ignoring normal digivolution conditions.
