# `<Blast Digivolve>` lifecycle audit

Status: bounded public conformance proof; the complete keyword audit remains open.

## Normative source

The executable conformance citation is `comprehensive-0245`, §16-26-1..4. The reviewed chunk fingerprint is `a8f5302d1d7921d23a272be3d364452f991eb6a7657cbe6452cfcbecabe3347b`. It requires an optional Counter activation, a Digimon in the controller's battle area, a card with this keyword in hand, the printed digivolution requirement, and no payment of the normal digivolution cost.

## Provider and consumer inventory

| Real current form                                | Public consumer evidence                                                                     | Status                                                         |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| AD1-005 Gaiamon, ACE, red level-5 route          | `apps/api/src/cards/AD1/AD1-005.test.ts` and this audit's public Counter acceptance          | accepted; host stack and zero memory checked                   |
| ST15-12 WarGreymon, ACE, Greymon route           | `apps/api/src/cards/ST15/ST15-12.test.ts` and this audit's public Counter refusal/acceptance | accepted and declined paths checked                            |
| EX7-059 BeelStarmon, ACE, Three Musketeers route | `apps/api/src/cards/EX7/EX7-059.test.ts`                                                     | existing public acceptance, including level-5 and Tamer routes |
| BT19-064 Justimon, ACE, alternate route          | `apps/api/src/cards/BT19/BT19-064.test.ts`                                                   | existing public opponent Counter acceptance                    |

No inherited or copied Blast Digivolve provider is claimed here; the keyword is printed on the listed hand Counter cards and the engine's shared keyword consumer supplies the cost waiver. Overflow is tracked separately and is not used as a Blast Digivolve cost.

## Obligations and evidence

| Obligation                                                   | Evidence                                                                                            | Result                                                 |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Public Counter window and optional consent                   | `keyword-blast-digivolve-consent.test.ts`, `respondCounter` with no source/effect fields            | passed; ACE remains in hand when declined              |
| Legal printed host requirement                               | same test, real BT2-063 host for ST15-12                                                            | passed; host remains unchanged on refusal              |
| No normal memory payment                                     | same test, memory 0 before acceptance                                                               | passed; AD1-005 enters the real host stack at memory 0 |
| Physical source and host identity                            | captured ACE instance and both host top instances; exact stack asserted                             | passed                                                 |
| Attack and draw completion                                   | acceptance awaits attack end and empty pending decision; draw instance is checked                   | passed                                                 |
| Multiple eligible hosts and exact host choice                | second base selected with `blast-digivolve:<permanentId>` effect key; first remains unchanged       | passed                                                 |
| Refusal with multiple eligible hosts                         | both host-specific Counter entries exposed, then empty `respondCounter` pass                        | passed                                                 |
| Post-digivolution printed effects and full combat resolution | covered by individual provider tests (EX7/ST15/BT19), not re-certified as one cross-provider matrix | partial, provider-specific                             |

## Focused gate

`pnpm test src/engine/conformance/keyword-blast-digivolve-consent.test.ts --reporter=dot` — 2 tests passed.

The owner test is intentionally limited to the public Counter consent, refusal preservation, physical host/source identity, and zero-cost acceptance. A full API/type/build gate and Git delivery remain coordinator work.
