# EX12 Card Audit Ledger

Overall completion: **77/77 cards (100%) at 10/10**.

This versioned ledger records the card-by-card audit judgment first delivered on branch
`audit-ex12-luna-revalidation` and revalidated on `audit/ex12-card-by-card-20260901` and `audit-ex12-20260905`. It complements executable evidence; it does not replace
the catalog, knowledge-base rulings, direct IR inspection, or behavioral tests.

## Scoring rubric

Each card receives two points in each independently reviewed area:

- **Contract and rules (2/2):** every printed clause was reconciled with the committed catalog and applicable local knowledge-base material, with no unresolved ambiguity.
- **IR trace (2/2):** every clause maps to executable compiled IR, with exclusive `registerIrCard` registration, `coverage: "full"`, no residual nodes, and no `RawUnparsed` behavior.
- **Behavioral proof (2/2):** the colocated focused suite covers the applicable positive, boundary, negative, optional, frequency, cost, duration, zone, and Security behavior.
- **Peer and stack proof (2/2):** applicable trait, neighboring-card, ownership, and realistic evolution-stack risks were checked in focused or comparative scenarios.
- **Delivery gates (2/2):** focused, mechanism, collection, typecheck, style, and diff validation passed on the delivered branch.

A row may remain at 10/10 only while all five areas remain 2/2. Every row below 10/10 must be
named in the Exceptions section with the unresolved risk and where it is tracked. The executable audit
test requires exactly one row for every committed EX12 card, validates the catalog name,
all five component scores, the final score, and direct links to its module and focused test.

## Revalidation 2026-09-01

Branch `audit/ex12-card-by-card-20260901` re-audited every card with eight independent
batch auditors and treated the previous 10/10 ledger as a claim to falsify. Range reports
with per-card evidence live in `internal-docs/audits/EX12/`; the collection ledger is
`docs/audits/EX12-AUDIT.md`. Corrections delivered:

- Module defects: EX12-014, -016, -017, -028, -031, -032, -035, -036, -044 (＜Decode＞ played
  from every controlled stack instead of the host's own digivolution cards, CR 16-36-1);
  EX12-018 and -060 (Digi-Egg cards excluded from "digivolution cards" and "cards" counts);
  EX12-021 (memory gain wrongly gated on a draw; hand cost lacked its zone); EX12-026
  (restriction chain and dropped digivolution-card filter); EX12-041, -043, -050 (hidden
  cost-5 ceiling and multicolor rejection on Option use); EX12-047 ("by returning" cost was
  not declinable, CR 15-7-4); EX12-052 (mandatory DP and battle clause was declinable, Q6836);
  EX12-071 to -075 (＜Use Req.＞ counted battle-area Options, CR 16-42-3); EX12-072 (＜Guard＞
  was an inert keyword flag, now an executable replacement); EX12-077 (placement cost limited
  to Digimon cards and pool limited to the host's stack).
- Engine and shared seams: every ＜Decode＞ play now defaults to the resolving permanent's own
  digivolution cards (CR 16-36-1); SubTrigger grants reach permanents already unaffected by effects
  (Q6740); bracketed `[Rule] Name:` aliases are parsed (KB Q759); `Guard` joined the keyword
  union; `// @ts-nocheck` removed from all 77 modules and every resulting type error resolved.
- Persistence: 23 `effects.json` records had drifted from their modules; all 77 EX12 records
  were regenerated from the modules and `EX12-catalog-sync.test.ts` now enforces equality.

## Revalidation 2026-09-05

Three Luna auditors revalidated all 77 cards against the catalog, KB, executable IR,
and observable focused/peer/stack tests. The reports cover 26 + 26 + 25 cards, all
at 10/10, and 264 + 268 + 250 passing focused tests. The coordinator independently
verified the full collection and the shared deletion mechanisms.

- EX12-019 now explicitly records the opponent-only Digimon-effect scope in IR.
  The runtime already allowed friendly effects; new assertions verify friendly Digimon
  effects and opponent Option effects still apply, while opposing Digimon effects do not.
- EX12-065 now satisfies Q6866: Fortitude participates in the same ordering pool as
  the own and inherited deletion effects. Replaying the host first strands the pending
  effects. Tests cover effect and battle deletion, separate DP rule-check sweeps,
  and a Fortitude holder paid as a combat Scapegoat sacrifice.
- Independent Luna review found no additional reproducible defect in the shared change.

Current evidence and per-card reports:
[2026-09-05 revalidation](../../../../../docs/audits/EX12-20260905.md).

## Exceptions

None. The previous EX12-065 9/10 exception is resolved by the Fortitude trigger
and deleted-host provenance correction, with reproducible Q6866 tests.

## Reproducible collection evidence

- Audit invariants: `pnpm --filter @aegis/api exec vitest run src/cards/EX12/EX12.audit.test.ts src/cards/EX12/EX12-catalog-sync.test.ts`.
- Focused collection: `pnpm --filter @aegis/api exec vitest run src/cards/EX12/ --maxWorkers 1 --no-file-parallelism`, 79 files, 865 tests passed.
- Static verification: `pnpm typecheck` across all workspace packages, `oxlint`, `oxfmt --check`, and `git diff --check` passed on every changed file.
- Registration inventory: 77 catalog IDs, 77 direct modules, 77 focused suites, 77 exclusive `registerIrCard` registrations, 0 `registerCard` registrations, 0 `// @ts-nocheck` directives.

## Card scores

| Card     | Name                             | Contract/rules | IR trace | Behavioral proof | Peer/stack | Gates | Score | Evidence                                                                  |
| -------- | -------------------------------- | -------------: | -------: | ---------------: | ---------: | ----: | ----: | ------------------------------------------------------------------------- |
| EX12-001 | Nyaromon                         |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-001.ts`](./EX12-001.ts) · [`EX12-001.test.ts`](./EX12-001.test.ts) |
| EX12-002 | Mococomon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-002.ts`](./EX12-002.ts) · [`EX12-002.test.ts`](./EX12-002.test.ts) |
| EX12-003 | Kapurimon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-003.ts`](./EX12-003.ts) · [`EX12-003.test.ts`](./EX12-003.test.ts) |
| EX12-004 | Onibimon                         |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-004.ts`](./EX12-004.ts) · [`EX12-004.test.ts`](./EX12-004.test.ts) |
| EX12-005 | Agumon                           |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-005.ts`](./EX12-005.ts) · [`EX12-005.test.ts`](./EX12-005.test.ts) |
| EX12-006 | Kakamon                          |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-006.ts`](./EX12-006.ts) · [`EX12-006.test.ts`](./EX12-006.test.ts) |
| EX12-007 | Gammamon                         |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-007.ts`](./EX12-007.ts) · [`EX12-007.test.ts`](./EX12-007.test.ts) |
| EX12-008 | ToyAgumon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-008.ts`](./EX12-008.ts) · [`EX12-008.test.ts`](./EX12-008.test.ts) |
| EX12-009 | Wankomon                         |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-009.ts`](./EX12-009.ts) · [`EX12-009.test.ts`](./EX12-009.test.ts) |
| EX12-010 | Greymon                          |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-010.ts`](./EX12-010.ts) · [`EX12-010.test.ts`](./EX12-010.test.ts) |
| EX12-011 | Seasarmon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-011.ts`](./EX12-011.ts) · [`EX12-011.test.ts`](./EX12-011.test.ts) |
| EX12-012 | Apemon                           |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-012.ts`](./EX12-012.ts) · [`EX12-012.test.ts`](./EX12-012.test.ts) |
| EX12-013 | BetelGammamon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-013.ts`](./EX12-013.ts) · [`EX12-013.test.ts`](./EX12-013.test.ts) |
| EX12-014 | Canoweissmon                     |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-014.ts`](./EX12-014.ts) · [`EX12-014.test.ts`](./EX12-014.test.ts) |
| EX12-015 | Gokuumon                         |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-015.ts`](./EX12-015.ts) · [`EX12-015.test.ts`](./EX12-015.test.ts) |
| EX12-016 | MetalGreymon                     |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-016.ts`](./EX12-016.ts) · [`EX12-016.test.ts`](./EX12-016.test.ts) |
| EX12-017 | WarGreymon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-017.ts`](./EX12-017.ts) · [`EX12-017.test.ts`](./EX12-017.test.ts) |
| EX12-018 | Siriusmon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-018.ts`](./EX12-018.ts) · [`EX12-018.test.ts`](./EX12-018.test.ts) |
| EX12-019 | Nezhamon                         |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-019.ts`](./EX12-019.ts) · [`EX12-019.test.ts`](./EX12-019.test.ts) |
| EX12-020 | Gasamon                          |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-020.ts`](./EX12-020.ts) · [`EX12-020.test.ts`](./EX12-020.test.ts) |
| EX12-021 | Gabumon                          |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-021.ts`](./EX12-021.ts) · [`EX12-021.test.ts`](./EX12-021.test.ts) |
| EX12-022 | Kamemon                          |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-022.ts`](./EX12-022.ts) · [`EX12-022.test.ts`](./EX12-022.test.ts) |
| EX12-023 | Jellymon                         |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-023.ts`](./EX12-023.ts) · [`EX12-023.test.ts`](./EX12-023.test.ts) |
| EX12-024 | Garurumon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-024.ts`](./EX12-024.ts) · [`EX12-024.test.ts`](./EX12-024.test.ts) |
| EX12-025 | Gawappamon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-025.ts`](./EX12-025.ts) · [`EX12-025.test.ts`](./EX12-025.test.ts) |
| EX12-026 | Shellmon                         |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-026.ts`](./EX12-026.ts) · [`EX12-026.test.ts`](./EX12-026.test.ts) |
| EX12-027 | TeslaJellymon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-027.ts`](./EX12-027.ts) · [`EX12-027.test.ts`](./EX12-027.test.ts) |
| EX12-028 | Gusokumon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-028.ts`](./EX12-028.ts) · [`EX12-028.test.ts`](./EX12-028.test.ts) |
| EX12-029 | Sagomon                          |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-029.ts`](./EX12-029.ts) · [`EX12-029.test.ts`](./EX12-029.test.ts) |
| EX12-030 | Thetismon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-030.ts`](./EX12-030.ts) · [`EX12-030.test.ts`](./EX12-030.test.ts) |
| EX12-031 | MarineBullmon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-031.ts`](./EX12-031.ts) · [`EX12-031.test.ts`](./EX12-031.test.ts) |
| EX12-032 | WereGarurumon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-032.ts`](./EX12-032.ts) · [`EX12-032.test.ts`](./EX12-032.test.ts) |
| EX12-033 | Amphimon                         |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-033.ts`](./EX12-033.ts) · [`EX12-033.test.ts`](./EX12-033.test.ts) |
| EX12-034 | Erlangmon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-034.ts`](./EX12-034.ts) · [`EX12-034.test.ts`](./EX12-034.test.ts) |
| EX12-035 | MetalGarurumon                   |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-035.ts`](./EX12-035.ts) · [`EX12-035.test.ts`](./EX12-035.test.ts) |
| EX12-036 | Ryugumon                         |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-036.ts`](./EX12-036.ts) · [`EX12-036.test.ts`](./EX12-036.test.ts) |
| EX12-037 | Omnimon                          |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-037.ts`](./EX12-037.ts) · [`EX12-037.test.ts`](./EX12-037.test.ts) |
| EX12-038 | Kokuwamon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-038.ts`](./EX12-038.ts) · [`EX12-038.test.ts`](./EX12-038.test.ts) |
| EX12-039 | Takinmon                         |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-039.ts`](./EX12-039.ts) · [`EX12-039.test.ts`](./EX12-039.test.ts) |
| EX12-040 | Salamon                          |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-040.ts`](./EX12-040.ts) · [`EX12-040.test.ts`](./EX12-040.test.ts) |
| EX12-041 | Thundermon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-041.ts`](./EX12-041.ts) · [`EX12-041.test.ts`](./EX12-041.test.ts) |
| EX12-042 | Gatomon                          |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-042.ts`](./EX12-042.ts) · [`EX12-042.test.ts`](./EX12-042.test.ts) |
| EX12-043 | Hakubamon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-043.ts`](./EX12-043.ts) · [`EX12-043.test.ts`](./EX12-043.test.ts) |
| EX12-044 | Angewomon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-044.ts`](./EX12-044.ts) · [`EX12-044.test.ts`](./EX12-044.test.ts) |
| EX12-045 | Sanzomon                         |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-045.ts`](./EX12-045.ts) · [`EX12-045.test.ts`](./EX12-045.test.ts) |
| EX12-046 | Shishimamon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-046.ts`](./EX12-046.ts) · [`EX12-046.test.ts`](./EX12-046.test.ts) |
| EX12-047 | Amaterasumon                     |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-047.ts`](./EX12-047.ts) · [`EX12-047.test.ts`](./EX12-047.test.ts) |
| EX12-048 | SeitenGokuumon                   |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-048.ts`](./EX12-048.ts) · [`EX12-048.test.ts`](./EX12-048.test.ts) |
| EX12-049 | Angoramon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-049.ts`](./EX12-049.ts) · [`EX12-049.test.ts`](./EX12-049.test.ts) |
| EX12-050 | SymbareAngoramon                 |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-050.ts`](./EX12-050.ts) · [`EX12-050.test.ts`](./EX12-050.test.ts) |
| EX12-051 | Lamortmon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-051.ts`](./EX12-051.ts) · [`EX12-051.test.ts`](./EX12-051.test.ts) |
| EX12-052 | Diarbbitmon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-052.ts`](./EX12-052.ts) · [`EX12-052.test.ts`](./EX12-052.test.ts) |
| EX12-053 | Hagurumon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-053.ts`](./EX12-053.ts) · [`EX12-053.test.ts`](./EX12-053.test.ts) |
| EX12-054 | Guardromon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-054.ts`](./EX12-054.ts) · [`EX12-054.test.ts`](./EX12-054.test.ts) |
| EX12-055 | Andromon                         |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-055.ts`](./EX12-055.ts) · [`EX12-055.test.ts`](./EX12-055.test.ts) |
| EX12-056 | Cho-Hakkaimon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-056.ts`](./EX12-056.ts) · [`EX12-056.test.ts`](./EX12-056.test.ts) |
| EX12-057 | Takutoumon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-057.ts`](./EX12-057.ts) · [`EX12-057.test.ts`](./EX12-057.test.ts) |
| EX12-058 | HiAndromon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-058.ts`](./EX12-058.ts) · [`EX12-058.test.ts`](./EX12-058.test.ts) |
| EX12-059 | Machinedramon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-059.ts`](./EX12-059.ts) · [`EX12-059.test.ts`](./EX12-059.test.ts) |
| EX12-060 | Chaosdramon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-060.ts`](./EX12-060.ts) · [`EX12-060.test.ts`](./EX12-060.test.ts) |
| EX12-061 | Hanimon                          |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-061.ts`](./EX12-061.ts) · [`EX12-061.test.ts`](./EX12-061.test.ts) |
| EX12-062 | Kokeshimon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-062.ts`](./EX12-062.ts) · [`EX12-062.test.ts`](./EX12-062.test.ts) |
| EX12-063 | Karakurumon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-063.ts`](./EX12-063.ts) · [`EX12-063.test.ts`](./EX12-063.test.ts) |
| EX12-064 | Megadramon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-064.ts`](./EX12-064.ts) · [`EX12-064.test.ts`](./EX12-064.test.ts) |
| EX12-065 | Kaguyamon                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-065.ts`](./EX12-065.ts) · [`EX12-065.test.ts`](./EX12-065.test.ts) |
| EX12-066 | Hiro Amanokawa                   |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-066.ts`](./EX12-066.ts) · [`EX12-066.test.ts`](./EX12-066.test.ts) |
| EX12-067 | Kiyoshiro Higashimitarai         |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-067.ts`](./EX12-067.ts) · [`EX12-067.test.ts`](./EX12-067.test.ts) |
| EX12-068 | Ruli Tsukiyono                   |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-068.ts`](./EX12-068.ts) · [`EX12-068.test.ts`](./EX12-068.test.ts) |
| EX12-069 | Virus Busters                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-069.ts`](./EX12-069.ts) · [`EX12-069.test.ts`](./EX12-069.test.ts) |
| EX12-070 | Sanmyojin Arrival                |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-070.ts`](./EX12-070.ts) · [`EX12-070.test.ts`](./EX12-070.test.ts) |
| EX12-071 | Saneiketsu Invitation            |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-071.ts`](./EX12-071.ts) · [`EX12-071.test.ts`](./EX12-071.test.ts) |
| EX12-072 | Metal Empire                     |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-072.ts`](./EX12-072.ts) · [`EX12-072.test.ts`](./EX12-072.test.ts) |
| EX12-073 | Giant Meat                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-073.ts`](./EX12-073.ts) · [`EX12-073.test.ts`](./EX12-073.test.ts) |
| EX12-074 | Genshi Continent & Ashino Island |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-074.ts`](./EX12-074.ts) · [`EX12-074.test.ts`](./EX12-074.test.ts) |
| EX12-075 | Kunlun's Imperial Decree         |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-075.ts`](./EX12-075.ts) · [`EX12-075.test.ts`](./EX12-075.test.ts) |
| EX12-076 | Susanoomon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-076.ts`](./EX12-076.ts) · [`EX12-076.test.ts`](./EX12-076.test.ts) |
| EX12-077 | Proximamon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX12-077.ts`](./EX12-077.ts) · [`EX12-077.test.ts`](./EX12-077.test.ts) |
