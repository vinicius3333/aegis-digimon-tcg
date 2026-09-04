# EX7 Card Implementation Audit

This ledger records a fresh card-by-card audit in ascending card-ID order using the committed catalog, the local rules knowledge base, each direct compiled-IR module, its shared primitives, peer implementations, and the existing colocated tests.

## Current validation checkpoint

At `ef63d3f7f`, the exact EX7 collection passed 74 files / 397 tests in 9.97
seconds with one fork and no file parallelism. The catalog was recalculated:
74 contiguous IDs, 74 modules, 74 colocated tests, only IR registration, and
no RawUnparsed nodes. Scoped EX7 lint/format and diff checks passed.

Full shared/API/web typecheck and the web production build passed after the
latest effects projection. Shared/API production builds also passed.
The lower independent rereview approved EX7-041/056/063/073 with zero Critical,
Important, or Minor findings and confirmed the final Armor Purge cost proofs
for EX7-052/054. Upper review approved its corrections; the final explicit
once-per-turn evidence assessment for EX7-061 remains pending. This is not yet
a collection completion notification.

## Review follow-up history

The 370-test collection below is a passing checkpoint, not the final inventory.
Independent rereview cleared EX7-001..037 but identified additional behavioral
evidence gaps in the upper range. Those findings are being resolved before
collection approval; no collection-wide 10/10 claim is made yet.

- EX7-041: 5/5 focused tests passed; `f0549a34d` proves Q3851 rule deletion
  through public DP-reduction plays and inherited Reboot across a real turn.
- EX7-056: 7/7 focused tests passed; `9056d4cf3` replaces the artificial positive
  On Deletion trigger with an actual battle loss and checks resulting zones.
- EX7-063: 8/8 focused tests passed; `4c73d4e04` proves a non-Puppet Token
  deletion activates Arisa, pays suspension, and plays the replacement for free.
- EX7-073: 9/9 focused tests passed at `ac257c230`. A public-evolution regression
  first proved that two paid sources did not produce security trash when Tortomon
  resisted deletion. A separate cost gate now precedes the independent deletion
  and security results in both timings. Protected and absent targets, payment,
  refusal, insufficient matching sources, and free Option use are covered.
  Effects projection and final collection counts must be refreshed after this fix.
- Follow-up evidence for EX7-044/046/048/049/050/052/054 and
  EX7-058/061/064/066/072 is being completed and independently checked.

Latest follow-up gates (not collection approval):

- `0f2f55335` synchronized all 74 EX7 effects records after the Lilithmon,
  Chaos Triangular, and BeelStarmon corrections. Against the immutable base,
  55 records differ semantically and no out-of-set bytes or semantics differ.
  Shared and API production builds passed in that synchronization run.
- API typecheck passed after these corrections.
- Optimized additional mechanism checks passed 3 files / 4 selected tests
  (317 skipped by name filter): failed/declined prevention, prevention
  once-per-turn accounting, abort-on-decline continuation, and distinct-name
  counting. This supplements the earlier 3 files / 21 tests; it does not claim
  all tests in those mechanism files ran.
- The exact collection inventory below remains the earlier 370-test checkpoint.
  Final recalculation, focused protected-cost proofs, and independent rereview
  remain pending.

## Passing test inventory at latest collection checkpoint

Exact collection at `ef63d3f7f`: 74 files / 397 tests passed in 9.97 seconds.
This table records passing behavioral and structural tests, not by itself a
collection-wide 10/10 claim. Final independent rereview is still pending.

Current gates:

- Catalog/registration inventory: 74 contiguous IDs, 74 modules, 74 test files;
  exclusively one `registerIrCard` registration per card.
- Exact collection: 74/74 files and 397/397 tests passed.
- Affected mechanisms: 3/3 files and 21/21 tests passed (Option use, exact-name
  matching, and digivolution candidate legality).
- Effects: 74 synchronized records, 55 semantic changes against immutable base
  `6d8363382b063a43a2a00effd1a242fb1363a3e9`, zero changes outside EX7.
  Latest projection is `edd2e897b`, including the provenance/Tamer-count fixes.
- Full shared/API/web typecheck passed, followed by another API typecheck
  after the final card and test corrections.
- Shared/API/web production builds passed. Final scoped lint/format and
  `git diff --check` passed after `be4f205f3`.
- Independent rereview, final approval, push, and coordinator notification
  remain pending. The entries below retain earlier evidence as history.

| Card | Name | Passing tests |
| --- | --- | --- |
| EX7-001 | DemiMeramon | 3/3 |
| EX7-002 | Hiyarimon | 4/4 |
| EX7-003 | Kyaromon | 3/3 |
| EX7-004 | Fluffymon | 3/3 |
| EX7-005 | Kapurimon | 6/6 |
| EX7-006 | Yaamon | 6/6 |
| EX7-007 | Vorvomon | 4/4 |
| EX7-008 | ToyAgumon | 5/5 |
| EX7-009 | Lavorvomon | 5/5 |
| EX7-010 | Deputymon | 6/6 |
| EX7-011 | Megadramon | 6/6 |
| EX7-012 | Lavogaritamon | 5/5 |
| EX7-013 | MagnaKidmon | 6/6 |
| EX7-014 | Volcanicdramon | 5/5 |
| EX7-015 | Otamamon | 3/3 |
| EX7-016 | Bulucomon | 4/4 |
| EX7-017 | SnowAgumon | 3/3 |
| EX7-018 | Gekomon | 5/5 |
| EX7-019 | Sorcermon | 5/5 |
| EX7-020 | Paledramon | 5/5 |
| EX7-021 | CrysPaledramon | 5/5 |
| EX7-022 | ShogunGekomon | 4/4 |
| EX7-023 | Hexeblaumon | 4/4 |
| EX7-024 | Shoemon | 4/4 |
| EX7-025 | ShoeShoemon | 5/5 |
| EX7-026 | Starmon | 5/5 |
| EX7-027 | Chaperomon | 5/5 |
| EX7-028 | Piximon | 5/5 |
| EX7-029 | SaberLeomon | 6/6 |
| EX7-030 | Cendrillmon | 6/6 |
| EX7-031 | Pteromon | 6/6 |
| EX7-032 | Galemon | 4/4 |
| EX7-033 | Monochromon | 4/4 |
| EX7-034 | GrandGalemon | 5/5 |
| EX7-035 | Triceramon | 5/5 |
| EX7-036 | Zephagamon | 5/5 |
| EX7-037 | Tlalocmon | 3/3 |
| EX7-038 | Gotsumon | 4/4 |
| EX7-039 | Jazamon | 4/4 |
| EX7-040 | ToyAgumon | 4/4 |
| EX7-041 | Tortomon | 5/5 |
| EX7-042 | Jazardmon | 4/4 |
| EX7-043 | Tankmon | 5/5 |
| EX7-044 | Gigadramon | 6/6 |
| EX7-045 | Jagamon | 3/3 |
| EX7-046 | Jazarichmon | 4/4 |
| EX7-047 | Eldradimon | 5/5 |
| EX7-048 | Gundramon | 6/6 |
| EX7-049 | Metallicdramon | 5/5 |
| EX7-050 | Impmon | 5/5 |
| EX7-051 | Sparrowmon | 4/4 |
| EX7-052 | Tsukaimon | 5/5 |
| EX7-053 | Eyesmon: Scatter Mode | 3/3 |
| EX7-054 | BlackGatomon | 5/5 |
| EX7-055 | Punkmon | 6/6 |
| EX7-056 | Orochimon | 7/7 |
| EX7-057 | Loudmon | 4/4 |
| EX7-058 | LadyDevimon (X Antibody) | 4/4 |
| EX7-059 | BeelStarmon | 8/8 |
| EX7-060 | Nidhoggmon | 5/5 |
| EX7-061 | Lilithmon (X Antibody) | 12/12 |
| EX7-062 | HeavyMetaldramon | 5/5 |
| EX7-063 | Arisa Kinosaki | 8/8 |
| EX7-064 | Shoto Kazama | 8/8 |
| EX7-065 | Yuuki | 6/6 |
| EX7-066 | Chaos Triangular | 10/10 |
| EX7-067 | Summon Frost | 5/5 |
| EX7-068 | Wonder Stomp | 5/5 |
| EX7-069 | Wind Slicer | 6/6 |
| EX7-070 | Der Blitz | 6/6 |
| EX7-071 | Hurricane Screw Shot | 7/7 |
| EX7-072 | Seventh Fascination | 16/16 |
| EX7-073 | BeelStarmon (X Antibody) | 9/9 |
| EX7-074 | Vortex Resonance | 10/10 |

## Historical verification checkpoints — 2026-09-04

These checkpoint entries describe intermediate states, including failures and
then-pending work. They are superseded by the current inventory and gates above.

Runtime verification has resumed on `audit-ex7-card-by-card-20260904` from
`6d8363382b063a43a2a00effd1a242fb1363a3e9`. The table below is the historical
baseline, not the completion report for this branch.

Focused results reported and committed for EX7-001 through EX7-026 are green.
EX7-027 through EX7-037 and EX7-073/074 remain under active verification.
The upper-range audit has reached EX7-072, delivered in `e22b85ed2`; its
clause coverage is undergoing an independent evidence check before closeout.

The shared Option-use correction in `dd4fb428b` removes the artificial cost-5
ceiling when no limit is declared, while retaining explicit ceilings.
`b5d655500` adds the MagnaKidmon public Option-use proof. Collection testing,
final affected-mechanism checks, effects synchronization, typechecking, builds,
final review, and push remain pending. No collection-wide 10/10 claim is made.

### Evidence follow-up

- The first exact collection run at `e4046996a` completed in 10.36 seconds:
  74 files, 356 passed / 1 failed out of 357 tests. EX7-056's positive fixture
  incorrectly expected effect-protected Tortomon to be deleted; isolated tests
  had not loaded that peer module. `ab6477b2b` loads peers consistently, uses a
  neutral positive fixture, and retains Tortomon as a negative; focused 5/5
  passed. This collection run is not a green closeout result.
- Independent review found missing effect provenance on EX7-005. The negative
  test first reproduced memory 3 instead of 2. `796c29ac8` requires `byEffect`
  and replaces the old primitive-only positive with public Option use. All
  6 focused tests pass, including own-host exclusion and opponent-turn timing.
  Effects synchronization is stale after this module change.
- Further review findings remain active: EX7-029/030/031/033/035 need combat
  or timing proof, EX7-055 needs a Tamer-only count correction, and EX7-056's
  keyword presence check needs a battle-level proof. Collection 10/10 is not
  yet established. The web production build passed before these follow-ups.
- Recalculation confirms 74 contiguous catalog IDs (EX7-001..074), 74 direct
  modules, and 74 colocated test files. Every module has one IR registration;
  no legacy registration or unparsed node was found in this set.
- Final payment/name corrections were synchronized in `971275b24`: 74 records,
  55 semantic changes against the fixed base, zero semantic or byte changes
  outside EX7. Shared and API production builds passed as part of this run.
- Optimized affected mechanisms passed 3 files / 21 tests: Option use (11),
  digivolution candidate legality (6), and exact-name matching (4).
- Full `pnpm typecheck` passed for shared/API/web. Scoped lint, formatting,
  and `git diff --check` passed after `e0d7b0d6b`. Subsequent test additions
  still require the final collection and style check before closeout.
- EX7-002 passed 4/4 focused tests, now including two completed legal attacks
  by the same inherited source with exactly one draw (`9937a6b94`).
- Upper-range follow-up passed EX7-043 (5), 044 (5), 047 (5), 048 (4), 051
  (4), 056 (4), 059 (8), and 060 (5). EX7-059 now exercises the public Blast
  Digivolve window; the previous missing clauses are implemented in focused
  runtime tests and await independent final review.
- EX7-065 also omitted evolution payment; `1a532294b` explicitly enables
  payment and proves memory 10 -> 7. Its focused result is 6/6.
- EX7-074 likewise omitted payment, making its four-memory reduction an
  unlimited waiver. A cost-six evolution first reproduced memory 7 instead of
  5 after Option use. Explicit payment with the existing reduction passes all
  10 focused tests, including the remaining two-memory payment and stack
  transition. Effects synchronization must include this correction as well.
- EX7-005 passed 4/4 focused tests after adding own-stack, Option-trait,
  once-per-turn, and opponent-turn boundaries (`1aee1c4ba`).
- EX7-006 incorrectly waived the trash digivolution cost. The catalog and
  comprehensive rule 8-1-3-2 require payment; a runtime assertion first failed
  with memory 5 instead of 3. Setting the card's `payCost` to `true` passed 6/6
  focused tests, including payment, stack continuity, once-per-turn reuse,
  refusal, and invalid trait/color boundaries. No shared engine change was
  needed. The official EX7 card list confirms the catalog wording:
  https://world.digimoncard.com/cards/?category=522024&search=true
- The intermediate effects synchronization passed for all 74 records with
  54 semantic changes and zero changes outside EX7. It must be repeated after
  the subsequent EX7-032 exact-name and EX7-006 payment corrections.
- The current Option-use mechanism suite passed 11/11 tests after restoration
  of the worktree dependencies.
- EX7-059 now has 7/7 focused tests, including both recovery timings, optional
  refusal, own-stack payment, rejection of another stack, and once-per-turn
  use (`2c271deff`). Blast evolution still requires mapped runtime evidence.
- EX7-013 now has 6/6 focused tests. Its end-turn sequence pays from its own
  stack and checks two security cards; a different stack cannot pay the cost
  (`8726ee36c`).
- Invalid timing enum members found by typechecking were corrected in
  EX7-010/016/017/021. Focused counts are respectively 6/4/3/4. The inherited
  once-per-turn checks in 016/017 now retain an active match and a legal target
  for the repeated activation (`6beedaa20`).
- Upper-range review found missing behavioral coverage in EX7-043/044/047/048,
  EX7-051/056/060, and the Blast evolution path of EX7-059. These findings must
  be resolved before assigning collection-wide runtime 10/10.
- EX7-073 and EX7-074 focused results are 4/4 and 9/9 (`66cfb9d96`).

All branch comparisons and final effects scope checks must use the immutable
base `6d8363382b063a43a2a00effd1a242fb1363a3e9`: the shared `origin/main` ref
advanced during this audit and is no longer the branch's starting point.

## Historical baseline

The earlier audit stopped test execution before its fixes were revalidated.
Its recorded results were EX7-001 focused, EX7-026–050 at 25 suites/63 tests,
and EX7-051–074 at 24 suites/71 tests; EX7-002 timed out. Historical delivery
labels below must be replaced by current evidence before this audit closes.

Static collection evidence: 74 catalog cards, 74 direct modules, 74 colocated tests, and 74 index imports. Every module has exactly one `registerIrCard(cardId, compiled)`, no `registerCard`, `coverage: "full"`, an empty residual, and no `RawUnparsed` node.

| Card    | Name                     | Static audit result                                           | Delivery evidence                                 |
| ------- | ------------------------ | ------------------------------------------------------------- | ------------------------------------------------- |
| EX7-001 | DemiMeramon              | Reviewed; no defect found                                     | Pre-override focused pass                         |
| EX7-002 | Hiyarimon                | Reviewed; no defect found                                     | Pre-override focused timeout; not rerun           |
| EX7-003 | Kyaromon                 | Corrected opposing security-Digimon DP scope                  | Module/test updated; not run                      |
| EX7-004 | Fluffymon                | Reviewed; no defect found                                     | Existing proof inspected; not run                 |
| EX7-005 | Kapurimon                | Corrected self-hosted digivolution-card watcher               | Module/test updated; not run                      |
| EX7-006 | Yaamon                   | Reviewed; no defect found                                     | Existing proof inspected; not run                 |
| EX7-007 | Vorvomon                 | Reviewed; Q3828 checked                                       | Existing proof inspected; not run                 |
| EX7-008 | ToyAgumon                | Reviewed; Q3829 checked                                       | Existing proof inspected; not run                 |
| EX7-009 | Lavorvomon               | Reviewed; no defect found                                     | Existing proof inspected; not run                 |
| EX7-010 | Deputymon                | Reviewed; Q3830/Q3831 checked                                 | Existing proof inspected; not run                 |
| EX7-011 | Megadramon               | Reviewed; no defect found                                     | Existing proof inspected; not run                 |
| EX7-012 | Lavogaritamon            | Reviewed; no defect found                                     | Existing proof inspected; not run                 |
| EX7-013 | MagnaKidmon              | Corrected own-stack cost and same-target buff/attack binding  | Module/test updated; not run                      |
| EX7-014 | Volcanicdramon           | Corrected player-wide play/move restriction                   | Module/test updated; not run                      |
| EX7-015 | Otamamon                 | Reviewed; Q3837–Q3840 checked                                 | Existing proof inspected; not run                 |
| EX7-016 | Bulucomon                | Reviewed; Q3841 checked                                       | Existing proof inspected; not run                 |
| EX7-017 | SnowAgumon               | Reviewed; no defect found                                     | Existing proof inspected; not run                 |
| EX7-018 | Gekomon                  | Reviewed; no defect found                                     | Existing proof inspected; not run                 |
| EX7-019 | Sorcermon                | Corrected inherited target to require digivolution cards      | Module/test updated; not run                      |
| EX7-020 | Paledramon               | Reviewed; no defect found                                     | Existing proof inspected; not run                 |
| EX7-021 | CrysPaledramon           | Reviewed; Q3842/Q6041 checked                                 | Existing proof inspected; not run                 |
| EX7-022 | ShogunGekomon            | Reviewed; Q3843 checked                                       | Existing proof inspected; not run                 |
| EX7-023 | Hexeblaumon              | Reviewed; Q3844 checked                                       | Existing proof inspected; not run                 |
| EX7-024 | Shoemon                  | Reviewed; Q3845/Q4882 checked                                 | Existing proof inspected; not run                 |
| EX7-025 | ShoeShoemon              | Reviewed; no defect found                                     | Existing proof inspected; not run                 |
| EX7-026 | Starmon                  | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-027 | Chaperomon               | Corrected mandatory Overclock and leave-cause/token handling  | Module/test updated; not rerun                    |
| EX7-028 | Piximon                  | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-029 | SaberLeomon              | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-030 | Cendrillmon              | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-031 | Pteromon                 | Corrected source scope of battle-deletion memory trigger      | Module/test updated; not rerun                    |
| EX7-032 | Galemon                  | Corrected source scope of battle-deletion memory trigger      | Module/test updated; not rerun                    |
| EX7-033 | Monochromon              | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-034 | GrandGalemon             | Corrected suspension, immunity, and attack-target gates       | Module/test updated; not rerun                    |
| EX7-035 | Triceramon               | Corrected source scope of security-trash trigger              | Module/test updated; not rerun                    |
| EX7-036 | Zephagamon               | Corrected suspension condition for bottom-deck branch         | Module/test updated; not rerun                    |
| EX7-037 | Tlalocmon                | Corrected shared once-per-turn identity across DNA branches   | Module/test updated; not rerun                    |
| EX7-038 | Gotsumon                 | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-039 | Jazamon                  | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-040 | ToyAgumon                | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-041 | Tortomon                 | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-042 | Jazardmon                | Corrected hand-zone scope for the discard cost                | Module/test updated; not rerun                    |
| EX7-043 | Tankmon                  | Corrected mixed hand/trash cost and deck-top destination      | Module/test/shared cost seam updated; not rerun   |
| EX7-044 | Gigadramon               | Corrected self-host placement and conditional follow-up state | Module/test/shared reveal seam updated; not rerun |
| EX7-045 | Jagamon                  | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-046 | Jazarichmon              | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-047 | Eldradimon               | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-048 | Gundramon                | Corrected Option use and source-hosted replacement scope      | Module/test updated; not rerun                    |
| EX7-049 | Metallicdramon           | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-050 | Impmon                   | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-051 | Sparrowmon               | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-052 | Tsukaimon                | Corrected reveal routing and mandatory attack-ending cost     | Module/test updated; not rerun                    |
| EX7-053 | Eyesmon: Scatter Mode    | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-054 | BlackGatomon             | Corrected keyword binding and mandatory attack-ending cost    | Module/test updated; not rerun                    |
| EX7-055 | Punkmon                  | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-056 | Orochimon                | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-057 | Loudmon                  | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-058 | LadyDevimon (X Antibody) | Corrected canonical token identity and token definition       | Card/catalog/IR/token files updated; not rerun    |
| EX7-059 | BeelStarmon              | Corrected Option recovery/use and own-stack trash cost        | Module/test updated; not rerun                    |
| EX7-060 | Nidhoggmon               | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-061 | Lilithmon (X Antibody)   | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-062 | HeavyMetaldramon         | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-063 | Arisa Kinosaki           | Corrected Token-or-Puppet deletion watcher                    | Module/test updated; not rerun                    |
| EX7-064 | Shoto Kazama             | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-065 | Yuuki                    | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-066 | Chaos Triangular         | Corrected effect-trash gate and scaled resolution branches    | Module/test updated; not rerun                    |
| EX7-067 | Summon Frost             | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-068 | Wonder Stomp             | Reviewed; no defect found                                     | Pre-override batch pass                           |
| EX7-069 | Wind Slicer              | Corrected own-Digimon suspension follow-up scope              | Module/test updated; not rerun                    |
| EX7-070 | Der Blitz                | Corrected effect-trash gate and lowest-cost resolution        | Module/test updated; not rerun                    |
| EX7-071 | Hurricane Screw Shot     | Corrected effect-trash gate and level-banded resolution       | Module/test updated; not rerun                    |
| EX7-072 | Seventh Fascination      | Reviewed; Q&A behavior checked                                | Pre-override batch pass                           |
| EX7-073 | BeelStarmon (X Antibody) | Corrected both own-stack costs and conditional branches       | Module/test updated; not rerun                    |
| EX7-074 | Vortex Resonance         | Reviewed; Q3873 checked                                       | Pre-override batch pass                           |

## Shared corrections

- `costs.ts`: pools loose candidates across array-valued zones and honors the explicit return destination, enabling EX7-043's exact mixed hand/trash cost.
- `reveal.ts`: records `lastEffectActed` only after at least one successful `placeUnder`, enabling EX7-044's conditional deletion without false positives.
- Token catalog: normalizes `Volée & Zerdrücken` and registers its printed level, color, DP, Blocker, and Retaliation characteristics for EX7-058.

## Verification boundary

The consolidated diff passed `git diff --check` and three cross-reviews found no remaining critical or important issue after fixes. Runtime validation is intentionally outstanding because the user instructed the audit not to run tests.
