# Local bot training plan for Aegis

Date: 2026-09-26. Inspected baseline: `cae5c3f8b`; desktop validation revision: `0fc8fef8c`. Status: the decision adapter and compact PyTorch/PPO pilot are implemented and have trained on the desktop GPU. Full action/observation coverage, playing strength, and product integration remain incomplete.

The user chose **a strong bot for a few decks first** and authorized testing on the desktop over Tailscale. Train Digimon-specific weights against the Aegis engine, using YGO Agent, Cardsformer, and gym-locm as architectural references. The first release must demonstrate an improvement over the current bot on the selected decks. That result would not establish full-catalog coverage or competitive human-level play.

## Decision and alternatives

| Approach                                                         | Benefit                                                                    | Cost or limitation                                                                               | Decision                                     |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Compact learned policy, legal-action masks, and varied opponents | Uses the existing engine, supports measurable learning and local inference | Requires a training environment and complete decision coverage                                   | Recommended                                  |
| Search over action sequences with a heuristic evaluator          | Can improve planning without a training dataset                            | Cloning an asynchronous engine with pending choices and hidden information adds substantial work | Later experiment, after measuring the policy |
| Local LLM selecting actions                                      | Quick experiment and textual explanations                                  | Uncertain latency and playing strength; validation and evaluation still required                 | Outside the first release                    |

### What to take from each project

- **YGO Agent:** represent cards, context, and candidate actions; score each candidate against the current state and mask unavailable actions. Its [model](https://github.com/sbl1996/ygo-agent/blob/main/ygoai/rl/jax/agent.py) also uses history and supports recurrent networks. Start without recurrence and add it only if measurements justify it. Its [embedding script](https://github.com/sbl1996/ygo-agent/blob/main/scripts/card/embedding.py) calls Voyage API; Aegis should use structured attributes and optionally generate its own embeddings locally.
- **Cardsformer:** test card text alongside structured attributes, inspired by its [encoder](https://github.com/WannianXia/Cardsformer/blob/main/Algo/encoder.py) and [policy](https://github.com/WannianXia/Cardsformer/blob/main/Model/PolicyModel.py). Initially, text is an optional comparison using frozen, cached vectors. Auxiliary state prediction is deferred. Do not copy implementation or weights without an identified reuse license.
- **gym-locm:** separate environment, training, and evaluation; combine masked actions, fixed opponents, and previous policy versions, as in its [battle trainer](https://github.com/ronaldosvieira/gym-locm/blob/master/gym_locm/toolbox/trainer_battle.py). Its published draft models are not Digimon battle policies.

These projects do not plug directly into one another. YGO Agent declares MIT and Apache-2.0 notices for components; gym-locm declares MIT. Cardsformer is a conceptual reference in this plan. See [the research note](../research-local-tcg-bot.md) for evidence and limitations.

## Deck scope

1. **Infrastructure validation:** use `RED_DECK` and `BLUE_DECK` from [testDecks.ts](../../apps/api/src/engine/testDecks.ts). These are simple test decks, not competitive lists. Compare the new environment with the existing harness.
2. **First useful training run:** the user selected BT26 as the starting format. Use `bt26-dgo-2026-09-05-1-glowing-dawn@1` and `bt26-dgo-2026-09-05-2-abbadomon@1` from the [BT26 catalog](../../packages/shared/src/decks/data/bt26.json), including their cards from earlier sets. Confirm resolved versions, legality, and complete action coverage before freezing the manifest.
3. **Controlled expansion:** add a third and fourth BT26-format list after the first comparison. Include cross-deck matchups and mirrors. Evaluate a deck never used for training separately as a generalization experiment.

These are concrete candidate lists, not a coverage certification. Extend the adapter to support their mechanics; do not replace these lists with easier decks to pass coverage. Registered card effects do not establish that the bot can select every required action. “100% of actions” means every legal action and decision required by the scoped decks is selectable, independently of whether the trained model chooses the strongest move.

## Existing components and required changes

| Existing component                                     | Reuse                                     | Required work                                                                                                        |
| ------------------------------------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [BotPolicy](../../apps/api/src/bot/policy.ts)          | Separates strategy from the driver        | Support asynchronous inference while preserving synchronous policies                                                 |
| [BotPlayer](../../apps/api/src/bot/BotPlayer.ts)       | Routes decisions and events               | Cancellable waits, deadlines, and stale-response checks in every decision window                                     |
| [BotView](../../apps/api/src/bot/view.ts)              | Initial player-information boundary       | More complete public stacks, zones, statuses, effects, and observable history                                        |
| [candidates.ts](../../apps/api/src/bot/candidates.ts)  | Initial main-phase action representation  | Engine-authoritative legality and coverage; reconstructed candidates currently omit some actions and can be rejected |
| [matchHarness](../../apps/api/src/bot/matchHarness.ts) | Real seeded matches, results, and metrics | Decision-level stepping, separate termination/truncation, and trajectory recording                                   |
| [benchmark](../../apps/api/src/bot/benchmark.test.ts)  | Reproducible current-bot comparison       | Deck matrix, end-to-end timing, uncertainty estimates, and reserved final evaluation                                 |

The candidate generator does not cover every catalog mechanic; the [meta-deck module](../../apps/api/src/bot/metaDecks/index.ts) explicitly notes missing DigiXros support. Filtering current candidates cannot recover actions that were never enumerated. Share engine validators and projections without speculatively executing actions against a live match.

## Proposed architecture

```mermaid
flowchart LR
    E[Aegis engine in Node] --> O[Player observation and legal candidates]
    O --> B[Local decision bridge]
    B --> P[Python/PyTorch policy]
    P --> A[Selected action identifier]
    A --> E
    E --> T[Trajectories and outcomes]
    T --> L[Training on RTX 4070]
    L --> C[Versioned checkpoint]
    C --> P
```

Run simulation, collection, and training inside the same WSL environment, avoiding a Tailscale round trip per move. Use Tailscale/SSH to transfer a pinned revision, launch jobs, and retrieve results. Test production inference on the intended deployment hardware too; the desktop should not become a permanent dependency of online matches.

### Environment and protocol

Build a sequential two-player adapter inspired by [PettingZoo AEC](https://pettingzoo.farama.org/api/aec/), exposing `reset(seed, deckManifest)`, `observe(seat)`, `step(decisionId, actionId)`, and `close()`. A step advances to the next decision for either player or the end of the match. One action is not one turn: the same player may act repeatedly, and the opponent may respond during that turn.

Start with versioned JSON messages over local pipes. Include `episodeId`, `decisionId`, the acting player, observation, candidates, and mask. Node owns the private mapping from opaque action identifiers to `Intent`. The model selects an identifier instead of inventing command fields. An old response must never act on a new episode or decision window.

Cover breeding, main-phase actions, effect choices and ordering, target subsets, costs, and combat responses. Include setup and mulligan where the engine exposes them. Represent combinatorial choices as constrained subdecisions with an explicit finish action, enforcing minimum/maximum counts and joint restrictions. Do not enumerate unlimited subsets or treat invalid combinations as legal actions.

First implement a Gymnasium wrapper against a frozen opponent: after the learner acts, advance the opponent's decisions until control returns. This supports MaskablePPO without pretending one update trains both seats simultaneously. Alternate the learner's seat across episodes. Then add a pool of earlier checkpoints as opponents.

### Observations, actions, and model

- Expose the player's hand; public board, evolution stacks, and trash; costs, DP, levels, colors, traits, statuses, memory, hidden-zone sizes, and permitted history. Preserve knowledge gained through legitimate reveals. Never expose actual deck order or unrevealed cards.
- Give both the initial policy and value evaluator only this observation. Test states differing solely in information unknown to the player: their observations and visible choices should agree whenever the player has no distinguishing knowledge.
- Version card IDs, rules, catalog, observation schema, and action encoding. Use episode-local instance references; do not let global identifiers become learning shortcuts.
- First neural baseline: structured attributes, bounded public-history summary, and a feed-forward policy. Next, implement a custom head that scores contextualized candidates, inspired by YGO Agent. Compare them under the same budget and opponents.
- The first discrete action space uses masked candidate slots with an explicit capacity measured against the corpus. Treat overflow as a coverage failure, never silently discard actions. The contextual policy should read candidate attributes rather than rely only on list positions.
- Cardsformer experiment: compare the same policy with and without locally generated text embeddings cached by card version. Do not assume text or a transformer improves win rate.
- [Stock MaskablePPO does not support recurrent policies](https://sb3-contrib.readthedocs.io/en/master/modules/ppo_mask.html). Masked LSTM/GRU policies require additional implementation and tests; recurrence is not a switch in the first baseline.

### Training and integration

Imitating the current policies initializes behavior but does not establish improvement. Begin with terminal rewards: win `+1`, loss `-1`, rules-defined draw `0`. Avoid repeatedly rewarding attacks, draws, or evolution, which could incentivize loops. Distinguish turn-limit truncations and simulator errors from actual draws; otherwise the agent may learn to exploit artificial endings.

Experiment with masked PPO against the current bot and a small population of frozen checkpoints. Keep previous opponents to detect regressions and excessive specialization. Separate training, checkpoint-selection, and final-evaluation seeds. Group paired episodes together when estimating uncertainty.

Integrate inference through a persistent Python process first. Await it without blocking Node's event loop, enforce a deadline, and confirm the decision is still current. On failure, fall back to the validated heuristic policy. Count fallbacks explicitly during evaluation so the model does not receive credit for the old bot's decisions. Defer ONNX or another runtime export until output parity and measurable benefit are established.

## Desktop inspection and preparation

Inspected through SSH alias `desktop`, Tailscale host `desktop-siuili7`, Ubuntu WSL2. Use Linux user `vinicius`.

| Item                     | Observation                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| Network                  | Direct Tailscale ping of 5 ms; SSH and WSL commands succeeded                                     |
| CPU                      | AMD Ryzen 7 5700X, 8 cores / 16 threads                                                           |
| Physical RAM             | 15.9 GiB                                                                                          |
| GPU                      | NVIDIA GeForce RTX 4070, 12,282 MiB, driver 591.86                                                |
| WSL                      | Ubuntu, kernel 6.18.33.2; approximately 7.9 GiB RAM visible to the VM                             |
| Physical Windows storage | Approximately 371 GiB free; the larger virtual WSL disk capacity is not physical free space       |
| Initial load             | GPU utilization 100%; approximately 124 MiB available WSL memory and 12.6 GiB swap used           |
| Existing workload        | Pixal3D Python process, approximately 6.8 GiB RSS, identified by executable and working directory |
| Existing toolchain       | Node 22.22.1; Corepack's pnpm resolution failed; system Python 3.14.4                             |
| Existing checkout        | `/home/vinicius/aegis-digimon-tcg`, revision `6f29328b`, different from the local baseline        |

These are point-in-time observations, not agent performance measurements. The isolated lab is `/home/vinicius/aegis-bot-lab`, separate from the existing checkout and Pixal3D environment.

**Completed on the desktop:** downloaded Node 26.10.0, verified its archive against the official SHA-256 manifest, installed pnpm 10.30.1 in the lab, and passed a basic Node runtime smoke check. These versions match the repository's [requirements](../../package.json). The lab's `env.sh` selects them without changing system tools or shell startup files.

The initial remote report is `runs/2026-09-26-preflight/report.json` under the lab. Its final check at `2026-09-27T01:41:42Z` (2026-09-26 locally) observed approximately 439 MiB available WSL memory, below the proposed 2 GiB engine-smoke threshold. At that time, engine benchmarks and CUDA tests were not run. This resource limitation was cleared after the user stopped the other workload; the subsequent validation is recorded below.

Use the separate Python 3.12 virtual environment prepared below. Do not reuse the other project's Python environment. Require enough free resources before each performance run. Do not terminate unrelated processes, change drivers, resize WSL, or reboot the desktop for this experiment.

Begin with one PyTorch CPU thread and up to four simulators, based on the bounded measurements below. Recheck memory when adding neural inference, longer trajectories, or complex decks. Require roughly 2 GiB available memory before the engine smoke test, then size training against measured RSS. With 16 GiB physical RAM, simulation CPU/RAM may constrain throughput before GPU capacity does.

### Validation after the competing workload stopped

Validated on 2026-09-26 locally, ending around `2026-09-27T02:02Z`. Before testing, WSL had 7,195 MiB available memory, no swap usage, and the idle GPU used 374 MiB. After all jobs exited, WSL had 7,272 MiB available, swap remained unused, and GPU utilization returned to 0% with 389 MiB used. No long-running training job was left behind.

An isolated source snapshot of revision `0fc8fef8c9e966a2213f9482196210acb9f126ef` is in `checkouts/0fc8fef8c` under the lab. Its archive SHA-256 is `0e50bb26789a3e12b933ef3a9b9d1d9653057c1198328711bcbbe2fbdeb89af0`. The archive contains the API, shared package, required data/tools/configuration, and the web package manifest for workspace resolution. Installation used the frozen pnpm lockfile with lifecycle scripts disabled. Both shared and API builds succeeded.

| Check                    | Observed result                                                                                                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bot and projection tests | `benchmark.test.ts` and `matchHarness.projections.test.ts`: 5 tests passed; test-run duration 5.23 seconds                                                                                           |
| CUDA training            | Python 3.12.14, PyTorch 2.7.1+cu128, CUDA runtime 12.8; 200 optimizer steps on a synthetic 185,089-parameter candidate-scoring network passed                                                        |
| CUDA computation         | Batch size 128 with 64 candidate actions; training loop took 0.617 seconds; cross-entropy fell from 3.867 to 0.000191 on the fixed synthetic batch                                                   |
| CUDA inference           | 200 measured single-observation calls after warmup: p50 0.467 ms, p95 0.519 ms, including host/device transfers but excluding any engine or IPC work                                                 |
| CUDA correctness         | Finite final gradients/loss, legal masked selections, and checkpoint save/reload parity passed; PyTorch peak reserved memory was 68 MiB, excluding driver/context overhead                           |
| PPO library integration  | Stable-Baselines3 2.7.0, sb3-contrib 2.7.0, Gymnasium 1.2.0; MaskablePPO completed 1,024 CPU training steps on its synthetic environment, 128 valid masked predictions, and checkpoint reload parity |

The synthetic tests validate the software/hardware path. They do not measure Digimon learning, generalization, or the future model's latency. The fixed-batch loss reduction is deliberately an overfitting smoke test, not evidence of playing strength. CPU PPO and CUDA policy training were checked separately; simultaneous end-to-end rollout collection and GPU optimization remain to be measured after the environment exists.

Headless throughput used the current balanced policies with the simple red/blue decks. Each configuration ran 80 measured matches, plus two warmup matches per worker:

| Workers | Measured matches / wall second | Wall time including import and warmup | Sum of worker peak RSS | Minimum available WSL memory |
| ------- | ------------------------------ | ------------------------------------- | ---------------------- | ---------------------------- |
| 1       | 6.96                           | 11.49 s                               | 361 MiB                | 6,872 MiB                    |
| 2       | 11.69                          | 6.84 s                                | 661 MiB                | 6,614 MiB                    |
| 4       | 14.78                          | 5.41 s                                | 1,237 MiB              | 6,064 MiB                    |

All 240 measured matches ended with a winner, zero errors, and zero rejected actions. Warmup games are excluded from those 240 outcomes. The separate smoke suite intentionally includes a legacy baseline that still rejects some actions; its expected legacy rejections are not failures of the measured balanced-policy throughput run.

These short samples use different seed allocations across worker counts, so they are feasibility measurements rather than a controlled scaling study. Summed per-worker peak RSS is not a simultaneous process-memory measurement. The selected BT26 decks and a learned policy were not exercised in this initial throughput check. An initial four-worker budget is reasonable for this baseline; reduce it if the actual training workload increases memory pressure.

Artifacts are in `/home/vinicius/aegis-bot-lab/runs/2026-09-26-validation/`: `cuda-smoke.py`, `cuda-smoke.json`, `ppo-smoke.py`, `ppo-smoke.json`, `throughput.mjs`, `throughput.json`, build/test/install logs, synthetic checkpoints, and `python-requirements.txt`. The Python environment is `/home/vinicius/aegis-bot-lab/venv`; all installed package versions were recorded. The throughput launcher was corrected to distinguish its result record from engine log lines before the successful measurement.

To repeat the bounded checks inside the desktop's WSL:

```sh
source /home/vinicius/aegis-bot-lab/env.sh
/home/vinicius/aegis-bot-lab/venv/bin/python /home/vinicius/aegis-bot-lab/runs/2026-09-26-validation/cuda-smoke.py
/home/vinicius/aegis-bot-lab/venv/bin/python /home/vinicius/aegis-bot-lab/runs/2026-09-26-validation/ppo-smoke.py
node /home/vinicius/aegis-bot-lab/runs/2026-09-26-validation/throughput.mjs
```

**Readiness decision:** the desktop is suitable for implementing and testing the planned compact Digimon agent. Phase 0's hardware/runtime checks are complete. The next dependency is the Aegis decision-level training environment and deck coverage, not more hardware provisioning.

### BT26 baseline and privacy prerequisite

After the user stopped the other workload, a fresh desktop check found 7,251 MiB available in WSL, zero swap use, and 374 MiB GPU memory used at 0% utilization. The isolated lab remains suitable for the planned compact model.

The selected Glowing Dawn and Abbadomon decks were exercised with the existing balanced heuristic, using 25 seeds for each of the four ordered pairings, including mirrors. The original baseline stopped after game 79: Abbadomon mirror seed `262603` exposed opponent hand entries through the client projection. A later rerun identified the same class of failure at seed `262613`. A card recovered from trash and discarded again retained stale Colyseus collection ancestry; revealing it could grant visibility to the old hand collection and subsequent draws. The repair removes collection parents that no longer contain that card before visibility propagation. Both seeds now have regression tests, including checks that recovery, discard, and a later draw actually occur.

The final desktop run completed all 100 games in 51.73 seconds: 98 security wins, two deck-out wins, no truncations, no rejected intents, and no errors reported by the harness across 8,621 projection checks. **This is not a clean simulator acceptance result:** the decoder also logged 191 `refId` warnings, which the harness does not currently promote to errors. Such warnings occur on the original source too; their remaining cause and any output corruption need investigation before trusting decoded observations for training. Completing games and passing the current privacy assertions does not establish complete observation correctness or action coverage.

The desktop's Node 26 build and API typecheck pass. The final focused/bot/fuzzer run passes 285 tests, with a decoder warning still present in the regression-test log. A broader preliminary run found an existing source-guard failure in `syncedArrayMutators.guard.test.ts` (`ordered.splice(index, 0, permanent)`); that failure was independently reproduced on the untouched baseline. The 43 focused visibility/projection tests also pass locally. Standards and spec reviews found no blocking issues in the privacy repair.

Evidence lives under `/home/vinicius/aegis-bot-lab/runs/2026-09-26-bt26-patched-v2/`: `report.json`, `run.mjs`, `run.log`, build/typecheck/test logs, and the exact source overlay with SHA-256 hashes. The checkout is `/home/vinicius/aegis-bot-lab/checkouts/bt26-privacy-fix`, based on `0fc8fef8c` plus the repair committed as `a72f5cd2b`. Earlier failing runs remain in the adjacent `2026-09-26-bt26-baseline` and `2026-09-26-bt26-patched` directories. This baseline preceded the learned-policy pilots described below.

### Executable GPU pilot (2026-09-27)

The first adapter/PPO implementation now runs both pinned BT26 lists through the real engine. It enumerates validated main and breeding actions, exposes all offered combat responses, and decomposes selections and ordering into sequential choices without truncating candidate lists. Tests exercise alternate Glowing Dawn evolution, Negamon's breeding ability, joint selection constraints, hidden-information isolation, and small complete ordering trees. These are partial mechanism proofs; they do not certify every card branch. Persistent reveal history and comprehensive status/keyword features remain observation work.

The updated desktop checkout is `/home/vinicius/aegis-bot-lab/checkouts/bt26-training-v2`; evidence is `/home/vinicius/aegis-bot-lab/runs/2026-09-27-training-v2`. Node 26 build/typecheck and 44 targeted TypeScript tests pass. Four Python tests cover identifier-renaming invariance, selection order, padding masks/finite gradients, and cleanup after worker initialization failure. Standards/spec review findings were fixed: multicolor choices now use the engine's distinct-color assignment rule, startup resources are exception-safe, and checkpoint fingerprints cover shared executable rules and the dependency lockfile.

- CUDA training: seeds `280000–280015`, 16 games, 543 learner decisions, 40.98 seconds, one win, 15 losses, no invalid or truncated episodes. Weights changed (maximum absolute parameter delta `0.0079384`) and checkpoint reload was exact.
- Greedy evaluation: separate seeds `390000–390007`, eight games, zero wins, seven losses, one explicit 512-decision truncation. This is development evaluation, not the reserved final comparison. Repeated legal no-progress choices remain a policy failure; the adapter does not remove legal choices to conceal it.
- Engine fingerprint: `5a2beadd636eb7d80ae863981b03a4924c1909c164f32fafe7a0a75a0d866ea0`. A temporary change to shared runtime code changed the fingerprint; restoring the bytes restored the original fingerprint.
- Exact uploaded source archive: `/home/vinicius/aegis-bot-lab/training-v2-source.tgz`, SHA-256 `d9b1c6c9cf7e5a2772dcd179e57f1c83926cc30f19d50cf21d3ee2f7120f4d60`, layered on the archived v1 checkout. Logs, configuration, episode outcomes, checkpoint, and verification JSON remain in the run directory. A later local edit only clarified test assertion diagnostics.

The earlier pilot remains archived at `2026-09-26-training-pilot`: 16 games, 550 decisions, one win, exact checkpoint reload. Its first feature schema and fingerprint format are incompatible with v2. Neither pilot meets the strength or complete-coverage acceptance gates. Next: mechanism-by-mechanism coverage, competent demonstration collection/imitation, stronger evaluation, and opt-in asynchronous inference.

### Public decision context (feature schema 3)

The numeric model inputs now distinguish 18 engine-projected public status flags, explicit keyword identities, security-attack counts, breeding/entry state, and per-seat board summaries. Blocking includes whether the attack targets a player or Digimon and whether blocking is compulsory. Reveal metadata fills previously anonymous identities while retaining live DP and statuses for already-known cards. Keyword features use the engine vocabulary rather than hashed text: review found that the former hash mapped Alliance and Barrier to the same vector. Unexpected keyword names now fail explicitly.

The reviewed implementation is archived in `/home/vinicius/aegis-bot-lab/checkouts/bt26-training-v3-verified`, with evidence in `/home/vinicius/aegis-bot-lab/runs/2026-09-27-training-v3-verified`. Node 26 build/typecheck, 16 focused TypeScript tests, and eight Python tests pass. The CUDA smoke completed seeds `310000–310007`: eight complete games, 348 decisions, zero wins, eight losses, no rejections or truncations, 20.85 seconds. Maximum parameter change was `0.0036538`; checkpoint reload was exact. This run verifies the revised inputs and learning mechanics, not improved playing strength. The uploaded source archive SHA-256 is `9a3e194172de0fac9093708ab61f8908542454edee5bd2fbd428d8f445993ff2` (`training-v3-verified-source.tgz`, layered on v2). Earlier v3 development runs remain archived separately and are not the evidence for the reviewed code.

Observation schema 2 / feature schema 3 intentionally invalidate earlier checkpoints. The desktop rejected the v2 checkpoint before starting an episode (`compatibility-check.json`). The verified engine fingerprint is `34049290a93961cf0a5725735073ceb2a21d4ea9f78bcd49b99356b3a14e5fa0`. Remaining observation gaps include persistent permitted reveal/history information and the specific attacked permanent during blocking. Complete card-mechanic coverage, demonstration/imitation training, stronger evaluation, and product inference remain open.

### Demonstration collection and imitation initialization

The optional teacher path now labels the unchanged legal candidate list using the existing balanced heuristic. Missing matches remain explicit and unsupervised; the collector does not remove legal actions to make the teacher fit. Teacher labels are never encoded as model inputs. Incomplete games are excluded, and validation separates whole episodes rather than random decisions from the same games. Imitation checkpoints use the same metadata contract as PPO and evaluation.

The desktop v4 run at `/home/vinicius/aegis-bot-lab/runs/2026-09-27-training-v4` collected all 80 games (`410000–410079`), with 4,097 decisions, no unavailable teacher labels, and no engine errors or truncations. The split contains 64 training episodes and 16 validation episodes; SHA-256 checks verified every dataset input. After excluding forced single-action windows, there are 2,688 training and 561 validation decisions. Twenty CUDA imitation epochs raised validation agreement from 23.9% to 75.2%, reducing validation cross-entropy from 1.461 to 0.712. This is agreement with a limited heuristic, not action coverage or win rate.

The imitation checkpoint completed all 16 separate development-evaluation games (`490000–490015`), with four wins, 12 losses, 839 decisions, and no truncations. A PPO warm-start smoke (`510000–510007`) then completed eight games, changed model parameters by up to `0.0209932`, and reloaded its checkpoint exactly. The five training wins in that smoke are not held-out strength evidence. Greedy evaluation of the PPO checkpoint on the same 16 development seeds completed every game but won only three (13 losses, 883 decisions). The imitation checkpoint remains the development baseline; this small comparison does not establish a statistically reliable strength difference, and neither checkpoint meets release gates.

Node 26 build/typecheck, 18 focused TypeScript tests, nine Python tests, and standards/spec review pass. The source is archived in `/home/vinicius/aegis-bot-lab/checkouts/bt26-training-v4`; uploaded overlay SHA-256 `64d5692931e6f776f867038f101837f423cea882a8c3fb7cdcaefc0da24e3fdb`, layered on v3-verified. Engine fingerprint: `deaf7e377b06d8535e2f7ae7c3fcac75357af580d997d854ad4cfdfdb75efa9a`. `dataset-verification.json` records source-card and decision-kind counts, but counts of observed prompts do not prove exhaustive mechanic coverage. Full action proofs, richer history/context, release-quality strength evaluation, and usable inference integration remain open.

### Engine-backed adapter coverage checkpoint (2026-09-27)

The isolated desktop checkout `/home/vinicius/aegis-bot-lab/checkouts/bt26-training-v5-coverage` layers three training test files onto the archived v4 source. Node 26 typecheck and 58 focused tests pass (35 training adapter tests and 23 BotPlayer tests). This is a test-only checkpoint; the v4 model and its archived runtime remain unchanged.

The new combat fixtures verify both Barrier responses and their security/deletion consequences; Alliance decline and each offered ally; voluntary blocking and each blocker; mandatory Collision blocking; and Vortex decline and both offered targets, including a newly played attacker. Option fixtures exercise a nonfirst Garnet reveal choice, deck-bottom ordering, unavailable same-turn Delay, established Delay activation and its memory/trash outcome, and Treadmill Training's color-waiver eligibility. Completed Option actions must clear engine continuations, leave no pending decision, and emit no rejection. Delay succeeds without automatic optional responses. Treadmill's subsequent effect resolution is not covered by its eligibility fixture.

A structural gate records the eleven keyword families in the pinned compiled cards and the absence of Counter triggers. It detects scope changes; it does not prove every keyword or card branch. Exhaustive scoped effect/choice fixtures, complete tactical observations/history, stronger evaluation, and inference integration remain required before claiming the requested first version is complete.

### Blocking target observation checkpoint (2026-09-27)

BotPlayer now carries the current public permanent attack target, including redirects, into the training policy's blocking context. Player-target attacks clear the previous permanent reference. Feature version 4 encodes the target's live card attributes and visible source stack, so identical boards with different attacked Digimon no longer produce identical blocking inputs. Identifiers remain lookup keys rather than learned strings. Regression tests cover redirected targets, stale-reference clearing, adapter propagation, target/source differences, and identifier-renaming invariance. Existing version-3 datasets/checkpoints remain usable only with their archived encoder and runtime.

The isolated desktop checkout `/home/vinicius/aegis-bot-lab/checkouts/bt26-training-v6-target` layers the source overlay onto v5-coverage; overlay SHA-256 `2b5dd902121cd8360c9ee8033504a7115733c7cffec0d65c025e30d1afd1bfd9`. Node 26 typecheck/build, 59 focused TypeScript tests, and ten Python tests pass. The fresh CUDA smoke at `/home/vinicius/aegis-bot-lab/runs/2026-09-27-training-v6-target` completed eight games (seeds 610000–610007), 320 decisions, one win/seven losses, and zero unusable episodes in 20.37 seconds. Maximum parameter change was `0.00363257`; checkpoint reload was exact. This establishes that the changed input format trains successfully, not improved strength. Persistent permitted history and the other release gates remain open.

### Treadmill Delay adapter coverage (2026-09-27)

Seven additional engine-backed fixtures cover Treadmill Training's Delay through the training adapter: all four combinations of two eligible hosts and two evolution cards; declining the optional digivolution after paying the Delay trash cost; Eyesmon's normal evolution cost reduced from 3 to 1; and its alternate cost reduced from 1 to 0. Assertions check the final top card, untouched alternate host, memory, consumed Option, evolution draw, and completed resolution without rejections. These extend the earlier eligibility-only fixture; they do not establish all affordability boundaries, security-effect branches, or other-card interactions.

Desktop Node 26 typecheck and all 66 focused tests pass in `/home/vinicius/aegis-bot-lab/checkouts/bt26-training-v7-delay`, layered on v6-target. The final `options.test.ts` SHA-256 is `907b8edf0673d7ccc42b513b2b1c47098fdaab8b7f209d03f878c4f36139f0f3`. This checkpoint changes tests only; no retraining or new strength claim follows from it.

### Asynchronous policy driver and lifecycle checkpoint (2026-09-27)

`BotPolicy` keeps synchronous results by default and can now declare asynchronous decisions. BotPlayer bounds asynchronous waits with a configurable deadline (default 1,000 ms), retains heuristic phase/decision fallback and safe combat fallback, and tracks fallback selections separately. It discards obsolete successes and failures before invoking fallback logic. This prevents old requests from changing the fallback heuristic's new-turn state. Disposal settles driver waits and suppresses late actions; room teardown and harness exits dispose their bots. Harness event and timing collectors close before returning, so late model promises cannot mutate a finished or truncated result.

Real-engine tests compare synchronous and delayed policies on both BT26 deck orderings, with matching outcomes and game statistics and no fallback. A deliberately unresponsive Main request reaches its deadline, falls back, and completes its match. Separate regressions cover stale turns/decisions/replaced combat windows, late rejection, breeding retry, unchanged-turn disposal, and immutable reports after truncation/late completion. Main latency samples include asynchronous completion but are not a bounded end-to-end latency distribution; requests that never settle are reported through fallback counts. Cancelling the driver's wait does not terminate external computation.

The final isolated source is `/home/vinicius/aegis-bot-lab/checkouts/bt26-training-v8-async-final`, layered on v7-delay; overlay SHA-256 `aadde0947e248ed5a347e7309f60b330ce0eb5d31a26702e0e117156b23af086`. Desktop Node 26 API build/typecheck and 126 focused bot/training/projection/room tests pass. The final demonstration smoke (`740000–740007`) at `/home/vinicius/aegis-bot-lab/runs/2026-09-27-training-v8-async-final/dataset` completed all eight games and 402 decisions with zero unavailable teacher labels. Test/build logs live alongside the dataset. Existing decoder warnings remain separately documented. Standards/spec review found and verified fixes for stale fallback state mutation and late result mutation.

This delivers the asynchronous driver boundary, not product checkpoint inference: the asynchronous candidate-choice adapter, model worker connection, permitted history, complete scoped action proof, and release-strength gates remain open. Archived checkpoints remain tied to their archived runtime fingerprints.

### Shared synchronous/asynchronous action adapter (2026-09-27)

`createAsyncTrainingPolicy` now executes the same legal-action and observation routines as `createTrainingPolicy`. A shared generator handles constrained multi-card selection and ordering, yielding each candidate list and prior selections without duplicating legality rules. All seven decision-request kinds produce identical windows and final responses in synchronous/asynchronous tests. Complete seeded BT26 matches in both deck orderings also produce identical teacher-choice traces and outcomes with no fallbacks. This proves parity for those tests, not exhaustive card-branch coverage.

The driver forwards a per-request `AbortSignal` through every policy method and the Main timing wrapper. Bounded completion/disposal aborts it; the async adapter checks it before a model query and before advancing to another selection step. Tests verify aborted/invalid choices and signal propagation on timeout/disposal. Cancellation of underlying model work remains the inference transport's responsibility; a callback that ignores its signal can keep running, but cannot advance the adapter or act through the closed driver.

Final source: `/home/vinicius/aegis-bot-lab/checkouts/bt26-training-v9-async-adapter`, layered on v8-async-final; overlay SHA-256 `7cd3d54003421f114a28e83f23dc13463e821e19059bd06fdbe1ec03135670b0`. Node 26 build/typecheck and 137 focused tests pass. A fresh CUDA PPO smoke (`760000–760007`) completed eight games and 177 decisions with zero unusable episodes, changed parameters by up to `0.00242566`, and reloaded its checkpoint exactly. Its eight losses establish no playing-strength improvement. Logs/checkpoint are under `/home/vinicius/aegis-bot-lab/runs/2026-09-27-training-v9-async-adapter`. Independent standards/spec reviews found no blocking issue. Loading a checkpoint into an inference worker and connecting its scores to this adapter remains the next integration step.

### Local checkpoint inference connection (2026-09-27)

`inference.py` loads a frozen checkpoint and scores the complete candidate list on CPU. `InferenceClient` keeps one local Python process, validates runtime/deck metadata before play, and serializes uniquely identified requests through a bounded queue. It rejects invalid indices and stale IDs, removes cancelled queued requests, and consumes a cancelled active reply without assigning it to another decision. Unresponsive workers are terminated after the hard deadline. Scoring uses the same encoder/model as training; Python tests verify identical greedy choices and unchanged weights.

`inferenceCli.ts` connects this worker to `createAsyncTrainingPolicy` for seeded headless matches against the heuristic. It records checkpoint identity, match outcomes, truncations, rejected actions, errors, fallback counts, and per-query latency. A model-decision limit cancels the harness and closes its drivers rather than substituting a fabricated move. Regression tests verify cancellation and turn-limit exits cannot be followed by a late action or report mutation. Draws are recognized from actual `gameOver` events. Worker ownership includes configuration writes and all evaluation operations inside `try/finally`.

The source is `/home/vinicius/aegis-bot-lab/checkouts/bt26-training-v10-inference-final`, layered on v9-async-adapter; overlay SHA-256 `bac39bfec476bb7c0552eaa1be040f42e15774f857de59af3c1a849f90cf361e`. Node 26 build/typecheck, 114 focused TypeScript tests, and 14 Python tests pass. The smaller TypeScript count reflects a narrower command than the prior 137-test run, not removal of existing coverage. A v9 checkpoint is rejected before play with `Inference checkpoint/runtime mismatch`. Logs and experiment artifacts are under `/home/vinicius/aegis-bot-lab/runs/2026-09-27-training-v10-inference-final`.

The final run collected 80 complete demonstration games (`810000–810079`), 4,307 decisions, and zero unavailable teacher labels. CUDA imitation used seed `820000`, 20 epochs, and a 64/16 episode split; its selected epoch reached 71.39% agreement on 699 non-forced validation decisions (loss `0.792308`). The frozen CPU worker then completed all 16 development-evaluation games (`890000–890015`), 1,058 candidate queries, seven wins and nine losses, with no truncations, errors, rejected actions, or inference fallbacks. Query latency was p50 `0.796 ms`, p95 `1.397 ms`, maximum `2.123 ms`; these are not full decision latency measurements. A separate one-decision-budget run (`899999`) exited as an explicit truncation with no fabricated move, errors, or fallback. Engine SHA-256: `5ebef1db25c99f2acf763facca8e810742796e76ec853d4545424da48499b5a3`; checkpoint SHA-256: `ecf02d6e629a7c112cc13a90626cfbf2e3946b548437e40bff1aa62f0a0ea0ac`. Detailed metrics are in the run's `summary.json`; checkpoint is `imitation/checkpoint.pt`. The small evaluation establishes working inference, not a statistically supported strength improvement.

This connection is available in the local headless evaluator. Production-room routing, permitted history, exhaustive scoped action evidence, playing strength, and end-to-end release latency remain open. Query latency excludes observation construction and the rest of a multi-step decision.

### Opt-in Aegis room policy (2026-09-27)

The API can load a configured local checkpoint through `AEGIS_BOT_CHECKPOINT` and `AEGIS_BOT_PYTHON`. Configuration is validated and cleanup handlers are installed before the scorer starts; listening waits for a successful compatibility handshake. Shutdown also waits for an in-progress load and closes the shared worker. Disabled configuration starts no Python process.

`AegisRoom.addBot` checks the actual staged human deck and resolved bot deck against both pinned lists, as multisets with exact main/egg counts. A supported matchup gets the shared asynchronous policy and the visible opponent name `BT26 AI`; changing deck order or artwork does not change eligibility. Other matchups, tournament seating, and developer scenarios retain their existing policy. No deployment configuration is changed.

Room disposal cancels its pending choices but leaves the shared scorer available to other rooms. Normal pacing, the one-second policy deadline, and the existing 40-action Main safety limit remain. Failed scoring invokes the driver's existing fallback. A synchronous rejected model action, or an asynchronous `actionRejected` engine event, disables model choices for the rest of the room. The latter event currently has no seat, so this is a conservative match-wide failure response, not guessed attribution. These recovery paths are not counted as successful model coverage.

Eleven new room integration tests exercise configuration, both supported bot decks, deck reordering/count changes, unsupported opponents, actual asynchronous choices, scorer failure, rejection events, disposal, startup mismatch, and shutdown during loading. Existing driver, room, and tournament suites remain green. Independent specification review verified fixes to worker startup ownership and asynchronous rejection handling; standards review found no hard breach.

Final source: `/home/vinicius/aegis-bot-lab/checkouts/bt26-training-v11-room-inference-final`, layered on v10-inference-final; overlay SHA-256 `0f0400cef3361c2389e96a1194e1e8ebcb99c2578e00409cf0399c6d811b66a6`. Desktop Node 26 build/typecheck and 179 focused bot/training/room/tournament tests pass. The v11 training run (`/home/vinicius/aegis-bot-lab/runs/2026-09-27-training-v11-room-inference`) collected 80 complete games (`910000–910079`), 3,995 decisions, and zero unavailable teacher labels. CUDA imitation (`920000`, 20 epochs, 64/16 episode split) reached 70.25% validation agreement over 605 non-forced choices. Separate CPU evaluation (`990000–990015`) completed all 16 matches and 842 choices, with six wins, ten losses, and no errors, rejected actions, truncations, or fallback. This remains a small development evaluation, not proof of strength.

Checkpoint: `imitation/checkpoint.pt` under that run; SHA-256 `1835bc2d0f2b798e1a02fd4282bab3105b85445fb56f6b35be74a059c711ce01`. Engine/runtime SHA-256 `e171e5fb165238cd80e637bc95bf0a0bb2e7eefada51b90a5b0325544e885746`. The preliminary and final v11 sources differ only in room-test mock type annotations; the final runtime passed the full checkpoint handshake before live room scoring.

The final desktop room smoke (`990012`, Glowing Dawn mirror) instantiated the real built `AegisRoom`, selected `BT26 AI` through ordinary `addBot`, and used the persistent Python checkpoint scorer with normal bot presentation pacing. A scripted heuristic opponent drove the human-side intent and decision channels. The model won by security after 32 queries in 126.5 seconds, with zero rejected actions or inference fallback. Room/worker cleanup completed. This verifies the room lifecycle and policy connection, not browser transport/rendering or full action coverage. The reproducible smoke script, log, and JSON result are under `/home/vinicius/aegis-bot-lab/runs/2026-09-27-training-v11-room-inference-final/` as `room-inference-smoke.mjs`, `room-smoke.log`, and `room-smoke.json`.

## Milestones and acceptance criteria

| Phase                             | Deliverable                                                                       | Verification                                                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 0. Lab                            | Isolated revision, pinned tools, hardware/run manifest                            | SSH and runtime checks; PyTorch import and short CUDA operation; build and bot smoke; games/second and RSS with 1/2/4 workers |
| 1. Coverage and environment       | Complete observations, decision stepping, candidates, and masks for the two decks | Deterministic-sequence equivalence with the harness; hidden-information, joint-choice, termination, and decision-window tests |
| 2. Collection and neural baseline | Versioned trajectories and an imitation model                                     | Trajectory replay, format validation, episode-level splits, and approximate teacher parity without claiming improvement       |
| 3. Reinforcement learning         | Masked PPO against fixed and previous opponents                                   | Bounded learning pilot, recoverable checkpoints, curves by training seed, and no exploitation of engine errors                |
| 4. Comparisons                    | Contextual scoring; optional frozen text; recurrence later                        | Equal decision budgets and checkpoint-selection sets; retain extra complexity only with consistent gains                      |
| 5. Final evaluation and product   | Reserved-match report and opt-in asynchronous integration                         | Criteria below; timeout/stale-response checks; deployment-host latency; current bot retained as fallback                      |

Suggested locations: `apps/api/src/bot/training/` for the environment and observations; `apps/api/src/bot/` for inference integration; `tools/bot-training/` for Python training and configuration; Git-ignored `artifacts/bot-training/` for datasets, checkpoints, and logs. Each remote run records source SHA, deck/catalog hashes, versions, configuration, and seeds. Transfer only the required source files, never credentials or production data. Training evidence does not belong under `docs/audits/`; any card fixes must follow the existing collection ledgers and IR registration rules.

### Proposed first-release gates

- **Coverage:** every decision required by the two lists is available; no silent overflow, hidden-information leak, or invalid action in the acceptance set.
- **Reliability:** 1,000 robustness games without exceptions or deadlocks. Report natural termination, turn limit, timeout, error, and fallback separately. This batch does not replace strength evaluation.
- **Strength:** at least 1,000 reserved final-evaluation games, allocated in advance across matchups and sides. Target at least 60% of match points (`win=1`, `draw=0.5`) against the current policy, with the lower bound of a 95% confidence interval above 50%. Use paired-seed groups for uncertainty, and report wins/draws/losses and each matchup. Claim improvement on both decks only with supporting per-deck evidence; increase sample size if inconclusive. Do not select checkpoints using the final set.
- **Latency:** initial p95 targets of 250 ms for main-phase decisions and 100 ms for combat responses, excluding animations but including serialization and inference. Measure end to end rather than reuse only the current synchronous timer. Start with a configurable timeout ceiling of 1 s, lowered where the game window requires it. Confirm targets on the deployment host.
- **Learning:** at least three training seeds to distinguish consistent improvement from a fortunate checkpoint. Do not claim coverage or strength outside the declared decks and evaluation conditions.

### Bounded experiments before a long run

1. Measure a short current-bot batch with initialization separated from match time, using the simple red/blue decks to validate infrastructure.
2. Run 100 games on the selected training decks and freeze the first baseline matrix. Resolve structural failures before collection.
3. Collect an initial batch of up to 1,000 games from varied policies, adjusting to actual trajectory size. This volume is an experiment, not a promised requirement for strong play.
4. Run a training pilot capped at 30 minutes, with memory limits and periodic checkpoints, to verify gradients, masking, recovery, and resource use. This is not a strength milestone.
5. Estimate the next budget from measured decisions per second: `collection time ≈ target decisions / measured throughput`, then add measured optimization, evaluation, and I/O time. Do not estimate training duration from VRAM alone.

## Commands and resumption

Verify the isolated desktop tools:

```sh
ssh desktop 'wsl -d Ubuntu -u vinicius -- bash -lc "source /home/vinicius/aegis-bot-lab/env.sh; node --version; pnpm --version"'
```

The following build/test commands already exist. Executable training and evaluation commands are documented in [the pilot README](../../tools/bot-training/README.md). Run from an isolated checkout of the selected revision with the lab environment loaded:

```sh
pnpm install --frozen-lockfile
pnpm --filter @aegis/shared build
pnpm --filter @aegis/api exec vitest run src/bot/benchmark.test.ts --maxWorkers=1 --no-file-parallelism
pnpm --filter @aegis/api exec vitest run src/bot/matchHarness.projections.test.ts --maxWorkers=1 --no-file-parallelism
pnpm --filter @aegis/api bench:bot --maxWorkers=1 --no-file-parallelism
```

The existing benchmark measures current policies, not a trained model, and does not certify complete action coverage for the selected BT26 lists. Run the larger batch only after the smoke passes and the machine has capacity. The older desktop checkout cannot substantiate claims about the current revision.

**Next executable steps:** finish the per-mechanic action and observation coverage proofs for both decks, expand demonstration coverage and measure reliable checkpoint play before opt-in inference integration. The working PPO pilot establishes learning infrastructure, not release readiness.

### Fresh checkpoint after DUAL legality correction

The v12 runtime is archived at `/home/vinicius/aegis-bot-lab/checkouts/bt26-training-v12-dual-training`; its completed run is `/home/vinicius/aegis-bot-lab/runs/2026-09-27-training-v12-dual-attached`. Collection completed all 80 games (`1010000–1010079`), yielding 4,073 decisions with zero unavailable teacher labels. Every input hash recorded by imitation was rechecked. CUDA imitation ran 20 epochs with a 64/16 episode split; the minimum validation loss was at epoch 19 (0.704492), with 73.64% agreement over 535 non-forced validation decisions. Agreement measures imitation of the heuristic, not playing strength.

The checkpoint completed 16 separate development-evaluation games (`1090000–1090015`): ten wins, six losses, 967 model queries, and zero errors, rejected actions, fallback, or truncation. Query p95 was 1.469 ms; this excludes observation construction and full multi-choice decision time. Engine fingerprint: `a8bb2a2258ee1cd315b326f3e380eb92302f779060e173182a634342c2ac921f`. Checkpoint SHA-256: `ebecd60d14ca697db0eb78f8a3a9871d4caa763bcce2a3b1f24178b3abc4115c`. These small development results do not prove the release strength gate.

The initial detached run, `2026-09-27-training-v12-dual`, stopped after three complete episodes and one partial episode when the WSL session closed. Its processes were confirmed absent before restarting in a new directory with an attached SSH/WSL session. That partial run is retained and excluded from the successful checkpoint's dataset. An exit-code file alone did not establish completion; the complete episode count, checkpoint, and evaluation results did.

The separate 1,000-game reliability run completed with the same frozen runtime/checkpoint, seeds `1110000–1110999`, and output `runs/2026-09-27-training-v12-reliability`. All 1,000 games terminated normally: 432 wins, 568 losses, no draws, 57,445 model decisions, and zero errors, synchronous/asynchronous rejections, timeout/error fallback, or truncation. The result count, exact consecutive seed sequence, every completion/error field, and unchanged checkpoint hash were verified; `summary.json` records 125 games for each deck-pairing/learner-seat cell. This supplies the 1,000-game execution-reliability evidence for this archived runtime/checkpoint. It does not prove full action coverage, browser integration, or reliable release latency. The 43.2% win rate does not meet the strength gate; these are development seeds, not reserved final strength evaluation. Focused tests ran concurrently for part of this experiment, so its timings are not used as latency acceptance evidence.

### Arts Digivolve choices through the policy

`apps/api/src/bot/training/arts.test.ts` adds 12 engine-backed asynchronous-policy scenarios for all three scoped DUAL cards: Atratusmon, Monarchlizamon, and BT26 Murasamemon. Each scenario makes both eligible Arts hosts reachable, excludes a level-3 noncandidate, and verifies the chosen evolution or refusal through exact stack, draw, trash, and memory outcomes. Final Judgment additionally exercises both accepting and refusing its optional attack, including Arts choice completion before security is revealed.

The desktop checkout `checkouts/bt26-training-v13-arts` passed all 53 focused Arts/payment/Option/combat tests and API typecheck. This adds test coverage without changing policy or engine behavior. The v12 checkpoint remains paired with its archived built runtime: the conservative metadata fingerprint currently also includes built test files, so a later full build containing new tests must not be assumed checkpoint-compatible. These scenarios do not establish coverage of every scoped effect or inherited interaction.

### Core's opponent-turn payments through the policy

`apps/api/src/bot/training/negamon.test.ts` adds 31 engine-backed asynchronous-policy scenarios. The four Negamon are paid from trash, evolution stacks, or a mixture of both; movement can also be declined. When multiple inherited redirects compete with Core's breeding response, the test requires a trigger-order window and verifies choosing the inherited effect first or Core first. Redirect effects are explicitly declined in these fixtures.

The subsequent three-card placement covers every three-of-four legal subset, verifies that all four candidates are offered, and exercises forward and reverse placement orders. Refusal leaves the cards in trash. Final assertions verify both original stacks, the Digi-Egg deck, Core's ordered face-up stack, retained unpaid cards, security, memory, and the opponent's board after Core blocks the original attack. No ordering claim is made for identical Negamon returned to the Digi-Egg deck.

The final desktop checkout `checkouts/bt26-training-v14-negamon-final` passed all 84 focused Core/Arts/payment/Option/combat cases and API typecheck. Independent review prompted the explicit fourth-candidate and trigger-order assertions. The changes are test-only and do not certify every remaining scoped mechanic or improve model strength by themselves.


### Reinforcement-learning continuation

The experiment `runs/2026-09-27-training-v12-ppo256` completed using the unchanged v12 archived runtime. It warm-started CUDA PPO from the v12 imitation checkpoint for 256 games (`1210000–1210255`, batches of eight): 16,107 decisions, zero unusable episodes, and 674.174 seconds. Verification records 256 complete episodes, exact checkpoint reload, and a maximum parameter change of 0.120539166. Training wins are not evaluation strength evidence.

Both checkpoints were evaluated on the same 128 development seeds (`1310000–1310127`). The original won 55 games; PPO won 83. However, three PPO games reached the 512-decision cap; the original completed all 128. Both reported zero errors, rejections, and fallback, but the subsequent diagnosis demonstrates a blind spot in rejection reporting. The PPO checkpoint remains experimental and does not satisfy reliability or final strength acceptance.

Two independent diagnostic replays of seeds 1310018, 1310031, and 1310067 reproduced all three decision-limit outcomes. Traces are retained under `runs/2026-09-27-ppo-limit-diagnosis` and `runs/2026-09-27-ppo-limit-observations`, generated by `/home/vinicius/aegis-bot-lab/diagnose-ppo-limits.mjs` outside the frozen runtime. The exact learner seats and deck-pairing indices (18, 31, 67) were preserved. At zero memory, the model repeats BT25-076 play plus refusal of its sacrifice selection in the first game, EX8-074 play in the second, and BT25-076 play in the third. The board does not progress.

Code inspection identifies two relevant seams: `validatePlayCard` permits deferred affordability whenever `hasBeforePayCost` is true, while `applyPlayCard` may subsequently return an insufficient-memory result; `handlePlayCard` ignores that resolved result and only reports thrown errors. Fixing deferred play feasibility, failed-result reporting, and optional-payment retry behavior requires targeted regression evidence before retraining or promoting this checkpoint. Raising the decision limit does not address the observed repeated state.

### Reveal choices and remaining policy witnesses

`reveals.test.ts` adds 28 asynchronous-policy scenarios. Gekkomon's play and movement triggers each exercise all six distinct hand/under-card assignments and both Tamer hosts. The assertions require the complete legal candidate sets, exact revealed `(instanceId, cardId)` mappings in both choice windows, correct face-down placement under the selected Tamer, preserved older stack cards, and the unrevealed tail remaining hidden. Liollmon adds all four legal assignments across its overlapping Glowing Dawn and yellow BEATBREAK groups, including exclusion of an already-taken card and a green-only card from the second group. Both suites verify resulting deck order, hand, memory, and completion without rejection.

Desktop checkout `checkouts/bt26-training-v15-reveals` passed all 158 training tests across 13 files and API typecheck. The scope gate also rejects a scoped compiled card whose coverage flag ceases to be `full` or whose residual list becomes nonempty. This is an early structural alarm, not an audit score or semantic proof.

The following inventory tracks policy-facing choice patterns, not whole-card rules fidelity. Generic decision tests prove reachability within the supported request grammar; real engine scenarios are still required where a distinct producer or lifecycle can change that grammar. Automatic effects with no player choice do not create an additional policy action, but their public consequences must remain represented in observations.

| Choice pattern | Current evidence | Remaining policy-level witness |
| --- | --- | --- |
| Main/breeding declarations | `actions.test.ts`, public play/evolution/movement in the action suites; unsupported declaration families excluded by scoped IR | Declaration families reviewed below; producer-specific decision and lifecycle gaps remain separate |
| Optional/mode/subset/order grammar | `decisions.test.ts`, sync/async parity in `policy.test.ts`, real ordered costs and triggers | Any newly discovered producer constraint must be checked against the authoritative decision schema |
| Block, Collision, Alliance, Barrier, Vortex, attack redirection | `combat.test.ts`; Core blocks after opponent-turn movement; `negamon.test.ts` accepts each eligible inherited redirect target and refusal | No additional scoped redirect choice identified; Eyesmon deletion retrieval is covered separately below |
| Repeated Tamer payments and free evolution | `payments.test.ts`, `options.test.ts` | Play-cost sacrifice and reduction/replacement choices |
| DUAL use and Arts | `payments.test.ts`, all four scoped DUAL cards in `arts.test.ts`; Monarchlizamon direct-battle choices in `effectBattle.test.ts`; Marsmon On Play boost, friendly battler, opposing target, and refusal in `marsmonBattle.test.ts` | Other activation timings require producer review; these fixtures do not establish whole-card coverage |
| Reveal groups and destinations | `reveals.test.ts`, remainder ordering in `options.test.ts`; Garnet/Treadmill Main and security choices in `optionReveals.test.ts` | All six reveal producers and their printed reveal entry paths have witnesses below, including Analog Youth security-to-play; hidden quantities and history are separate observation gates |
| Mixed-zone returns and ordered source placement | `negamon.test.ts`; EX9-047 deletion retrieval in `eyesmonRetrieval.test.ts`; EX9-055 end-of-turn placement and matching-level deletion in `abbadomonEndTurn.test.ts` | Remaining producers require review against the frozen scope; these fixtures do not establish whole-card coverage |
| Security movement, costs, and replacements | Security payment routes exercised by `payments.test.ts` and Arts consequences; BT26-025 play/movement security-to-Tamer choices in `securityPlacement.test.ts`; BT25-043 evolution largest-security choices and BT26-031 conditional Digimon/Tamer targets in `mostSecurity.test.ts`; BT25-043 self/ally protection in `leaveProtection.test.ts` | Other removal lifecycles remain card/engine evidence; no additional scoped leave-field replacement or player-controlled security swap/reorder producer found |
| Copied/activated effects | Breeding Main activation in `actions.test.ts`; EX8-074 copied When Digivolving choices in `copiedEffect.test.ts` | No additional scoped copied-effect choice identified; final observation equivalence remains open |
| Delay/Option lifecycles | Garnet/Treadmill Main/security placement through natural later-turn activation in `optionDelayLifecycle.test.ts`; LM-031 choices in `blackScramble.test.ts`; ST23-15 Main/security free play and start-of-Main destinations in `ePulse.test.ts` | No additional scoped Option choice identified; LM-031 placement-age rules remain separate engine/card evidence |
| Observations and hidden information | Allowlisted projection, public tactical state, real reveal-identity assertions, attacked target; bounded event history and persistent unique seen identities | Final information-equivalence verification; richer retention of quantities/ownership/order is not provided by the bounded baseline |

None of the open rows is closed by the 1,000-game reliability result. The remaining release work also includes browser transport/rendering, end-to-end latency, final checkpoint compatibility, and statistically supported stronger play.

### Inherited attack redirection through the policy

Three additional asynchronous-policy cases select either eligible Negamon redirect target or refuse the effect. They exclude a nonmatching permanent, verify the public redirected `attackDeclared` target, and assert combat completion, exact board/trash/security outcomes, suspension, memory, and no rejected actions. The separate optional Eyesmon deletion retrieval is declined in these fixtures.

Desktop checkout `checkouts/bt26-training-v16-redirect` passed all 161 training tests and API typecheck. After adding the explicit public-event target assertion, `checkouts/bt26-training-v16-redirect-final` passed all 34 Negamon tests and API typecheck. These test-only additions keep the v12 checkpoint paired with its archived runtime.

### Deferred play result reporting

The public play handler now reports returned failures after pay-time decisions, closing the rejection-accounting blind spot found in the PPO diagnosis. Regression evidence is recorded in [the engine ledger](../audits/engine/deferred-play-failures.md). Desktop Node 26 API typecheck passed, and independent standards/spec review found no actionable issues. This is a reporting fix only: deferred affordability enumeration and optional-payment retry behavior remain open, so the experimental PPO checkpoint is not promoted.

### Known unaffordable self-reducer plays

The engine now rejects provably unaffordable self-reducer plays before offering them through the training adapter, while retaining valid suspension payments and automatic cost reductions. Unknown combinations preserve deferred resolution. Review caught an omitted passive reduction source; the corrected guard and its non-consumption regression are included. Verification and limitations are recorded in [the engine ledger](../audits/engine/deferred-play-failures.md). BT25-076 sacrifice feasibility and optional-payment retry remain the next cost-handling tasks. This runtime change requires a newly compatible training run; the archived PPO checkpoint is not promoted or relabeled.

### Sacrifice availability and policy choices

BT25-076 is now excluded from training actions when it cannot pay its printed cost and its isolated sacrifice reducer has no eligible target. Policy witnesses preserve both eligible sacrifice targets and full-cost refusal, with exact payment and zone outcomes. Engine verification lives in [the deferred-play ledger](../audits/engine/deferred-play-failures.md). The remaining observed cost-loop issue is choosing an unaffordable refusal; this is still reported as a failed play and requires a separate policy/training solution. These changes do not complete overall action coverage or checkpoint acceptance.

### Training-only payment refusal losses

The PPO worker now explicitly enables a controller that records an observed refusal for the learner's current payment. Only the matching deferred insufficient-memory rejection, in the same turn while the played card remains in hand, ends the episode through a real surrender. Python accepts only that marked, completed opponent win with exactly the original rejection and no other errors. It applies the existing terminal loss reward of −1 and reports `paymentForfeits` separately. All choices remain available. Evaluation, demonstration collection, and rooms leave the controller disabled; unrelated failures still stop training.

Fourteen engine-backed controller cases cover both seats, affordable and unaffordable refusals, absent observations, mismatched source/turn/payment state/selection prefix, and duplicate rejection events. Python tests cover strict classification and terminal-loss propagation. The desktop v20 environment passed all 16 Python tests. A real CLI witness under `runs/2026-09-27-forfeit-reproduction/cli-forfeit-witness/verification.json` replays 34 captured choices, selects an affordable-through-payment EX8-074 declaration at zero memory, and refuses its reduction. The unmodified worker terminates after 36 decisions with the marked surrender, preserved rejection, and no other error; the real `train.episode` path returns a usable −1 reward and −1 terminal target. The same result is not accepted with the training flag disabled. This scripted witness checks the integration path, not learned strategy.

The first 32-game pilot stopped on a different unaffordable action without any refusal. That engine correction and its original-game replay are documented exclusively in [the engine ledger](../audits/engine/deferred-play-failures.md). The final frozen runtime is `checkouts/bt26-training-v23-applicable-verified`; its fresh CUDA run is `runs/2026-09-27-training-v23-applicable-verified`, using seeds 1510000–1510031 and eight-game PPO batches. All 32 episodes completed with 1,282 decisions, one win, 31 losses, no unusable trajectories, and no payment forfeits. The maximum parameter change was 0.0127605963, and checkpoint reload was exact. This random-initialization pilot establishes working updates; it is not a strength result and does not replace the required imitation initialization, coverage witnesses, or final evaluation.

### Monarchlizamon direct-battle choices

Fourteen asynchronous-policy scenarios now evolve into BT25-057 through its explicit alternate requirement and either refuse its direct battle or select either opposing Digimon. Both seats exercise winning, equal-DP, and losing choices, keeping unfavorable legal targets available. The candidate assertion excludes the opposing Tamer and breeding card. Tests verify exact surviving permanents, both trash zones, evolution source placement, evolution draw, memory, unchanged security, and lack of attack declarations or rejected actions. Opponent-owned deletion decisions are answered through that opponent's policy, preserving the information boundary.

These are policy-facing witnesses for this producer, not a whole-card audit or a closure of all direct-battle behavior. Marsmon's separate choice of the friendly battling Digimon remains open. Test-only source changes leave the v23 training artifacts paired with their frozen runtime rather than relabeling its checkpoint.

Desktop `checkouts/bt26-training-v24-effect-battle` passed 222 training/card tests and API typecheck. Spec review strengthened the breeding fixture to contain a Digimon above its egg, so card-kind filtering alone cannot explain its exclusion. The final isolated checkout `checkouts/bt26-training-v24-effect-battle-final` passed all 14 corrected cases and API typecheck. Standards review found no actionable issue.

### Fresh v23 imitation checkpoint

`runs/2026-09-27-training-v23-imitation` completed 80 demonstration games (seeds 1610000–1610079), 4,012 decisions, and zero unavailable teacher labels. CUDA imitation used seed 1620000, 20 epochs, and a 64/16 episode split: 2,571 training and 612 validation decisions with more than one candidate. The selected epoch 20 achieved validation loss 0.742216 and 72.06% agreement. Every recorded input hash was rechecked. Checkpoint SHA-256: `776e44f7452cc4976708a7615ef486d1bc7213bc9d200b2cab4907792fffed15`; frozen runtime SHA-256: `18e0656de0c885d6bd0c30180e84ae131719e02317b6e21e86cb967f873e6f02`.

Strict evaluation on 32 separate development seeds 1630000–1630031 completed 1,442 decisions with 13 wins and 19 losses, no errors, rejected actions, truncation, or training forfeits. Evaluation changed no parameters. This small result is below the strength gate and is not final held-out evidence.

A 256-game PPO continuation was launched in `runs/2026-09-27-training-v23-ppo256` using seed 1710000 and eight-game batches. Its attached job is configured to compare the initial and updated checkpoints through the asynchronous inference worker on the same 128 development seeds starting at 1810000, with a 512-decision limit. These stages are pending until their actual results and exit status are inspected; no strength or reliability claim is inferred from the launch.

That run stopped with exit code 1 on seed 1710045 after 45 completed episodes (2,761 decisions; 17 wins, 28 losses; no unusable trajectories or payment forfeits). The saved checkpoint contains the first 40 games. The next episode returned an insufficient-memory rejection without a training-forfeit marker, so strict accounting rejected it. The paired evaluation stages did not run. Repeating the same initialization and first 46 seeds reproduced the failure under `runs/2026-09-27-v23-ppo-reproduction`; its captured decisions support a short standalone replay. The checkpoint remains unpromoted while this admission failure is investigated.

### Copied When Digivolving choices

Thirty-eight asynchronous-policy cases in `copiedEffect.test.ts` exercise EX8-074's activation after either player's Digimon is played, for both source seats. They cover refusal of the copied effect, independent suspension/deletion refusals, every suspension target (self, ally, either opposing Digimon, or the just-played Digimon), and deletion choices under the changed DP ceiling. Suspending the effect source does not raise that ceiling. Exact candidate lists exclude Tamers and breeding Digimon, and retain the newly played opposing Digimon where eligible. A single eligible deletion target is resolved automatically by the engine; no nonexistent policy choice is claimed.

The tests verify both inner optional prompts in order when copying is accepted, including deletion after suspension is refused, and neither prompt when copying is declined. Final assertions cover both boards/trash zones, suspension states, memory, hand use, breeding preservation, no attack declaration/rejection, and completion. This card has one scoped When Digivolving effect, so there is no effect-menu choice to enumerate. Whole-card fidelity and once-per-turn lifecycle evidence remain in the existing card tests/audit ledger rather than being inferred from these policy witnesses.

Desktop `checkouts/bt26-training-v25-copied-effect` passed 261 training/card tests and API typecheck. After review prompted explicit inner-prompt assertions, `checkouts/bt26-training-v25-copied-effect-final` passed all 38 corrected cases and API typecheck. Standards review found no actionable issue. These test-only additions do not relabel the frozen v23 checkpoint.

### Resident affordability correction and fresh runtime

The v23 PPO failure was corrected and verified against its original captured game; evidence lives in [the engine ledger](../audits/engine/deferred-play-failures.md). A new frozen checkout, `checkouts/bt26-training-v26-inert-resident`, includes this correction and the latest policy witnesses.

The attached job at `runs/2026-09-27-training-v26-imitation-ppo` starts from newly collected demonstrations. It repeats the development schedules for comparison: 80 demonstration games from seed 1610000, 20 CUDA imitation epochs with seed 1620000, 32 strict development games from 1630000, 256 PPO games from 1710000, then paired 128-game asynchronous evaluations from 1810000. These are launch parameters, not completed results. The v23 checkpoint and interrupted PPO artifacts remain archived with their original runtime.

### Black Scramble Main evolution choices

Ten asynchronous-policy cases in `blackScramble.test.ts` cover LM-031 Main for both seats: refusal and all four combinations of two Soundbirdmon hosts with Eyesmon or Eyesmon: Scatter Mode from hand. Exact candidate lists exclude the wrong-color Digimon, Tamer, breeding Digimon, opposing Digimon, and wrong-color evolution card. Assertions verify both stacks, evolution draw, exact hand/deck/battle-area contents, memory, Option placement, and completion without rejected actions.

The isolated desktop checkout `checkouts/bt26-training-v27-black-scramble-main` passed all 26 tests across the new witnesses, existing Option policy tests, and LM-031 card tests, plus API typecheck on Node 26. Standards review found no actionable issue. Spec review confirmed the ten-case claim and noted that both tested evolutions become free after reduction; an evolution costing more than three remains necessary to distinguish reduction from a full waiver. Delay recovery/free-play and security policy lifecycles also remain open. These test-only changes do not relabel the frozen v26 model.

The follow-up adds ten Main cases evolving Ghoulmon into either of two DeathXmon copies. Acceptance pays the three-memory remainder after the Option's two-memory cost; refusal preserves those three memory. Sixteen further cases drive the real start-of-turn loop for both seats: refuse Delay, recover any of three eligible black Digimon, refuse the subsequent free play, or revive either eligible Soundbirdmon. Exact candidate lists exclude a wrong-color Digimon and Tamer, and exclude the recovered card from revival. When only one eligible revival remains the engine resolves it automatically. Soundbirdmon's on-play reveal is answered through the policy, with the recovered card's final destination checked along with the full hand, deck, battle area, and trash. Fixtures suppress the first-turn draw and seed an established Option; placement-age and condition-negative lifecycles are not claimed.

The isolated desktop checkout `checkouts/bt26-training-v28-black-scramble-delay` passed all 52 focused tests and API typecheck. Both review axes found no blocking issue; a subsequent type-only cleanup uses the public Main-phase controller directly. Security and condition-negative lifecycle policy witnesses remain open.

Six additional cases now trigger LM-031 security through an actual policy-declared attack for both seats. The defender refuses revival or selects either eligible Soundbirdmon; exact candidates exclude the higher-DP black Digimon, wrong-color Digimon, and Tamer. The tests finish combat, verify the Option returns to hand, resolve the revived Digimon's on-play reveal through the policy, and check final zones and unchanged memory. Eight further real-turn cases distinguish an empty opposing board, Tamer-only board, and breeding-only Digimon from a battle-area Digimon. Having an own Digimon preserves the recovery step but suppresses free play, leaving the small Digimon in trash. Both seats are covered.

The isolated desktop checkout `checkouts/bt26-training-v29-black-scramble-security` passed all 66 focused tests (50 Black Scramble policy cases, ten existing Option policy cases, and six LM-031 card cases), plus API typecheck. Both review axes found no actionable issue. These witnesses cover the scoped Main/Delay/security choices; they do not claim a whole-card audit or replace placement-age engine evidence.

### v26 PPO interruption

The fresh v26 checkpoint completed 32 strict development games with 1,479 decisions, 13 wins, 19 losses, and no unusable games or payment forfeits. PPO then completed 138 games with 7,484 decisions, 61 wins, and 77 losses in 358.35 seconds. Game 1710138 returned an unmarked asynchronous `playCard` / `insufficient-memory` rejection, so the attached pipeline stopped with exit code 1. The paired asynchronous evaluations did not run. The failed game is not counted among the 138 usable episodes, and the checkpoint is not promoted.

A separate diagnostic job at `runs/2026-09-27-v26-ppo-reproduction` repeats the original initialization, seeds, and eight-game batches, capturing the failing seed's worker messages. Its launch is not evidence of reproduction until the trace and terminal status are inspected. Original training artifacts remain unchanged.

That diagnostic run reproduced the same failure and exited with code 1. The captured single-game replay identifies a learner refusal of resident Ghoulmon's BeforePayCost target selection while playing Abbadomon Core at two memory. The original training controller required the request source to equal the played card, so it missed the resident source. The correction accepts a resident refusal only while paying play cost, with the learner seat, current pending decision, BeforePayCost timing, and live resident permanent/top-card identities all matching. Existing same-turn, active-continuation, in-hand played-card, and exact-rejection guards remain. Evaluation and room behavior are unchanged; this is a training-only loss, not successful action-coverage evidence.

Both-seat resident regressions failed before the correction. The expanded 36-case matrix passes, including affordable/unaffordable refusals, unobserved choices, and source, timing, permanent, seat, decision, turn, payment-state, and selection-prefix mismatches. Desktop `checkouts/bt26-training-v30-resident-refusal` passed all 324 training tests across 19 files, API typecheck, and build. Both review axes found no actionable issue.

`replay-v30.mjs` replays the captured choices against that new runtime and terminates after 21 decisions with learner seat 0 surrendering to seat 1. The original rejection is preserved and the marker identifies the played Core (`s0-36`), not the resident Ghoulmon. The diagnostic script explicitly replaces the captured input runtime hash for this cross-runtime replay; it does not relabel a model or modify the original trace. The trainer's actual classification function accepts the result with the training flag enabled and rejects it with the flag disabled.

A fresh attached pipeline is running at `runs/2026-09-27-training-v30-resident-refusal`: 80 demonstrations, 20 imitation epochs, 32 strict development games, 256 PPO games, and paired 128-game asynchronous evaluations, using the same development seed schedules as v26. These stages remain pending until their outputs and terminal status are inspected.

### e-Pulse destinations and free-play choices

Eighteen asynchronous-policy cases in `ePulse.test.ts` cover ST23-15 for both seats. Six drive the actual start-of-Main phase and either refuse placement or choose either eligible BEATBREAK Tamer. Exact candidates exclude the opposing Tamer, wrong-trait Tamer, and Digimon. The Option is placed face down at the bottom beneath an existing card, and the tests verify its departure from the battle area, the draw, memory gain, preserved stacks, and completed turn.

Twelve cases exercise Main use and real-attack security activation, with refusal or a free play from hand/trash. Candidate assertions exclude wrong-trait and excessive-cost cards. The tests verify exact final hand, trash, deck, battle area, security, Option placement, and ST23-13's on-play memory gain with the correct sign during the opponent's turn. This checks the stated producer and zone alternatives, not a whole-card audit or every possible follow-on effect of a played card.

Desktop `checkouts/bt26-training-v31-e-pulse` passed all 22 focused policy/card tests and API typecheck. Both review axes found no actionable issue. These test-only additions leave the active v30 pipeline paired with its frozen runtime.

### Bounded permitted history baseline

Observation schema 3 and feature version 5 add per-policy memory shared by synchronous training and asynchronous inference. `BotPlayer` forwards broadcast events to an optional policy hook before its normal handling; disposed bots stop forwarding. The collector allowlists only selected public event fields, with no authoritative-state access: play/evolution/hatch/movement identities, public and security reveals, attack identities, phase changes, memory deltas, recovery counts, and shuffle notifications. It also consumes the existing filtered observation to retain identities learned from the player's own hand, permitted face-down cards, public zones, or its private decision reveal. Other players' private decisions remain rejected.

The baseline stores the latest 64 selected public events and a sorted set of unique card identities ever legitimately observed. Snapshots are detached copies, match start resets memory, and own-turn start does not discard it. The identity set makes no claim about quantities, ownership, or current hidden locations. It does not retain every detail of prior reveals; older event order is lost when the bounded queue evicts entries. This deliberately bounded feed-forward summary follows the baseline design and does not establish final information equivalence.

The encoder appends the seen-identity bag and recency-weighted event/card/amount summaries separated by acting seat. Opaque engine IDs remain lookup keys only. These historical features change state inputs without rewriting current candidate identities or live statistics. Old observations fail the schema check, and older checkpoints remain incompatible by feature version and frozen runtime metadata.

Five TypeScript history tests cover both-seat hidden mutations, private reveal separation, public event delivery through the real bot driver, disposal, across-turn retention, eviction, reset, and snapshot isolation. Python tests verify history affects state features, event order matters, current candidate encoding is unchanged, and old observation schemas fail. Desktop `checkouts/bt26-training-v32-history` passed 386 training/driver tests across 22 files, API typecheck/build, and all 17 Python tests. Both review axes found no blocking issue. A later assertion-only cleanup requires the exact private-decision error; all five history tests pass locally after it.

The compatibility pilot at `runs/2026-09-27-training-v32-history-smoke` finished with exit code 0. Eight demonstrations from seed 1910000 completed 359 decisions with zero unavailable labels; 354 observations contained recent events, the maximum history length was 64, and the largest seen-identity set contained 26 cards. Three CUDA imitation epochs used seed 1920000. Sixteen PPO games from 1930000 completed 677 decisions, with one win, 15 losses, no unusable episodes or payment forfeits, maximum parameter change 0.007007042, and exact checkpoint reload. Eight asynchronous evaluation games from 1940000 completed 479 decisions with five wins and three losses, no truncation, errors, rejections, or fallbacks. This small pilot verifies compatibility and working updates, not release strength. Eleven room-inference tests also passed on the desktop. The older v30 run remains isolated on feature version 4.

### Completed v30 PPO comparison

`runs/2026-09-27-training-v30-resident-refusal` finished with exit code 0. Strict development evaluation completed 32 games and 1,479 decisions with 13 wins and 19 losses. PPO completed all 256 episodes: 13,794 decisions, 123 wins, 133 losses, zero unusable episodes, and one explicitly attributed payment-forfeit loss. It ran for 659.96 seconds, changed parameters by a maximum of 0.113113970, and reloaded its checkpoint exactly.

The paired 128-game asynchronous evaluations used the same development seeds beginning at 1810000. The imitation checkpoint won 46 games (35.94%, 5,934 decisions); the PPO checkpoint won 76 (59.38%, 6,345 decisions). All games terminated, with no truncation, errors, synchronous/asynchronous rejections, or fallbacks. This is a development improvement, not final held-out acceptance: the win rate remains below 60%, these seeds have informed development, and this model uses the older feature version 4.

The attached job `runs/2026-09-27-training-v32-history-full` now runs the same 80-demonstration, 20-epoch imitation, 32-game strict development, 256-game PPO, and paired 128-game evaluation schedule on frozen `checkouts/bt26-training-v32-history`. It uses the same development seed schedule for comparison. Results remain pending until actual outputs and terminal status are inspected.

### Abbadomon end-of-turn placement and deletion

Twenty asynchronous-policy scenarios in `abbadomonEndTurn.test.ts` exercise EX9-055 for both effect-controller seats at the end of either player's turn. They refuse its optional payment or select a level-4/level-5 Negamon-text Digimon from trash, then select either matching opposing Digimon. Exact candidate lists exclude the Digi-Egg, level-7 and wrong-text trash cards, wrong-level opposing Digimon, Tamer, and breeding Digimon. The tests drive the actual turn loop, including policy-based breeding skip and Main completion, and route opponent-owned deletion decisions to that player's policy.

Assertions verify top-source placement after existing sources, exact remaining trash and opposing board, the selected deletion, preserved hands/breeding, no pending decisions or rejected actions, and completed turn. These prove the selected producer/choice patterns, not every whole-card rule or every follow-on effect. Desktop `checkouts/bt26-training-v33-abbadomon-end` passed all 43 focused policy/card tests and API typecheck; both review axes found no actionable issue. Test-only changes leave active training frozen on v32.


### Marsmon boost and direct-battle policy choices (2026-09-27)

`marsmonBattle.test.ts` adds 20 asynchronous-policy cases across both seats. A real discounted BT25-020 play opens the mandatory +3000 DP selection, then the optional battle. Each boost target is combined with refusal or either friendly battler against either opposing Digimon. Exact candidate assertions exclude Tamers and breeding Digimon and preserve unfavorable legal battles. Winning, tied, and losing outcomes check both battle areas and trash, live DP, unsuspended participants, unchanged breeding, paid memory, and no attack declaration or rejected action. When Marsmon itself wins, the test requires its additional security trash; an allied winner does not get that effect. Any opposing Tamer deletion response is answered through the opposing seat's policy.

All 20 cases pass locally. Desktop `checkouts/bt26-training-v34-marsmon` passed 56 focused tests across this suite, Monarchlizamon battles, and the committed Marsmon card tests, plus API typecheck. Standards and specification reviews found no actionable issue. The scope is Marsmon's On Play choice path; other trigger timings and the overall coverage gate remain open. These test-only changes leave the active checkpoint paired with frozen v32.


### Liollmon security-to-Tamer policy choices (2026-09-27)

`securityPlacement.test.ts` verifies 12 cases: both seats, real On Play or breeding movement, and refusal or either eligible ST23-13 Tamer. Exact policy candidate lists exclude the wrong-trait Tamer, Digimon, and opposing Tamer. Assertions require bottom face-down placement beneath existing Tamer cards, the correct recovered security card, preserved security/deck tails, exact battle area, empty hand/trash/breeding, and correct payment. On Play waits for `mainActionReady`; movement opens and awaits the real breeding controller, preventing a partial asynchronous resolution from passing final assertions.

All 12 cases pass locally. Desktop `checkouts/bt26-training-v35-security-placement` initially passed 43 focused cases; after the completion-wait improvement it passed all 23 placement/card cases and API typecheck. Both review axes pass after resolving the completion-wait finding. This closes the named BT26-025 destination-choice witness, not all security mechanics or the overall action gate.


### Habakirimon largest-security policy choices (2026-09-27)

`mostSecurity.test.ts` adds 14 cases using real alternate BT25-043 evolution across both seats. After mandatory recovery, the controller has two security cards; opposing counts of one, two, or three exercise own-largest, tied, and opponent-largest choices. The policy must expose exactly every eligible side plus refusal. Exact resulting security/trash order proves that choosing self trashes the newly recovered card, while choosing the opponent removes their original top card. Evolution draw, source stack, deck tail, memory, and unsuspension only after acceptance are checked after `mainActionReady`.

All 14 cases pass locally. Desktop `checkouts/bt26-training-v36-most-security` passed 32 focused policy/card cases and API typecheck; both review axes found no actionable issue. This establishes the Habakirimon When Digivolving producer; BT26-031's follow-on target selection and other unverified security paths remain separate.

### History-enabled full run: training completed, strict PPO evaluation failed (2026-09-27)

The v32 pipeline is terminal with exit code 1. All 80 demonstrations and 20 imitation epochs completed. Strict development evaluation completed 32 games and 1,341 decisions (14 wins, 18 losses, zero unusable episodes or payment forfeits). PPO completed all 256 games and 13,374 decisions (120 wins, 136 losses, four attributed payment-forfeit losses, zero unusable episodes) in 667.22 seconds. Maximum parameter change was 0.1321172863 and checkpoint reload was exact.

The imitation baseline completed all 128 asynchronous evaluation games, with 45 wins, 6,120 decisions, and no truncation, errors, rejected actions, or fallback. PPO evaluation stopped after three games: seed 1810002, Abbadomon learner seat 0 against Glowing Dawn, reached 512 decisions with 487 asynchronous `playCard` / `insufficient-memory` rejections. Its two preceding games terminated normally. This is a failed checkpoint acceptance result, not a comparable 128-game strength estimate. A first-rejection reproduction against the unchanged frozen runtime and checkpoint fails after 26 policy choices. The learner accepted its payment choices; this is not a refusal penalty case. The open engine source-scope diagnosis is recorded in [the deferred-play ledger](../audits/engine/deferred-play-failures.md).


### Corrected payment scope and next training run (2026-09-27)

The v32 inference failure has an engine correction with original-game replay evidence in [the deferred-play ledger](../audits/engine/deferred-play-failures.md). Resident refusal attribution now uses a legitimate cross-card producer and its printed timing. Earlier Ghoulmon-resident training evidence does not establish legal card behavior and is superseded by that correction.

The next full pipeline uses isolated `checkouts/bt26-training-v37-self-cost` and fresh artifacts under `runs/2026-09-27-training-v37-self-cost-full`: 80 demonstrations, 20 CUDA imitation epochs, 32 strict development games, 256 PPO games, then paired 128-game asynchronous evaluations. Development seeds remain 1610000, 1620000, 1630000, 1710000, and 1810000 respectively. This is a fresh compatible run, not promotion or metadata relabeling of the failed v32 checkpoint. Final results are pending.


### Frozen-scope declaration review (2026-09-27)

Reviewed the 35 distinct IDs resolved from both pinned decks against `mainActions`, `breedingActions`, their engine validators, the compiled runtime in `checkouts/bt26-training-v37-self-cost`, and the catalog's DUAL markers. This review classifies declaration families; it does not close the remaining producer/lifecycle and observation gates.

| Declaration | Scoped producers | Adapter/evidence |
| --- | --- | --- |
| Hatch / skip breeding | ST23-01, EX9-005 | `breedingActions` uses the engine hatch validator; `actions.test.ts` |
| Move from breeding | Eligible evolved breeding Digimon | Engine movement validator; BT26-025 movement/placement in `securityPlacement.test.ts` |
| Play / use hand card | Non-egg cards; DUAL cards use their Option side on ordinary play | Authoritative play validator, all scoped card identities and costs; `actions`, `payments`, `affordability`, `sacrifice`, and Option suites |
| Normal / alternate evolution | Every hand/base pairing, including breeding, with each registered requirement index | Authoritative evolution validator; public alternate/effect-driven paths in `actions`, `payments`, `arts`, and the battle/security suites |
| Attack player / Digimon | Eligible battle-area attackers and every opposing permanent accepted by the engine | Authoritative attack validator; `combat.test.ts` and real attack fixtures |
| Activate effect | EX9-005 breeding Main; LM-031, LM-033, LM-054 Delay abilities | Projection's activatable effects plus engine activation validator; `actions`, `negamon`, `options`, and `blackScramble` suites |
| End phase | Main and breeding | Explicit candidate in both generators; seeded sync/async complete-match parity |
| DUAL Arts follow-up | ST23-09, BT25-057, BT26-031, BT25-043 | Decision adapter after Option use; all four now included in `arts.test.ts` |

The compiled scope gate checks every card for absent DNA, App Fusion, Link, Mind Link, DigiXros, and Assembly requirements, and checks the scoped keyword families and absence of Counter triggers. None requires an additional declaration family for these lists. Triggered effects, inherited effects, security skills, and Start-of-Main placement create engine decision windows rather than a separate Main intent; their individual choice coverage remains in the inventory above.

The runtime's scoped security operations are `toHand`, `addTop`, `trashTop`, and `RecoverByTrashingMostSecurity`, alongside explicit security costs and Tamer placement. ST23-03's top-security-to-hand followed by recovery is a fixed sequence, not a player-controlled swap/order choice. No scoped security swap/reorder producer was found, so the earlier generic “swap ordering” placeholder is removed rather than counted as a tested mechanic.

The review also corrected a real inventory omission: earlier Arts evidence covered three DUAL cards, but BT25-043 is the fourth. Its two eligible level-5 hosts and refusal now have policy cases. A scope guard compares the tested Arts IDs against the actual pinned-deck DUAL catalog IDs so this omission cannot silently recur.

### Conditional security targets and complete DUAL producer list (2026-09-27)

Ten new `mostSecurity.test.ts` cases drive BT26-031's real alternate evolution across both seats. Refusal opens no follow-on target window; either tied security side can pay, followed by either opposing Digimon or Tamer. Exact target lists exclude friendly and breeding Digimon. Public `cannotSuspend` and the engine restriction query identify only the selected target; security/trash identities, source stack, evolution draw, deck tail, memory, and asynchronous completion are verified. Duration/enforcement beyond this selection path remains separate card evidence.

The Arts suite now has 15 behavioral cases plus its DUAL inventory guard, including BT25-043's two hosts and refusal. Local changed-file suites and lint pass. Desktop `checkouts/bt26-training-v38-most-security` passed all 73 focused policy/card/declaration tests across five files and API typecheck. Both review axes found no actionable issue. These test-only additions leave the live v37 training runtime unchanged.


### Leave-field protection policy witness (2026-09-27)

`leaveProtection.test.ts` adds eight cases across both seats: public opposing Ghoulmon play threatens Habakirimon itself or a Glowing Dawn ally, and the defending policy accepts or refuses protection. Assertions require the owner's correctly attributed prompt, both optional response intents, exact surviving boards/source stacks, and exact deleted or paid cards in trash. Accepting protection also requires Ghoulmon's subsequent “didn't delete” security trash, distinct from the protection cost. Hand, memory, action completion, and absence of rejections are checked. This proves the self/ally choice paths for this producer, not every removal cause or once-per-turn reset.

All eight cases pass locally. Desktop `checkouts/bt26-training-v39-protection` passed 76 focused policy/card cases across five files and API typecheck; both review axes found no actionable issue. The frozen v37 training job continues independently.

### v37 interruption and subscription-affordability correction (2026-09-27)

The v37 pipeline is terminal with exit code 1. Its 32 strict development games completed 1,437 decisions with 14 wins, 18 losses, and no unusable games or payment forfeits. PPO completed 103 games and 5,820 decisions with 43 wins, 60 losses, and no unusable episodes or payment forfeits in 273.85 seconds. Seed `1710103` then returned two unclassified asynchronous payment rejections; the paired evaluations did not run. The checkpoint files remain archived, not promoted.

A deterministic diagnostic repeat reproduced the same preceding results and failure. The engine correction, minimized regressions, and original-game replay evidence are recorded in [the deferred-play ledger](../audits/engine/deferred-play-failures.md). Corrected runtime `checkouts/bt26-training-v40-subscriptions` passes desktop tests, typecheck, build, and the captured failing-state check. This correction preserves legal interactive payment choices and requires a fresh compatible training run.

The attached v40 pipeline is now running under `runs/2026-09-27-training-v40-subscriptions-full`, starting with 80 fresh demonstrations. It retains the development schedules: 20 CUDA imitation epochs, 32 strict development games, 256 PPO games, then paired 128-game asynchronous evaluations. Seeds are 1610000, 1620000, 1630000, 1710000, and 1810000 respectively. A diagnostic wrapper outside the frozen runtime records the latest episode's windows and selected actions without changing the model or sampling; a failed episode can therefore be replayed without repeating the whole training sequence. Launch and initial completed collection games are verified; training and evaluation results remain pending.

### Garnet and Treadmill reveal policy witnesses (2026-09-27)

`optionReveals.test.ts` adds 24 asynchronous-policy cases across both seats. Garnet Main selects either eligible red/black Digimon, excludes a black Tamer, and orders the remaining cards in either direction. Treadmill Main and real-attack security paths select either a black Tamer or Option, verifying its broader card-kind eligibility. No-eligible cases preserve the whole reveal in the chosen bottom order. Garnet security places the Option without revealing or changing its controller's deck.

Assertions require exact selection and successive ordering candidates, visible card identities, exclusion of the unrevealed deck tail, final hand/deck/battle-area/security/trash contents, memory, and completed combat/action resolution without rejection. Main placement does not immediately offer Delay; next-turn Delay eligibility remains a separate lifecycle gate.

Desktop `checkouts/bt26-training-v41-option-reveals` passed 46 focused policy/card tests and API typecheck. Standards and specification reviews found no actionable issue. This is producer-specific policy evidence, not a whole-card audit. The test-only addition does not change the frozen v40 training runtime.

### Garnet and Treadmill later-turn Delay lifecycle (2026-09-27)

`optionDelayLifecycle.test.ts` adds 24 cases across both seats and real Main/security placement. The production turn loop advances naturally to the owner's later Main phase, where the policy activates the placed Option. Garnet gains exactly two memory. Treadmill refuses evolution or selects every pairing of two Soundbirdmon hosts with Eyesmon or Eyesmon: Scatter Mode; the former pays a one-memory remainder and the latter becomes free. Exact choices, source stacks, evolution draw, final zones, consumed Option, and absence of a second activation are checked after full resolution.

Main placement proves the entry-turn exclusion. The security cases prove availability on the immediately following owner turn; their earlier off-turn exclusion alone is not evidence for the age guard. Opponent actions and blocking also use policy intents, and teardown awaits the turn loop.

Desktop `checkouts/bt26-training-v42-option-delay` passed all 71 focused policy/card/conformance tests and API typecheck. Both review axes found no blocking issue. This closes the named Garnet/Treadmill lifecycle witness without asserting complete rules fidelity or changing frozen v40 checkpoint metadata.

### v40 completed training and paired development evaluation (2026-09-27)

The desktop pipeline `runs/2026-09-27-training-v40-subscriptions-full` is terminal with exit code 0. PPO completed all 256 games and 14,554 decisions in 668.03 seconds: 124 wins, 132 losses, no unusable episodes, and no payment forfeits. Its verification reports maximum parameter change 0.1217026561 and an exact checkpoint reload.

The paired asynchronous development evaluations each completed 128 games. Imitation won 45 (35.15625%) across 6,001 decisions; PPO won 82 (64.0625%) across 7,695 decisions. Direct inspection of every evaluation result found zero truncations, errors, synchronous/asynchronous rejections, or timeout/error fallbacks in both runs. The recorded inference-call p95 was 1.950 ms for imitation and 1.963 ms for PPO; this excludes observation construction and full decision handling and therefore does not close the end-to-end latency gate.

These are development results on the established seed schedule, not the reserved final evaluation, independent-training-seed replication, or proof of every scoped action. Both saved checkpoints remain paired with the immutable v40 runtime. The first rendered browser attempt failed before room creation because the diagnostic HTTP handler answered the matchmaking request with a 404; its trace provides no gameplay evidence. Correcting that diagnostic route dispatch and repeating the browser check remains in progress.

### Rendered v40 model smoke and hidden-hand transition fix (2026-09-27)

The browser check exposed a real frontend crash in `releaseHandMoves`: a turn-transition hand arrival attempted `.find` on an opponent hand collection omitted by the visibility-filtered snapshot. Two regression cases, one per seat, reproduced the same exception before the fix. Optional chaining now preserves public hand/deck count updates without reading or reconstructing concealed identities. Both cases and the related phase-banner/presented-state tests pass (17 tests), frontend and workspace typechecks pass, and standards/spec reviews found no actionable issue.

After correcting the diagnostic HTTP route dispatch, fixing that crash, and rerunning without a concurrent Vite rebuild, the Chromium smoke completed successfully against the desktop's immutable v40 runtime and compatible **imitation** checkpoint. The real client selected the pinned Glowing Dawn deck and received the `BT26 AI` opponent. By turn 4, its decoded board contained BT25-041 above ST23-01, BT26-025, and BT25-035; visual inspection of `artifacts/bot-training/browser-v40/model-on-board.png` confirmed the rendered Murasamemon and three-source stack. The saved `result.json` records the matching server board, external policy, zero rejection/error/timeout fallbacks, and no browser console/page errors. `trace.zip` and the diagnostic smoke script remain in that local artifact directory; the desktop helper is `runs/2026-09-27-browser-v40/server.mjs`.

This is a partial-game transport/rendering witness, not a complete browser match or PPO browser acceptance. The frontend was the current working tree, including unrelated local UI changes; the backend/model remained frozen. The final browser gate must still use a reproducible clean frontend and the selected release checkpoint. Existing presentation-test defaults are preserved; the test harness now accepts explicit bot mode and bot deck ID without needing a scripted development scenario.


### Eyesmon deletion retrieval and v40 reliability run (2026-09-27)

Eight `eyesmonRetrieval.test.ts` cases cover both seats and refusal or each eligible return after a real losing attack deletes EX9-047. The policy must expose exactly the two preexisting Negamon-text Digimon and the newly deleted Eyesmon itself. Exact candidate lists exclude the Digi-Egg, wrong-text Digimon, Tamer, and opponent's trash. Final hand/trash identities, surviving defender, unchanged memory, completed combat/action resolution, and absence of rejections are asserted. This closes the named retrieval choice witness without claiming every deletion cause or whole-card fidelity.

Desktop `checkouts/bt26-training-v43-eyesmon-retrieval` passed all 54 focused policy/card tests and API typecheck. Local eight-case execution, formatting, lint, and both review axes pass. This test-only checkout leaves the trained v40 runtime immutable.

A separate 1,000-game asynchronous CPU reliability evaluation of the v40 PPO checkpoint is running with seeds starting at `2210000`, decision budget 512, and all eight deck/seat combinations per block. Artifacts are under `runs/2026-09-27-v40-ppo-reliability/evaluation`, with output in `evaluation.log` and terminal status in `evaluation-exit-code`. A preliminary launch was rejected before any game because its output directory already existed; the actual run uses the fresh nested directory. PID 7552 was verified live after at least 115 completed games. Full results remain pending; this is reliability evidence, not the reserved final strength evaluation or exhaustive action coverage.


### Complete reveal-producer inventory and two additional witnesses (2026-09-27)

Inspection of the executable v40 compiled records for all 35 pinned IDs identifies six `RevealAdd` producers. `remainingReveals.test.ts` now compares that set against both pinned decks so a newly introduced producer cannot silently escape this inventory. This guards the producer list, not whole-card correctness or every triggering route.

| Producer | Reveal-choice evidence | Distinct lifecycle limit |
| --- | --- | --- |
| BT25-032 | `reveals.test.ts`: overlapping trait/color groups | On Play witness |
| ST23-06 | `reveals.test.ts`: hand, under-Tamer destination, remainder | On Play and breeding movement witnesses |
| EX9-046 | `remainingReveals.test.ts`: all four assignments across Negamon-text/Abbadomon-name groups, no-eligible ordering | On Play witness |
| EX1-066 | `remainingReveals.test.ts`: either eligible Digimon, excludes Tamer, remainder to trash, no eligible cards | On Play and real security-to-play witnesses |
| LM-033 | `optionReveals.test.ts`: red/black selection and remainder order | Main; security places without revealing |
| LM-054 | `optionReveals.test.ts`: yellow/black selection including non-Digimon | Main and real security reveal witnesses |

The new suite contains 16 behavioral cases across both seats plus the inventory guard. Exact offered groups prevent taking the same revealed card twice. Observation assertions require revealed identities while excluding the unseen deck tail. No-eligible Soundbirdmon orders all three cards in reverse at the deck bottom; Analog Youth trashes its entire reveal. Final hand/deck/trash/battle-area contents, memory, action readiness, and no rejection are verified.

Desktop `checkouts/bt26-training-v44-reveals` passed all 84 focused policy/card tests and API typecheck. Local tests, formatting, lint, and both review axes pass. This test-only checkout leaves the active v40 reliability evaluator unchanged.

The same compiled-record inspection identifies return producers EX9-047, LM-031, ST23-09, and ST23-12. EX9-047 and LM-031 have dedicated policy witnesses. ST23-09's suspended-highest-DP return target now has the dedicated `atratusReturn.test.ts` witness below; existing Arts tests alone did not prove it. ST23-12's payment-followed-by-trash retrieval now has the dedicated witness below. Mixed-zone payment and placement operations remain separately represented by EX9-057 and the Tamer/Negamon suites.


### Chiropmon payment and newly paid retrieval choices (2026-09-27)

Fourteen `chiropmonRetrieval.test.ts` cases exercise both seats, refusal, either eligible Tamer payment source, and each resulting retrieval target. A real ST23-12 play routes payment and retrieval through the asynchronous policy. The return candidates must include the just-trashed Glowing Dawn Digimon, as permitted by Q6185, alongside both preexisting eligible cards. Empty/opposing Tamers, non-Digimon, Digi-Eggs, wrong-trait Digimon, and opposing trash are excluded by exact candidate assertions.

Each Tamer fixture contains a face-up card before two face-down cards, proving that payment selects the bottom face-down card and preserves the others' order and visibility. Exact final hand, trash, board, opposing stack/trash, memory, readiness, and absence of rejection distinguish every payer/return pair and refusal. This proves the named On Play policy path, not inherited Retaliation or whole-card fidelity.

Desktop `checkouts/bt26-training-v45-chiropmon` passed all 35 focused policy/card tests and API typecheck. The local 14-case suite, formatting, lint, and both review axes pass. The production checkpoint remains paired with frozen v40.

### Completed v40 PPO reliability evaluation (2026-09-27)

`runs/2026-09-27-v40-ppo-reliability/evaluation` completed all 1,000 games (seeds 2210000–2210999) with terminal exit code 0. Direct inspection of every saved result confirms 59,161 decisions, all games terminated, zero truncations, zero engine errors or synchronous/asynchronous rejections, and zero timeout/error fallbacks. PPO won 622 games (62.2%), with no draws. The CPU inference-call p95 was 1.987 ms; full decision latency remains a separate gate.

Every deck/seat cell contains 125 games:

| Seat 0 deck | Seat 1 deck | Learner seat | Learner wins |
| --- | --- | --- | --- |
| Glowing Dawn | Glowing Dawn | 0 | 55 |
| Glowing Dawn | Abbadomon | 0 | 66 |
| Abbadomon | Glowing Dawn | 0 | 90 |
| Abbadomon | Abbadomon | 0 | 86 |
| Glowing Dawn | Glowing Dawn | 1 | 79 |
| Glowing Dawn | Abbadomon | 1 | 94 |
| Abbadomon | Glowing Dawn | 1 | 56 |
| Abbadomon | Abbadomon | 1 | 96 |

Aggregated by learner deck, Glowing Dawn won 256/500 (51.2%) and Abbadomon won 366/500 (73.2%). This establishes the current checkpoint's 1,000-game reliability witness and exposes uneven strength. It does not substitute for the reserved final strength evaluation, replication across independent training seeds, exhaustive legal-choice witnesses, full observation equivalence, or complete browser-match verification.


### Eclipse Impact target ordering and Analog Youth security entry (2026-09-27)

Fourteen `atratusReturn.test.ts` cases cover both seats and every legal suspension/return pairing in a four-Digimon fixture. Eclipse Impact first selects any opposing Digimon, including an already suspended one, then recomputes the highest DP among suspended Digimon. Both tied 9,000-DP targets remain selectable while the unsuspended 14,000-DP Digimon is excluded; suspending that Digimon makes its return automatic as the unique highest target. Exact candidate lists exclude friendly, Tamer, and breeding permanents. Assertions require the selected top card at the deck bottom, its source in trash, preserved other stacks, correct suspension, consumed Option, paid memory, and completed resolution without rejection. The fixture has no eligible Arts evolution host; Arts acceptance/refusal has its separate suite.

Six additional `remainingReveals.test.ts` cases cover Analog Youth's security-to-play entry for both seats. A real policy-selected opposing attack checks security, plays the Tamer without cost, and resolves its On Play reveal through the defending policy. Either eligible Digimon or a no-eligible reveal produces exact hand/trash/deck/battle-area/security results. Remaining security is preserved, unseen deck-tail identities stay absent from model observations, and combat completes. The suite now has 22 behavioral cases plus its six-producer inventory guard.

Desktop `checkouts/bt26-training-v46-return-security` passed all 68 focused policy/card tests and API typecheck. Local changed suites passed 37 cases; formatting, lint, and both review axes pass. These test-only changes preserve the frozen v40 checkpoint. They close the named return-target and reveal-entry gaps, not other activation timings, observation equivalence, or the overall release gate.

### Complete clean-frontend PPO browser match (2026-09-27)

A fresh detached frontend checkout at commit `6e3f4e124` (`/tmp/aegis-browser-clean-6e3f4e124`) was clean before and after the test. Its shared package was built from that checkout, and its Vite server ran separately on port 4177. The desktop server used immutable `checkouts/bt26-training-v40-subscriptions` and the compatible PPO checkpoint, SHA-256 `2e49f5917c4fc2d53384f0473d1147da815ebbaae6503cb0e77d68ff7233473a`. The checkpoint handshake passed without relabeling metadata.

Chromium drove only visible human-seat controls: keeping the opening hand, ending breeding/Main, and declining optional choices if offered. The human deck was pinned Glowing Dawn; the bot played pinned Abbadomon with seed `990024`, normal production pacing, and the external neural policy. The human deliberately passed; this is a transport/rendering test, not strength evidence.

The match completed on turn 8 with seat 1 winning by `security`. The browser snapshot, server state, broadcast `gameOver` event, and rendered Defeat heading agreed. The run made 19 model queries (mulligan, breeding, Main), with zero browser console/page errors, zero rejected-action broadcasts, zero model-call errors, and zero timeout/error fallbacks. Visual inspection confirmed both the played board and final result screen. Artifacts and diagnostic scripts are in `artifacts/bot-training/browser-v40-ppo-full/`: `full-match.mjs`, `server.mjs`, `result.json`, `trace.zip`, `model-board.png`, and `game-over.png`. The remote helper and server stats are under `runs/2026-09-27-browser-v40-ppo-full`.

An initial script needed to await state changes between UI clicks. A subsequent completed match exposed incomplete diagnostic event capture: wrapping the engine hook after construction missed events held by combat's earlier callback. The final successful repeat captures the room's actual broadcast boundary, including the authoritative game-over event. These diagnostic corrections do not change the frozen game runtime or model behavior.

This closes the complete-match clean-frontend browser witness for PPO Abbadomon against a passive Glowing Dawn human seat. It does not prove every interactive browser prompt, all deck/seat combinations, full action coverage, observation equivalence, or final release strength.
