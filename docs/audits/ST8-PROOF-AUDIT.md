# ST8 proof audit

Date: 2026-09-05. Scope: ST8-01 through ST8-12. Catalog text, local KB
answers, direct IR modules, and resolved behavior were reviewed.

| Card   | Printed behavior and evidence                                                                                                        | KB        | Score |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------- | ----: |
| ST8-01 | Inherited Your Turn +1000 DP while hand has 8 or more cards.                                                                         | Q695      | 10/10 |
| ST8-02 | Inherited All Turns +1000 DP while hand has 8 or more cards.                                                                         | Q696      | 10/10 |
| ST8-03 | Reveals 3, adds a Dramon-name Digimon, and returns the rest to deck bottom.                                                          | none      | 10/10 |
| ST8-04 | Alternate UlforceVeedramon evolution for 4 with opponent level 6+, plus attack Draw 1 at hand 7 or fewer.                            | Q697      | 10/10 |
| ST8-05 | Inherited attack return of an opposing level 3 and trash of all its sources at hand 8.                                               | Q698      | 10/10 |
| ST8-06 | On Play Draw 2; Security play is resolved after battle and its On Play draw resolves before attack completion.                       | Q699-Q701 | 10/10 |
| ST8-07 | Blocker keyword and actual opponent player-attack redirection through Blocker combat; attacker is deleted and security is preserved. | none      | 10/10 |
| ST8-08 | Jamming and inherited Your Turn Security Attack +1 at hand 8.                                                                        | Q702      | 10/10 |
| ST8-09 | When Digivolving Security Attack +1 and Your Turn unblockable attack through an actual blocker present.                              | Q703      | 10/10 |
| ST8-10 | Return opposing level 4 or lower with all sources trashed; once-per-turn hand-8 attack unsuspend and second attack.                  | Q704      | 10/10 |
| ST8-11 | Main unsuspends one own blue Digimon; Security adds itself to hand.                                                                  | none      | 10/10 |
| ST8-12 | Main returns opposing level 6 or lower after trashing its full stack; Security activates Main.                                       | none      | 10/10 |

The focused proofs use legal neutral decks, settle effect and combat windows,
and assert final zones. ST8-07 now includes an actual Blocker redirection proof;
the existing mixed-line suite proves the hand-threshold dependencies across
the Ulforce line.

Verification command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/ST8 \
  --pool=forks --maxWorkers=1 --no-file-parallelism
```

Result: 15 test files and 30 tests passed. `git diff --check` passed. No
shared engine files were changed.
