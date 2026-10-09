# Nested DigiXros play watchers

Discord report `1553600701442297956`, verified against read-only Oracle server
match `2a7e4a34-5303-4e6d-b55b-7e495e226b28` on 2026-09-27. Raw logs remain outside
the repository.

At 02:52:55 UTC, P-224 played BT19-014 from under a Tamer without offering the
available BT10-087 expansion. An earlier normal play had installed the legacy
`wouldBePlayed` / `PlaceUnder` declaration at payment time. On the later effect
play, that no-op listener marked the Tamer handled and suppressed the real
DigiXros picker. Registry-backed `PlaceUnder` declarations now leave execution
to the canonical picker, which enforces the host restriction and suspension cost.
Other replacement actions, including material-zone ledger grants, remain active.

At 02:53:11 UTC, BT19-014's On Play played BT19-035. The nested arrival's BT21-083
activation incorrectly consumed the original BT19-014 arrival's pending watcher.
Entry-event consumption keys now include the event's subject permanent IDs.
Duplicate publication of one play remains deduplicated; distinct plays retain
their own activations. Once-per-turn identity remains unchanged.

The later rejected AD1-006 plays selected materials under multiple Tamers with a
single BT10-087 activation. Its printed text restricts that activation to one
Tamer host; BT10-087's existing positive/negative tests preserve that boundary.
Local KB: Q2011–Q2015 (material sources and play count), Q4598/Q4728 (no new attack
during an existing attack), and the existing effect-play conformance citations
for CR 7-2-2-12/13 and 7-2-3.

Proof: `P/P-224.test.ts` plays AD1-006 first, then uses Kotone to play BT19-014 with
BT21-021 under Taiki, covering acceptance, refusal, suspension, material zones,
one DigiXros prompt, and exact cost. `nestedXrosPlayAttack.test.ts` covers both
ordinary and nested arrivals: decline ShootingStarmon's separate attack, accept
EX6's retained attack with inherited Rush, decline Alliance, and finish the
security check. Reverting the production fixes reproduces three focused failures.

Validation: 8,970 tests passed across the full engine plus P-224, BT10-087,
BT10-088 and BT21-083. Two existing failures also reproduce with all five changed
production files restored to HEAD: `mechanic.test.ts`'s BT14-083 top-source trash
assertion and `state/syncedArrayMutators.guard.test.ts`'s existing
`state/access.ts` plain-array splice. Workspace typecheck passed. Independent
read-only review found no blocking production issue. This is a bounded bug fix,
not collection certification or production deployment.

Final focused regression and audit-layout run: 13 files / 108 tests passed.
Scoped Oxlint, Oxfmt and `git diff --check` passed; debug instrumentation was
removed. API typecheck was rerun successfully after the final test assertions.

The interactive reproduction is available at
`/dev/arena?scenario=arena-kotone-digixros-pending-attack`, with bilingual steps.
`kotoneDigiXrosScenario.test.ts` starts the actual scenario turn loop, declines
Start of Main costs, plays X7 first, then uses Kotone to play EX6 with both
materials under BT10-087. It verifies 20 → 7 → 1 memory, both Tamer costs,
ShootingStarmon's nested entry and the retained EX6 attack through a completed
security check. The scenario and recent-scenario suites pass 18 tests.
