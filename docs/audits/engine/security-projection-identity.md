# Security projection identity

## Source and obligation

Comprehensive Rules v4.3, §3-7-2 makes the security stack private and face-down; §3-7-4 makes a face-up security card public. The server may know each physical card, while either client's decoded view must omit the identity of a face-down security card. A mulligan must also prevent a previously seen hand card from being recognized later by its stable instance ID.

## Reproduction and cause

The seeded match projection regression in `apps/api/src/bot/matchHarness.projections.test.ts` (seed `20260922`, two balanced bots, turn limit 2) decoded `s0-35:BT1-020` and `s1-32:BT1-038` as face-down security with `cardId` present. In both cases the authoritative card was face-down and the owner's `StateView` had no `CARD_ID_VIEW_TAG` grant. The focused regression in `apps/api/src/engine/state/visibility.test.ts` reduced this to one deck-to-security move after a full client snapshot.

The deck card remained in Colyseus `StateView.invisible` when it moved to security. `StateView.add(card)` uses that stale marker to queue every field, including `@view`-tagged `cardId` and `artId`, even without an identity tag. Clearing that marker before the owner-private add keeps the card object visible while withholding its tagged identity.

The related mulligan path previously returned the _same_ hand CardInstance to the hidden deck. A client that had seen its `instanceId` could recognize that card if it later appeared face-down in security. Mulligan now replaces returned cards with new deterministic, opaque instance IDs before shuffling. The server retains card and art identity; a repeated seed reproduces the same IDs and draw order, and collision handling preserves uniqueness.

## Verification and limit

- `pnpm --filter @aegis/api exec vitest run src/engine/setup.test.ts src/engine/state/visibility.test.ts src/bot/matchHarness.projections.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism`: 50 passed.
- The setup regression checks card/art multiset preservation, no reuse of exposed IDs, seeded replay, and collision handling. The visibility regression decodes a real patch and verifies a face-down security card lacks `cardId`.
- This proves those setup and projection paths. It does not prove every card effect that returns a known card to a hidden zone or all future security placement paths. The existing 32-bit match seed and PRNG are designed for reproducibility, not cryptographic secrecy; the generated IDs hash PRNG material but do not strengthen the seed itself.
