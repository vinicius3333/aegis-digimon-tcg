# BT26 local training pilot

This is an executable development pilot, not the completed strong bot. It uses the real Aegis engine with the pinned BT26 Glowing Dawn and Abbadomon lists, a Python/PyTorch candidate scorer, and PPO against the frozen heuristic. The first desktop CUDA run completed 16 games and 550 learner decisions; its checkpoint reloaded exactly. It won only one game. A greedy evaluation subsequently exposed a repeated legal action/decline loop. Playing strength and full deck-mechanic coverage remain acceptance work.

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

- Node owns all intents. Python returns only an action index tied to a fresh decision ID. Invalid, stale, and rejected actions fail explicitly.
- One Node process owns one episode. Reset starts a fresh process; process teardown cancels pending engine work. Communication stays within the desktop, rather than crossing Tailscale for each action.
- Main actions use real engine validators, including alternate evolution paths and breeding Main abilities. Combat responses retain all offered alternatives.
- Card selections and ordering are sequential choices, including an explicit finish choice. Joint cost, DP, color, identity, and name restrictions constrain choices. Impossible completions fail; there is no silent action-list truncation.
- Observations are built with an explicit player-information allowlist. They do not use the client decoder, whose pre-existing warnings remain separate simulator work. The numeric encoder does not use instance-ID strings as features.
- PPO uses variable candidate lists, padding masks, terminal win/loss reward, generalized advantage estimation, clipped updates, entropy, and gradient checks. Truncated episodes are reported separately and currently excluded from updates; error episodes stop the run. Time-limit bootstrapping and a stronger imitation initialization remain work.
- Training disables the production driver's implicit 40-action main-phase cap. The worker has an configurable `--max-decisions` episode limit (default 4,000) and a 60-turn limit. These are truncations, not victories or draws used as rewards.
- The scoped lists currently require no DNA, DigiXros, Assembly, App Fusion, Link, or Mind Link declarations. A regression gate checks their compiled requirements. These families are not supported by the pilot; changing the scope requires implementing them, not dropping cards or substituting easier decks.

Tests cover the information boundary, complete small selection/order trees, joint constraints, actual alternate digivolution, and the Negamon breeding play/transfer. They do not yet prove every effect branch of every scoped card. The encoder now includes 18 public status flags, explicit engine-vocabulary keyword features, security-attack counts, breeding/entry state, per-seat board summaries, and block target kind. Permitted reveals fill missing identities without replacing live DP or statuses. Persistent reveal history and the specific attacked permanent still remain observation-coverage work. The next gates are a per-mechanic coverage matrix, initialization from competent demonstrations, reliable greedy checkpoint play, held-out comparisons, and an opt-in Aegis inference integration.

The initial desktop evidence is `/home/vinicius/aegis-bot-lab/runs/2026-09-26-training-pilot/`. A successful pilot or a nonzero weight update is not evidence of a strong policy.

The updated v2 evidence is `/home/vinicius/aegis-bot-lab/runs/2026-09-27-training-v2/`: 16 completed training games, 543 decisions, one win, exact checkpoint reload; greedy evaluation produced seven losses and one decision-limit truncation in eight games. Node 26 build/typecheck, 44 TypeScript tests, and four Python tests passed. A shared-runtime mutation check confirmed fingerprint sensitivity. See the [training plan](../../docs/plans/2026-09-26-local-bot-training-design.md) for source hashes and remaining acceptance gates.

Feature schema 3 intentionally invalidates older checkpoints. Keyword vocabulary and public-status field order are recorded in worker metadata; unexpected keywords fail explicitly. Observation schema 2 uses only public engine projections and the existing authorized card-identity boundary. These changes improve the information available for decisions; they do not establish that the model has learned good decisions.
