# DUAL cards in mixed play/use effects

## Contract

`data/kb/rules/manual.md:855–857` states that DUAL cards cannot be played, including by effects. A printed play-or-use effect may select an eligible DUAL as an Option. It must meet Option color requirements and any paid use-cost requirement; the card must follow the Option lifecycle rather than permanent entry.

## Correction

`apps/api/src/engine/effects/interpreter/actions/play.ts` previously treated a DUAL as both a playable permanent and a usable Option. It could offer an illegal play choice after the effect cost had already been paid; the lower-level play verb then rejected the card. The resolver now excludes Option definitions from permanent affordability, enforces color requirements for DUAL candidates, and directly uses the selected DUAL Option. The existing `chooseDualMode` IR field remains for compatibility with normalized mixed selections; its comment documents that it does not authorize permanent play.

## Evidence

- BT25-041 colocated multicolor DUAL regressions assert absence of the illegal play prompt and retain cost, target, and final-zone assertions.
- `apps/api/src/bot/training/payments.test.ts`: 18 scenarios cover repeated Tamer-card payments, sequential and batched choices, free evolution choices, both Murasamemon payment routes, Tamer play, DUAL use, and refusal through the asynchronous policy. Before the fix, both DUAL-use scenarios failed on the unexpected illegal mode prompt; afterward all 18 passed.
- The mixed picker color/affordability matrix in `optionColorScope.test.ts` rejects unusable DUAL cards for both free and paid resolution, including when a hypothetical permanent-play affordability check would succeed.
- Desktop checkout `/home/vinicius/aegis-bot-lab/checkouts/bt26-training-v12-dual-final`: Node 26, 1767 tests across 142 files passed; API typecheck passed. Command: `pnpm --filter @aegis/api exec vitest run src/bot/training src/cards/BT25 src/cards/ST23 src/engine/effects/interpreter/actions src/engine/effects/primitives.test.ts --maxWorkers=1 --no-file-parallelism`.

## Remaining validation

This regression does not prove every scoped card action. Existing checkpoints are tied to their archived engine fingerprint and must not be relabeled as compatible with this change. A fresh training and evaluation run remains required after the final source is verified.
