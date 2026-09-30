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

| Column              | Meaning                                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fx                  | Effects (units) in the scenario's chains. A unit runs from `effectTriggered` to its `effectResolved`.                                                                                                                                                                                                                                                     |
| chain ms            | Sum over chains: first clause or result on screen to the moment the screen is idle again.                                                                                                                                                                                                                                                                 |
| shown ms            | `chain ms` less the time a prompt stood open for the viewer's answer. The budget uses this.                                                                                                                                                                                                                                                               |
| ann→res             | Median time from an effect's clause appearing to its first result on screen (a cue or the board). Negative means the result came first.                                                                                                                                                                                                                   |
| settle gap          | Median time from one effect's last result to the next effect's clause.                                                                                                                                                                                                                                                                                    |
| max clauses         | Most effect clauses on screen at once.                                                                                                                                                                                                                                                                                                                    |
| active clauses      | Most effect clauses on screen at once that a later clause had not dimmed. Paced effects must keep it at 1.                                                                                                                                                                                                                                                |
| RBC                 | Result before cause: effects with a consequence cue (draw flight, burst, pulse, showcase) on screen before their own clause.                                                                                                                                                                                                                              |
| ahead fx / ahead ms | Board ahead: effects whose board revision (their first result batch) was on screen while an earlier effect was announced and their own clause was not yet shown, and for how long.                                                                                                                                                                        |
| dead ms             | Time inside a chain with effects still to announce and nothing on screen: no lit source, no cue, no prompt, no ribbon, no clause younger than 1 s.                                                                                                                                                                                                        |
| minor               | Share of memory- or DP-only effects (`isMinorEffect`).                                                                                                                                                                                                                                                                                                    |
| min alone           | Shortest time any effect's clause stood alone on screen.                                                                                                                                                                                                                                                                                                  |
| unreadable          | Effects whose clause was readable for less than the minimum readable time: 360 ms to find it plus 4 words at 3 words per second (BBC subtitle rate), scaled by the Effect speed. Readable time is the time the clause was the only active clause plus the time it stayed dimmed in the stack. A clause still on screen when the run ended is not counted. |
| full read           | Share of effects whose clause stayed up long enough to read it in full at 3 words per second.                                                                                                                                                                                                                                                             |
| prompt delay        | Longest time from a decision reaching the client to its prompt opening.                                                                                                                                                                                                                                                                                   |
| stalls              | Presentation gates that ran out their ceiling instead of being released.                                                                                                                                                                                                                                                                                  |

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
