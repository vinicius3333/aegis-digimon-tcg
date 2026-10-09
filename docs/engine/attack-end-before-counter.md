# Attack end before Counter Timing

EX10-003 Tumblemon's Q5008 ruling says that ending an attack during the attack
declaration skips Counter and Block Timing and the attack does not succeed.
Previously, `CombatController.resolveAttack` called `runCounterWindow` before
consulting `endRequested`. The old EX10-003 test covered Block Timing and the
missing security check, but its field had no eligible `[Counter]` card.

The public regression adds EX12-033 to the defending battle area. Its real
Counter eligibility is independently exercised by
`src/engine/conformance/ch11-attacking.test.ts`. With the old controller order,
the EX10-003 test failed: `counterWindowOpened` was emitted after Tumblemon's
inherited effect ended the attack. No injected timing API or direct combat verb
was needed.

`resolveAttack` now tests `endRequested` after the attack declaration and
opponent attack watchers have resolved, before opening the Counter window. It
fires End of Attack at that point. The existing later check still handles an
attack ended during Counter resolution.

Verification, with `NODE_OPTIONS='--max-old-space-size=2048'` and one Vitest
worker:

```text
pnpm exec vitest run src/cards/EX10/EX10-003.test.ts src/engine/conformance/ch11-attacking.test.ts --maxWorkers=1 --no-file-parallelism --silent
Test Files 2 passed (2); Tests 32 passed (32)
```
