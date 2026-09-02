# EX11 Card Audit Ledger

Overall completion: **73/74 cards (98.6%) at 10/10**.

This versioned ledger records the card-by-card re-audit delivered on branch
`audit-ex11-luna` and revalidated on `audit/ex11-card-by-card-20260901`. Three Luna agents reviewed contiguous ranges in ascending order:
EX11-001–025, EX11-026–050, and EX11-051–074. It complements executable evidence; it
does not replace the catalog, local knowledge-base rulings, direct IR inspection, or
behavioral tests.

## Scoring rubric

Each card receives two points in each independently reviewed area:

- **Contract and rules (2/2):** every printed clause was reconciled with the committed catalog and applicable local knowledge-base material, with no unresolved ambiguity.
- **IR trace (2/2):** every clause maps to executable compiled IR, with exclusive `registerIrCard` registration, `coverage: "full"`, and no residual behavior.
- **Behavioral proof (2/2):** existing focused tests were retained for correct cards; tests were added or corrected only where the audit exposed a behavioral gap or invalid proof.
- **Peer and stack proof (2/2):** applicable trait, neighboring-card, ownership, source-zone, and realistic evolution-stack risks were checked.
- **Delivery gates (2/2):** focused, mechanism, collection, typecheck, style, and diff validation passed on the delivered branch.

## Revalidation 2026-09-01

Branch `audit/ex11-card-by-card-20260901` re-audited every card with eight independent batch
auditors and treated the previous 10/10 ledger as a claim to falsify. Range reports with per-card
evidence live in `internal-docs/audits/EX11/`; the collection ledger is `docs/audits/EX11-AUDIT.md`.
Corrections delivered:

- Dead or inverted clauses: EX11-006 (invented condition kind left the When Attacking clause dead),
  EX11-058 (no card carries a bare [Aqua] trait, so half the card never matched), EX11-072 (＜Delay＞
  free and repeatable; a misspelled match mode accepted any LIBERATOR-text Digimon), EX11-027
  (printed link effect missing), EX11-032 (host trait gate missing), EX11-041 and EX11-043 (whole
  permanent left instead of its top card), EX11-025 and EX11-063 (face-up security card taken).
- Scope defects: EX11-029 (board-wide whenLinked), EX11-033, EX11-040, EX11-042, EX11-070 (plays or
  links from every controlled stack instead of this Digimon's), EX11-031 and EX11-034 (dead fields).
- Rules defects: EX11-021 and EX11-066 (memory gain gated on a draw), EX11-026 (exact trait match
  and wrong condition; invented colorless alternate route removed from the shared overrides),
  EX11-044 (unpayable cost still offered), EX11-045 (＜Blocker＞ never registered), EX11-053
  (mandatory placement declinable), EX11-065 and EX11-058 (Digi-Egg cards excluded from "cards").
- Engine and shared seams: `selfLinkedMatchesFilter` condition; two live SubTrigger events added to
  the shared union; unknown `nameOrTrait` match modes now fail closed; the persisted-record and
  ledger gates added; `// @ts-nocheck` removed from all 74 modules and every type error resolved.
- Baseline: five EX11 suites already failed on `main` (022, 049, 053, 064, 069); all were test
  fixture defects (unanswered evolution-route prompt, all-gated partner, auto-selected deletion).
- Persistence: 69 of 74 `effects.json` records were stale generator output; all 74 regenerated
  from the modules and `EX11-catalog-sync.test.ts` now enforces equality.

## Exceptions

- **EX11-033 Maneuvermon, 9/10 (IR trace 1/2).** The printed "play 1 [Maquinamon] ... to 1 of your
  Digimon" is a play whose card then links (Q5850 keeps its On Play live). The interpreter's link
  path cannot open the linked card's own On Play window, so the module links without that window.
  Recorded as an engine seam in `docs/audits/EX11-AUDIT.md`.

## Corrections delivered

- EX11-017 marks both Skadimon suspend restrictions as combat-facing and corrects Barrier proof to its battle-only rules scope.
- EX11-020 and EX11-021 prove deletion-cost failure with explicit deletion prevention instead of incorrectly treating Barrier as effect-deletion protection.
- EX11-032 pays the printed 3 memory for its hand Main digivolution route and proves the resulting stack and memory.
- EX11-035, EX11-038, EX11-044, and EX11-048 align stale empty-requirement assertions with the current shared API.
- EX11-045 adds missing executable proof for inherited lowest-play-cost deletion.
- EX11-053 correctly accepts Omnimon (X Antibody) from hand or from under King Drasil and proves both source paths.
- EX11-058 and EX11-073 correct stale observable restriction and move-destination assertions.
- EX11-059 and EX11-066 gain memory only when their optional discard action actually occurs.
- EX11-060 uses the executable level-comparison field for its level-4-or-lower Puppet filter and proves the level-5 boundary.

## Reproducible collection evidence

- Catalog and registration inventory: 74 catalog IDs, 74 direct modules, 74 focused suites, 74 exclusive `registerIrCard` registrations, and 0 `registerCard` registrations.
- Focused collection: `pnpm --filter @aegis/api exec vitest run src/cards/EX11` — 75 files and 431 tests passed (425 card-focused tests plus 6 supplemental Vortex tests).
- Shared mechanisms: `builders.test.ts` and `kernel.test.ts` — 29 tests passed.
- Static verification: `pnpm typecheck`, targeted Oxlint/Oxfmt, and `git diff --check` passed.

## Card scores

| Card     | Name                           | Contract/rules | IR trace | Behavioral proof | Peer/stack | Gates | Score | Evidence                                                                  |
| -------- | ------------------------------ | -------------: | -------: | ---------------: | ---------: | ----: | ----: | ------------------------------------------------------------------------- |
| EX11-001 | Koromon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-001.ts`](./EX11-001.ts) · [`EX11-001.test.ts`](./EX11-001.test.ts) |
| EX11-002 | Hiyarimon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-002.ts`](./EX11-002.ts) · [`EX11-002.test.ts`](./EX11-002.test.ts) |
| EX11-003 | Puroromon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-003.ts`](./EX11-003.ts) · [`EX11-003.test.ts`](./EX11-003.test.ts) |
| EX11-004 | Kapurimon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-004.ts`](./EX11-004.ts) · [`EX11-004.test.ts`](./EX11-004.test.ts) |
| EX11-005 | Yaamon                         |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-005.ts`](./EX11-005.ts) · [`EX11-005.test.ts`](./EX11-005.test.ts) |
| EX11-006 | Flickmon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-006.ts`](./EX11-006.ts) · [`EX11-006.test.ts`](./EX11-006.test.ts) |
| EX11-007 | Agumon                         |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-007.ts`](./EX11-007.ts) · [`EX11-007.test.ts`](./EX11-007.test.ts) |
| EX11-008 | Elizamon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-008.ts`](./EX11-008.ts) · [`EX11-008.test.ts`](./EX11-008.test.ts) |
| EX11-009 | Tyrannomon                     |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-009.ts`](./EX11-009.ts) · [`EX11-009.test.ts`](./EX11-009.test.ts) |
| EX11-010 | MasterTyrannomon               |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-010.ts`](./EX11-010.ts) · [`EX11-010.test.ts`](./EX11-010.test.ts) |
| EX11-011 | Dinomon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-011.ts`](./EX11-011.ts) · [`EX11-011.test.ts`](./EX11-011.test.ts) |
| EX11-012 | Medusamon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-012.ts`](./EX11-012.ts) · [`EX11-012.test.ts`](./EX11-012.test.ts) |
| EX11-013 | Sangomon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-013.ts`](./EX11-013.ts) · [`EX11-013.test.ts`](./EX11-013.test.ts) |
| EX11-014 | Penguinmon                     |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-014.ts`](./EX11-014.ts) · [`EX11-014.test.ts`](./EX11-014.test.ts) |
| EX11-015 | Frigimon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-015.ts`](./EX11-015.ts) · [`EX11-015.test.ts`](./EX11-015.test.ts) |
| EX11-016 | PolarBearmon                   |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-016.ts`](./EX11-016.ts) · [`EX11-016.test.ts`](./EX11-016.test.ts) |
| EX11-017 | Skadimon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-017.ts`](./EX11-017.ts) · [`EX11-017.test.ts`](./EX11-017.test.ts) |
| EX11-018 | Ryugumon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-018.ts`](./EX11-018.ts) · [`EX11-018.test.ts`](./EX11-018.test.ts) |
| EX11-019 | Shoemon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-019.ts`](./EX11-019.ts) · [`EX11-019.test.ts`](./EX11-019.test.ts) |
| EX11-020 | Hanimon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-020.ts`](./EX11-020.ts) · [`EX11-020.test.ts`](./EX11-020.test.ts) |
| EX11-021 | Kokeshimon                     |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-021.ts`](./EX11-021.ts) · [`EX11-021.test.ts`](./EX11-021.test.ts) |
| EX11-022 | Karakurumon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-022.ts`](./EX11-022.ts) · [`EX11-022.test.ts`](./EX11-022.test.ts) |
| EX11-023 | Kaguyamon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-023.ts`](./EX11-023.ts) · [`EX11-023.test.ts`](./EX11-023.test.ts) |
| EX11-024 | Cendrillmon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-024.ts`](./EX11-024.ts) · [`EX11-024.test.ts`](./EX11-024.test.ts) |
| EX11-025 | FunBeemon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-025.ts`](./EX11-025.ts) · [`EX11-025.test.ts`](./EX11-025.test.ts) |
| EX11-026 | Pteromon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-026.ts`](./EX11-026.ts) · [`EX11-026.test.ts`](./EX11-026.test.ts) |
| EX11-027 | Maquinamon                     |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-027.ts`](./EX11-027.ts) · [`EX11-027.test.ts`](./EX11-027.test.ts) |
| EX11-028 | Galemon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-028.ts`](./EX11-028.ts) · [`EX11-028.test.ts`](./EX11-028.test.ts) |
| EX11-029 | Turbomon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-029.ts`](./EX11-029.ts) · [`EX11-029.test.ts`](./EX11-029.test.ts) |
| EX11-030 | ForgeBeemon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-030.ts`](./EX11-030.ts) · [`EX11-030.test.ts`](./EX11-030.test.ts) |
| EX11-031 | Vespamon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-031.ts`](./EX11-031.ts) · [`EX11-031.test.ts`](./EX11-031.test.ts) |
| EX11-032 | GrandGalemon                   |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-032.ts`](./EX11-032.ts) · [`EX11-032.test.ts`](./EX11-032.test.ts) |
| EX11-033 | Maneuvermon                    |            2/2 |      1/2 |              2/2 |        2/2 |   2/2 |  9/10 | [`EX11-033.ts`](./EX11-033.ts) · [`EX11-033.test.ts`](./EX11-033.test.ts) |
| EX11-034 | QueenBeemon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-034.ts`](./EX11-034.ts) · [`EX11-034.test.ts`](./EX11-034.test.ts) |
| EX11-035 | Zephagamon                     |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-035.ts`](./EX11-035.ts) · [`EX11-035.test.ts`](./EX11-035.test.ts) |
| EX11-036 | Dalphomon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-036.ts`](./EX11-036.ts) · [`EX11-036.test.ts`](./EX11-036.test.ts) |
| EX11-037 | Espimon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-037.ts`](./EX11-037.ts) · [`EX11-037.test.ts`](./EX11-037.test.ts) |
| EX11-038 | Sunarizamon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-038.ts`](./EX11-038.ts) · [`EX11-038.test.ts`](./EX11-038.test.ts) |
| EX11-039 | HoverEspimon                   |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-039.ts`](./EX11-039.ts) · [`EX11-039.test.ts`](./EX11-039.test.ts) |
| EX11-040 | Mulemon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-040.ts`](./EX11-040.ts) · [`EX11-040.test.ts`](./EX11-040.test.ts) |
| EX11-041 | Oblivimon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-041.ts`](./EX11-041.ts) · [`EX11-041.test.ts`](./EX11-041.test.ts) |
| EX11-042 | MockingBirdmon                 |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-042.ts`](./EX11-042.ts) · [`EX11-042.test.ts`](./EX11-042.test.ts) |
| EX11-043 | Invisimon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-043.ts`](./EX11-043.ts) · [`EX11-043.test.ts`](./EX11-043.test.ts) |
| EX11-044 | Pyramidimon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-044.ts`](./EX11-044.ts) · [`EX11-044.test.ts`](./EX11-044.test.ts) |
| EX11-045 | Metatromon                     |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-045.ts`](./EX11-045.ts) · [`EX11-045.test.ts`](./EX11-045.test.ts) |
| EX11-046 | Galacticmon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-046.ts`](./EX11-046.ts) · [`EX11-046.test.ts`](./EX11-046.test.ts) |
| EX11-047 | Impmon                         |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-047.ts`](./EX11-047.ts) · [`EX11-047.test.ts`](./EX11-047.test.ts) |
| EX11-048 | Ghostmon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-048.ts`](./EX11-048.ts) · [`EX11-048.test.ts`](./EX11-048.test.ts) |
| EX11-049 | Punkmon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-049.ts`](./EX11-049.ts) · [`EX11-049.test.ts`](./EX11-049.test.ts) |
| EX11-050 | Loudmon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-050.ts`](./EX11-050.ts) · [`EX11-050.test.ts`](./EX11-050.test.ts) |
| EX11-051 | Necromon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-051.ts`](./EX11-051.ts) · [`EX11-051.test.ts`](./EX11-051.test.ts) |
| EX11-052 | HeavyMetaldramon               |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-052.ts`](./EX11-052.ts) · [`EX11-052.test.ts`](./EX11-052.test.ts) |
| EX11-053 | Omekamon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-053.ts`](./EX11-053.ts) · [`EX11-053.test.ts`](./EX11-053.test.ts) |
| EX11-054 | Owen Dreadnought               |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-054.ts`](./EX11-054.ts) · [`EX11-054.test.ts`](./EX11-054.test.ts) |
| EX11-055 | Chitose Horaiji                |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-055.ts`](./EX11-055.ts) · [`EX11-055.test.ts`](./EX11-055.test.ts) |
| EX11-056 | Ryutaro Williams               |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-056.ts`](./EX11-056.ts) · [`EX11-056.test.ts`](./EX11-056.test.ts) |
| EX11-057 | Suzune Kazuki                  |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-057.ts`](./EX11-057.ts) · [`EX11-057.test.ts`](./EX11-057.test.ts) |
| EX11-058 | Yao Qinglan                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-058.ts`](./EX11-058.ts) · [`EX11-058.test.ts`](./EX11-058.test.ts) |
| EX11-059 | Reina Oumi                     |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-059.ts`](./EX11-059.ts) · [`EX11-059.test.ts`](./EX11-059.test.ts) |
| EX11-060 | Arisa Kinosaki                 |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-060.ts`](./EX11-060.ts) · [`EX11-060.test.ts`](./EX11-060.test.ts) |
| EX11-061 | Mirai Kinosaki                 |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-061.ts`](./EX11-061.ts) · [`EX11-061.test.ts`](./EX11-061.test.ts) |
| EX11-062 | Shoto Kazama                   |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-062.ts`](./EX11-062.ts) · [`EX11-062.test.ts`](./EX11-062.test.ts) |
| EX11-063 | Winr                           |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-063.ts`](./EX11-063.ts) · [`EX11-063.test.ts`](./EX11-063.test.ts) |
| EX11-064 | Altea                          |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-064.ts`](./EX11-064.ts) · [`EX11-064.test.ts`](./EX11-064.test.ts) |
| EX11-065 | Close                          |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-065.ts`](./EX11-065.ts) · [`EX11-065.test.ts`](./EX11-065.test.ts) |
| EX11-066 | Xeno                           |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-066.ts`](./EX11-066.ts) · [`EX11-066.test.ts`](./EX11-066.test.ts) |
| EX11-067 | Dokuson Aruba                  |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-067.ts`](./EX11-067.ts) · [`EX11-067.test.ts`](./EX11-067.test.ts) |
| EX11-068 | Violet Inboots                 |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-068.ts`](./EX11-068.ts) · [`EX11-068.test.ts`](./EX11-068.test.ts) |
| EX11-069 | Yuuki                          |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-069.ts`](./EX11-069.ts) · [`EX11-069.test.ts`](./EX11-069.test.ts) |
| EX11-070 | Unchained                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-070.ts`](./EX11-070.ts) · [`EX11-070.test.ts`](./EX11-070.test.ts) |
| EX11-071 | Cool Boy                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-071.ts`](./EX11-071.ts) · [`EX11-071.test.ts`](./EX11-071.test.ts) |
| EX11-072 | Unique Emblem: Guardian Vortex |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-072.ts`](./EX11-072.ts) · [`EX11-072.test.ts`](./EX11-072.test.ts) |
| EX11-073 | ExMaquinamon                   |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-073.ts`](./EX11-073.ts) · [`EX11-073.test.ts`](./EX11-073.test.ts) |
| EX11-074 | Vortexdramon                   |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX11-074.ts`](./EX11-074.ts) · [`EX11-074.test.ts`](./EX11-074.test.ts) |
