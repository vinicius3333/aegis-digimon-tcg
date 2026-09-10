# BT26 re-audit review notes

## Coordinator contracts

- Card modules must register executable behavior exclusively with registerIrCard(cardId, compiled).
- Every @ts-nocheck in apps/api/src/cards/BT26 must be removed with real type corrections; no replacement suppressions.
- Card lanes may edit only assigned card modules, colocated tests, and reports.
- Workers run only focused tests with maxWorkers=1 and no file parallelism. Collection suites and typecheck are coordinator-owned and sequential.
- Engine gaps are retained reds with a named seam and are handled by one serialized engine lane.

## Engine seam queue

None identified yet.

## Catalog decisions

None yet.

