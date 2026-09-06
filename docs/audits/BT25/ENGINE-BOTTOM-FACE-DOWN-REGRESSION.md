# First face-down card from the bottom

Committed EX9-031 Q4785 explicitly says that a face-up absolute bottom card is skipped when paying a bottom face-down digivolution-card cost. BT25-027 uses the same first-face-down ordering under a Tamer.

Before the correction, both named cost primitives required `stack[0].faceUp === false`. Astra reproduced three normal failures in 21 tests: BT25-027 leave prevention, the public Tamer-cost attack, and BT26-048's named Digimon cost. The generic EX9-031 cost and negative controller/host/face-state controls passed. Red log: `/tmp/bt25-audit-logs/bottom-face-down-red.log`.

The correction finds the first face-down card in the bottom-first stack for both availability and payment. It also applies this same candidate rule to Option-use preflight when paying the cost can put the requested Option into trash. It preserves controller/kind/count filtering, exact selected-instance payment and normal zone movement.

`engine/effects/bottomFaceDownCost.test.ts` has six public regressions: both named cost kinds; EX9-031's generic comparator; all-face-up refusal; wrong controller/kind exclusion; and BT26-070 using an Option that was initially above a face-up Tamer bottom. Exact remaining stack, paid card IDs, memory and recovery/Option placement are asserted. Combat tests explicitly complete the attack; the BloomLordmon fixture answers its Alliance prompt after the effect plays an ally.

`pnpm --filter @aegis/api exec vitest run src/engine/effects/bottomFaceDownCost.test.ts src/cards/BT25/BT25-027.test.ts --maxWorkers=1 --no-file-parallelism`: **22 passed** (`/tmp/bt25-audit-logs/bottom-face-down-green.log`). Broader affected tests and integration gates are recorded in VALIDATION.md. Collection remains incomplete.

The affected nine-suite run passes **274 tests** (`/tmp/bt25-audit-logs/bottom-face-down-mechanisms.log`). Two older tests (BT26-048 and BT25-096) encoded the contrary absolute-bottom interpretation; their expectations now follow Q4785 and assert the paid card and retained face-up card. Full integration passes **940 tests / 110 files**, typecheck, set-scoped catalog check, and applicable formatting/lint (queued-card warnings remain). Independent Luna review found no selection/order/payment/preflight regression.

This commit does not fix the separately discovered count-two/single-Tamer payment limitation affecting BT25-035; that limitation remains open for the next serialized change.
