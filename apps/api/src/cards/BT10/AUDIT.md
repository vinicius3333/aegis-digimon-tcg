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
