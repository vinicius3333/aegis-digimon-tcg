# Pacing harness

The harness measures how the match screen paces triggered effects. It plays each effects-lab
scenario on the real server and the real client cue pipeline, on one fake clock. A full run
takes about 15 seconds and gives the same numbers every time.

## How it works

- `scenarioRoom.ts` hosts the real `AegisRoom` in-process: engine, dev scenario, bot seat with
  its real think delays, batch envelope, per-seat StateView and the 50 ms patch tick. A fake
  client decodes every state frame, so the viewer gets the same redacted board as in production.
  The client declares its pacing on join, as the real client does, so a bot follows a
  `sequential` client's chain pacing. Every pacing style joins as `sequential`.
- `runScenario.ts` feeds what the socket delivered into `useMatchCues` every 16 ms, as `useRoom`
  does, and samples the screen. The viewer plays the scenario's moves when the screen is idle
  (800 ms later) and answers a prompt 1000 ms after it opens.
- `scenarios.ts` holds the moves and answer rules for each scenario.
- `metrics.ts` turns a recording into the numbers below. `report.ts` builds the table.

## Run it

| Command                                                                      | What it does                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @aegis/web pacing:measure`                                    | Runs every scenario under `current`, and under each pacing style (`sequential`, `stacked`) at Slow, Normal and Fast. Writes `apps/web/.pacing-report/` (`summary.md`, `summary.json`, `runs.json`) and prints what moved against the baseline. |
| `pnpm --filter @aegis/web pacing:baseline`                                   | The same, then overwrites `pacing-baseline.json` with the new numbers.                                                                                                                                                                         |
| `pnpm --filter @aegis/web exec vitest run test/pacing/pacing.budget.test.ts` | The budget test. It also runs in the ordinary web test suite.                                                                                                                                                                                  |

## Read the table

One row per scenario, pacing and Effect speed. `pacing` is `current` or a pacing style: `sequential` (one clause at a time) or `stacked` (short beats; earlier clauses stay dimmed under the one resolving now). Times are in milliseconds.

| Column              | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fx                  | Effects (units) in the scenario's chains. A unit runs from `effectTriggered` to its `effectResolved`.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| chain ms            | Sum over chains: first clause or result on screen to the moment the screen is idle again.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| shown ms            | `chain ms` less the time a prompt stood open for the viewer's answer. The budget uses this.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ann→res             | Median time from an effect's clause appearing to its first result on screen (a cue or the board). Negative means the result came first.                                                                                                                                                                                                                                                                                                                                                                                         |
| settle gap          | Median time from one effect's last result to the next effect's clause.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| max clauses         | Most effect clauses on screen at once.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| active clauses      | Most effect clauses on screen at once that a later clause had not dimmed. Paced effects must keep it at 1.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| RBC                 | Result before cause: effects with a consequence cue (draw flight, burst, pulse, showcase) on screen before their own clause.                                                                                                                                                                                                                                                                                                                                                                                                    |
| ahead fx / ahead ms | Board ahead: effects whose board revision (their first result batch) was on screen while an earlier effect was announced and their own clause was not yet shown, and for how long.                                                                                                                                                                                                                                                                                                                                              |
| dead ms             | Time inside a chain with effects still to announce and nothing on screen: no lit source, no cue, no prompt, no ribbon, no clause younger than 1 s.                                                                                                                                                                                                                                                                                                                                                                              |
| minor               | Share of memory- or DP-only effects (`isMinorEffect`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| min alone           | Shortest time any effect's clause stood alone on screen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| unreadable          | Effects whose clause was readable for less than the minimum readable time: 360 ms to find it plus 4 words at 3 words per second (BBC subtitle rate), scaled by the Effect speed. Readable time is the time the clause was the only active clause plus the time it stayed dimmed in the stack. A clause still on screen when the run ended is not counted. While a prompt is open only the prompt's own clause counts as on screen, as on a desktop board, and the time the prompt shows counts as readable time for its effect. |
| full read           | Share of effects whose clause stayed up long enough to read it in full at 3 words per second.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| prompt delay        | Longest time from a decision reaching the client to its prompt opening.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| stalls              | Presentation gates that ran out their ceiling instead of being released.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Production chains

The `effects-lab-prod-*` scenarios rebuild the hardest trigger chains found in the production logs
(Sep 24–30: 1,552 matches, 31,172 stack chains). The boards hold card ids only.

| Scenario                                  | Logged chain                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| `effects-lab-prod-ghost-execute`          | Execute deletion: 8 [On Deletion] effects in one order prompt, a play from trash       |
| `effects-lab-prod-ghost-execute-security` | The same chain with the bot's [Security] resolving between the attack and deletion     |
| `effects-lab-prod-attack-stack`           | A digivolution attacks at once: 4 [When Attacking] effects, then the bot's watchers    |
| `effects-lab-prod-security-removed`       | Taking a security card wakes 3 watchers; one digivolves, whose [When Digivolving] runs |
| `effects-lab-prod-titan-cascade`          | A hand trash and a play from trash wake 5 effects (8 in the log; see devScenario.ts)   |

Paced, these must show no result before its cause, one active clause, no board ahead, no
unreadable clause and no stall. `pacing.budget.test.ts` lists the gaps still open and holds each
chain under a shown-time ceiling at Normal, per pacing style. `stacked` has one gap:

- `ghost-execute-security`: the [Security] card that places itself is on the board before its
  clause (2 effects, about 4 s).

`sequential` keeps the older gaps: 2 memory-only clauses under the minimum readable time
(`ghost-execute(-security)` Slow), one sound gate run to its ceiling (`ghost-execute-security`
Slow), and in `attack-stack` 2 bot clauses pushed out before readable and one board ahead at
Slow and Fast.

The viewer's next prompt in `attack-stack` still waits 12–19 s (stacked) while the bot's chain
plays out; see the handoff for why it is not opened earlier.

## Stacked speed knobs

`stacked` sets these `PacingConfig` knobs; `sequential` leaves them off.

| Knob                                                    | What it does                                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `minorAnnounceMs`, `minorSettleMs`, `shortSourceHoldMs` | Short beats for a minor effect (memory or DP only).                                            |
| `repeatShortBeats`                                      | An opponent's effect whose card and text already resolved in this chain takes the short beats. |
| `chainTailFrom`, `chainTailPercent`                     | After the chain's first effects, every beat plays at this share of its length.                 |
| `resumeAnnounceMs`                                      | The beat between the viewer's answer and what it did.                                          |
| `clauseReadableMs`                                      | No clause leaves the column, or is hidden by a prompt, before it has been up this long.        |
| `overlapResults`                                        | Off. Lights the next effect while results play; it left clauses unreadable at Slow and Fast.   |

`PACING_ONLY=id,id` narrows `pacing:measure` to some scenarios; it refuses to write the baseline.

### Why not replay the logged matches

A match log holds the seed, both decks and every intent, bot answers included, and the engine is
seeded. Replayed through the engine with the room's start order, 1 of 9 sampled matches rebuilt
all 336 events. The rest diverged: the logs span several deployed versions and card fixes since
then change outcomes (for example BT23-064 now triggers where it did not), and 3 of 12 needed beta
battle deck rules. A replay fixture would also have to carry the seed, the decks and the intents,
which the repository must not hold. So the harness rebuilds the chains as dev scenarios instead.

## Update the baseline on purpose

1. Make the change and run `pacing:measure`. Read the "Against the baseline" lines.
2. If every change is intended, run `pacing:baseline` and commit `pacing-baseline.json` with
   the change. Put the before and after numbers in the commit body.
3. The budget test then holds the new numbers.

## Limits

- The network has no latency, and a React render happens at most every 16 ms.
- A watched cue (a DP pulse, a draw flight from a hand count) is matched to the effect whose
  batch revision it first covers. A pipeline cue uses the batch its step was enqueued for.
- The human's think times are fixed. They move `chain ms`, not `shown ms`.
