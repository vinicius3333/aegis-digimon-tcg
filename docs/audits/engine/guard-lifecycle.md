# Guard lifecycle

## Status and contract

In progress: source/consumer inventory and public counterexample established.
No engine correction or keyword certification is claimed by this checkpoint.
Base: 987110990.

The exact EX13-063 catalog and direct module were read. PrinceMamemon grants
Blocker and Guard to all own Mamemon-named Digimon, including itself.
Its other printed reveal/free-play and separate highest-cost deletion clauses
must be allowed to resolve rather than silenced in a test fixture.
`node tools/kb/query.mjs card EX13-063` has no card-specific entries.

`data/kb/rules/comprehensive.md` SHA-256
`19106a66edc44722faa460baa6746f8dc06414bd0775fda980914000f86e1de6`,
§16-45 in full: Guard protects a controller's other Digimon from opposing
effects, pays by deleting the holder, is immediate-type, and is optional.
The clause's shorthand uses a singular pronoun. The official
[EX12-056 card page](https://world.digimoncard.com/cards/?card_no=EX12-056&search=true)
was opened and its effect/reminder read: it uses plural prevention for the
other Digimon. Current authored replacements encode simultaneous protection
with affectsAll. Preserve this distinction in the normative denominator;
complete simultaneous-trigger/payment and event grouping still need proof.

## Initial consumer inventory

Exact Guard icons in the committed catalog occur in six card definitions;
a raw Guard text search also returns P-222 because it names Wind Guardians,
which is not a Guard keyword. This is the printed-catalog inventory only,
not an exhaustive runtime-grant or inherited-shape certification.

| Consumer | Form                       | Current path / limitation                | Scope inspected                                |
| -------- | -------------------------- | ---------------------------------------- | ---------------------------------------------- |
| EX12-056 | printed holder             | source-anchored authored replacement     | direct Guard record and official reminder      |
| EX12-057 | Paishu token producer      | CreateToken keyword definitions          | token-producing records identified             |
| EX12-072 | face-up security ME aura   | pooled authored payment, no holder scope | direct security/replacement module             |
| EX13-052 | printed holder             | Static token plus authored prevention    | direct Guard clauses identified                |
| EX13-063 | resident Mamemon aura      | pooled authored payment excludes grantor | direct complete module and public reproduction |
| EX13-065 | printed holder with Decode | Static token plus authored prevention    | direct Guard/Decode clauses identified         |

Paishu's committed token definition has Blocker and Guard. A future engine
hook must include it without treating the parent producer as a holder.
Printed, security-granted, resident-granted and token paths must converge;
existing authored Guard replacements must not remain as a second behavior
that reintroduces pooled eligibility or duplicate choices.

## Implementation trace

`GameEngine.consultLeavePrevention` rebuilds the continuous registry, then
calls the existing consult with keyword replacements (currently Detach) plus
authored wouldBeDeleted/wouldLeavePlay subscriptions. The keyword seam already
supports live physical source identity and ordering; a second replacement
runner is unnecessary.

`leavePrevention.ts` orders eligible reactions, guards only the resolving
replacement's activation identity, pays preventCheck, and supports affectsAll
with a per-consult successful-payment set. Source-relative filters on an
EX13-063 subscription cannot express every granted holder protecting all
other Digimon. In particular, excluding PrinceMamemon from the authored
protected pool forbids a different Mamemon holder from saving the grantor.

## Obligation ledger

| Obligation                                                                      | Source / action                       | Evidence                                                 | Status                   |
| ------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------- | ------------------------ |
| Different granted holder may pay to save grantor                                | §16-45; public ST1-16                 | expected public survivor/trash contradicted by execution | open reproduced          |
| Lone holder cannot save itself                                                  | §16-45; public ST1-16 with acceptance | actual Prince deletion and full OnDeletion follow-ups    | verified bounded control |
| Refusal preserves other holder and allows original deletion                     | §16-45-3; public ST1-16               | actual payer survives, Prince and reveal cards trashed   | verified bounded control |
| Correct physical payer and cleanup                                              | §16-45; existing prevention seam      | needs canonical per-holder hook                          | queued                   |
| Printed/granted/token/face-up-security forms                                    | catalog and token definitions         | identified forms, not all publicly executed              | queued                   |
| Opponent-only causes, simultaneous events, competing reactions, payment failure | §16-45/15-8-5                         | complete applicable sources/proofs pending               | queued                   |
| Grant removal, source departure, re-entry and identity                          | full lifecycle                        | current registry/guard traced, public proof pending      | queued                   |

## Public baseline and fixture integrity

The colocated EX13-063 tests publicly use ST1-16 Gaia Force for eight memory
from ten on seat one's turn. Printed quiet Red Monodramon supplies its color.
The server chooses PrinceMamemon, biased by its exact instance ID. Gaia's
registered Main resolves, its exact physical card reaches owner's trash,
memory ends at two, no pending decision or loud gap remains.

In the acceptance case, printed quiet BT6-063 BigMamemon should sacrifice
itself and leave PrinceMamemon alone with the exact three-card deck untouched.
Actual execution leaves BigMamemon and deletes Prince. The grantor's real
OnDeletion reveal trashes three nonmatching Bird cards and its separate
highest-cost deletion removes the opposing Red source. These reactions are
not suppressed or replaced with fake card data.

The lone-holder control accepts optional processing, so illegal self-payment
cannot hide behind refusal. The two-holder refusal control declines and
keeps BigMamemon. Both allow the Prince's complete printed OnDeletion
follow-ups. Exact final field/trash identities are asserted.

The first attempted predicate looked up Gaia while the Option was in the
normal temporary no-area state (§9-1-4). Its ID is now captured before use;
that fixture failure is not Guard red evidence. Corrected genuine baseline:
one failure, twenty passes and one old expected failure (22 total).
The public defect is retained as a second expected failure until correction;
it is not certified by Vitest's green status.

Focused card/layout command passes 24 ordinary cases with two expected
failures (26 total). After strengthening the ordinary controls to require
exact opposing trash identities (Gaia and the Red source), collection/layout
regression passes 61 files, 1037 ordinary tests and two expected failures
(1039 total). Command:
`pnpm --filter @aegis/api exec vitest run src/cards/EX13/ src/cards/audit-docs.test.ts --maxWorkers=1 --no-file-parallelism`.
The two expected failures represent the same unresolved Guard limitation,
through the older deletion seam and the public Option path.
Independent read-only review found no blocker; its endpoint recommendation
is included in the ordinary controls. No executable behavior or persisted
card metadata changed at this reproduction checkpoint. The full API gate
recorded at base 987110990 predates these new tests and is not a full-suite
certificate for this checkpoint.

Final `pnpm typecheck` passes shared/API/web. Scoped Oxlint, Oxfmt on
the three changed files, the current 66-set index and `git diff --check`
pass. Delivery is a separate reproduction commit on the existing draft
audit branch; it does not close Guard or the complete mechanism plan.

## Next implementation obligations

Use the existing keyword/prevention ordering seam to bind a live reaction
to each actual Guard holder and fix the payment to that holder. Migrate
all authored Guard equivalents so there is one behavioral path, preserving
printed non-Guard clauses, source identity, token handling and exclusive
registerIrCard registration. Prove real opposing deletion/bounce, refusal,
self exclusion, multi-target payment, source grant loss and at least two
consumer forms before certification. Every uncovered clause stays open;
EX13-063 remains partial and below ten.
