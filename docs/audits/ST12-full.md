# ST12 full collection audit ledger

Scope: ST12-016 down through ST12-001, completed on 2026-08-20. The committed
catalog contains all 16 cards. Evidence was checked per card against the
catalog, `node tools/kb/query.mjs card <ID>`, the local comprehensive-rules
data, `packages/shared/src/effects/effects.json`, and the direct module when
present. Printed clauses, timing, optionality, OPT identity, costs, targets,
zones, face state, ordering, duration, and evolution requirements were
compared.

## Evidence hashes

| Source | SHA-1 (12) |
|---|---|
| `packages/shared/src/cards/data/cards.json` | `668a4aec030f` |
| `packages/shared/src/effects/effects.json` | `af2b3293c72c` |
| `data/kb/manifest.json` | `d62a5ced6eaf` |
| `data/kb/rules/comprehensive.md` | `cc7168408536` |
| `apps/api/src/cards/ST12/index.ts` | `2e12a078ce8f` |

`KB=OK` means the local query completed. `IR=full` means the compiled record
has no residual. `IR=partial + direct` means the compiled record exposes a
known parser primitive gap, while the checked-in direct module supplies the
behavior and colocated proof. `Vanilla` means the catalog has no effect text,
so no effect module is applicable. Runtime-dependent scores are capped at
9/10 because Vitest and typecheck were not available in this checkout.

| Card | Module / test hashes | Evidence result | Score |
|---|---|---|---|
| ST12-16 | `a9e7b619a899` / `3ff474046385` | KB=OK; IR=full; color waiver condition, opponent play-cost <=13 deletion, Security Main activation | 9/10 |
| ST12-15 | `4826e1e387b9` / `15831330c440` | KB=OK; IR=full; reveal/add/trash, Battle Area placement even on miss, Delay and Security sequence | 9/10 |
| ST12-14 | `f55a40e1c0a8` / `603ae59dab22` | KB=OK; IR=full; independent targets, conditional memory/Piercing, Security memory plus hand | 9/10 |
| ST12-13 | `37d7ee32adf7` / `730f62b094f7` | KB=OK; IR=full; top-3 filter/trash, special alternate name/trait, all-turn Reboot grant | 9/10 |
| ST12-12 | `23a9bc9ac05b` / `b3d13e1566bd` | KB=OK; IR=full; optional hand trash cost and Draw 2, Decoy Red/Black condition | 9/10 |
| ST12-11 | `430861f6cb57` / `d160e5225eff` | KB=OK; IR=partial + direct; trash play filter, effect-play trigger, once-per-turn and up-to-two De-Digivolve | 9/10 |
| ST12-10 | `178e936844ad` / `25eea5d05076` | KB=OK; IR=full; Blitz timing, hand-only Sistermon play, same-attack trigger, Your Turn OPT and duration | 9/10 |
| ST12-09 | `d30163ea4d76` / `2fbe2421e566` | KB=OK; IR=full; Blocker and inherited Security Attack +1 | 9/10 |
| ST12-08 | `e655ee51d0be` / `5c5de5cfa7db` | KB=OK; IR=partial + direct; unsuspended attack grant and inherited Royal Knight-gated hand/trash Sistermon play | 9/10 |
| ST12-07 | `-` / `fae144503898` | KB=OK; Vanilla; printed play/evolution cost, level, color, DP behavior tested | 9/10 |
| ST12-06 | `ad182cd24d93` / `c26a96bca152` | KB=OK; IR=full; inherited Huckmon/Royal Knight DP aura and stack host evaluation | 9/10 |
| ST12-05 | `-` / `bfed2bab30c3` | KB=OK; Vanilla; printed play/evolution cost, level, color, DP behavior tested | 9/10 |
| ST12-04 | `1578fc6ca0d7` / `ba063c292537` | KB=OK; IR=full; Sistermon play trigger, Your Turn OPT, inherited name/trait condition | 9/10 |
| ST12-03 | `320f203bb6e5` / `b8646736e3d6` | KB=OK; IR=full; both players cannot reduce play costs | 9/10 |
| ST12-02 | `-` / `257bcacfe346` | KB=OK; Vanilla; printed play/evolution cost, level, color, DP behavior tested | 9/10 |
| ST12-01 | `66e0284a477e` / `f30f5fc4b94d` | KB=OK; IR=full; inherited current-host aura and 2+ Digimon threshold | 9/10 |

## Gates and blockers

- The requested `/home/vinicius/.local/bin/pnpm` is not usable: its wrapper
  executes `corepack pnpm ""` and drops all arguments.
- Direct `corepack pnpm install --frozen-lockfile` was attempted and blocked by
  `EROFS` while pnpm tried to create a store project symlink under
  `/home/vinicius/.local/share/pnpm/store`.
- `node_modules` and `tsc` are absent. Therefore shared compilation, serial
  low-memory Vitest from `apps/api`, and workspace typecheck are **not
  verified**. No card receives 10/10.
- `git diff --check` remains a required delivery gate and is recorded with the
  audit commit.
- No implementation behavior was changed: static evidence did not prove a
  defect in an existing module. The only additions are colocated vanilla-card
  behavioral tests and this ledger.
