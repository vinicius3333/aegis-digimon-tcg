# Engage lifecycle audit

## Status

Focused acceptance and refusal coverage is green. This is a bounded lifecycle
audit of current printed providers, not a full card-set certification.

## Source contract

`comprehensive-0321` (§16-44) defines Engage as an End of Your Turn trigger
that allows the Digimon to attack and makes that processing optional. Its
reviewed chunk fingerprint is
`99aee84d9f3173f72f5b31fef5c7c24e42fa945d870591b967ce5dfcb24ea439`.

## Implementation trace

Compiled providers expose Engage as a keyword marker plus an End of Your Turn
optional self-attack. The new refusal proof reaches that decision through the
natural turn loop and answers it through public `respondDecision`.

Focused proof covers both sides of the public Engage consent decision:

- Existing BT26-016 proof accepts the optional End of Your Turn attack and
  checks security through the real attack path.
- `keyword-engage-consent.test.ts` observes and declines that same natural trigger and
  verifies the exact BT26-016 instance remains alive and unsuspended while the
  opponent's exact security stack remains unchanged.

The normative source is `comprehensive-0321`, section 16-44, SHA-256
`99aee84d9f3173f72f5b31fef5c7c24e42fa945d870591b967ce5dfcb24ea439`.

## Obligation ledger

| Obligation                   | Evidence                                                                                          | Status                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| End of Your Turn timing      | BT26-016 acceptance test uses `runOneTurn` and public `endPhase`                                  | verified, bounded                                           |
| Optional processing          | New test observes an optional decision and submits public refusal                                 | verified                                                    |
| Attack is the Engage payload | Acceptance resolves security; refusal leaves attacker and security unchanged                      | verified, bounded                                           |
| Printed providers            | BT26-016, BT26-033, EX12-019, EX12-060, EX13-013 are present in the current card modules          | inventory complete; provider-specific proof remains bounded |
| Inherited/copy applicability | Generic copied-keyword machinery exists, but no Engage-specific inherited consumer is proved here | queued for separate provider proof                          |

Current printed providers are BT26-016, BT26-033, EX12-019, EX12-060, and
EX13-013. BT26-016 is the public lifecycle provider used here; the remaining
providers require their own provider-specific public anchors before broader
coverage is claimed.

## Gates and limits

Focused command: `pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-016.test.ts src/engine/conformance/keyword-engage-consent.test.ts` (16 tests passed). Oxfmt, focused Oxlint, and scoped `git diff --check` passed. Full API and collection gates were not run in this lane.
