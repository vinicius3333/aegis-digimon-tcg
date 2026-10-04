# BT26 and EX13 local training

This development branch trains and runs a local neural bot for all 26 pinned BT26 and EX13 catalog recipes. Metadata includes all 181 registered BT26/EX13 cards, even those absent from the recipes. The previous three-deck checkpoints require their archived runtime; the expanded feature version 7 needs a new model. It uses the real Aegis engine, legal candidate scoring, heuristic demonstrations, imitation learning, and PPO. A frozen checkpoint can play through either the headless evaluator or an opt-in Aegis room. Full deck-mechanic coverage and playing strength remain acceptance work; completed games alone do not prove either.

## Run on the desktop

The provisioned environment is `/home/vinicius/aegis-bot-lab/venv`; the isolated Node 26 environment is `/home/vinicius/aegis-bot-lab/env.sh`. Source the environment and run these commands from a checkout containing this implementation:

```sh
pnpm --filter @aegis/shared build
pnpm --filter @aegis/api build
/home/vinicius/aegis-bot-lab/venv/bin/python tools/bot-training/train.py \
  --worker "$PWD/apps/api/dist/bot/training/cli.js" \
  --output /home/vinicius/aegis-bot-lab/runs/my-new-training-run \
  --device cuda --games 32 --batch-games 8 --seed 260001
```

`--workers N` runs N episodes at once; each batch of `--batch-games` finishes before its PPO update, and every episode samples from its own seeded generator, so results do not depend on thread scheduling. Use four workers for the expanded desktop runs and finish builds/typechecks before starting training. The WSL instance has about 8 GB of RAM; six rollout workers combined with runtime preparation caused worker timeouts and temporary WSL unresponsiveness. `--snapshot-games N` also keeps `checkpoint-<games>.pt` every N trained games for later selection. The collector accepts the same `--workers` option. Every 52-game block visits all 26 learner decks in both seats, then rotates the opponent offset. A full 1,352-game cycle covers every ordered pairing and seat equally.

`collect.py --curriculum` and `train.py --curriculum` opt into 16 complementary learning recipes, for 42 total. Their separate manifest records recipe versions, SHA-256 pins and runtime fingerprint; the worker must deal those exact recipes in the recorded seat order. All 181 BT26/EX13 cards occur in these recipes, using the existing 475-card encoder vocabulary. An 84-game block covers every learner recipe in both seats; 3,528 games cover every ordered pairing and seat. The recipes are learning contexts, not tournament-tuned recommendations. Default training/evaluation still uses the 26 catalog decks, and current room routing accepts those catalog recipes. Recipe inclusion and visible exposure do not prove card activation or improved strength.

Python 3.12 and dependencies are specified in `pyproject.toml`. The existing desktop environment has PyTorch 2.7.1+cu128, NumPy 2.2.6, and Click 8.1.8. Use a new output directory for each run. Checkpoints and logs stay outside Git.

To evaluate without updating the model:

```sh
/home/vinicius/aegis-bot-lab/venv/bin/python tools/bot-training/train.py \
  --worker "$PWD/apps/api/dist/bot/training/cli.js" \
  --output /home/vinicius/aegis-bot-lab/runs/my-new-evaluation \
  --checkpoint /home/vinicius/aegis-bot-lab/runs/my-new-training-run/checkpoint.pt \
  --device cuda --games 32 --seed 380000 --evaluate
```

Evaluation seeds must remain separate from training and model selection. `--checkpoint` without `--evaluate` warm-starts the weights and optimizer for a new seeded run; it does not resume the exact random stream of an interrupted run. Checkpoints require matching engine/card fingerprints and feature versions. The initial experimental checkpoint predates that fingerprint and the second feature schema, so it remains reproducible only with its archived pilot code.

New PPO/evaluation results include learner `actionCoverage`: `offeredWindows` counts each action family at most once per decision window, and `selectedProposals` counts the chosen candidates. Main DNA, Link, App Fusion, Main DigiXros and printed/Blast/Blast DNA Counter remain distinguishable. Opponent decisions are excluded. Only usable episodes contribute to the run aggregate; truncated records keep their partial counts. These are policy proposals, including material subchoices, rather than accepted engine executions. Effect DigiXros material choices still appear as `respondDecision`; these counters alone cannot prove their execution. Historical results without this field contain no such evidence.

## Interface and limits

`createTrainingPolicy` and `createAsyncTrainingPolicy` execute the same legal-action routines. Card selection and ordering use one generator that yields each choice with its prior selections; the synchronous and asynchronous runners differ only in how they obtain the next index. The asynchronous callback receives `(window, signal)` and returns `Promise<number>`. Invalid indices fail explicitly, and aborted requests cannot advance to another selection step.

The bot driver accepts both synchronous `BotPolicy` implementations and `BotPolicy<Intent | Promise<Intent>>`. Asynchronous answers have a configurable `policyTimeoutMs` deadline (1,000 ms by default). Current Main/breeding/decision requests fall back to the heuristic on failure; combat uses its safe response, including a compulsory blocker when required. Stale answers and stale failures are discarded before fallback generation. `inferenceFallbacks` reports timeout/error selections separately from model decisions.

`BotPlayer.dispose()` closes the driver and cancels its pending waits. The match harness and room cleanup call it; late promises cannot act or change a returned match report. Each policy call receives an `AbortSignal`, forwarded through `createAsyncTrainingPolicy` to its model callback. The adapter checks cancellation before advancing any further subchoice. An external worker must honor that signal to stop its own work. The local checkpoint worker is connected through `InferenceClient` and the headless evaluation command below; opt-in room routing is described below. Harness latency samples measure Main policy promises that finish before collection closes; they exclude fallback work and may omit timed-out requests, so they do not establish the end-to-end release latency gates.

- Node owns all intents. Python returns only an action index tied to a fresh decision ID. Invalid, stale, and rejected actions fail explicitly.
- The training bridge starts one fresh Node process per episode. Headless asynchronous inference evaluation instead disposes each match before starting the next and shares one Python scorer across its games. Communication stays within the desktop, rather than crossing Tailscale for each action.
- Main actions use real engine validators, including alternate evolution paths and breeding Main abilities. Combat responses retain all offered alternatives. Blast Counter candidates expose their own visible evolution hosts and ordered field/hand DNA materials, including inherited stacks; printed Counter effects keep their original source and attacker target.
- Card selections and ordering are sequential choices, including an explicit finish choice. Joint cost, DP, color, identity, and name restrictions constrain choices. Impossible completions fail; there is no silent action-list truncation.
- Observations are built with an explicit player-information allowlist. They do not use the client decoder, whose pre-existing warnings remain separate simulator work. The numeric encoder does not use instance-ID strings as features.
- PPO uses variable candidate lists, padding masks, terminal win/loss reward, generalized advantage estimation, clipped updates, entropy, and gradient checks. Truncated episodes are reported separately and currently excluded from updates. Other than the explicit payment-refusal penalty below, error episodes stop the run. Time-limit bootstrapping and a stronger imitation initialization remain work.
- Training disables the production driver's implicit 40-action main-phase cap. The worker has an configurable `--max-decisions` episode limit (default 4,000) and a 60-turn limit. These are truncations, not victories or draws used as rewards.
- Assembly uses the engine recipe predicate across the expanded scope. The original pilot explicitly tested BT26-073, BT26-085, EX9-047, and EX9-055; those witnesses do not prove every new producer. A Main-phase Assembly play is one candidate followed by sequential material windows; an effect-driven play asks the same material windows with an explicit decline. Every offered material still admits a complete recipe under the engine's own predicate, and finishing is legal only with a complete recipe or, where allowed, an empty selection. The Abbadomon recipes require four exact-name materials; policy tests cover both seats, both selection orders, excluded materials, discounted costs, and incomplete recipes. The expanded adapter also offers Main DNA (including both material orders and effective names/levels), hand/field Link, explicit linked-material App Fusion, and Main/effect DigiXros. Tests execute these declarations and preserve cheaper DigiXros alternatives after a failed play. Effect pickers receive authorized material-group quotas. Mind Link remains absent from the scope; a regression gate rejects new producers requiring it. Full per-card effect coverage remains an acceptance gate.

PPO training explicitly enables `forfeitOnCostRefusal`. If the learner refuses a payment for its active hand play and that same deferred play fails for insufficient memory, the training controller surrenders the episode and the trainer assigns the existing terminal loss reward of −1. The original rejection is retained, and `paymentForfeits` is counted separately. Choices are not removed to force payment. Attribution requires the same played card and turn, an observed refusal inside payment, and the matching rejection. A resident payment source must also match the current decision, learner seat, the printed YourTurn/AllTurns timing while the engine is paying play cost, and live permanent/top-card identities; other failures remain fatal. Evaluation, demonstrations, and playable rooms do not enable this controller. A training forfeit is not evidence that the bot can correctly play that action.

Tests cover the information boundary, complete small selection/order trees, joint constraints, actual alternate digivolution, and the Negamon breeding play/transfer. They do not yet prove every effect branch of every scoped card. The encoder now includes 18 public status flags, explicit engine-vocabulary keyword features, security-attack counts, breeding/entry state, per-seat board summaries, and block target kind plus the attacked permanent’s live card state and visible evolution sources. Permitted reveals fill missing identities without replacing live DP or statuses. Observation schema 4 and feature version 6 include permitted history: the latest 64 allowlisted broadcast events and persistent unique card identities seen through public events or the existing filtered observation. Numeric history inputs distinguish recency and acting seat. A separate persistent map retains distinct physical copies from filtered observations and their last observed ownership. The encoder receives own/opponent/unknown-owner card counts, never instance-ID strings or current hidden locations. Repeated observations do not add copies; ownerless reveals preserve known ownership. Events without instance IDs only update card-type knowledge, so copy counts are a lower bound on observed identifiable copies, and event eviction loses older ordering details. Old checkpoints and datasets require their archived encoder/runtime. The next gates are a per-mechanic coverage matrix, initialization from competent demonstrations, reliable greedy checkpoint play, held-out comparisons, and complete validation of the opt-in Aegis integration.

The initial desktop evidence is `/home/vinicius/aegis-bot-lab/runs/2026-09-26-training-pilot/`. A successful pilot or a nonzero weight update is not evidence of a strong policy.

The updated v2 evidence is `/home/vinicius/aegis-bot-lab/runs/2026-09-27-training-v2/`: 16 completed training games, 543 decisions, one win, exact checkpoint reload; greedy evaluation produced seven losses and one decision-limit truncation in eight games. Node 26 build/typecheck, 44 TypeScript tests, and four Python tests passed. A shared-runtime mutation check confirmed fingerprint sensitivity. See the [training plan](../../docs/plans/2026-09-26-local-bot-training-design.md) for source hashes and remaining acceptance gates.

Feature version 7 adds the three new action types and ordered compound-material identities, live card state and inherited stacks. It intentionally invalidates older checkpoints. Keyword vocabulary and public-status field order are recorded in worker metadata; unexpected keywords fail explicitly. Observation schema 4 uses only permitted history, public engine projections and the existing authorized card-identity boundary. These changes improve the information available for decisions; they do not establish that the model has learned good decisions.

## Demonstrations and imitation initialization

Collect trajectories from the existing balanced heuristic through the same complete candidate interface:

```sh
/home/vinicius/aegis-bot-lab/venv/bin/python tools/bot-training/collect.py \
  --worker "$PWD/apps/api/dist/bot/training/cli.js" \
  --output /home/vinicius/aegis-bot-lab/runs/my-demonstrations \
  --games 80 --seed 410000
/home/vinicius/aegis-bot-lab/venv/bin/python tools/bot-training/imitate.py \
  --dataset /home/vinicius/aegis-bot-lab/runs/my-demonstrations \
  --output /home/vinicius/aegis-bot-lab/runs/my-imitation \
  --device cuda --epochs 20 --seed 420000
```

Teacher mode adds a label, never removes legal actions. If the heuristic's intended action has no legal match, the collector records an unavailable label, executes the first legal action to continue the episode, and excludes that choice from supervision. These fallbacks remain in the dataset for diagnosis; they are not claimed as competent demonstrations. Incomplete episodes retain `.partial` files and are excluded from training.

Imitation uses cross-entropy over the same masked candidate scorer. Every fifth complete episode by its original collection index belongs to validation; no decisions from that episode enter training. Single-action windows are omitted from the loss and accuracy metrics. Checkpoint selection uses validation loss, and the configuration records the exact SHA-256 of each input file. Validation accuracy measures agreement with this heuristic, not match win rate or human strength. Teacher labels are excluded from model features and are absent during ordinary PPO/evaluation. Evaluate the resulting `checkpoint.pt` using the command above on separate seeds; use it with PPO's `--checkpoint` to continue training.

Encoded imitation features are stored in `encoded-samples.f32` and accessed through read-only memory maps. The full expanded cycle would occupy roughly 7 GB if all features stayed in RAM; optimization now copies only its current batch. The cache is reproducible from the hashed source episodes and encoder. Configuration records cache size and trainer/encoder/model implementation hashes. A frozen baseline comparison reproduces all epoch metrics and the selected model/optimizer tensors exactly after this storage change.

The first imitation run is archived under `/home/vinicius/aegis-bot-lab/runs/2026-09-27-training-v4/`: 80 complete demonstration games, 4,097 decisions, zero missing teacher labels; 64/16 episode split; 75.2% validation agreement after 20 epochs. Its checkpoint won four of 16 separate development-evaluation games, with all games completing. PPO successfully continued from it and reloaded the updated checkpoint exactly. These small runs do not meet the release strength or full-coverage gates.

## Evaluate through the asynchronous checkpoint worker

After building the exact runtime used to produce the checkpoint:

```sh
node apps/api/dist/bot/training/inferenceCli.js \
  --python /home/vinicius/aegis-bot-lab/venv/bin/python \
  --checkpoint /home/vinicius/aegis-bot-lab/runs/my-imitation/checkpoint.pt \
  --output /home/vinicius/aegis-bot-lab/runs/my-async-evaluation \
  --games 16 --seed 890000 --max-decisions 512
```

This loads a persistent local CPU scorer and connects its greedy choices to `createAsyncTrainingPolicy`. The current schedule covers every learner deck in both seats each 52 games and all ordered pairings each 1,352 games. No teacher labels or heuristic choices enter successful model requests. The scorer validates the feature version and finite parameters; the client checks the complete runtime/deck metadata before any match begins. Checkpoints from another runtime fail explicitly.

Requests have unique IDs, bounded frames and queue size, and validated candidate indices. Cancellation rejects queued work immediately and discards the active request's late answer; a two-second worker deadline kills an unresponsive process. The driver's one-second policy deadline remains in force, and evaluation fails if it uses any timeout/error fallback. The worker closes when evaluation finishes or fails.

`config.json` records the checkpoint hash and runtime metadata. `results.json` records completed games, decision/turn-limit truncations, engine failures, rejected actions, and fallback counts separately. A rules-defined draw is terminal even without a winner. Per-query latency includes serialization and Python scoring, but excludes observation construction and the remainder of a multi-choice policy decision; it does not prove the release end-to-end latency gates. The decision budget bounds repeated legal-action loops without removing candidates or inventing a move.

The v10 desktop run is archived at `/home/vinicius/aegis-bot-lab/runs/2026-09-27-training-v10-inference-final`, with its matching checkout under `checkouts/bt26-training-v10-inference-final`. It collected 80 complete games and 4,307 demonstrations, trained on CUDA, and completed 16 CPU inference matches with seven wins, nine losses, 1,058 choices, and no rejected actions, errors, fallback, or truncation. A separate one-decision-budget run verified cancellation. This is a working checkpoint integration, not proof of exhaustive deck coverage or superior play.

## Opt-in playable room integration

After building and training against the same checkout, configure the API process:

```sh
AEGIS_BOT_PYTHON=/home/vinicius/aegis-bot-lab/venv/bin/python \
AEGIS_BOT_CHECKPOINT=/absolute/path/to/matching/checkpoint.pt \
pnpm --filter @aegis/api start
```

In Aegis, select pinned BT26 or EX13 catalog lists for yourself and the bot opponent, using a checkpoint built for the expanded runtime. A matching room names the opponent **BT26 AI**. Exact card counts determine eligibility; deck order and artwork do not. Both decks must match the supported lists. Unsupported matchups, developer scenarios, and tournament bots keep their existing policies. Without `AEGIS_BOT_CHECKPOINT`, behavior is unchanged.

The API loads one CPU scorer before listening and closes it on shutdown. A configured incompatible checkpoint fails startup explicitly. Rooms share its bounded request queue; disposing one room cancels its requests without closing the scorer used by others. The driver retains normal presentation pacing, its one-second answer deadline, and its existing 40-action Main-phase safety limit. Timeout/worker errors use the existing fallback. A rejected model action disables neural choices for the remainder of that match. Because asynchronous engine rejection events currently lack a responsible seat, any such event conservatively disables the room's trained policy. These fallbacks protect a playable match; they do not count as learned action coverage.

This is opt-in server support. No production environment or deployment is changed by this branch.

Verify all pinned bot recipes through the matching built room runtime:

```sh
node tools/bot-training/room-smoke.mjs \
  --python /home/vinicius/aegis-bot-lab/venv/bin/python \
  --checkpoint /absolute/path/to/matching/checkpoint.pt \
  --output /home/vinicius/aegis-bot-lab/runs/my-room-verification \
  --games 26 --seed 6025000
```

The verifier creates each Aegis room through an isolated local Colyseus matchmaker and seats the checkpoint bot through `addBot`, with normal presentation pacing, policy deadlines and Main-action limits. A scripted heuristic drives the human seat through the room's intent and private-decision channels; human decks rotate against each pinned bot recipe. Results include checkpoint/runtime hashes, terminal outcomes, model queries, selected action families, latency samples, synchronous refused intents, asynchronous rejection events and fallback counts. It verifies the finished-room lock and framework disposal/deregistration before writing results. Any rejection, fallback, match deadline or lifecycle failure stops the run with partial evidence preserved. This checks the in-process room boundary; it does not exercise browser/WebSocket transport or prove per-card tactical coverage. Use a fresh output directory for every run.

The matching v11 checkpoint is `/home/vinicius/aegis-bot-lab/runs/2026-09-27-training-v11-room-inference/imitation/checkpoint.pt`; use it with `/home/vinicius/aegis-bot-lab/checkouts/bt26-training-v11-room-inference-final`. That runtime passed 179 focused tests and a complete real-room match with 32 model queries, no rejected actions, and no fallback. The room smoke used a scripted human-side opponent and normal bot pacing; browser UI validation and exhaustive action coverage remain open.

The corrected DUAL runtime and v12 checkpoint are archived under `checkouts/bt26-training-v12-dual-training` and `runs/2026-09-27-training-v12-dual-attached`. It collected 80 complete games (4,073 decisions), trained on CUDA, and completed 16 development inference games with ten wins and no errors, rejection, fallback, or truncation. Use that exact archived runtime with its `imitation/checkpoint.pt`; later builds can have a different fingerprint even after test-only changes. Its separate 1,000-game reliability run completed with 57,445 model decisions and no errors, rejection, fallback, or truncation. It won 432 games (43.2%), so stronger play remains unproven. Detailed seed, fingerprint, and matchup evidence is in the training plan.

Keep the SSH/WSL session attached while running desktop jobs. A detached shell was stopped when WSL closed, leaving a partial episode despite an exit-code file. Verify expected episode counts and checkpoint/evaluation artifacts, not just process exit status.

The last completed three-deck desktop run is `/home/vinicius/aegis-bot-lab/runs/2026-10-03-league-v5-main`, with matching runtime `checkouts/bt26-2026-10-03-e4f87c606` (version 1.9.0-beta). It warm-started from league v4 and completed another 1,008 CUDA PPO games; its checkpoint is `ppo/checkpoint.pt`. The 36-game asynchronous inference check completed without errors or fallbacks. The larger evaluations recorded two failed episodes and one decision-limit truncation; see the [training plan](../../docs/plans/2026-09-26-local-bot-training-design.md#main-refresh-and-resumed-league-2026-10-03) for exact results, seeds, hashes, and remaining reliability issues.

The expanded scope and acceptance gates are tracked in the [BT26/EX13 design](../../docs/plans/2026-10-03-bt26-ex13-bot-design.md). No expanded-scope strength or release claim follows from the historical three-deck results.
