# ST1 Collection Audit

Audit scope: committed ST1 catalog entries `ST1-01` through `ST1-16`, in
descending order to `ST1-01`. No other collection was modified.

## Evidence and verification status

- Catalog: `packages/shared/src/cards/data/cards.json`.
- Local KB query: `node tools/kb/query.mjs card <id>`.
- Compiled IR: `packages/shared/src/effects/effects.json`.
- Direct implementations: `apps/api/src/cards/ST1/`.
- Behavioral tests: colocated `apps/api/src/cards/ST1/*.test.ts`.
- Every ST1 IR entry reports `coverage: "full"` and `residual: []`.
- Runtime verification is **not verified**. The required shared build could
  not run because this checkout has no installed workspace `node_modules`;
  `corepack pnpm --filter @aegis/shared build` failed with `tsc: not found`.
  Therefore no card is awarded 10/10 and no test/typecheck approval is
  inferred from source inspection.

## Per-card ledger

| Card | Printed clauses checked | Direct module / test | KB / IR evidence | Result |
|---|---|---|---|---|
| ST1-16 Gaia Force | Main delete exactly 1 opposing Digimon; Security activates Main | `ST1-16.ts`, `ST1-16.test.ts` | Q609; IR Main `Delete count:1`, Security `ActivateMain` | Static match; runtime not verified |
| ST1-15 Giga Destroyer | Main deletes up to 2 opposing Digimon at DP ≤4000; Security activates Main | `ST1-15.ts`, `ST1-15.test.ts` | Q608; IR opponent/Digimon/`lte 4000`/upTo 2, Security `ActivateMain` | Static match; runtime not verified |
| ST1-14 Starlight Explosion | Main Security Digimon +7000 through opponent's next turn; Security +7000 for the turn | `ST1-14.ts`, `ST1-14.test.ts` | IR `untilOpponentTurnEnd` and `forTheTurn` | Static match; runtime not verified |
| ST1-13 Shadow Wing | Main one own Digimon +3000 for turn; Security all own Digimon Security Attack +1 through next own turn | `ST1-13.ts`, `ST1-13.test.ts` | Q607/Q974; IR target count 1, DP +3000, Security all and timed keyword | Static match; runtime not verified |
| ST1-12 Tai Kamiya | Your turn all own Digimon +1000; Security plays itself without cost | `ST1-12.ts`, `ST1-12.test.ts` | Q606/Q1494; IR own Digimon all, Security `PlayWithoutCost` | Static match; runtime not verified |
| ST1-11 WarGreymon | Your turn Security Attack +1 per complete pair of sources | `ST1-11.ts`, `ST1-11.test.ts` | Q605; IR scaling per 2 digivolution cards | Static match; runtime not verified |
| ST1-10 Phoenixmon | Vanilla level 6 red Digimon stats/evolution cost | No effect module required; `ST1-10.test.ts` | Catalog; IR empty/full with no residual | Static data match; runtime not verified |
| ST1-09 MetalGreymon | Inherited your-turn gain 3 memory when blocked | `ST1-09.ts`, `ST1-09.test.ts` | Q604; IR inherited `WhenBlocked`, +3 memory | Static match; runtime not verified |
| ST1-08 Garudamon | When Digivolving one own Digimon +3000 for turn | `ST1-08.ts`, `ST1-08.test.ts` | Q603; IR own Digimon count 1, +3000, turn duration | Static match; runtime not verified |
| ST1-07 Greymon | Inherited Security Attack +1 | `ST1-07.ts`, `ST1-07.test.ts` | IR inherited static keyword amount 1 | Static match; runtime not verified |
| ST1-06 Coredramon | Blocker; When Attacking lose 2 memory | `ST1-06.ts`, `ST1-06.test.ts` | Q602; IR static Blocker and WhenAttacking -2 | Static match; runtime not verified |
| ST1-05 Birdramon | Vanilla level 4 red Digimon stats/evolution cost | No effect module required; `ST1-05.test.ts` | Catalog; IR empty/full with no residual | Static data match; runtime not verified |
| ST1-04 Dracomon | Vanilla level 3 red Digimon stats/evolution cost | No effect module required; `ST1-04.test.ts` | Catalog; IR empty/full with no residual | Static data match; runtime not verified |
| ST1-03 Agumon | Inherited your-turn +1000 DP | `ST1-03.ts`, `ST1-03.test.ts` | IR inherited YourTurn +1000 | Static match; runtime not verified |
| ST1-02 Biyomon | Vanilla level 3 red Digimon stats/evolution cost | No effect module required; `ST1-02.test.ts` | Catalog; IR empty/full with no residual | Static data match; runtime not verified |
| ST1-01 Koromon | Inherited your-turn +1000 DP with at least 4 sources, including itself | `ST1-01.ts`, `ST1-01.test.ts` | Q601; IR inherited threshold 4 | Static match; runtime not verified |

## Inventory and hashes

The committed catalog and compiled IR were read-only during this audit. The
ST1 implementation inventory is the 12 direct modules and 16 colocated tests
listed above; `ST1/index.ts` imports all 12 modules. Vanilla cards have no
effect module to register. File hashes should be regenerated with
`git hash-object` at delivery time if any files change.

## Blockers

1. `pnpm` is not available as a direct command in the requested PATH.
2. Corepack can resolve pnpm 10.30.1, but the checkout lacks workspace
   dependencies, so the shared compile fails before Vitest can start.
3. Consequently focused Vitest, serial low-memory suite, API package runtime,
   and typecheck are all **not verified**.

No implementation correction was justified by the available evidence, and no
other collection was edited.
