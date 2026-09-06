# AD1 baseline re-audit evidence

Base: `1fd29ef3642054d686bc406b778cad248514bafb`.
Plan commit: `d8feb31dd`. Branch: `audit-ad1-20260905`.

Command: `pnpm --filter @aegis/api exec vitest run src/cards/AD1 --maxWorkers=1`

Result on 2026-09-05: 26 test files, 23 passed and 3 failed; 161 tests,
158 passed and 3 failed; duration 28.01 seconds. The extra file is
`collection.audit.test.ts`. Runtime: Vitest 5.0.0.

Failures before worker edits:

- AD1-011: `digivolves into Imperialdramon while attacking with the cost reduced by 2`:
  memory expected 3, received 5 (`AD1-011.test.ts:76`).
- AD1-021: `draws and may digivolve for 3 less only when this Tamer suspends`:
  exceeded 15000 ms timeout (`AD1-021.test.ts:35`).
- AD1-024: `self-triggers after effect-driven evolution and returns the suspended Digimon (Q6115)`:
  opposing battle area expected length 0, received 1 (`AD1-024.test.ts:79`).

The original ledger's blanket 10/10 claims are not reproduced. These failures
need diagnosis: a failing assertion alone does not distinguish implementation,
fixture, or shared mechanism defects. All 25 cards still require clause review.

Initial registration inspection finds every AD1 card module uses registerIrCard;
no handwritten registration migration is immediately indicated. This is only an
architecture check, not behavior proof.

The web CardEffectsDemo builds static GameState fixtures and synthetic events;
its existing AD1 mentions are cards inside other demonstrations, not executable
AD1 evolution scenarios. It cannot substitute for engine stack assertions.
Workers must use real GameEngine intents with observable state and legal stacks.

Additional baseline gates:

- `pnpm typecheck`: passed for shared, API, and web.
- `pnpm --filter @aegis/api exec vitest run src/engine/conformance --maxWorkers=1`:
  28 files and 387 tests passed in 12.33 seconds.

Diagnosis lead (not yet a resolved finding): effect-driven evolution can now ask
`chooseOption` when both printed and alternate requirements match. Some old
fixtures only auto-answer optional/card selections, leaving that decision open.
Workers must prove the exact route and payment before accepting any fixture fix.
