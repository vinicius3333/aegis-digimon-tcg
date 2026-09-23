# Building and verifying a TCG simulator

Primary-source research, 2026-09-22. Recommendations for Aegis are engineering inferences, not official game rules.

## How existing simulators are organized

1. **A rules engine owns state and semantics; card definitions describe abilities.** Forge documents a card scripting API with distinct abilities, continuous effects, triggers, and replacement effects. Triggers name an event and the ability to execute; replacements intercept events such as drawing, damage, or zone changes. This supports structured card effects interpreted by shared engine behavior, with explicit exceptional cases. [Forge card scripting API](https://github.com/Card-Forge/forge/wiki/Card-scripting-API), [triggers](https://github.com/Card-Forge/forge/wiki/Triggers), [replacements](https://github.com/Card-Forge/forge/wiki/Replacements).

2. **The engine validates legal actions and hidden information.** XMage describes server-side rule enforcement; clients only see information they are authorized to receive. For Aegis, commands should be validated against authoritative state, then projected to each player. [XMage README](https://github.com/magefree/mage/blob/master/readme.md).

3. **Rules and rulings are versioned sources of truth.** On 2026-09-18, the official Digimon rules page published an updated Comprehensive Rules Manual and Q&A. The manual covers procedures, effects, keywords, and rule checks. Each expected behavior should point to a manual version and section, relevant card text or errata, and applicable Q&A. [Official rules page](https://world.digimoncard.com/rule/), [Comprehensive Rules Manual](https://world.digimoncard.com/rule/pdf/general_rule.pdf?20260918=).

4. **Testers need controlled game states.** XMage offers a test mode that positions cards in zones; Forge's development mode loads an artificial game state. This makes a card interaction reproducible without playing a full match first. [XMage development testing tools](https://github.com/magefree/mage/wiki/Development-Testing-Tools), [Forge DevMode](https://github.com/Card-Forge/forge/wiki/DevMode).

## Verification layers

| Layer                   | What to verify                                                                                 | Evidence                                                                                                                                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Core rules              | Action legality, costs, zones, turns, victory, hidden information                              | Initial state, command, decisions, final state and events, with manual citation                                                                                                                  |
| Mechanisms              | Triggers, replacements, durations, simultaneous effects, priority, choices, continuous effects | Small scenarios combining mechanisms and checking order, costs, and zones                                                                                                                        |
| Cards                   | Printed text, errata, Q&A, each relevant choice branch                                         | Positive, negative, boundary, and interaction cases with card ID and official source                                                                                                             |
| Matches and integration | Command sequences, synchronization, per-player projections                                     | Seeded matches and network tests; Forge runs AI clients over real TCP to detect crashes and desynchronization. [Forge network testing](https://github.com/Card-Forge/forge/wiki/Network-Testing) |

To search beyond hand-written scenarios, `fast-check` documents **model-based testing**: generate command sequences, maintain a small independent reference model, and compare with the real system after each step. Failures can be shrunk and replayed using their `seed`, `path`, and `replayPath`. TCG commands may include play, digivolve, attack, block, choose a target, and advance phase. Preconditions keep generated commands meaningful. The model can initially cover basic rules and invariants without duplicating the entire engine. [fast-check model-based testing](https://fast-check.dev/docs/advanced/model-based-testing/).

Useful proposed invariants include: a physical card instance has one location; card counts are conserved except for explicit token creation or removal; rejected actions preserve state; temporary effects expire at the correct boundary; each player sees only permitted information; and resolution reaches a stable state or reports a bounded failure. These are testing proposals, not quotations from the manual.

**Every possible card interaction cannot be enumerated.** Forge explicitly notes that it lacks the resources to test every card and effectively infinite combinations. An auditable target is coverage of inventoried rules and mechanisms, implemented cards' relevant branches, known regressions, and generated exploration with replayable seeds. Line coverage and test counts are useful diagnostics, but do not prove rule fidelity. [Forge FAQ](https://github.com/Card-Forge/forge/wiki/Frequently-Asked-Questions), [XMage README](https://github.com/magefree/mage/blob/master/readme.md).

## Observed Aegis baseline on 2026-09-22

- `apps/api/src/engine/testkit/harness.ts` builds boards and drives the real `GameEngine`. `apps/api/src/engine/conformance/` links behavioral suites to rules KB chunks. These are suitable seams for deterministic transition and event-order tests.
- `apps/api/src/bot/battleFuzzer.ts` already runs deck matchups across seat orders and seeds, returning replayable engine and presentation failures.
- `apps/api/src/engine/fuzzer.test.ts` constructs boards with `Math.random()` and executes one intent per board. The seed given to `GameEngine` therefore does not reproduce the board or chosen intent. Its duplicate-instance checks also overwrite some top-card and stack entries without detecting all duplicates. A stronger generator needs one recorded seed for state, decisions, and commands; multi-action sequences; reduced counterexamples; and a central location invariant.
- `apps/api/src/engine/conformance/README.md` explicitly states that its KB chunk coverage is a report, not proof of every normative obligation. Citations without a reviewed fingerprint do not detect changed text under an unchanged ID.
- Local `data/kb/rules-index.json` identifies Comprehensive Rules v4.2, updated 2026-08-18. The [official rules page](https://world.digimoncard.com/rule/) announces a manual update on 2026-09-18. Compare that update and review affected citations before treating the local KB as current. Different dates alone do not prove a semantic conflict.

A practical criterion for each mechanism is a recorded official source and version; positive, negative, and boundary cases; accept and decline branches when applicable; observable event order; an interaction with a neighboring mechanism; and a regression for each discovered bug. Per-card evidence remains in the single `docs/audits/<SET>.md` ledger required by this repository.
