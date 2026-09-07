# BT20-044–046 strict review

Scope: current catalog, local KB, direct IR, and colocated tests. No tests/builds were run and existing report scores were not treated as proof.

## BT20-044 Breakdramon

The direct IR matches the printed alternate Groundramon/Wingdramon cost 3, Blocker, both entry triggers, resident and inherited All Turns Once Per Turn watchers, full Dracomon/Examon text source filter, suspended Digimon/Tamer target, and same-timing source-survival condition. Current tests prove exact two-target suspension including a Tamer, optional attack refusal, public qualifying battle deletion, inherited stack behavior, nonmatching source, simultaneous source/opponent deletion (Q4364/Q4367), and legal alternate evolution.

Concrete remaining evidence gaps:

- No public accepted entry-trigger attack is asserted; current entry fixture declines it.
- Resident and inherited watchers each have a one-event proof, but no public same-turn second qualifying battle followed by a real next-turn reset. A feasible fixture needs two suspended opponent targets, a legal public unsuspend source, and a qualifying attacker that survives both battles.
- The nonmatching test uses a non-Dracomon/Examon own source but does not separately exercise an opponent-controlled text-matching source; the trigger's own-controller boundary remains structural rather than public.

## BT20-045 Examon ACE

The direct IR and tests cover Blast DNA metadata, legal Breakdramon field plus Slayerdramon hand Counter response, DNA-only highest-DP return including ties, ordinary evolution no-return, refusal when only a hand-treated name exists, Raid/Piercing/Blocker/Evade combat, any-controller once-per-turn unsuspend, and public Overflow -5 battle departure. Q4314/Q4359 field-versus-hand treated-name restrictions are represented by the public counter negative; the remaining limitation is that those rulings are not independently reproduced with a field Examon treated as Slayerdramon/Breakdramon. No concrete card-local mismatch was found.

## BT20-046 Espimon

The direct IR matches Kapurimon cost 0, battle-area Your Turn Cyborg/Machine reduction 1, Q4369 breeding exclusion, and inherited All Turns +1000. Current tests prove alternate/battle and breeding costs, Machine and nonmatching destination boundaries, legal stack/source retention, and +1000 on both turn seats. No substantive gap or implementation mismatch was found.

## Readiness

044 remains pending the three public proofs above. 045 and 046 are clause-complete from this source review, subject to root's focused, mechanism, collection, and mutation gates. No tests/builds were executed.
