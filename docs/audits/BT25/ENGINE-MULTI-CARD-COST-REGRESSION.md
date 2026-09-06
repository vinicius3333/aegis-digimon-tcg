# Multiple bottom face-down cards from one host

BT25-035 Q6300 requires the complete two-card payment; Q6301 permits choosing cards across Tamers. The printed cost does not require distinct Tamers. The initial interpreter counted eligible hosts and removed at most one card per host. The corrected public On Play/When Digivolving matrix reproduced two failures for one Tamer holding both cards, with the two-Tamer controls green: 10 passed, 2 failed in `/tmp/bt25-audit-logs/two-card-one-tamer-red.log`. The earlier invalid level-4 free-evolution candidate was replaced with the legal yellow level-5 BT25-041 before recording that diagnosis.

The shared candidate helper counts face-down cards, preserving bottom-first order and skipping face-up cards. Payment selects the entire count before moving any cards. Each choice exposes only the next unpaid face-down card of each eligible host, so selecting a second card from the same Tamer is possible without skipping its lower card. The same helper serves both named Tamer and Digimon costs. Option-use preflight now recognizes an Option among the first N payable face-down cards, including the second card under one Tamer.

`multiCardFaceDownCost.test.ts` exercises BT26-070 through its public Main effect. With two eligible Tamers, it inspects both decision pools, chooses the first and then second face-down cards under one Tamer, and proves the paid Option is subsequently used from trash. It asserts exact remaining stacks, paid instance IDs, resolved decisions, and memory 2 → 1. The one-card negative includes a valid Option already in trash to isolate payment unavailability and proves no mutation. BT25-035 supplies the four public timing/host-distribution combinations, exact two-instance payment, refusal, and insufficient-count cases.

Validation:

- New payment regressions plus Dianamon inherited OTP review: **17 passed**, `/tmp/bt25-audit-logs/two-card-choice-and-028.log`.
- `pnpm --filter @aegis/api exec vitest run src/engine/effects/multiCardFaceDownCost.test.ts src/engine/effects/bottomFaceDownCost.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/handTrashCost.test.ts src/engine/effects/permanentPlacementCost.test.ts src/engine/effectOptionUseCost.test.ts src/cards/BT26/BT26-070.test.ts src/cards/BT26/BT26-048.test.ts src/cards/EX9/EX9-031.test.ts src/cards/BT25/BT25-027.test.ts src/cards/BT25/BT25-035.test.ts --maxWorkers=1 --no-file-parallelism`: **294 passed / 11 files**, `/tmp/bt25-audit-logs/two-card-cost-mechanisms.log`.
- Shared build and API TypeScript check pass; the latter is `/tmp/bt25-audit-logs/current-api-typecheck.log`.
- Luna independently reviewed the final candidate ordering, complete payment, and Option preflight without an outstanding finding. Astra corrected the unsupported ArraySchema `flatMap` by converting the battle area with `Array.from` before iteration.

This closes the count-two limitation recorded at the previous checkpoint. Full collection and delivery gates remain separately tracked in VALIDATION.md; the collection is incomplete.
