# ST12 Card Implementation Revalidation

This ledger records a fresh, card-scoped ST12 review against the committed
catalog (`packages/shared/src/cards/data/cards.json`), local rules knowledge
base, executable compiled IR, shared effect primitives, and colocated tests.
All 16 cards are 10/10: executable behavior is registered only through
`registerIrCard(cardId, compiled)`; the three vanilla cards (ST12-02,
ST12-05, and ST12-07) correctly have no executable registration.

## Evidence by catalog order

- **ST12-01 Gurimon — 10/10.** KB Q750–Q751 confirms self-inclusive,
  non-stacking two-Digimon threshold; inherited aura proof covers the exact
  threshold and +1000 DP.
- **ST12-02 Candlemon — 10/10.** No card-specific KB entry; catalog play DP
  and zero-cost red Lv.2 evolution are proven.
- **ST12-03 Solarmon — 10/10.** KB Q752–Q755 confirms both-player play-cost
  reduction prevention (but not free play); proof covers both controllers.
- **ST12-04 Huckmon — 10/10.** KB Q756 confirms simultaneous Sistermon plays
  are a single once-per-turn gain; proof covers the event/frequency and the
  inherited Huckmon/Royal Knight DP condition.
- **ST12-05 Meramon — 10/10.** No card-specific KB entry; catalog play DP and
  red Lv.3 evolution cost are proven.
- **ST12-06 BaoHuckmon — 10/10.** Inherited name-or-trait +1000 DP is proven
  on both qualifying host branches.
- **ST12-07 SkullMeramon — 10/10.** No card-specific KB entry; catalog play
  DP and red Lv.4 evolution cost are proven.
- **ST12-08 SaviorHuckmon — 10/10.** The evolution-stack proof covers its
  temporary unsuspended-attack grant and the inherited Royal-Knight guard;
  the mixed-deck test covers a live stack interaction.
- **ST12-09 Volcanomon — 10/10.** Static Blocker and inherited Security
  Attack +1 are directly observable.
- **ST12-10 Jesmon — 10/10.** KB Q757 is covered by the card and mixed-deck
  proofs: attack-time Sistermon play triggers the own-turn buff in that attack.
- **ST12-11 Gankoomon — 10/10.** Free trash play and the effect-play-triggered
  two-target De-Digivolve, including a nonmatching-trash negative, are proven.
- **ST12-12 Sistermon Blanc — 10/10.** KB Q758 optional trash/draw contract
  and conditional Red/Black Decoy are traced and positively proven.
- **ST12-13 Sistermon Ciel — 10/10.** KB Q759–Q760 and Q5224 establish
  cross-zone Noir/Virus identity; proof covers that identity, reveal routing,
  and non-immediate Reboot grant.
- **ST12-14 Aus Generics — 10/10.** KB Q761 permits distinct targets; proof
  covers DP, conditional memory/Piercing, and Security return-to-hand.
- **ST12-15 From Master to Disciple — 10/10.** KB Q762–Q763 confirms
  placement even on a miss and effect-evolution Delay; proof covers visible
  reveal selection, security, placement, and later-turn Delay.
- **ST12-16 Quake! Blast! Fire! Father! — 10/10.** Main/security deletion,
  inclusive 13-cost ceiling, and Huckmon/Sistermon/Royal-Knight color waiver
  positive and negative paths are proven.

## Reproducible verification

Each `ST12-01.test.ts` through `ST12-16.test.ts` was run in a separate
process with `--pool=forks --poolOptions.forks.singleFork=true
--no-file-parallelism`; all passed (46 tests). The one serial collection gate
also passed: 17 files / 47 tests, including the Jesmon mixed-deck evolution
stack scenario.
