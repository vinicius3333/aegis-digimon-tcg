# Blocker lifecycle audit

## Status

Bounded Blocker audit at baseline `5752256f6`. Public proof covers one
temporary provider, one printed provider, one inherited provider, real block
windows, host evolution, and duration cleanup. This is not a complete Blocker
certification: the catalog contains hundreds of printed mentions and the
complete security, grant, source-departure, and consumer denominator remains
open.

## Contract and sources

The reviewed comprehensive rules are `comprehensive-0223`, §16-5 (Blocker), SHA-256 `f21e9a4a1278163e9b07ebe6f0776b3b15a6d1f9884771e498431baeb23e5a7d`,
and `comprehensive-0151`, §12-1 (block declaration and legality), SHA-256 `1c4e669751a989f9da2bdc3b1b198b4c2c4a03210f54b17ac1f6ba87faa9a566`. A Blocker
permits its controller to declare a block during the opponent's attack; the
blocker must be in the battle area and able to suspend, and the attack target
changes to that Digimon. BT19-064's card contract was read from the committed
catalog and direct IR: On Play and When Digivolving grant Blocker until the
end of the opponent's turn. AD1-005 supplies a printed persistent Blocker
comparison.

## Obligation ledger

| Obligation                                             | Evidence                                                                                                                               | Status                                   |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Resolve the printed Blocker marker                     | AD1-005 publishes Blocker; a plain BT1-009 control does not                                                                            | Verified bounded                         |
| Grant Blocker through a real public play               | BT19-064 is played with public `playCard`; `hasKeyword` observes the temporary grant                                                   | Verified one provider                    |
| Open and answer a real block window                    | Player 1's attack opens the public window; player 0 answers with `declareBlock`; combat resolves against BT19-064                      | Verified one provider                    |
| Enforce controller and suspension legality             | Existing §12 conformance covers opponent controller and suspended blocker refusal; this lane retains AD1-005 as the printed comparison | Verified bounded                         |
| Expire the temporary grant                             | Natural `startTurnLoop` reaches player 1, then player 0's next Main; BT19-064 no longer has Blocker                                    | Verified BT19-064                        |
| Preserve static printed Blocker after a turn           | AD1-005 remains the persistent printed provider in the catalog/test inventory                                                          | Open in this lane                        |
| Inherited/copied/granted source departure and re-entry | EX5-051 inherited Blocker blocks publicly; a legal BT5-087 evolution removes it from the host                                          | Inherited bounded; copied/departure open |
| Security and alternate battle consumers                | No security-triggered or alternate block-window provider proof here                                                                    | Open                                     |

## Public proof

`apps/api/src/engine/conformance/keyword-blocker-lifecycle.test.ts` contains
four passing cases. The main case uses a real production turn loop, publicly
plays BT19-064, answers the opponent's attack with `declareBlock`, preserves
the blocker through a lower-DP battle, and verifies the temporary keyword is
gone after the opponent turn ends. Additional public attack cases show that a
plain Digimon has no block window, a suspended AD1-005 cannot block, and an
untapped AD1-005 is accepted and remains the battle target. Existing
`ch12-blocking` proof owns the broader block legality matrix.

Focused result: `pnpm --filter @aegis/api exec vitest run
src/engine/conformance/keyword-blocker-lifecycle.test.ts` — 1 file, 4 tests,
all passing. The inherited/source-change conformance file adds 2 passing
public cases for EX5-051 under EX5-053 and its BT5-087 evolution boundary.
Full Blocker certification and whole-catalog scoring remain open.
