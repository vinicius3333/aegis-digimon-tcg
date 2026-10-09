# Security Attack lifecycle audit

## Status

Bounded Security Attack audit at baseline `fbb65d4c2`. Two real public
providers are proven: a positive amount-bearing grant and a signed negative
grant with natural turn expiry. This is not full keyword certification;
inherited and complete consumer/provider coverage remain open.

## Contract and sources

The focused sources are the reviewed comprehensive Security Attack rules and
the committed catalog/direct IR for BT26-017 Zanbamon and BT19-035. BT26-017
grants one Shambala Digimon Security Attack +1 for the turn on public play or
digivolution. BT19-035 is a distinct once-per-turn Xros Heart play trigger
that grants an opponent's Digimon Security Attack -1; its trigger fixture is
not substituted with a fabricated target.

## Public proof

`apps/api/src/engine/conformance/keyword-security-attack-lifecycle.test.ts`
publicly plays BT26-017 with sufficient memory, observes the eligible ally's
grant, attacks through the public battle path, and asserts exactly two
`securityChecked` events with one security card remaining. The same file
publicly plays the real Xros Heart BT10-008 while BT19-035 is on the field,
asserts the opponent's 12,000-DP Titamon becomes 9,000 DP and receives
Security Attack -1, then follows natural opponent turns. During the grant the
attack produces zero checks and preserves all three named security cards; on
the later turn after the printed end-of-opponent-turn expiry it produces one
check and leaves two cards. No trigger or outcome is injected.

Focused result: `pnpm --filter @aegis/api exec vitest run
src/engine/conformance/keyword-security-attack-lifecycle.test.ts` — 1 file,
2 tests passing. Full Security Attack and 46-keyword certification remain
open.
