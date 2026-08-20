# ST10 Collection Audit

Audit scope: ST10-15 through ST10-01, using the committed catalog at
`packages/shared/src/cards/data/cards.json`, `node tools/kb/query.mjs card
<ID>`, local rules/errata data, the compiled IR in each direct card module,
and colocated behavioral tests.

Rubric: a 10/10 requires complete runtime evidence. Because the required
dependency installation failed before `tsc` or Vitest could start, no card is
awarded 10/10 in this report. “Not verified” refers only to runtime execution;
the static result below records the clause-by-clause comparison.

| Card | Static clause result | Tests | Score | Blocker |
| --- | --- | --- | --- | --- |
| ST10-15 Darkness Wave | Main trashes top 3; conditional yellow-in-play return of one yellow/purple Digimon; Security activates Main. IR matches zones, order, condition, count, and security timing. KB Q749 supports return from the trashed cards. | Existing `ST10-15.test.ts`: Main and Security. | 9/10 | Runtime not verified. |
| ST10-14 Chaos Degradation | Main selects one opponent Digimon, places face down at opponent security top/bottom, then trashes security top if placement succeeds; Security is optional and uses owner's security. Direct module matches choice, face, controller, failure path, and Kongou interaction. KB Q746–Q748/Q1909. | Existing `ST10-14.test.ts`: top, optional Security, bottom, placement prevention. | 9/10 | Runtime not verified. |
| ST10-13 Junomon | Static Retaliation; When Digivolving trashes top 3 and returns one own Digimon from trash to hand. IR matches timing, amount, zone, controller, and target kind. | Existing `ST10-13.test.ts`: keyword and digivolution. | 9/10 | Runtime not verified. |
| ST10-12 LadyDevimon | Optional hand-trash cost gates reveal; reveals 3; adds one yellow and one purple card with Angel/Archangel/Fallen Angel traits; bottoms the rest; inherited Your Turn grants Retaliation to all own yellow Digimon. IR matches optionality and filters. KB Q744/Q745. | Existing `ST10-12.test.ts`: positive, mandatory matching adds, refusal, inherited aura. | 9/10 | Runtime not verified. |
| ST10-11 Bastemon | On Play deletes exactly one opposing level 3 Digimon. IR matches controller, kind, exact level, count, and timing. | Existing `ST10-11.test.ts`: positive deletion. | 9/10 | Runtime not verified; boundary-negative test remains desirable. |
| ST10-10 Wizardmon | Vanilla purple/yellow level 4 with no printed effects; catalog evolution requirements and stats are the only behavior. No direct module or IR is required. | New `ST10-10.test.ts`: legal digivolution and no pending effect. | 9/10 | Runtime not verified. |
| ST10-09 Witchmon | Security plays itself at end of battle without cost; On Play returns one own purple level 5 or lower Digimon from trash. IR matches security timing, self source, cost, zone, color, level, and count. KB Q741–Q743. | Existing `ST10-09.test.ts`: normal play, Security play, multi-check timing. | 9/10 | Runtime not verified. |
| ST10-08 Tsukaimon | On Play reveals top 3, adds one card with Angel/Archangel/Fallen Angel trait, bottoms remaining cards. IR matches trait alternatives, reveal count and order. KB Q739/Q740. | Existing `ST10-08.test.ts`: positive reveal/add. | 9/10 | Runtime not verified; no-match and short-deck runtime cases remain unverified. |
| ST10-07 Ghostmon | Opponent's turn aura grants Blocker while own yellow Digimon is in play. IR matches controller, color, duration/timing, and keyword. | Existing `ST10-07.test.ts`: gain and loss before reaction. | 9/10 | Runtime not verified. |
| ST10-06 Mastemon | DNA requirement is yellow Lv5 + purple Lv5, cost 0; When Digivolving places one own yellow/purple trash Digimon face down on security top, DNA searches security and may play one level 5 or lower without cost, then always shuffles; All Turns reacts to another effect-played Digimon and deletes an opposing Digimon at or below the captured played level. Errata and KB Q734–Q738 match the IR. | Existing `ST10-06.test.ts`: non-DNA placement, DNA security play, level boundary/capture, deck line. | 9/10 | Runtime not verified. |
| ST10-05 Angewomon | On Play gives one opposing Digimon Security Attack -2 until opponent's next turn ends; inherited Your Turn gives this +1 while own purple Digimon is in play. IR matches target, amounts, duration, controller, and inherited timing. KB Q732/Q733. | Existing `ST10-05.test.ts`: positive, inherited condition, duration. | 9/10 | Runtime not verified. |
| ST10-04 Gatomon | On Play reveals top 3, must add one yellow Digimon and one purple Digimon, bottoms remaining in chosen order; inherited End of Your Turn optional DNA with host plus another own Digimon; Your Turn replacement reduces evolution into Archangel/Fallen Angel by 2. IR matches filters, order, target identity, optionality, and requirements. KB Q727–Q731/Q3812. | Existing `ST10-04.test.ts`: reveal choices, cost replacement, DNA variants and real end-turn paths. | 9/10 | Runtime not verified. |
| ST10-03 Lopmon | Vanilla yellow level 3, no printed effects; catalog stats/evolution requirements only. No direct module or IR is required. | New `ST10-03.test.ts`: legal digivolution and no pending effect. | 9/10 | Runtime not verified. |
| ST10-02 Salamon | Inherited optional End of Your Turn DNA with this Digimon plus one other own Digimon into a hand card with DNA requirements, paying its DNA cost. IR constrains self/other, hand, Digimon, DNA requirement, and optionality. KB Q724–Q726. | Existing `ST10-02.test.ts`: positive DNA and rejection of normal evolution. | 9/10 | Runtime not verified. |
| ST10-01 Nyaromon | Inherited When Attacking checks own yellow Digimon, draws one, and only if that draw acted trashes one hand card. IR matches inherited timing, condition, amount, and conditional follow-up. KB Q723. | Existing `ST10-01.test.ts`: positive, own host as condition, failed-draw negative path. | 9/10 | Runtime not verified. |

## Changes

No card implementation was changed: static comparison found no evidence-backed
defect. Added vanilla behavioral tests for ST10-03 and ST10-10. The existing
ST10-14 handwritten module and ST10-06 errata-aware IR were retained because
their direct implementations match the local evidence.

## Verification commands and blockers

Attempted with Corepack/pnpm:

```text
corepack pnpm --filter @aegis/shared build
corepack pnpm install --frozen-lockfile
```

The build could not start because `tsc` is absent. Installation then failed
with `EROFS` while pnpm 10.30.1 attempted to create a symlink in the global
store under `/home/vinicius/.local/share/pnpm/store`. Consequently focused
Vitest, serial low-memory Vitest from `apps/api`, and typecheck could not run
(`vitest`/`tsc` not found). `git diff --check` passed.

An atomic commit was attempted with a temporary `GIT_INDEX_FILE`,
`write-tree`, `commit-tree`, and `update-ref`, but Git could not create the
temporary index/object (`Read-only file system`). No commit hash is claimed
because the repository ref and object database are not writable.
