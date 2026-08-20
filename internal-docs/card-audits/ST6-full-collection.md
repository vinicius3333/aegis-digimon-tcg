# ST6 full-collection audit ledger

Scope: `ST6-016` down through `ST6-001` (catalog IDs are `ST6-16` through
`ST6-01`), audited individually on 2026-08-20. Evidence sources were the
committed catalog, `node tools/kb/query.mjs card <ID>`, the local rules KB,
the direct TypeScript module or registered compiled IR, and the colocated
tests.

## Gates and rubric

The ten review points were checked for identity/stats, KB/rulings, clause
mapping, requirements/traits/colors, costs and failure paths, controller and
targets, zones/order/face, timing/duration/OPT, decision surface, and
executable proof. The static points are recorded below. All scores are `NR`
(not verified): Corepack could not download pnpm, the required wrapper
`/home/vinicius/.local/bin/pnpm` discards its arguments, and this checkout has
no installed `node_modules`; therefore Vitest, shared compilation, and
typecheck could not execute. No card is claimed as 10/10.

Source SHA-256 prefixes: catalog `dac8e0780dd3`; KB manifest
`34b8c0844b3f`; comprehensive rules `93a42c2d3052`; ST6 index
`cf5e0dcf6900`.

`Direct` means a hand-authored `registerCard` module (including inherited
peer modules). `IR-full` means the compiled record declares `coverage: full`
and `residual: []`. `Vanilla` means the catalog has no effect text and the
absence of a module is intentional. Module and test values are SHA-256
prefixes of the current files; `-` means not applicable or absent.

| Card | Module / hash | Test / hash | KB output | Static clause and boundary result | IR | Score |
|---|---|---|---|---|---|---|
| ST6-16 | `ST6/ST6-16.ts` / `6c8cabc6ed02` | `ST6/ST6-16.test.ts` / `7acbfb5b6931` | `e174cda699fe` | Main optional: play up to one purple level 3 and one purple level 4 from trash for free; suppress both On Play effects. Security optional: play one purple level 4 or lower from trash for free; suppress On Play. Exact level/color/zone and one-of-each boundary checked statically. | Direct | NR |
| ST6-15 | `ST6/ST6-15.ts` / `daa8b50d66d4` | `ST6/ST6-15.test.ts` / `89a72f7b1ce1` | `e6b43e155f57` | Main optional: delete one own Digimon, then one opposing level 4 or lower Digimon; Security deletes one opposing level 4 or lower. Q676/Q677 require the full option effect before deletion triggers and simultaneous trigger ordering; code uses one two-permanent delete primitive. | Direct | NR |
| ST6-14 | `ST6/ST6-14.ts` / `aa980dc26aec` | `ST6/ST6-14.test.ts` / `d5d06d82445e` | `a7c9d0737dae` | Your Turn: when one own Digimon is deleted, may suspend this Tamer to gain 1 memory. No catalog Security clause. Removed an unsupported IR Security self-play action and replaced its test with a negative Security assertion. | IR-full | NR |
| ST6-13 | `ST6/ST6-13.ts` / `f93b8da9f46d` | `ST6/ST6-13.test.ts` / `44203cbd1a56` | `8e70fefa92a7` | Security Attack +1. Main Digi-Burst 2: trash exactly two sources, then play one purple level 3 Digimon from trash for free; Q675 permits using a trashed source immediately. | Direct | NR |
| ST6-12 | `ST6/ST6-12.ts` / `a732a756f820` | `ST6/ST6-12.test.ts` / `3752d1c2b00e` | `62305556f808` | When Digivolving, up to two own Digimon gain Retaliation through the opponent's next turn. Q673 allows self-targeting; Q674 preserves the granted effect through evolution. | Direct | NR |
| ST6-11 | `ST6/ST6-11.ts` / `435a0d9ba2bd` | `ST6/ST6-11.test.ts` / `c512f66c7b00` | `df8b4837009e` | Inherited Your Turn aura: with 5 or more cards in own trash, +2000 DP. Threshold, controller turn, inherited source, and turn duration mapped. | Direct | NR |
| ST6-10 | `ST6/ST6-10.ts` / `5f338b258973` | `ST6/ST6-10.test.ts` / `875665c9da51` | `fe8ba0af603b` | When Digivolving, optionally return one purple Digimon from own trash to hand; exact type/color/zone and no-target path mapped. | Direct | NR |
| ST6-09 | `-` | `-` | `cf3fc131cb03` | Vanilla Kyukimon: no effect or inherited text; no module is applicable. | Vanilla | NR |
| ST6-08 | `ST6/ST6-08.ts` / `72616e315a7d` | `ST6/ST6-08.test.ts` / `23ec41b29829` | `fece341473a1` | Blocker; When Attacking loses 2 memory. Q672 confirms attacking is legal even when the loss moves memory to the opponent. | Direct | NR |
| ST6-07 | `-` | `-` | `07784f3e4643` | Vanilla Youkomon: no effect or inherited text; no module is applicable. | Vanilla | NR |
| ST6-06 | `ST6/ST6-06.ts` / `8dbe43afe3d9` | `ST6/ST6-06.test.ts` / `9a74b8281bc4` | `a036496f8160` | Inherited When Attacking: Draw 1, then trash one hand card. Reuses the verified ST6-03 effect and preserves source identity as ST6-06. | Direct | NR |
| ST6-05 | `-` | `-` | `44345e427b2a` | Vanilla Elecmon: no effect or inherited text; no module is applicable. | Vanilla | NR |
| ST6-04 | `ST6/ST6-04.ts` / `184ad884f3ce` | `ST6/ST6-04.test.ts` / `f704722d0bc2` | `99b31a720032` | On Play optionally returns one purple Option costing exactly 1 or 7 from trash to hand. Q671 confirms its own attack remains legal before the memory loss from a separate peer effect. | Direct | NR |
| ST6-03 | `ST6/ST6-03.ts` / `ef418b5aa263` | `ST6/ST6-03.test.ts` / `c0ca2b9b1560` | `c40385df20af` | Inherited When Attacking: Draw 1, then trash exactly one hand card; draw-before-discard order and empty-hand failure path mapped. | Direct | NR |
| ST6-02 | `-` | `-` | `530d7e0e67ff` | Vanilla DemiDevimon: no effect or inherited text; no module is applicable. | Vanilla | NR |
| ST6-01 | `ST6/ST6-01.ts` / `742449e77bab` | `ST6/ST6-01.test.ts` / `1d1e5a6bb00c` | `3408b43beac4` | Inherited On Deletion trashes the top two cards of own deck, bounded by deck size. Q670 confirms an empty deck does not immediately lose the game. | Direct | NR |

## Change, tests, commits, and blockers

The only evidence-backed implementation change was ST6-14: its committed
catalog has no Security text, while its prior compiled IR and test added a
Security self-play effect. The IR action was removed and the colocated test
now proves the card remains in Security and does not enter the battle area.

Attempted commands:

```text
COREPACK_HOME=/tmp/aegis-corepack corepack prepare pnpm@10.30.1 --activate
/home/vinicius/.local/bin/pnpm --filter @aegis/shared build
COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm --filter @aegis/shared build
COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm exec vitest run src/cards/ST6 --pool=forks --poolOptions.forks.maxForks=1 --no-file-parallelism --maxWorkers=1 --minWorkers=1
git diff --check  # passed
```

The first Corepack command was blocked by unavailable registry access. The
local pnpm wrapper is malformed (`exec corepack pnpm ""`), and the fallback
Corepack invocation reached the workspace but failed because `tsc` and
`node_modules` are absent. Thus Vitest, shared compilation, and typecheck are
not verified. `git diff --check` passed.

The requested plumbing commit was attempted with `GIT_INDEX_FILE`,
`write-tree`, `commit-tree`, and `update-ref`, but the managed checkout grants
read-only access to `.git`; Git could not create its temporary object/index
files. No commit hash exists. The working-tree change is intentionally
preserved and was not reset, rebased, force-pushed, or discarded.
