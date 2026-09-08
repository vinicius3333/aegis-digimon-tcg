# Blast DNA test registry isolation

## Observed failure

The BT24 plus engine gate produced seven `counter window did not open`
failures in `blastDnaCounter.test.ts`. The suite passed13/13 in isolation.
The complete engine run reproduced the failures with Vitest's existing
`isolate:false` configuration; smaller subsets did not reliably preserve
the failing execution order.

Temporary diagnostics showed that BT20-045's catalog definition, executable
module and legal field/hand materials were present, but its Blast DNA keyword
lookup was false and `counterEligibleSources(0)` was empty. The diagnostics
were removed after identifying the difference.

## Cause and scoped correction

`capabilities.test.ts` used the real BT20-045 ID for a synthetic Main-only
`isDnaDigivolving` fixture. Its helper calls `irCardModule`, which updates
keyword-derived registration through `registerBlastDigivolveFromEffects`.
The synthetic record contains no Blast DNA marker, so it clears the real
card's keyword registration when that fixture runs first in the shared process.

Use unique `CAP-DNA-*` IDs for those synthetic fixtures. Import the real
BT20-045 module explicitly and assert that its Blast DNA registration remains
present before and after the synthetic fixture. No production engine behavior,
card catalog or compiled effect record changes are part of this correction.

## Reproducible verification

The lane restored the original real-ID fixture temporarily while keeping the
new registration-preservation regression: the expected true keyword lookup
failed with actual false. Restoring the synthetic IDs made the selected
condition/Blast tests pass. Do not substitute an obsolete structural assertion
for this observable registry-state failure.

Coordinator commands/results,2026-09-08:

- `pnpm --filter @aegis/api exec vitest run src/engine --maxWorkers=1 --no-file-parallelism`
  at10:23:47:246 files,7252 tests passed.
- `pnpm --filter @aegis/api exec vitest run src/engine/effects/capabilities.test.ts src/engine/blastDnaCounter.test.ts --maxWorkers=1 --no-file-parallelism`
  at10:26:13:2 files,309 tests passed.
- Scoped formatting and diff checks passed. Oxlint reported24 existing
  warnings in the large capabilities fixture file; the lane compared the
  pristine HEAD file and found the same warnings apart from shifted lines.
  No blanket suppression or unrelated cleanup was introduced.

The passing engine gate still emits the established AD1-002 unsupported-effect
diagnostic inside a passing legacy fixture. This document does not claim that
all unrelated synthetic fixture IDs have been audited for similar side effects.
