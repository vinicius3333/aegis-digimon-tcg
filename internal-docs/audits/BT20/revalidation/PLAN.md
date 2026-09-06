# BT20 independent behavioral revalidation

Baseline: a924de971e0b43ad9ebd8f82a454d495ff880a60; branch: audit-bt20-astra-luna. Scope: 102 committed catalog cards, BT20-001 through BT20-102. Historical reports are inputs only. catalog.json preserves the full printed inventory; ledger.json records current scores using the established five dimensions, each 0–2. Pending scores measure accepted evidence, not an assertion that the implementation is broken.

## Ownership and batches

Astra owns planning, integration, shared engine changes/regressions, generated effects, scoring, commits, push, PR, and Orca status. Three Luna agents receive disjoint batches of 3 cards, auditing one card at a time. Initial batches: 001–003, 004–006, 007–009. Subsequent batches proceed from 010–012 through 100–102 as lanes finish. Scope changes require coordinator assignment. Each worker owns only assigned direct modules, colocated tests, and a unique per-card report in this directory. No worker edits engine files, generated catalogs, common helpers, or collection ledgers; report precise mechanism gaps to Astra for serialized repair.

## Per-card acceptance

Read all catalog fields and run node tools/kb/query.mjs card CARD-ID; trace applicable KB rulings/errata and actual interpreter semantics. Map each printed clause to code and behavioral assertions. Prove public-intent timing, costs/refusal, target boundaries, controller, zones, duration, inherited/security clauses, once-per-turn, trait comparisons, legal evolution stacks and negative paths. No injected event alone or keyword-presence assertion substitutes for natural behavior. Neutral fixtures must not conceal legal evolution gaps. Every production module has exactly one registerIrCard(cardId, compiled) and no registerCard. Each report records clauses, files/test names, exact commands/results, scores, outstanding gaps and sensitivity evidence. Unsupported or ambiguous cards remain below 10/10.

## Resource limits and integration

At most one Vitest process runs in this worktree at a time. Workers request the test slot; all invocations use --maxWorkers=1 --no-file-parallelism, with bounded test/hook timeouts. Astra runs collection baseline first and then grants focused slots. No parallel package builds. Engine fixes and catalog sync are serialized, with minimal reusable seams and mechanism regressions. Only pnpm effects:sync:set -- --set BT20 and effects:check:set may update/check generated effects; compare scope to baseline.

## Gates and delivery

Inspect and rerun each focused test, then affected mechanism suites, full BT20 suite including catalog/collection contracts, pnpm typecheck, scoped lint/format, and git diff --check. Persist command outputs and per-card results. Recalculate all 102 rows from accepted per-card evidence and final gates; never propagate historical scores automatically. Review changes, make atomic commits, push this branch, and open an English review PR without merging. Update Orca at meaningful checkpoints. Only 102/102 accepted 10/10 cards plus every gate and pushed delivery permits the requested COLLECTION COMPLETE Orca status and persistent-goal completion.

## Inventory

| Card | Name | Initial state |
| --- | --- | --- |
| BT20-001 | DemiVeemon | pending |
| BT20-002 | Bebydomon | pending |
| BT20-003 | Bibimon | pending |
| BT20-004 | Pinamon | pending |
| BT20-005 | Kapurimon | pending |
| BT20-006 | DemiMeramon | pending |
| BT20-007 | Dracomon | pending |
| BT20-008 | Huckmon | pending |
| BT20-009 | Veemon | pending |
| BT20-010 | Ryudamon | pending |
| BT20-011 | ExVeemon | pending |
| BT20-012 | Ginryumon | pending |
| BT20-013 | BaoHuckmon | pending |
| BT20-014 | SaviorHuckmon | pending |
| BT20-015 | Hisyaryumon | pending |
| BT20-016 | Paildramon | pending |
| BT20-017 | Jesmon | pending |
| BT20-018 | Ouryumon | pending |
| BT20-019 | Jesmon (X Antibody) | pending |
| BT20-020 | Imperialdramon: Fighter Mode | pending |
| BT20-021 | Jesmon GX | pending |
| BT20-022 | Crabmon (X Antibody) | pending |
| BT20-023 | Coredramon | pending |
| BT20-024 | Seadramon (X Antibody) | pending |
| BT20-025 | Wingdramon | pending |
| BT20-026 | MegaSeadramon (X Antibody) | pending |
| BT20-027 | Slayerdramon | pending |
| BT20-028 | GigaSeadramon | pending |
| BT20-029 | Pulsemon | pending |
| BT20-030 | Liollmon | pending |
| BT20-031 | Liamon | pending |
| BT20-032 | Bulkmon | pending |
| BT20-033 | LoaderLeomon | pending |
| BT20-034 | Boutmon | pending |
| BT20-035 | Kazuchimon | pending |
| BT20-036 | BanchoLeomon | pending |
| BT20-037 | Chaosmon: Valdur Arm | pending |
| BT20-038 | Falcomon | pending |
| BT20-039 | Diatrymon | pending |
| BT20-040 | Coredramon | pending |
| BT20-041 | Crowmon | pending |
| BT20-042 | Groundramon | pending |
| BT20-043 | Varodurumon | pending |
| BT20-044 | Breakdramon | pending |
| BT20-045 | Examon | pending |
| BT20-046 | Espimon | pending |
| BT20-047 | Solarmon | pending |
| BT20-048 | Dorumon | pending |
| BT20-049 | Blimpmon | pending |
| BT20-050 | HoverEspimon | pending |
| BT20-051 | Raptordramon | pending |
| BT20-052 | Oblivimon | pending |
| BT20-053 | Grademon | pending |
| BT20-054 | Bulbmon | pending |
| BT20-055 | Invisimon | pending |
| BT20-056 | Alphamon | pending |
| BT20-057 | Gankoomon | pending |
| BT20-058 | Raidenmon | pending |
| BT20-059 | Gankoomon (X Antibody) | pending |
| BT20-060 | Alphamon: Ouryuken | pending |
| BT20-061 | Impmon | pending |
| BT20-062 | Candlemon | pending |
| BT20-063 | Ghostmon | pending |
| BT20-064 | Loogamon | pending |
| BT20-065 | Wormmon | pending |
| BT20-066 | Stingmon | pending |
| BT20-067 | Soulmon | pending |
| BT20-068 | Bakemon | pending |
| BT20-069 | Punkmon | pending |
| BT20-070 | Loogarmon | pending |
| BT20-071 | Soloogarmon | pending |
| BT20-072 | Phantomon | pending |
| BT20-073 | MetalPhantomon | pending |
| BT20-074 | Dinobeemon | pending |
| BT20-075 | Loudmon | pending |
| BT20-076 | Imperialdramon: Dragon Mode | pending |
| BT20-077 | HeavyMetaldramon | pending |
| BT20-078 | Reapermon | pending |
| BT20-079 | Necromon | pending |
| BT20-080 | Fenriloogamon | pending |
| BT20-081 | Fenriloogamon: Takemikazuchi | pending |
| BT20-082 | DeathXmon | pending |
| BT20-083 | Omekamon | pending |
| BT20-084 | Sistermon Ciel (Awakened) | pending |
| BT20-085 | Shoto Kazama | pending |
| BT20-086 | Altea | pending |
| BT20-087 | Kota Domoto & Yuji Musya | pending |
| BT20-088 | Violet Inboots | pending |
| BT20-089 | Code Cracker Fang & Hacker Judge | pending |
| BT20-090 | Yuuki | pending |
| BT20-091 | Cool Boy | pending |
| BT20-092 | Battle NPC | pending |
| BT20-093 | Unleash the Dragon Gene | pending |
| BT20-094 | Emperor Dragon of Calamity | pending |
| BT20-095 | Fellowship of Hope's Keepers | pending |
| BT20-096 | Black Sabbath | pending |
| BT20-097 | The Apostle of Doom Descends! | pending |
| BT20-098 | Apparition Legion | pending |
| BT20-099 | Singularity of Chaos | pending |
| BT20-100 | The Last Guardian | pending |
| BT20-101 | Zephagamon | pending |
| BT20-102 | Omnimon (X Antibody) | pending |
