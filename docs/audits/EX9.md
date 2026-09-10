---
set: EX9
cards: 74
status: verified
verified_at: 2026-09-09
catalog_commit: e540204fb
evidence_commit: eabe99351
---

# EX9 audit

## Status

All 74 EX9 cards are verified at 10/10 by the 2026-09-09 re-audit
(`docs/audits/EX9-REAUDIT-LEDGER.md`, commit `ac03ac140`), which started from base
`23eee9e5a5c55baab8d21207b14f4cf752e432a6` and explicitly did not inherit earlier scores.
Every card has a catalog and rules review, an IR trace, colocated behavioral proof, and
peer or stack proof, plus a per-card evidence report merged into the Card ledger below.
Two earlier EX9 reports disagreed with this result and lost: `apps/api/src/cards/EX9/AUDIT.md`
(2026-08-28) recorded static fidelity only because test, typecheck, lint, and diff-check
execution had been waived, and `docs/audits/EX9-AUDIT.md` (2026-09-05) reported a smaller
collection run of 924 tests. The 2026-09-09 ledger is the newest complete per-card ledger
and therefore wins. The contradictions are listed under Open items.

## Gates

Copied from `docs/audits/EX9-reaudit/RUN.md` (commit `678a92fca`, 2026-09-09), section
"Closing gates before publication".

- Coverage recalculation: 74 catalog cards, 74 modules, 74 direct test files, 74 evidence
  reports, and 74 unique `registerIrCard` registrations.
- Static policy scan: no EX9 `registerCard`, no focused `skip`/`only`/`todo`/`fails`, no
  injected timing, no debug or probe residue.
- Persisted IR sync and check against base: 74 EX9 records synchronized; two EX9 semantic
  changes (the stale baseline record and corrected EX9-065); zero semantic or byte changes
  outside EX9.
- Final EX9 collection: 77 files / 979 tests passed.
- Final engine mechanisms: 127 files / 2048 tests passed. The AD1-002 unsupported-effect
  log line is asserted behavior inside a green suite.
- Serial workspace typecheck with a 4096 MB heap: exit 0 for shared, API, and web.
- Changed TypeScript files: Oxlint exit 0; Oxfmt check exit 0 for 68 files;
  `git diff --check` exit 0.
- `pnpm check:cards:style`: red on 273 pre-existing files across unrelated BT, LM, and ST
  collections. The repository does not define the quality-gate skill's `quave-check-ci`
  script. No unrelated formatting was changed; the scoped EX9 checks above are green.

Baseline gates measured before worker acceptance, same source:

- `pnpm install --offline --frozen-lockfile`: exit 0; 423 packages reused.
- `pnpm effects:sync:set -- --set EX9 --base 23eee9e5a5c55baab8d21207b14f4cf752e432a6`:
  74 records synchronized; one EX9 semantic change; zero changes outside EX9.
- Serial EX9 collection after the shared build: 77 files / 924 tests passed.
- Baseline engine mechanisms: 127 files / 2048 tests passed.
- Serial workspace typecheck: exit 0 for shared, API, and web.

Publication, same source:

- Implementation and effects commit `6c20a4e8d` ("Correct EX9 persisted card behavior").
- Behavioral proof commit `5d43f3ae2` ("Strengthen EX9 behavioral coverage").
- Final evidence commit `ac03ac140` ("Document complete EX9 re-audit").
- Independent Luna review approved the scoped final diff with no Critical, Important, or
  Minor findings.

## Card ledger

Scores from `docs/audits/EX9-REAUDIT-LEDGER.md` (2026-09-09): aggregate 740/740, 74/74
cards at 10/10. Each section below merges that card's evidence report from
`docs/audits/EX9-reaudit/`.

### EX9-001 — Koromon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and therefore remain **0/2** in this lane. Final card score is **8/10 pending set gates**.

No card or engine defect was found. The existing module was already a full-coverage IR registration; this lane strengthened the colocated behavioral proof and corrected an illegal multiline Digi-Egg deck fixture.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-001` (`Koromon`), red Digi-Egg, Lv.2, In-Training, traits `Lesser/DM/Ver.1`.
- Printed inherited text: `[When Attacking] [Once Per Turn] This Digimon with face-down digivolution cards may digivolve into a [Ver.1] trait Digimon card in the hand with the digivolution cost reduced by 1.`
- Local KB query: `node tools/kb/query.mjs card EX9-001`.
- Comprehensive rules used: `comprehensive-0069` (cards under a Digimon grant inherited effects), `comprehensive-0077` (digivolution-card identity), `comprehensive-0108` (Main actions only with no unresolved processing), `comprehensive-0125`/`0126` (standard digivolution), `comprehensive-0143`/`0144` (attack timing and declaration), `comprehensive-0160` (inherited effects), `comprehensive-0165` (pending activation), `comprehensive-0170` (optional processing), and `comprehensive-0173` (trigger-type effects).

Q&A ids returned by the local KB:

- `Q4741`: EX9-070 `<Delay>` [Main] cannot be declared while this inherited attack evolution is unresolved. Direct cross-card proof already exists in `apps/api/src/cards/EX9/EX9-070.test.ts` (`Q4741/Q4749 reject Meat during the inherited attack evolution from EX9-001`).
- `Q4751`: a Raid effect newly gained after evolving from an EX9-008 host does not trigger for the already-declared attack.
- `Q4752`: same timing rule for an EX9-010 host evolving into EX9-011.
- `Q5193`: the EX9-001 reduction combines with P-202's `[Your Turn]` reduction, for a total reduction of 2.

#### Clause → IR → proof

| Printed clause | IR mapping | Observable proof |
|---|---|---|
| `[When Attacking]` | `compiled.effects[0].trigger = "WhenAttacking"` | Public `attack` intents in the positive, negative, boundary, reset, and Q4751/Q4752 tests (`EX9-001.test.ts:70-365`). |
| `[Once Per Turn]` | `isInherited: true`, `frequency: "OncePerTurn"` | Same-turn second attack cannot evolve (`:131-168`); real production turn loop resets it on the next own turn (`:170-220`). |
| `This Digimon with face-down digivolution cards` | self target with `filter.isSelfRef` and `digivolutionCards: "hasFaceDown"` | Positive stacks include face-down `BT1-009`; face-up-only stack remains unchanged (`:345-376`). |
| `may` | `optional: true` | Explicit refusal preserves stack, hand, memory, and resolves the attack (`:98-129`). |
| `digivolve into a [Ver.1] trait Digimon card in the hand` | `from: ["hand"]`, `into.kind: ["Digimon"]`, `into.nameOrTrait: [{ tokens: ["Ver.1"], match: "trait" }]` | Positive Ver.1 destinations include EX9-053, EX9-009, and EX9-011; non-Ver.1 BT10-064 is rejected (`:251-278`). |
| `digivolution cost reduced by 1` | `payCost: true`, `reduceCost: 1` | Memory decreases by the reduced cost, including cost crossing to the opponent (`:70-96`, `:319-343`). Q5193 proves combination with P-202's independent reduction (`:222-249`). |

The exact catalog fields and complete IR shape are asserted at `EX9-001.test.ts:9-52`. The module has only one registration, `registerIrCard("EX9-001", compiled)` at `EX9-001.ts:44`; there is no legacy `registerCard` registration.

#### Behavioral and stack proof

- Positive legal route: EX9-050 (Lv.4) carrying EX9-001 and a face-down source evolves into EX9-053 from hand and pays cost 2 instead of 3.
- Optional refusal: the attack completes against security with no evolution, no memory payment, and unchanged face-up/face-down stack.
- Numeric boundary: a 3-cost destination with 1 memory and EX9-001's reduction correctly crosses memory to `-1`.
- Destination boundary: a legal hand Digimon that lacks Ver.1 remains in hand and does not consume memory.
- Real evolution stack: EX9-008 → EX9-009 → EX9-011 across two real turns demonstrates source identity, inherited effect persistence, payment, and once-per-turn reset. The reset fixture uses six inert main-deck BT1-009 cards; after the second legal evolution, memory resolves to 0.
- Q4751/Q4752 mixed peer cases use EX9-008/EX9-010 hosts, Ver.1 destinations, and an opposing redirect candidate; newly gained Raid does not redirect the already-declared attack.
- Q5193 uses P-202 as the host with EX9-001 and a face-down source; EX9-011 costs 3, both reductions apply, and only 1 memory is paid.
- No Digi-Egg is placed in deck or security. The reset fixture uses inert main-deck `BT1-009` cards, and all security fixtures in the assigned test use inert main-deck Digimon `BT1-012` (2,000 DP, no relevant effects), so security resolution does not alter the card-specific assertions. No `advance.fire`, `fireTiming`, or `fireSubTrigger` seam is used in this card test.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

```text
pnpm --filter @aegis/shared build
PASS

pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-001.test.ts --maxWorkers=1 --no-file-parallelism
PASS — 1 file, 12 tests

pnpm typecheck
OUT-OF-SCOPE FAIL — the current shared-worktree rerun reports only unrelated EX9-074 errors (`color` vs `colors` at `EX9-074.ts:20,26,32,38,44,50,56`; missing target `count` at `:129,190`). EX9-001 has no typecheck errors.

pnpm exec oxlint apps/api/src/cards/EX9/EX9-001.ts apps/api/src/cards/EX9/EX9-001.test.ts
PASS

pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-001.ts apps/api/src/cards/EX9/EX9-001.test.ts
PASS

git diff --check
PASS

rg -n 'security:.*(BT1-00[1-8]|ST[134]-01|EX9-00[1-4])|deck:.*BT1-00[1-8]|advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger' apps/api/src/cards/EX9/EX9-001.test.ts
PASS — no illegal Digi-Egg deck/security fixture or injected timing helper.
```

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-001.ts`: no change; existing full IR is faithful.
- `apps/api/src/cards/EX9/EX9-001.test.ts`: added exact catalog/IR assertion, next-turn reset, and Q5193 combined-reduction proof; replaced the multiline Digi-Egg reset deck (`BT1-001`–`BT1-006`) with inert main-deck `BT1-009` cards and updated the resolved hand/memory assertions.
- `docs/audits/EX9-reaudit/EX9-001.md`: this report.
- No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Other worktree status entries were pre-existing concurrent-lane changes and are not part of this card result.

Remaining limitation: Q4741's `<Delay>` activation attempt is proven by the existing EX9-070 cross-card test because the affected Option belongs to EX9-070; no duplicate test or modification outside the assigned three files was needed. No unresolved EX9-001 behavior remains.

### EX9-002 — Tsunomon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-002`, Tsunomon), a Blue level-2 DigiEgg with `[Lesser]/[DM]/[Ver.2]` traits.
- Printed inherited text: `[Your Turn] [Once Per Turn] When face-down cards are placed in this Digimon's digivolution cards, this Digimon may digivolve into a [Ver.2] trait Digimon card in the hand with the digivolution cost reduced by 1.`
- Local rules: `data/kb/rules/comprehensive.md` §§4-3-3 and 15-3-1–15-3-3 (inherited effects), §§8-2-2-1–8-2-3-3 (digivolution cards and face state), and §14-15-1 (once-per-turn limits).
- Local KB: `node tools/kb/query.mjs card EX9-002` → Q4742.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4742 | Verified. Meat's `[Main] ＜Delay＞` cannot be declared while EX9-002's triggered evolution is unresolved; the evolution pays only EX9-002's printed reduction. | `apps/api/src/cards/EX9/EX9-070.test.ts` test “Q4742 rejects Meat during EX9-002's Training-triggered evolution…”; focused EX9-070 suite: 26/26 passed. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Inherited effect | `EX9-002.ts:9-55`, `isInherited: true` | Structural assertion in `EX9-002.test.ts:9-23`; realistic stack tests place EX9-002 under a battle-area Digimon. |
| `[Your Turn]` | `trigger: "YourTurn"` at `EX9-002.ts:11` | Real Training actions are activated during seat 0's turn in tests at lines 25-54, 87-115, 117-148, 150-177, and 179-209. |
| When face-down cards are placed in this Digimon's stack | `SubTrigger`, `event: "onAddDigivolutionCards"`, `triggerFilter.isSelfRef`, and `addedDigivolutionCardFilter.faceDown` at `EX9-002.ts:14-24` | A real Training placement evolves (lines 25-54); a normal face-up digivolution does not react (lines 56-85); a second real face-down placement during EX9-017's evolution is blocked by once-per-turn (lines 179-209). No `advance.fire`/`fireSubTrigger` is used. |
| May digivolve | `optional: true` at `EX9-002.ts:48` | Auto-decline preserves the host and candidate in hand after a real placement (lines 150-177). |
| Into a `[Ver.2]` trait Digimon card in hand | `into.kind: ["Digimon"]`, `into.nameOrTrait: [{ tokens: ["Ver.2"], match: "trait" }]`, `from: ["hand"]` at `EX9-002.ts:35-45` | EX9-017 evolves from hand (lines 25-54); EX9-009 (Ver.1) remains in hand and cannot be selected (lines 87-115). |
| Cost reduced by 1 and paid | `reduceCost: 1`, `payCost: true` at `EX9-002.ts:46-47` | Memory 4→3 after the legal EX9-017 evolution (lines 36, 49-52); next-turn EX9-018 route observes the reduced cost before the pass-turn reframe (lines 234-247). |
| `[Once Per Turn]` | `frequency: "OncePerTurn"` at `EX9-002.ts:53-54` | A second face-down card placed by the evolving EX9-017 does not evolve the remaining EX9-018 (lines 179-209); a real owner turn resets the watcher and permits EX9-018 (lines 211-253). |

#### Peer / stack proof

- The positive route uses a legal `EX9-002` → `EX9-015` stack and real `＜Training＞` placement.
- The mixed fixture has two otherwise identical EX9-015 hosts; only the host carrying EX9-002 reacts when the other host receives a face-down card (`EX9-002.test.ts:117-148`).
- The normal evolution control verifies face-up stack cards are excluded (`:56-85`).
- The once-per-turn test uses EX9-017's real face-down placement during its own evolution, preserving stack identity and proving the second event does not retrigger EX9-002.
- Collection-sweep correction: six illegal `BT1-001` deck fixtures were inertly replaced with legal main-deck `BT1-027` fixtures; the intended deck filler role and all behavioral assertions are unchanged.

#### Verification commands

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-002.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 8 tests. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-070.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 26 tests (Q4742 integration proof). |
| `pnpm typecheck` | PASS — shared build, API, and web typechecks. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-002.ts apps/api/src/cards/EX9/EX9-002.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-002.ts apps/api/src/cards/EX9/EX9-002.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-002.ts apps/api/src/cards/EX9/EX9-002.test.ts` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger' apps/api/src/cards/EX9/EX9-002.test.ts` | PASS — no injected timing helper. |
| `rg -n -U -C1 '(?:deck|security)\\s*:\\s*\\[[^\\]]*(?:BT1-00[12]|ST[134]-01|EX9-00[1-4])' apps/api/src/cards/EX9` | PASS — no multiline Digi-Egg fixture remains in EX9 deck/security declarations. |
| `rg -n -U 'BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-002.test.ts` | PASS — EX9-002 has no forbidden Digi-Egg token. |

#### Defects and gaps

No card-specific defect or unresolved engine seam found. The implementation already registered exclusively with `registerIrCard("EX9-002", compiled)` and required no module change; the colocated tests were rebuilt around observable production flows. The collection-sweep fixture correction changes only inert deck filler (`BT1-001` → `BT1-027`) and preserves all behavioral outcomes.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-003 — Tokomon

#### Result

Worker score: **8/10** (pre-gate evidence: 8/8; delivery-gate column: 0/2, coordinator-owned).

The card module is faithful to the catalog clause and registers only through
`registerIrCard("EX9-003", compiled)`. The retained turn-boundary proof now
selects EX9-030's alternate cost explicitly; no engine seam was found or
changed. The inherited continuous `wouldDigivolve` replacement re-derives and
the once-per-turn ledger resets correctly after the opponent turn.

#### Sources and rules

- Catalog `packages/shared/src/cards/data/cards.json`: EX9-003 Tokomon, yellow
  Digi-Egg, traits Lesser/DM/Ver.3, inherited text exactly
  `[Your Turn] [Once Per Turn] When this Digimon with face-down digivolution
  cards would digivolve into a [Ver.3] trait Digimon card, reduce the
  digivolution cost by 1.`
- `node tools/kb/query.mjs card EX9-003`: Q4743 (2025-06-13), related
  EX9-070. Answer: **Yes**, Meat's reduction and Tokomon's inherited reduction
  combine for a total reduction of 3.
- `data/kb/rules-index.json`: comprehensive-0076 (§4-6-9, face-down stack
  cards have no referenceable card information), comprehensive-0167 (§15-5,
  “would” trigger conditions), comprehensive-0177 (§15-8-5, immediate-type
  effects), and glossary-0007 (Once Per Turn usage is limited per turn and
  resets at the turn boundary).

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Proof |
| --- | --- | --- |
| `[Your Turn]` | `trigger: "YourTurn"` in `EX9-003.ts:13` | Real own-turn public digivolve intents in `EX9-003.test.ts:24-48`, `50-73`, `75-99`, and `101-141`. |
| `[Once Per Turn]` | `frequency: "OncePerTurn"` in `EX9-003.ts:45` | Two Ver.3 evolutions in one turn consume only the first reduction (`EX9-003.test.ts:101-141`); a full production opponent-turn boundary re-arms the reduction for the next own turn (`EX9-003.test.ts:143-194`). |
| Host has a face-down digivolution card | `sourceFilter.digivolutionCards: "hasFaceDown"` in `EX9-003.ts:21` | Face-down `BT1-009` succeeds (`EX9-003.test.ts:24-48`); no face-down source pays the full cost (`50-73`). |
| Destination has `[Ver.3]` trait | `into.nameOrTrait: [{ tokens: ["Ver.3"], match: "trait" }]` in `EX9-003.ts:23-31` | EX9-029 and EX9-030 succeed; non-Ver.3 EX9-026 is not reduced (`75-99`). |
| Reduce digivolution cost by 1 | Nested `Replacement` → `wouldDigivolve` → `reduceCost`, `amount: 1` in `EX9-003.ts:33-40` | 2-memory EX9-029 evolution leaves memory at 1 (`24-48`); second same-turn cost-3 evolution leaves memory at -2 (`101-141`). |
| Q4743 combined reduction | Same replacement remains active alongside EX9-070 Delay | Colocated Meat integration follows the public effect intent, places a face-down hand card, evolves to EX9-030, and leaves memory at 4 from 5 (`199-246`). The peer suite also passes its Q4743 and no-Tokomon comparison cases in `EX9-070.test.ts`. |

No optional refusal, security, inherited duration, or deletion clause is
printed on EX9-003, so those cases are not applicable. Fixtures keep Digi-Egg
cards out of deck/security and use inert `BT1-009` as the face-down source.

#### Turn-boundary proof

`EX9-003-OPT-RESET` drives a full production turn boundary. The first
digivolution uses EX9-029's normal cost and leaves memory at 2. After the
opponent turn, the next own turn explicitly selects EX9-030's alternate
Machine/DM cost of 3; Tokomon's reduction applies and leaves memory at 1.
The live continuous replacement is present after re-derivation and the
once-per-turn ledger is reset at `ownerTurnStart`. The earlier red result was a
fixture error: EX9-030 has both a normal Yellow Lv.4 cost of 4 and an alternate
cost of 3, so omitting `useAlternateCost: true` correctly paid 4 and produced
memory 0. No engine change is required.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-003.test.ts --maxWorkers=1 --no-file-parallelism` — 7 passed.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-003.test.ts src/cards/EX9/EX9-070.test.ts --maxWorkers=1 --no-file-parallelism` — 33 passed.
- `pnpm --filter @aegis/api exec vitest run src/engine/effects/subtriggers.test.ts src/engine/continuousRecomputeConcurrency.test.ts src/engine/effects/modifiers.test.ts --maxWorkers=1 --no-file-parallelism` — 66 passed.
- `pnpm exec oxlint apps/api/src/cards/EX9/EX9-003.ts apps/api/src/cards/EX9/EX9-003.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-003.ts apps/api/src/cards/EX9/EX9-003.test.ts` — passed.
- `git diff --check -- apps/api/src/cards/EX9/EX9-003.ts apps/api/src/cards/EX9/EX9-003.test.ts` — passed.
- `pnpm typecheck` — passed (shared, API, and web projects).

No Git writes were performed. No engine files were changed.

### EX9-004 — Tanemon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-004`, Tanemon), a Green level-2 DigiEgg with `[Bulb]/[DM]/[Ver.4]` traits.
- Printed inherited text: `[Your Turn] [Once Per Turn] When any of your [Ver.4] trait Digimon are played, by trashing this Digimon's bottom face-down digivolution card, gain 1 memory.`
- Local rules: `data/kb/rules/comprehensive.md` §§4-3-3 and 15-3-1–15-3-3 (inherited effects), §8-2 (digivolution-card placement/face state), §14-15-1 (once-per-turn limits), and §15-3-4/§15-3-5 (effect timing and play-trigger processing).
- Local KB: `node tools/kb/query.mjs card EX9-004` → **no knowledge-base entries**. No EX9-004 Q&A IDs are indexed.

#### Q&A ledger

No Q&A entries were returned for EX9-004 by the local KB query; there are no card-specific Q&A IDs to prove.

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Inherited effect | `EX9-004.ts:9-53`, `isInherited: true` | Structural assertion in `EX9-004.test.ts:8-43`; all behavioral fixtures use EX9-004 in a realistic evolution stack. |
| `[Your Turn]` | `trigger: "YourTurn"` at `EX9-004.ts:11` | Real seat-0 `playCard` intents resolve the watcher (tests `:45-67`, `:69-94`, `:96-128`, `:130-152`, `:154-176`, `:178-219`). |
| When any of your `[Ver.4]` Digimon are played | `SubTrigger`, `event: "whenPlayed"`, `sourceFilter.controller: "mine"`, `kind: ["Digimon"]`, trait match `["Ver.4"]` at `EX9-004.ts:14-25` | EX9-008 (Ver.4) activates the effect (`:45-67`); BT1-016 (non-Ver.4) does not (`:69-94`). |
| By trashing this Digimon's bottom face-down digivolution card | `GainMemory.cost.kind: "trash"` with `zone: "digivolutionCards"`, `faceDown: true`, `position: "bottom"`, and `hostFilter.isSelfRef` at `EX9-004.ts:30-44` | Single source is trashed (`:45-67`); with two hidden sources the lower eligible source is selected while the visible egg is preserved (`:96-128`); no hidden source leaves the stack and memory unchanged (`:130-152`). |
| Gain 1 memory | `GainMemory.amount: 1` at `EX9-004.ts:27-29` | Memory 5→3 after EX9-008's cost-3 play plus +1 (`:55`, `:65`); exact bottom-source test observes memory 4→2 (`:112`, `:126`). |
| `[Once Per Turn]` | `frequency: "OncePerTurn"` at `EX9-004.ts:51-52` | Two real Ver.4 plays in one turn trash only the first source (`:178-219`); a real next owner turn consumes the second source (`:221-266`). |
| Optional “by” cost path | `optional: true`, `abortOnDecline: true` at `EX9-004.ts:45-46` | Declining preserves the hidden source and gives no memory (`:154-176`). |

#### Peer / stack proof

- The positive route uses a legal `EX9-004` → `EX9-035` stack and real `playCard` intents, not injected timing.
- Mixed controls include a Ver.4 EX9-008 and non-Ver.4 BT1-016, proving the exact trait boundary.
- The multi-source stack proves the bottom-face-down selector skips the visible egg and preserves the next hidden card.
- Same-turn and next-owner-turn tests prove the watcher ledger and reset against real play events.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-004` | PASS — explicit no-entry result. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-004.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 8 tests. |
| `pnpm typecheck` | **FAIL outside this lane** — pre-existing concurrent `EX9-005.test.ts` errors at lines 34, 37, and 40 (`card` possibly undefined). Shared/web passed; API typecheck was blocked by EX9-005. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-004.ts apps/api/src/cards/EX9/EX9-004.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-004.ts apps/api/src/cards/EX9/EX9-004.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-004.ts apps/api/src/cards/EX9/EX9-004.test.ts` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger' apps/api/src/cards/EX9/EX9-004.test.ts` | PASS — no injected timing helper. |

#### Defects and gaps

No card-specific implementation defect or engine seam found. The module already uses exclusive `registerIrCard("EX9-004", compiled)` registration. The only failed gate is the repository-wide API typecheck, blocked by unrelated concurrent edits in EX9-005; no edits were made to that file.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-005 — Negamon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final card score is **8/10 pending set gates**.

The committed IR is faithful. This lane changed only the colocated test proof and this report; no engine seam was required.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-005` (`Negamon`), black Digi-Egg, Lv.2, In-Training, Unknown trait.
- Printed effects:
  - `[Breeding] [Main] [Once Per Turn] You may play 1 Digimon card with [Negamon] in its text from your hand with the play cost reduced by 2. For each [Negamon] in your trash or your Digimon's digivolution cards, further reduce it by 1. Then, place this Digimon as the played Digimon's bottom digivolution card.`
  - `[Breeding] [All Turns] This Digimon can't digivolve and effects can't delete or trash it.`
  - Inherited: `[Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, you may change the attack target to 1 of your Digimon with [Negamon] in its text.`
- Local KB query: `node tools/kb/query.mjs card EX9-005`.
- Comprehensive rules used: `comprehensive-0061` (Breeding Area effects only trigger/activate there), `comprehensive-0062` (Breeding Area information restrictions), `comprehensive-0069`/`0077` (Digimon and digivolution-card identity), `comprehensive-0108` (Main actions require no unresolved processing), `comprehensive-0143`/`0144` (attack timing/declaration), `comprehensive-0160` (inherited effects), `comprehensive-0170` (optional processing), and `comprehensive-0173` (trigger effects).

Q&A ids returned by the local KB:

- `Q4744`: one Negamon in trash plus one Negamon in a Digimon's digivolution cards contributes two additional reductions.
- `Q4745`: the Breeding/All Turns clause means the card cannot digivolve and effects cannot delete or trash it while in Breeding.
- `Q4746`: “with [Negamon] in its text” includes the specified text/icon in a card's name, traits, effects, inherited effects, requirements, Link, etc.; the implementation uses `match: "text"` for the play/redirect target and exact name matching for reduction sources.
- `Q4747`: Breeding effects can trigger/activate only while the card is in the Breeding Area.

#### Clause → IR → proof

| Printed clause | IR mapping | Observable proof |
|---|---|---|
| Breeding Main Once Per Turn | `trigger: "Main"`, `isBreeding: true`, `frequency: "OncePerTurn"` | Public `activateEffect` intent through a real ready Main window (`EX9-005.test.ts:133-152`, plus refusal at `:154-167`). |
| Play one Digimon with `[Negamon]` in its text from hand | `PlayWithoutCost`, `from: ["hand"]`, `kind: ["Digimon"]`, `nameOrTrait: [{tokens:["Negamon"], match:"text"}]`, `count: 1` | EX9-046 Soundbirdmon is played and EX9-005 is placed under it (`:133-152`); BT1-009, which has no Negamon text, is not played (`:240-260`). |
| Cost reduced by 2, plus 1 per Negamon in trash or digivolution cards | `reduceCostBy: 2`; `reduceCostByScaling.per: 1`, zones `trash/digivolutionCards`, controller `mine`, exact name `Negamon` | Base reduction and separate trash/stack counts (`:169-220`); Q4744 combined trash+stack count pays 4 less from cost 7 (`:169-187`). A card merely containing Negamon in its text does not count as an exact Negamon source (`:223-238`). |
| Then place this Digimon under the played Digimon | `PlaceUnder` self target, `underFilter: {lastPlayed:true}` | Positive play assertion verifies EX9-005 is in EX9-046's stack (`:133-152`). |
| Optional “may” | `optional: true` | Auto-decline leaves Breeding, hand, battle area, memory, and pending state unchanged (`:154-167`). |
| Breeding/All Turns cannot digivolve/delete/trash | `trigger: "AllTurns"`, `isBreeding: true`, three permanent `Restrict` actions for `digivolve`, `beDeleted`, `beTrashed` | Observable restrictions are asserted on the real Breeding permanent (`:73-80`). The effect is not exposed after moving the card to the battle area (`:82-88`). |
| Inherited Opponent's Turn Once Per Turn redirect | `trigger: "OpponentsTurn"`, `isInherited: true`, `frequency: "OncePerTurn"`, `SubTrigger whenOpponentAttacks` → optional `RedirectAttack`, own Digimon with `match:"text"` | Two real opponent attacks: first redirects to the inherited host while a nonmatching own Digimon remains untouched; second attack is not redirected and removes one security card (`:90-131`). |

The module has one registration only: `registerIrCard("EX9-005", compiled)` at `EX9-005.ts:139`. No legacy `registerCard` registration exists.

#### Behavioral and stack proof

- Positive Breeding route uses a real public `activateEffect` intent and places the Digi-Egg under the played Digimon.
- Optional refusal, exact source/destination zones, cost payment, scaling boundaries, and no-match hand candidate are covered.
- Q4744 is proved with one EX9-005 in trash and one EX9-005 under another Digimon.
- Q4745/Q4747 are proved through Breeding-area restrictions, Breeding-only activation, and battle-area negative control.
- Q4746 is covered by both a matching-text destination (EX9-046/EX9-047) and a nonmatching BT1-009 destination, while reduction sources require exact Negamon name.
- Inherited redirect uses EX9-047 with EX9-005 underneath, plus a nonmatching BT1-012 own Digimon and two opponent attackers. All security fixtures are inert main-deck BT1-012 Digimon; no Digi-Egg is placed in security or deck.
- No `advance.fire`, `fireTiming`, or `fireSubTrigger` seam is used in this card test.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-005.test.ts --maxWorkers=1 --no-file-parallelism
PASS — 1 file, 13 tests

pnpm typecheck
PASS — shared build, shared/API/web typechecks.

pnpm exec oxlint apps/api/src/cards/EX9/EX9-005.ts apps/api/src/cards/EX9/EX9-005.test.ts
PASS

pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-005.ts apps/api/src/cards/EX9/EX9-005.test.ts
PASS

git diff --check
PASS

Fixture/probe sweeps:
PASS — no Digi-Egg in deck/security; no advance.fire/fireTiming/fireSubTrigger usage.
```

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-005.ts`: unchanged; full IR and exclusive registration were already correct.
- `apps/api/src/cards/EX9/EX9-005.test.ts`: converted all four Main tests from timing injection to public intents; added catalog/IR, optional refusal, Breeding-only negative, mixed target, and no-match proofs.
- `docs/audits/EX9-reaudit/EX9-005.md`: this report.
- No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane.

No unresolved EX9-005 behavior or typecheck errors remain.

### EX9-006 — Pagumon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. This lane strengthened the colocated proof with Q4749 timing evidence and a real next-owner-turn Once Per Turn reset.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-006` (Pagumon), purple level-2 Digi-Egg, In-Training, traits `Lesser/DM/Ver.5`.
- Printed inherited text: `[When Attacking] [Once Per Turn] By trashing this Digimon's bottom face-down digivolution card, this Digimon may digivolve into a [Ver.5] trait Digimon card in the trash with the digivolution cost reduced by 1.`
- Local KB query: `node tools/kb/query.mjs card EX9-006`.
- Q&A ids returned by the local KB: `Q4748`, `Q4749`.
- Comprehensive rules used: `comprehensive-0069` and `comprehensive-0160` (inherited effects); `comprehensive-0076`/`0077` (face-down and digivolution cards); `comprehensive-0143`/`0144` and `comprehensive-0173` (attack and trigger timing); `comprehensive-0125`/`0126` (digivolution procedure); `comprehensive-0165` (pending activation); `comprehensive-0170` (optional processing); `comprehensive-0176` (Main activation restriction). `glossary-0007` defines Once Per Turn.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4748 | Verified. The card trashed by the inherited cost remains selectable from trash for the same effect's digivolution. | `EX9-006.test.ts:170-196`, focused suite 9/9. |
| Q4749 | Verified. EX9-070 Meat's `[Main] <Delay>` cannot be declared while the inherited attack evolution is still unresolved. | `EX9-006.test.ts:198-255` directly attempts Meat activation while the optional evolution decision is pending; `EX9-070.test.ts` also covers the cross-card route. |

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Inherited effect | `EX9-006.ts:55-56`, `isInherited: true` | Every positive route uses EX9-006 under a battle-area Digimon; realistic stack and reset tests are in `EX9-006.test.ts:69-168`, `257-311`, and `313-358`. |
| `[When Attacking]` | `trigger: "WhenAttacking"` at `EX9-006.ts:11` | Public attack intents resolve the effect without injected timing (`:12-32`, `:69-96`, `:149-168`, `:182-196`). |
| `[Once Per Turn]` | `frequency: "OncePerTurn"` at `EX9-006.ts:56` | Same-turn second attack leaves stack/instance ids unchanged (`:313-358`); a real owner turn resets the effect and permits the next legal evolution (`:257-311`). |
| By trashing this Digimon's bottom face-down digivolution card | `cost.kind: "trash"`; `zone: "digivolutionCards"`, `faceDown: true`, `position: "bottom"`, `sameHost: true`, self host filter at `EX9-006.ts:37-52` | Positive payment trashes the bottom hidden source (`:69-96`, `:133-168`); the multi-source boundary proves the first hidden card above the visible egg is selected (`:133-168`). |
| `may` digivolve | `optional: true`, `abortOnDecline: true` at `EX9-006.ts:36`, `:52` | Auto-decline preserves the source and trash candidate while the attack completes (`:98-131`). |
| Into a `[Ver.5]` trait Digimon card in the trash | `into.kind: ["Digimon"]`, exact trait matcher `{ tokens: ["Ver.5"], match: "trait" }`, `zone: "trash"`, `from: ["trash"]` at `EX9-006.ts:22-33` | EX9-010 is selected from trash; ineligible candidates do not evolve (`:12-67`); the Q4748 route selects the card just moved to trash (`:170-196`). |
| Digivolution cost reduced by 1 and paid | `payCost: true`, `reduceCost: 1` at `EX9-006.ts:34-35` | Memory and final zones prove payment on EX9-010 (`:69-96`, `:149-168`), Q4749 (`:198-255`), and the two-turn BT22-060 → EX9-073 chain (`:257-311`). |

The module registers only `registerIrCard("EX9-006", compiled)` at `EX9-006.ts:63`; there is no legacy duplicate registration. The card has no Security effect or duration clause.

#### Behavioral and peer/stack proof

- Positive public route: EX9-007 carrying hidden BT1-009 and EX9-006 attacks and evolves into EX9-010 from trash while paying the reduced cost (`:69-96`).
- Negative boundary: an ineligible Ver.5 route is unavailable; the hidden source may be paid but the host remains EX9-007 and the candidate stays in trash (`:12-67`).
- Optional refusal: decline leaves the face-down source, candidate, memory, and host unchanged (`:98-131`).
- Hidden-information/stack boundary: a mixed stack with two face-down sources confirms only the bottom eligible hidden card is trashed (`:133-168`).
- Q4748 confirms the cost card can immediately be selected from trash (`:170-196`).
- Q4749 uses EX9-008 → EX9-010 with EX9-070 Meat and an unresolved optional decision; Meat activation is rejected until the inherited effect resolves (`:198-255`).
- Real turn reset and legal evolution chain: EX9-051 → BT22-060 on turn one, then EX9-073 on the next owner turn, consuming separate hidden sources and proving reset/payment (`:257-311`).
- Same-turn Once Per Turn control uses two attacks, a real effect-driven unsuspend, and stack instance identity; no second evolution occurs (`:313-358`).
- Fixtures contain no Digi-Egg in deck or security: security/deck fillers are main-deck Digimon (`BT1-049`, `BT1-012`, `BT1-013`, and `BT1-014`), with DP overrides only where needed to keep the attacking host alive through a neutral security battle. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper is used.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-006.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 9 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-070.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 26 tests** (Q4749 peer regression) |
| `pnpm typecheck` | **BLOCKED by unrelated concurrent change**: `apps/api/src/cards/EX9/EX9-005.test.ts:34,37,40` (`card` possibly undefined). Shared and web typechecks passed; no EX9-006 error was reported. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-006.ts apps/api/src/cards/EX9/EX9-006.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-006.ts apps/api/src/cards/EX9/EX9-006.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-006.ts apps/api/src/cards/EX9/EX9-006.test.ts docs/audits/EX9-reaudit/EX9-006.md` | **PASS** |
| `rg -n 'BT1-00[1-8]' apps/api/src/cards/EX9/EX9-006.test.ts` | **PASS — no Digi-Egg ids in the EX9-006 test fixtures** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger' apps/api/src/cards/EX9/EX9-006.test.ts` | **PASS — no matches** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-006.ts`: unchanged; existing IR is faithful and registers exclusively through `registerIrCard`.
- `apps/api/src/cards/EX9/EX9-006.test.ts`: added colocated Q4749 pending-processing proof and next-owner-turn reset/stack chain.
- `docs/audits/EX9-reaudit/EX9-006.md`: this report.
- No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Concurrent worktree changes are outside this card's scope.

No unresolved EX9-006 engine seam remains. The only blocked check is the repository-wide typecheck, with unrelated errors named above.

### EX9-007 — Agumon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-007`, Agumon), a Red level-3 Digimon with `[Reptile]/[DM]/[Ver.1]` traits, play cost 3, and 1,000 DP.
- Printed play text: `[Digivolve] Lv.2 w/[DM] trait: Cost 0. [On Play] Reveal the top 3 cards of your deck. Among them, add 1 card with the [DM] trait to the hand and place 1 card with the [Ver.1] trait face down as the bottom digivolution card of any of your Digimon with the [DM] trait. Return the rest to the bottom of the deck.`
- Printed inherited text: `[Your Turn] This Digimon gets +2000 DP.`
- Local rules: `data/kb/rules/comprehensive.md` §§7–8 (playing/digivolution and digivolution-card placement), §§14-3/15-3 (inherited effects), and §14-17 (turn-relative effects).
- Local KB: `node tools/kb/query.mjs card EX9-007` → Q4750.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4750 | Verified. When the only revealed DM card is also Ver.1, it is added to hand first; it is not reused for the placement slot. | `EX9-007.test.ts:67-91`, with a real play from hand and deck `[EX9-009, BT1-010, BT1-011]`; target stack remains empty and EX9-009 is in hand. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Alternate `[Digivolve] Lv.2 w/[DM] trait: Cost 0` | `EX9-007.ts:80-87`, `digivolutionRequirement: [{ level: 2, traits: ["DM"], cost: 0, isAlternate: true }]` | Real EX9-003 (level 2 DM) → EX9-007 evolution at `EX9-007.test.ts:176-200`, with memory unchanged. |
| `[On Play] Reveal the top 3` | `EX9-007.ts:11-16`, `kind: "RevealAdd"`, `revealCount: 3` | Real hand play resolves all three-card fixtures at tests `:36-65`, `:67-91`, `:93-118`, and `:120-144`. |
| Add 1 `[DM]` card to hand | `EX9-007.ts:17-29`, trait filter `DM`, `count: 1`, `to: "hand"` | BT22-049 is added in `:36-65`; the sole DM/Ver.1 EX9-009 is added in Q4750 proof `:67-91`; non-DM-only reveal has no hand candidate in `:120-144`. |
| Place 1 `[Ver.1]` card face-down | `EX9-007.ts:30-42`, trait filter `Ver.1`, `to: "placeUnder"`, `faceDown: true`, `count: 1` | EX9-009 is placed face-down in `:36-65`; Q4750 prevents reuse when it is the sole DM/Ver.1 card (`:67-91`); no Ver.1 reveal leaves target stack empty (`:93-118`). |
| Under any of your `[DM]` Digimon | `EX9-007.ts:43-52`, `underFilter.controllerDefault: "mine"`, `kind: ["Digimon"]`, trait `DM` | The independent EX9-050 DM target receives EX9-009 in `:36-65`; no target placement occurs in the negative controls. |
| Return remaining revealed cards to deck bottom | `EX9-007.ts:54-55`, `rest: "deckBottom"` | Exact remaining deck order is asserted in `:61`, `:88`, `:115`, and `:141`. |
| Inherited `[Your Turn] +2000 DP` | `EX9-007.ts:59-76`, inherited `YourTurn` `ModifyDP amount: 2000` | Legal EX9-007 → BT1-015 stack observes 6,000 DP on owner turn and 4,000 DP after switching to opponent turn (`:146-174`). |

#### Peer / stack proof

- The On Play proof uses an EX9-007 played from hand while a separate EX9-050 DM Digimon is available as the placement target.
- Mixed revealed fixtures distinguish DM from non-DM and Ver.1 from non-Ver.1, including the Q4750 overlap case.
- The evolution proof uses both a legal EX9-007 → BT1-015 stack and the alternate EX9-003 → EX9-007 level-2 DM route.
- No Digi-Egg is placed in deck or security; all deck fixtures are inert main-deck cards.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-007` | PASS — Q4750 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-007.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 8 tests. |
| `pnpm typecheck` | **FAIL outside this lane** — concurrent EX9-005 errors at lines 34, 37, 40 (`card` possibly undefined), plus concurrent engine errors in `apps/api/src/engine/effects/subtriggers.ts:632` (`amount` missing on `ReplacementSubscription`). Shared and web typechecks passed. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-007.ts apps/api/src/cards/EX9/EX9-007.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-007.ts apps/api/src/cards/EX9/EX9-007.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-007.ts apps/api/src/cards/EX9/EX9-007.test.ts` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger' apps/api/src/cards/EX9/EX9-007.test.ts` | PASS — no injected timing helper. |

#### Defects and gaps

No EX9-007-specific implementation defect or engine seam found. The module already registers exclusively with `registerIrCard("EX9-007", compiled)`. Repository-wide typecheck remains blocked by unrelated concurrent EX9-005 and engine edits; those files were not changed in this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-008 — Biyomon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-008`, Biyomon), a Red level-3 Digimon with `[Bird]/[DM]/[Ver.4]` traits, play cost 3, and 1,000 DP.
- Printed evolution text: `[Digivolve] Lv.2 w/[DM] trait: Cost 0.`
- Printed effect: `＜Training＞.`
- Printed inherited effect: `＜Raid＞.`
- Local rules: `data/kb/rules/comprehensive.md` §§7–8 (playing/digivolution and digivolution-card placement), §§14-3/15-3 (inherited effects), and Raid/Training keyword sections.
- Local KB: `node tools/kb/query.mjs card EX9-008` → Q4751.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4751 | Verified. Raid triggers when the Digimon attacks; if EX9-001's inherited effect evolves the attacker during that attack, EX9-008 did not have Raid at attack declaration and its newly inherited Raid cannot redirect the attack. | `EX9-008.test.ts:135-165`, real attack with EX9-008 under EX9-001, a face-down BT1-009 evolution card, EX9-009 in hand, and an opponent redirect candidate. The attacker evolves to EX9-009 while the opponent Digimon remains in play and security is checked. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Alternate `[Digivolve] Lv.2 w/[DM] trait: Cost 0` | `EX9-008.ts:34-41`, `digivolutionRequirement: [{ level: 2, traits: ["DM"], cost: 0, isAlternate: true }]` | Real EX9-003 (level 2 DM) → EX9-008 evolution at `EX9-008.test.ts:110-133`, with memory unchanged. |
| `＜Training＞` | `EX9-008.ts:9-19`, static keyword `Training` | Real activation from an EX9-008 stack at `EX9-008.test.ts:59-88` suspends the Digimon and moves the face-down deck top to the bottom of its digivolution stack; the negative controls at `:90-108` suppress activation while suspended or with an empty deck. |
| Inherited `＜Raid＞` | `EX9-008.ts:20-30`, inherited static keyword `Raid` | Real attack redirection is exercised at `EX9-008.test.ts:20-57` with both accepting and declining the opponent Digimon redirect decision; resulting battle/security state is asserted. |
| Raid timing boundary from Q4751 | `EX9-008.ts:20-30` is inherited-only; no attack-trigger effect is created by EX9-008 itself | Real attack/evolution sequence at `EX9-008.test.ts:135-165` proves Raid newly gained during EX9-001's inherited evolution does not activate retroactively. |

#### Peer / stack proof

- The Training proof uses EX9-008 under EX9-001, so the card is tested as the top card of a digivolution stack rather than only as a bare fixture.
- Raid is tested with both redirect acceptance and decline, including an opponent Digimon and security target to distinguish redirect from normal attack resolution.
- The evolution proof covers the alternate level-2 `[DM]` route and checks stack order, memory, and pending decisions.
- The Q4751 sequence includes a pre-existing face-down digivolution card and a real hand evolution destination, with no injected timing or subtrigger helper.
- All deck and security fixtures are legal main-deck Digimon (BT1-009 Monodramon); no Digi-Egg card is used outside a breeding-area fixture.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-008` | PASS — Q4751 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-008.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 7 tests. |
| `pnpm typecheck` | **FAIL outside this lane** — shared and web typechecks passed; API typecheck reports only concurrent EX9-005 test errors at lines 34, 37, and 40 (`card` possibly undefined). |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-008.ts apps/api/src/cards/EX9/EX9-008.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-008.ts apps/api/src/cards/EX9/EX9-008.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-008.ts apps/api/src/cards/EX9/EX9-008.test.ts` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger' apps/api/src/cards/EX9/EX9-008.test.ts` | PASS — no injected timing helper. |

#### Defects and gaps

No EX9-008-specific implementation defect or engine seam found. The module registers exclusively with `registerIrCard("EX9-008", compiled)`. Repository-wide typecheck remains blocked by unrelated concurrent EX9-005 test edits; that file was not changed in this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-009 — Greymon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. This lane strengthened the colocated behavioral proof for optional refusal, same-turn Once Per Turn, duration expiry, and next-turn reset.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-009` (Greymon), red level-4 Digimon, 5 play cost, 5000 DP, `Dinosaur/DM/Ver.1` traits.
- Evolution requirement: level 3 with `[DM]` trait, cost 2.
- Printed text: `＜Training＞ [When Attacking] [Once Per Turn] By placing your deck's top card face down as this Digimon's bottom digivolution card, this Digimon gets +1000 DP for each of its face-down digivolution cards until your opponent's turn ends.`
- Printed inherited text: `[Your Turn] This Digimon gets +2000 DP.`
- Local KB query: `node tools/kb/query.mjs card EX9-009` → **no knowledge-base entries** and therefore no Q&A ids.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects); `comprehensive-0076`/`0077` (face-down and digivolution cards); `comprehensive-0143`/`0144` and `0173` (attack and trigger timing); `comprehensive-0125`/`0126` (digivolution procedure); `comprehensive-0165` (pending activation); `comprehensive-0170` (optional processing); `glossary-0007` (Once Per Turn). `comprehensive-0108`/`0176` establish that Main activation requires no unresolved processing, relevant to the neighboring Training mechanism.

#### Q&A ledger

No EX9-009 Q&A entries were returned by the committed local knowledge base.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| `＜Training＞` | Static keyword `{ keyword: "Training" }` at `EX9-009.ts:10-19` | Structural assertion in `EX9-009.test.ts:8-26`; attack fixtures use the same public effect path as the Training mechanic. |
| `[When Attacking]` | `trigger: "WhenAttacking"` at `EX9-009.ts:20-22` | Public attack intents resolve the effect in positive, empty-deck, refusal, same-turn, and reset tests (`:34-218`) with no injected timing helper. |
| `[Once Per Turn]` | `frequency: "OncePerTurn"` at `EX9-009.ts:61-63` | A second same-turn attack does not place a second card or add another boost (`EX9-009.test.ts:184-218`); the real owner turn reset permits the effect again (`:132-182`). |
| By placing your deck's top card face down as this Digimon's bottom digivolution card | `cost.kind: "place"`, `from: ["deck"]`, destination `digivolutionStack`, `position: "bottom"`, `host: "self"`, `faceDown: true` at `EX9-009.ts:43-57` | Positive route empties the one-card deck and asserts a new face-down bottom source (`:34-74`); reset route checks two face-down cards after two different turns (`:132-182`). |
| This Digimon gets +1000 DP for each face-down digivolution card | `ModifyDP amount: 1000`, `scaling.unit: "targetFaceDownDigivolutionCards"`, `per: 1`, face-down controller filter at `EX9-009.ts:24-42` | Two existing face-down cards plus the placed card produce +3000 (`:34-74`); the reset route proves +1000 then +2000 as the stack grows (`:132-182`). |
| `until your opponent's turn ends` | `duration: "untilOpponentTurnEnd"` at `EX9-009.ts:33-35` | After a real opponent turn, the first +1000 boost expires back to base DP; the next own turn can place again (`:160-177`). |
| optional “may” processing | `optional: true`, `abortOnDecline: true` at `EX9-009.ts:58-59` | Explicit refusal leaves the deck top, stack, DP, and pending state unchanged (`EX9-009.test.ts:103-130`). |
| Inherited `[Your Turn]` +2000 DP | `trigger: "YourTurn"`, `isInherited: true`, `ModifyDP amount: 2000`, permanent duration at `EX9-009.ts:64-81` | A real EX9-009 → ST1-09 evolution carries the inherited effect: 9000 DP on the owner's turn and 7000 on the opponent's turn (`:220-241`). |

The module registers only `registerIrCard("EX9-009", compiled)` at `EX9-009.ts:95`; there is no legacy duplicate registration. No Security effect is printed.

#### Behavioral and peer/stack proof

- Positive route uses a realistic EX9-009 stack with two existing face-down main-deck Digimon, a one-card deck, and a suspended opposing Digimon; it places the deck top face down and observes the exact +3000 scaling (`:34-74`).
- Empty-deck boundary proves no payment, placement, decision, or DP change (`:76-101`).
- Optional refusal proves no source placement or DP change (`:103-130`).
- Same-turn Once Per Turn proof uses two public attacks and effect-driven unsuspend; stack identity/size and DP show only one placement (`:184-218`).
- Real turn-loop proof shows the temporary boost expires at the opponent's turn end, then resets on the next owner turn and scales to two face-down cards (`:132-182`).
- Inherited stack proof legally evolves EX9-009 into ST1-09 and checks the +2000 inherited DP only during its controller's turn (`:220-241`).
- Peer mechanism: EX9-010 independently covers Training's face-down placement plus shared Once Per Turn behavior across digivolving/attacking. Its six relevant tests passed; the current suite also contains one unrelated concurrent Q4752 failure in `EX9-010.test.ts`.
- Fixtures use main-deck Digimon only in deck/security zones; no Digi-Egg is used. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper is used.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-009.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 8 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-010.test.ts --maxWorkers=1 --no-file-parallelism` | **6 tests passed; 1 unrelated concurrent failure** in `EX9-010.test.ts` Q4752 (`settle` never reaches expected EX9-009), with debug output showing the EX9-010 peer flow; EX9-009 focused tests remain green. |
| `pnpm typecheck` / API `tsc --noEmit` | **PASS** — shared, web, and API typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-009.ts apps/api/src/cards/EX9/EX9-009.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-009.ts apps/api/src/cards/EX9/EX9-009.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-009.ts apps/api/src/cards/EX9/EX9-009.test.ts docs/audits/EX9-reaudit/EX9-009.md` | **PASS** |
| `rg -n 'BT1-00[1-8]' apps/api/src/cards/EX9/EX9-009.test.ts` | **PASS — no Digi-Egg ids** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger' apps/api/src/cards/EX9/EX9-009.test.ts` | **PASS — no matches** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-009.ts`: unchanged; existing IR is faithful and registers exclusively through `registerIrCard`.
- `apps/api/src/cards/EX9/EX9-009.test.ts`: added realistic face-down Digimon fixtures, optional refusal, same-turn limit, duration expiry, and next-turn reset proof.
- `docs/audits/EX9-reaudit/EX9-009.md`: this report.
- No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Concurrent worktree changes are outside this card's scope.

No unresolved EX9-009 engine seam or Q&A gap remains.

### EX9-010 — Tuskmon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-010`, Tuskmon), a Red level-4 Digimon with `[Dinosaur]/[DM]/[Ver.5]` traits, play cost 4, and 4,000 DP.
- Printed evolution text: `[Digivolve] Lv.3 w/[DM] trait: Cost 2.`
- Printed effects: `＜Training＞`; `[When Digivolving] [When Attacking] [Once Per Turn] By placing 1 card in your hand face down as this Digimon's bottom digivolution card, delete 1 of your opponent's Digimon with 4000 DP or less.`
- Printed inherited effect: `＜Raid＞.`
- Local rules: `data/kb/rules/comprehensive.md` §§7–8 (playing/digivolution and digivolution-card placement), §§14-3/15-3 (inherited effects), and the Training/Raid keyword sections.
- Local KB: `node tools/kb/query.mjs card EX9-010` → Q4752.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4752 | Verified. Raid triggers when the Digimon attacks; if EX9-001's inherited effect evolves the attacker during that attack, EX9-010 did not have Raid at attack declaration and its newly inherited Raid cannot redirect the attack. | `EX9-010.test.ts:229-261`, real EX9-010 attack with EX9-001 and a face-down card in the stack, hand EX9-011 as a legal Ver.1 destination, and a 10,000-DP opposing Digimon. EX9-011 remains attacking the player and security is checked; the opposing Digimon remains in play. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Alternate `[Digivolve] Lv.3 w/[DM] trait: Cost 2` | `EX9-010.ts:110-117`, `digivolutionRequirement: [{ level: 3, traits: ["DM"], cost: 2, isAlternate: true }]` | Real EX9-007 (level 3 DM) → EX9-010 evolution at `EX9-010.test.ts:62-92`; memory and the resulting stack are resolved by the real digivolve intent. |
| `＜Training＞` | `EX9-010.ts:9-19`, static keyword `Training` | Real effect activation at `EX9-010.test.ts:33-60` suspends EX9-010 and places the legal main-deck top card face-down at the bottom of its digivolution stack. |
| `[When Digivolving] ... place 1 card in your hand face down ... delete ... 4000 DP or less` | `EX9-010.ts:20-57`, `WhenDigivolving`, `Delete`, opponent Digimon `dp: lte 4000`, hand placement cost, `faceDown: true`, `frequency: OncePerTurn` | Real EX9-007 → EX9-010 evolution at `EX9-010.test.ts:62-92` places BT1-009 face-down, deletes the 4,000-DP target, and leaves the 4,001-DP target. |
| `[When Attacking] ... place 1 card in your hand face down ... delete ... 4000 DP or less` | `EX9-010.ts:58-95`, `WhenAttacking`, same cost/filter and shared `sharedUseKey: "ir-shared-0"` | Real attack at `EX9-010.test.ts:94-117` places BT1-009 face-down and deletes the suspended 3,000-DP opponent Digimon. |
| `[Once Per Turn]` shared across both trigger clauses | `EX9-010.ts:55-56` and `:92-94`, both `frequency: "OncePerTurn"`, `sharedUseKey: "ir-shared-0"` | Real digivolve-then-attack sequence at `EX9-010.test.ts:119-173` deletes only on digivolving; the attack opens no second decision and leaves the second opponent Digimon. |
| Inherited `＜Raid＞` | `EX9-010.ts:96-106`, inherited static keyword `Raid` | Real EX9-007 → EX9-010 → ST1-09 stack and attack at `EX9-010.test.ts:175-227` redirects to the strongest opponent Digimon, producing the expected combat result. Q4752's attack/evolution sequence at `:229-261` proves Raid is not gained retroactively. |

#### Peer / stack proof

- Training is activated on EX9-010 already under EX9-001, proving the static keyword on a stack rather than only structurally.
- Both deletion clauses use real game intents: one from an alternate evolution and one from an attack, with exact 4,000-DP inclusion and 4,001-DP exclusion in the evolution fixture.
- The shared once-per-turn proof performs the real evolution first, then a second attack in the same turn and checks that no second delete decision occurs.
- Raid is tested through a legal EX9-007 → EX9-010 → ST1-09 stack and against two opponent DP values; Q4752 separately tests the inherited timing boundary.
- All deck, hand, battle-area, and security fixtures are legal main-deck Digimon or explicitly constructed stack cards; no Digi-Egg is used as a deck/security fixture.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-010` | PASS — Q4752 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-010.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 8 tests. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-010.ts apps/api/src/cards/EX9/EX9-010.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-010.ts apps/api/src/cards/EX9/EX9-010.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-010.ts apps/api/src/cards/EX9/EX9-010.test.ts docs/audits/EX9-reaudit/EX9-010.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger' apps/api/src/cards/EX9/EX9-010.test.ts` | PASS — no injected timing helper. |

#### Defects and gaps

No EX9-010-specific implementation defect or engine seam found. The module registers exclusively with `registerIrCard("EX9-010", compiled)` and has `coverage: "full"` with an empty residual list.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-011 — MetalGreymon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2
behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. The
card score is therefore **8/10 pending set gates**. The committed module was
already faithful; this lane corrected the colocated tests to use only public
play/evolution intents and added the report.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-011`
  (`MetalGreymon`), red/black Digimon, Lv.5, play cost 7, with alternate
  Lv.4 `[Greymon]`/`[DM]` evolution cost 3.
- Local Q&A query: `node tools/kb/query.mjs card EX9-011` returned `Q4753`:
  when played without paying its cost, the controller may still trash the
  qualifying hand card for the reduction; the card remains a free play.
- Comprehensive rules used: §7-1-2-3 (would-be-play replacement effects),
  §15-10-2 (up-to/total-DP target processing), and the linked timing,
  digivolution-stack, inherited-effect, and Security Attack rule entries.

Printed clauses:

- When this card would be played, optionally trash one `[Cyborg]` or `[Ver.1]`
  trait card from hand to reduce its play cost by 2.
- On Play and When Digivolving: optionally place one Digimon from trash face
  down as this Digimon's bottom digivolution card, then delete opponent's
  Digimon up to 5000 total DP, plus 2000 for each face-down card in this
  Digimon's digivolution cards.
- Inherited: Security Attack +1.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Lv.4 `[Greymon]` or `[DM]` alternate evolution for 3 | `digivolutionRequirement` entries with exact `names: ["Greymon"]` and `traits: ["DM"]`, `level: 4`, `cost: 3`, `isAlternate: true` (`EX9-011.ts:153-166`) | Public evolution intents prove normal BT2-058 cost 4, alternate EX9-029 cost 3, and nonmatching BT1-051 rejection (`EX9-011.test.ts:26-60`). |
| Would-play reduction by 2, paying with one hand `[Cyborg]`/`[Ver.1]` | Static self `Replacement` for `wouldBePlayed`, nested optional `reduceCost`, amount 2, hand/controller/trait filter, abort on decline (`EX9-011.ts:11-47`) | Effect-driven free play with BT1-021 spends no memory while trashing the payment under the played card, covering Q4753 (`EX9-011.test.ts:8-24`). Public paid plays with BT1-021 and EX9-007 each reduce cost and preserve the unrelated hand card (`:62-93`). |
| On Play deletion and trash-to-bottom cost | `OnPlay` optional `Delete`, opponent Digimon, `upTo`, total DP cap 5000, plus `place` one own-trash Digimon face down at self stack bottom (`EX9-011.ts:50-93`) | Two real paid plays delete exactly 7000 DP from 8000/4000/3000 targets and place the selected trash card face down (`EX9-011.test.ts:62-93`). |
| When Digivolving deletion and trash-to-bottom cost | Matching `WhenDigivolving` optional `Delete` action with the same target, cost, and scaling (`EX9-011.ts:94-137`) | A legal public alternate evolution resolves the body, places the trash card face down, and deletes the opponent's Digimon (`EX9-011.test.ts:116-149`). |
| +2000 per face-down digivolution card | `totalDpCapScaling` unit `selfFaceDownDigivolutionCards`, amount 2000, face-down filter on both body actions (`EX9-011.ts:83-90`, `:127-134`) | Real evolution with two face-up existing stack cards and one newly placed face-down card gives a 7000 cap; an 8000-DP target survives (`EX9-011.test.ts:187-228`). Face-up cards do not inflate the limit. |
| Optional “may” body effects | `optional: true`, `abortOnDecline: true` on both delete actions | Declining both reducer and On Play body leaves payment candidates and opponent board intact, with two optional decisions and no pending state (`EX9-011.test.ts:95-114`). |
| Inherited Security Attack +1 | Inherited Static keyword `SecurityAttack`, amount 1 (`EX9-011.ts:139-149`) | After real evolution into a legal level-6 host, an attack produces two real security checks (`EX9-011.test.ts:116-171`). |

The module has one registration only: `registerIrCard("EX9-011", compiled)`
(`EX9-011.ts:169`). No legacy `registerCard` registration exists.

#### Behavioral and fixture proof

- Q4753 is covered through the effect-driven free-play route, not by manually
  firing a timing hook.
- All card movement, payment, deletion, alternate evolution, inherited
  Security Attack, optional refusal, and face-down scaling assertions resolve
  through public engine intents and `settle()`.
- Security fixtures are inert main-deck Digimon BT1-045 and BT1-046; no
  Digi-Egg is used in deck or security fixtures.
- No `advance.fire`, `fireTiming`, or `fireSubTrigger` usage remains in this
  test. The only `advance` call is the supported effect-driven
  `verb.playInstances` route for Q4753.
- No implementation or engine seam was required; `EX9-011.ts` is unchanged.

#### Commands and results

All commands ran in
`/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-011.test.ts --maxWorkers=1 --no-file-parallelism
PASS — 1 file, 10 tests

pnpm typecheck
PASS — shared build/copy-data, packages/shared, apps/api, and apps/web typechecks

pnpm exec oxlint apps/api/src/cards/EX9/EX9-011.ts apps/api/src/cards/EX9/EX9-011.test.ts
PASS

pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-011.ts apps/api/src/cards/EX9/EX9-011.test.ts
PASS

git diff --check -- apps/api/src/cards/EX9/EX9-011.ts apps/api/src/cards/EX9/EX9-011.test.ts docs/audits/EX9-reaudit/EX9-011.md
PASS

Fixture/probe sweeps
PASS — no Digi-Egg in deck/security; no advance.fire/fireTiming/fireSubTrigger usage; no debug instrumentation.
```

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-011.ts`: unchanged; full IR and exclusive
  registration were already correct.
- `apps/api/src/cards/EX9/EX9-011.test.ts`: replaced the old injected timing
  scaling setup with a real public alternate-evolution intent and mixed
  face-up/face-down stack proof.
- `docs/audits/EX9-reaudit/EX9-011.md`: this report.
- No engine/shared/catalog/ledger/RUN/notes/KB-index file was edited by this
  lane.

`Q4753` is the only EX9-011 Q&A id returned by the local KB query and is
covered above. No unresolved EX9-011 behavior or typecheck errors remain.

### EX9-012 — MetalGreymon: Alterous Mode

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The colocated suite already covers the alternate evolution routes, both deletion triggers, both Your Turn follow-ups, inherited DP, negative ownership/timing boundaries, optional refusal, and Q4754.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-012` (MetalGreymon: Alterous Mode), red level-5 Digimon, 9000 DP, `Cyborg/DM` traits.
- Alternate evolution requirements: exact `MetalGreymon`, cost 1; level 4 `[Greymon]`, cost 3; level 4 `[ADVENTURE]` trait, cost 3.
- Printed effects: `[On Play]` and `[When Digivolving]` delete 1 opponent Digimon with 8000 DP or less. During your turn, when a `[Garurumon]` or `[Tai Kamiya]` is played, this Digimon may digivolve into a `[Greymon]` trait/name card in hand without paying the cost. During your turn, when one of your Digimon digivolves into `[Garurumon]`, this Digimon may perform the same free evolution.
- Printed inherited text: `[Your Turn] This Digimon gets +4000 DP.`
- Local KB query: `node tools/kb/query.mjs card EX9-012` → Q4754.
- Q&A: `Q4754` (2025-06-13): this card's `[Your Turn]` effect cannot activate when this card itself digivolves into a `[Garurumon]` card.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects); `comprehensive-0125`/`0126` (digivolution procedure); `comprehensive-0143`/`0144` and `0173` (attack/trigger timing); `comprehensive-0165` (pending activation); `comprehensive-0170` (optional processing); `comprehensive-0108`/`0176` (Your Turn/Main activation boundary). `glossary-0007` governs Once Per Turn only where applicable to peer effects; EX9-012 has no printed Once Per Turn clause.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4754 | Verified. When EX9-012 itself digivolves into Garurumon, its own follow-up does not fire; a remaining legal Greymon proves lack of candidate is not the reason. | `EX9-012.test.ts:266-313`; focused suite 15/15 passed. |

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Exact MetalGreymon alternate route, cost 1 | `digivolutionRequirement[0]`: `namesExact: ["MetalGreymon"]`, `cost: 1`, `isAlternate: true` at `EX9-012.ts:157-162` | Real BT1-021 → EX9-012 alternate evolution pays 1 memory (`EX9-012.test.ts:8-25`). EX9-012 itself is rejected as a near-name candidate (`:26-41`). |
| Level 4 Greymon route, cost 3 | `digivolutionRequirement[1]`: `level: 4`, `names: ["Greymon"]`, `cost: 3` at `EX9-012.ts:163-168` | Real EX9-009 → EX9-012 When Digivolving route pays 3 and deletes the 8000-DP target (`:125-154`); free follow-ups use Greymon-name cards from hand (`:156-220`, `:315-346`). |
| Level 4 ADVENTURE route, cost 3 | `digivolutionRequirement[2]`: `level: 4`, `traits: ["ADVENTURE"]`, `cost: 3` at `EX9-012.ts:169-174` | Requirement is present in compiled IR and the suite's exact alternate-route/near-name controls prevent collapsing the requirements into a loose name match. |
| `[On Play]` delete opponent Digimon ≤8000 DP | `trigger: "OnPlay"`, opponent Digimon filter, `dp.op: "lte"`, `value: 8000`, count 1 at `EX9-012.ts:11-28` | Real play deletes the 8000-DP target while retaining the 9000-DP target and resolves memory/hand zones (`EX9-012.test.ts:91-123`). |
| `[When Digivolving]` delete opponent Digimon ≤8000 DP | Same exact Delete action at `EX9-012.ts:29-47` | Real EX9-009 → EX9-012 evolution deletes an 8000-DP target, leaves the source stack intact, and pays cost 3 (`:125-154`). |
| During your turn, Garurumon or Tai Kamiya played | `YourTurn` `SubTrigger event: "whenPlayed"`; mine controller, kinds Digimon/Tamer, name matchers `Garurumon` and `Tai Kamiya` at `EX9-012.ts:48-93` | Real Tai Kamiya play free-digivolves EX9-012 into BT5-069 (`:156-183`); real Garurumon play parameterization verifies accept and decline (`:315-346`); BT1-009 non-Garurumon play does not evolve (`:315-346`). |
| During your turn, one of your Digimon digivolves into Garurumon | `SubTrigger event: "whenOneOfYoursDigivolves"`, mine Digimon Garurumon filter, `excludeSelf: true`, at `EX9-012.ts:94-107`; free Greymon action at `:108-132` | Real EX9-016 → P-007 Garurumon causes EX9-012's free BT5-069 evolution (`:185-220`); opponent-owned source and opponent-turn Garurumon controls do not react (`:222-264`). |
| Free follow-up evolution into Greymon | Both SubTrigger actions target self, `kind: ["Digimon"]`, name match `Greymon`, `from: ["hand"]`, `payCost: false`, `optional: true` at `EX9-012.ts:68-92` and `:108-132` | Positive Tai/Garurumon routes consume the Greymon hand card without memory; decline preserves it (`:156-220`, `:315-346`). |
| Inherited `[Your Turn]` +4000 DP | `trigger: "YourTurn"`, `isInherited: true`, `ModifyDP amount: 4000`, permanent duration at `EX9-012.ts:136-153` | Legal EX9-012 → ST1-10 evolution observes 16000 DP during the owner's turn and 12000 on opponent turn (`EX9-012.test.ts:42-73`). |

The module registers only `registerIrCard("EX9-012", compiled)` at `EX9-012.ts:178`; there is no legacy duplicate registration. No Security effect or Once Per Turn clause is printed.

#### Behavioral and peer/stack proof

- Real alternate evolution: BT1-021 → EX9-012 pays the exact cost-1 MetalGreymon route; EX9-012 Alterous Mode is rejected as a near-name candidate (`:8-41`).
- Real stack and inherited proof: EX9-012 → ST1-10 pays the printed level-4 route and carries +4000 only during the controller's turn (`:42-73`).
- Both deletion triggers are exercised at the exact 8000 boundary, with 9000-DP over-ceiling control on play (`:91-123`) and a real When Digivolving target (`:125-154`).
- Both free-follow-up sources are proven: Tai Kamiya play (`:156-183`) and a different owned Digimon evolving into Garurumon (`:185-220`).
- Negative boundaries cover opponent turn, opponent ownership, non-Garurumon play, and optional decline (`:222-264`, `:315-346`).
- Q4754 uses EX9-012 itself to digivolve into Garurumon, then verifies the remaining legal Greymon route can be performed manually; the excluded self-trigger is therefore proven rather than inferred from an empty hand (`:266-313`).
- No Digi-Egg appears in deck or security fixtures. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper is used.
- Peer mechanism: EX9-016 focused suite passed 6/6 and exercises shared Training/inherited/subtrigger-style stack behavior.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-012.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 15 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-016.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 6 tests** (subtrigger/stack peer regression) |
| `pnpm typecheck` / API `tsc --noEmit` | **PASS** — shared, web, and API typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-012.ts apps/api/src/cards/EX9/EX9-012.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-012.ts apps/api/src/cards/EX9/EX9-012.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-012.ts apps/api/src/cards/EX9/EX9-012.test.ts docs/audits/EX9-reaudit/EX9-012.md` | **PASS** |
| `rg -n 'BT1-00[1-8]' apps/api/src/cards/EX9/EX9-012.test.ts` | **PASS — no Digi-Egg ids** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger' apps/api/src/cards/EX9/EX9-012.test.ts` | **PASS — no matches** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-012.ts`: unchanged; existing IR is faithful and registers exclusively through `registerIrCard`.
- `apps/api/src/cards/EX9/EX9-012.test.ts`: unchanged; existing 15-test suite already provides complete observable proof.
- `docs/audits/EX9-reaudit/EX9-012.md`: this report.
- No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Concurrent worktree changes are outside this card's scope.

No unresolved EX9-012 engine seam or Q&A gap remains.

### EX9-013 — BlitzGreymon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-013`, BlitzGreymon), a Red/Black level-6 Digimon with `[Cyborg]/[DM]/[Ver.1]` traits, play cost 7, and 12,000 DP; it is marked as an Ace card.
- Printed evolution text: `[Digivolve] Lv.5 w/[Greymon] in name or w/[DM] trait: Cost 3.`
- Printed effects: `[Hand] [Counter] ＜Blast Digivolve＞`; `＜Alliance＞`; `＜Blocker＞`; `[On Play] [When Digivolving] ＜De-Digivolve 3＞ 1 of your opponent's Digimon`; `[End of Your Turn] 2 of your Digimon may DNA digivolve into [Omnimon Alter-S] in the hand. Then, 1 of your Digimon may attack.`
- Printed inherited effect: `＜Security Attack +1＞.`
- Local rules: `data/kb/rules/comprehensive.md` §§7–8 (playing/digivolution and DNA digivolution), §§10–12 (counter windows, attacks, and battles), §§14-3/15-3 (inherited effects), and the Alliance/Blocker/Raid keyword sections.
- Local KB: `node tools/kb/query.mjs card EX9-013` → Q4755 and Q4756.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4755 | Verified. After DNA digivolving into Omnimon Alter-S at the end of the turn, the newly DNA digivolved Digimon may attack. | `EX9-013.test.ts:32-62`, real end-of-turn DNA digivolution into EX9-021 followed by an attack declaration and security check. The DNA materials return to the battle area after EX9-021's End of Attack effect. |
| Q4756 | Verified. Declining the optional DNA digivolution does not prevent accepting the separate optional follow-up attack. | `EX9-013.test.ts:64-114`, manually declines the first optional decision, accepts the second, resolves Alliance, and asserts an `attackDeclared` event plus the opponent's security reduction while EX9-021 remains in hand. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Alternate `[Digivolve] Lv.5 w/[Greymon] in name: Cost 3` and `w/[DM] trait: Cost 3` | `EX9-013.ts:127-140`, two alternate `digivolutionRequirement` entries for level 5, cost 3, by name and trait | Real EX9-011 → EX9-013 evolution at `EX9-013.test.ts:271-293` resolves through a real digivolve intent. |
| `[Hand] [Counter] ＜Blast Digivolve＞` | `EX9-013.ts:9-20`, `trigger: "Counter"`, `isFromHand: true`, keyword `BlastDigivolve` | Real opponent attack opens a counter window at `EX9-013.test.ts:116-147`; EX9-013 is selected from hand, evolves onto EX9-011, and memory remains unchanged. |
| `＜Alliance＞` | `EX9-013.ts:21-30`, static keyword `Alliance` | Real player attack at `EX9-013.test.ts:149-176` opens an Alliance prompt; the chosen ally suspends and the attack resolves with the expected security result. Q4756 also resolves the follow-up attack and Alliance at `:64-114`. |
| `＜Blocker＞` | `EX9-013.ts:31-40`, static keyword `Blocker` | Real opponent attack at `EX9-013.test.ts:222-244` opens a block window; EX9-013 blocks, the attacking Digimon is deleted, and both security states are asserted. |
| `[On Play] ＜De-Digivolve 3＞` | `EX9-013.ts:42-56`, `OnPlay` `DeDigivolve` amount 3 targeting one opponent Digimon | Real plays from hand at `EX9-013.test.ts:246-269` de-digivolve stacks of both tested depths, leaving the expected remaining top card and an empty residual stack. |
| `[When Digivolving] ＜De-Digivolve 3＞` | `EX9-013.ts:58-72`, `WhenDigivolving` `DeDigivolve` amount 3 targeting one opponent Digimon | Real EX9-011 → EX9-013 evolution at `EX9-013.test.ts:271-293` de-digivolves the opponent's four-card stack by exactly three cards. |
| `[End of Your Turn] 2 of your Digimon may DNA digivolve into [Omnimon Alter-S] in the hand` | `EX9-013.ts:74-97`, optional `DnaDigivolve`, exactly two own Digimon materials, hand source, name filter `Omnimon Alter-S`, pay cost | Real end-of-turn flow at `EX9-013.test.ts:32-62` DNA digivolves EX9-013 + EX9-020 into EX9-021; Q4756 at `:64-114` explicitly declines this optional action. |
| `Then, 1 of your Digimon may attack` | `EX9-013.ts:98-110`, second optional `Attack` targeting one own Digimon | Q4755's accepted DNA branch produces `attackDeclared` at `:32-62`; Q4756 accepts the attack after declining DNA and proves the security check at `:64-114`. |
| Inherited `＜Security Attack +1＞` | `EX9-013.ts:112-123`, inherited static `SecurityAttack` amount 1 | Legal EX9-013 → BT5-086 stack at `EX9-013.test.ts:178-203` checks two security cards; direct BT5-086 control at `:205-220` checks one. |

#### Peer / stack proof

- Both real de-digivolve triggers are covered: two legal hand plays exercise On Play, and a legal level-5 DM evolution exercises When Digivolving.
- Counter, Alliance, Blocker, and inherited Security Attack +1 each run through public attack/counter/block/evolution intents rather than injected timing helpers.
- Q4755 covers accepted DNA evolution followed by the effect's separate attack; Q4756 manually declines DNA and accepts the follow-up attack, preserving the printed “Then” independence.
- All deck and security fixtures are legal main-deck Digimon (`BT1-009`); no Digi-Egg card is used outside a breeding-area fixture.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-013` | PASS — Q4755 and Q4756 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-013.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 12 tests. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-013.ts apps/api/src/cards/EX9/EX9-013.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-013.ts apps/api/src/cards/EX9/EX9-013.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-013.ts apps/api/src/cards/EX9/EX9-013.test.ts docs/audits/EX9-reaudit/EX9-013.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger' apps/api/src/cards/EX9/EX9-013.test.ts` | PASS — no injected timing helper. |

#### Defects and gaps

No EX9-013-specific implementation defect or engine seam found. The module registers exclusively with `registerIrCard("EX9-013", compiled)` and has `coverage: "full"` with an empty residual list.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-014 — Gabumon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The colocated suite was corrected to use public play intents rather than injected On Play timing and to keep Digi-Eggs out of deck fixtures; it now directly proves Q4757's ordered selection behavior.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-014` (Gabumon), blue level-3 Digimon, play cost 3, 1000 DP, `Reptile/DM/Ver.2` traits.
- Evolution requirement: level 2 `[DM]` trait, cost 0.
- Printed On Play text: reveal the top 3 cards; add 1 `[DM]` trait card to hand; place 1 `[Ver.2]` trait card face down as the bottom digivolution card of any `[DM]` Digimon; return the rest to the bottom of the deck.
- Printed inherited text: `＜Jamming＞`.
- Local KB query: `node tools/kb/query.mjs card EX9-014` → Q4757.
- Q&A: `Q4757` (2025-06-13): if the only revealed card has both `[DM]` and `[Ver.2]`, it must first be added to hand; it cannot also be selected for placement.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects); `comprehensive-0076`/`0077` (face-down and digivolution cards); `comprehensive-0125`/`0126` (digivolution/stack procedure); `comprehensive-0170` (ordered optional processing); `comprehensive-0173` (trigger effects).

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4757 | Verified. A sole revealed DM/Ver.2 card is added to hand first, leaving no remaining Ver.2 card to place underneath. | `EX9-014.test.ts:48-82`, public EX9-014 play intent; focused suite 6/6 passed. |

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate level-2 DM evolution, cost 0 | `digivolutionRequirement: [{ level: 2, traits: ["DM"], cost: 0, isAlternate: true }]` at `EX9-014.ts:67-74` | Exact structural assertion at `EX9-014.test.ts:21-23`; Jamming stack proof uses EX9-007 carrying EX9-014 (`:75-82`). |
| `[On Play]` reveals top 3 | `trigger: "OnPlay"`, `RevealAdd`, `revealCount: 3` at `EX9-014.ts:9-14` | Public `playCard` intent resolves the effect and consumes the three-card deck prefix (`:25-47`, `:48-73`). |
| Add 1 `[DM]` trait card to hand | First `add` entry: exact trait matcher `{ tokens: ["DM"], match: "trait" }`, count 1, `to: "hand"` at `EX9-014.ts:15-28` | Deck `EX9-007, EX9-014, BT1-012` adds EX9-007 and leaves the non-selected rest at deck bottom (`:25-47`). Q4757 sole-overlap case adds EX9-014 before placement (`:48-73`). |
| Place 1 `[Ver.2]` trait card face down under any DM Digimon | Second `add` entry: exact `[Ver.2]` trait matcher, count 1, `to: "placeUnder"`, `faceDown: true`, and DM Digimon `underFilter` at `EX9-014.ts:29-51` | Public play route places EX9-014 face down under the playing DM Gabumon and checks its stack (`:25-47`). |
| Return remaining revealed cards to deck bottom | `rest: "deckBottom"` at `EX9-014.ts:53` | Positive route observes only the unselected filler BT1-012 at deck bottom; Q4757 observes both remaining fillers in original bottom order (`:25-73`). |
| Inherited `＜Jamming＞` | Static inherited keyword `{ keyword: "Jamming" }` at `EX9-014.ts:56-64` | EX9-014 is placed under an EX9-007 host and `observe(...).hasKeyword` returns true (`EX9-014.test.ts:75-82`). |

The module registers only `registerIrCard("EX9-014", compiled)` at `EX9-014.ts:77`; there is no legacy duplicate registration. No Security effect or duration clause is printed.

#### Behavioral and peer/stack proof

- Public positive route: EX9-014 is played from hand, pays its 3 play cost, reveals three cards, adds the DM card, places the Ver.2 card face down under a DM Digimon, bottoms the remaining card, and resolves with no pending decision (`:25-47`).
- Q4757 route: the first revealed card is the only DM/Ver.2 overlap; it is added to hand, no card is placed underneath, and the other two are bottomed (`:48-73`).
- Evolution/stack proof: EX9-007 → EX9-014 stack exposes inherited Jamming through a real Digimon stack (`:75-82`).
- Structural coverage checks exact RevealAdd count, hand/placeUnder destinations, face-down placement, rest zone, and alternate evolution requirement (`:8-23`).
- Fixtures contain no Digi-Egg in deck or security. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper remains in the assigned test.
- Peer mechanism: EX9-007 focused suite passed 8/8 and independently exercises the same DM RevealAdd/face-down placement vocabulary, including a public play route.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-014.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 6 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-007.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 8 tests** (RevealAdd/DM peer regression) |
| `pnpm typecheck` / API `tsc --noEmit` | **PASS** — shared, web, and API typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-014.ts apps/api/src/cards/EX9/EX9-014.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-014.ts apps/api/src/cards/EX9/EX9-014.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-014.ts apps/api/src/cards/EX9/EX9-014.test.ts docs/audits/EX9-reaudit/EX9-014.md` | **PASS** |
| `rg -n 'BT1-00[1-8]' apps/api/src/cards/EX9/EX9-014.test.ts` | **PASS — no Digi-Egg ids** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger' apps/api/src/cards/EX9/EX9-014.test.ts` | **PASS — no matches** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-014.ts`: unchanged; existing IR is faithful and registers exclusively through `registerIrCard`.
- `apps/api/src/cards/EX9/EX9-014.test.ts`: replaced injected On Play timing with public play intents, removed Digi-Egg deck fillers, and added final zone/memory assertions.
- `docs/audits/EX9-reaudit/EX9-014.md`: this report.
- No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Concurrent worktree changes are outside this card's scope.

No unresolved EX9-014 engine seam or Q&A gap remains.

### EX9-015 — Gizamon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2
behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. The
card score is therefore **8/10 pending set gates**. The committed module was
already faithful; this lane corrected illegal Digi-Egg deck fixtures and
expanded the colocated public-intent proof.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-015` (`Gizamon`),
  blue Digimon, Lv.3, play cost 3, Sea Animal/DM/Ver.5 traits.
- Local Q&A query: `node tools/kb/query.mjs card EX9-015` returned **no
  knowledge-base entries**.
- Comprehensive rules used: `comprehensive-0260` (§16-41, `<Training>`),
  `comprehensive-0075`/`comprehensive-0076` (§4-6 stacked cards and
  face-down-card information), `comprehensive-0173` (§15-8-3 trigger-type
  effects), and `glossary-0007` (Once Per Turn).

Printed clauses:

- `[Digivolve] Lv.2 w/[DM] trait: Cost 0`.
- `<Training>`.
- Inherited: `[When Attacking] [Once Per Turn] Trash the bottom digivolution
  card of 1 of your opponent's Digimon.`

There is no printed optional “may” clause and no Security effect on EX9-015.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Lv.2 with `[DM]` trait, evolution cost 0 | `digivolutionRequirement: [{ level: 2, traits: ["DM"], cost: 0, isAlternate: true }]` (`EX9-015.ts:43-50`) | Public digivolution from EX9-003 (Lv.2 DM) succeeds with memory unchanged and correct stack; EX9-008 (Lv.3) is rejected with hand/stack/memory unchanged (`EX9-015.test.ts:31-58`). |
| `<Training>` | Static keyword `{ keyword: "Training" }` (`EX9-015.ts:11-19`); engine supplies the keyword’s suspend-and-place behavior | Public `activateEffect` intent suspends the card, moves the top main-deck Digimon face-down to the bottom of the stack, preserves order, and leaves the next deck card on top (`EX9-015.test.ts:60-89`). Suspended and empty-deck cards expose no Training activation (`:91-109`). |
| Inherited `[When Attacking]` | Inherited `WhenAttacking` effect, `TrashDigivolution`, target controller `opponent`, kind `Digimon`, `digivolutionCards: "hasAny"`, `count: 1`, `amount: 1`, `fromTop: false`, `frequency: "OncePerTurn"` (`EX9-015.ts:20-39`) | A real attack trashes only the eligible target’s bottom card and leaves an opposing Digimon with no stack untouched; a second same-turn attack leaves the target stack unchanged (`EX9-015.test.ts:111-155`). A production turn boundary re-arms the effect, allowing the next attack to trash the new bottom card (`:157-219`). |

The module has one registration only:
`registerIrCard("EX9-015", compiled)` (`EX9-015.ts:53`). No legacy
`registerCard` registration exists.

#### Behavioral, stack, and fixture proof

- Training uses a public `activateEffect` intent and `settle()`, not injected
  timing. The deck top is a main-deck BT1-009 Digimon; BT1-010 remains in the
  deck and is not accidentally placed.
- The evolution proof exercises both a legal Lv.2 DM source and a nonmatching
  Lv.3 DM peer, with explicit memory, hand, and stack assertions.
- The inherited effect uses a mixed opponent board: one stacked Digimon and
  one Digimon with no digivolution cards. Only the stacked target is eligible,
  and the bottom card is removed in the correct order.
- The once-per-turn proof covers two attacks in one turn, then a real
  production turn boundary and a successful next-turn activation.
- No Digi-Egg appears in any deck or security fixture. `EX9-002` is used only
  as a legitimate under-card source in an evolution stack.
- No `advance.fire`, `fireTiming`, or `fireSubTrigger` usage exists. The
  `advance.verb.unsuspend` and phase helpers only drive public turn/verb
  state needed to reach the second attack and next turn.
- No engine seam was required; `EX9-015.ts` is unchanged.

#### Commands and results

All commands ran in
`/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-015.test.ts --maxWorkers=1 --no-file-parallelism
PASS — 1 file, 7 tests

pnpm typecheck
PASS — shared build/copy-data, packages/shared, apps/api, and apps/web typechecks

pnpm exec oxlint apps/api/src/cards/EX9/EX9-015.ts apps/api/src/cards/EX9/EX9-015.test.ts
PASS

pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-015.ts apps/api/src/cards/EX9/EX9-015.test.ts
PASS

git diff --check -- apps/api/src/cards/EX9/EX9-015.ts apps/api/src/cards/EX9/EX9-015.test.ts
PASS

Fixture/probe sweeps
PASS — no Digi-Egg in deck/security; no advance.fire/fireTiming/fireSubTrigger usage; no registerCard or debug instrumentation.
```

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-015.ts`: unchanged; full IR and exclusive
  registration were already correct.
- `apps/api/src/cards/EX9/EX9-015.test.ts`: replaced BT1-001/BT1-002 Digi-Egg
  deck fixtures with inert main-deck Digimon; added evolution legality,
  Training boundaries, mixed target filtering, and production turn-reset
  proof.
- `docs/audits/EX9-reaudit/EX9-015.md`: this report.
- No engine/shared/catalog/ledger/RUN/notes/KB-index file was edited by this
  lane.

No EX9-015 Q&A ids were returned by the local KB query. No unresolved
EX9-015 behavior or typecheck errors remain.

### EX9-016 — Betamon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The colocated test needed only a fixture correction: deck fillers were changed from Digi-Eggs to main-deck Digimon while retaining the public Training activation route.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-016` (Betamon), blue level-3 Digimon, play cost 3, 1000 DP, `Amphibian/DM/Ver.1` traits.
- Evolution requirement: level 2 `[DM]` trait, cost 0.
- Printed effect: `＜Training＞`.
- Printed inherited text: `＜Jamming＞`.
- Local KB query: `node tools/kb/query.mjs card EX9-016` → **no knowledge-base entries** and therefore no Q&A ids.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects and stacked cards); `comprehensive-0076`/`0077` (face-down/digivolution cards); `comprehensive-0227` (Jamming); `comprehensive-0260` (Training); `comprehensive-0176` (activation-type effects); `glossary-0000`/`0009` (Digi-Egg and level terminology).

#### Q&A ledger

No EX9-016 Q&A entries were returned by the committed local knowledge base.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate level-2 DM evolution, cost 0 | `digivolutionRequirement: [{ level: 2, traits: ["DM"], cost: 0, isAlternate: true }]` at `EX9-016.ts:39-46` | Structural assertion at `EX9-016.test.ts:13-17`; breeding-area comparison proves the DM alternate route accepts EX9-001 but rejects off-color BT1-001 (`:77-99`). |
| `＜Training＞` | Static non-inherited keyword `{ keyword: "Training" }` at `EX9-016.ts:9-19` | Structural keyword assertion (`:8-17`) and public `observe(...).activatableEffects` + `activateEffect` route (`:19-52`). Comprehensive `0260` confirms suspension plus deck-top placement semantics. |
| Training suspends this Digimon | Keyword execution is delegated to the shared Training primitive; the module declares the keyword only at `EX9-016.ts:13-17` | Positive activation observes `source.isSuspended === true` after the public activation (`EX9-016.test.ts:19-52`). |
| Training places the deck top face down at the bottom of this stack | Shared keyword semantics; the card module carries `Training` at `EX9-016.ts:9-19` | Deck `[BT1-012, BT1-013]` becomes `[BT1-013]`; stack becomes `[BT1-012 faceDown, EX9-002]`, proving top-to-bottom placement and hidden state (`:19-52`). |
| Inherited `＜Jamming＞` | Static inherited keyword `{ keyword: "Jamming" }` at `EX9-016.ts:20-30` | Real losing security battle survives only when EX9-016 is underneath (`:54-75`); without the inherited source, the host is deleted. |

The module registers only `registerIrCard("EX9-016", compiled)` at `EX9-016.ts:49`; there is no legacy duplicate registration. No Security effect or duration clause is printed.

#### Behavioral and peer/stack proof

- Public Training route: EX9-016 under a real EX9-002 stack activates via `observe`/`activateEffect`, suspends the host, places a main-deck Digimon face down at the stack bottom, and consumes exactly one deck card (`:19-52`).
- Jamming boundary: identical losing security battles with and without EX9-016 prove the inherited keyword's production effect (`:54-75`).
- Evolution-stack proof: EX9-016 is tested under a DM host and the alternate level-2 DM requirement is checked in the breeding area (`:77-99`).
- Fixtures contain no Digi-Egg in deck or security. The BT1-001 off-color comparison is intentionally in the breeding area, not a deck/security fixture. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper is used.
- Peer mechanism: EX9-008 focused suite passed 7/7 and independently exercises the same Training activation and Jamming/stack vocabulary.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-016.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 6 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-008.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 7 tests** (Training/Jamming peer regression) |
| `pnpm typecheck` / API `tsc --noEmit` | **PASS** — shared, web, and API typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-016.ts apps/api/src/cards/EX9/EX9-016.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-016.ts apps/api/src/cards/EX9/EX9-016.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-016.ts apps/api/src/cards/EX9/EX9-016.test.ts docs/audits/EX9-reaudit/EX9-016.md` | **PASS** |
| `rg -n 'security:.*BT1-00[1-8]|deck:.*BT1-00[1-8]' apps/api/src/cards/EX9/EX9-016.test.ts` | **PASS — no Digi-Egg ids in deck/security; BT1-001 remains only as an intentional breeding-area negative** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger' apps/api/src/cards/EX9/EX9-016.test.ts` | **PASS — no matches** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-016.ts`: unchanged; existing IR is faithful and registers exclusively through `registerIrCard`.
- `apps/api/src/cards/EX9/EX9-016.test.ts`: replaced Digi-Egg deck fillers with main-deck Digimon; public Training activation was already present.
- `docs/audits/EX9-reaudit/EX9-016.md`: this report.
- No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Concurrent worktree changes are outside this card's scope.

No unresolved EX9-016 engine seam or Q&A gap remains.

### EX9-017 — Garurumon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-017`, Garurumon), a Blue level-4 Digimon with `[Beast]/[DM]/[Ver.2]` traits, play cost 5, and 5,000 DP.
- Printed evolution text: `[Digivolve] Lv.3 w/[DM] trait: Cost 2.`
- Printed effects: `＜Training＞`; `[On Play] [When Digivolving] By placing 1 card in your hand face down as this Digimon's bottom digivolution card, for each of its face-down digivolution cards, trash any 1 digivolution card from your opponent's Digimon.`
- Printed inherited effect: `＜Jamming＞.`
- Local rules: `data/kb/rules/comprehensive.md` §§7–8 (playing/digivolution and digivolution-card placement), §§14-3/15-3 (inherited effects), and the Training/Jamming keyword sections.
- Local KB: `node tools/kb/query.mjs card EX9-017` → Q4758.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4758 | Verified. The effect can trash digivolution cards from multiple opposing Digimon; the source's face-down count scales the total across the eligible opposing stacks. | `EX9-017.test.ts:76-107`, real EX9-014 → EX9-017 evolution with one pre-existing face-down source card, a second face-down card placed from hand, and two opposing Digimon. Both opposing stacks are emptied. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Alternate `[Digivolve] Lv.3 w/[DM] trait: Cost 2` | `EX9-017.ts:118-125`, alternate level-3 `[DM]` requirement with cost 2 | Real EX9-014 → EX9-017 evolution at `EX9-017.test.ts:76-107` resolves through a normal digivolve intent. |
| `＜Training＞` | `EX9-017.ts:9-19`, static keyword `Training` | Real activation at `EX9-017.test.ts:26-53` suspends EX9-017 and places the legal main-deck top card face-down at the bottom of its stack. |
| `[On Play] ... place 1 card in your hand face down ...` | `EX9-017.ts:21-61`, `OnPlay` `TrashDigivolution` with hand placement cost, bottom stack position, and `faceDown: true` | Real EX9-017 play from hand at `EX9-017.test.ts:55-74` consumes EX9-072 as a face-down stack card and resolves the trash effect. |
| `[When Digivolving] ... place 1 card in your hand face down ...` | `EX9-017.ts:62-103`, `WhenDigivolving` equivalent cost and action | Real EX9-014 → EX9-017 evolution at `EX9-017.test.ts:76-107` places EX9-072 face-down and resolves the scaled trash across both opponent Digimon. |
| `for each of its face-down digivolution cards` | `EX9-017.ts:52-58` and `:94-100`, `scaling.unit: "selfFaceDownDigivolutionCards"`, `per: 1` | Q4758 proof starts with one face-down card and places a second, then asserts both opposing digivolution stacks are emptied (`:80-105`). |
| `trash any 1 digivolution card from your opponent's Digimon` and multi-Digimon scope | `EX9-017.ts:24-34` and `:66-76`, opponent Digimon filter with `digivolutionCards: "hasAny"`, `scope: "acrossDigimon"`, amount 1 | On Play single-target proof at `:55-74`; Q4758 two-target proof at `:76-107` confirms cards are selected across separate opposing Digimon rather than from only one host. |
| Inherited `＜Jamming＞` | `EX9-017.ts:105-114`, inherited static keyword `Jamming` | Real EX9-014 → EX9-017 → BT1-038 host stack attacks at `EX9-017.test.ts:109-149`; the stack survives the security check and the attack resolves without trash side effects. |

#### Peer / stack proof

- Training is tested as a real activated effect on an EX9-017 stack.
- On Play and When Digivolving each run through actual play/evolution intents, with the hand card placed face-down and the resulting source stacks asserted.
- Q4758 uses two separate opponent Digimon with eligible stacks and verifies cross-Digimon scaling from two source face-down cards.
- Jamming is tested through a legal EX9-014 → EX9-017 → BT1-038 stack and a real attack.
- All deck/security fixtures are legal main-deck Digimon; no Digi-Egg card is used as a deck or security fixture.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-017` | PASS — Q4758 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-017.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 6 tests. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-017.ts apps/api/src/cards/EX9/EX9-017.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-017.ts apps/api/src/cards/EX9/EX9-017.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-017.ts apps/api/src/cards/EX9/EX9-017.test.ts docs/audits/EX9-reaudit/EX9-017.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger' apps/api/src/cards/EX9/EX9-017.test.ts` | PASS — no injected timing helper. |

#### Defects and gaps

No EX9-017-specific implementation defect or engine seam found. The module registers exclusively with `registerIrCard("EX9-017", compiled)` and has `coverage: "full"` with an empty residual list.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-018 — MetalMamemon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The colocated test suite now provides public-route proof for both triggered effects, the replacement effect, alternate evolution routes, the inherited effect, and all three committed Q&A entries.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-018` (MetalMamemon), blue/black level-5 Digimon, play cost 7, 7000 DP, `Cyborg/DM/Ver.2` traits.
- Evolution requirements: `[Mamemon]`, cost 1; level 4 with `[DM]`, cost 3; both alternate routes.
- Main effect: when this card would be played, it may trash 1 `[Cyborg]` or `[Ver.2]` trait card from hand to reduce the play cost by 2. On Play and When Digivolving, it may place 1 Digimon card from trash face down as this Digimon's bottom digivolution card; then choose 1 opponent Digimon and trash 1 of its digivolution cards for each face-down digivolution card under this Digimon, then return 1 opponent Digimon with no digivolution cards to the bottom of the deck.
- Inherited effect: `[End of Your Turn] [Once Per Turn] 1 of your Digimon unsuspends.`
- Local KB query: `node tools/kb/query.mjs card EX9-018` → **Q4759, Q4760, Q4761**.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects and stacked cards); `comprehensive-0076`/`0077` (face-down and digivolution cards); `comprehensive-0125`/`0126` (digivolution procedure); `comprehensive-0170` (optional processing); `comprehensive-0173` (trigger effects); `comprehensive-0176` (activation/effect-play processing); `glossary-0007` (Once Per Turn).

#### Q&A ledger

| Q&A | Coverage | Evidence |
| --- | --- | --- |
| Q4759 | Verified | `EX9-018.test.ts:384-427` effect-plays the card without paying its cost, accepts the optional replacement payment, and observes the hand-to-trash payment while declining the separate On Play placement cost. |
| Q4760 | Verified | `EX9-018.test.ts:255-299` places two face-down cards under this Digimon, chooses one opponent Digimon with two sources, trashes both sources, and preserves a separate opponent Digimon and its source. |
| Q4761 | Verified | `EX9-018.test.ts:66-87`, `:301-323`, and `:225-253` prove that declining or being unable to pay the placement cost prevents the then-return, while a paid placement permits it. |

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate `[Mamemon]` evolution, cost 1 | `namesExact: ["Mamemon"]`, `cost: 1`, `isAlternate: true` at `EX9-018.ts:202-207` | `EX9-018.test.ts:8-45` accepts BT6-064 and rejects the near-name BT3-071 MetalMamemon at `:47-64`. |
| Alternate level-4 `[DM]` evolution, cost 3 | `level: 4`, `traits: ["DM"]`, `cost: 3`, `isAlternate: true` at `EX9-018.ts:208-213` | The table test at `EX9-018.test.ts:8-45` accepts EX9-029 and rejects non-DM BT1-015, with memory, stack, hand, trash, and deck assertions. |
| Optional replacement reduces play cost by 2 by trashing a hand `[Cyborg]` or `[Ver.2]` card | Static `Replacement`/`wouldBePlayed`, `mode: "reduceCost"`, `amount: 2`, exact trait matcher, `optional: true`, `abortOnDecline: true` at `EX9-018.ts:9-47` | Structural trace at `EX9-018.test.ts:156-203`; paid EX9-017 and Cyborg-only EX9-030 routes prove exact reduction/payment at `:205-223` and `:429-454`; decline preserves the payment card at `:456-480`; Q4759 covers free effect-play at `:384-427`. |
| On Play and When Digivolving placement cost | Both trigger branches use optional `place` from own trash, `kind: ["Digimon"]`, `faceDown: true`, `destination: "digivolutionStack"`, `position: "bottom"`, `host: "self"` at `EX9-018.ts:52-181` | Structural and public On Play/When Digivolving proofs at `EX9-018.test.ts:156-203`, `:89-113`, `:115-154`, and real normal digivolution at `:325-362`. |
| Choose exactly one opponent Digimon, trash 1 source per face-down source under this card | Each branch has `TrashDigivolution`, `count: 1`, `upTo: false`, `choose: true`, opponent Digimon with `digivolutionCards: "hasAny"`, and scaling unit `selfFaceDownDigivolutionCards` at `EX9-018.ts:79-100` and `:144-165` | One-source On Play proof at `EX9-018.test.ts:225-253`; two-source scaling and peer preservation at `:255-299`; When Digivolving proof at `:325-362`. |
| Then return 1 opponent Digimon with no sources to deck bottom | Each branch uses `Return`, opponent Digimon filter with `digivolutionCards: "none"`, `count: 1`, `to: "deckBottom"` at `EX9-018.ts:101-112` and `:166-176` | Paid source-less target route at `EX9-018.test.ts:89-113`; Q4761 negative gate at `:301-323`; Q4760 and Q4759 remain isolated from this continuation. |
| Inherited end-of-your-turn once-per-turn unsuspend | `EndOfYourTurn`, `Unsuspend`, own Digimon target, `isInherited: true`, `frequency: "OncePerTurn"` at `EX9-018.ts:183-198` | A real turn suspends an inherited host and observes it unsuspend at end of turn in `EX9-018.test.ts:364-382`. |

The module registers only `registerIrCard("EX9-018", compiled)` at `EX9-018.ts:216`; there is no legacy duplicate registration.

#### Behavioral and peer/stack proof

- Public play and normal digivolution routes cover both trigger branches, optional acceptance/decline, exact placement position and hidden state, source-count scaling, source-less return, and the gated then-clause.
- Alternate evolution coverage includes exact-name matching, level-4 DM matching, invalid non-DM rejection, memory payment, and stack preservation.
- Inherited behavior is exercised through a real owner turn rather than an injected timing event.
- Q4759, Q4760, and Q4761 are all directly mapped to positive and negative observable assertions.
- Fixtures contain no Digi-Egg ids in deck or security, and no `advance.fire`, `fireTiming`, or `fireSubTrigger` helper. All stack sources are inert main-deck Digimon cards.
- Peer mechanism: EX9-030 focused suite passed 18/18 and independently exercises the Cyborg payment branch and related EX9-018 interaction; EX9-018 also directly uses EX9-017/EX9-016 stack interactions.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-018.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 17 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-030.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 18 tests** (Cyborg/payment peer regression) |
| `pnpm typecheck` / API `tsc --noEmit -p tsconfig.json` | **PASS** — shared, web, and API typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-018.ts apps/api/src/cards/EX9/EX9-018.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-018.ts apps/api/src/cards/EX9/EX9-018.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-018.ts apps/api/src/cards/EX9/EX9-018.test.ts docs/audits/EX9-reaudit/EX9-018.md` | **PASS** |
| `rg -n 'security:.*BT1-00[1-8]|deck:.*BT1-00[1-8]|advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger' apps/api/src/cards/EX9/EX9-018.test.ts` | **PASS — no forbidden fixture or injected timing matches** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-018.ts`: unchanged; existing IR is faithful and registers exclusively through `registerIrCard`.
- `apps/api/src/cards/EX9/EX9-018.test.ts`: replaced the former under-stack BT1-001 Digi-Egg fixture with inert main-deck BT1-012; no deck/security Digi-Egg fixtures remain.
- `docs/audits/EX9-reaudit/EX9-018.md`: this report.
- No unresolved EX9-018 engine seam or Q&A gap remains. No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Concurrent worktree changes are outside this card's scope.

### EX9-019 — WereGarurumon: Sagittarius Mode

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-019`, WereGarurumon: Sagittarius Mode), a Blue/Black level-5 Digimon with `[Beastkin]/[ADVENTURE]` traits, play cost 8, and 8,000 DP.
- Printed evolution text: `[Digivolve] [WereGarurumon]: Cost 1`; `[Digivolve] Lv.4 w/[Garurumon] in name or w/[ADVENTURE] trait: Cost 3.`
- Printed effects: `[On Play] [When Digivolving] 1 of your opponent's Digimon or Tamers can't suspend until their turn ends.`; `[Your Turn] When any of your Digimon or Tamers with [Greymon] or [Matt Ishida] in its name are played or any of your Digimon digivolve into a Digimon with [Greymon] in its name, this Digimon may digivolve into a Digimon card with [Garurumon] in its name in the hand without paying the cost.`
- Printed inherited effect: `[When Attacking] [Once Per Turn] ＜De-Digivolve 1＞ 1 of your opponent's Digimon.`
- Local rules: `data/kb/rules/comprehensive.md` §§7–8 (playing/digivolution), §§10–12 (turns and attacks), §§14-3/15-3 (inherited effects), and the restriction/subtrigger sections.
- Local KB: `node tools/kb/query.mjs card EX9-019` → Q4762.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4762 | Verified. The Your Turn effect does not activate when EX9-019 itself digivolves into a Digimon with [Greymon] in its name; the Garurumon candidate remains in hand after a real EX9-019 → AD1-009 BlitzGreymon evolution. | `EX9-019.test.ts:185-214`, with AD1-009 as the legal [Greymon]/[ADVENTURE] evolution and ST2-11 as the detectable Garurumon candidate. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Exact `[Digivolve] [WereGarurumon]: Cost 1` | `EX9-019.ts:152-157`, `namesExact: ["WereGarurumon"]`, cost 1 | Real BT1-040 WereGarurumon → EX9-019 evolution at `EX9-019.test.ts:8-25` pays exactly one memory. The near-name EX9-019 → EX9-019 rejection at `:26-41` confirms exact-name matching. |
| Alternate Lv.4 `[Garurumon]` or `[ADVENTURE]`: Cost 3 | `EX9-019.ts:158-170`, name and trait alternate requirements | Real ST2-06 Garurumon → EX9-019 evolution at `EX9-019.test.ts:83-104`; Q4762 uses the ADVENTURE route at `:185-214`. |
| On Play suspend restriction | `EX9-019.ts:11-27`, opponent Digimon/Tamer target, `Restrict suspend`, `untilOpponentTurnEnd` | Real play from hand at `EX9-019.test.ts:60-81` records the restriction, then real owner/opponent turn progression proves it expires at the opponent's turn end. |
| When Digivolving suspend restriction | `EX9-019.ts:28-44`, same opponent Digimon/Tamer restriction and duration | Real evolution at `EX9-019.test.ts:83-104` records the restriction on the opponent target. |
| Your Turn trigger after a qualifying Greymon/Matt play | `EX9-019.ts:45-87`, `SubTrigger event: "whenPlayed"`, source name filter `Greymon`/`Matt Ishida`, free hand Digivolve into `Garurumon` | Real BT1-015 Greymon play at `EX9-019.test.ts:106-127` and real ST6-14 Matt Ishida play at `:129-148` each free-digivolve the source into ST2-11 without consuming the candidate hand card. |
| Your Turn trigger after another Digimon digivolves into Greymon | `EX9-019.ts:88-130`, `whenOneOfYoursDigivolves`, `excludeSelf: true`, Greymon source filter | Real EX9-008 → BT1-015 Greymon evolution at `EX9-019.test.ts:150-183` covers both accepting and declining the optional free Garurumon evolution. |
| Q4762 self-trigger exclusion | `EX9-019.ts:89-101`, source filter explicitly `excludeSelf: true` | Real EX9-019 → AD1-009 Greymon evolution at `EX9-019.test.ts:185-214` leaves ST2-11 in hand, proving the card's own Greymon evolution does not activate its Your Turn subtrigger. |
| Inherited `[When Attacking] [Once Per Turn] ＜De-Digivolve 1＞` | `EX9-019.ts:131-148`, inherited `WhenAttacking`, `DeDigivolve` amount 1, `frequency: OncePerTurn` | Real ST2-11 host with EX9-019 inherited stack attacks at `EX9-019.test.ts:216-239`; the opposing stack loses its top BT1-015 card and leaves BT1-009. |

#### Peer / stack proof

- All three evolution routes are represented: exact WereGarurumon cost 1, Garurumon-name cost 3, and ADVENTURE cost 3.
- On Play and When Digivolving restriction effects run through real play/evolution intents, with a real turn boundary for duration expiry.
- Greymon play, Matt Ishida play, another Greymon evolution, and the Q4762 self-evolution boundary are all tested with real hand/board flows.
- The inherited De-Digivolve 1 clause is proven on an actual attack from a host carrying EX9-019.
- All deck and security fixtures are legal main-deck Digimon; no Digi-Egg card is used as a deck or security fixture.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-019` | PASS — Q4762 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-019.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 12 tests. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-019.ts apps/api/src/cards/EX9/EX9-019.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-019.ts apps/api/src/cards/EX9/EX9-019.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-019.ts apps/api/src/cards/EX9/EX9-019.test.ts docs/audits/EX9-reaudit/EX9-019.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001' apps/api/src/cards/EX9/EX9-019.test.ts` | PASS — no injected timing helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-019-specific implementation defect or engine seam found. The module registers exclusively with `registerIrCard("EX9-019", compiled)` and has `coverage: "full"` with an empty residual list.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-020 — CresGarurumon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2
behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. The
card score is therefore **8/10 pending set gates**. The committed module was
already faithful; this lane converted injected On Play timing tests to public
play/evolution routes, corrected illegal Digi-Egg fixtures, and added
evolution and optional-DNA coverage.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-020`
  (`CresGarurumon`), blue/black Lv.6 Digimon, play cost 7, 12,000 DP,
  Beast Knight/DM/Ver.2 traits, Ace with Overflow 4.
- Local Q&A query: `node tools/kb/query.mjs card EX9-020` returned `Q4763`:
  if the All Turns replacement DNA-digivolves using two Digimon including one
  that would leave, the newly DNA-digivolved Digimon is a different Digimon
  and does not leave the battle area.
- Comprehensive rules used: `comprehensive-0128`/`0129` (§8-2 DNA
  digivolution identity and stack procedure), `comprehensive-0145`
  (§11-2-7 attack targets), `comprehensive-0223` (§16-5 Blocker),
  `comprehensive-0243` (§16-24 Alliance), and `comprehensive-0245`
  (§16-26 Blast Digivolve). Generic Ace/Overflow handling is covered by the
  engine’s catalog-backed conformance rules; the catalog records
  `isAce: true` and `overflowMemory: 4`.

Printed clauses:

- `[Digivolve] Lv.5` blue or black: cost 4; alternate Lv.5 with `[Garurumon]`
  in name or `[DM]` trait: cost 3.
- `[Hand] [Counter] <Blast Digivolve>`; `<Alliance>`; `<Blocker>`.
- `[On Play] [When Digivolving]` return one opponent's level 5 or lower
  Digimon to the bottom of its owner's deck.
- `[All Turns]` when any of your level 6 Digimon would leave the battle area
  other than in battle, two of your Digimon may DNA digivolve into
  `[Omnimon Alter-S]` in hand.
- Inherited `[Your Turn]` attack targets can't change.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Normal Lv.5 blue/black cost 4; alternate Lv.5 `[Garurumon]`/`[DM]` cost 3 | Alternate `digivolutionRequirement` entries for exact name/trait, level 5, cost 3 (`EX9-020.ts:141-154`); normal color/level costs come from catalog evolution data | Public evolutions prove normal EX9-019 cost 4, alternate DM EX9-011 cost 3, and invalid level-6 EX9-013 rejection with explicit memory/hand/stack assertions (`EX9-020.test.ts:95-126`). |
| `[Hand] [Counter] <Blast Digivolve>` | Counter effect, `isFromHand: true`, `BlastDigivolve` keyword (`EX9-020.ts:10-20`) | A real opponent attack opens a counter window; responding with EX9-020 from hand evolves EX9-019's host without spending memory (`EX9-020.test.ts:128-158`). |
| `<Alliance>` | Static Alliance keyword (`EX9-020.ts:21-30`) | Real attack opens Alliance, suspends the selected ally, resolves security, and restores the attacker’s base DP after the attack (`EX9-020.test.ts:254-281`). |
| `<Blocker>` | Static Blocker keyword (`EX9-020.ts:31-40`) | Real opponent attack opens Block timing; EX9-020 blocks, deletes the 5,000-DP attacker, and preserves both security assertions (`EX9-020.test.ts:283-304`). |
| On Play return one opponent level 5 or lower to deck bottom | `OnPlay` `Return`, opponent Digimon filter, `levelComparison: lte 5`, count 1, `to: deckBottom` (`EX9-020.ts:41-60`) | Real paid play from hand removes BT1-009 and places it after two existing deck cards (`EX9-020.test.ts:48-66`); level-5 EX9-019 is returned while level-6 EX9-013 remains (`:160-178`). |
| When Digivolving return one opponent level 5 or lower to deck bottom | Matching `WhenDigivolving` `Return` action (`EX9-020.ts:61-80`) | Real EX9-019 → EX9-020 evolution pays 4, builds the expected stack, and bottom-decks the opposing EX9-019 after two existing deck cards (`EX9-020.test.ts:68-93`). |
| All Turns replacement for any own level 6 leaving other than battle | `AllTurns` self replacement on `wouldLeavePlay`, `leaveCause: otherThanBattle`, own Digimon level 6 (`EX9-020.ts:81-119`) | Battle deletion bypasses the replacement; an effect deletion opens the DNA path and produces EX9-021 instead (`EX9-020.test.ts:190-231`). |
| Optional two-Digimon DNA into hand `[Omnimon Alter-S]` | Optional `DnaDigivolve`, two own Digimon materials, hand name filter, `payCost: true` (`EX9-020.ts:93-115`) | Q4763 path asserts the new EX9-021 is distinct and retains both materials in its stack; explicit decline permits the non-battle leave and preserves EX9-021 in hand (`EX9-020.test.ts:209-231`, `233-252`). |
| Inherited `[Your Turn]` attack target cannot change | Inherited `YourTurn` self `Restrict`, `attackTargetChange`, permanent duration (`EX9-020.ts:120-137`) | A real evolved EX9-020 → BT5-086 host suppresses Blocker redirection; the same BT5-086 played without the inherited source permits the block (`EX9-020.test.ts:306-365`). |

The module has one registration only:
`registerIrCard("EX9-020", compiled)` (`EX9-020.ts:157`). No legacy
`registerCard` registration exists.

#### Behavioral, peer, and fixture proof

- Both On Play and When Digivolving routes use public play/evolution intents
  and `settle()`, with paid memory and final stack assertions.
- Boundary fixtures distinguish level 5 from level 6 and use two existing
  deck cards to prove bottom placement rather than merely deck return.
- Blast Digivolve, Alliance, Blocker, DNA replacement, and inherited target
  restriction are exercised through real attack/counter/block/evolution
  flows. Q4763 is covered by the non-battle replacement stack identity.
- The optional DNA replacement is explicitly declined in a separate real
  non-battle leave.
- All deck/security fixtures use inert main-deck Digimon; no Digi-Egg is used
  in deck or security.
- No `advance.fire`, `fireTiming`, or `fireSubTrigger` usage exists. The
  remaining `advance.verb.deletePermanent` calls drive production leave-cause
  verbs required to distinguish battle from non-battle replacement behavior.
- No engine seam was required; `EX9-020.ts` is unchanged.

#### Commands and results

All commands ran in
`/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-020.test.ts --maxWorkers=1 --no-file-parallelism
PASS — 1 file, 16 tests

pnpm typecheck
FAIL outside lane — shared build/copy-data, packages/shared, and apps/web pass;
apps/api has unrelated concurrent errors in EX9-021.test.ts:118,137
(readonly tuple fixture typing) and EX9-022.test.ts:70 (number not assignable
to Seat). No EX9-020 error was reported.

pnpm exec oxlint apps/api/src/cards/EX9/EX9-020.ts apps/api/src/cards/EX9/EX9-020.test.ts
PASS

pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-020.ts apps/api/src/cards/EX9/EX9-020.test.ts
PASS

git diff --check -- apps/api/src/cards/EX9/EX9-020.ts apps/api/src/cards/EX9/EX9-020.test.ts docs/audits/EX9-reaudit/EX9-020.md
PASS

Fixture/probe sweeps
PASS — no Digi-Egg in deck/security; no advance.fire/fireTiming/fireSubTrigger usage; no registerCard or debug instrumentation.
```

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-020.ts`: unchanged; full IR and exclusive
  registration were already correct.
- `apps/api/src/cards/EX9/EX9-020.test.ts`: replaced injected On Play timing
  calls with public routes, replaced BT1-001 security/deck fixtures with
  BT1-009/BT1-010/BT1-011 main-deck Digimon, and added evolution, exact deck
  bottom order, Q4763 stack identity, and optional refusal assertions.
- `docs/audits/EX9-reaudit/EX9-020.md`: this report.
- No engine/shared/catalog/ledger/RUN/notes/KB-index file was edited by this
  lane.

`Q4763` is covered. No unresolved EX9-020 behavior or type errors remain. The
workspace typecheck is blocked only by the named out-of-scope EX9-021/EX9-022
test errors above.

### EX9-021 — Omnimon Alter-S

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-021`, Omnimon Alter-S), a Blue/White/Red level-7 Digimon with `[Holy Warrior]/[DM]/[Ver.1]/[Ver.2]` traits, play cost 15, and 15,000 DP.
- Printed evolution: DNA digivolve from one Blue level 6 and one Red level 6 for cost 0.
- Printed effects: `[When Digivolving] If DNA digivolving, your opponent's effects don't affect this Digimon for the turn. Then, delete all of their Digimon with the highest level.`; `[End of Attack]` may play one `[Greymon]`/`[Ver.1]` and one `[Garurumon]`/`[Ver.2]` from this Digimon's digivolution cards without paying costs, and if either was played, place this Digimon as the top security card.
- Errata: the protection clause uses “your opponent's effects,” not “your opponent's Digimon's effects.”
- Local KB: `node tools/kb/query.mjs card EX9-021` → Q4764–Q4773 and the errata above.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4764 | Verified. The highest-level deletion resolves after a non-DNA digivolution as well as after DNA digivolution. | DNA path at `EX9-021.test.ts:49-81`; normal digivolution path at `:83-108`. |
| Q4765 | Verified. All four legal pairings are exercised: Greymon + Garurumon, Greymon + Ver.2, Ver.1 + Garurumon, and Ver.1 + Ver.2. | Parameterized real attack tests at `EX9-021.test.ts:165-196`. |
| Q4766 | Verified. When both required cards are available and the optional effect is accepted, both are played; the test does not allow a one-card partial resolution. | Greymon + Garurumon case in the Q4765 parameterization at `EX9-021.test.ts:165-196`. |
| Q4767 | Verified. With only a Greymon card available, the effect plays that one card and still places Alter-S in top security. | `EX9-021.test.ts:198-220`. |
| Q4768 | Verified. A real opposing DP-reduction effect and suspend effect can resolve against the immune Alter-S as a chosen target, but neither changes it. | `EX9-021.test.ts:110-163`; BT14-036 leaves DP at 15,000 and BT1-070 leaves it unsuspended. |
| Q4769 | Verified. The immune Alter-S remains selectable by the opponent's effects; the effects resolve against it and are ignored by the immunity restriction. | Same real-target test at `EX9-021.test.ts:110-163`. |
| Q4770 | Shared mechanism verified. The engine permits a protected card to be given an effect while ignoring its effect, and does not treat a protected granted Security A. as active. | `src/engine/effects/immunityAffectation.test.ts` and the analogous EX12-016 delayed-effect tests; no EX9-021-specific granted-effect clause exists. |
| Q4771 | Shared mechanism verified. An ongoing effect stops immediately when the target gains the protection restriction. | `src/engine/effects/immunityAffectation.test.ts` dynamic-immunity case. |
| Q4772 | Shared mechanism verified. An effect granted while protected applies once protection is lost. | `src/engine/effects/immunityAffectation.test.ts` re-application case. |
| Q4773 | Shared mechanism verified. A granted delayed trigger does not fire when the recipient is protected at trigger timing. | `src/cards/EX12/EX12-016.test.ts` Q6740 analogue; no EX9-021-specific delayed granted effect is printed. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| DNA Blue Lv.6 + Red Lv.6, cost 0 | `EX9-021.ts:82-90`, `dnaDigivolveRequirement` with Red/Blue level 6 materials and cost 0 | Real EX9-013 + EX9-020 DNA digivolution at `EX9-021.test.ts:49-81`. |
| DNA-only opponent-effect protection for the turn | `EX9-021.ts:9-18`, self `Restrict` `beAffected`, `byOpponentEffectsOnly`, `duration: forTheTurn`, `condition: isDnaDigivolving` | DNA case observes the restriction at `EX9-021.test.ts:76-80`; normal digivolution explicitly confirms no restriction at `:83-108`. Real BT14-036 and BT1-070 target the protected card at `:110-163`. |
| Then delete all opposing Digimon with the highest level | `EX9-021.ts:19-25`, opponent Digimon target, `superlative: highestLevel`, `count: all` | DNA and normal paths each retain only the lower-level BT1-009 opponent at `EX9-021.test.ts:76-80` and `:105-107`. |
| End-of-Attack plays one `[Greymon]`/`[Ver.1]` and one `[Garurumon]`/`[Ver.2]` from the own stack for free | `EX9-021.ts:29-65`, two `PlayWithoutCost` actions with `fromOwnDigivolutionStack`, name-or-trait filters, and independent bindings | Four real attack cases cover every Q4765 pairing at `EX9-021.test.ts:165-196`; the one-card Greymon case covers Q4767 at `:198-220`. |
| If either card was played, place this Digimon as top security | `EX9-021.ts:66-78`, `SecurityManipulation addTop` conditioned on either binding | Every successful End-of-Attack case asserts EX9-021 is top security. |

#### Peer / stack proof

- DNA and normal digivolution are both driven through real intents, with the DNA condition changing only the protection action while the unconditional deletion remains active.
- All four Q4765 stack combinations are represented with legal main-deck Digimon fixtures: AD1-001, AD1-010, EX9-016, and BT22-049.
- The Q4767 stack contains only AD1-001, proving the available-card partial case.
- The Q4768/Q4769 fixture uses real opponent cards (BT14-036 for -3,000 DP and BT1-070 for suspend) and verifies that Alter-S is a legal target but unchanged.
- No Digi-Egg card is used as a deck or security fixture, and no injected timing helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-021` | PASS — errata and Q4764–Q4773 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-021.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 11 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/effects/immunityAffectation.test.ts src/engine/effects/modifiers.test.ts src/cards/EX12/EX12-016.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 3 files, 54 tests. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-021.ts apps/api/src/cards/EX9/EX9-021.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-021.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-021.ts apps/api/src/cards/EX9/EX9-021.test.ts docs/audits/EX9-reaudit/EX9-021.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001' apps/api/src/cards/EX9/EX9-021.ts apps/api/src/cards/EX9/EX9-021.test.ts` | PASS — no injected timing helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-021-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-021", compiled)`. Q4770–Q4773 are generic effect-affectation lifecycle questions rather than additional EX9-021 printed clauses; they are covered by the shared immunity and EX12 mechanism suites, with no card-local gap to resolve.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-022 — Elecmon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The colocated tests now prove the public normal and alternate evolution routes, Training activation and availability boundaries, inherited Security-Digimon DP reduction, owner-turn duration, and a real security battle.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-022` (Elecmon), yellow level-3 Digimon, play cost 3, 1000 DP, `Mammal/DM/Ver.2` traits.
- Evolution requirements: normal level 2 yellow cost 0; alternate level 2 with `[DM]` trait cost 0.
- Main effect: `＜Training＞`.
- Inherited effect: `[Your Turn] All of your opponent's Security Digimon get -3000 DP.`
- Local KB query: `node tools/kb/query.mjs card EX9-022` → **no knowledge-base entries**; no Q&A ids or ruling-specific gaps exist for this card.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects and stacked cards); `comprehensive-0076`/`0077` (face-down and digivolution cards); `comprehensive-0125`/`0126` (normal digivolution); `comprehensive-0173` (trigger/continuous effect timing); `comprehensive-0176` (activation processing); `comprehensive-0260` (Training); `glossary-0007` (turn terminology where applicable).

#### Q&A ledger

No EX9-022 Q&A entries were returned by the committed local knowledge base. There are no Q&A ids or unresolved ruling gaps to report.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| `＜Training＞` | Static non-inherited keyword `{ keyword: "Training" }` at `EX9-022.ts:11-18` | Structural assertion and public `observe(...).activatableEffects`/`activateEffect` route at `EX9-022.test.ts:7-19` and `:107-130`; availability negatives for a suspended source and empty deck at `:132-148`. |
| Normal level-2 yellow evolution, cost 0 | Catalog normal requirement is retained by the shared card definition; the module adds the alternate route at `EX9-022.ts:35-42` | Public normal evolution from yellow EX9-003 in the breeding area, including resulting stack and hand state, at `EX9-022.test.ts:21-48`. |
| Alternate level-2 `[DM]` evolution, cost 0 | `digivolutionRequirement: [{ level: 2, traits: ["DM"], cost: 0, isAlternate: true }]` at `EX9-022.ts:35-42` | Public alternate evolution from off-color DM EX9-001 succeeds, while invalid level-3 BT1-010 is rejected; stack, hand, memory, and pending state are asserted at `EX9-022.test.ts:21-48`. |
| `[Your Turn]` inherited scope | Separate `trigger: "YourTurn"` effect with `isInherited: true` at `EX9-022.ts:20-31` | Owner-turn parameterization at `EX9-022.test.ts:66-79` observes -3000 for turn seat 0 and 0 for turn seat 1. |
| All opponent Security Digimon get -3000 DP | `ModifySecurityDP`, `controller: "opponent"`, `amount: -3000`, `duration: "permanent"` at `EX9-022.ts:21-30` | Security ledger and battle-area isolation at `EX9-022.test.ts:50-64`; real 2000 DP attacker defeats a 3000 DP Security Digimon after the reduction makes effective Security DP 0 at `:81-105`. |

The module registers only `registerIrCard("EX9-022", compiled)` at `EX9-022.ts:45`; there is no legacy duplicate registration.

#### Behavioral and peer/stack proof

- Normal and alternate evolution routes use public `digivolve` intents. The legal cases assert the resulting top card and source stack; the invalid route preserves the base and hand.
- Training is activated through the public effect-observation/activation path and proves suspension, hidden deck-top placement at stack bottom, and deck depletion. Suspended and empty-deck cases expose no Training activation.
- Inherited scope is checked during both the owner's and opponent's turns. A real security battle proves the -3000 modifier is consumed by security resolution while an opposing battle-area Digimon remains unaffected.
- Fixtures contain no Digi-Egg ids in deck or security. EX9-001/EX9-003 are used only as legal breeding-area evolution bases. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper is used.
- Peer mechanism: EX9-028 focused suite passed 13/13 and independently exercises the same inherited -3000 Security-Digimon ledger effect plus evolution-stack behavior; EX9-008 focused suite passed 7/7 and independently exercises Training and the same DM alternate route.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-022.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 11 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-028.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 13 tests** (inherited Security-DP peer regression) |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-008.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 7 tests** (Training/DM-evolution peer regression) |
| `pnpm typecheck` / API `tsc --noEmit -p tsconfig.json` | **BLOCKED by unrelated pre-existing `EX9-021.test.ts` readonly-tuple errors at lines 168 and 187**; no EX9-022 error remains. Shared and web typechecks completed successfully during `pnpm typecheck`. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-022.ts apps/api/src/cards/EX9/EX9-022.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-022.ts apps/api/src/cards/EX9/EX9-022.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-022.ts apps/api/src/cards/EX9/EX9-022.test.ts docs/audits/EX9-reaudit/EX9-022.md` | **PASS** |
| `rg -n 'security:.*BT1-00[1-8]|deck:.*BT1-00[1-8]|advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger' apps/api/src/cards/EX9/EX9-022.test.ts` | **PASS — no forbidden fixture or injected timing matches** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-022.ts`: unchanged; existing IR is faithful and registers exclusively through `registerIrCard`.
- `apps/api/src/cards/EX9/EX9-022.test.ts`: expanded from 3 to 11 tests with public evolution, Training availability, owner-turn, and real security-battle proof.
- `docs/audits/EX9-reaudit/EX9-022.md`: this report.
- No EX9-022 engine seam or Q&A gap remains. The only check gap is the unrelated pre-existing EX9-021 TypeScript failure named above. No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Concurrent worktree changes are outside this card's scope.

### EX9-023 — Patamon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The colocated suite now proves the effect through public play, covers Q4774's ordered selection rule, removes the prohibited injected On Play timing, and uses only inert main-deck Digimon in security/deck fixtures.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-023` Patamon, yellow level-3 Digimon, play cost 3, 1000 DP, `Mammal/DM/Ver.3` traits.
- Alternate evolution: level 2 with `[DM]` trait, cost 0.
- Printed On Play text: reveal the top 3 cards of your deck; among them, add 1 card with the `[DM]` trait to the hand and place 1 card with the `[Ver.3]` trait face down as the bottom digivolution card of any of your Digimon with the `[DM]` trait; return the rest to the bottom of the deck.
- Printed inherited text: `＜Barrier＞`.
- Local KB query: `node tools/kb/query.mjs card EX9-023` → Q4774.
- Q&A: `Q4774` (2025-06-13): if the only revealed card has both `[DM]` and `[Ver.3]`, it must first be chosen for the hand, then the remaining revealed cards are considered for placement; it cannot be reused for both destinations.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects); `comprehensive-0076`/`0077` (face-down and digivolution cards); `comprehensive-0125`/`0126` (digivolution/stack procedure); `comprehensive-0170` (ordered optional processing); `comprehensive-0173` (trigger effects).

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4774 | Verified. A sole revealed DM/Ver.3 card is added to hand first and is not also placed underneath a DM Digimon. | `EX9-023.test.ts:58-81`, public EX9-023 play intent with deck `[EX9-023, BT1-009, BT1-010]`; host stack remains empty and the two fillers are bottomed in order. |

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate `[Digivolve] Lv.2 w/[DM] trait: Cost 0` | `digivolutionRequirement: [{ level: 2, traits: ["DM"], cost: 0, isAlternate: true }]` at `EX9-023.ts:73-80` | Exact structural assertion at `EX9-023.test.ts:22-23`; the legal EX9-023 → BT1-051 evolution in the Barrier test preserves the source stack (`:108-132`). |
| `[On Play]` reveals top 3 | `trigger: "OnPlay"`, `RevealAdd`, `revealCount: 3` at `EX9-023.ts:11-15` | EX9-023 is played from hand through public `playCard`, and all three deck cards are consumed into their prescribed destinations (`EX9-023.test.ts:30-56`). |
| Add 1 `[DM]` trait card to hand | First `add` entry uses exact trait matcher `{ tokens: ["DM"], match: "trait" }`, count 1, `to: "hand"` at `EX9-023.ts:17-29` | Positive route adds EX9-022 to hand; the Q4774 overlap route adds EX9-023 to hand before any placement (`EX9-023.test.ts:30-56`, `:58-81`). |
| Place 1 `[Ver.3]` card face down under any own `[DM]` Digimon | Second `add` entry uses exact `[Ver.3]` trait matcher, count 1, `to: "placeUnder"`, `faceDown: true`, and a DM Digimon `underFilter` at `EX9-023.ts:30-53` | Positive public play places the revealed EX9-023 face down under the separately seeded EX9-022 DM host (`:30-56`); the no-Ver.3 boundary leaves the host stack empty (`:83-106`). |
| Return the rest to the bottom of the deck | `rest: "deckBottom"` at `EX9-023.ts:54-56` | Positive route leaves only BT1-009; Q4774 route leaves `[BT1-009, BT1-010]` in bottom order (`:53`, `:79`). |
| Inherited `＜Barrier＞` | Static inherited keyword `{ keyword: "Barrier" }` at `EX9-023.ts:59-69` | A legal EX9-023 → BT1-051 evolution retains the source in the stack; an opponent attack raises the Barrier prompt, and both acceptance and refusal are resolved with exact security/trash outcomes (`:108-155`). |

The module registers exclusively with `registerIrCard("EX9-023", compiled)` at `EX9-023.ts:83`; there is no legacy duplicate registration. No Security effect or duration clause is printed.

#### Behavioral and peer/stack proof

- Public positive route: EX9-023 is played from hand, pays its 3 play cost, reveals three cards, adds the DM card, places the Ver.3 card face down under a DM Digimon, bottoms the remaining card, and resolves with no pending decision (`EX9-023.test.ts:30-56`).
- Q4774 route: the first revealed card is the only DM/Ver.3 overlap; it is added to hand, no card is placed underneath, and both remaining fillers are bottomed (`:58-81`).
- Negative boundary: when no revealed card has Ver.3, the DM card is still added but no placement occurs and the two fillers remain at deck bottom (`:83-106`).
- Evolution/stack proof: EX9-023 is legally evolved into BT1-051; Barrier is then observed through the real stack and its accepted/refused outcomes are checked (`:108-155`). Security uses BT1-009, a main-deck Digimon, not a Digi-Egg.
- Structural coverage checks exact RevealAdd count, DM/Ver.3 trait filters, face-down placement, DM host filter, rest zone, alternate evolution requirement, and Barrier keyword (`:6-28`).
- Fixtures contain no Digi-Egg ids. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper remains in the assigned test.
- Peer mechanism: EX9-007 focused suite passed 8/8 and EX9-014 focused suite passed 6/6, independently exercising the same DM RevealAdd/face-down placement vocabulary and the same ordered-overlap rule pattern.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-023` | **PASS** — Q4774 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-023.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 8 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-014.test.ts src/cards/EX9/EX9-007.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 2 files, 14 tests** (RevealAdd/DM peer regressions) |
| `pnpm typecheck` | **PASS** — shared, API, and web typechecks completed. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-023.ts apps/api/src/cards/EX9/EX9-023.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-023.ts apps/api/src/cards/EX9/EX9-023.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-023.ts apps/api/src/cards/EX9/EX9-023.test.ts docs/audits/EX9-reaudit/EX9-023.md` | **PASS** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-00[1-8]' apps/api/src/cards/EX9/EX9-023.test.ts` | **PASS — no injected timing helpers or Digi-Egg ids** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-023.ts`: unchanged; existing full-coverage IR is faithful and uses exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-023.test.ts`: replaced injected On Play timing with public play intents, added exact IR/evolution assertions, added Q4774 and no-Ver.3 behavioral routes, and replaced the Digi-Egg security fixture with BT1-009.
- `docs/audits/EX9-reaudit/EX9-023.md`: this report.
- No unresolved EX9-023 implementation, engine, or Q4774 gap remains. Delivery gates remain coordinator-owned and are intentionally not claimed by this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-024 — Hanimon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The colocated tests now use public play/evolution/attack routes and directly prove Q4775, Q4776, and Q4777 without injected timing fires.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-024` (Hanimon), yellow/purple level-3 Digimon, play cost 3, 1000 DP, `Puppet/LIBERATOR` traits.
- Evolution requirements: normal level 2 yellow or purple cost 1; alternate exact `[Kyaromon]` name, cost 0.
- Main effect: `[On Play] By trashing 1 card in your hand, you may return 1 Digimon card with the [Puppet] trait from your trash to your hand.`
- Inherited effect: `[Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, by deleting 1 of your other Digimon, end that attack.`
- Local KB query: `node tools/kb/query.mjs card EX9-024` → **Q4775, Q4776, Q4777**.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects and stacked cards); `comprehensive-0076`/`0077` (digivolution-card identity); `comprehensive-0125`/`0126` (digivolution procedure); `comprehensive-0143`/`0144` and `comprehensive-0173` (attack and trigger timing); `comprehensive-0149` (end-of-attack timing); `comprehensive-0170` (optional processing); `comprehensive-0199` (effects that end an attack); `glossary-0007` (Once Per Turn).

#### Q&A ledger

| Q&A | Coverage | Evidence |
| --- | --- | --- |
| Q4775 | Verified | `EX9-024.test.ts:188-238` publicly digivolves BT7-062 into BT7-064, resolves BT7-064's real deletion protection, then proves Hanimon's delete cost cannot be paid: the attacker proceeds to security and the protected fodder remains. |
| Q4776 | Verified | `EX9-024.test.ts:121-152` accepts the inherited effect during a real opponent attack, deletes the other Digimon, and leaves security intact, proving the attack transitions before the security check. |
| Q4777 | Verified | `EX9-024.test.ts:240-272` uses an attacker with a live opponent-Digimon-effect immunity restriction; the inherited effect still deletes the fodder and ends the attack before security. |

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate exact `[Kyaromon]` evolution, cost 0 | `namesExact: ["Kyaromon"]`, `cost: 0`, `isAlternate: true` at `EX9-024.ts:76-82` | Public alternate evolution accepts BT1-005 and BT6-002, rejects non-Kyaromon BT1-003, and asserts stack/memory/pending state at `EX9-024.test.ts:77-100`. |
| On Play optional cost: trash 1 hand card | `OnPlay` `Return` action carries a hand `trash` cost count 1, `optional: true`, `abortOnDecline: true` at `EX9-024.ts:8-40` | Public play pays the cost at `EX9-024.test.ts:38-56`; refusal preserves both the hand card and unrelated trash at `:102-119`. |
| Return 1 own-trash Digimon with `[Puppet]` trait to hand | Return target is own trash Digimon with exact trait matcher `{ tokens: ["Puppet"], match: "trait" }`, count 1, destination hand at `EX9-024.ts:11-26` | Public positive route returns EX9-024 to hand; no qualifying Puppet route at `EX9-024.test.ts:58-75` proves the cost is not paid and the non-Puppet trash card remains. |
| Inherited Opponent's Turn / Once Per Turn trigger | `OpponentsTurn` + inherited `SubTrigger` for `whenOpponentAttacks`, `frequency: "OncePerTurn"` at `EX9-024.ts:43-72` | Real opponent attacks accept and decline the optional action at `EX9-024.test.ts:121-186`; two attacks in one opponent turn consume only the first fodder at `:274-324`. |
| By deleting 1 of your other Digimon | `EndAttack` cost `deleteOwn`, own Digimon, `excludeSelf: true`, count 1, optional/abort-on-decline at `EX9-024.ts:50-66` | Accepted route deletes the fodder and leaves security intact (`EX9-024.test.ts:121-152`); declined route preserves fodder and lets security resolve (`:154-186`); Q4775 proves a protected fodder cannot be deleted (`:188-238`). |
| End that attack | `EndAttack` action executes after the deletion cost at `EX9-024.ts:51-66` | Q4776 pre-security proof leaves security at one; Q4777 proves the timing transition still applies to an immune attacker (`EX9-024.test.ts:121-152`, `:240-272`). |

The module registers only `registerIrCard("EX9-024", compiled)` at `EX9-024.ts:85`; there is no legacy duplicate registration.

#### Behavioral and peer/stack proof

- Public play proof covers the paid On Play cost, returned Puppet target, missing-target all-or-nothing boundary, and optional refusal.
- Public evolution proof covers the exact-name alternate route with two matching Kyaromon cards and one non-matching level-2 Digi-Egg; stack, memory, and pending state are asserted. Kyaromon bases are used only in the battle-area evolution fixture, never deck/security.
- Public attack proof covers acceptance, refusal, protected delete-cost failure, the end-of-attack transition before security, immunity to Digimon effects, and Once Per Turn enforcement over two real attacks.
- Q4775, Q4776, and Q4777 are each mapped to a distinct observable scenario. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper is used; `advance.recompute` only refreshes continuous state after the explicit turn-seat handoff in the Q4775 setup.
- Fixtures contain no Digi-Egg ids in deck or security; all deck/security fillers are inert main-deck Digimon.
- Peer mechanism: EX9-027 focused suite passed 15/15 and independently exercises the same inherited `EndAttack`/`deleteOwn` effect, protected delete-cost failure, immune attacker, and once-per-turn attack boundary.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-024.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 14 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-027.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 15 tests** (EndAttack/deleteOwn peer regression) |
| `pnpm typecheck` / `pnpm --filter @aegis/api exec tsc --noEmit -p tsconfig.json` | **PASS** — shared, web, and API typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-024.ts apps/api/src/cards/EX9/EX9-024.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-024.ts apps/api/src/cards/EX9/EX9-024.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-024.ts apps/api/src/cards/EX9/EX9-024.test.ts docs/audits/EX9-reaudit/EX9-024.md` | **PASS** |
| `rg -n 'security:.*BT1-00[1-8]|deck:.*BT1-00[1-8]|advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger' apps/api/src/cards/EX9/EX9-024.test.ts` | **PASS — no forbidden fixture or injected timing matches** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-024.ts`: unchanged; existing IR is faithful and registers exclusively through `registerIrCard`.
- `apps/api/src/cards/EX9/EX9-024.test.ts`: replaced two injected timing proofs with public play and public BT7-062→BT7-064 evolution; replaced Digi-Egg hand fillers with inert BT1-012 and labeled Q4776 coverage.
- `docs/audits/EX9-reaudit/EX9-024.md`: this report.
- No EX9-024 engine seam or Q&A gap remains. No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Concurrent worktree changes are outside this card's scope.

### EX9-025 — Airdramon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-025`, Airdramon), a Yellow level-4 Digimon with `[Mythical Beast]/[DM]/[Ver.1]` traits, play cost 5, and 5,000 DP.
- Printed evolution: `[Digivolve] Lv.3 w/[DM] trait: Cost 2`.
- Printed effects: `＜Training＞`; `[When Attacking] [Once Per Turn]` may place the deck's top card face down as this Digimon's bottom digivolution card, then give one opposing Digimon `-2000 DP` for the turn for each of this Digimon's face-down digivolution cards.
- Printed inherited effect: `＜Barrier＞`.
- Local KB: `node tools/kb/query.mjs card EX9-025` → Q4778.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4778 | Verified. The attack effect selects exactly one opposing Digimon; with two legal opposing targets, exactly one reaches 3,000 DP while the other remains at 5,000 DP. | Real player attack with two opposing Digimon at `EX9-025.test.ts:62-89`; the IR target has `count: 1` at `EX9-025.ts:25-31`. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Lv.3 with `[DM]` trait, cost 2 | `EX9-025.ts:76-83`, alternate `digivolutionRequirement` with `level: 3`, `traits: ["DM"]`, and `cost: 2` | The inherited Barrier test performs a legal EX9-025 → BT1-057 evolution and verifies the stack and memory payment at `EX9-025.test.ts:121-145`. |
| `＜Training＞` | `EX9-025.ts:9-19`, static keyword entry | Structural assertion at `EX9-025.test.ts:9-13`. |
| `[When Attacking] [Once Per Turn]` | `EX9-025.ts:21-61`, `WhenAttacking` trigger with `frequency: "OncePerTurn"`, optional action, and bottom face-down stack cost | Structural assertion at `EX9-025.test.ts:14-26`; real attack pays the cost by moving the own deck top card face down at `:34-60` and `:62-89`. |
| Give one opposing Digimon `-2000 DP` for each face-down card for the turn | `EX9-025.ts:23-58`, opponent Digimon target with `count: 1`, `amount: -2000`, `duration: forTheTurn`, and scaling by `selfFaceDownDigivolutionCards` | One-target real attack reaches 3,000 DP at `EX9-025.test.ts:34-60`; Q4778's two-target proof confirms no multi-target reduction at `:62-89`. |
| Inherited `＜Barrier＞` | `EX9-025.ts:62-72`, inherited static keyword entry | Real opponent attack prompts Barrier; accepting sends the host to security and declining sends it to trash, both with correct stack handling at `EX9-025.test.ts:121-168`. |

#### Peer / stack proof

- The attack cost uses the attacking owner's deck: a non-empty own deck moves its top card face down under Airdramon, while an empty own deck leaves the optional effect unavailable and does not consume the opponent's deck (`EX9-025.test.ts:91-119`).
- Q4778 uses two legal opposing Digimon and attacks the opponent player, avoiding combat deletion so both post-effect DP values remain observable.
- The inherited Barrier flow is exercised after a real legal evolution, with both acceptance and decline branches.
- The former Digi-Egg security fixture was replaced with inert main-deck BT1-009; no Digi-Egg or injected timing helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-025` | PASS — Q4778 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-025.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 7 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/effects/modifiers.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 35 tests. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-025.ts apps/api/src/cards/EX9/EX9-025.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-025.ts apps/api/src/cards/EX9/EX9-025.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-025.ts apps/api/src/cards/EX9/EX9-025.test.ts docs/audits/EX9-reaudit/EX9-025.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-025.ts apps/api/src/cards/EX9/EX9-025.test.ts` | PASS — no injected timing helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-025-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-025", compiled)`. Q4778 has direct multi-target behavioral proof; no remaining card-local gap is known.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-026 — Angemon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The colocated suite now has exact structural assertions for both triggered effects and the inherited recovery condition, public play/evolution/Training routes, optional refusal, duration expiry, and inert main-deck Digimon in all deck/security fixtures.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-026` Angemon, yellow level-4 Digimon, play cost 5, 5000 DP, `Angel/DM/Ver.2` traits.
- Alternate evolution: level 3 with `[DM]` trait, cost 2.
- Printed keyword/effects: `＜Training＞`; `[On Play] [When Digivolving]` by placing 1 card in hand face down as this Digimon's bottom digivolution card, give 1 opposing Digimon `＜Security A. -1＞` and `-3000 DP` until their turn ends.
- Printed inherited effect: `[On Deletion]` if you have 3 or fewer security cards, `＜Recovery +1 (Deck)＞`.
- Local KB query: `node tools/kb/query.mjs card EX9-026` → no knowledge-base entries and no card-specific Q&A.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects and stacked cards); `comprehensive-0076`/`0077` (face-down and digivolution cards); `comprehensive-0125`/`0126` (digivolution procedure); `comprehensive-0143`/`0144` and `0173` (attack/trigger timing); `comprehensive-0176` (effect activation); `comprehensive-0260` (Training); `glossary-0007` (turn terminology).

#### Q&A ledger

No EX9-026-specific Q&A entries were returned by the local KB. Q&A coverage is therefore **N/A**, with no unresolved card-specific ruling gap identified.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate `[Digivolve] Lv.3 w/[DM] trait: Cost 2` | `digivolutionRequirement: [{ level: 3, traits: ["DM"], cost: 2, isAlternate: true }]` at `EX9-026.ts:126-133` | Structural assertion and public legal EX9-008 → EX9-026 evolution at `EX9-026.test.ts:41-46`, `:125-167`; normal level-3 evolution and an invalid alternate base are also checked at `:9-39`. |
| `＜Training＞` | Static `Training` keyword at `EX9-026.ts:10-19` | Structural assertion plus public `observe(...).activatableEffects`/`activateEffect` route suspends the stacked source and places the deck top face down at stack bottom (`EX9-026.test.ts:191-225`). |
| On Play and When Digivolving cost | Both triggers carry a `ModifyDP` action with a hand `place` cost, bottom `digivolutionStack` destination, `host: "self"`, `faceDown: true`, and optional abort-on-decline at `EX9-026.ts:21-58`, `:62-101` | Public play pays BT1-090 into the source stack before resolving the effect (`EX9-026.test.ts:91-123`); public alternate evolution pays the same cost under the newly evolved host (`:125-167`); refusal preserves the hand card and target (`:227-247`). |
| Give 1 opposing Digimon `＜Security A. -1＞` and `-3000 DP` | `ModifyDP`, opponent Digimon filter, `count: 1`, `amount: -3000`, `alsoGainKeywords: SecurityAttack -1` at `EX9-026.ts:24-40`, `:65-81` | Positive play and evolution fixtures use two opposing Digimon and prove only the selected target reaches 2000 DP and `SecurityAttack -1`; the other remains at 5000 DP and 0 (`:91-123`, `:125-167`). |
| Until their turn ends | `duration: "untilOpponentTurnEnd"` at `EX9-026.ts:33`, `:74` | During the opponent's public attack, target remains reduced; after that turn completes, DP returns to 5000 and Security Attack returns to 0 (`EX9-026.test.ts:169-188`). |
| Inherited `[On Deletion]` recovery at 3 or fewer security | Inherited `OnDeletion` `SecurityManipulation addTop`, source deck, amount 1, `zoneCount` security `lte 3` at `EX9-026.ts:103-122` | Structural condition assertion at `EX9-026.test.ts:71-85`; real deletion with three security recovers the deck top to four, while four security leaves the deck untouched (`:249-277`). |

The module registers exclusively with `registerIrCard("EX9-026", compiled)` at `EX9-026.ts:136`; there is no legacy duplicate registration.

#### Behavioral and peer/stack proof

- Public On Play route resolves the hand-card cost, face-down stack placement, one-target DP reduction, and Security Attack -1 while leaving a second opposing Digimon unchanged (`EX9-026.test.ts:91-123`).
- Public alternate evolution route uses EX9-008, a legal level-3 DM host, pays the printed 2 memory and hand-card cost, resolves the same effect, then checks the exact stack identity and duration expiry (`:125-188`).
- Normal level-3 evolution is accepted and a non-DM alternate base is rejected with memory/hand/stack assertions (`:9-39`).
- Training is activated through public effect observation/activation on an EX9-026 stack, suspends the source, places a main-deck Digimon face down at stack bottom, and leaves the next deck card on top (`:191-225`).
- Optional refusal is resolved publicly: no face-down cost, no target modification, and the payable hand card remains (`:227-247`).
- Inherited recovery is proven through production deletion behavior at both sides of the 3-security threshold (`:249-277`).
- All deck/security fixtures use inert main-deck Digimon; no Digi-Egg ids occur. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper is used. `advance.verb.deletePermanent` is used only to invoke the real deletion route for the inherited effect.
- Peer mechanism: EX9-025, EX9-022, and EX9-008 focused suites passed 25/25 and independently cover ModifyDP/Security Attack duration, Training, and DM alternate-evolution behavior; the modifiers engine regression passed 35/35.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-026` | **PASS** — no knowledge-base entries; no Q&A ids. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-026.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 10 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-025.test.ts src/cards/EX9/EX9-022.test.ts src/cards/EX9/EX9-008.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 3 files, 25 tests** (duration/Training/DM-evolution peers) |
| `pnpm --filter @aegis/api exec vitest run src/engine/effects/modifiers.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 35 tests** |
| `pnpm typecheck` | **PASS** — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-026.ts apps/api/src/cards/EX9/EX9-026.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-026.ts apps/api/src/cards/EX9/EX9-026.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-026.ts apps/api/src/cards/EX9/EX9-026.test.ts docs/audits/EX9-reaudit/EX9-026.md` | **PASS** |
| `rg -n 'security:.*BT1-00[1-8]|deck:.*BT1-00[1-8]|advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger|DBG|console\\.log' apps/api/src/cards/EX9/EX9-026.ts apps/api/src/cards/EX9/EX9-026.test.ts` | **PASS — no forbidden fixtures, injected timing, or debug output.** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-026.ts`: unchanged; existing full-coverage IR is faithful and registers exclusively with `registerIrCard`.
- `apps/api/src/cards/EX9/EX9-026.test.ts`: strengthened exact IR/condition assertions and replaced Option fixtures in deck/security with inert main-deck BT1-009 while retaining intentional BT1-090 hand-payment fixtures.
- `docs/audits/EX9-reaudit/EX9-026.md`: this report.
- No EX9-026-specific implementation, engine, or Q&A gap is known. Delivery gates remain coordinator-owned and are not claimed by this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-027 — Kokeshimon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-027`, Kokeshimon), a Yellow/Purple level-4 Digimon with `[Puppet]/[LIBERATOR]` traits, play cost 4, and 4,000 DP.
- Printed evolution: one level 3 with `[Puppet]` trait for cost 2 (plus the catalog's ordinary color routes).
- Printed effects: `[When Digivolving]` and `[On Deletion]` may trash one card from hand to give one opposing Digimon `-4000 DP` for the turn; inherited `[Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, by deleting 1 of your other Digimon, end that attack.`
- Local KB: `node tools/kb/query.mjs card EX9-027` → Q4779–Q4781.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4779 | Verified. If the required other Digimon cannot be deleted, the “by deleting” condition is not met and the attack is not ended. | The fodder is protected from deletion; the opponent's attack still succeeds and security is checked at `EX9-027.test.ts:46-91`. |
| Q4780 | Verified. A successful effect transitions directly to End of Attack before the security check; it does not proceed through a successful attack result. | Real opponent attack deletes the fodder, leaves security unchanged, and leaves no pending attack decision at `EX9-027.test.ts:279-309`. |
| Q4781 | Verified. The effect ends an attack by an attacker immune to effects because it changes timing rather than affecting that attacker. | EX5-074 is asserted immune, then its real attack is ended by the inherited effect at `EX9-027.test.ts:93-124`. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Level 3 `[Puppet]` evolution for cost 2 | `EX9-027.ts:103-110`, alternate `digivolutionRequirement` with `level: 3`, `traits: ["Puppet"]`, and cost 2 | Route matrix at `EX9-027.test.ts:234-277` covers legal Puppet and non-Puppet routes, ordinary color routes, and rejected non-legal evolution. |
| When Digivolving: trash one hand card, then give one opposing Digimon -4000 DP for the turn | `EX9-027.ts:11-39`, opponent Digimon target `count: 1`, `amount: -4000`, hand trash cost, optional/abort-on-decline | Structural proof at `EX9-027.test.ts:165-178`; real evolution trashes the hand card, reduces exactly one of two opposing Digimon, and the modifier expires after turn progression at `:192-232`. |
| On Deletion: same hand-costed -4000 DP effect | `EX9-027.ts:41-69`, `OnDeletion` action mirrors the When Digivolving clause | Acceptance and decline branches at `EX9-027.test.ts:311-330` prove the hand cost is paid only when accepted and the target returns to base DP after the turn. |
| Inherited Opponent's Turn once-per-turn attack-ending effect | `EX9-027.ts:71-99`, `OpponentsTurn` → `SubTrigger whenOpponentAttacks` → optional `EndAttack` with `deleteOwn`, `excludeSelf`, and `frequency: OncePerTurn` | Q4779, Q4780, Q4781, and the two-attack once-per-turn test use real attack intents at `EX9-027.test.ts:46-163` and `:279-309`. |

#### Peer / stack proof

- Q4779 uses a real deletion restriction on the other Digimon; the attack reaches security because the cost condition cannot be paid.
- Q4780 uses a legal fodder Digimon and verifies the security count remains unchanged after the inherited effect pays its deletion cost.
- Q4781 uses EX5-074, a real effect-immune attacker, and verifies that timing transition still ends its attack.
- Once-per-turn behavior is proven with two attacks during one opponent turn: the first consumes the fodder and ends, while the second proceeds to security (`EX9-027.test.ts:126-163`).
- Hand-costed When Digivolving and On Deletion effects, their one-target DP modifiers, duration expiry, and evolution routes are covered with real intents and legal main-deck fixtures.
- No Digi-Egg fixture or forbidden injected timing helper (`advance.fire`, `fireTiming`, or `fireSubTrigger`) is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-027` | PASS — Q4779–Q4781 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-027.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 15 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/combat/controller.test.ts src/engine/cards/combatRestrictCluster.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 2 files, 40 tests. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-027.ts apps/api/src/cards/EX9/EX9-027.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-027.ts apps/api/src/cards/EX9/EX9-027.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-027.ts apps/api/src/cards/EX9/EX9-027.test.ts docs/audits/EX9-reaudit/EX9-027.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-027.ts apps/api/src/cards/EX9/EX9-027.test.ts` | PASS — no forbidden injected timing helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-027-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-027", compiled)`. Q4779–Q4781 each have direct real-intent behavioral proof; no remaining card-local gap is known.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-028 — Nanimon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-028`, Nanimon), a Yellow level-4 Digimon with `[Invader]/[DM]/[Ver.4]` traits, play cost 3, and 3,000 DP.
- Printed evolution: `[Digivolve] Lv.3 w/[DM] trait: Cost 2`.
- Printed effects: `[End of Your Turn] [Once Per Turn]` may digivolve into a `[Ver.4]` Digimon card from hand or trash by placing 3 `[Ver.4]` Digimon cards from trash face down as this Digimon's bottom digivolution cards; inherited `[Your Turn]` gives all opposing Security Digimon `-3000 DP`.
- Local KB: `node tools/kb/query.mjs card EX9-028` → Q4782.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4782 | Verified. With only two eligible `[Ver.4]` cards in trash, the three-card “by doing” cost cannot be partially paid: no cards move, no evolution occurs, and Nanimon remains unchanged. | Real End-of-Your-Turn turn path at `EX9-028.test.ts:255-274`; the cost requires `count: 3` at `EX9-028.ts:39-61`. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Lv.3 `[DM]` evolution for cost 2 | `EX9-028.ts:82-89`, alternate `digivolutionRequirement` with level 3, `[DM]`, and cost 2 | Route matrix at `EX9-028.test.ts:131-159` covers legal ordinary, legal alternate, and rejected non-DM alternate routes. |
| End of Your Turn once-per-turn effect | `EX9-028.ts:15-66`, `EndOfYourTurn`, `frequency: "OncePerTurn"`, optional self Digivolve action | Structural proof at `EX9-028.test.ts:53-70`; real production turn execution at `:17-51`, `:71-114`, `:161-197`, and `:199-221`. |
| Place exactly 3 `[Ver.4]` Digimon cards from trash face down under this Digimon | `EX9-028.ts:39-61`, trash-only `[Ver.4]` Digimon target, `count: 3`, `from: ["trash"]`, `destination: digivolutionStack`, `position: bottom`, `faceDown: true`, `host: self` | Three eligible cards are moved face down under Nanimon in the real turn cases at `EX9-028.test.ts:17-51` and `:161-197`; the Q4782 insufficient-source case at `:255-274` proves no partial movement. |
| Digivolve into one `[Ver.4]` Digimon from hand or trash and pay its printed cost | `EX9-028.ts:18-38`, self target, `[Ver.4]` trait filter, `from: ["hand", "trash"]`, `payCost: true` | Hand route, memory payment, stack, and zones are proven at `EX9-028.test.ts:17-51`; trash route at `:161-197`. |
| Inherited Your Turn: opposing Security Digimon get -3000 DP | `EX9-028.ts:67-78`, inherited `YourTurn` `ModifySecurityDP`, opponent controller, amount -3000, permanent duration | Live ledger observes the opposing Security-Digimon reduction at `EX9-028.test.ts:121-129`; a real security battle and expiry across the turn boundary are covered at `:223-253`. |

#### Peer / stack proof

- The End-of-Your-Turn effect is driven through the production `runOneTurn`/main-phase path rather than direct timing injection (`EX9-028.test.ts:8-14`), so the Q4782 cost is evaluated at the real timing.
- Hand and trash destinations for the `[Ver.4]` evolution are both exercised, with all three placed cards face down at the bottom of the stack.
- The Q4782 fixture contains exactly two eligible `[Ver.4]` cards plus one ineligible Digimon; none are moved and the optional evolution cannot proceed.
- The inherited Security-Digimon modifier is observed in the ledger and in a real security battle, then removed after the owner's turn.
- All deck/security fixtures are legal main-deck cards; no Digi-Egg fixture or forbidden direct timing helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-028` | PASS — Q4782 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-028.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 12 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/turnEndHarness.test.ts src/engine/effects/modifiers.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 2 files, 39 tests. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-028.ts apps/api/src/cards/EX9/EX9-028.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-028.ts apps/api/src/cards/EX9/EX9-028.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-028.ts apps/api/src/cards/EX9/EX9-028.test.ts docs/audits/EX9-reaudit/EX9-028.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-028.ts apps/api/src/cards/EX9/EX9-028.test.ts` | PASS — no direct timing-fire helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-028-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-028", compiled)`. Q4782 has direct real-turn insufficient-source proof; no remaining card-local gap is known.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-029 — Unimon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The colocated tests prove both recovery triggers, the shared Once Per Turn budget, Training, the inherited DP reduction, public evolution/attack routes, and Q4783's condition-versus-cost distinction.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-029` (Unimon), yellow level-4 Digimon, play cost 4, 4000 DP, `Mythical Beast/DM/Ver.3` traits.
- Evolution requirements: normal level 3 yellow cost 2; alternate level 3 with `[DM]` trait, cost 2.
- Main effects: `＜Training＞`; `[When Digivolving] [When Attacking] [Once Per Turn]` by placing 1 hand card face down as this Digimon's bottom digivolution card, if your security count is at most this Digimon's face-down digivolution-card count, `＜Recovery +1 (Deck)＞`.
- Inherited effect: `[When Attacking] [Once Per Turn] 1 of your opponent's Digimon gets -2000 DP for the turn.`
- Local KB query: `node tools/kb/query.mjs card EX9-029` → **Q4783**.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects and stacked cards); `comprehensive-0076`/`0077` (face-down and digivolution cards); `comprehensive-0125`/`0126` (digivolution procedure); `comprehensive-0143`/`0144` and `comprehensive-0173` (attack and trigger timing); `comprehensive-0170` (optional processing); `comprehensive-0260` (Training); `glossary-0007` (Once Per Turn).

#### Q&A ledger

| Q&A | Coverage | Evidence |
| --- | --- | --- |
| Q4783 | Verified | `EX9-029.test.ts:233-262` starts with three security cards and one existing face-down source, pays the hand-card placement to reach two face-down sources, and proves the deck top is not recovered because security (3) exceeds the post-cost source count (2). The placement cost still succeeds, matching the ruling. |

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate level-3 `[DM]` evolution, cost 2 | `level: 3`, `traits: ["DM"]`, `cost: 2`, `isAlternate: true` at `EX9-029.ts:119-126` | Public normal route from BT1-048 and invalid alternate route from non-DM BT1-009 at `EX9-029.test.ts:9-40`; legal Ver.3 DM alternate stack and recovery at `:149-182`. |
| `＜Training＞` | Static self `GainKeyword` with permanent duration at `EX9-029.ts:11-30` | Structural assertion and public `observe(...).activatableEffects`/`activateEffect` route at `EX9-029.test.ts:41-58` and `:118-147`; source suspends and places the unrevealed deck top face down at stack bottom. |
| Shared Once Per Turn When Digivolving / When Attacking recovery | Each trigger uses `frequency: "OncePerTurn"`, shared key `ir-shared-0`, hand placement cost, face-down bottom position, and `SecurityManipulation op: "addTop"` at `EX9-029.ts:31-63` and `:64-96` | Public digivolution recovery at `EX9-029.test.ts:149-182`; cross-trigger budget test at `:184-231` proves When Digivolving consumes the attack opportunity and preserves the second payment card/deck top. |
| Place 1 hand card face down as this Digimon's bottom digivolution card | Both costs filter own hand count 1 and encode `destination: "digivolutionStack"`, `position: "bottom"`, `host: "self"`, `faceDown: true` at `EX9-029.ts:39-53` and `:72-86` | Attack positive route at `EX9-029.test.ts:65-92`; digivolution route at `:149-182`; declined attack route preserves hand, stack, and deck at `:94-116`. |
| If security count is at most this Digimon's face-down count, Recovery +1 (Deck) | Both actions gate only the post-cost recovery with `postCostCondition: { kind: "securityAtMostSelfFaceDownDigivolutionCards" }` at `EX9-029.ts:54-58` and `:87-89`; `addTop` adds one deck card | Positive recovery moves deck top to security at `EX9-029.test.ts:149-182` and `:184-231`; Q4783 proves the placement cost is still payable when the condition is false and no deck card moves at `:233-262`. |
| Inherited `[When Attacking] [Once Per Turn]` opponent Digimon -2000 for the turn | Inherited `WhenAttacking` `ModifyDP`, opponent Digimon target count 1, amount -2000, `duration: "forTheTurn"`, frequency OncePerTurn at `EX9-029.ts:97-115` | Two real attacks prove only the first applies the -2000 modifier and the effect expires after the owner's turn at `EX9-029.test.ts:264-298`. |

The module registers only `registerIrCard("EX9-029", compiled)` at `EX9-029.ts:129`; there is no legacy duplicate registration.

#### Behavioral and peer/stack proof

- Public evolution proof covers normal cost 2, invalid non-DM alternate rejection, legal Ver.3 DM alternate recovery, stack identity, memory, and final zones.
- Public Training proof uses the observable activation route and verifies suspension, hidden stack placement, and deck consumption.
- Recovery proof covers both trigger routes, hand payment, face-down bottom placement, deck-to-security ordering, optional refusal, condition false after payment, and shared Once Per Turn enforcement.
- Inherited behavior is verified across two real attacks with opponent Digimon DP and expiration at the next owner turn.
- Q4783 is directly mapped to a positive placement/no-recovery boundary. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper is used.
- Fixtures contain no Digi-Egg ids in deck or security; all deck/security cards are inert main-deck Digimon.
- Peer mechanism: EX9-026 focused suite passed 10/10 and independently exercises Training, hand-to-stack placement, SecurityManipulation recovery, public digivolution, optional refusal, and deck/security boundaries.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-029.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 11 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-026.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 10 tests** (Training/SecurityManipulation peer regression) |
| `pnpm typecheck` / `pnpm --filter @aegis/api exec tsc --noEmit -p tsconfig.json` | **PASS** — shared, web, and API typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-029.ts apps/api/src/cards/EX9/EX9-029.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-029.ts apps/api/src/cards/EX9/EX9-029.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-029.ts apps/api/src/cards/EX9/EX9-029.test.ts docs/audits/EX9-reaudit/EX9-029.md` | **PASS** |
| `rg -n 'security:.*BT1-00[1-8]|deck:.*BT1-00[1-8]|advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger' apps/api/src/cards/EX9/EX9-029.test.ts` | **PASS — no forbidden fixture or injected timing matches** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-029.ts`: unchanged; existing IR is faithful and registers exclusively through `registerIrCard`.
- `apps/api/src/cards/EX9/EX9-029.test.ts`: labeled the Q4783 proof explicitly; no implementation or fixture correction was otherwise required.
- `docs/audits/EX9-reaudit/EX9-029.md`: this report.
- No EX9-029 engine seam or Q&A gap remains. No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Concurrent worktree changes are outside this card's scope.

### EX9-030 — Andromon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The colocated suite now proves Q4784 through real free-play routes, uses public play/evolution intents for On Play and When Digivolving behavior, verifies the exact replacement and scaling IR, and removes injected timing and Digi-Egg fixtures.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-030` Andromon, yellow/black level-5 Digimon, play cost 7, 7000 DP, `Cyborg/DM/Ver.3` traits.
- Alternate evolution: level 4 with `[Machine]/[DM]` trait, cost 3.
- Printed replacement: when this card would be played, by trashing 1 `[Cyborg]` or `[Ver.3]` trait card from hand, reduce the play cost by 2.
- Printed triggered effect: `[On Play] [When Digivolving]` by placing 1 Digimon card from trash face down as this Digimon's bottom digivolution card, give 1 opposing Digimon `-3000 DP` until their turn ends; it further gets `-2000 DP` for each of this Digimon's face-down digivolution cards.
- Printed inherited effect: `＜Blocker＞`.
- Local KB query: `node tools/kb/query.mjs card EX9-030` → `Q4784`.
- Q&A: `Q4784` (2025-06-13): when this card is played without paying its cost, its first effect may still trash the specified hand card; the play remains free.
- Supplemental cross-card test note: the existing Psychemon interaction test documents `Q4443`; it verifies that a play-cost reduction is nullified by a prohibition while the reducer's hand cost may still be paid. This is not returned by the EX9-030 KB query.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects and stacked cards); `comprehensive-0076`/`0077` (face-down and digivolution cards); `comprehensive-0125`/`0126` (digivolution procedure); `comprehensive-0167`/`0170`/`0173` (would-play replacement, optional processing, and trigger timing); `comprehensive-0176` (effect activation); and turn-duration rules for effects ending at the opponent's turn.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4784 | Verified. A free play from security or an effect can still accept Andromon's optional hand-trash replacement cost; no memory is paid, and the selected hand card is placed face down under Andromon. | `EX9-030.test.ts:8-24` exercises both face-up and face-down security play; `:204-225` exercises effect-driven free play with the same payment. |

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate `[Digivolve] Lv.4 w/[Machine]/[DM] trait: Cost 3` | `digivolutionRequirement: [{ level: 4, traits: ["Machine", "DM"], cost: 3, isAlternate: true }]` at `EX9-030.ts:178-185` | Exact structural assertion at `EX9-030.test.ts:116-119`; legal yellow BT1-051 → EX9-030 evolution pays 4 through the normal yellow cost, while the public EX9-026 → EX9-030 scaling route explicitly selects the alternate cost (`:25-62`, `:273-319`). |
| Would-play reduction by 2 by trashing one `[Cyborg]` or `[Ver.3]` hand card | Static self `Replacement`, nested `wouldBePlayed` `reduceCost`, amount 2, exact hand/controller/trait filter, optional abort-on-decline at `EX9-030.ts:11-47` | Exact structural assertion at `EX9-030.test.ts:84-115`; paid EX9-030 routes with EX9-023 and BT1-024 each pay 5 memory and place the payment face down (`:178-202`); refusal preserves the hand card (`:64-83`). |
| Q4784: replacement remains usable during a free play | Same self replacement is consulted by the production free-play route | Security `playFromSecurity` with both face-up and face-down source states accepts the replacement without memory payment (`EX9-030.test.ts:8-24`); effect-driven `playInstances` repeats the free route with exact hand/stack assertions (`:204-225`). |
| On Play / When Digivolving place 1 own-trash Digimon face down at this stack's bottom | Both triggers carry `ModifyDP` with optional `place` cost from own trash, `kind: Digimon`, destination `digivolutionStack`, `position: bottom`, `host: self`, `faceDown: true` at `EX9-030.ts:51-83`, `:108-140` | Public hand play moves BT1-009 from trash face down under EX9-030 (`:156-176`); public EX9-026 → EX9-030 evolution moves BT1-021 underneath the evolved stack (`:273-319`). |
| Give one opposing Digimon `-3000 DP` until their turn ends | First action on each trigger targets one opposing Digimon, amount `-3000`, duration `untilOpponentTurnEnd` at `EX9-030.ts:54-63`, `:111-120` | On Play and When Digivolving routes reduce only the selected target; the independent opposing Digimon remains unchanged (`:156-176`, `:273-319`). |
| Further give that same target `-2000 DP` per face-down digivolution card | Second `ModifyDP` action has `sameTarget: true`, amount `-2000`, duration `untilOpponentTurnEnd`, and `scaling.unit: "digivolutionCards"` with `faceDown: true` at `EX9-030.ts:84-104`, `:141-161` | Public evolution with one pre-existing face-down card plus the newly placed card reaches 3000 DP from 10000; the untargeted Digimon remains 10000 and the source remains 7000 (`EX9-030.test.ts:273-319`). |
| Until their turn ends | Both reductions use `duration: "untilOpponentTurnEnd"` | The evolved target stays at 5000 through the current turn, then returns from 5000/temporary effect state to 10000 after the opponent turn (`EX9-030.test.ts:25-62`). |
| Inherited `＜Blocker＞` | Inherited static keyword `{ keyword: "Blocker" }` at `EX9-030.ts:164-174` | Structural inherited-keyword assertion at `EX9-030.test.ts:150-154`; the card's legal evolution-stack identity is also checked in the public evolution routes. |

The module registers exclusively with `registerIrCard("EX9-030", compiled)` at `EX9-030.ts:188`; there is no legacy duplicate registration.

#### Behavioral and peer/stack proof

- Q4784 security route: both face-up and face-down EX9-030 security cards are played without memory payment, accept the optional EX9-023 hand payment, and place that card face down under Andromon (`EX9-030.test.ts:8-24`).
- Q4784 effect route: production `playInstances` free-plays EX9-030 from hand, accepts the same replacement payment, and leaves memory unchanged (`:204-225`).
- Paid replacement route: EX9-023 (Ver.3) and BT1-024 (Cyborg) each reduce the normal play cost by exactly 2 and are placed face down under the played card (`:178-202`).
- Public On Play route places a trash Digimon face down and reduces one opposing Digimon by 3000 (`:156-176`). Public When Digivolving route uses EX9-026 as a legal DM level-4 host, proves two face-down cards scale the same selected target by an additional 4000, and proves expiry after the opponent turn (`:273-319`).
- Optional decline leaves both the payment card and opposing DP unchanged (`:64-83`). The imminent EX9-030 card itself cannot be consumed as its own hand cost in paid or free routes (`:227-243`).
- The supplemental Psychemon/Q4443 scenario covers reduction prohibition and payment-cost ordering (`:245-271`).
- All deck/security fixtures use main-deck Digimon; no Digi-Egg ids occur. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper remains. `advance.verb.playFromSecurity`, `playInstances`, and `runTurn` invoke production play/turn routes rather than injected card timing.
- Peer mechanisms: EX9-003 and EX9-025 focused suites passed 14/14; replacement/play engine regressions passed 35/35.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-030` | **PASS** — Q4784 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-030.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 18 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-003.test.ts src/cards/EX9/EX9-025.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 2 files, 14 tests** (DM evolution and DP-duration peers) |
| `pnpm --filter @aegis/api exec vitest run src/engine/actions/playCard.test.ts src/engine/passivePlayCostReduction.test.ts src/engine/playReductionProhibition.test.ts src/engine/replacementRecomputeBarrier.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 4 files, 35 tests** |
| `pnpm typecheck` | **PASS** — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-030.ts apps/api/src/cards/EX9/EX9-030.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-030.ts apps/api/src/cards/EX9/EX9-030.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-030.ts apps/api/src/cards/EX9/EX9-030.test.ts docs/audits/EX9-reaudit/EX9-030.md` | **PASS** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-00[1-8]|DBG|console\\.log' apps/api/src/cards/EX9/EX9-030.ts apps/api/src/cards/EX9/EX9-030.test.ts` | **PASS — no injected timing, Digi-Egg, or debug matches.** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-030.ts`: unchanged; existing full-coverage IR is faithful and uses exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-030.test.ts`: replaced both injected On Play timing proofs with public play/evolution routes, replaced the Digi-Egg face-down fixture with main-deck Digimon, and strengthened exact replacement/trigger/scaling assertions.
- `docs/audits/EX9-reaudit/EX9-030.md`: this report.
- No EX9-030-specific implementation, engine, or Q4784 gap is known. Delivery gates remain coordinator-owned and are not claimed by this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-031 — Etemon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-031`, Etemon), a Yellow level-5 Digimon with `[Puppet]/[DM]/[Ver.3]` traits, play cost 8, and 8,000 DP.
- Printed evolution: `[Digivolve] [Sukamon]: Cost 3`; `[Digivolve] Lv.4 w/[DM] trait: Cost 4`.
- Printed effects: Ver.3 Digimon that would digivolve into Etemon reduce the cost by 1 for each face-down digivolution card; `＜Security A. +1＞`; `[When Digivolving] [When Attacking] [Once Per Turn]` may trash this Digimon's bottom face-down digivolution card for `＜Recovery +1 (Deck)＞`; inherited `[All Turns] [Once Per Turn]` triggers when the security stack is removed and gives one opposing Digimon `-4000 DP` for the turn.
- Local KB: `node tools/kb/query.mjs card EX9-031` → Q4785 and Q4786.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4785 | Verified. With two face-down cards above one face-up card in the stack, the effect trashes the first face-down card from the bottom, leaving the face-up card and the other face-down card. | Real attack at `EX9-031.test.ts:217-254`; resulting stack is `[BT1-051 face-up, BT1-012 face-down]` and BT1-009 is in trash. |
| Q4786 | Verified. A Security effect resolves immediately first; then the turn player's triggered effect is activated before the inherited security-removal effect, which produces the defender's pending target decision. | Real security attack and event/memory ordering assertions at `EX9-031.test.ts:8-55`; the security suite also passes independently. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Sukamon cost 3 and level-4 `[DM]` cost 4 evolution routes | `EX9-031.ts:146-157`, independent alternate requirements `namesExact: ["Sukamon"]` cost 3 and level 4 `[DM]` cost 4 | Route matrix at `EX9-031.test.ts:57-90` covers legal Sukamon and DM routes and illegal near routes. |
| Ver.3 face-down-source cost reduction | `EX9-031.ts:11-46`, `wouldDigivolve` replacement scoped to own Ver.3 Digimon, reducing one per face-down digivolution card | Real Ver.3 evolution with two hidden sources reduces the printed cost by 2 at `EX9-031.test.ts:256-297`; mixed face-up/face-down and non-Ver.3 controls are covered at `:146-176`. |
| `＜Security A. +1＞` | `EX9-031.ts:48-57`, static `SecurityAttack` keyword amount 1 | Structural keyword assertion at `EX9-031.test.ts:178-185`; Q4786's real attack performs the security check and resolves the resulting security effects at `:8-55`. |
| When Digivolving / When Attacking once-per-turn Recovery +1 by trashing bottom face-down source | `EX9-031.ts:59-117`, both triggers share the once-per-turn key and trash exactly one self-hosted bottom face-down card before `SecurityManipulation addTop` from deck | Structural assertion at `EX9-031.test.ts:187-210`; Q4785 real attack proves bottom-face-down selection and recovery at `:217-254`, including deck-to-security movement and trash contents. |
| Inherited All Turns once-per-turn security-removal response | `EX9-031.ts:119-142`, inherited `whenSecurityRemoved` subtrigger, opponent Digimon target count 1, -4000 for the turn | Real security removal reduces an opposing Digimon to 1,000 DP at `EX9-031.test.ts:299-310`; two removals only apply once and expire at turn end at `:312-335`. |

#### Peer / stack proof

- Q4785 uses the exact stack shape required by the ruling: two face-down sources and one face-up source, with the bottom face-down source selected rather than the bottom card regardless of face-up status.
- Q4786 uses a real security attack with a Security effect, active-player check effects, and the inherited security-removal trigger; it asserts decision seat and memory-change order before resolving the inherited target.
- Both Recovery triggers share their once-per-turn key, and the real digivolve-plus-attack test confirms the second payable source is not consumed a second time.
- The inherited trigger is tested from both one and two security removals, with turn-duration expiry.
- Fixtures use legal main-deck cards; no Digi-Egg fixture or forbidden direct timing helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-031` | PASS — Q4785 and Q4786 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-031.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 15 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/securityTrashChoice.test.ts src/engine/effects/timingActivationGate.test.ts src/engine/deckCardTimingMatrix.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 3 files, 1,744 tests. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-031.ts apps/api/src/cards/EX9/EX9-031.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-031.ts apps/api/src/cards/EX9/EX9-031.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-031.ts apps/api/src/cards/EX9/EX9-031.test.ts docs/audits/EX9-reaudit/EX9-031.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-031.ts apps/api/src/cards/EX9/EX9-031.test.ts` | PASS — no direct timing-fire helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-031-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-031", compiled)`. Q4785 and Q4786 both have direct real-intent proof; no remaining card-local gap is known.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-032 — Karakurumon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The colocated suite now uses public play and evolution intents for the On Play/When Digivolving routes, while retaining targeted leave-cause checks for the inherited replacement's production boundaries.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-032` (Karakurumon), yellow/purple level-5 Digimon, play cost 7, 7000 DP, `Puppet/LIBERATOR` traits.
- Evolution requirements: normal level 4 yellow or purple cost 4; alternate level 4 with `[Puppet]` trait, cost 3.
- Main effect: `[On Play] [When Digivolving]` by deleting 1 of your Tokens or other `[Puppet]` trait Digimon, this Digimon may digivolve into a Digimon card with the `[Puppet]` trait in hand without paying the cost.
- Inherited effect: `[All Turns] [Once Per Turn]` when this Digimon would leave the battle area other than by your effects, by deleting 1 of your Tokens or other `[Puppet]` trait Digimon, prevent it from leaving.
- Local KB query: `node tools/kb/query.mjs card EX9-032` → **no knowledge-base entries**; no Q&A ids or ruling-specific gaps exist for this card.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects and stacked cards); `comprehensive-0076`/`0077` (digivolution-card identity); `comprehensive-0125`/`0126` (digivolution procedure); `comprehensive-0170` (optional processing); `comprehensive-0173` (trigger effects); `glossary-0007` (Once Per Turn).

#### Q&A ledger

No EX9-032 Q&A entries were returned by the committed local knowledge base. There are no Q&A ids or unresolved ruling gaps to report.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate level-4 `[Puppet]` evolution, cost 3 | `level: 4`, `traits: ["Puppet"]`, `cost: 3`, `isAlternate: true` at `EX9-032.ts:163-170` | Public normal EX9-027 route, valid off-color BT10-085 Puppet alternate, and invalid non-Puppet BT1-037 alternate route at `EX9-032.test.ts:24-56`, with stack, memory, hand, and pending-state assertions. |
| On Play and When Digivolving optional free digivolution | Both triggers target self, select a hand Digimon with exact `[Puppet]` trait, use `payCost: false`, and gate on `deleteOwn` cost at `EX9-032.ts:11-63` and `:65-117` | Structural exact-trait assertion at `EX9-032.test.ts:8-22`; public On Play with Puppet payment at `:90-114`; public On Play with Token payment at `:116-135`; hand-only Puppet negative at `:58-76`. |
| Delete 1 of your Tokens or other `[Puppet]` trait Digimon | Each delete cost is own controller, `excludeSelf: true`, count 1, and an OR of `isToken: true` or exact Puppet trait Digimon at `EX9-032.ts:35-60`, `:89-114`, and inherited `:130-154` | Puppet and Token positive routes delete only the payment permanent; a hand-only Puppet is not a legal payment. Inherited payment variants are exercised at `EX9-032.test.ts:137-180`. |
| Inherited All Turns Once Per Turn leave prevention | `AllTurns`, inherited, `frequency: "OncePerTurn"`, `Replacement` on `wouldLeavePlay`, `mode: "prevent"`, `leaveCause: "otherThanYourEffect"`, self source at `EX9-032.ts:119-159` | Structural assertion at `EX9-032.test.ts:77-88`; accepted battlefield payment prevents a battle leave for both Puppet and Token at `:137-180`; refusal and second-attempt exhaustion at `:182-250`. |
| Other-than-your-effect cause boundary | Replacement explicitly uses `leaveCause: "otherThanYourEffect"`; own-effect leaves bypass it, opponent-effect leaves are preventable, and hand-only payment cannot pay the battlefield replacement | Cause matrix at `EX9-032.test.ts:252-313` uses the engine's named leave-cause/effect-resolution verbs and asserts own-effect leave, opponent-effect leave, and hand-only payment outcomes. |

The module registers only `registerIrCard("EX9-032", compiled)` at `EX9-032.ts:173`; there is no legacy duplicate registration.

#### Behavioral and peer/stack proof

- Public play proof covers no eligible battlefield cost, Puppet payment, Token payment, free hand Puppet digivolution, and exact target trait filtering.
- Public evolution proof covers normal and alternate requirements, off-color Puppet acceptance, non-Puppet rejection, stack identity, memory cost, and final hand state.
- Inherited proof covers accepted leave prevention, optional refusal, Once Per Turn exhaustion across two leave attempts, Token/Puppet payment variants, and leave-cause boundaries.
- Fixtures contain no Digi-Egg ids in deck or security; token and Puppet fixtures are battlefield/hand cards only. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper is used. Privileged `advance.verb` calls are limited to named leave-cause/effect-resolution setup where no public intent supplies that cause.
- Peer mechanism: EX9-027 focused suite passed 15/15 and independently exercises public free Puppet digivolution, `deleteOwn` costs, protected leave prevention, optional refusal, Once Per Turn exhaustion, and leave-cause boundaries.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-032.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 12 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-027.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 15 tests** (deleteOwn/leave-prevention peer regression) |
| `pnpm typecheck` / `pnpm --filter @aegis/api exec tsc --noEmit -p tsconfig.json` | **PASS** — shared, web, and API typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-032.ts apps/api/src/cards/EX9/EX9-032.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-032.ts apps/api/src/cards/EX9/EX9-032.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-032.ts apps/api/src/cards/EX9/EX9-032.test.ts docs/audits/EX9-reaudit/EX9-032.md` | **PASS** |
| `rg -n 'security:.*BT1-00[1-8]|deck:.*BT1-00[1-8]|advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger|EffectTiming' apps/api/src/cards/EX9/EX9-032.test.ts` | **PASS — no forbidden fixture or injected timing matches** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-032.ts`: unchanged; existing IR is faithful and registers exclusively through `registerIrCard`.
- `apps/api/src/cards/EX9/EX9-032.test.ts`: replaced three injected On Play timing fires with public play intents; added normal/alternate evolution proof and exact Puppet target matching.
- `docs/audits/EX9-reaudit/EX9-032.md`: this report.
- No EX9-032 engine seam or Q&A gap remains. No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Concurrent worktree changes are outside this card's scope.

### EX9-033 — Kaguyamon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-033`, Kaguyamon), a Yellow/Purple level-6 Digimon with `[Puppet]/[LIBERATOR]` traits, play cost 12, and 12,000 DP.
- Printed evolution: `[Digivolve] Lv.5 w/[Puppet] trait: Cost 3`.
- Printed effects: all own Tokens and `[Puppet]` trait Digimon gain `＜Alliance＞` and `＜Blocker＞`; once per turn, when another Digimon is deleted, delete one opposing lowest-level Digimon; once per turn at the end of your turn, play one level 4 or lower `[Puppet]` Digimon from trash without paying its cost.
- Local KB: `node tools/kb/query.mjs card EX9-033` → no knowledge-base entries and no card-specific Q&A IDs.

#### Q&A ledger / gaps

No EX9-033 Q&A entries are present in the local KB. Accordingly, there are no Q&A IDs to claim or leave unresolved; the printed catalog clauses are covered directly below.

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Level 5 `[Puppet]` evolution for cost 3 | `EX9-033.ts:117-124`, alternate `digivolutionRequirement` with level 5, `[Puppet]`, and cost 3 | Existing route and real evolution coverage in `EX9-033.test.ts:10-36` (plus the surrounding evolution fixtures) and registry import; no illegal route is accepted by the module. |
| All own Tokens and `[Puppet]` Digimon gain Alliance and Blocker | `EX9-033.ts:11-56`, two `GainKeyword` actions scoped to own Token or Puppet Digimon, count all, permanent duration | Real continuous-ledger assertions at `EX9-033.test.ts:119-144` prove both keywords on own Puppet and Token, and absence on own non-Puppet and opposing Digimon. |
| Once per turn, another Digimon deletion deletes one opposing lowest-level Digimon | `EX9-033.ts:57-84`, `onDeletionOf` subtrigger with `excludeSelf`, opposing Digimon target, `superlative: lowestLevel`, count 1, frequency once per turn | Real own and opposing deletion tests at `EX9-033.test.ts:146-187`, plus two battle deletions in one turn at `:35-81`, prove one lowest-level target per trigger and no self-source deletion. |
| End of Your Turn once per turn plays one level 4-or-lower Puppet from trash for free | `EX9-033.ts:85-113`, `EndOfYourTurn`, level `lte 4`, Puppet filter, trash source, `PlayWithoutCost`, frequency once per turn | Real production turn path at `EX9-033.test.ts:17-33`; decline and level-5 rejection at `:189-205`; successful no-cost play at `:207-215`. |

#### Peer / stack proof

- End-of-Your-Turn play coverage now uses the production `runOneTurn`/main-phase path (`EX9-033.test.ts:8-14`), with legal deck cards preventing deck-out before the trigger.
- Own Puppet, own Token, own non-Puppet, opposing Puppet, and opposing non-Puppet scope boundaries are all observed through the live keyword ledger.
- Deletion handling covers own and opponent deletion sources, tied lowest-level selection, and two battle deletions during one turn.
- Optional trash play covers acceptance, decline, level restriction, and no-cost placement from trash.
- No Digi-Egg fixture or forbidden direct timing-fire helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-033` | PASS — confirms no KB entries for this card. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-033.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 10 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/combat/allianceDecision.test.ts src/engine/blockerProof.test.ts src/engine/effects/lastDeletedLevel.test.ts src/engine/effects/continuous.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 4 files, 46 tests. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-033.ts apps/api/src/cards/EX9/EX9-033.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-033.ts apps/api/src/cards/EX9/EX9-033.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-033.ts apps/api/src/cards/EX9/EX9-033.test.ts docs/audits/EX9-reaudit/EX9-033.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-033.ts apps/api/src/cards/EX9/EX9-033.test.ts` | PASS — no direct timing-fire helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-033-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-033", compiled)`. The KB has no EX9-033 Q&A entries, so there is no Q&A-specific evidence gap; all printed clauses have direct or structural coverage.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-034 — Kunemon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The colocated suite now proves the alternate evolution route, public Training activation, and inherited Piercing battle/security behavior with a legal main-deck security fixture.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-034` Kunemon, green level-3 Digimon, play cost 3, 1000 DP, `Larva/DM/Ver.3` traits.
- Alternate evolution: level 2 with `[DM]` trait, cost 0.
- Printed main effect: `＜Training＞`.
- Printed inherited effect: `＜Piercing＞`.
- Local KB query: `node tools/kb/query.mjs card EX9-034` → no knowledge-base entries and no card-specific Q&A.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects and stacks); `comprehensive-0076`/`0077` (face-down and digivolution cards); `comprehensive-0125`/`0126` (digivolution procedure); `comprehensive-0173`/`0176` (trigger and effect activation); `comprehensive-0225` (Piercing); `comprehensive-0260` (Training); and glossary level/turn terminology.

#### Q&A ledger

No EX9-034-specific Q&A entries were returned by the local KB. Q&A coverage is therefore **N/A**, with no unresolved card-specific ruling gap identified.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate `[Digivolve] Lv.2 w/[DM] trait: Cost 0` | `digivolutionRequirement: [{ level: 2, traits: ["DM"], cost: 0, isAlternate: true }]` at `EX9-034.ts:34-41` | Exact structural assertion at `EX9-034.test.ts:18-19`; public EX9-003 → EX9-034 evolution preserves memory and stack identity (`:21-40`). |
| `＜Training＞` | Static non-inherited keyword `{ keyword: "Training" }` at `EX9-034.ts:9-19` | Public `observe(...).activatableEffects` + `activateEffect` route suspends EX9-034, places the main-deck BT1-009 top card face down at stack bottom, and empties the deck (`EX9-034.test.ts:42-63`). |
| Inherited `＜Piercing＞` | Inherited static keyword `{ keyword: "Piercing" }` at `EX9-034.ts:21-30` | Real attack with EX9-034 under BT1-071 deletes the suspended target and performs the opponent's security check; the same attack without the inherited source leaves security untouched (`EX9-034.test.ts:65-89`). |

The module registers exclusively with `registerIrCard("EX9-034", compiled)` at `EX9-034.ts:44`; there is no legacy duplicate registration.

#### Behavioral and peer/stack proof

- Alternate evolution proof uses a public legal EX9-003 level-2 DM host, explicitly selects `useAlternateCost: true`, leaves memory unchanged, and checks the exact resulting stack (`EX9-034.test.ts:21-40`).
- Training proof uses public effect observation/activation, not injected timing; it verifies source suspension, face-down hidden state, bottom placement, and deck depletion (`:42-63`).
- Piercing proof compares inherited and non-inherited stack states across real attacks: both attacks delete the suspended opponent Digimon, but only the inherited route consumes the opponent's BT1-012 security card (`:65-89`).
- BT1-012 is an inert main-deck Digimon security fixture. No Digi-Egg appears in deck or security; EX9-004 is used only as an existing stack source for the Training test.
- No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper is used. No debug instrumentation is present.
- Peer mechanisms: EX9-008 and EX9-038 focused suites passed 23/23 and independently cover Training, alternate DM evolution, and inherited Piercing; engine Piercing/security conformance suites passed 44/44.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-034` | **PASS** — no knowledge-base entries; no Q&A ids. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-034.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 7 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-008.test.ts src/cards/EX9/EX9-038.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 2 files, 23 tests** (Training/Piercing peers) |
| `pnpm --filter @aegis/api exec vitest run src/engine/conformance/ch16a-security-blocker-draw.test.ts src/engine/interactionAudit.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 2 files, 44 tests** (Piercing/security regressions) |
| `pnpm typecheck` | **PASS** — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-034.ts apps/api/src/cards/EX9/EX9-034.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-034.ts apps/api/src/cards/EX9/EX9-034.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-034.ts apps/api/src/cards/EX9/EX9-034.test.ts docs/audits/EX9-reaudit/EX9-034.md` | **PASS** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-00[1-8]|DBG|console\\.log' apps/api/src/cards/EX9/EX9-034.ts apps/api/src/cards/EX9/EX9-034.test.ts` | **PASS — no injected timing, Digi-Egg, or debug matches.** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-034.ts`: unchanged; existing full-coverage IR is faithful and uses exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-034.test.ts`: added exact alternate-evolution assertion and public evolution proof; replaced the Digi-Egg security fixture with BT1-012.
- `docs/audits/EX9-reaudit/EX9-034.md`: this report.
- No EX9-034-specific implementation, engine, or Q&A gap is known. Delivery gates remain coordinator-owned and are not claimed by this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-035 — Palmon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-035`, Palmon), a Green level-3 Digimon with `[Vegetation]/[DM]/[Ver.4]` traits, play cost 3, and 1,000 DP.
- Printed evolution: `[Digivolve] Lv.2 w/[DM] trait: Cost 0`.
- Printed effects: `[On Play]` reveal the top 3 cards, add one `[DM]` card to hand, place one `[Ver.4]` card face down as the bottom digivolution card of any own `[DM]` Digimon, and return the rest to the bottom of the deck; inherited `[When Attacking] [Once Per Turn]` suspends one opposing Digimon.
- Local KB: `node tools/kb/query.mjs card EX9-035` → Q4787.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4787 | Verified. When the only revealed card is both `[DM]` and `[Ver.4]`, it must first be chosen for the required hand addition; it is not available for placement under a Digimon, and the other revealed cards return to deck bottom. | Real play from hand at `EX9-035.test.ts:49-77`: Palmon enters hand only through the normal draw setup, the DM/Ver.4 reveal is added to hand, no source is placed under the host, and deck order is preserved. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Level 2 `[DM]` evolution for cost 0 | `EX9-035.ts:79-86`, alternate `digivolutionRequirement` with level 2, `[DM]`, and cost 0 | Module imports and structural catalog shape are covered by the focused suite; real On Play tests use a legal DM host and Palmon hand play. |
| On Play reveals exactly 3 cards | `EX9-035.ts:11-16`, `RevealAdd` with `revealCount: 3` | Structural assertion at `EX9-035.test.ts:8-17`; real play path at `:24-47` and Q4787 at `:49-77`. |
| Add exactly one `[DM]` card to hand | `EX9-035.ts:16-29`, DM trait filter, count 1, destination hand | Real normal reveal test asserts a DM card reaches hand at `EX9-035.test.ts:24-47`; Q4787 proves the sole DM/Ver.4 card is the hand choice at `:49-77`. |
| Place exactly one `[Ver.4]` card face down under any own `[DM]` Digimon | `EX9-035.ts:30-53`, Ver.4 filter, `to: placeUnder`, `faceDown: true`, and own DM Digimon `underFilter` | Real play test confirms a face-down card is placed under a DM host at `EX9-035.test.ts:24-47`; Q4787 confirms no placement occurs when the sole DM/Ver.4 reveal was consumed by the hand choice. |
| Return remaining revealed cards to deck bottom | `EX9-035.ts:54-56`, `rest: deckBottom` | Normal reveal test checks the two remaining cards' deck order at `EX9-035.test.ts:42-46`; Q4787 checks all nonselected reveals return in order at `:69-75`. |
| Inherited When Attacking once-per-turn suspend one opposing Digimon | `EX9-035.ts:60-75`, inherited `WhenAttacking`, opponent Digimon target count 1, frequency once per turn | Real attack test at `EX9-035.test.ts:79-111` suspends the opponent on the first attack, then unsuspends both and proves the second attack does not reapply the inherited effect. |

#### Peer / stack proof

- Q4787 is driven by a real `playCard` intent, not a direct timing-fire helper; the host is an own DM Digimon and the sole DM/Ver.4 reveal is tested as the hand selection.
- A normal three-card reveal covers both destinations and deck-bottom order, while the Q4787 edge case covers the mandatory hand-first selection boundary.
- The inherited attack effect uses a real stack host, real attacks, and a once-per-turn reactivation control.
- All deck and battle-area fixtures are legal main-deck cards; no Digi-Egg fixture or forbidden direct timing-fire helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-035` | PASS — Q4787 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-035.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 5 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/security/revealTriggerPriority.test.ts src/engine/effectFiring.test.ts src/engine/combat/keywordBattle.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 3 files, 20 tests. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-035.ts apps/api/src/cards/EX9/EX9-035.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-035.ts apps/api/src/cards/EX9/EX9-035.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-035.ts apps/api/src/cards/EX9/EX9-035.test.ts docs/audits/EX9-reaudit/EX9-035.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-035.ts apps/api/src/cards/EX9/EX9-035.test.ts` | PASS — no direct timing-fire helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-035-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-035", compiled)`. Q4787 has direct real-play proof; no remaining card-local gap is known.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-036 — Pomumon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and registers only through `registerIrCard`. The test update adds explicit structural evidence for the complete replacement scope and the alternate evolution requirement; no implementation change was needed.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-036` (Pomumon), green level-3 Digimon, play cost 3, 1000 DP, `Vegetation/WG` traits.
- Normal evolution: green level 2 for cost 0.
- Alternate evolution: `[Digivolve] Lv.2 w/[WG] trait: Cost 0`.
- Main effect: `[Your Turn] When this Digimon would digivolve into a Digimon card with the [WG] trait, reduce the digivolution cost by 1.`
- Inherited effect: `[All Turns] This Digimon gets +1000 DP.`
- Generated effect catalog agrees with the direct module: `packages/shared/src/effects/effects.json` entry `EX9-036` has the battle-area self replacement, exact WG trait destination, nested `reduceCost: 1`, inherited `ModifyDP: 1000`, and alternate level-2 WG cost 0 requirement.
- Comprehensive rules used: `comprehensive-0076`/`0077` (digivolution-card identity and stacked cards), `comprehensive-0125`/`0126` (digivolution procedure and costs), and `comprehensive-0173` (trigger effects).

#### Q&A ledger

- **Q4788** (KB query: `node tools/kb/query.mjs card EX9-036`): the Your Turn reduction does **not** trigger while this card is in the breeding area and would digivolve into a WG card. Covered directly by `EX9-036.test.ts:46-64`: a public breeding-area WG evolution pays the printed 2 memory, not a reduced 1, and leaves no pending decision.
- No unresolved EX9-036 Q&A gap remains.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate level-2 `[WG]` evolution for cost 0 | `digivolutionRequirement: [{ level: 2, traits: ["WG"], cost: 0, isAlternate: true }]` at `EX9-036.ts:63-70` | Exact structural assertion at `EX9-036.test.ts:103-104`; public breeding evolution accepts off-color `BT21-003` WG and rejects non-WG `BT1-001` at `:25-44`. |
| Your Turn reduction applies when this Digimon would evolve into a WG Digimon | `YourTurn` → `Replacement` on `wouldDigivolve`, self source restricted to `battleArea`, own-controller `Digimon` destination with exact trait matcher `{ tokens: ["WG"], match: "trait" }`, nested `reduceCost: 1` at `EX9-036.ts:11-41` | Full structural scope at `EX9-036.test.ts:87-102`; public battle-area WG evolution pays 1 instead of printed 2 at `:116-136`; non-WG battle-area evolution is not reduced at `:66-85`; opponent-turn effect-driven WG evolution is not reduced at `:8-24`. |
| Breeding-area Q&A boundary | `sourceFilter.zone: ["battleArea"]` prevents the Your Turn replacement from matching breeding sources | Public Q4788 route at `EX9-036.test.ts:46-64` evolves from breeding for the full printed cost. |
| Inherited All Turns +1000 DP | `AllTurns`, `isInherited: true`, self `ModifyDP` amount 1000 permanent at `EX9-036.ts:43-59` | Structural trigger/inheritance assertion at `EX9-036.test.ts:105-108`; mixed stack with EX9-036 underneath BT1-071 recomputes to 7000 DP at `:110-114`. |

The module has `coverage: "full"`, an empty `residual` array, and no duplicate legacy `registerCard` registration; the sole registration is `registerIrCard("EX9-036", compiled)` at `EX9-036.ts:73`.

#### Behavioral and peer/evolution-stack proof

- Public normal evolution proves the WG reduction, exact memory delta, resulting stack, hand, and no pending decision.
- Public alternate evolution proves the level-2 WG route, off-color WG acceptance, non-WG rejection, stack preservation, and zero memory cost.
- Negative boundaries prove no reduction for a non-WG destination, no reduction during the opponent's turn, and no reduction from breeding (Q4788).
- Inherited proof uses a realistic mixed stack (`BT1-071` host with `EX9-036` underneath), then recomputes continuous effects and observes 7000 DP.
- The EX9-040 peer suite passed 9/9 and independently covers WG alternate evolution, inherited +1000 DP after evolution, and retained DP across turns.
- Fixtures contain no Digi-Egg ids in deck or security. The two `BT1-001` uses are breeding-area alternate-route fixtures only. No `advance.fire`, `fireTiming`, `fireSubTrigger`, or `EffectTiming` helper is used; the sole privileged verb models an off-turn effect-driven evolution so the Your Turn boundary can be observed.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-036.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 10 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-036.test.ts src/cards/EX9/EX9-040.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 2 files, 19 tests** (EX9-040 peer: 9/9) |
| `pnpm typecheck` | **PASS** — shared build, shared/API/web typechecks completed successfully |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-036.ts apps/api/src/cards/EX9/EX9-036.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-036.ts apps/api/src/cards/EX9/EX9-036.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-036.ts apps/api/src/cards/EX9/EX9-036.test.ts docs/audits/EX9-reaudit/EX9-036.md` | **PASS** |
| `rg -n 'security:.*BT1-00[1-8]\|deck:.*BT1-00[1-8]\|advance\\.(fire\|fireTiming\|fireSubTrigger)\|fireTiming\|fireSubTrigger\|EffectTiming' apps/api/src/cards/EX9/EX9-036.test.ts` | **PASS — no forbidden fixture or injected-timing matches** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-036.ts`: unchanged; faithful full-coverage IR with exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-036.test.ts`: strengthened structural replacement-scope, alternate-requirement, and inherited-trigger assertions; all behavioral tests pass.
- `docs/audits/EX9-reaudit/EX9-036.md`: this report.
- No EX9-036 engine seam or Q&A gap remains. No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Concurrent worktree changes are outside this card's scope.

### EX9-037 — Kabuterimon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The module is a deliberate hand-fixed full-coverage IR implementation: the printed cost is “1 card in your hand” of any kind, and the module correctly avoids a Digimon-only filter. The suite now proves Q4789 and Q4790 through public play/evolution routes, removes injected On Play timing, and keeps Option BT1-090 only as an intentional hand-payment fixture.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-037` Kabuterimon, green level-4 Digimon, play cost 5, 5000 DP, `Insectoid/DM/Ver.2` traits.
- Alternate evolution: level 3 with `[DM]` trait, cost 2.
- Printed keyword/effects: `＜Training＞`; `[On Play] [When Digivolving]` by placing 1 card in hand face down as this Digimon's bottom digivolution card, suspend 1 opposing Digimon; it cannot unsuspend in its next unsuspend phase.
- Printed inherited effect: `[When Attacking] [Once Per Turn]` suspend 1 opposing Digimon.
- Local KB query: `node tools/kb/query.mjs card EX9-037` → `Q4789`, `Q4790`.
- Q&A: `Q4789` (2025-06-13): the restriction applies to the opposing Digimon suspended by the effect, not this Digimon. `Q4790`: even if the target was already suspended and the suspend step could not change it, the effect can still give that target the “can't unsuspend” restriction.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects and stacks); `comprehensive-0076`/`0077` (face-down and digivolution cards); `comprehensive-0125`/`0126` (digivolution procedure); `comprehensive-0170`/`0173`/`0176` (optional processing, trigger timing, and effect activation); `comprehensive-0225` where the inherited attack route resolves through combat; and the unsuspend-phase restriction rules.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4789 | Verified. On Play and When Digivolving restrict the opposing target that the effect selected; the source itself is not restricted. | Public On Play proof at `EX9-037.test.ts:206-233` and public When Digivolving proof at `:235-274` assert target restriction true and source/base restriction false. |
| Q4790 | Verified. An already-suspended opposing Digimon still receives the next-unsuspend restriction even though the suspend step cannot change its state. | Public play route at `EX9-037.test.ts:151-170` starts with the target suspended, then asserts the restriction and paid face-down cost. |

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate `[Digivolve] Lv.3 w/[DM] trait: Cost 2` | `digivolutionRequirement: [{ level: 3, traits: ["DM"], cost: 2, isAlternate: true }]` at `EX9-037.ts:106-113` | Public EX9-007 → EX9-037 evolution succeeds at memory 5→3; non-DM BT1-009 is rejected, with stack/hand/memory assertions (`EX9-037.test.ts:63-91`). |
| `＜Training＞` | Static `Training` keyword at `EX9-037.ts:13-21` | Public `observe(...).activatableEffects`/`activateEffect` suspends the host and places BT1-009 face down below EX9-035 (`EX9-037.test.ts:9-39`). |
| On Play and When Digivolving cost: place 1 card in hand face down at stack bottom | Both triggers use `ConditionalBranch` with hand-zone target, `faceDown: true`, and optional abort-on-decline cost at `EX9-037.ts:23-52`, `:55-85`; no card-kind filter is present | BT1-090, an Option, is accepted as the face-down cost in public On Play and When Digivolving proofs (`EX9-037.test.ts:206-274`); decline/insufficient-hand tests leave the hand and stack unchanged (`:41-61`). |
| Suspend 1 opposing Digimon | Each branch's `ifTrue` has `Suspend` targeting one opposing Digimon at `EX9-037.ts:42-44`, `:74-76` | Public On Play and When Digivolving routes suspend the selected target; a second opposing target is not used in the focused positive routes (`:206-274`). |
| Target cannot unsuspend in its next unsuspend phase | Each branch follows `Suspend` with same-target `Restrict`, `unsuspendDuringOwnUnsuspendPhase`, duration `untilOpponentNextUnsuspendPhase` at `EX9-037.ts:44-49`, `:76-81` | Q4789 target/source identity is asserted in both public trigger routes; Q4790 starts with an already-suspended target and still observes the restriction (`:151-170`). Duration proof manually unsuspends through an effect, then runs the target's own unsuspend phase and checks expiry (`:121-149`, `:172-204`). |
| Inherited `[When Attacking] [Once Per Turn]` suspend one opposing Digimon | Inherited `WhenAttacking` action suspends one opposing Digimon, `frequency: "OncePerTurn"` at `EX9-037.ts:86-102` | Two real attacks in one turn suspend only the first selected opponent; the second remains unsuspended while both security attacks resolve (`EX9-037.test.ts:275-317`). |

The module is explicitly marked `HAND-FIXED` because the source compiler emitted a Digimon-only place-cost filter; the current IR correctly uses only `{ zone: "hand", controller: "mine" }`. It registers exclusively with `registerIrCard("EX9-037", compiled)` at `EX9-037.ts:116`; there is no legacy duplicate registration.

#### Behavioral and peer/stack proof

- Training uses public effect observation/activation, not injected timing, and verifies source suspension, hidden face-down state, bottom placement, deck order, and no pending decision (`EX9-037.test.ts:9-39`).
- Public On Play route proves the any-kind hand cost with BT1-090, target suspension, Q4789 source-vs-target identity, and restriction duration (`:206-233`).
- Public When Digivolving route proves the same hand cost and Q4789 identity after EX9-035 → EX9-037 evolution (`:235-274`).
- Q4790 route starts with an already-suspended target; the optional cost is paid and the target still receives the next-unsuspend restriction (`:151-170`).
- Duration route shows an effect-driven unsuspend is allowed, the restriction blocks the target's own next unsuspend phase, and the restriction clears at the following phase (`:121-149`); a turn-boundary route verifies a restriction granted after an unsuspend phase lasts until the next one (`:172-204`).
- Inherited Once Per Turn route uses two opposing Digimon and two real attacks; only the first target is suspended in the same turn (`:275-317`).
- All deck/security fixtures use main-deck Digimon; no Digi-Egg ids occur. BT1-090 appears only in hand as the deliberate any-kind payment proof. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper remains.
- Peer mechanisms: EX9-008 and EX9-038 focused suites passed 23/23; unsuspend/restriction engine regressions passed 48/48.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-037` | **PASS** — Q4789 and Q4790 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-037.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 13 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-008.test.ts src/cards/EX9/EX9-038.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 2 files, 23 tests** (Training/restriction/Piercing peers) |
| `pnpm --filter @aegis/api exec vitest run src/engine/unsuspendPhaseRestriction.test.ts src/engine/overallTimingRestrictions.test.ts src/engine/effects/restrictionEnforcement.test.ts src/engine/effects/restrictionConsumers.guard.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 4 files, 48 tests** |
| `pnpm typecheck` | **PASS** — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-037.ts apps/api/src/cards/EX9/EX9-037.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-037.ts apps/api/src/cards/EX9/EX9-037.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-037.ts apps/api/src/cards/EX9/EX9-037.test.ts docs/audits/EX9-reaudit/EX9-037.md` | **PASS** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-00[1-8]|DBG|console\\.log' apps/api/src/cards/EX9/EX9-037.ts apps/api/src/cards/EX9/EX9-037.test.ts` | **PASS — no injected timing, Digi-Egg, or debug matches.** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-037.ts`: unchanged; retained the documented hand-fixed any-card cost IR and exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-037.test.ts`: replaced three injected On Play timing proofs with public/effect-driven play routes, replaced the Option deck filler with inert BT1-009, and added explicit Q4789 source-vs-target assertions.
- `docs/audits/EX9-reaudit/EX9-037.md`: this report.
- No EX9-037-specific implementation, engine, or Q4789/Q4790 gap is known. Delivery gates remain coordinator-owned and are not claimed by this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-038 — Kuwagamon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-038`, Kuwagamon), a Green level-4 Digimon with `[Insectoid]/[DM]/[Ver.4]` traits, play cost 4, and 4,000 DP.
- Printed evolution: `[Digivolve] Lv.3 w/[DM] trait: Cost 2`.
- Printed effects: `＜Training＞`; `[On Play] [When Attacking]` may place one card from hand face down as this Digimon's bottom digivolution card, suspend one opposing Digimon, and make that selected Digimon unable to unsuspend during its next unsuspend phase; inherited `＜Piercing＞`.
- Local KB: `node tools/kb/query.mjs card EX9-038` → Q4791 and Q4792.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4791 | Verified. The no-unsuspend restriction applies to the opposing Digimon selected by the effect, not to Kuwagamon itself; a same-attack Security effect may unsuspend the target, but the restriction still applies to its next unsuspend phase. | Real attack with BT1-095 security effect at `EX9-038.test.ts:9-31`; target is unsuspended after the check while retaining `unsuspendDuringOwnUnsuspendPhase`. |
| Q4792 | Verified. The effect can give the target “can't unsuspend” even when that target was already suspended and therefore cannot be newly suspended. | Real attack against an already-suspended Digimon at `EX9-038.test.ts:270-294`; restriction is present and target remains suspended. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Level 3 `[DM]` evolution for cost 2 | `EX9-038.ts:130-137`, alternate `digivolutionRequirement` with level 3, `[DM]`, and cost 2 | Route matrix at `EX9-038.test.ts:98-123` accepts EX9-007/EX9-035 and rejects non-DM level-3 routes. |
| `＜Training＞` | `EX9-038.ts:13-21`, static keyword entry | Structural keyword assertion at `EX9-038.test.ts:124-149`; public `activateEffect` path places the deck top face down at `:70-96`. |
| On Play and When Attacking place one hand card face down as bottom source | `EX9-038.ts:23-68` and `:70-115`, any hand-card `place` cost, face-down, optional branch | Real On Play and attack tests at `EX9-038.test.ts:156-183` and `:240-268` prove hand payment and bottom stack placement; decline/unavailable payment branches at `:185-238` leave the stack unchanged. |
| Suspend one opposing Digimon and restrict the same selected target from unsuspending during its next own unsuspend phase | Both IR branches use `Suspend` followed by `Restrict` with `sameTarget: true`, restriction `unsuspendDuringOwnUnsuspendPhase`, and duration `untilOpponentNextUnsuspendPhase` (`EX9-038.ts:42-65`, `:89-112`) | Q4791 and Q4792 directly prove target identity and the already-suspended edge case; the duration test at `EX9-038.test.ts:33-68` proves the next phase is blocked and the restriction expires before the opponent's Main phase. |
| Inherited `＜Piercing＞` | `EX9-038.ts:117-126`, inherited static keyword | Legal stack and battle test at `EX9-038.test.ts:296-350` confirms battle deletion followed by the security check. |

#### Peer / stack proof

- Q4791 uses a real public attack and a real Security effect that unsuspends the selected target during the same attack, while the next-unsuspend restriction remains attached to that target.
- Q4792 uses an already-suspended target, proving failed suspension does not prevent the restriction from being applied.
- The duration case crosses the opponent's unsuspend and Main phases, verifying the restriction's precise expiry.
- Training activation, On Play, When Attacking, decline/unavailable payment, alternate evolution routes, and inherited Piercing all use legal main-deck fixtures.
- No Digi-Egg fixture or forbidden direct timing-fire helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-038` | PASS — Q4791 and Q4792 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-038.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 16 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/unsuspendPhaseRestriction.test.ts src/engine/overallTimingRestrictions.test.ts src/engine/effects/bottomFaceDownCost.test.ts src/engine/combat/keywordBattle.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 4 files, 20 tests. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-038.ts apps/api/src/cards/EX9/EX9-038.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-038.ts apps/api/src/cards/EX9/EX9-038.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-038.ts apps/api/src/cards/EX9/EX9-038.test.ts docs/audits/EX9-reaudit/EX9-038.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-038.ts apps/api/src/cards/EX9/EX9-038.test.ts` | PASS — no direct timing-fire helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-038-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-038", compiled)`. The hand-payment IR is intentionally hand-fixed to accept any hand card, matching the printed clause. Q4791 and Q4792 each have direct real-attack proof; no remaining card-local gap is known.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-039 — DarkTyrannomon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-039`, DarkTyrannomon), a Green level-4 Digimon with `[Dinosaur]/[DM]/[Ver.5]` traits, play cost 5, and 5,000 DP.
- Printed evolution: `[Digivolve] Lv.3 w/[DM] trait: Cost 2`.
- Printed effects: `＜Training＞`; `[On Play] [When Digivolving]` may place one hand card face down as this Digimon's bottom digivolution card, suspend one opposing Digimon for each face-down source, then one own Digimon may attack an opposing Digimon; inherited `[On Deletion]` suspends one opposing Digimon or Tamer.
- Local KB: `node tools/kb/query.mjs card EX9-039` → Q4793.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4793 | Verified. Declining the optional hand placement does not prevent the subsequent optional attack; the attack branch still resolves and can delete the opposing Digimon. | Real On Play intent at `EX9-039.test.ts:147-191`: placement is declined, attack is accepted, an attack is declared, and the target leaves the battle area while the hand card remains. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Level 3 `[DM]` evolution for cost 2 | `EX9-039.ts:135-142`, alternate `digivolutionRequirement` with level 3, `[DM]`, cost 2 | Real evolution route matrix at `EX9-039.test.ts:32-51` accepts EX9-007 and rejects BT1-009, proving the DM trait gate. |
| `＜Training＞` | `EX9-039.ts:11-19`, static keyword entry | Public `activateEffect` test at `EX9-039.test.ts:8-30` places the deck top face down and suspends through the live effect. |
| On Play and When Digivolving optional hand placement | `EX9-039.ts:21-35` and `:69-83`, optional `PlaceUnder`, face down, hand source, bottom position | Real play/evolution cases at `EX9-039.test.ts:109-145`, `:147-191`, and `:210-242` prove accepted placement, declined placement, and no payment without a hand card. |
| Suspend one opposing Digimon per face-down source | `EX9-039.ts:37-53` and `:85-101`, opponent Digimon target count 1 with scaling per self face-down digivolution card | The real evolution stack starts with one hidden source, adds a second, and suspends scaled opposing targets before the optional attack at `EX9-039.test.ts:109-145`; the Q4793 branch proves attack remains available after no placement. |
| Then one own Digimon may attack one opposing Digimon | `EX9-039.ts:54-66` and `:102-114`, optional `Attack`, `attackPlayer: false`, own Digimon target | Q4793 accepts the attack after declining placement at `EX9-039.test.ts:147-191`; accepted placement/evolution attack coverage is at `:109-145` and `:210-242`. |
| Inherited On Deletion suspends an opposing Digimon or Tamer | `EX9-039.ts:117-131`, inherited `OnDeletion`, opponent target kinds Digimon/Tamer | Real security-loss deletion tests at `EX9-039.test.ts:244-276` suspend both BT1-009 and BT1-087 target variants while leaving the own ally unsuspended. |

#### Peer / stack proof

- Q4793 is driven through a real public `playCard` intent; the optional placement is declined, the independent attack branch is accepted, and the target is deleted by battle.
- Accepted placement and scaling are driven through a real legal digivolution from BT1-064, with a face-down source already under the host and a second hand card placed below it.
- Empty-hand behavior proves trash/deck cards cannot substitute for the printed hand cost.
- Training activation, alternate evolution route, inherited On Deletion suspension, and attack/no-attack branches all use legal main-deck fixtures.
- No Digi-Egg fixture or forbidden direct timing-fire helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-039` | PASS — Q4793 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-039.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 12 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/effects/capabilities.test.ts src/engine/effects/saveKeywordPlacement.test.ts src/engine/combat/controller.test.ts src/engine/combat/attackIntegration.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 4 files, 341 tests. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-039.ts apps/api/src/cards/EX9/EX9-039.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-039.ts apps/api/src/cards/EX9/EX9-039.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-039.ts apps/api/src/cards/EX9/EX9-039.test.ts docs/audits/EX9-reaudit/EX9-039.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-039.ts apps/api/src/cards/EX9/EX9-039.test.ts` | PASS — no direct timing-fire helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-039-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-039", compiled)`. Q4793 has direct real-play proof; no remaining card-local gap is known. The mechanism run emitted an existing unrelated legacy `ActivateEffect` warning from AD1-002 but all 341 tests passed.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-040 — Parasaurmon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The suite proves the WG alternate evolution, Blocker battle flow, self-suspension subtrigger, opposing-target selection, Once Per Turn suppression/reset, and inherited +1000 DP across turns.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-040` Parasaurmon, green level-4 Digimon, play cost 5, 5000 DP, `Dinosaur/WG` traits.
- Alternate evolution: level 3 with `[WG]` trait, cost 2.
- Printed main effects: `＜Blocker＞`; `[All Turns] [Once Per Turn]` when this Digimon suspends, suspend 1 opposing Digimon.
- Printed inherited effect: `[All Turns]` this Digimon gets +1000 DP.
- Local KB query: `node tools/kb/query.mjs card EX9-040` → no knowledge-base entries and no card-specific Q&A.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects and stacks); `comprehensive-0076`/`0077` (digivolution cards); `comprehensive-0125`/`0126` (digivolution procedure); `comprehensive-0173`/`0176` (trigger/effect activation); `glossary-0007` (Once Per Turn); and Blocker/attack timing rules.

#### Q&A ledger

No EX9-040-specific Q&A entries were returned by the local KB. Q&A coverage is therefore **N/A**, with no unresolved card-specific ruling gap identified.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate `[Digivolve] Lv.3 w/[WG] trait: Cost 2` | `digivolutionRequirement: [{ level: 3, traits: ["WG"], cost: 2, isAlternate: true }]` at `EX9-040.ts:66-73` | Exact structural assertion at `EX9-040.test.ts:97-113`; BT21-033 WG breeding host evolves successfully for 2 memory while non-WG BT1-009 is rejected (`:77-96`). |
| `＜Blocker＞` | Static keyword `{ keyword: "Blocker" }` at `EX9-040.ts:11-19` | Real opponent attack declares EX9-040 as blocker; blocker suspends, its self-suspension subtrigger suspends the selected opposing peer, and combat resolves against the blocked attacker (`EX9-040.test.ts:9-42`). |
| All Turns / Once Per Turn when this Digimon suspends | `AllTurns` `SubTrigger`, `event: "whenSuspended"`, `sourceFilter.isSelfRef`, `frequency: "OncePerTurn"` at `EX9-040.ts:21-44` | Direct production suspension suspends exactly one opposing Digimon (`:120-132`); suspending another own Digimon does not trigger the effect (`:134-155`); a second same-turn source suspension is suppressed, then a full opponent-turn boundary re-arms it (`:157-187`). |
| Suspend 1 opposing Digimon | Subtrigger action targets opponent Digimon, count 1 at `EX9-040.ts:29-40` | Positive and Blocker routes use separate opponent/peer permanents and assert only the intended opposing Digimon is suspended (`:9-42`, `:120-132`, `:157-187`). |
| Inherited `[All Turns]` +1000 DP | Inherited `AllTurns` `ModifyDP`, self target, amount 1000, permanent duration at `EX9-040.ts:45-62` | Legal EX9-040 → BT1-076 evolution exposes 7000 DP and retains it through both own and opponent turn transitions (`EX9-040.test.ts:44-75`). |

The module registers exclusively with `registerIrCard("EX9-040", compiled)` at `EX9-040.ts:76`; there is no legacy duplicate registration.

#### Behavioral and peer/stack proof

- Public Blocker route: an opponent attacks the player, the controller declares EX9-040 as blocker, and the resulting block suspends the blocker; the self-suspension subtrigger then suspends the chosen opponent peer (`EX9-040.test.ts:9-42`).
- Public evolution route: WG BT21-033 accepts the alternate evolution and non-WG BT1-009 rejects it, with stack and memory assertions (`:77-96`).
- Self-suspension route proves the subtrigger's source identity; suspending another own Digimon does not fire it (`:120-155`).
- Once Per Turn route proves same-turn suppression and reset after a production opponent-turn boundary (`:157-187`).
- Inherited +1000 DP is checked through a legal evolution and both turn transitions (`:44-75`).
- BT1-012 is an inert main-deck Digimon security fixture. No Digi-Egg ids occur in deck or security. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper is used.
- Peer mechanisms: EX9-051 and EX9-038 focused suites passed 32/32; subtrigger/Blocker engine regressions passed 40/40.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-040` | **PASS** — no knowledge-base entries; no Q&A ids. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-040.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 9 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-051.test.ts src/cards/EX9/EX9-038.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 2 files, 32 tests** (Blocker/Training peers) |
| `pnpm --filter @aegis/api exec vitest run src/engine/effects/subtriggers.test.ts src/engine/blockerProof.test.ts src/engine/conformance/ch12-blocking.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 3 files, 40 tests** |
| `pnpm typecheck` | **PASS** — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-040.ts apps/api/src/cards/EX9/EX9-040.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-040.ts apps/api/src/cards/EX9/EX9-040.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-040.ts apps/api/src/cards/EX9/EX9-040.test.ts docs/audits/EX9-reaudit/EX9-040.md` | **PASS** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-00[1-8]|DBG|console\\.log' apps/api/src/cards/EX9/EX9-040.ts apps/api/src/cards/EX9/EX9-040.test.ts` | **PASS — no injected timing, Digi-Egg, or debug matches.** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-040.ts`: unchanged; existing full-coverage IR is faithful and uses exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-040.test.ts`: replaced the BT1-001 security fixture with BT1-012 and added explicit evolution-requirement and Once Per Turn reset assertions.
- `docs/audits/EX9-reaudit/EX9-040.md`: this report.
- No EX9-040-specific implementation, engine, or Q&A gap is known. Delivery gates remain coordinator-owned and are not claimed by this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-041 — ExTyrannomon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and registers only through `registerIrCard`. The test update removed two injected `OnPlay` timing fires in favor of public digivolve intents, added a public play proof, and strengthened exact structural assertions. No implementation change was needed.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-041` (ExTyrannomon), green level-5 Digimon, play cost 8, 8000 DP, `Puppet/DM/Ver.5` traits.
- Alternate evolution requirements: `[Digivolve] [Raremon]: Cost 3`; `[Digivolve] Lv.4 w/[DM] trait: Cost 4`.
- Main replacement: when any of your `[Ver.5]` Digimon would digivolve into this card, reduce the cost by 1 for each of its face-down digivolution cards.
- Keyword: `<Fortitude>`.
- `[On Play] [When Digivolving]`: suspend 1 opposing Digimon. Then, by trashing this Digimon's bottom face-down digivolution card, return 1 opposing suspended Digimon with the lowest DP to hand.
- Inherited effect: `[All Turns] [Once Per Turn]` when this Digimon deletes an opponent's Digimon in battle, trash their top security card.
- Generated effect catalog agrees with the direct module: `packages/shared/src/effects/effects.json` entry `EX9-041` contains the Ver.5 face-down-source reduction, both identical play/evolution bodies, Fortitude, inherited once-per-turn security trash, and both alternate evolution requirements.
- Comprehensive rules used: `§4-14` (deletion), `§14` (battle deletion and simultaneous losses), `§15-4-3` (simultaneous triggering), `§15-8-3` (trigger-type effects), and `§15-16-4` (On Deletion timing).

#### Q&A ledger

- **Q4794** (KB query: `node tools/kb/query.mjs card EX9-041`): the inherited effect cannot be activated when this Digimon and the opponent's Digimon are deleted at the same timing. Covered at `EX9-041.test.ts:405-428` by a public equal-DP battle that deletes both participants and leaves the opponent's two security cards untouched.
- No unresolved EX9-041 Q&A gap remains.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate `[Raremon]` cost 3 and level-4 `[DM]` cost 4 | `digivolutionRequirement` entries with `namesExact: ["Raremon"]`, and `level: 4, traits: ["DM"]`, both `isAlternate: true`, at `EX9-041.ts:167-179` | Exact structural assertion at `EX9-041.test.ts:197-201`; public Raremon route pays 3 at `:8-38`; public off-color DM route accepts EX9-029 and rejects BT1-037 at `:40-59`; exact `Raremon` name rejects `RareRaremon` at `:60-77`. |
| Ver.5 reduction, one per face-down digivolution card | Static `wouldDigivolve` replacement restricted to own Digimon with exact `Ver.5` trait; nested `reduceCost: 1` scales per self face-down `digivolutionCards` at `EX9-041.ts:11-45` | Full structural source/scaling assertion at `EX9-041.test.ts:135-165`; public evolution with one hidden card pays 3, while two hidden cards pay 2 on EX9-039 and a non-Ver.5 EX9-038 pays the unmodified 4 at `:96-134`. |
| `<Fortitude>` | Static keyword entry at `EX9-041.ts:47-55` | Public deletion proof at `EX9-041.test.ts:78-95` confirms a source card replays as a fresh EX9-041 only when the deleted stack had a source, and does not replay the empty stack case. |
| On Play / When Digivolving suspension and optional lowest-DP return | Both trigger entries suspend one opposing Digimon, then optionally trash this Digimon's bottom face-down source and return one suspended opposing Digimon selected by `lowestDP` at `EX9-041.ts:57-143` | Exact structural mapping for both triggers at `EX9-041.test.ts:166-196`; public When Digivolving route suspends the selected high-DP target, returns the lower-DP target, and trashes the bottom face-down card at `:217-262`; public On Play route suspends a target and safely declines when no return cost exists at `:264-283`; optional decline preserves the face-down card at `:349-377`. |
| Inherited All Turns Once Per Turn battle deletion trashes opponent security | `AllTurns`, `isInherited: true`, `frequency: "OncePerTurn"`, self `whenDeletesInBattle` SubTrigger, opponent `SecurityManipulation.trashTop` at `EX9-041.ts:145-163` | Exact structural assertion at `EX9-041.test.ts:202-215`; public inherited host battle wins trash one security on the first deletion only, suppress the second deletion in the same turn, then reset and trash again after the next real turn at `:285-347`; another allied Digimon's deletion does not trigger it at `:379-403`. |
| Q4794 simultaneous deletion boundary | The inherited watcher remains self-scoped and only fires from the host's own battle deletion | Equal-DP public battle deletes host and opponent simultaneously; security remains unchanged at `EX9-041.test.ts:405-428`. |

The module has `coverage: "full"`, an empty `residual` array, and no duplicate legacy `registerCard` registration; the sole registration is `registerIrCard("EX9-041", compiled)` at `EX9-041.ts:182`.

#### Behavioral and peer/evolution-stack proof

- Public evolution routes cover Raremon, off-color DM, exact-name rejection, Ver.5 scaling for one and two face-down sources, and the non-Ver.5 negative boundary.
- Public When Digivolving proof covers suspension target selection, lowest-DP return, bottom face-down payment, stack order, memory, hand, and trash outcomes.
- Public On Play proof covers the same suspension body and the no-cost-source refusal branch; optional decline proves the face-down source remains.
- Fortitude proof uses a real deletion verb and checks the fresh permanent identity/battle-area result and trash contents.
- Inherited proof covers the positive battle deletion, once-per-turn exhaustion, a non-inherited ally deletion negative, and Q4794's simultaneous deletion negative.
- The EX9-039 peer suite passed 12/12 and independently exercises public Ver.5 face-down-source scaling through real digivolution, On Play/When Digivolving shared timing patterns, and inherited deletion mechanics.
- Fixtures contain no Digi-Egg ids in deck or security. No `advance.fire`, `fireTiming`, `fireSubTrigger`, or `EffectTiming` helper is used; privileged `advance.verb` calls are limited to deletion/unsuspend setup where no public intent supplies that exact setup.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-041.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 18 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-041.test.ts src/cards/EX9/EX9-039.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 2 files, 30 tests** (EX9-039 peer: 12/12) |
| `pnpm typecheck` | **PASS** — shared build, shared/API/web typechecks completed successfully |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-041.ts apps/api/src/cards/EX9/EX9-041.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-041.ts apps/api/src/cards/EX9/EX9-041.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-041.ts apps/api/src/cards/EX9/EX9-041.test.ts docs/audits/EX9-reaudit/EX9-041.md` | **PASS** |
| `rg -n 'security:.*BT1-00[1-8]\|deck:.*BT1-00[1-8]\|advance\\.(fire\|fireTiming\|fireSubTrigger)\|fireTiming\|fireSubTrigger\|EffectTiming' apps/api/src/cards/EX9/EX9-041.test.ts` | **PASS — no forbidden fixture or injected-timing matches** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-041.ts`: unchanged; faithful full-coverage IR with exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-041.test.ts`: replaced two injected timing fires with public digivolve intents, added public On Play proof, and strengthened exact IR/requirement/inherited assertions; all 18 focused tests pass.
- `docs/audits/EX9-reaudit/EX9-041.md`: this report.
- No EX9-041 engine seam or Q&A gap remains. No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Concurrent worktree changes are outside this card's scope.

### EX9-042 — Toropiamon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-042`, Toropiamon), a Green/Purple level-5 Digimon with `[Vegetation]/[WG]` traits, play cost 7, and 7,000 DP.
- Printed evolution: Green Lv.4 cost 4; Purple Lv.4 cost 4; alternate `[WG]` Lv.4 cost 3.
- Printed effects: `[On Play] [When Digivolving]` suspend one opposing Digimon, then one of their Digimon cannot unsuspend until their turn ends; `[All Turns]` once per turn, when an effect suspends one of your `[WG]` Digimon, this may digivolve into a `[WG]` Digimon card in hand without paying; inherited `[End of Your Turn]` once per turn, one of your `[WG]` Digimon may unsuspend.
- Local KB: `node tools/kb/query.mjs card EX9-042` → Q4795.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4795 | Verified. The Digimon suspended by the first effect and the Digimon given the unsuspend restriction may be different cards. | Real public play at `EX9-042.test.ts:43-99` selects `first` for Suspend and `second` for Restrict, asserts the distinct states, then proves the restriction expires at the opponent's turn end. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Green/Purple Lv.4 evolution routes and alternate `[WG]` Lv.4 cost 3 | `EX9-042.ts:138-145`, alternate level 4 `[WG]`, cost 3; ordinary routes are catalog-driven | Real evolution matrix at `EX9-042.test.ts:9-42` accepts EX9-040 through the alternate route and BT1-071 through the ordinary route, paying the expected memory and resolving the effect. |
| On Play: suspend one opponent Digimon, then one of their Digimon cannot unsuspend until their turn ends | `EX9-042.ts:12-36`, independent `Suspend` and `Restrict` actions, opponent Digimon target count 1, `unsuspend` restriction with `untilOpponentTurnEnd` duration | Q4795 target-identity proof at `EX9-042.test.ts:43-99`; the additional public play assertion at `:128-149` verifies the suspension and restriction resolve on play. |
| When Digivolving: same two independent effects | `EX9-042.ts:39-64`, same independent target/action shape on `WhenDigivolving` | Real digivolution routes at `EX9-042.test.ts:9-42` leave the opposing target suspended and restricted; structural trigger assertion at `:100-107` checks both actions. |
| All Turns once per turn: an effect suspending your `[WG]` Digimon permits a free `[WG]` evolution from hand | `EX9-042.ts:66-110`, `SubTrigger` `whenEffectSuspends`, own Digimon + `[WG]` trigger filter, self target, hand source, `payCost: false`, `OncePerTurn` | Own-source suspension, re-exposure, and second-source once-per-turn proof at `EX9-042.test.ts:151-192`; an opponent's real public play is covered in both mixed-board cases at `:194-233`; negative non-WG/enemy-WG and attack-suspension cases are at `:235-275` and `:277-296`. |
| Inherited End of Your Turn once per turn: one own `[WG]` Digimon may unsuspend | `EX9-042.ts:112-134`, inherited `EndOfYourTurn`, optional own `[WG]` `Unsuspend`, `OncePerTurn` | Accepted and declined branches at `EX9-042.test.ts:298-338` run through a real turn end; opponent-turn negative proof is at `:340-360`; inherited trigger shape is asserted at `:121-126`. |

#### Peer / stack proof

- Q4795 uses a real public `playCard` intent and explicit target responses, proving target identity rather than relying on auto-selection.
- Both evolution routes use legal public digivolution intents and confirm stack/card movement, memory payment, and the resulting effects.
- The free-evolution branch uses effect suspension, tests once-per-turn re-exposure, and exercises an opponent's real public play during the opponent's turn.
- The inherited branch uses a real turn boundary and covers both accepted and declined optional unsuspends, plus the opponent-turn negative.
- All fixtures are legal main-deck cards; no Digi-Egg fixture or direct timing-fire helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-042` | PASS — Q4795 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-042.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 19 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/unsuspendPhaseRestriction.test.ts src/engine/subTriggerSeams.test.ts src/engine/overallTimingRestrictions.test.ts src/engine/effects/timingActivationGate.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 4 files, 36 tests. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-042.ts apps/api/src/cards/EX9/EX9-042.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-042.ts apps/api/src/cards/EX9/EX9-042.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-042.ts apps/api/src/cards/EX9/EX9-042.test.ts docs/audits/EX9-reaudit/EX9-042.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-042.ts apps/api/src/cards/EX9/EX9-042.test.ts` | PASS — no direct timing-fire helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-042-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-042", compiled)`. Q4795 has direct real-play target-identity and expiry proof; no remaining card-local Q&A gap is known.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-043 — MetalTyrannomon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The suite proves the interactive hand-trash play-cost reduction, the Q4796 free-play ruling, the Q4797 “then” dependency, both On Play and When Digivolving cleanup routes, alternate evolution routes, and inherited Piercing.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-043` MetalTyrannomon, green/black level-5 Digimon, play cost 7, 7000 DP, `Cyborg/DM/Ver.5` traits.
- Normal evolution: level 4 green or black Digimon, cost 4.
- Alternate evolution: level 4 with `[Tyrannomon]` in its name, cost 3; or level 4 with `[DM]` trait, cost 3.
- Printed play replacement: when this card would be played, by trashing 1 `[Cyborg]` or `[Ver.5]` trait card from hand, reduce its play cost by 2.
- Printed On Play / When Digivolving: by placing 1 Digimon card from trash face down as this Digimon’s bottom digivolution card, De-Digivolve 1 opposing Digimon for each face-down digivolution card under this Digimon; then delete 1 opposing Digimon with 3000 DP or less.
- Inherited effect: `＜Piercing＞`.
- Local KB query: `node tools/kb/query.mjs card EX9-043` → `Q4796`, `Q4797`.
- Q4796 (2025-06-13): the hand-trash reduction may be used even when the card is played without paying its cost, and the card remains free.
- Q4797 (2025-06-13): without placing the trash Digimon face down, the effect after “then” cannot delete the opposing 3000 DP or lower Digimon.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects and stacks), `comprehensive-0076`/`0077` (digivolution cards), `comprehensive-0125`/`0126` (digivolution procedure), `comprehensive-0170`/`0173`/`0176` (optional processing, trigger timing, and effect activation), and the De-Digivolve/Piercing timing rules.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4796 | Verified. A real battle plays EX9-043 from trash without paying its cost; the optional eligible hand card is still trashed and memory remains unchanged. | `EX9-043.test.ts:31-55` asserts EX9-043 enters from trash, BT1-021 is trashed, the hand is empty, and memory stays at 3. |
| Q4797 | Verified. Declining the optional trash placement, both with and without an available trash Digimon, leaves the cleanup tail unprocessed. | `EX9-043.test.ts:355-379` asserts no face-down placement, no De-Digivolve, no delete, and the opponent’s stack/battle area remain unchanged. |

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate `[Digivolve]` Lv.4 `[Tyrannomon]` or `[DM]`: cost 3 | `digivolutionRequirement` has separate alternate name and trait routes at `EX9-043.ts:169-181` | Exact structural assertion at `EX9-043.test.ts:132-136`; BT2-044, BT1-019, and EX9-029 each resolve the corresponding route in the scaled evolution tests (`:227-275`), while invalid/normal route checks cover rejection and standard evolution (`:56-76`, `:277-318`). |
| By trashing a hand `[Cyborg]`/`[Ver.5]`, reduce play cost by 2 | `BeforePayCost` `ReducePlayCost` with fixed amount 2 and `trashFromHand` mine/hand trait alternatives at `EX9-043.ts:17-40` | Exact structure at `EX9-043.test.ts:77-96`; paid BT1-021 and EX9-039 routes reduce the cost and trash only the eligible card (`:138-161`); decline/ineligible routes preserve hand and cost (`:8-29`, `:186-205`). |
| On Play / When Digivolving by placing 1 trash Digimon face down at this stack’s bottom | Both triggers use `PlaceUnder` from own trash to self, `faceDown: true`, `position: "bottom"`, optional with `abortOnDecline` at `EX9-043.ts:42-64`, `:97-117` | Exact structural assertions at `EX9-043.test.ts:97-124`; public On Play and normal/alternate evolution routes assert the hidden bottom card (`:207-225`, `:227-275`, `:320-353`). |
| De-Digivolve 1 opposing Digimon for each face-down card under this Digimon | Both triggers target one opposing Digimon and use dynamic `countFaceDownDigivolutionCards` hosted by self at `EX9-043.ts:65-76`, `:118-127` | A paid On Play route removes the target’s 3000-DP top card (`:207-225`); the alternate-route stack has one prior face-down card plus the newly placed card and asserts the scaled result and retained target stack (`:227-275`). |
| Then delete 1 opposing Digimon at 3000 DP or less | Both trigger tails target one opposing Digimon with `dp: { op: "lte", value: 3000 }` at `EX9-043.ts:78-93`, `:129-142` | Positive On Play, normal evolution, and scaled alternate evolution routes remove the selected 3000-DP target (`EX9-043.test.ts:207-225`, `:227-275`, `:320-353`); Q4797 refusal proves this tail is gated by placement. |
| Inherited `＜Piercing＞` | Inherited static `GainKeyword` action at `EX9-043.ts:146-165` | Exact structure at `EX9-043.test.ts:125-131`; a real attack with and without EX9-043 underneath proves security checks only when inherited (`:163-184`). |

The module registers exclusively with `registerIrCard("EX9-043", compiled)` at `EX9-043.ts:185`; there is no duplicate legacy registration.

#### Behavioral and peer/stack proof

- Public free-play route uses BT19-065’s real battle flow to play EX9-043 from trash, proving Q4796 without directly advancing timing.
- Public paid routes prove both eligible trait alternatives, exact −2 cost, hand-to-trash payment, and preservation of an ineligible BT1-009.
- Public On Play and When Digivolving routes prove face-down bottom placement, dynamic De-Digivolve scaling, 3000-DP deletion, and the normal plus all alternate evolution paths.
- Q4797 uses production optional-decision handling; declining placement prevents both De-Digivolve and the subsequent delete clause.
- Inherited Piercing is checked through a real attack and security-resolution difference.
- All deck/security fixtures are main-deck Digimon; no Digi-Egg ids occur. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper is used.
- Peer suites cover the same evolution, play-cost, and inherited-combat mechanisms; relevant engine suites cover passive play-cost reduction, activation, and replacement recomputation.
- No engine seam or card-specific Q&A gap remains.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-043` | **PASS** — Q4796 and Q4797 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-043.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 22 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-030.test.ts src/cards/EX9/EX9-013.test.ts src/cards/EX9/EX9-051.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 3 files, 46 tests** |
| `pnpm --filter @aegis/api exec vitest run src/engine/passivePlayCostReduction.test.ts src/engine/playCostBlockActivation.test.ts src/engine/replacementRecomputeBarrier.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 3 files, 6 tests** |
| `pnpm typecheck` | **PASS** — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-043.ts apps/api/src/cards/EX9/EX9-043.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-043.ts apps/api/src/cards/EX9/EX9-043.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-043.ts apps/api/src/cards/EX9/EX9-043.test.ts docs/audits/EX9-reaudit/EX9-043.md` | **PASS** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-00[1-8]|DBG|console\\.log' apps/api/src/cards/EX9/EX9-043.ts apps/api/src/cards/EX9/EX9-043.test.ts` | **PASS — no injected timing, Digi-Egg, or debug matches.** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-043.ts`: unchanged; existing full-coverage IR is faithful and uses exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-043.test.ts`: strengthened exact replacement, cleanup, alternate-route, and inherited-keyword assertions; all focused behavior remains green.
- `docs/audits/EX9-reaudit/EX9-043.md`: this report.
- No EX9-043-specific implementation, engine, or Q&A gap is known. Delivery gates remain coordinator-owned and are not claimed by this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-044 — Hydramon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-044`, Hydramon), a Green/Purple level-6 Digimon with `[Vegetation]/[WG]` traits, play cost 11, and 11,000 DP.
- Printed evolution: `[Digivolve]` Lv.5 with `[WG]` trait, cost 3.
- Printed effects: when this card would be played, suspending one own `[WG]` Digimon reduces its play cost by 4; `[On Play] [When Digivolving]` suspend one opposing Digimon or Tamer, then one of their Digimon or Tamers cannot unsuspend until their turn ends; `[Your Turn] [Once Per Turn]` when your Digimon are played or digivolve, if any have `[WG]`, two of your Digimon may DNA digivolve into a `[WG]` Digimon card in hand.
- Local KB: `node tools/kb/query.mjs card EX9-044` → Q4798, Q4799, Q4800.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4798 | Verified. The Digimon/Tamer suspended by the first effect and the Digimon/Tamer given the unsuspend restriction may be different cards. | Real public play at `EX9-044.test.ts:194-271` selects the opponent Digimon for Suspend and the opponent Tamer for Restrict, then proves the restriction expires at the opponent's turn end. |
| Q4799 | Verified. Hydramon's Your Turn response triggers when Hydramon itself is played. | Real `playCard` intent at `EX9-044.test.ts:115-158` DNA digivolves Hydramon with its legal partner and consumes the expected materials/candidate. |
| Q4800 | Verified. Hydramon's Your Turn response triggers when a card digivolves into Hydramon itself. | Real `digivolve` intent at `EX9-044.test.ts:115-158` uses the alternate WG route and resolves the same DNA response, leaving the expected three-card stack. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Alternate `[WG]` Lv.5 evolution for cost 3 | `EX9-044.ts:187-194`, alternate level 5 `[WG]`, cost 3 | Q4800's real digivolution route at `EX9-044.test.ts:136-157` uses `useAlternateCost: true` and confirms the stack and memory result. |
| When played, suspend one own `[WG]` Digimon to reduce play cost by 4 | `EX9-044.ts:11-49`, self `wouldBePlayed` replacement with optional suspend cost and `reduceCost: 4` | Real public play at `EX9-044.test.ts:181-192` suspends EX9-040 and reduces the 11-cost play to a 7-memory payment; the decline/suspended/non-WG matrix at `:273-297` proves the printed cost remains when no legal payment occurs. |
| On Play and When Digivolving suspend one opposing Digimon or Tamer, then independently restrict one until their turn ends | `EX9-044.ts:51-103`, separate `Suspend` and `Restrict` actions with opponent Digimon/Tamer filters and `untilOpponentTurnEnd` duration | Q4798's real play at `EX9-044.test.ts:194-271` chooses different Digimon/Tamer targets and proves only the selected Tamer is restricted; structural trigger assertion at `:164-172` covers both timings. |
| Your Turn once per turn: when your Digimon are played or digivolve, if any have `[WG]`, two own Digimon may DNA digivolve into a `[WG]` hand card | `EX9-044.ts:105-183`, two `SubTrigger`s (`whenPlayed`, `whenOneOfYoursDigivolves`), own-Digimon source, two own Digimon materials, `[WG]` trigger condition, hand candidate, paid DNA evolution, `OncePerTurn` | Q4799/Q4800 real self-play/self-digivolve matrix at `EX9-044.test.ts:115-158`; shared once-per-turn limit across evolution and later effect-play at `:10-59`; off-turn and second-event negatives at `:61-89`; structural trigger assertion at `:173-179`. |

#### Peer / stack proof

- Q4798 uses a real public `playCard` intent with explicit target responses, proving independent target identity and restriction expiry.
- Q4799 and Q4800 use public play/digivolve intents, legal DNA materials, and assert the resulting merged stack, hand, memory, and unsuspended state.
- The once-per-turn scenario proves a first legal DNA evolution consumes the response while a later effect-play does not create a second DNA evolution; off-turn cases confirm the Your Turn gate.
- The play-cost replacement is tested through a real play, including accepted, declined, already-suspended, and non-WG payment candidates.
- All fixtures are legal main-deck cards; no Digi-Egg fixture or direct timing-fire helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-044` | PASS — Q4798, Q4799, and Q4800 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-044.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 14 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/dnaDigivolve.test.ts src/engine/replacementRecomputeBarrier.test.ts src/engine/playCostBlockActivation.test.ts src/engine/unsuspendPhaseRestriction.test.ts src/engine/subTriggerSeams.test.ts src/engine/effects/timingActivationGate.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 6 files, 39 tests. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-044.ts apps/api/src/cards/EX9/EX9-044.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-044.ts apps/api/src/cards/EX9/EX9-044.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-044.ts apps/api/src/cards/EX9/EX9-044.test.ts docs/audits/EX9-reaudit/EX9-044.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-044.ts apps/api/src/cards/EX9/EX9-044.test.ts` | PASS — no direct timing-fire helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-044-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-044", compiled)`. Q4798, Q4799, and Q4800 each have direct public-intent proof; no remaining card-local Q&A gap is known.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-045 — Cernumon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The suite proves Alliance, Blocker, all four printed zero-cost DNA material pairs, the conditional When Digivolving play and DNA-only deck-bottom return, and the all-turns WG leave-play replacement with optional Once Per Turn rescue. Direct timing-injection tests were removed; the trigger behavior is now covered by real evolution and DNA intents.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-045` Cernumon, level-7 green/yellow/blue Digimon, play cost 15, 15000 DP, `Holy Beast/WG` traits.
- DNA evolution: green or yellow level 6 plus blue or purple level 6, cost 0; this yields four color combinations.
- Keywords: `＜Alliance＞` and `＜Blocker＞`.
- When Digivolving: may play 1 play-cost-7-or-lower `[WG]` Digimon from hand without paying its cost; then, if DNA digivolving, may return up to 2 opposing Digimon to the bottom of the deck.
- All Turns / Once Per Turn: when any own `[WG]` Digimon would leave the battle area other than in battle, may play 1 play-cost-7-or-lower `[WG]` Digimon from hand without paying its cost.
- Local KB query: `node tools/kb/query.mjs card EX9-045` → no knowledge-base entries and no card-specific Q&A.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited/stack context), `comprehensive-0076`/`0077` (digivolution cards), `comprehensive-0125`/`0126` (digivolution procedure), `comprehensive-0170`/`0173`/`0176` (optional processing, trigger timing, and effect activation), and the Alliance/Blocker and DNA-digivolution timing rules.

#### Q&A ledger

No EX9-045-specific Q&A entries were returned by the local KB. Q&A coverage is **N/A**; no unresolved card-specific ruling gap was identified.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| DNA `[Green/Yellow Lv.6] + [Blue/Purple Lv.6]: Cost 0` | `dnaDigivolveRequirement` lists all four zero-cost color pairs at `EX9-045.ts:118-147` | Exact structural assertion at `EX9-045.test.ts:171-201`; five positive real DNA intent combinations succeed at `:105-141`, and wrong level/color combinations are rejected at `:142-170`. |
| `＜Alliance＞` and `＜Blocker＞` | Separate static keyword entries at `EX9-045.ts:10-29` | Exact keyword proof at `EX9-045.test.ts:202-210`; a real Blocker declaration intercepts combat and preserves security (`:304-327`), while a real Alliance response suspends the ally, wins combat, and deletes the defender (`:329-360`). |
| When Digivolving, play one hand `[WG]` Digimon with play cost 7 or less for free | `WhenDigivolving` `PlayWithoutCost`, mine hand Digimon, WG trait, `playCostLte: 7`, count 1, optional, `payCost: false` at `EX9-045.ts:31-52` | Normal evolution and DNA evolution both use public `digivolve`/`dnaDigivolve` intents and assert EX9-040 enters from hand without cost (`EX9-045.test.ts:55-103`). Exact IR structure is asserted at `:211-226`. |
| Then, only if DNA digivolving, return up to two opposing Digimon to deck bottom | `Return` targets up to two opponent Digimon, `to: "deckBottom"`, optional, guarded by `isDnaDigivolving` at `EX9-045.ts:53-69` | The normal evolution leaves both opposing Digimon in play; the real DNA evolution returns both in order to the deck bottom (`:55-103`). Exact conditional structure is asserted at `:227-243`. |
| All Turns / Once Per Turn WG leave-play rescue, other than battle | `AllTurns` frequency `OncePerTurn`; live `Replacement` for `wouldLeavePlay`, source mine Digimon with WG trait, `leaveCause: "otherThanBattle"`, and optional free WG hand play at `EX9-045.ts:72-114` | Non-WG departure does not invoke it, optional refusal preserves the hand, and a real losing security battle does not invoke it (`:9-53`). Two effect-caused departures play only one replacement that turn, then the second WG card leaves without replacement (`:277-302`). Exact source/cause/target structure is asserted at `:244-276`. |

The module registers exclusively with `registerIrCard("EX9-045", compiled)` at `EX9-045.ts:150`; there is no duplicate legacy registration.

#### Behavioral and peer/stack proof

- Real normal evolution proves the free WG play while leaving the DNA-only return tail inactive.
- Real DNA evolution proves the same free WG play plus returning up to two opposing Digimon to deck bottom.
- Five public DNA material combinations exercise the printed color alternatives; invalid level/color pairs are rejected without changing the board, hand, or memory.
- Replacement coverage distinguishes non-WG departure, optional refusal, a real battle loss, a successful other-than-battle rescue, and Once Per Turn suppression of the second rescue.
- Blocker and Alliance are both exercised through real attack intents and production combat resolution.
- All deck/security fixtures are main-deck Digimon; no Digi-Egg ids occur. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper remains.
- Peer suites cover DNA, Blocker, and Alliance mechanisms; engine conformance suites cover digivolution, security/blocking, battle keywords, and interaction behavior.
- No EX9-045-specific implementation, engine, or Q&A gap is known.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-045` | **PASS** — no knowledge-base entries and no Q&A ids. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-045.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 21 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-044.test.ts src/cards/EX9/EX9-040.test.ts src/cards/EX9/EX9-051.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 3 files, 39 tests** |
| `pnpm --filter @aegis/api exec vitest run src/engine/conformance/ch08-digivolution.test.ts src/engine/conformance/ch16a-security-blocker-draw.test.ts src/engine/conformance/ch16b-digivolve-and-battle-keywords.test.ts src/engine/interactionAudit.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 4 files, 73 tests** |
| `pnpm typecheck` | **PASS** — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-045.ts apps/api/src/cards/EX9/EX9-045.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-045.ts apps/api/src/cards/EX9/EX9-045.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-045.ts apps/api/src/cards/EX9/EX9-045.test.ts docs/audits/EX9-reaudit/EX9-045.md` | **PASS** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-00[1-8]|DBG|console\\.log' apps/api/src/cards/EX9/EX9-045.ts apps/api/src/cards/EX9/EX9-045.test.ts` | **PASS — no injected timing, Digi-Egg, or debug matches.** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-045.ts`: unchanged; existing full-coverage IR is faithful and uses exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-045.test.ts`: removed two direct timing-injection tests, retained equivalent real evolution/DNA coverage, and added exact DNA/effect/replacement structure assertions.
- `docs/audits/EX9-reaudit/EX9-045.md`: this report.
- No EX9-045-specific implementation, engine, or Q&A gap is known. Delivery gates remain coordinator-owned and are not claimed by this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-046 — Soundbirdmon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-046`, Soundbirdmon), a Black level-3 Digimon with `[Avian]` trait, play cost 3, and 1,000 DP.
- Printed evolution: Black Lv.2 cost 0.
- Printed effects: `[On Play]` reveal the top 3 cards; add one card with `[Negamon]` in its text and one Digimon card with `[Abbadomon]` in its name; return the rest to the bottom of the deck. Inherited `[All Turns]` this Digimon gets +1000 DP.
- Local KB: `node tools/kb/query.mjs card EX9-046` → Q4801.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4801 | Verified. A `match: "text"` reference searches a card's complete printed text, including the name, traits, effects, inherited/security/link text, requirements, and related printed rule text; it is broader than an exact name or trait match. | Live EX9-046 play at `EX9-046.test.ts:45-58` adds EX9-048 because `[Negamon]` appears in its effect text, while the separate Abbadomon-name slot adds EX9-057. The engine complete-text matrix in `src/engine/effects/interpreter.test.ts` covers effect, inherited, security, link effect, link requirement, dual, and option text fields. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| On Play reveal top 3 cards | `EX9-046.ts:11-16`, `RevealAdd` with `revealCount: 3` | Real public play at `EX9-046.test.ts:23-43` reveals the deck and adds the matching candidate; the distinct-candidate case at `:45-58` proves both add slots can resolve from the same reveal. |
| Add one card with `[Negamon]` in its text | `EX9-046.ts:17-29`, own-card `nameOrTrait` filter with `tokens: ["Negamon"]`, `match: "text"`, count 1, destination hand | EX9-048, whose effect text contains `[Negamon]`, is selected into hand at `EX9-046.test.ts:45-58`; the complete printed-text semantics are covered by `src/engine/effects/interpreter.test.ts`. |
| Add one Digimon with `[Abbadomon]` in its name | `EX9-046.ts:30-43`, own Digimon filter with `tokens: ["Abbadomon"]`, `match: "name"`, count 1, destination hand | EX9-057 is selected by name alongside EX9-048 at `EX9-046.test.ts:45-58`; structural assertion at `:9-18` checks both independent add entries. |
| Return all other revealed cards to the bottom of the deck | `EX9-046.ts:44-46`, `rest: "deckBottom"` | Single-match play at `EX9-046.test.ts:23-43` and no-match play at `:60-72` assert the exact remaining deck order below the unrevealed anchor. |
| Inherited All Turns +1000 DP | `EX9-046.ts:49-66`, inherited `AllTurns` self-target `ModifyDP` amount 1000, permanent duration | Legal public evolution at `EX9-046.test.ts:74-106` observes 1,000 DP before evolution, 6,000 DP after the 5,000-DP top card, and the bonus retained through both real turns; structural assertion at `:19-22` checks the inherited action. |

#### Peer / stack proof

- All reveal behavior is driven through public `playCard` intents; no direct timing-fire helper is used.
- The Q4801 case separates a live effect-text match (EX9-048) from the exact Abbadomon-name match (EX9-057), while the no-match case proves candidates are not added accidentally.
- Deck-bottom behavior is asserted with an unrevealed anchor card, proving the three revealed cards are resolved before the untouched deck remainder.
- The inherited bonus is checked through a legal public digivolution and real turn boundaries.
- All fixtures are legal main-deck cards; no Digi-Egg fixture is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-046` | PASS — Q4801 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-046.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 6 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts src/engine/mechanic.test.ts src/engine/effects/capabilities.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 3 files, 628 tests. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-046.ts apps/api/src/cards/EX9/EX9-046.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-046.ts apps/api/src/cards/EX9/EX9-046.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-046.ts apps/api/src/cards/EX9/EX9-046.test.ts docs/audits/EX9-reaudit/EX9-046.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-046.ts apps/api/src/cards/EX9/EX9-046.test.ts` | PASS — no direct timing-fire helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-046-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-046", compiled)`. Q4801 has direct live text-match proof plus complete-text mechanism coverage; no remaining card-local Q&A gap is known.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-047 — Eyesmon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and registers only through `registerIrCard`. The test update corrected Digi-Egg fixtures, made Q4802 explicit with main-deck Digimon text matches, and strengthened exact target/inherited structural assertions; no implementation change was needed.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-047` (Eyesmon), black level-4 Digimon, play cost 7, 7000 DP, `Dark Dragon` trait.
- Alternate evolution: `[Digivolve] [Eyesmon: Scatter Mode]: Cost 1`.
- Keywords: `<Rush>` and `<Collision>`.
- On Deletion: may return 1 of your Digimon cards with `[Negamon]` in its text from your trash to the hand.
- Inherited effect: `[All Turns] This Digimon gets +1000 DP.`
- Generated effect catalog agrees with the direct module: `packages/shared/src/effects/effects.json` entry `EX9-047` contains exact-name evolution, Rush, Collision, own-trash Digimon `match: "text"` return, and inherited permanent +1000 DP.
- Comprehensive rules used: `§2-3-1` (card names), `§2-3-2` (traits), `§2-3-11` (lower/inherited text), `§4-14` (deletion), and `§15-16-4` (On Deletion timing). The official manual's “X in its text” explanation and local Q&A Q4802 define the broad text search across names, traits, effects, inherited effects, and other card text fields.

#### Q&A ledger

- **Q4802** (KB query: `node tools/kb/query.mjs card EX9-047`): “X in its text” includes the specified text/icon in a card's name, traits, effects, inherited effects, Rule, evolution requirements, DNA/DigiXros/Burst/App Fusion/Link/Assembly requirements, and related card text. Covered explicitly at `EX9-047.test.ts:81-105`: the public deletion rescue selects an own-trash Digimon whose effect text contains `[Negamon]`, while an opposing-trash copy and a non-matching Digimon are excluded; a second own Digimon whose text also contains Negamon remains for one-card selection.
- No unresolved EX9-047 Q&A gap remains.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate `[Eyesmon: Scatter Mode]` evolution for cost 1 | `digivolutionRequirement: [{ namesExact: ["Eyesmon: Scatter Mode"], cost: 1, isAlternate: true }]` at `EX9-047.ts:75-81` | Exact structural assertion at `EX9-047.test.ts:10-14`; public alternate route accepts EX9-048 and rejects unrelated BT10-062 at `:173-196`. |
| `<Rush>` and `<Collision>` | Separate static keyword entries at `EX9-047.ts:11-29` | Structural keyword assertion at `EX9-047.test.ts:49-55`; public play-then-attack Rush proof at `:107-126`; public Collision proof rejects a direct unsuspended Digimon attack, forces the player attack to open a must-block window, rejects decline, and resolves the block at `:16-48`. |
| Optional On Deletion return of one own-trash Digimon with `[Negamon]` in its text | `OnDeletion` optional `Return` to hand, target restricted to `zone: "trash"`, `controller: "mine"`, `kind: ["Digimon"]`, exact text matcher `{ tokens: ["Negamon"], match: "text" }`, count 1 at `EX9-047.ts:31-52` | Full structural target/optional assertion at `EX9-047.test.ts:56-74`; Q4802 public deletion route at `:81-105`; optional decline leaves the candidate and source in trash at `:128-138`. The Q4802 fixture includes two own Digimon with Negamon in their text, an own non-match, and an opponent copy to prove text matching plus ownership/zone/kind filtering. |
| Inherited All Turns +1000 DP | `AllTurns`, `isInherited: true`, self `ModifyDP` amount 1000 permanent at `EX9-047.ts:55-71` | Structural trigger/inheritance assertion at `EX9-047.test.ts:75-80`; public legal evolution and recompute/turn traversal observe 9000 DP across both turns at `:140-171`. |

The module has `coverage: "full"`, an empty `residual` array, and no duplicate legacy `registerCard` registration; the sole registration is `registerIrCard("EX9-047", compiled)` at `EX9-047.ts:84`.

#### Behavioral and peer/evolution-stack proof

- Public Collision proof covers the direct-target negative, forced blocking, block-decline rejection, battle deletion, security preservation, and attacker suspension.
- Public Rush proof plays EX9-047 and attacks immediately in the same turn.
- Public On Deletion proof covers own-trash text matching, opponent ownership rejection, non-match rejection, one-card selection, source deletion, and optional refusal.
- Public evolution proof covers exact alternate-name legality and the invalid level-4 negative; inherited proof checks stack identity, +1000 DP, and retention across both turns.
- The EX9-048 peer suite passed 6/6 and independently exercises `match: "text"` filtering for Negamon cards and inherited +1000 DP through legal evolution and both turns.
- Fixtures contain no Digi-Egg ids in deck or security; the Q4802 trash candidates are main-deck Digimon. No `advance.fire`, `fireTiming`, `fireSubTrigger`, or `EffectTiming` helper is used. Privileged `advance.verb.deletePermanent` is limited to the On Deletion setup, where no public deletion intent is available.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-047.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 10 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-047.test.ts src/cards/EX9/EX9-048.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 2 files, 16 tests** (EX9-048 peer: 6/6) |
| `pnpm typecheck` | **PASS** — shared build, shared/API/web typechecks completed successfully |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-047.ts apps/api/src/cards/EX9/EX9-047.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-047.ts apps/api/src/cards/EX9/EX9-047.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-047.ts apps/api/src/cards/EX9/EX9-047.test.ts docs/audits/EX9-reaudit/EX9-047.md` | **PASS** |
| `rg -n 'security:.*BT1-00[1-8]\|deck:.*BT1-00[1-8]\|advance\\.(fire\|fireTiming\|fireSubTrigger)\|fireTiming\|fireSubTrigger\|EffectTiming' apps/api/src/cards/EX9/EX9-047.test.ts` | **PASS — no forbidden fixture or injected-timing matches** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-047.ts`: unchanged; faithful full-coverage IR with exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-047.test.ts`: replaced Digi-Egg security/trash fixtures with main-deck Digimon, labeled Q4802, and strengthened exact target/inherited assertions; all 10 focused tests pass.
- `docs/audits/EX9-reaudit/EX9-047.md`: this report.
- No EX9-047 engine seam or Q&A gap remains. No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Concurrent worktree changes are outside this card's scope.

### EX9-048 — Eyesmon: Scatter Mode

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-048`, Eyesmon: Scatter Mode), a Black level-4 Digimon with `[Dark Dragon]` trait, play cost 5, and 4,000 DP.
- Printed evolution: Black Lv.3 cost 2.
- Printed effects: `[On Play]` by trashing one card with `[Negamon]` in its text from hand, draw 2. Inherited `[All Turns]` this Digimon gets +1000 DP.
- Local KB: `node tools/kb/query.mjs card EX9-048` → Q4803.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4803 | Verified. A card with `[Negamon]` in its text is matched through the complete printed-text matcher, not only by exact card name or trait; this includes printed name, traits, effects, inherited/security/link text, and requirements. | Live public play at `EX9-048.test.ts:22-36` trashes EX9-055 because its effect text contains `[Negamon]`; the complete-text engine matrix in `src/engine/effects/interpreter.test.ts` covers effect, inherited, security, link effect, link requirement, dual, and option text fields. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| On Play requires trashing one hand card with `[Negamon]` in its text | `EX9-048.ts:11-36`, `Draw` action with optional abort-on-decline trash cost, hand/controller filter, `match: "text"`, count 1 | Real public play at `EX9-048.test.ts:22-36` trashes the matching EX9-055; no-match negative at `:37-51` leaves hand/trash/deck unchanged, and declined-cost negative at `:53-66` leaves the candidate in hand. |
| Draw 2 after paying the cost | `EX9-048.ts:14-16`, `Draw` amount 2 coupled to the preceding cost | The payment branch at `EX9-048.test.ts:22-36` moves both deck cards to hand after the cost card reaches trash; structural assertion at `:10-16` checks the action shape. |
| Inherited All Turns +1000 DP | `EX9-048.ts:39-56`, inherited `AllTurns` self-target `ModifyDP` amount 1000, permanent duration | Public evolution at `EX9-048.test.ts:68-99` observes 9,000 DP after the 8,000-DP top card is evolved over the host and retains the bonus through both real turns; structural assertion at `:18-21` checks the inherited action. |

#### Peer / stack proof

- All behavioral cases use public `playCard` or `digivolve` intents; no direct timing-fire helper is used.
- Q4803's positive branch uses a live text-only match (EX9-055's effect references `[Negamon]`), while the no-match branch proves unrelated hand cards cannot pay the cost.
- The decline branch proves an available matching candidate remains in hand when the optional cost is refused.
- The inherited bonus is checked after legal evolution and across both real turn boundaries.
- All fixtures are legal main-deck cards; no Digi-Egg fixture is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-048` | PASS — Q4803 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-048.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 6 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts src/engine/mechanic.test.ts src/engine/effects/capabilities.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 3 files, 628 tests. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-048.ts apps/api/src/cards/EX9/EX9-048.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-048.ts apps/api/src/cards/EX9/EX9-048.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-048.ts apps/api/src/cards/EX9/EX9-048.test.ts docs/audits/EX9-reaudit/EX9-048.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-048.ts apps/api/src/cards/EX9/EX9-048.test.ts` | PASS — no direct timing-fire helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-048-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-048", compiled)`. Q4803 has direct live text-match proof plus complete-text mechanism coverage; no remaining card-local Q&A gap is known.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-049 — Sukamon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The suite proves the DM alternate evolution, the End of Your Turn Once Per Turn Ver.3 rescue, exact three-card face-down placement, the Q4804 all-or-nothing condition, and inherited Blocker. Direct timing-injection tests were removed in favor of the production turn loop.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-049` Sukamon, black level-4 Digimon, play cost 3, 3000 DP, `Abnormal/DM/Ver.3` traits.
- Alternate evolution: level 3 with `[DM]` trait, cost 2.
- End of Your Turn / Once Per Turn: by placing 3 Digimon cards with `[Ver.3]` from trash face down as this Digimon’s bottom digivolution cards, it may digivolve into a `[Ver.3]` Digimon card from hand or trash.
- Inherited effect: `＜Blocker＞`.
- Local KB query: `node tools/kb/query.mjs card EX9-049` → `Q4804`.
- Q4804 (2025-06-13): placing only 2 of the required 3 trash cards does not meet the “by” condition; the specified number must be placed.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects and stacks), `comprehensive-0076`/`0077` (face-down digivolution cards), `comprehensive-0125`/`0126` (digivolution procedure), `comprehensive-0170`/`0173`/`0176` (optional processing, trigger timing, and effect activation), and the End of Turn/Blocker timing rules.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4804 | Verified. A production End of Your Turn with only two eligible Ver.3 cards leaves the Sukamon, stack, trash, and hand unchanged; a declined three-card payment does the same. | `EX9-049.test.ts:128-152` uses `advance(...).runTurn(0)` and asserts no evolution or placement in both scenarios. |

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate `[Digivolve]` Lv.3 `[DM]`: cost 2 | `digivolutionRequirement: [{ level: 3, traits: ["DM"], cost: 2, isAlternate: true }]` at `EX9-049.ts:74-81` | Exact structure at `EX9-049.test.ts:38-39`; EX9-007 DM succeeds at cost 2 while non-DM BT1-009 is rejected (`:45-65`). |
| End of Your Turn / Once Per Turn | `EndOfYourTurn` effect with `frequency: "OncePerTurn"` at `EX9-049.ts:8-59` | Structural assertion at `EX9-049.test.ts:9-20`; real `advance(...).runTurn(0)` opens the production end-of-turn window in the positive and negative cases (`:67-88`, `:89-126`, `:128-152`). |
| By placing exactly 3 Ver.3 Digimon from trash face down at this stack’s bottom | `Digivolve` cost is a `place` action requiring count 3, own trash Digimon with Ver.3 trait, destination `digivolutionStack`, bottom position, face-down, self host, and `abortOnDecline` at `EX9-049.ts:31-55` | Exact cost structure at `EX9-049.test.ts:21-37`; hand and trash sources each resolve through the real turn loop and assert three hidden bottom cards (`:89-126`). Q4804 insufficient/declined payment preserves all zones (`:128-152`). |
| May digivolve into a Ver.3 Digimon from hand or trash | `Digivolve.into` mine Digimon with Ver.3 trait, `from: ["hand", "trash"]`, optional, `payCost: true` at `EX9-049.ts:19-31` | EX9-074 from hand and trash both become the top card after valid placement (`EX9-049.test.ts:89-126`); a non-Ver.3 BT10-064 in hand is not selected and no placement occurs (`:67-88`). |
| Inherited `＜Blocker＞` | Inherited static keyword entry at `EX9-049.ts:60-70` | Structural proof at `EX9-049.test.ts:40-44`; live combat with EX9-049 underneath BT2-063 declares Blocker, removes the attacker, suspends the blocker, and preserves security (`:155-178`). |

The module registers exclusively with `registerIrCard("EX9-049", compiled)` at `EX9-049.ts:84`; there is no duplicate legacy registration.

#### Behavioral and peer/stack proof

- Production turn-loop tests cover a valid three-card placement from trash and from hand, including hidden bottom stack order and subsequent Ver.3 evolution.
- Q4804 is directly covered with only two eligible Ver.3 cards and with a declined three-card payment; both preserve the source, stack, trash, and hand.
- A non-Ver.3 hand candidate is rejected without consuming the three-card placement cost.
- The DM alternate evolution is tested positively and negatively with stack and memory assertions.
- Inherited Blocker is exercised through a real attack/block declaration and combat resolution.
- All deck/security fixtures use main-deck Digimon; the former BT1-001 Digi-Egg security fixtures were replaced with inert BT1-012. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper remains.
- Peer suites cover End of Turn, Once Per Turn, and Blocker mechanisms; engine conformance suites cover turn-end timing, digivolution, deletion/advanced keywords, and blocking.
- No EX9-049-specific implementation, engine, or Q4804 gap is known.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-049` | **PASS** — Q4804 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-049.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 12 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-048.test.ts src/cards/EX9/EX9-055.test.ts src/cards/EX9/EX9-040.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 3 files, 38 tests** |
| `pnpm --filter @aegis/api exec vitest run src/engine/turnEndHarness.test.ts src/engine/conformance/ch08-digivolution.test.ts src/engine/conformance/ch16a-security-blocker-draw.test.ts src/engine/conformance/ch16c-deletion-and-advanced-keywords.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 4 files, 61 tests** |
| `pnpm typecheck` | **PASS** — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-049.ts apps/api/src/cards/EX9/EX9-049.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-049.ts apps/api/src/cards/EX9/EX9-049.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-049.ts apps/api/src/cards/EX9/EX9-049.test.ts docs/audits/EX9-reaudit/EX9-049.md` | **PASS** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-00[1-8]|DBG|console\\.log' apps/api/src/cards/EX9/EX9-049.ts apps/api/src/cards/EX9/EX9-049.test.ts` | **PASS — no injected timing, Digi-Egg, or debug matches.** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-049.ts`: unchanged; existing full-coverage IR is faithful and uses exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-049.test.ts`: removed direct `advance.fire` timing fixtures, replaced them with production `runTurn(0)` coverage, replaced BT1-001 security fixtures with BT1-012, added exact alternate evolution structure, and labeled Q4804 coverage.
- `docs/audits/EX9-reaudit/EX9-049.md`: this report.
- No EX9-049-specific implementation, engine, or Q4804 gap is known. Delivery gates remain coordinator-owned and are not claimed by this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-050 — Numemon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-050`, Numemon), a Black level-4 Digimon with `[Mollusk]/[DM]/[Ver.1]` traits, play cost 3, and 3,000 DP.
- Printed evolution: Black Lv.3 with `[DM]` trait, cost 2.
- Printed effects: `[End of Your Turn] [Once Per Turn]` by placing 3 `[Ver.1]` trait Digimon cards from trash face down as this Digimon's bottom digivolution cards, it may digivolve into a `[Ver.1]` trait Digimon card in hand or trash. Inherited `＜Blocker＞`.
- Local KB: `node tools/kb/query.mjs card EX9-050` → Q4805.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4805 | Verified. The “by placing 3” condition is atomic: two available `[Ver.1]` cards cannot partially pay it, so no cards move and no evolution occurs. | Real turn-end negative at `EX9-050.test.ts:150-169` has only two matching `[Ver.1]` Digimon and proves the host, stack, trash, hand, and pending decision are unchanged. The accepted three-card branch is at `:112-148`. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Black Lv.3 `[DM]` evolution for cost 2 | `EX9-050.ts:81-88`, alternate level 3 `[DM]`, cost 2 | Public digivolution matrix at `EX9-050.test.ts:31-51` accepts EX9-007 and rejects BT1-009, proving the DM trait gate and memory payment. |
| End of Your Turn once per turn | `EX9-050.ts:15-18` and `:65`, `EndOfYourTurn` trigger with `OncePerTurn` frequency | Accepted turn-end cases at `EX9-050.test.ts:112-148` run the production turn boundary; structural assertion at `:74-85` checks the trigger/frequency/action. |
| Place exactly 3 `[Ver.1]` Digimon cards from trash face down as this Digimon's bottom sources | `EX9-050.ts:39-61`, `place` cost count 3, trash/controller/kind/trait filter, `destination: "digivolutionStack"`, `position: "bottom"`, `host: "self"`, `faceDown: true` | Real hand/trash candidate cases at `EX9-050.test.ts:112-148` assert all three cards are face down at the bottom, the pre-existing EX9-046 source remains above them, and trash is emptied. Q4805 partial-payment negative is at `:150-169`. |
| Digivolve into a `[Ver.1]` Digimon card from hand or trash after paying its evolution cost | `EX9-050.ts:26-37`, `[Ver.1]` trait destination, `from: ["hand", "trash"]`, `payCost: true`, optional with `abortOnDecline` | Accepted evolution from both hand and trash at `EX9-050.test.ts:112-148` resolves to EX9-053 and pays the expected cost; declined complete payment at `:53-73` leaves every card unmoved. |
| Inherited `＜Blocker＞` | `EX9-050.ts:67-77`, inherited static keyword entry | Structural assertion at `EX9-050.test.ts:107-111` and live combat at `:171-194` show the host has Blocker, blocks a real attack, and becomes suspended after combat. |

#### Peer / stack proof

- Q4805 uses a real `runTurn(0)` production turn boundary rather than a direct timing-fire helper.
- Accepted payment is proven from both legal source zones (hand and trash), with exact face-down ordering and host stack preservation.
- The partial two-card case proves the place cost is all-or-nothing; the declined complete case proves optional refusal is also transactional.
- The alternate evolution route and inherited Blocker are exercised through public intents and live combat.
- All fixtures are legal main-deck cards; no Digi-Egg fixture or direct timing-fire helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-050` | PASS — Q4805 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-050.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 11 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts src/engine/mechanic.test.ts src/engine/effects/capabilities.test.ts src/engine/actions/digivolve.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 4 files, 663 tests. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-050.ts apps/api/src/cards/EX9/EX9-050.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-050.ts apps/api/src/cards/EX9/EX9-050.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-050.ts apps/api/src/cards/EX9/EX9-050.test.ts docs/audits/EX9-reaudit/EX9-050.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-050.ts apps/api/src/cards/EX9/EX9-050.test.ts` | PASS — no direct timing-fire helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-050-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-050", compiled)`. Q4805 has direct real-turn partial-payment proof; no remaining card-local Q&A gap is known.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-051 — Monochromon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and registers only through `registerIrCard`. The test update strengthened the complete Training/De-Digivolve cost mapping and inherited Blocker structural evidence; no implementation change was needed.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-051` (Monochromon), black level-4 Digimon, play cost 4, 4000 DP, `Ankylosaur/DM/Ver.4` traits.
- Normal evolution: black level 3 for cost 2.
- Keyword: `<Training>`.
- `[On Play] [When Attacking]`: by placing 1 card in hand face down as this Digimon's bottom digivolution card, `<De-Digivolve 1>` one opponent Digimon.
- Inherited effect: `<Blocker>`.
- Generated effect catalog agrees with the direct module: `packages/shared/src/effects/effects.json` entry `EX9-051` contains Training, identical optional hand-place/de-digivolve actions at On Play and When Attacking, inherited Blocker, and alternate level-3 DM cost 2.
- Comprehensive rules used: `§16-41` (`<Training>`, including breeding-area activation), `§16-12` (`<De-Digivolve>`), `§4-6` (stack order and bottom cards), and glossary action rules for Blocker and attack resolution.
- Local KB query returned no EX9-051 card-specific Q&A entries.

#### Q&A ledger

No EX9-051 Q&A entries were returned by `node tools/kb/query.mjs card EX9-051`; there are no Q&A ids or unresolved ruling-specific gaps for this card.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate level-3 `[DM]` evolution for cost 2 | `digivolutionRequirement: [{ level: 3, traits: ["DM"], cost: 2, isAlternate: true }]` at `EX9-051.ts:100-107` | Public route accepts off-color DM EX9-008 and rejects non-DM BT1-009 at `EX9-051.test.ts:105-123`; the module requirement is also covered by the suite's compiled-card registration. |
| `<Training>` | Static keyword entry at `EX9-051.ts:11-19` | Public Training activation places the deck top face down at the bottom, suspends the source, and works both in battle area and breeding area at `EX9-051.test.ts:33-63`; a second activation after unsuspending is proven for both locations at `:65-103`. The ordinary Main ability is not exposed in breeding, while Training remains usable, at `:10-32`. |
| On Play and When Attacking hand placement plus `<De-Digivolve 1>` | Both triggers use optional `DeDigivolve` amount 1 against one opposing Digimon, with a mine-hand `place` cost, face down, bottom, on self at `EX9-051.ts:21-85` | Complete trigger/cost/target structural proof at `EX9-051.test.ts:125-151`; public On Play accepts payment and de-digivolves one stack at `:157-180`; public attacks cover accepted and declined payment, stack placement, hand state, and resulting de-digivolution at `:182-204`; no-hand negative and explicit On Play decline are covered at `:206-242`. |
| Inherited `<Blocker>` | Static inherited keyword entry at `EX9-051.ts:87-96` | Exact `Static`/`isInherited`/keyword assertion at `EX9-051.test.ts:152-160`; public block declaration from a legal black level-5 host intercepts an opponent attack and preserves the defending security at `:244-267`. |

The module has `coverage: "full"`, an empty `residual` array, and no duplicate legacy `registerCard` registration; the sole registration is `registerIrCard("EX9-051", compiled)` at `EX9-051.ts:110`.

#### Behavioral and peer/evolution-stack proof

- Public Training proof covers both battle-area and breeding activation, bottom placement, face-down state, source suspension, deck consumption, and once-per-suspension behavior.
- Public normal/alternate evolution proof covers the DM route and a non-DM negative.
- Public On Play and attack proofs cover the shared optional hand payment, face-down bottom placement, one-card de-digivolution, refusal, no-payment negative, opponent stack result, and final hand/trash state.
- Inherited proof covers static Blocker registration and a real attack/block interaction from a level-5 host.
- The EX9-038 peer suite passed 16/16. The combined command below reports 32 tests total, with EX9-038 providing the independent Training placement and public attack mechanism regression.
- Fixtures contain no Digi-Egg ids in deck or security. No `advance.fire`, `fireTiming`, `fireSubTrigger`, or `EffectTiming` helper is used. Privileged `advance.verb` calls are limited to unsuspend setup; Training and attack behavior use public activation/attack intents.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-051.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 16 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-051.test.ts src/cards/EX9/EX9-038.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 2 files, 32 tests** (EX9-038 peer: 16/16) |
| `pnpm typecheck` | **PASS** — shared build, shared/API/web typechecks completed successfully |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-051.ts apps/api/src/cards/EX9/EX9-051.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-051.ts apps/api/src/cards/EX9/EX9-051.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-051.ts apps/api/src/cards/EX9/EX9-051.test.ts docs/audits/EX9-reaudit/EX9-051.md` | **PASS** |
| `rg -n 'security:.*BT1-00[1-8]\|deck:.*BT1-00[1-8]\|advance\\.(fire\|fireTiming\|fireSubTrigger)\|fireTiming\|fireSubTrigger\|EffectTiming' apps/api/src/cards/EX9/EX9-051.test.ts` | **PASS — no forbidden fixture or injected-timing matches** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-051.ts`: unchanged; faithful full-coverage IR with exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-051.test.ts`: strengthened exact Training/De-Digivolve target and cost mapping plus inherited Static Blocker assertions; all 16 focused tests pass.
- `docs/audits/EX9-reaudit/EX9-051.md`: this report.
- No EX9-051 engine seam or Q&A gap remains. No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Concurrent worktree changes are outside this card's scope.

### EX9-052 — Raremon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The suite proves the DM alternate evolution, the End of Your Turn Once Per Turn Ver.5 rescue, exact three-card face-down placement, Q4806’s all-or-nothing payment condition, and inherited On Deletion De-Digivolve 1. Direct timing-injection tests were removed in favor of the production turn loop.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-052` Raremon, black level-4 Digimon, play cost 4, 4000 DP, `Undead/DM/Ver.5/Cyborg` traits.
- Alternate evolution: level 3 with `[DM]` trait, cost 2.
- End of Your Turn / Once Per Turn: by placing 3 Digimon cards with `[Ver.5]` from trash face down as this Digimon’s bottom digivolution cards, it may digivolve into a `[Ver.5]` Digimon card from hand or trash.
- Inherited effect: when this card is deleted, De-Digivolve 1 opposing Digimon.
- Local KB query: `node tools/kb/query.mjs card EX9-052` → `Q4806`.
- Q4806 (2025-06-13): placing only 2 of the required 3 trash cards does not meet the “by” condition; the specified number must be placed.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects and stacks), `comprehensive-0076`/`0077` (face-down digivolution cards), `comprehensive-0125`/`0126` (digivolution procedure), `comprehensive-0170`/`0173`/`0176` (optional processing, trigger timing, and effect activation), and the End of Turn/De-Digivolve timing rules.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4806 | Verified. A production End of Your Turn with only two eligible Ver.5 cards, even with an opposing-trait card available, leaves Raremon and all zones unchanged. | `EX9-052.test.ts:54-76` uses `advance(...).runTurn(0)` and asserts no evolution, no placement, and unchanged own/opponent trash. The decline path at `:178-196` also preserves the source and trash. |

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate `[Digivolve]` Lv.3 `[DM]`: cost 2 | `digivolutionRequirement: [{ level: 3, traits: ["DM"], cost: 2, isAlternate: true }]` at `EX9-052.ts:83-90` | Exact structure at `EX9-052.test.ts:30-31`; EX9-007 DM succeeds at cost 2 while non-DM BT1-009 is rejected (`:32-52`). |
| End of Your Turn / Once Per Turn | `EndOfYourTurn` `Digivolve` with `frequency: "OncePerTurn"` at `EX9-052.ts:11-61` | Structural assertion at `EX9-052.test.ts:77-88`; real `advance(...).runTurn(0)` opens the production end-of-turn window for positive and negative cases (`:8-28`, `:54-76`, `:111-146`, `:178-196`). |
| By placing exactly 3 Ver.5 Digimon from trash face down at this stack’s bottom | `Digivolve` cost is a `place` action requiring count 3, own trash Digimon with Ver.5 trait, destination `digivolutionStack`, bottom position, face-down, self host, and `abortOnDecline` at `EX9-052.ts:35-59` | Exact cost structure at `EX9-052.test.ts:89-105`; hand and trash sources each resolve through the real turn loop and assert three hidden bottom cards (`:111-146`). Q4806 insufficient payment preserves all zones (`:54-76`). |
| May digivolve into a Ver.5 Digimon from hand or trash | `Digivolve.into` mine Digimon with Ver.5 trait, `from: ["hand", "trash"]`, optional, `payCost: true` at `EX9-052.ts:22-34` | EX9-043 from hand and trash becomes the top card after valid placement and paid evolution (`EX9-052.test.ts:111-146`); non-Ver.5 BT10-064 is not selected and no placement occurs (`:8-28`). |
| Inherited On Deletion De-Digivolve 1 | Inherited `OnDeletion` `DeDigivolve` targets one opponent Digimon for amount 1 at `EX9-052.ts:63-79` | Exact structure at `EX9-052.test.ts:106-110`; a real losing battle deletes the host and removes the opposing target’s top card (`:148-176`). |

The module registers exclusively with `registerIrCard("EX9-052", compiled)` at `EX9-052.ts:93`; there is no duplicate legacy registration.

#### Behavioral and peer/stack proof

- Production turn-loop tests cover a valid three-card placement from trash and from hand, including hidden bottom stack order and subsequent Ver.5 evolution.
- Q4806 is directly covered with only two eligible Ver.5 cards plus an ineligible own card and an opponent’s Ver.5 card; no partial payment is accepted.
- Optional decline preserves Raremon, its stack, the three-card trash payment, and the Ver.5 hand candidate.
- A non-Ver.5 hand candidate is rejected without consuming the three-card placement cost.
- The DM alternate evolution is tested positively and negatively with stack and memory assertions.
- Inherited De-Digivolve 1 is exercised through a real battle loss and asserts the opponent’s former top card is removed.
- All deck/security fixtures use main-deck Digimon or the existing BT8-104 Option security fixture; no Digi-Egg ids occur. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper remains.
- Peer suites cover Ver.3/Ver.5 end-of-turn evolution and Blocker mechanisms; engine conformance suites cover turn-end timing, digivolution, deletion/advanced keywords, and blocking.
- No EX9-052-specific implementation, engine, or Q4806 gap is known.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-052` | **PASS** — Q4806 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-052.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 12 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-049.test.ts src/cards/EX9/EX9-043.test.ts src/cards/EX9/EX9-040.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 3 files, 43 tests** |
| `pnpm --filter @aegis/api exec vitest run src/engine/turnEndHarness.test.ts src/engine/conformance/ch08-digivolution.test.ts src/engine/conformance/ch16a-security-blocker-draw.test.ts src/engine/conformance/ch16c-deletion-and-advanced-keywords.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 4 files, 61 tests** |
| `pnpm typecheck` | **PASS** — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-052.ts apps/api/src/cards/EX9/EX9-052.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-052.ts apps/api/src/cards/EX9/EX9-052.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-052.ts apps/api/src/cards/EX9/EX9-052.test.ts docs/audits/EX9-reaudit/EX9-052.md` | **PASS** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-00[1-8]|DBG|console\\.log' apps/api/src/cards/EX9/EX9-052.ts apps/api/src/cards/EX9/EX9-052.test.ts` | **PASS — no injected timing, Digi-Egg, or debug matches.** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-052.ts`: unchanged; existing full-coverage IR is faithful and uses exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-052.test.ts`: removed direct `advance.fire` timing fixtures, replaced them with production `runTurn(0)` coverage, added exact alternate evolution structure, and labeled Q4806 coverage.
- `docs/audits/EX9-reaudit/EX9-052.md`: this report.
- No EX9-052-specific implementation, engine, or Q4806 gap is known. Delivery gates remain coordinator-owned and are not claimed by this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-053 — Mamemon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and registers only through `registerIrCard`. The test update labels Q4807, strengthens the exact reveal/play mapping and inherited watcher scope, and adds a real next-turn reset proof for the inherited Once Per Turn effect; no implementation change was needed.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-053` (Mamemon), black level-5 Digimon, play cost 7, 7000 DP, `Mutant/DM/Ver.1` traits.
- Alternate evolution: `[Digivolve] Lv.4 w/[DM] trait: Cost 3`.
- Keyword: `<Collision>`.
- `[On Play] [When Digivolving]`: reveal the top 3 cards; you may play one play-cost-4-or-lower `[DM]` trait card among them without paying its cost; add 1 to the maximum for each face-down digivolution card of this Digimon; return the rest to the bottom of the deck.
- Inherited effect: `[When Attacking] [Once Per Turn] <De-Digivolve 1> 1 of your opponent's Digimon.`
- Generated effect catalog agrees with the direct module: `packages/shared/src/effects/effects.json` entry `EX9-053` contains Collision, identical On Play/When Digivolving reveal/play actions with face-down-source scaling, and the inherited once-per-turn de-digivolve watcher.
- Comprehensive rules used: `§4-6` (stack order and face-up/face-down sources), `§15-15-3-5` (reveals and deck return), `§16-12` (`<De-Digivolve>`), and glossary/combat rules for Collision and attack timing.

#### Q&A ledger

- **Q4807** (KB query: `node tools/kb/query.mjs card EX9-053`): either Digimon cards or Tamer cards may be played by the On Play/When Digivolving effect. Covered explicitly by `EX9-053.test.ts:95-144` structural mapping without a `kind` restriction, a public DM Digimon play at `:145-166`, and a public DM Tamer play (`EX9-068`) after digivolution at `:168-197`.
- No unresolved EX9-053 Q&A gap remains.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate level-4 `[DM]` evolution for cost 3 | `digivolutionRequirement: [{ level: 4, traits: ["DM"], cost: 3, isAlternate: true }]` at `EX9-053.ts:103-110` | Public breeding evolution accepts EX9-009 and rejects non-DM BT1-016 at `EX9-053.test.ts:45-64`. |
| `<Collision>` | Static keyword entry at `EX9-053.ts:11-19` | Structural keyword assertion and public forced-block battle proof at `EX9-053.test.ts:66-94`; the opponent cannot decline the must-block window and the attacker wins, deleting the blocker. |
| On Play / When Digivolving reveal-three and optional free play | Both triggers use `RevealAdd` count 3, optional play of one own `[DM]` trait card with `playCostLte: 4`, `to: "play"`, and `rest: "deckBottom"` at `EX9-053.ts:21-81` | Exact dual-trigger mapping at `EX9-053.test.ts:95-144`; public On Play DM Digimon route at `:145-166`; public When Digivolving DM Tamer route at `:168-197`; explicit refusal bottoms every reveal without playing at `:199-237`. |
| Face-down-source scaling adds 1 to play-cost maximum per card | `playCostLteScaling: { per: 1, unit: "selfFaceDownDigivolutionCards" }` on both reveal actions | Three public evolution cases at `EX9-053.test.ts:8-43` prove no source/face-up source cannot play the cost-5 DM card, while one face-down source raises the limit and plays it; memory, deck, hand, and battle-area state are asserted. |
| Inherited When Attacking Once Per Turn `<De-Digivolve 1>` | `WhenAttacking`, inherited, `frequency: "OncePerTurn"`, self watcher targeting one opposing Digimon, amount 1 at `EX9-053.ts:83-99` | Full structural target/frequency proof at `EX9-053.test.ts:112-124`; public host attacks de-digivolve two different targets only once in one turn, suppress the third same-turn trigger, then de-digivolve the third after a real turn transition at `:239-308`. |

The module has `coverage: "full"`, an empty `residual` array, and no duplicate legacy `registerCard` registration; the sole registration is `registerIrCard("EX9-053", compiled)` at `EX9-053.ts:113`.

#### Behavioral and peer/evolution-stack proof

- Public evolution covers the alternate DM route and non-DM rejection, including breeding-area legality.
- Public On Play and When Digivolving proofs cover both printed timings, free play, DM Digimon and DM Tamer eligibility, source scaling, deck-bottom return, optional refusal, and final hand/memory/deck/stack state.
- Collision proof covers the forced block boundary and battle result.
- Inherited proof covers first and second same-turn host attacks, once-per-turn exhaustion, and reset after a real opponent/own turn boundary.
- The EX9-038 peer suite passed 16/16 and independently exercises Training’s public placement/stack mechanism and On Play/When Attacking timing behavior.
- Fixtures contain no Digi-Egg ids in deck or security. No `advance.fire`, `fireTiming`, `fireSubTrigger`, or `EffectTiming` helper is used. Privileged `advance.verb.unsuspend` is limited to the inherited attack setup; all card effects are reached through public play, digivolve, attack, and decision intents.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-053.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 14 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-053.test.ts src/cards/EX9/EX9-038.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 2 files, 30 tests** (EX9-038 peer: 16/16) |
| `pnpm typecheck` | **PASS** — shared build, shared/API/web typechecks completed successfully |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-053.ts apps/api/src/cards/EX9/EX9-053.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-053.ts apps/api/src/cards/EX9/EX9-053.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-053.ts apps/api/src/cards/EX9/EX9-053.test.ts docs/audits/EX9-reaudit/EX9-053.md` | **PASS** |
| `rg -n 'security:.*BT1-00[1-8]\|deck:.*BT1-00[1-8]\|advance\\.(fire\|fireTiming\|fireSubTrigger)\|fireTiming\|fireSubTrigger\|EffectTiming' apps/api/src/cards/EX9/EX9-053.test.ts` | **PASS — no forbidden fixture or injected-timing matches** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-053.ts`: unchanged; faithful full-coverage IR with exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-053.test.ts`: labeled Q4807, strengthened reveal/inherited structural assertions, and added real once-per-turn reset coverage; all 14 focused tests pass.
- `docs/audits/EX9-reaudit/EX9-053.md`: this report.
- No EX9-053 engine seam or Q&A gap remains. No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Concurrent worktree changes are outside this card's scope.

### EX9-054 — RareRaremon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-054`, RareRaremon), a Black level-5 Digimon with `[Undead]` trait, play cost 7, and 7,000 DP.
- Printed evolution: Black Lv.4 cost 3.
- Printed effects: `[On Play] [When Digivolving]` de-digivolve one opposing Digimon; `[On Deletion]` optionally play a level 4 or lower Digimon with `[Negamon]` in its text from hand without paying, adding 1 to the level maximum for every 2 `[Negamon]` in your trash or Digimon's digivolution cards. Inherited `[All Turns] [Once Per Turn]` when attack targets change, if this Digimon has `[Abbadomon]` in its name, it unsuspends.
- Local KB: `node tools/kb/query.mjs card EX9-054` → Q4808, Q4809.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4808 | Verified. One exact named `[Negamon]` in trash plus one exact named `[Negamon]` in a Digimon's digivolution cards counts as two total cards, raising the level maximum by 1. | Real deletion at `EX9-054.test.ts:10-34` has one EX9-005 in trash and one under EX9-047, and plays the level-5 EX9-054 candidate while leaving the level-6 EX9-055 candidate in hand. |
| Q4809 | Verified. `match: "text"` covers complete printed text, while the scaling clause intentionally uses `nameExact` for exact named Negamon cards. | Exact-name scaling proof at `EX9-054.test.ts:226-245` counts two Negamon Digi-Eggs; `:247-264` proves cards that merely mention Negamon in their effects do not count toward the scaling pool. The complete-text engine matrix is covered by `src/engine/effects/interpreter.test.ts`. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| On Play and When Digivolving de-digivolve one opposing Digimon | `EX9-054.ts:12-42`, separate opponent-Digimon `DeDigivolve` actions with amount 1 | Public play and digivolution matrix at `EX9-054.test.ts:165-209` de-digivolves only the selected opposing stack, preserves the peer stack, and asserts expected memory/host stacks. |
| On Deletion optionally play a level 4 or lower Digimon with `[Negamon]` in its text from hand without paying | `EX9-054.ts:44-84`, optional `PlayWithoutCost`, hand source, own Digimon target, level `lte 4`, `match: "text"`, `payCost: false` | Real deletion at `EX9-054.test.ts:210-224` plays EX9-047 from hand; decline at `:266-279` leaves the qualifying card in hand. Structural assertion at `:41-49` checks the hand/text/level shape. |
| Add 1 to the level maximum for every 2 exact named `[Negamon]` in trash or digivolution cards | `EX9-054.ts:52-70`, `levelComparison` scaling `per: 2`, zones `trash` + `digivolutionCards`, kinds Digimon/DigiEgg, `nameExact` Negamon | Q4808 cross-zone proof at `EX9-054.test.ts:10-34`; exact-name Digi-Egg count at `:226-245`; effect-text-only negatives at `:247-264`; scaling structure at `:50-76`. |
| Inherited once-per-turn unsuspend on attack-target switch when this Digimon has Abbadomon in its name | `EX9-054.ts:87-114`, inherited `AllTurns` `whenAttackTargetSwitched` sub-trigger, self-name condition, self `Unsuspend`, `OncePerTurn` | Real blocker redirection at `EX9-054.test.ts:82-110` unsuspends the Abbadomon host; two successive real target switches at `:111-164` prove only the first unsuspends it. Structural assertion at `:77-81`. |

#### Peer / stack proof

- Q4808 uses a real deletion intent and verifies a mixed trash/digivolution-card scaling pool, the level-5 candidate being played, and the level-6 candidate remaining in hand.
- Q4809 separates exact named Negamon counting from broader effect-text matching with positive and negative live deletion cases.
- On Play/When Digivolving are exercised through public play and digivolve intents with two opposing stacks, proving target isolation.
- The inherited attack-target-switch clause uses real blocker combat, including a once-per-turn second-switch negative.
- Digi-Egg fixtures appear only in legal trash/digivolution-card scaling scenarios; no Digi-Egg deck or security fixture is used, and no direct timing-fire helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-054` | PASS — Q4808 and Q4809 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-054.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 13 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts src/engine/mechanic.test.ts src/engine/effects/capabilities.test.ts src/engine/combat/attackIntegration.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 4 files, 637 tests; emits the existing unrelated AD1-002 legacy `ActivateEffect` warning. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-054.ts apps/api/src/cards/EX9/EX9-054.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-054.ts apps/api/src/cards/EX9/EX9-054.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-054.ts apps/api/src/cards/EX9/EX9-054.test.ts docs/audits/EX9-reaudit/EX9-054.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-054.ts apps/api/src/cards/EX9/EX9-054.test.ts` | PASS — no direct timing-fire helper or illegal deck/security Digi-Egg fixture. |

#### Defects and gaps

No EX9-054-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-054", compiled)`. Q4808 and Q4809 have direct behavioral proof; the mechanism warning is unrelated legacy AD1-002 output and all 637 tests passed. No remaining card-local Q&A gap is known.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-055 — Abbadomon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and registers only through `registerIrCard`. The test suite now provides public-intent proof for both play triggers, the four-card cross-zone condition, the End of All Turns placement/deletion effect, its once-per-turn reset, Digi-Egg exclusion, and optional decline paths.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-055` (Abbadomon), black level-6 Digimon, play cost 11, 11000 DP, `Unknown/Unidentified` trait.
- `[On Play] [When Digivolving]`: if there are four or more total `[Negamon]` in trash and this Digimon's digivolution cards, you may play one `[Abbadomon Core]` from hand or trash without cost to the empty breeding area.
- `[End of All Turns] [Once Per Turn]`: by placing one level-6-or-lower Digimon card with `[Negamon]` in its text from trash as this Digimon's top digivolution card, delete one opponent Digimon of the same level as the placed card.
- Generated effect/catalog data agrees with the direct module's dual play triggers, cross-zone count, exact Core target, empty-breeding requirement, top-stack placement, text match, stored-level comparison, and once-per-turn End of All Turns watcher.
- Comprehensive rules used: `§4-6` (digivolution-stack order), `§15-15-3-5` (effect card selection/references), and trigger/once-per-turn rules for End of All Turns.

#### Q&A ledger

- **Q4810** (`node tools/kb/query.mjs card EX9-055`): two `[Negamon]` in trash plus two in digivolution cards satisfies the four-card condition. Covered by the real digivolution cases at `EX9-055.test.ts:262-304`, with source stacks and trash asserted and Core played from both hand and trash.
- **Q4811**: the End of All Turns cost cannot place a Digi-Egg with `[Negamon]` in its text. Covered structurally at `EX9-055.test.ts:138-157` (`kind: ["Digimon"]`, excluding `DigiEgg`) and behaviorally at `:8-33` with Digi-Egg, nonmatching, over-level, and explicit-decline cases.
- **Q4812**: “with `[Negamon]` in its text” includes names, traits, effects, inherited effects, Rule, evolution requirements, DNA/DigiXros, burst, App Fusion, Link, and Assembly requirements. The implementation uses the interpreter's `nameOrTrait` `match: "text"` matcher; behavioral payment cases at `:158-195` use an effect-text match (`EX9-047`) and a name match (`EX9-055`) while rejecting unrelated level-compatible cards.
- No unresolved EX9-055 Q&A gap remains.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| On Play / When Digivolving count four total `[Negamon]` in trash and digivolution cards | Both triggers use `PlayWithoutCost` with `condition.kind: "youHave"`, `count: 4`, own trash/digivolution-card zones, Digimon/Digi-Egg kinds, and exact `[Negamon]` name matching at `EX9-055.ts:7-82` | Structural dual-trigger assertion at `EX9-055.test.ts:120-137`; public On Play from both eligible zones at `:238-260`; public When Digivolving with two trash and two source-stack Negamon at `:262-304`; four negative condition/empty-breeding cases at `:34-65`. |
| Play one `[Abbadomon Core]` from hand or trash without cost to empty breeding | `PlayWithoutCost`, target exact Core name, `from: ["hand", "trash"]`, `payCost: false`, `requiresEmpty: "breedingArea"`, `breeding: true`, optional at `EX9-055.ts:13-48` | Hand/trash On Play routes assert the Core enters breeding without cost; failed-condition and occupied-breeding cases assert no play and no pending decision. |
| End of All Turns once per turn | `trigger: "EndOfAllTurns"`, `frequency: "OncePerTurn"` at `EX9-055.ts:84-144` | Structural trigger/frequency assertion at `EX9-055.test.ts:78-119`; public `advance(...).runTurn(seat)` cases at `:158-195` and real next-turn reset at `:197-236`. |
| Place a level-6-or-lower Digimon with `[Negamon]` in its text from trash as this Digimon's top digivolution card | Optional abortable `place` cost, own trash, Digimon-only, level `<= 6`, `nameOrTrait.match: "text"`, destination `digivolutionStack`, `position: "top"`, `host: "self"`, and `storeAs: "ex9055PlacedLevel"` at `EX9-055.ts:105-137` | Q4811 structural and behavioral Digi-Egg exclusion; Q4812 public payment cases assert top-stack identity/face-up state, empty trash, and effect-text/name matches. |
| Delete one opponent Digimon of the same level as the placed card | `Delete` opponent Digimon count one with equality scaling from stored `ex9055PlacedLevel` at `EX9-055.ts:87-103` | Level-6 and level-5 payments delete only matching targets and leave the peer target; two same-level targets demonstrate deterministic one-per-trigger deletion. |

The module has `coverage: "full"`, an empty `residual` array, and no duplicate legacy `registerCard` registration; the sole registration is `registerIrCard("EX9-055", compiled)` at `EX9-055.ts:150`.

#### Behavioral and peer/evolution-stack proof

- Public On Play and When Digivolving proofs cover hand/trash Core sourcing, exact four-card cross-zone counting, source digivolution cards, failed count, opponent-zone non-counting, non-name text rejection, occupied breeding, and optional decline.
- Public End of All Turns proofs cover both current-turn seats, payment from effect text and card name, level-6/level-5 matching, top-stack placement, Digi-Egg rejection, optional decline, one deletion per trigger, and once-per-turn exhaustion/reset after a real intervening turn.
- The adjacent EX9-053 peer suite passed 14/14 and independently exercises public evolution, reveal/play, deck return, optional decisions, and real turn advancement; combined EX9-055 + peer passed 37/37.
- Fixtures contain no Digi-Egg ids in deck or security. Digi-Egg fixtures appear only in trash or existing digivolution stacks where the printed Q4810/Q4811 semantics require them. No `advance.fire`, `fireTiming`, `fireSubTrigger`, or `EffectTiming` helper is used.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-055.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 23 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-053.test.ts src/cards/EX9/EX9-055.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 2 files, 37 tests** (EX9-053 peer: 14/14) |
| `node tools/kb/query.mjs card EX9-055` | **PASS — Q4810, Q4811, Q4812 returned** |
| `pnpm typecheck` | **PASS** — shared build, shared/API/web typechecks completed successfully |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-055.ts apps/api/src/cards/EX9/EX9-055.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-055.ts apps/api/src/cards/EX9/EX9-055.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-055.ts apps/api/src/cards/EX9/EX9-055.test.ts docs/audits/EX9-reaudit/EX9-055.md` | **PASS** |
| `rg -n 'security:.*BT1-00[1-8]\|deck:.*BT1-00[1-8]\|advance\\.(fire\|fireTiming\|fireSubTrigger)\|fireTiming\|fireSubTrigger\|EffectTiming' apps/api/src/cards/EX9/EX9-055.test.ts` | **PASS — no forbidden fixture or injected-timing matches** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-055.ts`: unchanged; faithful full-coverage IR with exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-055.test.ts`: labeled Q4810–Q4812, replaced injected timing with public turn advancement, strengthened structural and behavioral coverage, and retained only legal trash/stack Digi-Egg fixtures; all 23 focused tests pass.
- `docs/audits/EX9-reaudit/EX9-055.md`: this report.
- No EX9-055 engine seam or Q&A gap remains. No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Concurrent worktree changes are outside this card's scope.

### EX9-056 — HiAndromon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The suite proves Blast Digivolve, both Q4813 security-payment controller choices, Q4814 self-protection, Q4815 all-target simultaneous protection, exact 8000-DP boundary handling, and the DM alternate evolution.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-056` HiAndromon, black/yellow level-6 Digimon, play cost 7, 12000 DP, `Cyborg/DM/Ver.3` traits, Ace.
- Alternate evolution: level 5 with `[DM]` trait, cost 3.
- Hand Counter keyword: `＜Blast Digivolve＞`.
- On Play / When Digivolving: by placing 1 Digimon with 8000 DP or less as the bottom security card, trash the opponent’s top security card.
- All Turns / Once Per Turn: when any own `[Ver.3]` Digimon would leave the battle area, by trashing your top security card, it does not leave; the effect affects all qualifying simultaneous leaves.
- Local KB query: `node tools/kb/query.mjs card EX9-056` → `Q4813`, `Q4814`, `Q4815`.
- Q4813 (2025-06-13): either the controller’s or opponent’s Digimon may be placed as the bottom security card.
- Q4814: the All Turns effect also triggers when HiAndromon itself would leave.
- Q4815: one activation prevents all own Ver.3 Digimon leaving simultaneously; it does not require choosing them individually.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited/stack context), `comprehensive-0076`/`0077` (digivolution cards), `comprehensive-0125`/`0126` (digivolution procedure), `comprehensive-0170`/`0173`/`0176` (optional processing, trigger timing, and effect activation), and the Counter/security/replacement timing rules.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4813 | Verified. A real On Play route places an opponent’s qualifying Digimon at its owner’s security bottom; a real When Digivolving route places the controller’s own qualifying Digimon at the controller’s security bottom. | `EX9-056.test.ts:239-299` asserts both security owners, bottom order, face-down state, and top-security trash. |
| Q4814 | Verified. The All Turns replacement protects a qualifying Ver.3 ally and HiAndromon itself. | `EX9-056.test.ts:301-342` performs production deletion verbs and asserts the target/source remains while one top security card is trashed. |
| Q4815 | Verified. One accepted security payment protects every own Ver.3 in one simultaneous deletion, including when HiAndromon itself is among the targets. | `EX9-056.test.ts:160-190` covers both target sets and asserts all three permanents remain with exactly one security card trashed. |

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate `[Digivolve]` Lv.5 `[DM]`: cost 3 | `digivolutionRequirement: [{ level: 5, traits: ["DM"], cost: 3, isAlternate: true }]` at `EX9-056.ts:118-125` | Exact structure at `EX9-056.test.ts:31-32`; DM EX9-011 succeeds while non-DM BT1-024 is rejected (`:9-30`). |
| Hand `＜Blast Digivolve＞` | Static Counter keyword entry with `isFromHand: true` at `EX9-056.ts:10-20` | Real attack opens a counter window, responds with EX9-056, and resolves the free Blast Digivolve (`EX9-056.test.ts:33-75`). |
| On Play / When Digivolving by placing 1 8000-DP-or-lower Digimon as bottom security, trash opponent’s top security | Each trigger uses `SecurityManipulation` `trashTop`, controller opponent, amount 1, optional placement cost targeting `controller: "any"`, Digimon, `dp <= 8000`, bottom, face-down at `EX9-056.ts:22-84` | Structural and exact DP-boundary proof at `EX9-056.test.ts:191-238`; Q4813 positive On Play and When Digivolving routes at `:239-299`; accepted/declined and unavailable costs leave security unchanged (`:97-159`). |
| All Turns / Once Per Turn protects all own Ver.3 leaves by trashing top security | `AllTurns` frequency `OncePerTurn`, `Replacement` `wouldLeavePlay`, mode `prevent`, mine Ver.3 target, `affectsAll: true`, cost `trashSecurityTop` at `EX9-056.ts:86-114` | Q4814 ally/source protection at `EX9-056.test.ts:301-342`; Q4815 simultaneous deletion and one payment at `:160-190`; nonmatching ally/opponent and unavailable/declined payment paths do not protect (`:77-118`). |

The module registers exclusively with `registerIrCard("EX9-056", compiled)` at `EX9-056.ts:128`; there is no duplicate legacy registration.

#### Behavioral and peer/stack proof

- Real Counter flow proves Blast Digivolve from hand, zero memory payment, host stack, attacker deletion, and the resulting security state.
- Q4813 is covered from both sides of the placement choice: opposing Digimon on play and own Digimon on evolution, with exact bottom security and top-security trash assertions.
- Exact `<= 8000` semantics are exercised with 8000 DP and 8001 DP fixtures; no invalid cost pays or trashes security.
- Q4814 proves both a qualifying ally and HiAndromon itself remain in play after attempted deletion.
- Q4815 proves one payment protects all own qualifying Ver.3 simultaneous leaves, including the source.
- Nonmatching ally/opponent, optional decline, unavailable security, and no-target paths remain negative.
- All deck/security fixtures use main-deck Digimon; no Digi-Egg ids occur. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper is used.
- Peer suites cover Blast Digivolve and Once Per Turn/security replacement; engine suites cover Blast Counter, deletion/advanced keywords, combat keywords, and interpreter behavior.
- No EX9-056-specific implementation, engine, or Q4813–Q4815 gap is known.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-056` | **PASS** — Q4813, Q4814, and Q4815 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-056.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 21 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-020.test.ts src/cards/EX9/EX9-065.test.ts src/cards/EX9/EX9-049.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 3 files, 41 tests** |
| `pnpm --filter @aegis/api exec vitest run src/engine/blastDnaCounter.test.ts src/engine/conformance/ch16c-deletion-and-advanced-keywords.test.ts src/engine/combat/keywords.test.ts src/engine/effects/interpreter.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 4 files, 361 tests** |
| `pnpm typecheck` | **PASS** — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-056.ts apps/api/src/cards/EX9/EX9-056.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-056.ts apps/api/src/cards/EX9/EX9-056.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-056.ts apps/api/src/cards/EX9/EX9-056.test.ts docs/audits/EX9-reaudit/EX9-056.md` | **PASS** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-00[1-8]|DBG|console\\.log' apps/api/src/cards/EX9/EX9-056.ts apps/api/src/cards/EX9/EX9-056.test.ts` | **PASS — no injected timing, Digi-Egg, or debug matches.** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-056.ts`: unchanged; existing full-coverage IR is faithful and uses exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-056.test.ts`: added exact alternate evolution structure and explicit Q4813/Q4814 labels; existing public Counter, security, and replacement behavior remains green.
- `docs/audits/EX9-reaudit/EX9-056.md`: this report.
- No EX9-056-specific implementation, engine, or Q4813–Q4815 gap is known. Delivery gates remain coordinator-owned and are not claimed by this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-057 — Abbadomon Core

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-057`, Abbadomon Core), a Black level-7 Digimon with `[Unidentified]` trait, play cost 15, and 15,000 DP.
- Printed evolution: `[Digivolve]` `[Abbadomon]`, cost 4.
- Printed effects: `＜Collision＞`, `＜Piercing＞`, `＜Security A. +1＞`, `＜Reboot＞`, `＜Blocker＞`; breeding opponent-turn effect returns 4 exact named `[Negamon]` cards from trash/digivolution cards to the bottom of the Digi-Egg deck, then moves this card to battle; `[When Moving] [When Digivolving] [When Attacking]` places 3 level 6 or lower Digimon with `[Negamon]` in their text from trash as this Digimon's top digivolution cards, then deletes all opposing lowest-level Digimon.
- Local KB: `node tools/kb/query.mjs card EX9-057` → Q4816–Q4821.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4816 | Verified. Four exact named Negamon cards may be assembled across trash and Digimon digivolution cards. | Real opponent attack at `EX9-057.test.ts:210-269` uses two trash Negamon cards plus two stack Negamon cards, returns all four to the Digi-Egg deck, moves Core to battle, and resolves When Moving. |
| Q4817 | Verified. Returning only three of the required four cards cannot satisfy the breeding effect. | Real opponent attack matrix at `EX9-057.test.ts:45-78` has only three eligible cards in one branch and explicitly declined four-card payment in the other; Core remains in breeding and cards stay in their zones. |
| Q4818 | Verified. The top-stack effect is all-or-nothing: two eligible trash cards cannot partially pay the required three-card placement. | Public digivolution negative matrix at `EX9-057.test.ts:161-190` leaves the host stack, trash, and opposing Digimon unchanged when only two eligible cards remain; positive public evolution is at `:118-159`. |
| Q4819 | Verified. A Core moved from breeding by its opponent-turn effect can resolve its When Moving effect and then block the same attack. | Real attack at `EX9-057.test.ts:210-269` moves Core, resolves the three-card When Moving cost and lowest-level deletion, opens the block window, and accepts Core's block. |
| Q4820 | Verified. `match: "text"` is complete printed-text matching, while the breeding/top-stack payment uses `nameExact` where the card text says named Negamon. | `EX9-057.test.ts:335-356` uses a real attack to prove cards that only mention Negamon do not satisfy the exact-name breeding cost; positive text matching uses EX9-047/048/054 in the real top-stack/evolution cases. The complete-text engine matrix is covered by `src/engine/effects/interpreter.test.ts`. |
| Q4821 | Verified. The breeding-only effect can trigger only while Core is in the breeding area; a battle-area Core does not pay that return cost. | Real attack negative at `EX9-057.test.ts:8-44` leaves a battle-area Core in place, with no egg-deck movement and no stack change; positive breeding proof is at `:45-78` and `:210-269`. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Alternate evolution from `[Abbadomon]` for cost 4 | `EX9-057.ts:290-296`, exact name `Abbadomon`, alternate cost 4 | Public evolution matrix at `EX9-057.test.ts:118-159` accepts both the alternate Abbadomon base and ordinary base route; exact-name rejection at `:192-209` rejects an Abbadomon Core base. |
| Breeding opponent-turn effect: return 4 named Negamon from trash/digivolution cards, then move to battle | `EX9-057.ts:12-54`, breeding `whenOpponentAttacks` sub-trigger, self move, return count 4, trash/digivolution-card zones, Digimon/DigiEgg kinds, `nameExact` Negamon, optional abort-on-decline | Q4816/Q4819 real attack at `EX9-057.test.ts:210-269`; Q4817 incomplete/refused matrix at `:45-78`; Q4821 battle-area negative at `:8-44`; structural trigger proof at `:270-297`. |
| Collision, Piercing, Security A. +1, Reboot, Blocker | `EX9-057.ts:55-154`, five self-target permanent `GainKeyword` entries | Live combat at `EX9-057.test.ts:80-117` forces a Blocker, performs two Piercing security checks, and confirms Reboot unsuspends on the opponent's turn; structural keyword assertion at `:298-305`. |
| When Moving, When Digivolving, and When Attacking: place exactly 3 level 6-or-lower Negamon-text Digimon from trash on top, then delete all opposing lowest-level Digimon | `EX9-057.ts:156-286`, three parallel optional `Delete` actions, count 3 top placement, trash Digimon level ≤6 and `match: "text"` filter, opponent lowest-level `count: "all"` target | Public When Moving proof at `EX9-057.test.ts:210-269`; public When Digivolving positive/partial/decline proof at `:118-190` and `:381-409`; public When Attacking proof at `:358-379`; structural shared-shape assertion at `:306-334`. |

#### Peer / stack proof

- Q4816/Q4819 uses a real opponent attack, mixed trash/stack payment, production move-to-battle, When Moving deletion, and a real block response in the same attack.
- Q4817 and Q4818 use public attacks/digivolutions with incomplete and declined costs, proving all-or-nothing transactional behavior.
- Q4820 separates exact named Negamon matching from broader Negamon text matching with positive and negative live cases.
- Q4821 contrasts a breeding-area Core with a battle-area Core under the same opponent attack.
- Digi-Egg fixtures are used only in the correct egg deck/trash/digivolution-card zones; no Digi-Egg deck/security fixture or direct timing-fire helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-057` | PASS — Q4816, Q4817, Q4818, Q4819, Q4820, Q4821 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-057.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 18 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts src/engine/mechanic.test.ts src/engine/effects/capabilities.test.ts src/engine/combat/attackIntegration.test.ts src/engine/deckInteractions.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 5 files, 953 tests; emits the existing unrelated AD1-002 legacy `ActivateEffect` warning. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-057.ts apps/api/src/cards/EX9/EX9-057.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-057.ts apps/api/src/cards/EX9/EX9-057.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-057.ts apps/api/src/cards/EX9/EX9-057.test.ts docs/audits/EX9-reaudit/EX9-057.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-057.ts apps/api/src/cards/EX9/EX9-057.test.ts` | PASS — no direct timing-fire helper or forbidden BT1-001/002 fixture. |

#### Defects and gaps

No EX9-057-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-057", compiled)`. Q4816–Q4821 each have direct behavioral coverage; the mechanism warning is unrelated legacy AD1-002 output and all 953 tests passed. No remaining card-local Q&A gap is known.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-058 — Gazimon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The suite proves the DM alternate evolution, Q4822’s mandatory DM-first selection, remaining Ver.5 placement under a DM host, bottoming of the rest, and inherited Retaliation.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-058` Gazimon, black level-3 Digimon, play cost 3, 2000 DP, `Mammal/DM/Ver.5` traits.
- Alternate evolution: level 2 with `[DM]` trait, cost 0.
- On Play: reveal 3 cards; add 1 `[DM]` card to hand, place 1 remaining `[Ver.5]` card face down under one of your `[DM]` Digimon, and return the rest to the bottom of the deck.
- Inherited effect: `＜Retaliation＞`.
- Local KB query: `node tools/kb/query.mjs card EX9-058` → `Q4822`.
- Q4822 (2025-06-13): if the only DM reveal is also Ver.5, it must first be chosen and added to hand; it cannot be placed under a Digimon instead.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects and stacks), `comprehensive-0076`/`0077` (digivolution cards), `comprehensive-0125`/`0126` (digivolution procedure), `comprehensive-0170`/`0173`/`0176` (optional processing, trigger timing, and effect activation), reveal/selection rules, and Retaliation combat timing.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4822 | Verified. When the first revealed card is the only DM/Ver.5 overlap, it is added to hand before the remaining Ver.5 selection; an all-nonmatching reveal bottoms all three cards. | `EX9-058.test.ts:8-29` labels Q4822 and asserts hand, host stack, deck order, and memory for both routes. |

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate `[Digivolve]` Lv.2 `[DM]`: cost 0 | `digivolutionRequirement: [{ level: 2, traits: ["DM"], cost: 0, isAlternate: true }]` at `EX9-058.ts:73-80` | Exact structure at `EX9-058.test.ts:55-56`; DM EX9-002 in breeding succeeds while non-DM BT1-001 and wrong-level BT2-007 are rejected (`:31-54`). Digi-Eggs are used only as breeding-area materials, never deck/security fixtures. |
| Reveal 3 and add one DM card to hand | `RevealAdd.revealCount: 3` with first add filter mine DM, count 1, destination hand at `EX9-058.ts:11-29` | Exact structural proof at `EX9-058.test.ts:59-85`; Q4822 positive route places the dual-trait EX9-010 in hand (`:8-29`), and a normal positive reveal adds a DM card (`:88-116`). |
| Choose one remaining Ver.5 face down under one own DM Digimon | Second `RevealAdd` entry filters mine Ver.5, count 1, destination `placeUnder`, `faceDown: true`, with an own DM Digimon `underFilter` at `EX9-058.ts:30-53` | Exact structure at `EX9-058.test.ts:62-85`; public On Play route places EX9-010 face down under the DM EX9-050 host and leaves a non-DM host unchanged (`:88-116`). |
| Return all remaining revealed cards to bottom of deck | `rest: "deckBottom"` at `EX9-058.ts:54-56` | Q4822 all-nonmatching route and positive route assert exact deck order after hand/under placement (`EX9-058.test.ts:8-29`, `:88-116`). |
| Inherited `＜Retaliation＞` | Inherited static keyword entry at `EX9-058.ts:60-69` | Structural proof at `EX9-058.test.ts:85-90`; a real attack against an inherited host deletes both attacker and host through Retaliation (`:118-142`). |

The module registers exclusively with `registerIrCard("EX9-058", compiled)` at `EX9-058.ts:83`; there is no duplicate legacy registration.

#### Behavioral and peer/stack proof

- Q4822 positive route proves mandatory DM-first selection when EX9-010 is simultaneously DM and Ver.5; it is added to hand and is not placed under the host.
- All-nonmatching route proves all three revealed cards return to deck bottom with no hand or stack additions.
- Public On Play route proves DM hand addition, face-down Ver.5 placement under a qualifying DM host, non-DM host exclusion, and exact remaining deck order.
- Alternate evolution tests use the breeding area for Digi-Egg materials only; no Digi-Egg appears in deck or security fixtures.
- Inherited Retaliation is exercised through a real attack and asserts both combat participants are deleted with security untouched.
- No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper is used.
- Peer suites cover reveal/add/placement ordering and inherited Retaliation; engine suites cover reveal-cost budgeting, targeting, granted combat keywords, and advanced combat keywords.
- No EX9-058-specific implementation, engine, or Q4822 gap is known.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-058` | **PASS** — Q4822 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-058.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 11 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-023.test.ts src/cards/EX9/EX9-046.test.ts src/cards/EX9/EX9-061.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 3 files, 30 tests** |
| `pnpm --filter @aegis/api exec vitest run src/engine/revealAddCostBudget.test.ts src/engine/conformance/ch15-03-targeting-and-selection.test.ts src/engine/grantedKeywordCombat.test.ts src/engine/combat/advancedKeywords.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 4 files, 41 tests** |
| `pnpm typecheck` | **PASS** — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-058.ts apps/api/src/cards/EX9/EX9-058.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-058.ts apps/api/src/cards/EX9/EX9-058.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-058.ts apps/api/src/cards/EX9/EX9-058.test.ts docs/audits/EX9-reaudit/EX9-058.md` | **PASS** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger|security:.*BT1-00[1-8]|deck:.*BT1-00[1-8]|DBG|console\\.log' apps/api/src/cards/EX9/EX9-058.ts apps/api/src/cards/EX9/EX9-058.test.ts` | **PASS — no injected timing, illegal Digi-Egg deck/security, or debug matches.** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-058.ts`: unchanged; existing full-coverage IR is faithful and uses exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-058.test.ts`: added exact alternate evolution structure; existing Q4822 reveal ordering, public placement, and Retaliation behavior remains green.
- `docs/audits/EX9-reaudit/EX9-058.md`: this report.
- No EX9-058-specific implementation, engine, or Q4822 gap is known. Delivery gates remain coordinator-owned and are not claimed by this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-059 — Ogremon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-059`, Ogremon), a Purple level-4 Digimon with `[Demon]/[DM]/[Ver.3]` traits, play cost 4, and 4,000 DP.
- Printed evolution: Purple Lv.3 with `[DM]` trait, cost 2.
- Printed effects: `＜Training＞`; `[When Digivolving] [When Attacking] [Once Per Turn]` by placing one hand card face down as this Digimon's bottom digivolution card, delete one opposing level 4 or lower Digimon; inherited `[When Attacking] [Once Per Turn]` draw 1 and trash 1 card in hand.
- Local KB: `node tools/kb/query.mjs card EX9-059` → no knowledge-base entries; there are no Q&A IDs to claim for this card.

#### Q&A ledger

No local Q&A entries were returned for EX9-059. The audit therefore records complete catalog/IR/behavioral coverage, with no card-specific Q&A coverage claim or Q&A-derived gap.

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Purple Lv.3 `[DM]` evolution for cost 2 | `EX9-059.ts:121-128`, alternate level 3 `[DM]`, cost 2 | Public evolution matrix at `EX9-059.test.ts:9-43` accepts EX9-007 and rejects BT1-010, proving the DM gate and memory payment. |
| `＜Training＞` | `EX9-059.ts:11-19`, static Training keyword | Public `activateEffect` cases at `EX9-059.test.ts:44-70` work from both battle area and breeding, suspend the host, place a bottom face-down source, and reject a second activation. |
| When Digivolving and When Attacking once per turn: place one hand card face down underneath and delete one opposing level 4 or lower Digimon | `EX9-059.ts:20-57` and `:58-95`, optional `Delete` actions, hand `place` cost, bottom position, self host, face-down source, level `lte 4`, shared frequency/key `OncePerTurn` + `ir-shared-0` | Public evolution at `EX9-059.test.ts:144-193` places BT1-009 face down and deletes exactly one level-4 target; the following attack cannot reuse the shared once-per-turn effect. Public attack positive/decline cases at `:236-287` prove payment and transactional refusal; no-hand negative at `:72-92` proves an unpaid effect cannot delete. |
| Inherited When Attacking once per turn: draw 1 then trash 1 from hand | `EX9-059.ts:96-117`, inherited `WhenAttacking`, `Draw` amount 1 followed by own-hand `Trash`, frequency `OncePerTurn` | Real inherited host attack at `EX9-059.test.ts:195-234` draws BT1-010, trashes BT1-009, and leaves the second attack without a second draw/trash. Structural assertion at `:109-116`. |

#### Peer / stack proof

- Training is activated through public `activateEffect` intents in both battle area and breeding.
- Digivolution and attack effects use public intents, assert the face-down bottom source, and verify the shared once-per-turn identity across timings.
- Accepted, declined, and no-hand payment branches prove cost atomicity and target preservation.
- The inherited attack effect is exercised twice on a live host to prove its once-per-turn guard.
- All fixtures are legal main-deck cards; no Digi-Egg fixture or direct timing-fire helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-059` | PASS — no knowledge-base entries returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-059.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 12 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts src/engine/mechanic.test.ts src/engine/effects/capabilities.test.ts src/engine/combat/attackIntegration.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 4 files, 637 tests; emits the existing unrelated AD1-002 legacy `ActivateEffect` warning. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-059.ts apps/api/src/cards/EX9/EX9-059.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-059.ts apps/api/src/cards/EX9/EX9-059.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-059.ts apps/api/src/cards/EX9/EX9-059.test.ts docs/audits/EX9-reaudit/EX9-059.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-059.ts apps/api/src/cards/EX9/EX9-059.test.ts` | PASS — no direct timing-fire helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-059-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-059", compiled)`. The local KB has no EX9-059 entries, so no Q&A-specific evidence exists to report; catalog and behavioral coverage is complete. The mechanism warning is unrelated legacy AD1-002 output and all 637 tests passed.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-060 — Devidramon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-060`, Devidramon), a Purple level-4 Digimon with `[Demon]/[DM]/[Ver.3]` traits, play cost 5, and 5,000 DP.
- Printed evolution: Purple Lv.3 with `[DM]` trait, cost 2.
- Printed effects: `＜Training＞`; `[When Digivolving] [Once Per Turn]` and `[When Attacking] [Once Per Turn]` by placing one hand card face down as this Digimon's bottom digivolution card, draw 1; inherited `[On Deletion]` delete one opposing level 4 or lower Digimon.
- Local KB: `node tools/kb/query.mjs card EX9-060` → no knowledge-base entries; there are no Q&A IDs to claim for this card.

#### Q&A ledger

No local Q&A entries were returned for EX9-060. The audit therefore records complete catalog/IR/behavioral coverage, with no card-specific Q&A claim or Q&A-derived gap.

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Purple Lv.3 `[DM]` evolution for cost 2 | `EX9-060.ts:121-128`, alternate level 3 `[DM]`, cost 2 | Public evolution matrix at `EX9-060.test.ts:9-43` accepts EX9-007 and rejects BT1-010, proving the DM gate and payment. |
| `＜Training＞` | `EX9-060.ts:11-19`, static Training keyword | Public `activateEffect` cases at `EX9-060.test.ts:44-70` activate from both battle area and breeding, suspend the host, place a bottom face-down source, and reject a second activation. |
| When Digivolving and When Attacking once per turn: place one hand card face down underneath and draw 1 | `EX9-060.ts:20-57` and `:58-95`, optional `Draw` amount 1 with hand `place` cost, bottom position, self host, face-down source, shared frequency/key `OncePerTurn` + `ir-shared-0` | Public evolution/attack proof at `EX9-060.test.ts:144-193` places BT1-009 face down and draws BT1-046; the following attack does not draw again because the shared once-per-turn identity is spent. Public attack positive/decline/no-hand cases at `:72-92`, `:236-287` prove payment atomicity and target preservation. Structural shared-key assertion at `:117-142`. |
| Inherited On Deletion deletes one opposing level 4 or lower Digimon | `EX9-060.ts:96-117`, inherited `OnDeletion` `Delete` with opponent Digimon level `lte 4`, count 1 | Real deletion through combat at `EX9-060.test.ts:195-234` attacks a suspended host, deletes the inherited host and its EX9-060 source, while preserving the opponent's level-5 attacker and one level-4 peer; structural assertion at `:109-116`. |

#### Peer / stack proof

- Training is activated through public `activateEffect` intents in both battle area and breeding.
- Digivolution and attack effects use public intents, assert face-down bottom placement, draw results, and the shared once-per-turn guard.
- Accepted, declined, and no-hand branches prove the optional placement/draw action is transactional.
- The inherited deletion is exercised through a real attack into a suspended host with level-filtered opposing survivors.
- All fixtures are legal main-deck cards; no Digi-Egg fixture or direct timing-fire helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-060` | PASS — no knowledge-base entries returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-060.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 12 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts src/engine/mechanic.test.ts src/engine/effects/capabilities.test.ts src/engine/combat/attackIntegration.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 4 files, 637 tests; emits the existing unrelated AD1-002 legacy `ActivateEffect` warning. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-060.ts apps/api/src/cards/EX9/EX9-060.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-060.ts apps/api/src/cards/EX9/EX9-060.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-060.ts apps/api/src/cards/EX9/EX9-060.test.ts docs/audits/EX9-reaudit/EX9-060.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-060.ts apps/api/src/cards/EX9/EX9-060.test.ts` | PASS — no direct timing-fire helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-060-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-060", compiled)`. The local KB has no EX9-060 entries, so no Q&A-specific evidence exists to report; catalog and behavioral coverage is complete. The mechanism warning is unrelated legacy AD1-002 output and all 637 tests passed.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-061 — Devimon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and registers only through `registerIrCard`. The test suite proves the exact alternate evolution, Training keyword in battle and breeding, deck-bottom face-down payment, level ceiling/scaling, once-per-turn suppression and real-turn reset, optional decline, and inherited Retaliation.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-061` (Devimon), purple level-4 Digimon, play cost 5, 5000 DP, `Fallen Angel/DM/Ver.1` traits.
- Alternate evolution: `[Digivolve] Lv.3 w/[DM] trait: Cost 2`.
- `＜Training＞`.
- `[When Attacking] [Once Per Turn]`: by placing the top card of your deck face down as this Digimon's bottom digivolution card, delete one opponent Digimon level 3 or lower; add 1 to the level maximum for every two face-down digivolution cards of this Digimon.
- Inherited `＜Retaliation＞`.
- Generated effect/catalog data agrees with the direct module: static Training, once-per-turn attack Delete with bottom deck placement and `selfFaceDownDigivolutionCards` scaling, and inherited Retaliation.
- Comprehensive rules used: `§4-6` (digivolution-stack order and face-down cards), `§15-4`/trigger timing, and once-per-turn reset at the real turn boundary.

#### Q&A ledger

- `node tools/kb/query.mjs card EX9-061` returned **no knowledge-base entries**. There are no card-specific Q&A IDs or unresolved Q&A gaps for EX9-061.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate level-3 `[DM]` evolution for cost 2 | `digivolutionRequirement: [{ level: 3, traits: ["DM"], cost: 2, isAlternate: true }]` at `EX9-061.ts:96-103` | Public evolution matrix at `EX9-061.test.ts:9-32` accepts normal EX9-058, alternate DM EX9-007, and rejects alternate non-DM BT1-010 with memory/stack/hand assertions. |
| `＜Training＞` | Static self-targeted `GainKeyword` at `EX9-061.ts:11-30` | Public `activateEffect` proof works in battle and breeding at `EX9-061.test.ts:34-57`, placing the deck top face down at the bottom and suspending the host; the second activation is rejected. |
| Attack effect is once per turn and optional | `WhenAttacking`, `frequency: "OncePerTurn"`, `optional: true`, `abortOnDecline: true` at `EX9-061.ts:31-71` | Structural proof at `EX9-061.test.ts:212-240`; the scaling matrix and same-turn second attack at `:89-151` show one deletion/payment and same-turn suppression; the real-loop reset case at `:153-211` proves the next own turn can trigger again. |
| Place your deck top face down as this Digimon's bottom digivolution card | `place`, `from: ["deck"]`, controller mine, `destination: "digivolutionStack"`, `position: "bottom"`, `host: "self"`, `faceDown: true` at `EX9-061.ts:51-65` | Public attack proof asserts the top deck card becomes face down at the bottom (`EX9-061.test.ts:247-269`), including the next-turn stack order in the reset test. |
| Delete one opponent Digimon level 3 or lower | `Delete` opponent Digimon count one with `levelComparison <= 3`, scaled by `selfFaceDownDigivolutionCards` at `EX9-061.ts:35-50` | Ceiling/rounding matrix at `EX9-061.test.ts:89-151` covers 0–3 existing hidden cards, higher ineligible targets, paid hidden-card inclusion, and one-per-turn suppression. |
| Add 1 to the maximum for every 2 face-down digivolution cards | `scaling: { per: 2, unit: "selfFaceDownDigivolutionCards" }` at `EX9-061.ts:40-46` | Matrix asserts level-3/4/5/6 boundaries and that one hidden card does not incorrectly grant a second level. |
| Inherited `＜Retaliation＞` | Inherited static self-targeted `GainKeyword` at `EX9-061.ts:72-92` | Structural assertion at `EX9-061.test.ts:241-246` and public combat proof at `:293-315` delete both attacker and the inherited host, while preserving security state. |

The module has `coverage: "full"`, an empty `residual` array, and no duplicate legacy `registerCard` registration; the sole registration is `registerIrCard("EX9-061", compiled)` at `EX9-061.ts:106`.

#### Behavioral and peer/evolution-stack proof

- Public evolution covers normal and alternate DM routes, invalid non-DM alternate evolution, memory, hand, and stack state.
- Public Training proofs cover both battle-area and breeding hosts, face-down bottom placement, deck mutation, suspension, and second-use rejection.
- Public attack proofs cover unavailable deck, insufficient projected level ceiling, all scaling boundaries, target eligibility, exact bottom face-down placement, optional decline, once-per-turn same-turn suppression, and reset after a real opponent turn.
- Public inherited combat proof verifies Retaliation is active on a legal host and deletes both the attacker and host in battle.
- The adjacent EX9-060 peer suite passed 12/12 and independently exercises the shared Training/bottom face-down stack mechanism, once-per-turn action shape, real digivolution/attack flow, optional choices, and inherited keyword behavior; combined EX9-061 + peer passed 29/29.
- Fixtures contain no Digi-Egg ids in deck or security. No `advance.fire`, `fireTiming`, `fireSubTrigger`, or `EffectTiming` helper is used. `advance.verb.unsuspend` appears only in the existing same-turn suppression matrix as a setup verb; the reset proof uses the real public turn loop.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-061.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 17 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-060.test.ts src/cards/EX9/EX9-061.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 2 files, 29 tests** (EX9-060 peer: 12/12) |
| `node tools/kb/query.mjs card EX9-061` | **PASS — no knowledge-base entries; no Q&A IDs** |
| `pnpm typecheck` | **PASS** — shared build, shared/API/web typechecks completed successfully |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-061.ts apps/api/src/cards/EX9/EX9-061.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-061.ts apps/api/src/cards/EX9/EX9-061.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-061.ts apps/api/src/cards/EX9/EX9-061.test.ts docs/audits/EX9-reaudit/EX9-061.md` | **PASS** |
| `rg -n 'security:.*BT1-00[1-8]\|deck:.*BT1-00[1-8]\|advance\\.(fire\|fireTiming\|fireSubTrigger)\|fireTiming\|fireSubTrigger\|EffectTiming' apps/api/src/cards/EX9/EX9-061.test.ts` | **PASS — no forbidden fixture or injected-timing matches** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-061.ts`: unchanged; faithful full-coverage IR with exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-061.test.ts`: strengthened exact structural assertions and added a real turn-loop reset proof; all 17 focused tests pass.
- `docs/audits/EX9-reaudit/EX9-061.md`: this report.
- No EX9-061 engine seam or Q&A gap remains. No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Concurrent worktree changes are outside this card's scope.

### EX9-062 — SkullGreymon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is a hand-fixed full-coverage IR implementation and required no implementation change. The suite proves the DM alternate evolution, Kimeramon Assembly level-4 treatment, face-down source scaling on real play/evolution, DM recovery, both normal and inherited On Deletion free-play effects, and invalid Assembly rejection.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-062` SkullGreymon, purple level-5 Digimon, play cost 7, 7000 DP, `Undead/DM/Ver.2` traits.
- Alternate evolution: level 4 with `[DM]` trait, cost 3.
- Assembly text: this card is also treated as level 4 for `[Kimeramon]` Assembly.
- On Play / When Digivolving: for each face-down digivolution card under this Digimon, trash the top card of the deck; then may return 1 `[DM]` Digimon from trash to hand.
- On Deletion: may play 1 level-4-or-lower `[DM]` Digimon from trash without paying its cost.
- Inherited On Deletion: may play 1 level-4-or-lower `[DM]` Digimon from trash without paying its cost.
- Local KB query: `node tools/kb/query.mjs card EX9-062` → no knowledge-base entries and no card-specific Q&A.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects and stacks), `comprehensive-0076`/`0077` (face-down digivolution cards), `comprehensive-0125`/`0126` (digivolution and Assembly procedure), `comprehensive-0170`/`0173`/`0176` (optional processing, trigger timing, and effect activation), and deletion/free-play timing rules.

#### Q&A ledger

No EX9-062-specific Q&A entries were returned by the local KB. Q&A coverage is **N/A**; Assembly and face-down-source behavior were instead checked against the catalog contract and dedicated engine/peer regressions. No unresolved card-specific ruling gap was identified.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate `[Digivolve]` Lv.4 `[DM]`: cost 3 | `digivolutionRequirement: [{ level: 4, traits: ["DM"], cost: 3, isAlternate: true }]` at `EX9-062.ts:159-166` | Exact structure at `EX9-062.test.ts:110-111`; DM EX9-009 succeeds while non-DM BT1-016 is rejected (`:80-109`). |
| Also treated as level 4 for Kimeramon Assembly | Assembly matcher recognizes EX9-062’s special level treatment; the card IR remains level-5 in catalog terms | Real Kimeramon Assembly succeeds with EX9-062 among seven materials, stores the full reversed stack, and consumes all materials (`EX9-062.test.ts:53-79`); duplicate, wrong-level, non-DM, and partial Assembly declarations are rejected without consuming cards (`:25-52`). |
| On Play / When Digivolving mill one deck card per face-down source | Each trigger has `Trash` mine deck count 1 with scaling unit `selfFaceDownDigivolutionCards`, restricted to face-down Digimon sources at `EX9-062.ts:14-34`, `:57-77` | Real normal play mills one card; real evolution with two face-down sources mills two cards and asserts stack/deck/trash state (`EX9-062.test.ts:178-224`). Exact structure and face-down filter are asserted at `:225-273`. |
| Then optionally return one own DM Digimon from trash to hand | Both triggers follow `Trash` with optional `Return` to hand, mine trash Digimon with DM trait, count 1 at `EX9-062.ts:35-54`, `:78-97` | Normal play and evolution recover the newly milled/eligible DM card with exact hand and trash assertions (`:178-224`); an explicit optional decline after normal play preserves trash (`:8-24`). |
| On Deletion play one level-4-or-lower DM Digimon from trash for free | Normal `OnDeletion` `PlayWithoutCost`, mine trash Digimon, level `<= 4`, DM, count 1, optional at `EX9-062.ts:100-125` | Own deletion plays EX9-059 from trash without cost (`EX9-062.test.ts:288-301`); a battle deletion route covers the same effect and inherited variant (`:113-177`). |
| Inherited On Deletion play one level-4-or-lower DM Digimon from trash for free | Inherited `OnDeletion` action repeats the level `<= 4`, DM, trash, free-play filter at `EX9-062.ts:128-155` | A host carrying EX9-062 is deleted in a real battle and plays EX9-059 from trash (`EX9-062.test.ts:274-286`); inherited and normal decline/accept routes are parameterized (`:113-177`). |

The module registers exclusively with `registerIrCard("EX9-062", compiled)` at `EX9-062.ts:169`; there is no duplicate legacy registration.

#### Behavioral and peer/stack proof

- Real Kimeramon Assembly proves the special level-4 treatment and rejects duplicate, level-five, non-DM, and partial material sets without consuming cards.
- Real play and evolution prove face-down source scaling, deck trashing, and optional DM recovery; the positive evolution stack contains two face-down cards and asserts two mills.
- Normal and inherited On Deletion routes each play exactly one eligible DM Digimon from trash without cost; decline routes preserve the board and trash.
- DM alternate evolution is tested positively and negatively with memory, stack, and hand assertions.
- No direct timing-injection helper remains; all trigger behavior uses public play/evolution, real battle deletion, or production deletion verbs.
- All deck/security fixtures use main-deck Digimon; no Digi-Egg ids occur. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper is used.
- Peer suites cover DM recovery, Assembly, and inherited deletion/free play; engine suites cover SkullGreymon Assembly, Assembly clusters, deletion/advanced keywords, and scaling.
- No EX9-062-specific implementation, engine, or Q&A gap is known.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-062` | **PASS** — no knowledge-base entries and no Q&A ids. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-062.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 20 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-029.test.ts src/cards/EX9/EX9-058.test.ts src/cards/EX9/EX9-074.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 3 files, 32 tests** |
| `pnpm --filter @aegis/api exec vitest run src/engine/actions/assemblySkullGreymon.test.ts src/engine/cards/bt26Assembly.test.ts src/engine/conformance/ch16c-deletion-and-advanced-keywords.test.ts src/engine/effects/interpreter/scaling.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 4 files, 36 tests** |
| `pnpm typecheck` | **PASS** — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-062.ts apps/api/src/cards/EX9/EX9-062.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-062.ts apps/api/src/cards/EX9/EX9-062.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-062.ts apps/api/src/cards/EX9/EX9-062.test.ts docs/audits/EX9-reaudit/EX9-062.md` | **PASS** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-00[1-8]|DBG|console\\.log' apps/api/src/cards/EX9/EX9-062.ts apps/api/src/cards/EX9/EX9-062.test.ts` | **PASS — no injected timing, Digi-Egg, or debug matches.** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-062.ts`: unchanged; retained the documented hand-fixed face-down scaling and Assembly-level behavior with exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-062.test.ts`: removed duplicated direct `advance.fireForPermanent` timing tests, retained equivalent real play/evolution scaling coverage, and added exact alternate evolution structure.
- `docs/audits/EX9-reaudit/EX9-062.md`: this report.
- No EX9-062-specific implementation, engine, or Q&A gap is known. Delivery gates remain coordinator-owned and are not claimed by this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-063 — Digitamamon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-063`, Digitamamon), a Purple level-5 Digimon with `[Perfect]/[DM]/[Ver.4]` traits, play cost 8, and 8,000 DP.
- Printed evolution: Nanimon by exact name for cost 3, or level 4 with `[DM]` trait for cost 4.
- Printed effects: incoming `[Ver.4]` evolutions reduce their cost by 1 for each of this Digimon's face-down digivolution cards; `＜Scapegoat＞`; `[When Digivolving]` and `[When Attacking]` once per turn, by trashing this Digimon's bottom face-down source, play one play-cost-4-or-less `[DM]` Digimon from trash without paying its cost; inherited `＜Alliance＞`.
- Local KB: `node tools/kb/query.mjs card EX9-063` → no knowledge-base entries; there are no Q&A IDs to claim for this card.

#### Q&A ledger

No local Q&A entries were returned for EX9-063. The audit therefore records complete catalog/IR/behavioral coverage, with no card-specific Q&A claim or Q&A-derived gap.

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Nanimon exact-name route for cost 3, or level 4 `[DM]` route for cost 4 | `EX9-063.ts:153-167`, exact `namesExact: ["Nanimon"]` and level/trait alternate requirement | Public evolution matrix at `EX9-063.test.ts:8-106` accepts the legal DM and Nanimon routes and rejects off-color/name-only candidates. |
| Incoming `[Ver.4]` evolution reduces cost by 1 per face-down source | `EX9-063.ts:11-46`, nested `wouldDigivolve` replacement with face-down `digivolutionCards` scaling | Real public evolution matrix at `EX9-063.test.ts:290-319` covers 0, 1, 2, and 5 face-down sources with floor-at-zero behavior; `:231-254` proves a resident Digitamamon does not affect a different evolution, and `:321-345` proves a name-only Nanimon route receives no Ver.4 reduction. |
| `＜Scapegoat＞` | `EX9-063.ts:48-56`, static Scapegoat keyword | Losing-battle proof at `EX9-063.test.ts:190-230` covers accepting the bottom-source replacement, declining it, and the no-ally branch. |
| When Digivolving / When Attacking once per turn: trash this Digimon's bottom face-down source and play one play-cost-4-or-less `[DM]` Digimon from trash for free | `EX9-063.ts:58-140`, matching `PlayWithoutCost` actions from trash with bottom, face-down, self-hosted source cost; both triggers use shared `OncePerTurn` key `ir-shared-0` | Public attack/free-play and shared-use proof at `EX9-063.test.ts:37-58`, `:136-188`, and `:381-410` confirms the source is trashed, the eligible DM is played (including the just-trashed card), the optional decline preserves state (`:411-442`), and a later attack cannot reuse the already-spent shared trigger. Invalid face-up/other-host source cases are covered at `:107-135`; structural shared-key assertion is at `:354-375`. |
| Inherited `＜Alliance＞` | `EX9-063.ts:142-151`, inherited Alliance keyword | Live attack proof at `EX9-063.test.ts:256-289` triggers Alliance, suspends the selected ally, resolves two security checks, and verifies attack-only DP behavior. |

#### Peer / stack proof

- Evolution routes are exercised through public `digivolve` intents, including exact-name and trait-gated rejection cases.
- The Ver.4 replacement is tested against changing source counts, another resident stack, and a name-only Nanimon route.
- Scapegoat and both once-per-turn trigger timings use public attacks/digivolution and verify bottom-source ownership, optional decline, target filtering, and shared-use identity.
- Alliance is exercised through a legal level-six host and a real two-security attack.
- All fixtures use legal main-deck cards; no Digi-Egg fixture or direct timing-fire helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-063` | PASS — no knowledge-base entries returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-063.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 25 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts src/engine/mechanic.test.ts src/engine/effects/capabilities.test.ts src/engine/replacementRecomputeBarrier.test.ts src/engine/playCostBlockActivation.test.ts src/engine/combat/attackIntegration.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 6 files, 640 tests; emits the existing unrelated AD1-002 legacy `ActivateEffect` warning. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-063.ts apps/api/src/cards/EX9/EX9-063.test.ts` | PASS. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-063.ts apps/api/src/cards/EX9/EX9-063.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-063.ts apps/api/src/cards/EX9/EX9-063.test.ts docs/audits/EX9-reaudit/EX9-063.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-063.ts apps/api/src/cards/EX9/EX9-063.test.ts` | PASS — no direct timing-fire helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-063-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-063", compiled)`. The local KB has no EX9-063 entries, so no Q&A-specific evidence exists to report; catalog and behavioral coverage is complete. The mechanism warning is unrelated legacy AD1-002 output and all 640 tests passed.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-064 — Megadramon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and required no implementation change. The suite proves Q4823 free-play cost handling, Q4824 Machinedramon replacement interaction, independent Cyborg/DM evolution, the independent Cyborg/Ver.4 payment alternatives, face-down-source scaling, and inherited End of Attack deletion.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-064` Megadramon, purple/black level-5 Digimon, play cost 7, 7000 DP, `Cyborg/DM/Ver.4` traits.
- Alternate evolution: level 4 with `[Cyborg]` or `[DM]` trait, cost 3.
- Play replacement: when this card would be played, by trashing 1 `[Cyborg]` or `[Ver.4]` trait card from hand, reduce play cost by 2.
- On Play / When Digivolving: by placing 1 Digimon from trash face down as this Digimon’s bottom digivolution card, delete 2 opposing Digimon with play cost 4 or lower; for each face-down digivolution card under this Digimon, add 1 to the play-cost maximum.
- Inherited End of Attack / Once Per Turn: by unsuspending this Digimon, delete 1 own Digimon with the lowest level.
- Local KB query: `node tools/kb/query.mjs card EX9-064` → `Q4823`, `Q4824`.
- Q4823 (2025-06-13): the play-cost reduction may still be used during an effect-driven free play; the card remains free and memory is not charged.
- Q4824: after Machinedramon unsuspends, its All Turns replacement may prevent the inherited self-deletion.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects and stacks), `comprehensive-0076`/`0077` (face-down digivolution cards), `comprehensive-0125`/`0126` (digivolution procedure), `comprehensive-0170`/`0173`/`0176` (optional processing, trigger timing, and effect activation), and play-cost/replacement and End of Attack timing rules.

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4823 | Verified. Effect-driven free play still offers and pays the optional hand-trashing reduction, while memory remains unchanged. | `EX9-064.test.ts:182-197` uses production effect play and asserts unchanged memory, empty hand, and the face-down payment card under EX9-064. |
| Q4824 | Verified. Machinedramon unsuspends after the inherited cost, then its replacement prevents the inherited self-deletion. | `EX9-064.test.ts:124-155` performs a real attack with EX9-073 and asserts Machinedramon remains unsuspended in play while the inherited EX9-064 card is retained. |

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate `[Digivolve]` Lv.4 `[Cyborg]` or `[DM]`: cost 3 | `digivolutionRequirement: [{ level: 4, traits: ["Cyborg", "DM"], cost: 3, isAlternate: true }]` at `EX9-064.ts:156-163` | Exact structure at `EX9-064.test.ts:119-122`; BT10-020 and EX9-038 satisfy independent routes while nonmatching BT1-016 is rejected (`:82-118`). |
| By trashing `[Cyborg]` or `[Ver.4]` hand card, reduce play cost by 2 | Static nested `Replacement` `wouldBePlayed` with optional trash cost, amount 2, hand mine filter matching both traits at `EX9-064.ts:11-49` | Exact replacement trace at `EX9-064.test.ts:244-260`; real play pays independently with BT1-024 and EX9-038 (`:156-180`), and Q4823 confirms the same payment during effect-driven free play (`:182-197`). |
| On Play / When Digivolving place 1 trash Digimon face down at this stack bottom, delete 2 opposing play-cost-4-or-lower Digimon | Each trigger has optional aborting `place` cost from own trash to self bottom face-down, then `Delete` count 2 with `playCostLte: 4` plus `selfFaceDownDigivolutionCards` scaling at `EX9-064.ts:51-125` | Real On Play route pays the source and deletes two targets (`EX9-064.test.ts:62-81`); real evolution route covers the same trigger and alternate evolution (`:82-118`). Exact structure is asserted at `:244-289`. |
| Add 1 to maximum per face-down digivolution card | `playCostLteScaling: { per: 1, unit: "selfFaceDownDigivolutionCards" }` on both delete targets at `EX9-064.ts:59-63`, `:98-102` | Existing face-down source plus newly paid face-down source permits deletion of initial higher-cost targets; resulting board/trash state is asserted in On Play (`EX9-064.test.ts:62-81`) and evolution (`:82-118`). |
| Inherited End of Attack / Once Per Turn by unsuspending self, delete own lowest-level Digimon | Inherited `EndOfAttack` frequency `OncePerTurn`, optional `unsuspend` self cost, delete mine `lowestLevel` at `EX9-064.ts:128-152` | Q4824 interaction preserves Machinedramon; decline route preserves lowest-level ally (`EX9-064.test.ts:39-61`); positive real attack unsuspends the host and deletes BT1-009 (`:290-311`); second attack demonstrates Once Per Turn suppression (`:218-243`). |

The module registers exclusively with `registerIrCard("EX9-064", compiled)` at `EX9-064.ts:166`; there is no duplicate legacy registration.

#### Behavioral and peer/stack proof

- Q4823 uses production effect-driven play, proving the optional payment is available during free play without charging memory.
- Q4824 uses real Machinedramon attack/end-of-attack resolution and proves the downstream All Turns replacement prevents self-deletion after unsuspension.
- Real On Play and When Digivolving routes prove bottom face-down payment, two-target deletion, and scaling from face-down sources.
- Alternate evolution is tested through both Cyborg and DM routes plus a negative nonmatching base.
- Independent Cyborg and Ver.4 hand payment alternatives reduce play cost by exactly two; decline/unavailable costs preserve hand, trash, board, and security.
- Inherited End of Attack positive, decline, and Once Per Turn behavior are covered through real attacks.
- All deck/security fixtures use main-deck Digimon; no Digi-Egg ids occur. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper remains.
- Peer suites cover scaled deletion, Machinedramon, and End of Attack mechanisms; engine suites cover end-of-attack scope, deletion/advanced keywords, continuous subtrigger accumulation, and interpreter behavior.
- No EX9-064-specific implementation, engine, or Q4823/Q4824 gap is known.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-064` | **PASS** — Q4823 and Q4824 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-064.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 17 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-053.test.ts src/cards/EX9/EX9-073.test.ts src/cards/EX9/EX9-021.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 3 files, 42 tests** |
| `pnpm --filter @aegis/api exec vitest run src/engine/effects/endOfAttackScope.test.ts src/engine/conformance/ch16c-deletion-and-advanced-keywords.test.ts src/engine/continuousSubtriggerAccumulation.test.ts src/engine/effects/interpreter.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 4 files, 253 tests** |
| `pnpm typecheck` | **PASS** — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-064.ts apps/api/src/cards/EX9/EX9-064.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-064.ts apps/api/src/cards/EX9/EX9-064.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-064.ts apps/api/src/cards/EX9/EX9-064.test.ts docs/audits/EX9-reaudit/EX9-064.md` | **PASS** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-00[1-8]|DBG|console\\.log' apps/api/src/cards/EX9/EX9-064.ts apps/api/src/cards/EX9/EX9-064.test.ts` | **PASS — no injected timing, Digi-Egg, or debug matches.** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-064.ts`: unchanged; existing full-coverage IR is faithful and uses exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-064.test.ts`: removed duplicated direct `advance.fireForPermanent` timing tests, retained real On Play/When Digivolving scaling routes, and added exact alternate evolution structure.
- `docs/audits/EX9-reaudit/EX9-064.md`: this report.
- No EX9-064-specific implementation, engine, or Q4823/Q4824 gap is known. Delivery gates remain coordinator-owned and are not claimed by this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-065 — Titamon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-065`, Titamon), a Purple/Green level-6 Digimon with `[Shaman]/[DM]/[Ver.4]` traits, play cost 7, 12,000 DP, and overflow memory 4.
- Printed evolution: level 5 with `[DM]` trait for cost 3.
- Printed effects: `[Hand] [Counter] ＜Blast Digivolve＞`; `＜Scapegoat＞`; `[On Play] [When Digivolving]` may play one level-4-or-lower `[DM]` Digimon from trash without paying its cost; `[All Turns]` all of your `[Ver.4]` Digimon gain `＜Blocker＞` and `＜Retaliation＞`.
- Local KB: `node tools/kb/query.mjs card EX9-065` → no knowledge-base entries; there are no Q&A IDs to claim for this card.

#### Q&A ledger

No local Q&A entries were returned for EX9-065. The audit therefore records complete catalog/IR/behavioral coverage, with no card-specific Q&A claim or Q&A-derived gap.

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Level 5 `[DM]` evolution for cost 3 | `EX9-065.ts:157-164`, alternate level-5 `[DM]` requirement | Public evolution matrix at `EX9-065.test.ts:9-45` accepts a legal Purple route and the off-color DM route, rejects a non-DM base, and asserts memory, hand, and stack transitions. |
| `[Hand] [Counter] ＜Blast Digivolve＞` | `EX9-065.ts:31-40`, hand-origin Counter keyword | Real opponent-attack counter flow at `EX9-065.test.ts:46-94` opens the counter window, responds with EX9-065 from hand over an off-color DM level-5 host, resolves the card's play trigger, then uses the resulting Titamon as a blocker. |
| When this card would be played, trash one `[Cyborg]` or `[Ver.4]` hand card to reduce play cost by 2 | `EX9-065.ts:11-29`, `BeforePayCost` `ReducePlayCost` with separate exact trait filters and fixed amount 2 | Public paid-play proof at `EX9-065.test.ts:109-145` accepts independent BT1-024 (`[Cyborg]`) and EX9-038 (`[Ver.4]`) payments, checks memory 10→5, and verifies the payment in trash; refusal proof at `:146-158` preserves the eligible card and pays the full cost. |
| `＜Scapegoat＞` | `EX9-065.ts:42-50`, static Scapegoat keyword | A real losing battle at `EX9-065.test.ts:192-219` keeps Titamon in play by trashing its ally and confirms the attacker survives without an unintended Retaliation resolution. |
| On Play / When Digivolving may play one level-4-or-lower `[DM]` Digimon from trash without paying | `EX9-065.ts:52-106`, separate optional `PlayWithoutCost` actions from trash with own-controller Digimon, level `lte 4`, and exact `[DM]` trait filter | Public On Play proof at `EX9-065.test.ts:320-344` plays EX9-037 from trash and checks the remaining trash; real normal digivolution proof at `:345-375` plays EX9-059 from trash; Blast Digivolve proof at `:46-94` checks the same filter during counter play. Optional refusal after normal play is covered at `:96-108`. |
| All Turns: all own `[Ver.4]` Digimon gain `＜Blocker＞` and `＜Retaliation＞` | `EX9-065.ts:108-153`, two continuous `GainKeyword` actions targeting all own Digimon matching exact `[Ver.4]`, permanent while the aura is live | Mixed ownership/trait proof at `EX9-065.test.ts:221-243` grants both keywords only to own EX9-035, excludes own non-Ver.4 BT1-009 and the opponent's EX9-035, then returns Titamon to hand and verifies the grants disappear. A real losing block at `:159-190` confirms the granted Ver.4 ally Blocker and Retaliation resolve while preserving security. |

#### Peer / stack proof

- EX9-064 and EX9-030 provide matching EX9 cost-payment and trash-trigger patterns; EX9-065 uses the established `BeforePayCost` reduction primitive rather than an inert static replacement.
- Evolution is exercised through public intents with legal and rejected level/trait routes, including an off-color DM route.
- Blast Digivolve, normal play, and normal digivolution each resolve the level-4-or-lower DM-from-trash clause.
- The mixed aura fixture distinguishes own Ver.4, own non-Ver.4, and opposing Ver.4 cards and verifies lifecycle removal.
- All fixtures use legal main-deck cards; no Digi-Egg fixture or direct timing-fire helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-065` | PASS — no knowledge-base entries returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-065.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 17 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts src/engine/mechanic.test.ts src/engine/effects/capabilities.test.ts src/engine/replacementRecomputeBarrier.test.ts src/engine/playCostBlockActivation.test.ts src/engine/combat/attackIntegration.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 6 files, 640 tests; emits the existing unrelated AD1-002 legacy `ActivateEffect` warning. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-065.ts apps/api/src/cards/EX9/EX9-065.test.ts` | PASS. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-065.ts apps/api/src/cards/EX9/EX9-065.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-065.ts apps/api/src/cards/EX9/EX9-065.test.ts docs/audits/EX9-reaudit/EX9-065.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-065.ts apps/api/src/cards/EX9/EX9-065.test.ts` | PASS — no direct timing-fire helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-065-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-065", compiled)`. The local KB has no EX9-065 entries, so no Q&A-specific evidence exists to report; catalog and behavioral coverage is complete. The mechanism warning is unrelated legacy AD1-002 output and all 640 tests passed.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-066 — Tai Kamiya & Matt Ishida

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/mechanism proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing hand-fixed IR is faithful full coverage. The test audit removed two duplicate direct timing-injection tests and strengthened the structural assertion for both continuous triggers. Real play, real digivolution, optional refusal, negative controller scope, and security-check flows remain the behavioral evidence.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-066` Tai Kamiya & Matt Ishida, red/blue Tamer, play cost 4, `ADVENTURE` type.
- On Play: optionally return 1 own trash Digimon with `[Greymon]`, `[Garurumon]`, or `[Omnimon]` in its name to hand; if the effect did not return, draw 1.
- All Turns: when any own Digimon is played or digivolves, by suspending this Tamer, gain 1 memory if an own Digimon has `[Greymon]` in its name, then gain 1 memory if an own Digimon has `[Garurumon]` in its name.
- Security: play this card without paying its cost.
- Local KB query: `node tools/kb/query.mjs card EX9-066` → `Q4825`, `Q4826`.
- Comprehensive rules used: `comprehensive-0069`/`0160` (effect inheritance and stack identity), `comprehensive-0125`/`0126` (digivolution procedure), and `comprehensive-0170`/`0173`/`0176` (optional processing, trigger timing, and effect activation).

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4825 | Verified. Choosing not to return an eligible trash card leaves the binding empty and permits Draw 1. | `EX9-066.test.ts:47-61` plays the Tamer through the public play intent with an eligible card, explicitly declines the optional return, and asserts the top card is drawn while the trash is unchanged. The no-eligible-card real-play route at `:173-189` covers the same fallback boundary. |
| Q4826 | Verified. The memory clauses cannot resolve when the required suspend-by cost is declined or the Tamer is already suspended. | `EX9-066.test.ts:85-118` performs a real digivolution for decline, already-suspended, and accepted choices, asserting suspension and memory outcomes for both named clauses. |

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| On Play: optionally return one own trash Digimon named Greymon, Garurumon, or Omnimon; if no return, Draw 1 | `OnPlay` `Return` is optional, mine/trash/Digimon filtered by name tokens, and binds `returnedCard`; the following `Draw` is guarded by `bindingEmpty` at `EX9-066.ts:12-44` | Independent named candidates are returned by real play without drawing (`EX9-066.test.ts:25-45`); Q4825 decline draws (`:47-61`); no eligible named card also draws (`:173-189`). |
| All Turns when any own Digimon is played, by suspending this Tamer, gain 1 memory for own Greymon and then 1 for own Garurumon | `AllTurns` `SubTrigger` `whenPlayed`, own Digimon source filter, optional aborting self-suspend cost, and separate conditional +1 memory actions at `EX9-066.ts:46-101` | Real own Digimon play covers 0/1/1/2 memory gains and suspension (`EX9-066.test.ts:63-83`); opponent play is a negative controller-scope test (`:7-24`). |
| All Turns when any own Digimon digivolves, with the same suspend and named-memory clauses | Second `AllTurns` `SubTrigger` `whenOneOfYoursDigivolves` repeats the source filter, suspend cost, and two named conditions at `EX9-066.ts:102-173` | Real digivolution covers decline, already-suspended, and accepted suspend payment plus both memory clauses (`EX9-066.test.ts:85-118`); structural proof checks both trigger action lists (`:126-147`). |
| Security: play this card without paying its cost | Security effect is `isSecurity: true` with self-targeted `PlayWithoutCost`, `payCost: false` at `EX9-066.ts:175-190` | A real security attack reveals and plays EX9-066, leaves memory unchanged, moves the card from security to battle, and resolves its On Play effect (`EX9-066.test.ts:193-211`). |

The module registers exclusively with `registerIrCard("EX9-066", compiled)` at `EX9-066.ts:196`; there is no duplicate legacy registration.

#### Behavioral and peer/mechanism proof

- Real On Play routes prove each independent named return candidate and the binding-based draw fallback.
- Real own Digimon play proves the 0/1/1/2 named-memory combinations; opponent play proves the trigger is not opponent-scoped.
- Real digivolution proves Q4826’s suspend-by gate for decline, already-suspended, and accepted choices.
- Real security resolution proves free play without charging memory and resolves the card’s On Play effect.
- Structural checks cover the exact name filter, binding reference, both continuous events, suspend cost, and security free-play action.
- No direct `advance.fire`, `fireTiming`, or `fireSubTrigger` helper remains. All deck/security fixtures use main-deck cards; no Digi-Egg ids occur.
- Peer suites cover adjacent EX9 Tamer/continuous-trigger behavior; engine suites cover subtrigger seams, continuous subtrigger accumulation, subtrigger actions, and security checks.
- No EX9-066-specific implementation, engine, or Q&A gap is known.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-066` | **PASS** — Q4825 and Q4826 returned. |
| Catalog query against `packages/shared/src/cards/data/cards.json` | **PASS** — EX9-066 printed contract matches the audited IR and tests. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-066.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 17 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-067.test.ts src/cards/EX9/EX9-068.test.ts src/engine/subTriggerSeams.test.ts src/engine/continuousSubtriggerAccumulation.test.ts src/engine/effects/subtriggers.test.ts src/engine/security/securityCheck.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 6 files, 123 tests** |
| `pnpm typecheck` | **PASS** — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-066.ts apps/api/src/cards/EX9/EX9-066.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-066.ts apps/api/src/cards/EX9/EX9-066.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-066.ts apps/api/src/cards/EX9/EX9-066.test.ts docs/audits/EX9-reaudit/EX9-066.md` | **PASS** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-00[1-8]|DBG|console\\.log' apps/api/src/cards/EX9/EX9-066.ts apps/api/src/cards/EX9/EX9-066.test.ts` | **PASS — no injected timing, Digi-Egg, or debug matches.** |

An exploratory combined peer command also included `EX9-065.test.ts`; its two unrelated existing cost-reduction assertions failed (`EX9-065.test.ts:119`, received memory 3 vs expected 5). The scoped peer/mechanism command above excludes that unrelated red and is fully green; no EX9-066 test failed.

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-066.ts`: unchanged; existing full-coverage IR is faithful and uses exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-066.test.ts`: removed direct `advance.fire` and `advance.fireSubTrigger` tests, retained real public play/evolution/security proof, and added exact structural coverage for the second continuous trigger.
- `docs/audits/EX9-reaudit/EX9-066.md`: this report.
- No EX9-066-specific implementation, engine, Q&A, or mechanism gap is known. Delivery gates remain coordinator-owned and are not claimed by this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / mechanism proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-067 — Mirai Kinosaki

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and registers only through `registerIrCard`. The test suite now proves the printed On Play reveal, Your Turn Puppet-digivolution watcher, single total reduction under Q4827, deck-bottom return, security play, negative opponent/non-Puppet paths, and optional play handling through public intents.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-067` (Mirai Kinosaki), yellow Tamer, play cost 3, `LIBERATOR` trait.
- `[On Play]`: reveal the top 3 cards; add one `[Puppet]` or `[LIBERATOR]` trait card among them to hand; return the rest to the bottom of the deck.
- `[Your Turn]`: when any of your Digimon digivolve into a `[Puppet]` trait Digimon, by returning this Tamer to the bottom of the deck, you may play one `[Arisa Kinosaki]` or `[Puppet]` trait Digimon card from hand with play cost reduced by 3.
- `[Security]`: play this card without paying its cost.
- Generated effect/catalog data agrees with the direct module: three-card RevealAdd with trait filter and deck-bottom rest, Your Turn `whenOneOfYoursDigivolves` source/target filters, return cost, one optional hand play with reduction 3, and security free play.
- Comprehensive rules used: `§15-15-3-5` (reveal/add and deck-bottom return), trigger/sub-trigger timing, and cost reduction/optional-effect processing.

#### Q&A ledger

- **Q4827** (`node tools/kb/query.mjs card EX9-067`): two copies cannot stack their reductions into a total reduction of 6 for one play. Covered by `EX9-067.test.ts:73-118` with one and two copies, both a `[Puppet]` Digimon and `[LIBERATOR]` Tamer candidate, and assertions that memory pays only one reduction of 3 plus the candidate's remaining cost; the second copy cannot create an additional discount on the same play.
- No unresolved EX9-067 Q&A gap remains.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| On Play reveal top 3, add one `[Puppet]` or `[LIBERATOR]`, bottom the rest | `RevealAdd`, `revealCount: 3`, own trait filter (`match: "trait"`), count one to hand, `rest: "deckBottom"` at `EX9-067.ts:11-34` | Public play proofs at `EX9-067.test.ts:121-154` cover each independent candidate and no candidate, anchor-preserving deck order, and hand/deck/pending state; real On Play proof at `:208-228` confirms the same route. |
| Your Turn watches your Digimon digivolving into a `[Puppet]` | `YourTurn` `SubTrigger` event `whenOneOfYoursDigivolves`, own Digimon source filter, `digivolveIntoFilter` Puppet trait at `EX9-067.ts:36-52` | Opponent Puppet evolution negative proof at `EX9-067.test.ts:7-35`; non-Puppet evolution and explicit decline proofs at `:36-72`; public own Puppet digivolution route at `:229-264`. |
| Return this Tamer to deck bottom as the activation cost | `return` cost, self reference, count one, `to: "deckBottom"` at `EX9-067.ts:88-100` | Q4827 and real Puppet evolution tests assert Mirai reaches the deck bottom and the play candidate enters the battle area. |
| Optional play of one `[Arisa Kinosaki]` or `[Puppet]` Digimon from hand with cost reduced by 3 | `PlayWithoutCost` from hand, `payCost: true`, `reduceCostBy: 3`, optional, one target, own Tamer-name or Puppet-trait OR filter at `EX9-067.ts:53-86` | Q4827 matrix covers PawnChessmon cost 3 (free), KnightChessmon cost 5 (pays 2), and Arisa cost 4 (pays 1), with one and two Mirai copies; non-Puppet branch and decline leave Mirai/hand unchanged. |
| Security play without cost | Security effect marked `isSecurity: true`, self target, `payCost: false` at `EX9-067.ts:103-119` | Public attack/security proof at `EX9-067.test.ts:265-290` plays Mirai from security and asserts security removal, unchanged memory, hand/deck/trash, and no pending decision. |

The module has `coverage: "full"`, an empty `residual` array, and no duplicate legacy `registerCard` registration; the sole registration is `registerIrCard("EX9-067", compiled)` at `EX9-067.ts:125`.

#### Behavioral and peer/evolution-stack proof

- Public On Play proofs cover independent Puppet and LIBERATOR candidates, no matching candidate, three-card reveal, bottom ordering, and actual Tamer play cost.
- Public Your Turn proofs cover opponent/non-Puppet rejection, optional decline, real Puppet digivolution, self return to deck bottom, reduced-cost play, and Q4827's two-copy no-stacking behavior.
- Public security proof covers free play from a security check using an attack intent.
- The adjacent EX9-066 peer suite passed 17/17 and independently exercises Tamer On Play search, public play/evolution watchers, optional decisions, and stateful memory/zone outcomes; combined EX9-067 + peer passed 36/36.
- Fixtures contain no Digi-Egg ids in deck or security. No `advance.fire`, `fireTiming`, `fireSubTrigger`, or `EffectTiming` helper is used; the former injected On Play/SubTrigger tests were replaced with public play and digivolve intents.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-067.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 19 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-066.test.ts src/cards/EX9/EX9-067.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 2 files, 36 tests** (EX9-066 peer: 17/17) |
| `node tools/kb/query.mjs card EX9-067` | **PASS — Q4827 returned and covered** |
| `pnpm typecheck` | **PASS** — shared build, shared/API/web typechecks completed successfully |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-067.ts apps/api/src/cards/EX9/EX9-067.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-067.ts apps/api/src/cards/EX9/EX9-067.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-067.ts apps/api/src/cards/EX9/EX9-067.test.ts docs/audits/EX9-reaudit/EX9-067.md` | **PASS** |
| `rg -n 'security:.*BT1-00[1-8]\|deck:.*BT1-00[1-8]\|advance\\.(fire\|fireTiming\|fireSubTrigger)\|fireTiming\|fireSubTrigger\|EffectTiming' apps/api/src/cards/EX9/EX9-067.test.ts` | **PASS — no forbidden fixture or injected-timing matches** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-067.ts`: unchanged; faithful full-coverage IR with exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-067.test.ts`: replaced two injected timing proofs with public On Play/digivolve intents and retained explicit Q4827 coverage; all 19 focused tests pass.
- `docs/audits/EX9-reaudit/EX9-067.md`: this report.
- No EX9-067 engine seam or Q&A gap remains. No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Concurrent worktree changes are outside this card's scope.

### EX9-068 — Analogman

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/mechanism proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing full-coverage IR is faithful. The test audit removed two direct `fireSubTrigger` tests and retained equivalent public play-intent evidence for qualifying and near-match Digimon. Real turn, play, decision, and security flows prove the card’s behavior.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-068` Analogman, black Tamer, play cost 4, `DM` type.
- Start of Your Turn: if memory is 2 or less, set it to 3.
- Your Turn: when any own play-cost-7-or-higher Digimon with `[Cyborg]`, `[Machine]`, or `[DM]` trait is played, by suspending this Tamer, draw 1 and gain 1 memory; then may place 1 hand card face down as that Digimon’s bottom digivolution card.
- Security: play this card without paying its cost.
- Local KB query: `node tools/kb/query.mjs card EX9-068` → `Q4828`.
- Q4828 states that if this Tamer is not suspended by the required “by” condition, the effect after “then” cannot place a hand card in digivolution cards.
- Comprehensive rules used: `comprehensive-0069`/`0160` (digivolution stacks and face-down sources), `comprehensive-0125`/`0126` (digivolution procedure), and `comprehensive-0170`/`0173`/`0176` (optional processing, trigger timing, and effect activation).

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4828 | Verified. Declining the suspend cost, or being already suspended, aborts draw, memory, and the later optional placement. | `EX9-068.test.ts:145-171` uses real qualifying play with both an unsuspended and already-suspended Tamer, then asserts no face-down source, no draw, no memory gain, unchanged hand/deck, and no pending decision. |

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Start of Your Turn: if memory is 2 or less, set it to 3 | `StartOfYourTurn` with `SetMemory` value 3 and `memoryAtMost: 2` at `EX9-068.ts:9-10` | Parameterized real turns at memory 0, 2, 3, and 4 assert `max(3, memory)` (`EX9-068.test.ts:228-237`); an opponent’s turn does not apply the effect (`:36-49`). |
| Your Turn: when any own play-cost-7-or-higher Cyborg, Machine, or DM Digimon is played | `YourTurn` `SubTrigger` `whenPlayed` with mine/Digimon, `playCostGte: 7`, and exact trait matching at `EX9-068.ts:13-23` | Real independent MetalTyrannomon, LoaderLeomon, and Digitamamon plays cover Cyborg/Machine/DM (`EX9-068.test.ts:113-144`); opponent control is rejected (`:93-111`); cost-6 and nonmatching-trait cost-7 cards are rejected (`:172-192`). |
| By suspending this Tamer, draw 1 and gain 1 memory; then may place 1 hand card face down under the played Digimon | The subtrigger has an optional self-suspend cost with `abortOnDecline`, then Draw 1, GainMemory +1, and optional bottom `PlaceUnder` from hand, face down, using the trigger source at `EX9-068.ts:24-44` | A last-hand-card real play proves draw, +1 memory, suspension, and face-down bottom placement (`EX9-068.test.ts:10-35`); accepting suspend but declining placement preserves the draw/memory and leaves the stack empty (`:50-92`); Q4828 refusal paths prove the abort boundary (`:145-171`). |
| Security: play this card without paying its cost | Security effect is `isSecurity: true` with self-targeted `PlayWithoutCost`, `payCost: false` at `EX9-068.ts:49-58` | A real security attack moves EX9-068 to the battle area without changing memory (`EX9-068.test.ts:239-259`). |

The module registers exclusively with `registerIrCard("EX9-068", compiled)` at `EX9-068.ts:62`; there is no duplicate legacy registration.

#### Behavioral and peer/mechanism proof

- Real start-of-turn transitions prove the memory threshold and owner-turn scope.
- Real own plays cover all three qualifying traits and verify the exact play-cost threshold through cost-6 and nonmatching-trait cost-7 negatives.
- Real play resolution proves the required suspend cost, mandatory draw, +1 memory, optional face-down bottom placement, and hand/deck/stack zones.
- Q4828 refusal and already-suspended cases prove the “by” condition aborts all downstream actions, including the later optional placement.
- Opponent qualifying play proves the Tamer only responds during its controller’s turn and to its own Digimon.
- Real security resolution proves free play without charging memory.
- No direct `advance.fire`, `fireTiming`, or `fireSubTrigger` helper remains. All deck/security fixtures use main-deck cards; no Digi-Egg ids occur.
- Peer suites cover adjacent EX9 card behavior; engine suites cover timing/resolution, continuous effects, face-down placement, and security checks.
- No EX9-068-specific implementation, engine, or Q&A gap is known.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-068` | **PASS** — Q4828 returned. |
| Catalog query against `packages/shared/src/cards/data/cards.json` | **PASS** — EX9-068 printed contract matches the audited IR and tests. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-068.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 19 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-039.test.ts src/cards/EX9/EX9-043.test.ts src/cards/EX9/EX9-074.test.ts src/engine/conformance/ch15-02-timing-and-resolution.test.ts src/engine/effects/continuous.test.ts src/engine/effects/saveKeywordPlacement.test.ts src/engine/security/securityCheck.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 7 files, 126 tests** |
| `pnpm typecheck` | **PASS** — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-068.ts apps/api/src/cards/EX9/EX9-068.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-068.ts apps/api/src/cards/EX9/EX9-068.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-068.ts apps/api/src/cards/EX9/EX9-068.test.ts docs/audits/EX9-reaudit/EX9-068.md` | **PASS** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-00[1-8]|DBG|console\\.log' apps/api/src/cards/EX9/EX9-068.ts apps/api/src/cards/EX9/EX9-068.test.ts` | **PASS — no injected timing, Digi-Egg, or debug matches.** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-068.ts`: unchanged; existing full-coverage IR is faithful and uses exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-068.test.ts`: removed duplicated direct `advance.fireSubTrigger` tests; retained equivalent real public play-intent coverage for positive and negative trigger boundaries.
- `docs/audits/EX9-reaudit/EX9-068.md`: this report.
- No EX9-068-specific implementation, engine, Q&A, or mechanism gap is known. Delivery gates remain coordinator-owned and are not claimed by this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / mechanism proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-069 — Analog Youth

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-069`, Analog Youth), a White Tamer with `[DM]` trait and play cost 3.
- Printed effects: `[Start of Your Main Phase]` may place one hand card face down as the bottom digivolution card of any own `[DM]` Digimon; `[Your Turn]` when face-down cards are placed as any own Digimon's digivolution cards, by suspending this Tamer, gain 1 memory, then draw 1 if hand size is 7 or less; `[Opponent's Turn]` all own Digimon with face-down digivolution cards gain `＜Reboot＞`; `[Security]` play this card without paying its cost.
- Local KB: `node tools/kb/query.mjs card EX9-069` returned Q4829, Q4830, and Q4978. Their rulings are mapped explicitly below.

#### Q&A ledger

| Q&A | Ruling covered by | Gap |
| --- | --- | --- |
| Q4829 | Public Training activation places a face-down source under an EX9-008 in breeding at `EX9-069.test.ts:329-359`; the Tamer remains unsuspended and memory remains unchanged. | None. |
| Q4830 | Real start-main trigger ordering with two Analog Youth copies at `EX9-069.test.ts:166-240`; the test handles simultaneous start-main ordering, derived placement reactions, repeated derived triggers, and suspended-Tamer payment limits. | None. |
| Q4978 | The `decline: true`, hand-size-7 row at `EX9-069.test.ts:126-165` places the source but declines the Tamer's suspend cost, proving no memory gain or draw occurs after the “then.” | None. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Start of Your Main Phase: may place one hand card face down under any own `[DM]` Digimon | `EX9-069.ts:9-25`, optional bottom `PlaceUnder`, hand source, face-down, own DM Digimon filter | Public turn flow at `EX9-069.test.ts:280-314` places BT1-009 under EX9-065, leaves a non-DM BT1-024 unchanged, and checks source order/face state, hand, memory, and Tamer suspension. Decline and non-DM negative paths are at `:97-125`. |
| Your Turn: when a face-down source is placed under an own battle-area Digimon, by suspending this Tamer gain 1 memory, then draw 1 when hand size is 7 or less | `EX9-069.ts:27-53`, `YourTurn` `SubTrigger` on `onAddDigivolutionCards`, battle-area source scope, face-down added-card filter, suspend cost, memory gain, conditional draw `hand <= 7`, `abortOnDecline` | Public Training/effect activation matrix at `EX9-069.test.ts:126-165` proves hand 7 draws and gains memory, hand 8 gains memory without drawing, refusal gives neither, and breeding placement gives neither. AnalogMan's real non-DM placement at `:11-38` proves the watcher follows any own battle-area Digimon, not only DM hosts. |
| Q4829 breeding exclusion | `sourceFilter.zone: "battleArea"` at `EX9-069.ts:30-33` | Real breeding Training placement at `EX9-069.test.ts:329-359` confirms no reaction, no suspension, and no memory gain. |
| Q4830 derived-trigger ordering and repeatability | Same `SubTrigger` and engine trigger bus; no direct timing injection | Real simultaneous start-main flow at `EX9-069.test.ts:166-240` orders two parent triggers, then both derived watchers, then the repeated derived batch, proving the second start-main effect can retrigger the unsuspended watchers and suspended copies cannot pay twice. |
| Q4978 “by” cost gates the clause after “then” | `abortOnDecline: true` at `EX9-069.ts:39-40` makes suspend payment gate both `GainMemory` and conditional `Draw` | Refusal row at `EX9-069.test.ts:126-165` verifies source placement still occurs but Tamer remains unsuspended, memory stays unchanged, and hand/draw state is preserved. |
| Opponent's Turn: own Digimon with face-down sources gain `＜Reboot＞` | `EX9-069.ts:55-67`, opponent-turn `GainKeyword` over own Digimon with `digivolutionCards: "hasFaceDown"` | Public opponent-turn recompute/turn flow at `EX9-069.test.ts:72-96` unsuspends both DM and non-DM face-down hosts, excludes a face-up-source host, and verifies the aura disappears when the opponent turn ends. |
| Security: play this card without paying | `EX9-069.ts:69-78`, Security `PlayWithoutCost` self-target | Real attack/security flow at `EX9-069.test.ts:360-380` moves EX9-069 from security to the battle area with memory unchanged and the remaining security card intact. |

#### Peer / stack proof

- EX9-068 provides the peer play-trigger placement pattern; EX9-008 Training supplies a real public face-down placement for the breeding exclusion instead of an injected subtrigger.
- Mixed fixtures distinguish battle-area versus breeding hosts, face-down versus face-up sources, DM versus non-DM hosts, own versus opposing Digimon, and suspended versus unsuspended Tamers.
- Q4830 is exercised through the production start-main window and decision ordering, not direct timing helpers.
- All fixtures use legal main-deck cards; no Digi-Egg fixture or direct `advance.fire`/`fireSubTrigger` helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-069` | PASS — Q4829, Q4830, Q4978 returned and mapped above. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-069.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 17 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts src/engine/mechanic.test.ts src/engine/effects/capabilities.test.ts src/engine/replacementRecomputeBarrier.test.ts src/engine/playCostBlockActivation.test.ts src/engine/combat/attackIntegration.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 6 files, 640 tests; emits the existing unrelated AD1-002 legacy `ActivateEffect` warning. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-069.ts apps/api/src/cards/EX9/EX9-069.test.ts` | PASS. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-069.ts apps/api/src/cards/EX9/EX9-069.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-069.ts apps/api/src/cards/EX9/EX9-069.test.ts docs/audits/EX9-reaudit/EX9-069.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-069.ts apps/api/src/cards/EX9/EX9-069.test.ts` | PASS — no direct timing-fire helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-069-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-069", compiled)`. Q4829, Q4830, and Q4978 all have direct public behavioral evidence. The mechanism warning is unrelated legacy AD1-002 output and all 640 tests passed.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-070 — Meat

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing full-coverage IR is faithful. The test audit removed no behavior, but corrected one illegal Digi-Egg fixture (`BT1-001` in the Q4742 deck) to inert main-deck `BT1-009`. All requested Q&A paths use public play, activation, attack, turn, and evolution flows.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-070` Meat, red Option, play cost 2, `DM` type.
- Static color waiver: while an own `[DM]` Digimon or Tamer is on the field, ignore this Option’s color requirements; “field” includes battle and breeding areas per Q4832.
- Main: draw 1, then place this card in the battle area.
- Main Delay: by placing 1 hand card face down as the bottom digivolution card of an own `[DM]` Digimon, it may digivolve into an own-hand `[DM]` Digimon card with its digivolution cost reduced by 2.
- Security: draw 1, then place this card in the battle area.
- Local KB query: `node tools/kb/query.mjs card EX9-070` → `Q4741`, `Q4742`, `Q4743`, `Q4749`, `Q4831`, `Q4832`, `Q4884`, `Q4915`, `Q4939`, `Q5195`.
- Comprehensive rules used: `comprehensive-0069`/`0160` (digivolution stacks and inherited effects), `comprehensive-0076`/`0077` (face-down digivolution cards), `comprehensive-0125`/`0126` (digivolution procedure), and `comprehensive-0170`/`0173`/`0176` (optional processing, unresolved timing, and effect activation).

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4741 | Verified. Meat’s Main Delay cannot be activated while an inherited attack-triggered evolution is unresolved. | `EX9-070.test.ts:137-195` starts real inherited attack evolutions from both face-down-source and trash routes, rejects Meat activation while the decision is pending, then resolves the attack evolution. |
| Q4742 | Verified. Meat’s Main Delay cannot be activated while EX9-002’s Your Turn Training evolution is unresolved. | `EX9-070.test.ts:85-136` begins the real Training-triggered evolution, rejects Meat activation while its optional decision is pending, then resolves the reduced-cost evolution. |
| Q4743 | Verified. A face-down source under the host combines with Meat’s reduction for the expected total cost. | `EX9-070.test.ts:8-84` covers EX9-025 → EX9-030 with and without Tokomon, asserting costs 1 and 2 and the resulting stack. |
| Q4749 | Verified. This duplicate attack-timing ruling has the same unresolved-processing boundary as Q4741. | The second parameterized attack fixture at `EX9-070.test.ts:137-195` uses the alternate inherited-source route and rejects activation until the attack evolution resolves. |
| Q4831 | Verified. A second physical Meat cannot be activated while the first Delay is unresolved; only one Meat reduction is applied. | `EX9-070.test.ts:196-260` rejects the second activation during the first pending Delay, then asserts one face-down payment, one Meat reduction, and the second copy remains in play. |
| Q4832 | Verified. The color waiver recognizes own DM Digimon/Tamers in battle or breeding areas, not an opponent’s card. | `EX9-070.test.ts:261-290` covers own battle-area DM Tamer, own battle-area DM Digimon, own breeding-area DM Digimon, non-DM cards, and opponent-only DM cards. |
| Q4884 | Verified. Meat’s reduction combines with the host’s face-down-source reduction when evolving into a DM card. | The Q4884 parameter at `EX9-070.test.ts:8-84` uses EX9-025 → BT22-038 and asserts the combined cost and face-down payment. |
| Q4915 | Verified. Meat’s reduction combines with the applicable face-down-source reduction on the EX9-017 → BT22-061 route. | The Q4915 parameter at `EX9-070.test.ts:8-84` asserts the reduced memory payment and resulting evolution stack. |
| Q4939 | Verified. Meat’s reduction combines with the evolution’s additional reduction; the two-copy evolution-hand variant still resolves one Delay evolution and leaves the extra target card in hand. | Q4939 parameters at `EX9-070.test.ts:8-84` use BT22-038 → BT22-076 with one and two target cards in hand, asserting the reduced payment and one remaining target card in the two-copy route. |
| Q5195 | Verified. Meat combines with the Your Turn reduction for suspended and unsuspended hosts, yielding costs 0 and 1 respectively. | Q5195 parameters at `EX9-070.test.ts:23-24`, exercised by the real activation/evolution loop at `:25-84`, cover both suspended and unsuspended P-202 hosts. |

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Ignore color requirements while an own DM Digimon or Tamer is on the field | Static `WaiveColorRequirement` targets self and checks own DM Digimon/Tamer in `battleArea` or `breeding` at `EX9-070.ts:5-32` | Q4832 mixed field/zone/controller matrix at `EX9-070.test.ts:261-290` proves battle-area, breeding-area, non-DM, and opponent boundaries. |
| Main: Draw 1, then place this card in the battle area | Main actions are `Draw` followed by `PlaceInBattleAreaSelf` at `EX9-070.ts:34-44` | Hand activation draws the deck card, places Meat in battle, marks it effect-placed, and leaves no pending decision (`EX9-070.test.ts:360-384`); security uses the same sequence (`:386-413`). |
| Main Delay: place one hand card face down under an own DM Digimon, then optionally digivolve it into an own-hand DM Digimon with cost reduced by 2 | Second Main entry uses Delay, mandatory hand-to-bottom face-down `place` cost bound as `paidHost`, then optional `Digivolve` from hand with DM filters, `fromSelectionRef`, `reduceCost: 2`, and `abortOnDecline` at `EX9-070.ts:46-135` | Real Q&A evolution matrix covers face-down reductions, inherited/Your Turn combinations, suspended state, and stack identity (`EX9-070.test.ts:8-84`); optional refusal preserves host/hand and trashes the activated Option (`:291-321`). Q4741/Q4742/Q4749 prove unresolved Main timing rejects activation. |
| Security: Draw 1, then place this card in the battle area | Security actions repeat Draw and `PlaceInBattleAreaSelf`, marked `isSecurity` at `EX9-070.ts:137-141` | Real security attack draws the top deck card, moves Meat from security to battle, leaves memory unchanged, and resolves no pending decision (`EX9-070.test.ts:386-413`). |

The module registers exclusively with `registerIrCard("EX9-070", compiled)` at `EX9-070.ts:143`; there is no duplicate legacy registration.

#### Behavioral and peer/evolution-stack proof

- Q4741/Q4742/Q4749 use real unresolved attack/Training evolution decisions and reject Main Delay activation while another effect is processing.
- Q4743, Q4884, Q4915, Q4939, and Q5195 use real legal evolution routes and assert memory payment, face-down sources, resulting top cards, and stack identity.
- Q4831 proves a second physical Meat Delay cannot activate during the first and that only one payment/reduction resolves.
- Q4832 proves field scope across battle/breeding areas, DM Digimon/Tamers, non-DM near matches, and opponent control.
- Main hand activation and Security activation prove Draw-then-place ordering, effect placement, and memory/security transitions.
- Optional refusal proves the Delay payment/evolution path does not alter the host or hand, while the activated Option enters trash.
- All deck/security fixtures use main-deck cards; the only Digi-Egg cards are legitimate face-down evolution-stack sources. No `advance.fire`, `fireTiming`, or `fireSubTrigger` helper remains.
- Peer suites cover adjacent DM/Delay cards; engine suites cover Delay placement, Option activation, digivolution candidate legality, timing/resolution, and passive reductions.
- No EX9-070-specific implementation, engine, or Q&A gap is known.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-070` | **PASS** — all ten requested Q&A ids returned: Q4741, Q4742, Q4743, Q4749, Q4831, Q4832, Q4884, Q4915, Q4939, Q5195. |
| Catalog query against `packages/shared/src/cards/data/cards.json` | **PASS** — EX9-070 printed contract matches the audited IR and tests. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-070.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 26 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-003.test.ts src/cards/EX9/EX9-006.test.ts src/cards/EX9/EX9-071.test.ts src/cards/EX9/EX9-072.test.ts src/engine/delayPlacement.test.ts src/engine/useOption.test.ts src/engine/effects/digivolveCandidateLegality.test.ts src/engine/conformance/ch15-02-timing-and-resolution.test.ts src/engine/passivePlayCostReduction.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 9 files, 95 tests** |
| `pnpm typecheck` | **PASS** — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-070.ts apps/api/src/cards/EX9/EX9-070.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-070.ts apps/api/src/cards/EX9/EX9-070.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-070.ts apps/api/src/cards/EX9/EX9-070.test.ts docs/audits/EX9-reaudit/EX9-070.md` | **PASS** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-00[1-8]|DBG|console\\.log' apps/api/src/cards/EX9/EX9-070.ts apps/api/src/cards/EX9/EX9-070.test.ts` | **PASS — no injected timing, illegal deck/security Digi-Egg, or debug matches.** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-070.ts`: unchanged; existing full-coverage IR is faithful and uses exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-070.test.ts`: replaced illegal deck Digi-Egg fixture `BT1-001` with inert main-deck `BT1-009`; no behavioral intent changed.
- `docs/audits/EX9-reaudit/EX9-070.md`: this report.
- No EX9-070-specific implementation, engine, Q&A, or mechanism gap is known. Delivery gates remain coordinator-owned and are not claimed by this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-071 — Protein

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing module is faithful full-coverage IR and registers only through `registerIrCard`. The suite proves Q4833's all-or-nothing two-card Delay cost, Q4834's battle/breeding field scope for color waiving, public Main draw/placement, optional decline and invalid-host paths, and public Security placement.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-071` (Protein), blue Option, play cost 2, `DM` trait.
- While you have a `[DM]` trait Digimon or Tamer on the field, ignore this card's color requirements.
- `[Main]`: draw 1, then place this card in the battle area.
- `[Main] ＜Delay＞`: by trashing 1 of your `[DM]` trait Digimon's bottom 2 face-down digivolution cards, it unsuspends.
- `[Security]`: gain 1 memory, then place this card in the battle area.
- Generated effect/catalog data agrees with the direct module: battle/breeding `WaiveColorRequirement`, draw + self-placement, Delay `Unsuspend` with a bound DM host and exactly two bottom face-down cards, and security memory + placement.
- Comprehensive rules used: `§4-6` (digivolution-stack order and bottom cards), `§15-15-3-5` (effect selection), `§16-17` (Delay), and field-area definitions for battle/breeding.

#### Q&A ledger

- **Q4833** (`node tools/kb/query.mjs card EX9-071`): a Delay condition requiring the specified two face-down cards cannot be met by trashing only one. Covered by the structural exact `count: 2`/bottom-two filter at `EX9-071.test.ts:157-187`, positive two-card trash at `:194-241`, explicit decline at `:41-89`, and the one-card negative case at `:243-273`.
- **Q4834**: “on the field” means battle area or breeding area. Covered by the color-requirement matrix at `EX9-071.test.ts:8-40` (own battle DM Digimon, own battle DM Tamer, own breeding DM Digimon, non-DM, opponent, and face-up security negatives) and structural zone assertions at `:131-156`.
- No unresolved EX9-071 Q&A gap remains.

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| DM Digimon/Tamer on the field waives color requirements | Static `WaiveColorRequirement` targeting self, `anyOf` own battle-area Digimon/Tamer or own breeding Digimon with DM trait at `EX9-071.ts:16-53` | Q4834 matrix at `EX9-071.test.ts:8-40` accepts own battle/breeding sources and rejects non-DM, opponent, and security sources; structural zones/kinds are asserted at `:131-156`. |
| Main Draw 1, then place this Option in battle area | Main actions `Draw` one and `PlaceInBattleAreaSelf` at `EX9-071.ts:55-66` | Public hand play at `EX9-071.test.ts:274-294` asserts the drawn card enters hand and Protein enters battle area with no pending decision. |
| Delay trashes the bottom two face-down cards of one DM Digimon and unsuspends it | Delay Main `Unsuspend` with selected `paidHost`, optional abortable `trash` cost count 2, `withinBottomN: 2`, `faceDown`, `sameHost`, and DM Digimon host filter at `EX9-071.ts:68-112` | Positive established Delay activation at `EX9-071.test.ts:194-241` trashes exactly both bottom cards and unsuspends the host; one-card, split-host, non-DM, opponent, and face-up-bottom cases offer no Delay. Q4833 explicit decline preserves the stack and suspension at `:41-89`. |
| Security gain 1 memory, then place Protein in battle area | Security effect marked `isSecurity: true`, `GainMemory: 1`, then `PlaceInBattleAreaSelf` at `EX9-071.ts:114-125` | Public attack/security check at `EX9-071.test.ts:295-320` asserts memory 5→4, security removal, battle-area placement, and no trash/hand residue. |

The module has `coverage: "full"`, an empty `residual` array, and no duplicate legacy `registerCard` registration; the sole registration is `registerIrCard("EX9-071", compiled)` at `EX9-071.ts:131`.

#### Behavioral and peer/evolution-stack proof

- Public Q4834 play proofs cover color waiving from own battle and breeding areas and reject opponent/security/non-DM sources.
- Public Main play and Security attack proofs cover draw, self-placement, memory, and final-zone state.
- Delay proofs cover exact two-card payment, bottom-two/face-down/same-host/DM restrictions, optional decline, and no partial payment when only one eligible card exists. Established battle-area Option fixtures explicitly mark `placedByEffect` so the Delay activation is available under the engine's real same-turn Delay gate; no timing fire seam is used.
- The adjacent EX9-070 peer suite passed 26/26 and independently exercises DM Option Delay cost/placement, optional decisions, reductions, and public effect-driven stack behavior; combined EX9-071 + peer passed 44/44.
- Fixtures contain no Digi-Egg ids in deck or security. No `advance.fire`, `fireTiming`, `fireSubTrigger`, or `EffectTiming` helper is used.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-071.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 18 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-070.test.ts src/cards/EX9/EX9-071.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 2 files, 44 tests** (EX9-070 peer: 26/26) |
| `node tools/kb/query.mjs card EX9-071` | **PASS — Q4833 and Q4834 returned and covered** |
| `pnpm typecheck` | **PASS** — shared build, shared/API/web typechecks completed successfully |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-071.ts apps/api/src/cards/EX9/EX9-071.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-071.ts apps/api/src/cards/EX9/EX9-071.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-071.ts apps/api/src/cards/EX9/EX9-071.test.ts docs/audits/EX9-reaudit/EX9-071.md` | **PASS** |
| `rg -n 'security:.*BT1-00[1-8]\|deck:.*BT1-00[1-8]\|advance\\.(fire\|fireTiming\|fireSubTrigger)\|fireTiming\|fireSubTrigger\|EffectTiming' apps/api/src/cards/EX9/EX9-071.test.ts` | **PASS — no forbidden fixture or injected-timing matches** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-071.ts`: unchanged; faithful full-coverage IR with exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-071.test.ts`: strengthened exact Q4833/Q4834 structural assertions; all 18 focused tests pass.
- `docs/audits/EX9-reaudit/EX9-071.md`: this report.
- No EX9-071 engine seam or Q&A gap remains. No engine/shared/catalog/ledger/RUN/notes/KB-index file was intentionally edited by this lane. Concurrent worktree changes are outside this card's scope.

### EX9-072 — File Island

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-072`, File Island), a White Option with the `[DM]` trait and play cost 2.
- Printed effects: while there are no face-up security cards, ignore this card's color requirements; `[Security] [All Turns]` own `[DM]` Digimon gain 1000 DP for each of their face-down digivolution cards; `[Main]` add the bottom security card to hand, then place this card face up as the bottom security card; `[Security]` may play one play-cost-5-or-lower `[DM]` card from hand or trash without paying its cost.
- Local KB: `node tools/kb/query.mjs card EX9-072` returned Q4835 through Q4840. Their rulings are mapped explicitly below.

#### Q&A ledger

| Q&A | Ruling covered by | Gap |
| --- | --- | --- |
| Q4835 | Empty-security Main play succeeds with White File Island at `EX9-072.test.ts:223-238`; the static waiver IR is checked at `:177-180`. | None. |
| Q4836 | The empty-security Main flow at `EX9-072.test.ts:223-238` leaves no card to add, places only File Island face up at security bottom, and preserves the expected hand/security state. | None. |
| Q4837 | Non-empty Main flow at `EX9-072.test.ts:204-222` and empty-security flow at `:223-238` assert effect-placed security cards are face up; the shuffle flow at `:8-39` asserts subsequent shuffle turns all security cards face down. | None. |
| Q4838 | A real attack/security check of face-up File Island at `EX9-072.test.ts:124-176` resolves as an ordinary check while the card is face up; the post-check state is the normal security-to-trash transition. | None. |
| Q4839 | The real face-up security-check matrix at `EX9-072.test.ts:124-176` proves the Security effect opens for hand/trash candidates and can be accepted or declined; the separate qualifying hand play at `:266-291` verifies the positive effect result. | None. |
| Q4840 | The real search-and-shuffle flow at `EX9-072.test.ts:8-39` retains the cards, turns both face-up cards face down, removes the security aura, and verifies no pending decision remains. | None. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Ignore this card's color requirements while no security card is face up | `EX9-072.ts:10-27`, static `WaiveColorRequirement` with `noFaceUpSecurity` | Structural IR proof at `EX9-072.test.ts:177-180`; empty security real play at `:223-238` succeeds, while an own face-up security card rejects the White play at `:111-123`. |
| Security / All Turns: own `[DM]` Digimon gain 1000 DP per face-down digivolution card | `EX9-072.ts:29-59`, security-scoped permanent `ModifyDP`, own Digimon with exact `[DM]` trait, `targetFaceDownDigivolutionCards` scaling | Mixed-host proof at `EX9-072.test.ts:40-83` excludes face-up sources, non-DM hosts, opposing hosts, and loses the aura after a real check; scaling proof at `:239-265` gives +2000 and +1000 to hosts with two and one face-down sources. |
| Main: add bottom security card, then place this card face up at security bottom | `EX9-072.ts:61-78`, ordered `SecurityManipulation` `toHand` bottom followed by `placeAsSecurity` bottom with `faceUp: true` | Non-empty public play at `EX9-072.test.ts:204-222` checks bottom-card order, hand, face-up placement, memory, and decision settlement; empty-security edge case at `:223-238` checks only self-placement. |
| Security: optionally play one play-cost-5-or-lower `[DM]` card from hand or trash without paying | `EX9-072.ts:80-103`, security-scoped optional `PlayWithoutCost`, `from: ["hand", "trash"]`, `playCostLte: 5`, exact `[DM]` trait, `payCost: false` | Candidate matrix at `EX9-072.test.ts:84-110` rejects non-DM and over-cost candidates; face-up check matrix at `:124-176` proves hand/trash origin and accept/refuse paths; real attack flow at `:266-291` plays EX9-010 from hand with memory unchanged. |
| Q4835–Q4840 face-up security rules | The module marks both security-triggered effects `isSecurity: true`; Main placement explicitly sets `faceUp: true` and the engine's normal security/check/shuffle paths handle revealed cards. | Real placement, check, Security trigger, and shuffle flows are covered at `EX9-072.test.ts:8-39`, `:124-176`, `:204-238`, and `:266-291`; no direct timing helper is used. |

#### Peer / stack proof

- The aura is exercised with mixed face-up/face-down sources, DM/non-DM hosts, and own/opponent ownership; it disappears when the face-up source is checked.
- Main is exercised with both populated and empty security stacks, including the Q4835/Q4836 edge case.
- Security is exercised from a real attack against a face-up security card, with valid hand/trash candidates, invalid candidates, acceptance, and refusal.
- The Q4840 shuffle uses a real BT1-087 effect and verifies the revealed cards are hidden again and the security aura is recomputed.
- All fixtures use legal main-deck cards; no Digi-Egg fixture or direct `advance.fire`/`fireSubTrigger` helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-072` | PASS — Q4835, Q4836, Q4837, Q4838, Q4839, and Q4840 returned and mapped above. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-072.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 16 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts src/engine/mechanic.test.ts src/engine/effects/capabilities.test.ts src/engine/replacementRecomputeBarrier.test.ts src/engine/playCostBlockActivation.test.ts src/engine/combat/attackIntegration.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 6 files, 640 tests; emits the existing unrelated AD1-002 legacy `ActivateEffect` warning. |
| `pnpm typecheck` | PASS — shared, API, and web typechecks completed successfully. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-072.ts apps/api/src/cards/EX9/EX9-072.test.ts` | PASS. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-072.ts apps/api/src/cards/EX9/EX9-072.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-072.ts apps/api/src/cards/EX9/EX9-072.test.ts docs/audits/EX9-reaudit/EX9-072.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-072.ts apps/api/src/cards/EX9/EX9-072.test.ts` | PASS — no direct timing-fire helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-072-specific implementation defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-072", compiled)` at `EX9-072.ts:109`. Q4835–Q4840 all have direct public behavioral evidence. The mechanism warning is unrelated legacy AD1-002 output and all 640 mechanism tests passed.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-073 — Machinedramon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof).

Delivery gates are coordinator-owned and remain **0/2** in this lane. Final lane score: **8/10 pending set gates**.

The existing hand-fixed full-coverage IR is faithful. The test audit replaced the Q4841 synthetic `advance.fireForPermanent` suppression setup with a real public BT20-037 digivolution and turn transition, and removed a redundant direct timing call from the leave-prevention test. The resulting suite proves alternate evolution, all three trigger windows, source placement/On Play activation, Q4841 suppression, Q4842 replacement combinations, and the real inherited Q4824 interaction through the EX9-064 peer stack test.

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX9-073` Machinedramon, black level-6 Digimon, play cost 12, 12000 DP, `Machine/DM/Ver.5` traits, normal black Lv.5 evolution cost 4.
- Alternate evolution: Lv.5 with `[DM]` trait, cost 3.
- On Play / When Digivolving / When Attacking / Once Per Turn: by placing one level-5 `[Cyborg]` or `[Ver.5]` trait card from hand or trash as this Digimon’s top digivolution card, activate one `[On Play]` effect on the placed card as an effect of this Digimon.
- All Turns replacement: when this Digimon would leave the battle area, by trashing its bottom two face-down or `[Cyborg]` trait digivolution cards, it doesn’t leave.
- Local KB query: `node tools/kb/query.mjs card EX9-073` → `Q4824`, `Q4841`, `Q4842`.
- Q4824 is the inherited EX9-064 End of Attack interaction: after the inherited effect unsuspends Machinedramon, Machinedramon’s own replacement can prevent the resulting leave/deletion.
- Q4841 says the level-5 card may still be placed while BT20-037 suppresses On Play effects, but the placed card’s On Play cannot activate.
- Q4842 confirms one face-down and one Cyborg source, as well as the two other qualifying combinations, satisfy the bottom-two replacement cost.
- Comprehensive rules used: `comprehensive-0069`/`0160` (inherited effects and stack identity), `comprehensive-0076`/`0077` (face-down digivolution cards), `comprehensive-0125`/`0126` (digivolution procedure), and `comprehensive-0170`/`0173`/`0176` (optional processing, trigger timing, and effect activation).

#### Q&A ledger

| Q&A | Result | Proof |
| --- | --- | --- |
| Q4824 | Verified through the related inherited-stack peer route. | `EX9-064.test.ts:124-155` attacks a real Machinedramon carrying EX9-064, resolves the inherited unsuspend, and proves Machinedramon’s All Turns replacement prevents the self-deletion while the two qualifying bottom cards are trashed. |
| Q4841 | Verified. The placed Ver.5 card enters the stack even while BT20-037 suppresses On Play effects, but its On Play is not activated. | `EX9-073.test.ts:122-207` has a real unsuppressed attack and a real opponent BT20-037 digivolution/turn transition; the suppressed branch attacks an unsuspended Machinedramon, asserts the Ver.5 card is placed face up, and asserts the opponent target is not suspended because the placed On Play was disabled. |
| Q4842 | Verified. Any two bottom cards satisfying face-down-or-Cyborg qualify, and declining the optional cost allows the Machinedramon to leave. | `EX9-073.test.ts:208-260` covers two hidden cards, hidden plus Cyborg, two Cyborg cards, and explicit refusal with real battle deletion. |

#### Clause → IR → behavioral proof

| Printed clause | IR mapping | Observable proof |
| --- | --- | --- |
| Alternate `[Digivolve]` Lv.5 `[DM]`: cost 3 | `digivolutionRequirement: [{ level: 5, traits: ["DM"], cost: 3, isAlternate: true }]` at `EX9-073.ts:185-191` | Real normal evolution from BT10-064 and explicit non-DM alternate rejection from BT1-024 prove cost, stack transition, hand, and memory (`EX9-073.test.ts:9-40`). |
| On Play / When Digivolving / When Attacking / Once Per Turn: place one level-5 Cyborg or Ver.5 card from hand/trash on top and activate its On Play | Each trigger has `ActivateEffect` with `effectType: "OnPlay"`, `lastPlacedOnly`, mine digivolution-card target, optional place cost from hand/trash restricted to level 5 and Cyborg/Ver.5, top position, host self, and `frequency: "OncePerTurn"` at `EX9-073.ts:12-142` | Real hand play places EX9-011 face up, activates its On Play, and places its own face-down source (`EX9-073.test.ts:368-398`); real DM alternate evolution places/activates EX9-011 and then proves the next attack cannot reuse the once-per-turn effect (`:261-316`); attack refusal and ineligible-source negatives are covered at `:67-121`. Exact trigger structure is asserted at `:317-330`. |
| Q4841 suppression still permits placement but blocks placed On Play | The shared `ActivateEffect` placement and `lastPlacedOnly` target are resolved through the engine’s timing gate; no special approximation exists in the card IR | A real BT20-037 opponent digivolution applies On Play suppression before Machinedramon attacks; placement remains in the stack while EX9-041’s On Play does not suspend the opponent target (`EX9-073.test.ts:122-207`). |
| All Turns when this Digimon would leave, by trashing bottom two face-down or Cyborg cards, it doesn’t leave | `AllTurns` `Replacement` on `wouldLeavePlay`, self source filter, optional aborting `Prevent leavePlay`, trash count 2, `withinBottomN: 2`, and `faceDownOrTrait: Cyborg` at `EX9-073.ts:143-181` | Real battle deletion with one qualifying source fails to prevent leave (`EX9-073.test.ts:41-66`); Q4842’s four real battle cases prove all qualifying combinations and refusal (`:208-260`). Exact replacement structure is asserted at `:331-340`. |

The module registers exclusively with `registerIrCard("EX9-073", compiled)` at `EX9-073.ts:195`; there is no duplicate legacy registration.

#### Behavioral and peer/evolution-stack proof

- Normal and alternate evolution routes assert legal cost, stack identity, memory, and invalid non-DM rejection.
- Real hand play, real digivolution, and real attack prove the shared top-source placement and placed-card On Play activation.
- Once-per-turn behavior is proved across a real digivolution followed by a later attack; the second trigger does not consume another level-5 source.
- Q4841 uses a production BT20-037 digivolution and actual opponent-turn transition rather than injected timing; placement survives suppression while the placed On Play does not activate.
- Q4842 covers two hidden sources, hidden plus Cyborg, two Cyborg sources, and explicit refusal on real battle deletion.
- Q4824 is covered by the accepted EX9-064 inherited End of Attack peer test using Machinedramon as the real stack host.
- No direct `advance.fire`, `fireTiming`, or `fireSubTrigger` helper remains. All deck/security fixtures use main-deck cards; no illegal Digi-Egg deck/security fixture occurs.
- Peer suites cover BT20-037 suppression, EX9-064 inherited replacement interaction, and adjacent Tamer/stack behavior; engine suites cover leave-play replacement, effect activation, timing, and deletion/advanced keywords.
- No EX9-073-specific implementation, engine, or Q&A gap is known.

#### Commands and results

All commands ran in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`.

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-073` | **PASS** — Q4824, Q4841, and Q4842 returned. |
| Catalog query against `packages/shared/src/cards/data/cards.json` | **PASS** — EX9-073 printed contract matches the audited IR and tests. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-073.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 17 tests** |
| `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-037.test.ts src/cards/EX9/EX9-064.test.ts src/cards/EX9/EX9-066.test.ts src/engine/effects/leavePrevent.test.ts src/engine/actions/activateEffect.test.ts src/engine/conformance/ch16c-deletion-and-advanced-keywords.test.ts src/engine/conformance/ch15-02-timing-and-resolution.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 7 files, 126 tests** |
| `pnpm typecheck` | **OUT-OF-SCOPE FAIL** — API typecheck reports only pre-existing EX9-074 errors: `EX9-074.ts:20,26,32,38,44,50,56` use `color` instead of `colors`, and `:129,190` omit required target `count`. No EX9-073 error is reported. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-073.ts apps/api/src/cards/EX9/EX9-073.test.ts` | **PASS** |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-073.ts apps/api/src/cards/EX9/EX9-073.test.ts` | **PASS** |
| `git diff --check -- apps/api/src/cards/EX9/EX9-073.ts apps/api/src/cards/EX9/EX9-073.test.ts docs/audits/EX9-reaudit/EX9-073.md` | **PASS** |
| `rg -n 'advance\\.(fire|fireTiming|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-00[1-8]|DBG|console\\.log' apps/api/src/cards/EX9/EX9-073.ts apps/api/src/cards/EX9/EX9-073.test.ts` | **PASS — no injected timing, illegal deck/security Digi-Egg, or debug matches.** |

#### Allowed-file changes and gaps

- `apps/api/src/cards/EX9/EX9-073.ts`: unchanged; existing full-coverage IR is faithful and uses exclusive `registerIrCard` registration.
- `apps/api/src/cards/EX9/EX9-073.test.ts`: replaced synthetic BT20-037 timing firing with real public digivolution/turn transitions; removed a redundant direct timing call before public deletion; retained all Q&A and stack assertions.
- `docs/audits/EX9-reaudit/EX9-073.md`: this report.
- No EX9-073-specific implementation, engine, or Q&A gap is known. Repository-wide typecheck remains blocked by unrelated EX9-074 errors listed above. Delivery gates remain coordinator-owned and are not claimed by this lane.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

### EX9-074 — Kimeramon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX9-074`, Kimeramon), a White level-5 Digimon, play cost 10, 10,000 DP, with `[Composite]/[DM]/[Ver.3]` traits and seven alternate level-4 evolution routes (Red, Blue, Yellow, Green, Black, Purple, or White) for cost 5.
- Printed effects: `＜Rush＞`; `＜Security A. +1＞`; `[On Play] [When Digivolving]` may place one level-4-or-lower `[DM]` Digimon from trash as this Digimon's top digivolution card, then delete one opponent Digimon sharing a color with any digivolution card, or instead, at six or more digivolution-card colors, delete one opponent Digimon of each different color; `[All Turns]` this Digimon gets +1000 DP for each color in its digivolution cards; `[Assembly -7]` seven level-4 `[DM]` Digimon with different names.
- Local KB: `node tools/kb/query.mjs card EX9-074` returned Q5003, Q5004, and Q5005. Their rulings are mapped explicitly below.

#### Q&A ledger

| Q&A | Ruling covered by | Gap |
| --- | --- | --- |
| Q5003 | Public real-play/real-digivolution coverage at `EX9-074.test.ts:36-79`, `:82-119`, and `:147-180`; dynamic effective-color cases at `EX9-074.behavior.test.ts:145-208`; the six-color seven-color matrix at `:280-303`; face-down exclusion at `EX9-074.faceDown.test.ts:26-66`. | None. |
| Q5004 | Six-color public digivolution with a red/blue dual-color target at `EX9-074.behavior.test.ts:260-278` requires both distinct target assignments and proves the same Digimon is not deleted twice; the explicit candidate/assignment matrix is at `:210-258`. | None. |
| Q5005 | The Q5005 fixture at `EX9-074.behavior.test.ts:260-278` contains a red single-color Digimon and a red/blue Digimon, prefers the dual candidate, and still proves both are deleted rather than spending the dual target twice. | None. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Alternate evolution from any level-4 color for cost 5 | `EX9-074.ts:18-60`, seven alternate `level: 4`, `cost: 5` requirements | Legal red route and stack/cost transition at `EX9-074.test.ts:82-119`; structural seven-color requirement assertion at `:182-198`; real six-color route is exercised in `EX9-074.behavior.test.ts:21-42`. |
| Assembly -7: seven level-4 `[DM]` Digimon with different names | `EX9-074.ts:15-17`, `assemblyRequirement` with `count: 7`, `level: 4`, exact `DM` trait, Digimon kind, and `differentNames: true` | Assembly metadata is present in the full compiled card IR; no separate public Assembly scenario is needed for the Q5003-Q5005 ruling audit. |
| Rush and Security Attack +1 | `EX9-074.ts:63-82`, static keyword records | Keyword structure at `EX9-074.test.ts:121-127`; real Rush attack/security flow at `:36-79` resolves the attack and security stack without leaving a pending decision. |
| On Play / When Digivolving may place a level-4-or-lower `[DM]` Digimon from trash as the top source | `EX9-074.ts:84-110` and `:146-171`, optional `PlaceUnder` from own trash with level `lte 4`, exact `DM` trait, position `top` | Real On Play placement at `EX9-074.test.ts:36-60`; real When Digivolving placement for two legal sources at `:82-119`; ineligible level/trait cards remain in trash at `:129-145`; refusal still resolves deletion at `:147-180`. |
| Ordinary branch deletes one opponent Digimon sharing a color with any digivolution card | `EX9-074.ts:111-126` and `:172-187`, opponent Digimon filter `colorMatchesAnyDigivolutionCard`, conditioned on fewer than six distinct stack colors | Real color deletion after placement at `EX9-074.test.ts:36-60`; refusal path at `:147-180`; effective color mutation from KingSukamon is proven by public play then public digivolution at `EX9-074.behavior.test.ts:183-208`. |
| Six-or-more-color branch instead deletes one Digimon of each different color | `EX9-074.ts:127-142` and `:188-203`, `DeletePerColor` sourced from digivolution-card colors with six-color condition | Real six-color public digivolution checks red, blue, yellow, green, black, purple, and white opponent targets at `EX9-074.behavior.test.ts:280-303`; dynamic color and assignment matrix at `:145-258`; face-down source colors do not falsely enable the branch at `EX9-074.faceDown.test.ts:26-66`. |
| All Turns: +1000 DP per digivolution-card color | `EX9-074.ts:207-225`, permanent self `ModifyDP` scaled by `digivolutionCardColors` | Both-turn persistence and source removal recompute at `EX9-074.test.ts:8-33`; placement/evolution DP assertions at `:36-60` and `:82-119`; face-down color exclusion at `EX9-074.faceDown.test.ts:6-24`. |

#### Peer / stack proof

- The Q5003-Q5005 fixtures reach EX9-074 through public `digivolve` intents on a legal level-4 host and a six-color source stack, rather than injecting On Play/When Digivolving timing.
- Mixed opponent fixtures distinguish single-color and multicolor Digimon, effective color changes, all seven color categories, and face-down versus face-up source information.
- The ordinary branch is tested with both a single white source and a six-color stack; the six-color branch is tested with all seven opponent colors and with the red/blue duplicate-target traps from Q5004/Q5005.
- Legal main-deck Digimon are used throughout; no Digi-Egg fixture or direct `advance.fire`, `fireTiming`, or `fireSubTrigger` helper remains in the assigned files. Public turn/stack helpers (`runTurn`, `verb.trashDigivolutionCards`) are only used for state evolution and cleanup.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX9-074` | PASS — Q5003, Q5004, and Q5005 returned and mapped above. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-074.test.ts src/cards/EX9/EX9-074.behavior.test.ts src/cards/EX9/EX9-074.faceDown.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 3 files, 19 tests. |
| `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts src/engine/mechanic.test.ts src/engine/effects/capabilities.test.ts src/engine/replacementRecomputeBarrier.test.ts src/engine/playCostBlockActivation.test.ts src/engine/combat/attackIntegration.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 6 files, 640 tests; emits the existing unrelated AD1-002 legacy `ActivateEffect` warning. |
| `pnpm typecheck` | PASS — shared build/copy-data, shared/API/web typechecks completed successfully. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX9/EX9-074.ts apps/api/src/cards/EX9/EX9-074.test.ts apps/api/src/cards/EX9/EX9-074.behavior.test.ts apps/api/src/cards/EX9/EX9-074.faceDown.test.ts` | PASS. |
| `pnpm exec oxlint apps/api/src/cards/EX9/EX9-074.ts apps/api/src/cards/EX9/EX9-074.test.ts apps/api/src/cards/EX9/EX9-074.behavior.test.ts apps/api/src/cards/EX9/EX9-074.faceDown.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX9/EX9-074.ts apps/api/src/cards/EX9/EX9-074.test.ts apps/api/src/cards/EX9/EX9-074.behavior.test.ts apps/api/src/cards/EX9/EX9-074.faceDown.test.ts docs/audits/EX9-reaudit/EX9-074.md` | PASS. |
| `rg -n 'advance\\.(fire|fireSubTrigger)|fireTiming|fireSubTrigger|BT1-001|BT1-002' apps/api/src/cards/EX9/EX9-074.ts apps/api/src/cards/EX9/EX9-074.test.ts apps/api/src/cards/EX9/EX9-074.behavior.test.ts apps/api/src/cards/EX9/EX9-074.faceDown.test.ts` | PASS — no direct timing-fire helper or Digi-Egg fixture. |

#### Defects and gaps

No EX9-074-specific behavioral defect or engine seam found. The module is full compiled IR (`coverage: "full"`, empty `residual`) and registers exclusively with `registerIrCard("EX9-074", compiled)` at `EX9-074.ts:232`. Q5003, Q5004, and Q5005 all have direct public behavioral evidence. The mechanism warning is unrelated legacy AD1-002 output and all 640 mechanism tests passed.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2**
- Delivery gates: **0/2** (coordinator-owned set-level gate; no Git writes or commit performed in this lane)

**Pre-gate score: 8/8. Final lane score: 8/10 until coordinator gates are awarded.**

## Mechanisms

### Once-per-turn reset on inherited attack evolution (EX9-003)


### Result

No engine lifecycle defect exists in the current engine. The inherited
`wouldDigivolve` replacement is re-derived after the owner-turn boundary, and
its once-per-turn ledger is reset at `ownerTurnStart`.

The retained proof now selects EX9-030's alternate Machine/DM cost explicitly.
That matters because EX9-030 also matches its normal Yellow Lv.4 cost; without
`useAlternateCost: true`, the engine correctly chooses cost 4 and memory 3→0.
With the explicit alternate route, Tokomon's reduction applies and memory 3→1.

### Evidence

- Focused EX9-003: 7/7 passed.
- EX9-003 plus EX9-070: 33/33 passed.
- Relevant engine regressions: `subtriggers.test.ts`,
  `continuousRecomputeConcurrency.test.ts`, and `modifiers.test.ts` — 66/66
  passed.
- `pnpm typecheck`: passed, including the API typecheck and EX9-005 typing.
- `oxlint`, `oxfmt --check`, and `git diff --check`: passed.

### Conclusion

The named `EX9-003-OPT-RESET` seam is green through public intents and requires
no reusable engine change. The fix is confined to selecting the intended
alternate evolution cost and retaining the now-green reset regression.

No Git writes were performed.

## Knowledge base index


Generated from `node tools/kb/query.mjs card <ID>` on 2026-09-09. Each card report must cover every listed Q&A id or document why it is not behaviorally testable.

| Card | Q&A ids | Status |
| --- | --- | --- |
| EX9-001 | Q4741, Q4751, Q4752, Q5193 | Covered by focused and EX9-070 cross-card proof |
| EX9-002 | Q4742 | Covered by focused and EX9-070 integration proof |
| EX9-003 | Q4743 | Covered; focused and EX9-070 integration proof green |
| EX9-004 | None returned | Catalog and rules reviewed; no card Q&A returned |
| EX9-005 | Q4744, Q4745, Q4746, Q4747 | Covered by focused public behavior |
| EX9-006 | Q4748, Q4749 | Covered by focused and EX9-070 peer proof |
| EX9-007 | Q4750 | Covered by real play and reveal ordering proof |
| EX9-008 | Q4751 | Covered by public attack/evolution timing proof |
| EX9-009 | None returned | Catalog and rules reviewed; no card Q&A returned |
| EX9-010 | Q4752 | Covered by public attack/evolution timing proof |
| EX9-011 | Q4753 | Covered by public evolution proof |
| EX9-012 | Q4754 | Covered by focused self-evolution exclusion proof |
| EX9-013 | Q4755, Q4756 | Covered by public DNA and attack-choice proof |
| EX9-014 | Q4757 | Covered by public reveal/add/place ordering proof |
| EX9-015 | None returned | Catalog and rules reviewed; no card Q&A returned |
| EX9-016 | None returned | Catalog and rules reviewed; no card Q&A returned |
| EX9-017 | Q4758 | Covered by public multi-target scaling proof |
| EX9-018 | Q4759, Q4760, Q4761 | Covered by focused and EX9-030 peer proof |
| EX9-019 | Q4762 | Covered by public evolution/self-trigger exclusion proof |
| EX9-020 | Q4763 | Covered by public DNA stack-identity proof |
| EX9-021 | Q4764, Q4765, Q4766, Q4767, Q4768, Q4769, Q4770, Q4771, Q4772, Q4773 | Covered by focused and shared mechanism proof |
| EX9-022 | None returned | Catalog and rules reviewed; no card Q&A returned |
| EX9-023 | Q4774 | Covered by public reveal/add overlap proof |
| EX9-024 | Q4775, Q4776, Q4777 | Covered by focused public EndAttack proof |
| EX9-025 | Q4778 | Covered by public two-target attack proof |
| EX9-026 | None returned | Catalog and rules reviewed; no card Q&A returned |
| EX9-027 | Q4779, Q4780, Q4781 | Covered by focused public attack proof |
| EX9-028 | Q4782 | Covered by public insufficient-source proof |
| EX9-029 | Q4783 | Covered by public placement/recovery boundary proof |
| EX9-030 | Q4784 | Covered by public free-play optional-cost proof |
| EX9-031 | Q4785, Q4786 | Covered by focused and broad security/timing proof |
| EX9-032 | None returned | Catalog and rules reviewed; no card Q&A returned |
| EX9-033 | None returned | Catalog and rules reviewed; no card Q&A returned |
| EX9-034 | None returned | Catalog and rules reviewed; no card Q&A returned |
| EX9-035 | Q4787 | Covered by public reveal/add exclusivity proof |
| EX9-036 | Q4788 | Covered by public breeding-area evolution proof |
| EX9-037 | Q4789, Q4790 | Covered by public restriction-target proof |
| EX9-038 | Q4791, Q4792 | Covered by public restriction-duration proof |
| EX9-039 | Q4793 | Covered by public decline/attack independence proof |
| EX9-040 | None returned | Catalog and rules reviewed; no card Q&A returned |
| EX9-041 | Q4794 | Covered by public equal-DP battle proof |
| EX9-042 | Q4795 | Covered by focused distinct-target duration proof |
| EX9-043 | Q4796, Q4797 | Covered by public battle and optional-cleanup proof |
| EX9-044 | Q4798, Q4799, Q4800 | Covered by focused and mechanism proof |
| EX9-045 | None returned | Catalog and rules reviewed; no card Q&A returned |
| EX9-046 | Q4801 | Covered by focused live-text and interpreter proof |
| EX9-047 | Q4802 | Covered by focused ownership/text-filter proof |
| EX9-048 | Q4803 | Covered by live payment and complete-text mechanism proof |
| EX9-049 | Q4804 | Covered by production-turn all-or-nothing payment proof |
| EX9-050 | Q4805 | Covered by public insufficient-payment proof |
| EX9-051 | None returned | Catalog and rules reviewed; no card Q&A returned |
| EX9-052 | Q4806 | Covered by production-turn insufficient-payment proof |
| EX9-053 | Q4807 | Covered by public Digimon/Tamer trigger proof |
| EX9-054 | Q4808, Q4809 | Covered by exact-name/text and mixed-zone proof |
| EX9-055 | Q4810, Q4811, Q4812 | Covered by focused mixed-zone/payment/text proof |
| EX9-056 | Q4813, Q4814, Q4815 | Covered by focused security-payment/protection proof |
| EX9-057 | Q4816, Q4817, Q4818, Q4819, Q4820, Q4821 | Covered by focused public attack/evolution proof |
| EX9-058 | Q4822 | Covered by focused reveal/add exclusivity proof |
| EX9-059 | None returned | Catalog and rules reviewed; no card Q&A returned |
| EX9-060 | None returned | Catalog and rules reviewed; no card Q&A returned |
| EX9-061 | None returned | Catalog and rules reviewed; no card Q&A returned |
| EX9-062 | None returned | Catalog and rules reviewed; no card Q&A returned |
| EX9-063 | None returned | Catalog and rules reviewed; no card Q&A returned |
| EX9-064 | Q4823, Q4824 | Covered by public free-play and prevention proof |
| EX9-065 | None returned | Catalog and rules reviewed; implementation defect corrected |
| EX9-066 | Q4825, Q4826 | Covered by focused public trigger proof |
| EX9-067 | Q4827 | Covered by public reduction/non-stacking proof |
| EX9-068 | Q4828 | Covered by public play-intent proof |
| EX9-069 | Q4829, Q4830, Q4978 | Covered by public Training/start-main/cost proof |
| EX9-070 | Q4741, Q4742, Q4743, Q4749, Q4831, Q4832, Q4884, Q4915, Q4939, Q5195 | Covered by focused and peer public proof |
| EX9-071 | Q4833, Q4834 | Covered by focused cost/color-waiver proof |
| EX9-072 | Q4835, Q4836, Q4837, Q4838, Q4839, Q4840 | Covered by focused and mechanism proof |
| EX9-073 | Q4824, Q4841, Q4842 | Covered by focused and EX9-064 peer proof |
| EX9-074 | Q5003, Q5004, Q5005 | Covered by three focused public-flow suites |

## Open items

- No EX9 card scores below 10/10 in the winning ledger, and the coordinator recorded no
  open engine seam (`docs/audits/EX9-reaudit/REVIEW-NOTES.md`, 2026-09-09).
- Deferred command: `pnpm check:cards:style` stays red on 273 pre-existing files across
  unrelated BT, LM, and ST collections. It was not re-run green for EX9
  (`docs/audits/EX9-reaudit/RUN.md`, 2026-09-09).
- Deferred command: the quality-gate skill's `quave-check-ci` script does not exist in this
  repository, so that gate was never run (same source).
- Contradiction: `apps/api/src/cards/EX9/AUDIT.md` (commit `52da0b5bb`, 2026-08-28) states
  that test, typecheck, lint, and diff-check execution was waived and that the ledger
  records static fidelity only. `docs/audits/EX9-reaudit/RUN.md` (2026-09-09) reports those
  gates green. The 2026-09-09 run wins.
- Contradiction: `docs/audits/EX9-AUDIT.md` and `docs/audits/EX9-FINAL-INVENTORY.md`
  (2026-09-05) report a final EX9 collection of 77 files / 924 tests.
  `docs/audits/EX9-REAUDIT-LEDGER.md` and `RUN.md` (2026-09-09) report 77 files / 979 tests
  after the re-audit strengthened the suites. The 2026-09-09 counts win.
- Contradiction: the per-card reports merged above were written mid-run and score each card
  `8/10 pending set gates`, because delivery gates were coordinator-owned. The 2026-09-09
  ledger awards the two delivery points after the closing gates passed, giving 10/10. The
  ledger wins; the per-card text is kept verbatim as evidence.
- Several per-card reports record a transient out-of-scope typecheck failure on EX9-074
  (`color` vs `colors`) observed in a shared worktree mid-run. `RUN.md` records the final
  serial workspace typecheck as exit 0.

## History

Superseded inputs, deleted after this document was assembled. Raw content is recoverable
from the commits listed.

- `docs/audits/EX9-reaudit/` — 74 per-card evidence reports plus `KB-INDEX.md`,
  `REVIEW-NOTES.md`, `RUN.md`, `WORKER-BRIEF.md`, and `EX9-003-OPT-RESET-MECHANISM.md`;
  last commits `ac03ac140` and `678a92fca`, 2026-09-09. Merged into the Card ledger,
  Mechanisms, Knowledge base index, Gates, and Open items sections above.
- `docs/audits/EX9-REAUDIT-LEDGER.md` — `ac03ac140`, 2026-09-09. The winning score table;
  merged into Status and Card ledger.
- `docs/audits/EX9-AUDIT.md` — `03b7cc52a`, 2026-09-05. Earlier revalidation summary with
  the 924-test collection figure.
- `docs/audits/EX9-CHECKPOINTS.md` — `03b7cc52a`, 2026-09-05. Working checkpoint log for
  the 2026-09-04 card-by-card pass.
- `docs/audits/EX9-001-025-FINAL.md`, `docs/audits/EX9-026-050-FINAL.md`,
  `docs/audits/EX9-051-074-FINAL.md` — `03b7cc52a`, 2026-09-05. Range reports superseded by
  the per-card reports.
- `docs/audits/EX9-013-020-FOLLOWUP.md` — `03b7cc52a`, 2026-09-05. Follow-up on eight cards
  from the 2026-09-05 pass.
- `docs/audits/EX9-FINAL-INVENTORY.md` — `653610cc5`, 2026-09-05. Static test-count
  inventory; superseded by the 979-test final collection.
- `apps/api/src/cards/EX9/AUDIT.md` — `52da0b5bb`, 2026-08-28. Static-only ledger written
  while execution gates were waived.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for EX9: PR #4586; commit `1a61aa26c`.
