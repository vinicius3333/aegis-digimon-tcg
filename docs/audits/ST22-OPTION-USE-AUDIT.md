# ST22 Option use corrections

Date: 2026-09-05. Review uses the committed card catalog and local rules knowledge base. Card behavior remains exclusively registered through compiled IR.

## Own color requirement under another card

ST22-05 could use the blue ST22-09 from under a Tamer only when an ordinary blue color source was present. On an otherwise yellow board, its Option-use prompt opened but offered no candidate, despite ST22-09's printed Tamer-dependent color waiver. Stack enumeration and removal were already correct.

The continuous pass collected the Option's own waiver, but the kernel rejected activation because that Option was not its host's top card. The dedicated `colorWaiverStatic` builder now marks this narrow class of effect. During continuous recomputation, the placement guard permits an Option's own marked waiver under a host. The waiver's printed condition still applies. Ordinary printed statics and triggered effects remain inactive while buried; inherited and linked placement rules retain their existing guards.

Evidence: `ST22-05.option.test.ts` uses the exact Option from under Rika, links it, pays Alliance, and resolves two security checks. It also proves hand use, explicit refusal, and a no-Tamer color negative. `kernel.test.ts` checks the placement exception and ordinary-static/triggered-effect negatives. The focused Option/kernel/useOption/continuousColor regression passed 4 files and 38 tests.

## Printed source zones and trait alternatives

ST22-04's final Option filter still required Onmyōjutsu, excluding Plug-In despite its alternate target filter. ST22-04 and ST22-06 also used the broad digivolution-card zone, allowing Options stored under Digimon.

The IR now uses hand/under-Tamer sources and the intended trait union. `ST22-option-sources.test.ts` checks both cards, both traits, and valid Tamer versus invalid Digimon hosts. Four of its eight cases failed before correction; all eight passed afterward.

## Defense Plug-In F

ST22-11's Main used an unsupported `linkTo` field, so actual use threw instead of linking. Its IR now supplies the interpreter's `recipient` target. The later Reboot and +3000 DP share one selected recipient through `rebootRecipient`; the mandatory follow-up remains available after the optional Link action.

`ST22-keywords.test.ts` proves the exact linked instance, link DP plus temporary DP, real opponent Active-phase Reboot and expiry after that opponent's turn. `ST22-11.test.ts` separately chooses different Link and Reboot recipients and verifies that the temporary DP follows Reboot.

## Review and validation

A Luna read-only review found no concrete fidelity defects in the three card-local changes. A separate review of the shared exception confirmed its narrow scope; its concern about an off-field source was inapplicable because off-field printed effects already pass placement, while the reproduced under-Tamer case exposes the live host.

All test commands use `--pool=forks --maxWorkers=1 --no-file-parallelism`. The final collection, conformance, and affected-mechanism result is recorded in the overall starter audit closeout.
