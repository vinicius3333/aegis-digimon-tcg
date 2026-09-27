# BT26 local training pilot

This development pilot trains and runs a local neural bot for the pinned BT26 Glowing Dawn and Abbadomon lists. It uses the real Aegis engine, legal candidate scoring, heuristic demonstrations, imitation learning, and PPO. A frozen checkpoint can play through either the headless evaluator or an opt-in Aegis room. Full deck-mechanic coverage and playing strength remain acceptance work; completed games alone do not prove either.

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

## Interface and limits

`createTrainingPolicy` and `createAsyncTrainingPolicy` execute the same legal-action routines. Card selection and ordering use one generator that yields each choice with its prior selections; the synchronous and asynchronous runners differ only in how they obtain the next index. The asynchronous callback receives `(window, signal)` and returns `Promise<number>`. Invalid indices fail explicitly, and aborted requests cannot advance to another selection step.

The bot driver accepts both synchronous `BotPolicy` implementations and `BotPolicy<Intent | Promise<Intent>>`. Asynchronous answers have a configurable `policyTimeoutMs` deadline (1,000 ms by default). Current Main/breeding/decision requests fall back to the heuristic on failure; combat uses its safe response, including a compulsory blocker when required. Stale answers and stale failures are discarded before fallback generation. `inferenceFallbacks` reports timeout/error selections separately from model decisions.

`BotPlayer.dispose()` closes the driver and cancels its pending waits. The match harness and room cleanup call it; late promises cannot act or change a returned match report. Each policy call receives an `AbortSignal`, forwarded through `createAsyncTrainingPolicy` to its model callback. The adapter checks cancellation before advancing any further subchoice. An external worker must honor that signal to stop its own work. The local checkpoint worker is connected through `InferenceClient` and the headless evaluation command below; opt-in room routing is described below. Harness latency samples measure Main policy promises that finish before collection closes; they exclude fallback work and may omit timed-out requests, so they do not establish the end-to-end release latency gates.

- Node owns all intents. Python returns only an action index tied to a fresh decision ID. Invalid, stale, and rejected actions fail explicitly.
- The training bridge starts one fresh Node process per episode. Headless asynchronous inference evaluation instead disposes each match before starting the next and shares one Python scorer across its games. Communication stays within the desktop, rather than crossing Tailscale for each action.
- Main actions use real engine validators, including alternate evolution paths and breeding Main abilities. Combat responses retain all offered alternatives.
- Card selections and ordering are sequential choices, including an explicit finish choice. Joint cost, DP, color, identity, and name restrictions constrain choices. Impossible completions fail; there is no silent action-list truncation.
- Observations are built with an explicit player-information allowlist. They do not use the client decoder, whose pre-existing warnings remain separate simulator work. The numeric encoder does not use instance-ID strings as features.
- PPO uses variable candidate lists, padding masks, terminal win/loss reward, generalized advantage estimation, clipped updates, entropy, and gradient checks. Truncated episodes are reported separately and currently excluded from updates; error episodes stop the run. Time-limit bootstrapping and a stronger imitation initialization remain work.
- Training disables the production driver's implicit 40-action main-phase cap. The worker has an configurable `--max-decisions` episode limit (default 4,000) and a 60-turn limit. These are truncations, not victories or draws used as rewards.
- The scoped lists currently require no DNA, DigiXros, Assembly, App Fusion, Link, or Mind Link declarations. A regression gate checks their compiled requirements. These families are not supported by the pilot; changing the scope requires implementing them, not dropping cards or substituting easier decks.

Tests cover the information boundary, complete small selection/order trees, joint constraints, actual alternate digivolution, and the Negamon breeding play/transfer. They do not yet prove every effect branch of every scoped card. The encoder now includes 18 public status flags, explicit engine-vocabulary keyword features, security-attack counts, breeding/entry state, per-seat board summaries, and block target kind plus the attacked permanent’s live card state and visible evolution sources. Permitted reveals fill missing identities without replacing live DP or statuses. Feature version 4 adds the attacked permanent; older checkpoints and datasets require their archived encoder/runtime. Persistent reveal history remains observation-coverage work. The next gates are a per-mechanic coverage matrix, initialization from competent demonstrations, reliable greedy checkpoint play, held-out comparisons, and complete validation of the opt-in Aegis integration.

The initial desktop evidence is `/home/vinicius/aegis-bot-lab/runs/2026-09-26-training-pilot/`. A successful pilot or a nonzero weight update is not evidence of a strong policy.

The updated v2 evidence is `/home/vinicius/aegis-bot-lab/runs/2026-09-27-training-v2/`: 16 completed training games, 543 decisions, one win, exact checkpoint reload; greedy evaluation produced seven losses and one decision-limit truncation in eight games. Node 26 build/typecheck, 44 TypeScript tests, and four Python tests passed. A shared-runtime mutation check confirmed fingerprint sensitivity. See the [training plan](../../docs/plans/2026-09-26-local-bot-training-design.md) for source hashes and remaining acceptance gates.

Feature schema 3 intentionally invalidates older checkpoints. Keyword vocabulary and public-status field order are recorded in worker metadata; unexpected keywords fail explicitly. Observation schema 2 uses only public engine projections and the existing authorized card-identity boundary. These changes improve the information available for decisions; they do not establish that the model has learned good decisions.

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

This loads a persistent local CPU scorer and connects its greedy choices to `createAsyncTrainingPolicy`. It covers both learner seats and all four deck pairings in each eight-game block. No teacher labels or heuristic choices enter successful model requests. The scorer validates the feature version and finite parameters; the client checks the complete runtime/deck metadata before any match begins. Checkpoints from another runtime fail explicitly.

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

In Aegis, select either pinned BT26 Glowing Dawn or Abbadomon list for yourself and choose one of those presets as the bot opponent. A matching room names the opponent **BT26 AI**. Exact card counts determine eligibility; deck order and artwork do not. Both decks must match the supported lists. Unsupported matchups, developer scenarios, and tournament bots keep their existing policies. Without `AEGIS_BOT_CHECKPOINT`, behavior is unchanged.

The API loads one CPU scorer before listening and closes it on shutdown. A configured incompatible checkpoint fails startup explicitly. Rooms share its bounded request queue; disposing one room cancels its requests without closing the scorer used by others. The driver retains normal presentation pacing, its one-second answer deadline, and its existing 40-action Main-phase safety limit. Timeout/worker errors use the existing fallback. A rejected model action disables neural choices for the remainder of that match. Because asynchronous engine rejection events currently lack a responsible seat, any such event conservatively disables the room's trained policy. These fallbacks protect a playable match; they do not count as learned action coverage.

This is opt-in server support. No production environment or deployment is changed by this branch.

The matching v11 checkpoint is `/home/vinicius/aegis-bot-lab/runs/2026-09-27-training-v11-room-inference/imitation/checkpoint.pt`; use it with `/home/vinicius/aegis-bot-lab/checkouts/bt26-training-v11-room-inference-final`. That runtime passed 179 focused tests and a complete real-room match with 32 model queries, no rejected actions, and no fallback. The room smoke used a scripted human-side opponent and normal bot pacing; browser UI validation and exhaustive action coverage remain open.
