# Effect digivolution live gates

On September 26, 2026, read-only Oracle VPS JSONL inspection identified match `45f3658e-7c5e-4267-8deb-d0a9f692707b`. At 13:40:54 UTC, LM-027 Red Scramble evolved BT23-013 Jesmon onto EX13-009 Huckmon. The opponent controlled AD1-010 Garurumon (5000 DP) and EX1-066 Analog Youth (Tamer). The server accepted the selection and emitted `digivolved` with mechanic `normal` because effect-driven evolution uses its own primitive; that event label did not establish ordinary EvoCost legality.

The direct digivolve intent already checked `opponentDigimonDpMin`, while the effect-driven candidate filter and execution primitive used the alternate requirement's name/cost without its live gate. The fix reuses the direct intent's gate for candidate selection, route choice, and final execution. The LM-027 public test reproduced the exact wrong top card before the fix; the 10000-DP control remains legal. The card IR and printed requirement did not change.

The source file is `/opt/aegis-rollout/logs/api-2026-09-26-d1e56243-4fd2-4fc3-958a-4054978d7021.jsonl`. The reproduction uses the same Huckmon, Garurumon, and Analog Youth card identities. Restoring the three implementation files to HEAD makes the public Red Scramble regression fail with actual top card BT23-013 instead of EX13-009; restoring the correction makes it pass.

Primitive regressions cover paid, free, reduced-cost, fixed-cost, and explicitly selected alternate routes with level ignored, using hand and trash sources and absent/9999/10000-DP opponent boundaries. Separate paid/free controls preserve an explicit requirements waiver. All callers of the shared effect-digivolution primitive receive the check, including card effects beyond LM-027.

Validation: `pnpm --filter @aegis/api exec vitest run src/engine/effects src/engine/actions src/engine/conformance/ch08-digivolution.test.ts src/cards/LM src/cards/BT23/BT23-013.test.ts src/cards/audit-docs.test.ts --maxWorkers=1 --no-file-parallelism` passed 181 files / 2446 tests. Read-only code review found no material correctness issues in this scope.

The full workspace typecheck, scoped Oxlint/Oxfmt, and `git diff --check` also passed.
