# Borrowed-effect conformance coverage

The fresh EX8 gate exposed a contradictory KB coverage declaration at base `805400f2c45d9bb40983dde9691be06b605bec30`: `ch15-01-effect-basics.test.ts` marked `comprehensive-0206` (effects activating other effects) unsupported, while `activation-cost-and-borrowed-gates.test.ts` already cites that exact chunk and drives public borrowed-effect activation with and without the lender's timing restriction. The meta test correctly rejects a chunk recorded as both cited and not testable.

The serialized engine lane removed only the obsolete `markNotTestable` block. No runtime behavior, rule text, fingerprint, citation or behavioral assertion was weakened. The existing two-case public-intent borrowed-effect regression is the reproducible evidence replacing the stale classification. Other exclusions remain unchanged.

The candidate gate reproduced the contradiction with 3,177 other tests passing. Final combined gate passed 272 files and 3,183 tests, including the conformance meta and both public borrowed-effect restriction cases. The classification contradiction is closed; delivery is recorded in the EX8 ledger.
