# ST20 card proof audit

Audited against the committed card catalog, local KB rulings, direct IR
modules, and colocated tests. Every ST20 card is compiled and registered with
`registerIrCard`; this report distinguishes executable behavior from structural
catalog assertions.

| Card | Executable evidence | Score |
| --- | --- | --- |
| ST20-01 Koromon | `ST20-01.test.ts` proves inherited +1000 for ADVENTURE host, non-ADVENTURE exclusion, and top-card/source transition. | 10/10 |
| ST20-02 Biyomon | `ST20-02.test.ts` proves reveal-three, both ADVENTURE categories, bottom remainder, and non-ADVENTURE Tamer exclusion. | 10/10 |
| ST20-03 Birdramon | `ST20-03.test.ts` proves free digivolution at exactly 3 Tamer colors and rejection below threshold. | 10/10 |
| ST20-04 Garudamon | `ST20-04.test.ts` proves Security Attack +1, two-color DP scaling, zero-color boundary, and a controlled Alliance attack with the selected ally suspended and both security cards checked. | 10/10 |
| ST20-05 Gatomon | `ST20-05.test.ts` proves two opposing Security Attack -1 targets, inherited once-per-turn -2000 attack debuff, and actual end-of-security-battle self-play. | 10/10 |
| ST20-06 Angewomon | `ST20-06.test.ts` proves optional free digivolution, inherited Alliance with a controlled two-check attack, temporary Alliance from an actual ADVENTURE play followed by a paid two-check attack, trait-negative control, real evolution, optional refusal, and turn expiry. | 10/10 |
| ST20-07 Tentomon | `ST20-07.test.ts` proves opponent-turn digivolution reduction blocking is seat/type scoped. | 10/10 |
| ST20-08 Kabuterimon | `ST20-08.test.ts` proves ≤1 Tamer gate, qualifying ADVENTURE Tamer play, exclusion, real stack, and inherited Piercing. | 10/10 |
| ST20-09 MegaKabuterimon | `ST20-09.test.ts` proves unsuspend plus color-scaled opponent suspension, zero-color boundary, inherited Alliance with a controlled two-check attack, temporary Alliance from an actual ADVENTURE play followed by a paid two-check attack, trait-negative control, real evolution, optional refusal, and turn expiry. | 10/10 |
| ST20-10 Agumon | `ST20-10.test.ts` proves 10000-DP and three-color alternate conditions, negative case, and inherited Reboot on a real evolved host. | 10/10 |
| ST20-11 WarGreymon | `ST20-11.test.ts` proves play, Counter Timing Blast Digivolve from hand with memory unchanged, color-scaled effect protection, and lowest-DP deletion of exactly one target. | 10/10 |
| ST20-12 Sora/Kari | `ST20-12.test.ts` proves start-main memory, stacked ST20-13 reduction, suspended Tamers, and actual SecuritySkill play. | 10/10 |
| ST20-13 Tai/Izzy | `ST20-13.test.ts` proves play-cost reduction, opponent-turn ADVENTURE Blocker, and Security play. | 10/10 |
| ST20-14 Our Courage United | `ST20-14.test.ts` proves Main draw/place, Security placement, Delay arming, Armor Purge negative, and accepted/refused optional delayed ADVENTURE play. | 10/10 |
| ST20-15 Island of Adventure | `ST20-15.test.ts` proves Main security exchange/face-up placement, empty-security placement, face-up waiver rejection, Security +2000, and Security Tamer play. | 10/10 |

ST20-06 and ST20-09 used an unsupported `sourceHasTrait` condition in both
play and digivolution watchers. Both now use `triggerSubjectMatchesFilter`.
The positive tests explicitly accept the source's optional attack, pay Alliance
by suspending the selected ally, and observe two completed security checks.
Temporarily restoring the invalid ST20-06 condition made this proof fail; the
fixed module was restored and the focused tests passed again.

Validation, with `--pool=forks --maxWorkers=1 --no-file-parallelism`:

- Full ST20: 16 files, 90 tests passed after the trigger fixes and duration proofs.
- Subsequent ST20-10 assertion cleanup: 1 file, 4 tests passed, including exact
  memory payment for both alternate evolution paths.
- Independent review found no further concrete implementation or evidence gap.
- ST20 lint and formatting checks passed.

All 15 cards have reviewed 10/10 evidence. This collection checkpoint does not
complete the overall 343-card starter audit.
