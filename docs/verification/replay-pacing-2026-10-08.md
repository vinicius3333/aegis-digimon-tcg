# Replay presentation validation — 2026-10-08

## Reproduced defects

- CSS animations ran at 1× while replay cursor/queue waits used the selected speed.
- Pause stopped queue waits while painted card animations continued.
- Per-batch delivery could withhold a completion event needed by the current animation. A nested chain stalled; De-Digivolve reported missing stack-top resolutions; consequence gates expired during long chains.
- Replay used the older concurrent clause mode while live matches use sequential presentation.
- Final-frame arrival could be announced complete before its animation settled.
- A paused presentation gate consumed its wall-clock timeout and expired before resumption.

Regression commands include `playwright test e2e/replay-pacing.spec.ts` and `vitest run src/game/match/presentationGate.test.ts`. Speed and pause assertions failed against the prior implementation; nested/stack/cost scenarios reported real stalls or cue errors. The gate pause regression failed after a simulated 10-second pause.

## Scenario matrix

| Authoritative recording                 | Interactions exercised                                                     |
| --------------------------------------- | -------------------------------------------------------------------------- |
| effects-lab-own-chain                   | Digivolution, inherited clauses, multiple sequential effects               |
| effects-lab-nested                      | Attack, nested effects and security resolution                             |
| effects-lab-prod-attack-stack           | Long attack chain, multiple targets, De-Digivolve, promoted tops, deletion |
| effects-lab-prod-security-removed       | Security removal and attack-owned effects                                  |
| effects-lab-prod-titan-cascade          | Hand discard as a cost, reactive effects, trash plays and deletion         |
| effects-lab-prod-ghost-execute-security | Executed effects, nested security clauses and chained movement             |
| arena-bt24-silphymon-dna                | DNA materials, fusion landing, bonus draw and On Digivolve effects         |
| phase-pacing-bot-raising-move           | Opponent raising promotion, evolution, attack and turn/phase transitions   |
| keyword-pacing-recovery-many            | Multiple recovery flights and security-count convergence                   |
| keyword-pacing-draw-many                | Multiple draws, hand arrivals and hand-count convergence                   |

The browser matrix also covers normal and slow playback, mobile DNA/promotion, exact-frame seeking inside De-Digivolve, a pause longer than the usual gate ceiling, and completing the final animation. The visible final board is compared with the recorded field, breeding area, stacks, DP, suspension, hands, deck counts, security, trash and memory. Dev cue traces and presentation evidence are attached to each browser run.

Fixtures can be regenerated with:

```sh
REPLAY_FIXTURE_OUTPUT="$PWD/test/replays/recordings" pnpm exec vitest run test/replays/scenario-recordings.test.ts
```

Run that command from `apps/web`. Recordings use synthetic players and deterministic development layouts. Captured file IDs are generated UUIDs; scenario actions and outcomes are deterministic. This validates the listed presentation families and interactions; it does not claim to exhaust every printed card or legal game sequence.

## Final results

- 322 tests passed across 11 unit/integration suites, including the ten authoritative scenario recordings, presentation gates, animation queue, cue ordering and security/stack resolution.
- 33 Chromium browser tests passed: the 20-test pacing matrix plus existing offline replay, account library and completed-match download coverage. Assertions verify visible board convergence, settled queues, zero failed cues, zero expired gates and zero board-budget hits.
- Web TypeScript checking, production build, targeted lint and `git diff --check` passed.
- An independent code review found no remaining blockers after correcting `effectHadNoEffect` handling: that informational event does not close an effect lifecycle. Additional checks covered mid-attack/mid-effect seeking and a 6.5-second pause during security docking.
- The real fullscreen player was also opened in Orca Browser with the 60-frame attack/De-Digivolve recording and inspected visually.

Validation ran with Node 24.21.0; the repository declares Node 26. The commands above succeeded, but this run does not establish Node 26 compatibility. The production build retains the existing chunk-size warning.

Changes remain on `replay-files`. PR #5329 stays closed at the user's request; this work does not deploy the application to production.
