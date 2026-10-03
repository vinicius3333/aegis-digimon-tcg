# Pacing harness

The harness measures how the match screen paces triggered effects. It plays each effects-lab
scenario on the real server and the real client cue pipeline, on one fake clock. A full run
contains 119 rows and typically takes about a minute. Its fake-clock measurements are deterministic.
The interactive effects lab always uses the match's stacked timing and ignores obsolete saved
tuning. Alternative pacing styles remain harness comparisons; the lab retains speed controls.

## How it works

- `scenarioRoom.ts` hosts the real `AegisRoom` in-process: engine, dev scenario, bot seat with
  its real think delays, batch envelope, per-seat StateView and the 50 ms patch tick. A fake
  client decodes every state frame, so the viewer gets the same redacted board as in production.
  The client declares its pacing on join, as the real client does, so a bot follows a
  `sequential` client's chain pacing. Every pacing style joins as `sequential`.
- `runScenario.ts` feeds what the socket delivered into `useMatchCues` every 16 ms, as `useRoom`
  does, and samples the screen. The viewer plays the scenario's moves when the screen is idle
  (800 ms later) and answers a prompt 1000 ms after it opens. The screen's `visibleBoard`
  projection applies arrival, reveal, deletion, draw, rotation and readout holds to each frame.
  Public DP snapshots also attribute changes to the exact effect-owned batch, even when the
  engine emits no result event; a newly evolved top's base DP remains part of its arrival.
  Hidden hand draws use their batch's authoritative public target count, so an earlier turn
  draw cannot impersonate a later effect. A replayed card uses its newly created permanent.
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
| ahead fx / ahead ms | Board ahead: effects whose physical field, pile or readout result appeared before their clause while an earlier effect was announced. Public movements use exact identities and visible transitions; results without public identities retain the revision check.                                                                                                                                                                                                                                                               |
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

The budget requires every paced production chain to show one active clause, no result before
its cause, no board ahead, no unreadable clause and no gate expiry. There are no known-gap
allowances. Each chain also has a shown-time ceiling at Normal, per pacing style.

The complete 119-row verification measured these Normal shown times, excluding viewer think time.
Every paced row had zero early results, unreadable or missing clauses, gate expiries and budget rescues.

| Scenario suffix          | Sequential shown / ceiling (ms) | Stacked shown / ceiling (ms) |
| ------------------------ | ------------------------------: | ---------------------------: |
| `ghost-execute`          |                 51,312 / 59,000 |              42,272 / 49,000 |
| `ghost-execute-security` |                 57,616 / 66,000 |              48,592 / 55,000 |
| `attack-stack`           |                 40,496 / 51,000 |              26,208 / 36,000 |
| `security-removed`       |                 14,480 / 16,000 |              11,328 / 13,000 |
| `titan-cascade`          |                 17,360 / 23,000 |              11,936 / 17,000 |

The ceilings allow approximately 10% headroom, rounded for clarity. Some rise above the old
ceilings because each clause now gets a safe headline reading floor, exact physical sources
receive their focus before printed source costs, and resumed clauses precede the results of
the viewer's answer. Field arrivals, hand counts, DP and memory also wait for their own clause.
These longer sequences retain strict zero-failure invariants; the duration allowance cannot
authorize an early result or a rescued gate.

The 2026-10-03 refresh gives visible toasts their own arrival clock, including during
questions. Field deletions use 260 ms shard motion plus 90 ms spread (350 ms total), and
paced cause gates no longer add a second 800 ms reading beat. Source focus, card travel,
reading floors and consent checks remain covered by the matrix. Real browser movement,
paused/hidden calibration and full shard/ring completion are covered by the
[Orca live-motion harness](../../src/dev/LIVE_MOTION.md).

Source focus holds for 720 ms at Normal in both styles, including minor, repeated and late
effects. Effect speed still scales this orientation beat, but chain-tail acceleration only
shortens clause and settle beats. The regression samples three actual field-source lifetimes
at every speed and verifies that the first draw starts within the reference pace. Stacked
Normal waits 200 ms between its clause and results, then rests 100 ms after results complete.
The resulting 920 ms common field lead-in approximates DCGO without shortening visual result
durations or retained text lifetimes. Sounds and arrivals waiting on a unit's announcement use that announcement's
own safety ceiling, so a longer source focus after a Security reveal does not release them early.

The matrix includes a confirmed opponent hand play and On Play, Giromon's block trigger chain,
and two explicit King Drasil runs: accept
both watchers after playing Dracmon, or decline both. Their end conditions assert the actual
sources' suspension states, so the declined run cannot pass merely by omitting every effect.

The original chain timing columns remain comparable with historical reports. Additional
columns cover all effects, including isolated effects: `all fx`, `single fx`, `missing`,
`all unreadable` and `all early results`. A refused whole effect without a mandatory result
does not require a toast. Initial activation questions use the engine's `effectKey`, physical
source and `activationConfirmation` provenance; optional operations inside an already active
effect do not suppress its existing clause.

Printed Delay departures and source-suspension payments ("by suspending this" or "may suspend
this … to") are attributed to the
exact physical source. They may precede the toast only after that source receives focus;
moving or suspending another permanent remains a result. `cost before focus` checks this order.

`failed steps`, `dropped steps`, `pending steps`, `board rescues`, `prompt rescues` and
`prompt stalls` distinguish actual completion from silently discarded cues or budget rescue.
The measurement suites restore their gate-expiry exemption afterwards, so it cannot disable
the normal suite's gate checks.

## Stacked speed knobs

`stacked` sets these `PacingConfig` knobs; `sequential` leaves them off.

| Knob                                                    | What it does                                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `minorAnnounceMs`, `minorSettleMs`, `shortSourceHoldMs` | Minor clause and settle beats; the source hold remains 720 ms at Normal.                       |
| `repeatShortBeats`                                      | An opponent's effect whose card and text already resolved in this chain takes the short beats. |
| `chainTailFrom`, `chainTailPercent`                     | After the chain's first effects, clause and settle beats play at this share of their length.   |
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
2. If every change is intended and all paced invariants pass, run `pacing:baseline` and commit `pacing-baseline.json` with
   the change. Put the before and after numbers in the commit body.
3. The budget test then holds the new numbers.

Baseline refresh refuses filtered runs, timeouts and failures in paced announcements,
readability, result order, consent, queue completion, gates or rescue counters. A new baseline
cannot turn those failures into accepted budgets.

## Limits

- The network has no latency, and a React render happens at most every 16 ms.
- A watched cue (a DP pulse, a draw flight from a hand count) is matched to the effect whose
  batch revision it first covers. A pipeline cue uses the batch its step was enqueued for.
- An implicit printed DP change requires one effect owner per authoritative batch. A batch
  with several possible owners fails measurement; a future fixture must supply separate
  snapshots or an authoritative result event that establishes ownership.
- The human's think times are fixed. They move `chain ms`, not `shown ms`.
- Fixed timing can miss a wait cycle that real browser timing closes (a start-of-main
  chain froze every track in Chromium). `e2e/effects-lab-pacing.spec.ts` covers that in a
  real browser; run it with `pnpm --filter @aegis/web test:browser effects-lab-pacing.spec.ts`.
  Its matrix covers the fixed stacked timing on desktop, phone and reduced motion, including
  obsolete saved tuning; it observes the actual room state, visible field, queue completion,
  painted notice identities and each field source's real focus duration. Separate
  accepted/declined Drasil cases assert no source focus or toast before consent and a confirmed
  hand-card flight followed by its field landing. The eight cases also include opponent hand-play
  flight, landing, focus and On Play order on desktop and phone, with screenshot artifacts.
