# ST13 proof audit

Date: 2026-09-05. Scope: ST13-01 through ST13-16. Evidence was reviewed
against the card catalog, KB answers, each direct IR module, and the colocated
behavioral tests. A score of 10/10 requires observable clause, boundary,
optionality, duration, zone, and stack evidence where applicable.

| Card | Printed clause → test assertion evidence | KB | Score |
|---|---|---|---:|
| ST13-01 | Effect-play of another Legend-Arms Digimon is observed with the actual card entering play and memory gain; normal play is a negative control. | Q764-Q765 | 10/10 |
| ST13-02 | Optional placement under a Legend-Arms host, reveal/play of an eligible card, declined placement, ineligible reveal-to-hand, and inherited attack deletion at exactly 3000 versus 4000 are exercised. | Q766-Q768 | 10/10 |
| ST13-03 | Optional placement and 5000-DP On Play deletion are exercised with refusal; inherited attack deletion covers exact 3000 versus 4000. | Q769 | 10/10 |
| ST13-04 | Your Turn Legend-Arms reduction, nonmatching negative, inherited DNA stack, and no-DNA target rejection are exercised. | Q770-Q772 | 10/10 |
| ST13-05 | Attack reveal/play and refusal, exact deck-bottom handling, once-per-turn DP/Security Attack source addition, opponent-source negative, and inherited Security suppression are exercised. | Q773-Q774 | 10/10 |
| ST13-06 | Eight-source DNA proof observes Blitz, two deletions, two security trash; ordinary evolution suppresses DNA-only removal; four-source DNA proof observes exactly one deletion and one security trash at the lower boundary; security-loss unsuspend and once-per-turn control are observed. | Q775-Q777 | 10/10 |
| ST13-07 | Residual-free vanilla IR, printed play cost/DP, legal play, and no effect activation are observed. | none | 10/10 |
| ST13-08 | Both-player play-cost reduction prevention is exercised, with an effect-play-without-cost exemption. | Q778-Q781 | 10/10 |
| ST13-09 | Optional placement/reveal, refusal and ineligible handling, opponent-turn red-ally Blocker, and actual Blocker combat are exercised. | Q783-Q785 | 10/10 |
| ST13-10 | Residual-free vanilla IR, legal black evolution, printed cost/DP, preserved source stack, and no effect activation are observed. | none | 10/10 |
| ST13-11 | Optional free Reboot target and refusal, opponent-turn red-ally Blocker, and actual Blocker combat are exercised. | Q786 | 10/10 |
| ST13-12 | Residual-free vanilla IR, printed play cost/DP, legal play, and no effect activation are observed. | none | 10/10 |
| ST13-13 | Opponent-turn deletion immunity versus battle deletion, inherited DNA success and no-DNA rejection are exercised. | Q787-Q789 | 10/10 |
| ST13-14 | Reveal/play and refusal, opponent-source protection negative, and opponent-turn RagnaLoardmon effect immunity are exercised. | Q790-Q792 | 10/10 |
| ST13-15 | Legend-Arms color waiver, highest-DP deletion, tied-highest single deletion, color negative, and Security activation are exercised. | Q793 | 10/10 |
| ST13-16 | Optional free Legend-Arms play, mandatory placement after refusal, Security play, and Delay all-card top/bottom return are exercised. The full-turn transition proof models effect placement, confirms Delay is unavailable on entry, advances the opponent turn, opens the owner's next Main phase, and explicitly activates Delay. | Q794-Q795 | 10/10 |

Validation used `--pool=forks --maxWorkers=1 --no-file-parallelism`:

- Full ST13: 18 files, 59 tests passed.
- After tightening the final Delay assertions, ST13-16 plus ST12-11:
  2 files, 10 tests passed.
- Changed-file lint/format, workspace shared/web types, API types and diff checks
  passed at integration.

The final Delay proof checks unavailability while its owner is still the active
seat, explicitly activates the effect after a turn transition, observes and
answers the four-card ordering decision, and asserts the exact Option instance
in trash and all deck cards returned face down.

The four-source final stack has one opponent Digimon remaining and one security
card removed, proving the `for every 4` lower boundary. The initial failed
transition probe was a fixture issue: a hand-laid pure Option lacked
`placedByEffect`, so the state-based illegal pure-Option cleanup correctly
trashed it during Active. The corrected fixture marks the Option as effect
placed. No shared engine files were changed.
