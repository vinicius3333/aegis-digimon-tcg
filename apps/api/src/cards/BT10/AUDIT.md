# BT10 Card Audit Ledger

## BT10-001 — DemiMeramon — 10/10

- Catalog contract: `[Your Turn]` inherited effect; while this Digimon has a non-red digivolution card, it gains +1000 DP. The catalog identifies it as a red, level 2 Flame DigiEgg with no evolution requirement.
- Rules evidence: knowledge-base ruling Q1929 (2024-03-28) says a red two-color digivolution card is not a non-red card.
- Implementation trace: `BT10-001.ts` registers only `registerIrCard("BT10-001", compiled)`; its inherited `YourTurn` Aura targets only the host and uses `selfDigivolutionStackHasNonColor({ colors: ["Red"] })` to drive `modifyDP(+1000)`.
- Behavioral proof: `BT10-001.test.ts` proves the +1000 bonus with a blue card in the host stack and proves the Q1929 red-multicolor negative boundary. Focused command: `pnpm --filter @aegis/api exec vitest run src/cards/BT10/BT10-001.test.ts`.
- Peer/stack evidence: both cases use an actual inherited evolution stack, including a same-set red host and an under-card that is respectively non-red or red/multicolor, so the condition is evaluated from the host stack rather than an isolated card.

## BT10-002 — Bebydomon — 10/10

- Catalog contract: `[When Attacking][Once Per Turn]` inherited effect; if the opponent has two or more Digimon in play, draw one. The catalog identifies it as a blue, level 2 Baby Dragon DigiEgg; the knowledge base has no card-specific entry.
- Implementation trace: `BT10-002.ts` exclusively calls `registerIrCard`; the inherited `WhenAttacking` effect has `OncePerTurn` frequency and draws exactly one for the controller only when `opponentHas` at least two Digimon in the opponent battle area.
- Behavioral proof: `BT10-002.test.ts` observes one draw across two attack-trigger firings, no draw for an opponent attack, and no draw below the two-Digimon threshold. Focused command: `pnpm --filter @aegis/api exec vitest run src/cards/BT10/BT10-002.test.ts`.
- Peer/stack evidence: every applicable case gives the attacking Digimon a real Bebydomon source; the opposing battle area varies between one and two Digimon, proving ownership and the exact cardinality boundary from the inherited stack.

## BT10-003 — Pickmons — 10/10

- Catalog contract: `[When Attacking]` inherited effect; if this Digimon has the `[Xros Heart]` trait, draw one. The catalog identifies a yellow, level 2 Minor/Xros Heart DigiEgg; the knowledge base has no card-specific entry.
- Implementation trace: `BT10-003.ts` exclusively registers compiled IR. Its inherited `WhenAttacking` action uses `selfHasTrait` with an exact `Xros Heart` trait token and draws one only for the source controller.
- Behavioral proof: `BT10-003.test.ts` proves a draw for an Xros Heart host, no draw for a host without that trait, and no controller leak when the opponent attacks. Focused command: `pnpm --filter @aegis/api exec vitest run src/cards/BT10/BT10-003.test.ts`.
- Peer/stack evidence: the positive host is BT10-009 (Xros Heart), while BT10-020 is a same-set nonmatching comparator; both carry Pickmons as an actual inherited source, proving trait matching on the evolving host rather than the source card.

## BT10-004 — Bosamon — 10/10

- Catalog and rules contract: errata dated 2022-10-28 adds `[Once Per Turn]`; `[Your Turn]` inherited effect grants the host +1000 DP for the turn whenever an effect suspends a Digimon. Q1930 confirms that suspending one of the controller's own Digimon qualifies.
- Implementation trace: `BT10-004.ts` exclusively registers compiled IR. Its inherited `YourTurn` `SubTrigger(whenEffectSuspends)` accepts a Digimon source, targets only the host with `ModifyDP(+1000, forTheTurn)`, and has `OncePerTurn` frequency.
- Behavioral proof: `BT10-004.test.ts` proves the errata frequency across own and opponent Digimon, independent arming of two inherited copies without duplicate watchers after recompute, and the opponent-turn negative case. Focused command: `pnpm --filter @aegis/api exec vitest run src/cards/BT10/BT10-004.test.ts`.
- Stack/ownership evidence: the first case proves Q1930 from an actual Bosamon host stack; the dual-stack case confirms that controller-owned inherited sources each observe effect-driven suspension once, without recompute multiplying either trigger.

## BT10-005 — Monimon — 10/10

- Catalog contract: `[All Turns]` inherited effect grants +1000 DP while the host has the `[Twilight]` trait. The catalog identifies a black, level 2 CRT/Twilight/Xros Heart DigiEgg; the knowledge base has no card-specific entry.
- Implementation trace: `BT10-005.ts` exclusively calls `registerIrCard`; its inherited All Turns Aura targets only the host, applies `modifyDP(+1000)`, and continuously gates on the host having the exact Twilight trait.
- Behavioral proof: `BT10-005.test.ts` proves the positive Twilight host and removes the bonus after an observable De-Digivolve exposes a non-Twilight top card while retaining Monimon in the stack. Focused command: `pnpm --filter @aegis/api exec vitest run src/cards/BT10/BT10-005.test.ts`.
- Peer/stack evidence: the De-Digivolve scenario uses a layered, real evolution stack and a nonmatching BT10-020 comparator, proving live host-trait recomputation rather than a one-time source-card trait check.

## BT10-006 — Tokomon — 10/10

- Catalog and rules contract: `[Opponent's Turn]` inherited effect draws one when this exact digivolution card is trashed by an effect. Q1931 confirms it also triggers when the controller's own effect performs that trashing during the opponent's turn.
- Implementation trace: `BT10-006.ts` is a compiled-IR hand-written override that exclusively uses `registerIrCard`. It gates on `OpponentsTurn`, watches the batch digivolution-card discard event, binds the event to its own inherited source with `isSelfRef`, and draws one for the source controller.
- Behavioral proof: `BT10-006.test.ts` covers positive opponent-turn trashing, own-turn rejection, the Q1931 controller-effect case, and a batch trash containing Tokomon plus a non-Tokomon source. Focused command: `pnpm --filter @aegis/api exec vitest run src/cards/BT10/BT10-006.test.ts`.
- Stack/ownership evidence: each case places Tokomon under a real host, with the batch comparator proving source-instance identity and the Q1931 case separating current-turn ownership from the controller of the trashing effect.

## BT10-007 — Dondokomon — 10/10

- Catalog contract: red level 3 Musical Instrument/Xros Heart Digimon with standard red level-2 evolution and alternate `Digivolve: 0 from Lv.2 w/[Xros Heart] in traits`; the knowledge base has no card-specific entry.
- Implementation trace: `BT10-007.ts` exclusively calls `registerIrCard`; the compiled alternate requirement requires level 2, the Xros Heart trait, cost 0, and marks it `isAlternate`, while base catalog evolution remains separate.
- Behavioral proof: `BT10-007.test.ts` evolves at zero memory from an off-color Xros Heart level 2 and rejects an off-color, same-level non-Xros Heart comparator. Focused command: `pnpm --filter @aegis/api exec vitest run src/cards/BT10/BT10-007.test.ts`.
- Stack/trait evidence: BT10-003 is a valid blue Xros Heart level-2 base and BT1-003 is the same-color/level near-miss, proving the alternate route relies on the full trait requirement rather than color or level alone.

## BT10-008 — Shoutmon — 10/10

- Catalog and rules contract: alternate level-2 Xros Heart evolution; on play reveals three, adds one Xros Heart Digimon and one Xros Heart Tamer, then bottoms the rest; on deletion may Save; inherited Your Turn grants Rush while the host name contains Shoutmon. Q1932 requires the trait on each selected kind, Q1933 allows only one eligible kind, and Q1934 requires every possible eligible addition.
- Implementation trace: `BT10-008.ts` exclusively registers compiled IR: a typed two-slot RevealAdd with deck-bottom remainder, optional self PlaceUnder Save, host-name-gated inherited Rush Aura, and the alternate evolution requirement.
- Behavioral proof: `BT10-008.test.ts` exercises the full mandatory two-kind selection sequence and decline rejection (Q1934), single-kind and trait-filter boundaries (Q1932/Q1933), accepted and declined Save zones, plus the inherited name boundary. Focused command: `pnpm --filter @aegis/api exec vitest run src/cards/BT10/BT10-008.test.ts`.
- Stack/ownership evidence: selection observations assert visible/candidate cards and source card ID; deletion tests follow the exact source instance into a controller's Tamer or trash; dual hosts prove inherited Rush binds to the evolving host name rather than Shoutmon's source identity.

## BT10-009 — Shoutmon X4 — 10/10

- Catalog and rules contract: DigiXros -2 with the listed four-name material vocabulary; Material Save 2; on play Draw 2; optional end-of-attack sequence puts all sources under a controller Tamer, unsuspends a controller Tamer, then deletes itself. Q1935 permits declining, Q1936 forbids activation with no sources, and Q1937 permits distinct destination and unsuspended Tamers; catalog restriction is one copy.
- Implementation trace: `BT10-009.ts` exclusively calls `registerIrCard` and declares typed DigiXros requirements, MaterialSave(2), exact on-play draw, plus an optional end-of-attack all-source place cost that aborts deletion on decline and independently targets an owned Tamer for unsuspension.
- Behavioral proof: `BT10-009.test.ts` proves the reduced Taiki DigiXros cost and source transfer, Draw 2, accepted/declined/no-source end-of-attack boundaries (Q1935/Q1936), distinct Tamer selection (Q1937), and Material Save 2 after external deletion. Focused command: `pnpm --filter @aegis/api exec vitest run src/cards/BT10/BT10-009.test.ts`.
- Stack/ownership evidence: tests use material cards from under Taiki and from the X4 evolution stack, assert exact instance zones, controller-owned Tamer targeting, and leave an ineligible third source in trash after Material Save 2.
