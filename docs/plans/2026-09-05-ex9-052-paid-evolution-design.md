# EX9-052 paid evolution

## Contract and failure

Raremon's committed text permits evolution into a Ver.5 Digimon from hand or trash after placing exactly three Ver.5 Digimon from its controller's trash face down as bottom sources. It does not waive the evolution cost. Q4806 rejects partial placement payments; comprehensive rules 2-3-5 and 8-1 define evolution costs.

Real turn-end tests with the full card registry reproduced free evolution into EX9-043 from either zone. Memory stayed at -3 after passing. The selected printed Black level-4 requirement costs 4, so the correct final memory is -7. The alternative DM requirement costs 3, but these tests deliberately select the printed route.

## Decision

Set `payCost: true` on the existing Digivolve action, matching EX9-049 and EX9-050. Do not change the interpreter's default, which also serves legitimately free evolutions, or introduce a card-specific engine exception. The existing placement filter already has `controller: "mine"`; no controller fix is needed.

## Verification

Focused cases cover both target zones at real turn end, full payment, bottom placement below an existing source, face state, evolution draw, alternate DM legality, explicit refusal, an invalid evolution trait, and an atomic payment negative with two own Ver.5 cards, one wrong-trait card, and an opponent-owned Ver.5 card.

The inherited effect is tested through a real battle loss on a legal Black level-5 host, followed by De-Digivolve on the opposing attacker and exact final zones.

The Once Per Turn proof accepts the first evolution, declines MetalTyrannomon's separate placement cost, and attacks an actual BT8-104 Security card. Public target responses restore the same physical Raremon and delete a separate decoy. Three eligible payment cards and MetalTyrannomon remain in trash, but repeating the end-turn timing produces no choice, payment, or evolution. Only the repeated timing uses a test seam; restoration uses real attack and Security resolution.

Effects synchronization and collection-wide closeout remain pending for EX9.
