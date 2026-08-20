# ST15 full-collection audit ledger

Scope: committed collection ST15, audited in descending order from ST15-16 to ST15-01 on 2026-08-20. The catalog contains 16 cards. Evidence was checked against `packages/shared/src/cards/data/cards.json`, `node tools/kb/query.mjs card <CARD-ID>`, `data/kb`, the registered direct module under `apps/api/src/cards/ST15/`, the colocated tests, and `packages/shared/src/effects/effects.json`.

The direct modules are the runtime IR registration for ST15 except ST15-13, which is a hand-written module. The committed shared effects artifact is stale for several cards even where the direct module contains the evidence-backed correction; this is recorded per card and is not silently treated as proof.

## Rubric and gates

The ten review points were checked for every card: catalog identity and stats; KB/rulings; clause mapping; requirements, traits, and colors; costs and failure paths; controller, target, and count; zones, order, and face; timing, OPT, duration, and interactions; decision surface; and executable proof. No card receives 10/10 because Vitest and typecheck were not available in this checkout.

| Card | Module / test evidence | Clause-level result | Score |
|---|---|---|---|
| ST15-16 | `ST15/ST15-16.ts`; `ST15/ST15-16.test.ts` | Main De-Digivolve 3, opponent target, temporary forced attack, Security De-Digivolve 3; KB Q818–Q820. Shared IR is `full`; colocated positive/negative timing proof exists. | 9/10, runtime not verified |
| ST15-15 | `ST15/ST15-15.ts` | Tai color waiver, Main unsuspend then Greymon-name immunity through opponent turn, Security Main; KB Q816–Q817. Shared IR is `full`; no colocated behavioral test. | 8/10, runtime not verified |
| ST15-14 | `ST15/ST15-14.ts` | Start-of-turn memory floor, suspension cost, Draw 1, one own Digimon +2000 until turn end, Security play; KB Q815. Direct IR uses the evidenced duration; committed shared IR incorrectly says permanent. | 8/10, runtime not verified |
| ST15-13 | `ST15/ST15-13.ts`; `ST15/ST15-13.test.ts` | Blocker and When Digivolving deletion at play cost ≤8, including negative boundary. Direct module and tests cover both clauses. Catalog effect text has a malformed/missing closing parenthesis; committed IR retains an explicit blocker residual, so full evidence is not claimed. | 8/10, runtime not verified |
| ST15-12 | `ST15/ST15-12.ts` | Blast Digivolve from hand, Blocker, All Turns OPT unsuspend when either security stack loses a card; KB Q814. Direct IR removes the erroneous Counter Unsuspend action; shared IR still contains it. | 8/10, runtime not verified |
| ST15-11 | `ST15/ST15-11.ts` | Greymon-name Lv.4 evolution cost 3, Blocker, inherited Security Attack +1. Shared IR is `full`; no colocated behavioral test. | 8/10, runtime not verified |
| ST15-10 | `ST15/ST15-10.ts` | When Digivolving opponent De-Digivolve 1 with stop-at-level-3 boundary; inherited Reboot. Shared IR is `full`; no colocated behavioral test. | 8/10, runtime not verified |
| ST15-09 | `ST15/ST15-09.ts` | On Play deletes exactly one opponent Digimon with play cost ≤5. Shared IR is `full`; no colocated behavioral test. | 8/10, runtime not verified |
| ST15-08 | `ST15/ST15-08.ts`; `ST15/ST15-08.test.ts` | Agumon-name-exact or Tai Kamiya Tamer from hand/trash without cost, optional, Blocker, inherited memory and alternate evolution; KB Q811–Q813 and Q6160. Direct module/test cover Agumon Security behavior; shared IR has an incorrect combined Tamer/Agumon filter. | 9/10, runtime not verified |
| ST15-07 | `ST15/ST15-07.ts` | Jamming keyword and Security Digimon battle deletion boundary. Shared IR is `full`; no colocated behavioral test. | 8/10, runtime not verified |
| ST15-06 | `ST15/ST15-06.ts` | Inherited Reboot. Shared IR is `full`; no colocated behavioral test. | 8/10, runtime not verified |
| ST15-05 | `ST15/ST15-05.ts` | Blocker and Your Turn attack-player memory loss 2; KB Q810 confirms activation before blocking. Shared IR is `full`; no colocated behavioral test. | 8/10, runtime not verified |
| ST15-04 | `ST15/ST15-04.ts` | Reveal exactly one, add a black card, trash the rest. Shared IR is `full`; no colocated behavioral test. | 8/10, runtime not verified |
| ST15-03 | `ST15/ST15-03.ts` | Inherited Reboot. Shared IR is `full`; no colocated behavioral test. | 8/10, runtime not verified |
| ST15-02 | `ST15/ST15-02.ts` | Start-of-main memory only for opponent battle-area Digimon, alternate Koromon evolution, inherited switched-target memory OPT; KB Q807–Q809. Direct/shared IR is `full`; no colocated behavioral test. | 8/10, runtime not verified |
| ST15-01 | `ST15/ST15-01.ts` | Inherited switched-target memory-independent +1000 DP until end of turn, once per turn, including another Digimon's switch; KB Q805–Q806. Direct module uses the evidenced duration; shared IR incorrectly says permanent. | 8/10, runtime not verified |

## Tests and blockers

- Existing colocated behavioral tests: ST15-08, ST15-13, and ST15-16. The new `ST15/collection.audit.test.ts` guards the complete 16-card inventory, module registration, committed IR presence, and the ST15-13 direct-module exception.
- `node tools/kb/query.mjs card ST15-01` through `ST15-16` completed successfully; Q&A are present for ST15-01, 02, 05, 08, 12, 14, 15, and 16.
- The requested `/home/vinicius/.local/bin/pnpm` is a broken wrapper that executes `corepack pnpm ""` and discards arguments. `corepack pnpm` reports 10.30.1, but installation is blocked by `EROFS` while creating the workspace symlink in `/home/vinicius/.local/share/pnpm/store`; therefore shared compilation, serial low-memory Vitest, and typecheck are not verified.
- `git diff --check` is required at delivery. No behavior was changed in this audit because the direct modules already contain the evidence-backed corrections; the stale shared artifact and the ST15-13 catalog/parser residual remain explicit blockers rather than being silently rewritten.

## Source hashes

The catalog/KB/rules hashes make the evidence snapshot reproducible. Module and test hashes are abbreviated to 12 hex digits.

| Card | Module hash | Test hash |
|---|---|---|
| ST15-16 | `979b35d648e4` | `5b5f825e4815` |
| ST15-15 | `4a0733f5b286` | `-` |
| ST15-14 | `5a3227c622be` | `-` |
| ST15-13 | `cedaccddb7bd` | `ff1182014719` |
| ST15-12 | `a83ff6637ac0` | `-` |
| ST15-11 | `c64d029c992d` | `-` |
| ST15-10 | `894679712026` | `-` |
| ST15-09 | `70ded2fc3f2d` | `-` |
| ST15-08 | `92ec7a1f90df` | `b51cb15edbc6` |
| ST15-07 | `53ee8a9a83d1` | `-` |
| ST15-06 | `0e75fb72c8a9` | `-` |
| ST15-05 | `2f9ddef982bf` | `-` |
| ST15-04 | `b8a199d0d46f` | `-` |
| ST15-03 | `78b9b86beec3` | `-` |
| ST15-02 | `a4b73aa65a92` | `-` |
| ST15-01 | `090e73f8539e` | `-` |

Evidence source hashes: catalog `668a4aec030f`, KB manifest `d62a5ced6eaf`, comprehensive rules `cc7168408536`, set index `916cc1f9a1d`, and shared effects artifact `af2b3293c72c`.
