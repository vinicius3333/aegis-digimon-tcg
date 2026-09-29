# Digivolve-into card ownership

## Contract

An effect-driven `Digivolve` action may only use a card its controller owns. When the `into` filter prints no controller, the candidate pool for `hand`, `trash`, and other loose zones is limited to the effect controller's own cards. An explicit `controller` or `controllerDefault` on the filter is kept unchanged.

## Correction

`digivolveIntoTarget` in `apps/api/src/engine/effects/interpreter/actions/digivolve.ts` built the target from the raw `into` filter. `seatsForController` treats a missing controller as either seat, so the loose-card enumerator also searched the opponent's hand and trash. The target now receives `controllerDefault: "mine"` when the filter has no controller.

## Reproduction

A BT26 Chronomon mirror in bot training stalled at seed `5232555`. Seat 0's inherited BT26-001 Yokomon evolved its host into `BT26-016` from seat 1's hand. The card kept seat 1 as owner, so its ＜Engage＞ triggered at the end of seat 1's turn and made seat 0's Digimon attack during seat 1's turn. The harness then waited on a block window that no bot answered.

## Evidence

`apps/api/src/cards/BT26/BT26-001.test.ts` adds "never digivolves into a card from the opponent's hand". Before the correction, the opponent's `BT26-016` became the host's top card and its When Digivolving effect ran under seat 1. After the correction, no decision offers the opponent's card and the host keeps its top card.

## Remaining work

This covers `Digivolve` only. Other loose-zone actions that omit a controller keep their current behavior; each needs its own rule check before changing the default.
