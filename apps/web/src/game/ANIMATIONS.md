# Game animation structure

Start with `animationCatalog.ts`. It exhaustively assigns every server event to its
presentation families and to the board snapshot policy. `presentBatch.ts` consumes that
policy; the effects lab consumes the same catalog, reports observed recipes, and links the
other harnesses. An event listed in the catalog is a coverage contract, not evidence that
its animation has run.

The coordinator is `useMatchCues.ts`. It passes accepted public events and state snapshots
to `match/present/presentBatch.ts`; recipes remain beside that coordinator in
`match/present`, `match/steps`, `match/flights.ts`, and `match/watchers`. They enqueue work
through `animationQueue.ts`. Each track serializes its own work; gates order related
tracks. `match/tracks.ts` chooses which steps hold the board. Rules and legality always
read the live server state, while the field renders the snapshot the presentation reached.
In paced matches, visible hand membership, both hand counts and deck counts follow that
same revision. `handEntries.ts` merges live legality onto the shown cards; an effect's
future draw remains hidden until its clause releases the result, and becomes selectable
when the presentation catches up. `handHorizon.test.tsx` checks the actual hand and HUD.
The paced field also keeps DP, keywords, granted abilities and attack modifiers on that
revision. Refreshing them from future live state would reveal an outcome while its pulse
still waits; the screen test covers the printed DP even when no result event is emitted.

`timings.ts` owns concrete motion durations and the CSS custom properties. `pacing.ts`
owns source, announcement, result and settle beats, speed scaling, read floors and bounded
chain acceleration. Keep motion in those tables. Keep new event contracts in the catalog.
`game/style` and the piece components render the vocabulary; moving every renderer into
one directory would obscure the relation between a card and its state.

Accepted field effects get a 720 ms source focus at Normal speed before their clause appears.
Minor effects and later effects in a chain keep that orientation time: chain acceleration
shortens the clause and settle beats. The viewer's Effect speed still scales the source focus.
The focus then becomes the steady light linked to the visible clause. Announcement consumers
share the owner's safety ceiling, including a Security reveal before its source can focus.
The effects lab always uses the match's stacked timing. It ignores obsolete saved tuning;
its speed controls scale playback or Effect speed without switching the pacing style.
Recent toast columns retain up to six moments and scroll within their bounded height.
The edge buttons reveal notices above or below; arriving effects follow the newest only
while the viewer stays at the bottom. The resolution strip leaves when a chain settles.
At Normal, stacked effects keep the 720 ms source focus, announce for 200 ms before results,
and rest for 100 ms afterwards. This brings a common field effect's lead-in near DCGO's
0.9 s while leaving card travel, particles, Security scenes and toast lifetimes intact.

| Family                                   | Recipes and visible surfaces                                                                  | Evidence harness                                                                                                     |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Opening, turn and phase                  | `flights.ts`, `usePhaseBanners.ts`, shields, phase ribbon, turn banner                        | New live match; `/dev/effects-lab` traces; queue/phase tests                                                         |
| Play and landing                         | `arrivals.ts`, `zoneChangeStep.ts`, `flights.ts`, `BoardBurstLayer`, `PermanentView`          | Accepted play → `confirmed-play-flight` → `confirmed-play-landing`; `playArrival.test.ts`; effects-lab browser tests |
| Digivolution, hatch, promote             | `arrivals.ts`, `showcases.ts`, breeding slot, field burst                                     | Live effects lab; `/dev/arena?mode=visual` evolution/respawn playback; `showcases.test.ts`                           |
| Effect source and clause                 | `narrationStream.ts`, `effectSequence.ts`, `effectSources.ts`, `EffectFocus`, narration stack | Own/opponent/production chains in effects lab; accepted/declined effect browser checks                               |
| Optional, target, cost and order choices | `useDecisionBarrier.ts`, decision/combat overlays, source focus, target/fate badges           | Effects lab, `/dev/card-effects/EX3-074`, `/dev/mobile`; decision contract tests                                     |
| Attack and field battle                  | `attackLunge.ts`, `combatImpact.ts`, arrows, claws, clash ghosts                              | `/dev/battle`; visual keywords Blocker, Raid, Piercing, Retaliation, Ice Clad; combat tests                          |
| Security check and effect dock           | `securityRevealScene.ts`, `securityClose.ts`, `SecurityClashView`                             | `/dev/battle?scenario=security-chain`; effects-lab security/production Execute; security ordering tests              |
| Recovery and security destruction        | `securityGrowth.ts`, `securityDestructions.ts`, flight, shield and count                      | Visual Recovery; effects-lab security removed; security destruction tests                                            |
| Deletion, Option trash and return        | `deletionBursts.ts`, `deckReturns.ts`, shatter and return flight                              | Visual Delay/Execute/Partition; real Execute chains; deletion and held-board tests                                   |
| Stack strip, source movement and link    | `stackStripPeels.ts`, `flights.ts`, linked cards and source badges                            | Visual De-Digivolve, Digi-Burst, Save, Material Save, Link, Detach; zone scene/peel tests                            |
| Reveals and zone movement                | `revealShowcases.ts`, side panels, public face flights                                        | Card effect fixtures; production Titan cascade; reveal and hand presentation tests                                   |
| Memory                                   | `memoryHold.ts`, `MemoryGauge`, sweep, arc and prediction                                     | Effects lab; visual Training/Digisorption; `/dev/board` specimens                                                    |
| DP and restrictions                      | `useDpPulses.ts`, `useRestrictionPulses.ts`, `CardMini`, persistent badges                    | Effects lab; visual Alliance/Reboot; DP, restriction and permanent tests                                             |
| Shuffle                                  | `deckRiffles.ts`, `deckRiffleStep.ts`, deck layers                                            | Engine `deckShuffled`; queue and deck chrome tests; `/dev/board` pile specimens                                      |
| Refusal and result                       | `useMatchCues.ts`, hand shake, rejection notice, `GameOverOverlay`                            | Rejected intent/live match end; mobile/piece specimens; rejection/result tests                                       |
| Local selection and inspection           | `Hand`, `PermanentView`, spotlight, inspector, card zoom, drag ghost                          | `/dev/board`, `/dev/mobile`, visual arena; keyboard and responsive browser checks                                    |

The arena keyword player and card fixtures send scripted events through the real match
renderer; they validate visual recipes without proving rules. `/dev/effects-lab`, the
battle lab, API scenario tests, and `test/pacing` execute the real engine. Use both forms:
the trace cannot prove visual geometry, and a scripted scene cannot prove legality.

For a normal play, accepted `cardPlayed` publishes the public face and source zone. The
field stays hidden while the card flies, then lands and starts its burst. An opponent's
readable showcase transfers to the flight from its measured rectangle. `On Play` waits
for that permanent's arrival on every track and for its burst before source focus/clause.
An arrival with a known later revision is a consequence of that clause, so it never blocks
the clause itself; `arrivalOrdering.test.ts` exercises an On Play that evolves its own source.
Hidden cards stay hidden until the accepted public event. Reduced motion and history
collapse travel, release destination holds, and retain the readable information.

`screen/model/visibleBoard.ts` is the probe and harness projection of the rendered field,
piles and readouts. It applies `presentedSeats` plus arrival visibility, rotation, shield,
hand and memory holds and copies public values for each frame. Keep raw snapshot revisions
as diagnostics; they are insufficient evidence that an effect's result appeared. A revealed
Security card may already exist in the selected snapshot while its actual field slot stays
hidden. Judge each result against the projected card, zone, rotation, DP or gauge it changed.

Run `pnpm --filter @aegis/web exec vitest run src/game/animationCatalog.test.ts
src/game/playArrival.test.ts` for the event contract and flight lifecycle. Run
`pnpm --filter @aegis/web pacing:measure` for the speed/style/real-scenario matrix and
`pnpm --filter @aegis/web test:browser effects-lab-pacing.spec.ts` for live rendering,
cause-before-result, accepted/declined effects, mobile geometry, and queue recovery.
