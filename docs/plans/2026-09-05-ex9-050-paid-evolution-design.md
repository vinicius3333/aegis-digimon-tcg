# EX9-050 paid evolution

## Contract and diagnosis

The committed Numemon text permits evolution into a Ver.1 Digimon from hand or trash after placing three Ver.1 Digimon from trash face down as bottom sources. It does not waive evolution costs. Q4805 rejects partial placement payments; comprehensive rules 2-3-5 and 8-1 define evolution costs.

With the full card registry loaded, real turn-end tests reproduced free evolution into EX9-053 from either zone. Memory remained at -3 after passing instead of paying Mamemon's cost 3 and reaching -6. The omitted `payCost` flag selected the interpreter's free-evolution behavior.

## Decision

Add `payCost: true` to Numemon's existing Digivolve action, matching EX9-049 and EX9-028. Keep IR registration and shared engine behavior unchanged. Changing the interpreter default risks genuinely free evolutions; a card-specific engine exception is unnecessary.

## Proof

Tests cover real turn-end hand/trash evolution, payment, face-down placement beneath an existing source, evolution draw and Mamemon's nonmatching reveal, off-color DM legality and rejection, optional refusal, mixed two-Ver.1-plus-Ver.3 payment failure, non-Ver.1 evolution rejection, and live inherited Blocker.

The repeated-use test evolves Numemon into Mamemon, attacks an actual BT8-104 Security card, and restores the same physical Numemon through public De-Digivolve targeting. A separate decoy takes Security's deletion. Three eligible payment cards and Mamemon remain available in trash, but a second end-turn timing opens no decision and processes no payment or evolution. Only the timing repetition uses a test seam; restoration uses real attack and Security resolution.

Effects synchronization and final collection gates remain pending for the EX9 collection.
