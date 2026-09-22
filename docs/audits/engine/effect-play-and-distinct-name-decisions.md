# Effect play and distinct-name decisions

September 19, 2026 incident evidence from Oracle VPS match `38f38b13-dbe2-400f-a80c-c75a210faea1` (green deployment `563952be45786e027c21a156fd394dcdbb53cfe3`). Logs were inspected through read-only SSH; no production mutation was performed.

## Contracts and changes

- DUAL cards have no play cost and cannot be played as Digimon, including free effect plays. [Official rule revision](https://world.digimoncard.com/rule/revised/) and local CR 7-1-1 support the rule. Effect candidate selection now excludes Option/DUAL cards from permanent-play targets; all three play primitives enforce the same boundary. Normal hand declarations default to Option use and reject explicit Digimon play. The hand confirmation offers only Option use; bot candidates classify these as Options. Explicit Option-use paths and Arts Digivolve remain separate and supported.
- Dantemon's distinct-name selection was silently sanitized after the server accepted an invalid response. `pickLoose` now forwards `distinctNames` through the decision API and protocol. The client blocks conflicting picks; the server checks names, including exact-name aliases, before consuming the decision. A legal retry preserves player choice. The rule applies to the selected group, not previously linked cards.
- EX13-014's client Assembly text filter now includes names, traits and all printed effect fields, matching the server's full-text contract (Q4366). Keyword tokens retain delimiter matching.
- CR 7-3-2-10 allows Assembly during an effect-driven play. Filtered `PlayWithoutCost` now prepares and validates each chosen card's Assembly materials, applies its reduction per play, and places the materials before On Play processing. This closes the BT26-067 to BT26-073 trash-play gap without card-specific runtime code.
- BT20-102 acquired during the already-triggered end-turn sequence does not gain a retroactive trigger (CR 15-8-3-6). The incident requires no change to its attack behavior.

## Behavioral proof

The initial focused commands reproduced illegal hand/trash DUAL play, the omitted SaviorHuckmon Assembly candidate, and acceptance of Dantemon's duplicate-name response. Permanent regressions are in BT23-013, BT26-086, BT20-102 and EX13-014 colocated tests; `engine/dualEffectPlay.test.ts`; `decisions/minEnforcement.test.ts`; and the web Assembly/decision picker tests. They use actual server deck identities and minimized decision sequences, not a claim of complete match replay. Raw logs remain outside the repository.

Verification is scoped to these fixes. Existing collection scores are not recalculated or re-certified by this incident investigation.

## Verification results

- Full engine plus BT20-102, BT23-013, BT26-086, EX13-014 and audit layout: **8,549 passed / 1 failed**, 355 files. The sole failure is the existing `ch08-digivolution.test.ts` Burst-top cleanup assertion; it reproduced identically in an isolated checkout of unchanged `fcb544643`. No fix to that unrelated mechanism is claimed.
- EX13, BT25, ST23, ST24, BT4-089 and bot evaluation/player suites: **219 files / 2,757 passed**. Four former EX13-065/066 expectations that incorrectly allowed DUAL permanent play were corrected to the official rule; their Option and Arts paths remain green.
- Web Assembly picker, decision picker, board model and rendered DUAL confirmation: **4 files / 128 passed**.
- Workspace `pnpm typecheck` passed after unrelated concurrent LM edits settled; API typecheck passed again after the bot compatibility correction. Scoped lint completed without errors (existing warnings remain); scoped formatting and `git diff --check` passed.
- Independent read-only review found the own-hand name-identity fallback and bot classification follow-ups; both were addressed with regressions.

All Vitest commands used `--maxWorkers=1 --no-file-parallelism`. Changes are local and have not been deployed to the VPS.

## Comprehensive Assembly follow-up (2026-09-21)

- The September 19 correction was narrower than its generic wording implied: it prepared Assembly
  only inside filtered `PlayWithoutCost`. Mervamon uses `PlayMultiple`, while `PlayFromZone`,
  security searches, and parts of the reveal family had independent effect-play paths.
- Assembly preparation now lives in one interpreter helper and is used by `PlayMultiple`, filtered
  and own-stack `PlayWithoutCost`, `PlayFromZone`, `RevealAdd`, `Search`, and `SearchSecurity`.
  Each batch excludes the cards being played, reserves a material for at most one declaration,
  validates the complete printed recipe, supplies decision metadata, and applies the reduction per
  paid play. Free plays still place selected materials before On Play processing.
- Public regressions prove Mervamon playing Aegiochusmon: Dark from trash with Assembly, declining
  that Assembly without cancelling the free play, a generic `PlayFromZone` entry, and a
  security-search entry. The retained Wizardmon and reveal regressions cover the previously fixed
  `PlayWithoutCost` and `RevealAdd` states.
- This follow-up is a targeted engine correction. It does not recalculate any collection score or
  claim a new full-engine certification.
