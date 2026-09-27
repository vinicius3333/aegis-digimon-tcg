# Local AI for the Aegis bot

Research date: 2026-09-26. Scope: agents that select moves during matches. Image/card generation, rules assistants, and price prediction are not trained game-playing agents.

## Findings

We did not find a verifiable public model with trained weights, inference code, and an open license that already plays Digimon Card Game. This describes the search result; it does not prove that no such project exists. Searches combined Digimon TCG/Card Game with AI, reinforcement learning, pretrained/model, GitHub, and Hugging Face.

[Project Drasil](https://github.com/WE-Kaito/digimon-tcg-simulator) has a Digimon bot: [BeelzemonXBot.py](https://github.com/WE-Kaito/digimon-tcg-simulator/blob/main/ai/BeelzemonXBot.py) contains priorities and decisions programmed around card identifiers. It is a heuristic bot, not evidence of a trained neural network. Its [bot guide](https://github.com/WE-Kaito/digimon-tcg-simulator/blob/main/Bot-Guide.md) describes partial automation.

The strongest concrete example found of a TCG agent with available weights and documented local execution is **YGO Agent**, for Yu-Gi-Oh!. Its architecture and training process are useful references; changing card names would not make its weights play Digimon.

We also inspected [DCGO's selection utility](https://github.com/DCGO2/DCGO/blob/develop/Assets/Scripts/Script/AISelectionUtility.cs): it samples valid combinations and falls back to exhaustive enumeration. That utility is not trained-model inference; this inspection does not characterize the entire project.

## Verified alternatives

| Project                                                                           | Trained artifact                                                                                                                                                             | Execution and licensing                                                                                                                                                                                                                                                                             | Relevance to Aegis                                                                                                                                                                           |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [YGO Agent](https://github.com/sbl1996/ygo-agent)                                 | [Release v0.1](https://github.com/sbl1996/ygo-agent/releases/tag/v0.1) lists three Flax checkpoints and `0546_26550M.tflite`, at 17,679,932 bytes, plus embeddings.          | README documents a local API using `uvicorn ygoinf.server:app`, CPU evaluation, and GPU training. Main code is MIT, with Apache-2.0 notices for EnvPool-derived portions in [LICENSE](https://github.com/sbl1996/ygo-agent/blob/main/LICENSE). No separate explicit weights license was identified. | Best practical reference found for a neural policy in a complex TCG. Requires Digimon observations, actions, and training. Provided binaries target Ubuntu; Mac execution was not validated. |
| [Cardsformer](https://github.com/WannianXia/Cardsformer), Hearthstone             | README links policy and prediction checkpoints on [Google Drive](https://drive.google.com/drive/folders/1ZY1LhhLpBr0GzcM1GYOoaiMm1pmoAduC?usp=sharing).                      | Includes `eval.py` and training scripts, with PyTorch, pythonnet, and Mono dependencies. No repository license file was identified; public source alone does not establish unrestricted reuse.                                                                                                      | Reference for card representation and generalization. Checkpoint downloads and execution were not tested. Not the first integration choice.                                                  |
| [gym-locm](https://github.com/ronaldosvieira/gym-locm), Legends of Code and Magic | [Published models](https://github.com/ronaldosvieira/gym-locm/blob/master/gym_locm/trained_models/README.md) are **draft** agents in ZIP/JSON, not a complete battle policy. | Gymnasium environment, MIT license, battle-training scripts, and draft predictor. README states that LSTM draft prediction is not implemented.                                                                                                                                                      | Useful environment, observation, action, and evaluation structure. Does not provide a ready-made Digimon player.                                                                             |
| [RLCard](https://github.com/datamllab/rlcard)                                     | Its [model registry](https://github.com/datamllab/rlcard/blob/master/rlcard/models/__init__.py) includes pretrained Leduc Hold'em CFR and several rule-based agents.         | RL toolkit for games including poker, UNO, and Dou Dizhu. General MIT license; derived files may carry their own notices.                                                                                                                                                                           | Useful algorithms and imperfect-information examples, but less similar to Digimon's catalog and interactions. No Digimon environment.                                                        |

The YGO Agent TFLite file demonstrates that a trained game policy need not be a billion-parameter LLM. File size does not establish total RAM, latency, training cost, or playing strength. Release asset metadata was checked through the GitHub API; the models were not executed.

We also found [pokemon-tcg-sim](https://huggingface.co/sayidm/pokemon-tcg-sim), which describes a policy trained by behavioral cloning. Its model page explicitly states that the included engine is not open source and lists its license as `other`; it was not selected as an openly reusable stack.

## Adaptation to Aegis

These are engineering proposals, not implemented features or guarantees of competitive strength.

The inspected local foundation includes [BotPolicy](../apps/api/src/bot/policy.ts), [BotView](../apps/api/src/bot/view.ts), [BotPlayer](../apps/api/src/bot/BotPlayer.ts), and [matchHarness](../apps/api/src/bot/matchHarness.ts). Decisions are synchronous, the current view reduces some zones to counts, and the harness already runs seeded matches and collects outcomes. A decision-level training interface remains necessary.

1. **Limit the first experiment to 2–4 decks.** Establish a current-bot matchup matrix and reserved evaluation seeds. Pin the engine and card versions so the agent is not learning against changing semantics.
2. **Expose Aegis as a training environment.** Provide reset, player observation, legal-action enumeration, and advancement to the next decision. Cover setup, breeding, effect choices, targets, blocking, and other windows. An action is not necessarily a whole turn. Keep rules in the existing engine.
3. **Improve observations.** Represent the player's hand, public board and evolution stacks, public trash, memory, security counts, revealed cards, and permitted history. Do not provide the opponent's hidden hand, actual deck order, or unrevealed security. Action enumeration must not reveal information unavailable to the player either.
4. **Train a policy and value network.** Initialize through imitation of current-bot or recorded human games. This does not demonstrate improvement over the teacher. Then experiment with masked PPO against previous checkpoints and varied opponents. Consider recurrent history later if required by measured shortcomings.
5. **Integrate local inference.** A persistent Python process is a straightforward first boundary. External inference requires adapting the current synchronous contract, enforcing deadlines, rejecting stale responses, and preserving a fallback. Consider a local Node runtime export afterward if the architecture supports it.
6. **Promote only with evidence.** Compare results by matchup, balance sides, use unseen seeds, measure p95 latency, invalid selections, timeouts, and incomplete matches. Report uncertainty rather than only an aggregate percentage. Evaluate unseen decks separately.

Search over action sequences can be added later. Simulate possibilities compatible with the player's knowledge rather than inspecting actual hidden cards. The recommended first deliverable is a reproducible training environment and a small model measured against the current bot; a checkpoint from another TCG does not remove that work.

[PettingZoo AEC](https://pettingzoo.farama.org/api/aec/) provides a sequential multi-agent environment reference. [MaskablePPO](https://sb3-contrib.readthedocs.io/en/master/modules/ppo_mask.html) implements PPO with action masking, but explicitly does not support recurrent policies. Combining recurrence and masking requires another implementation or custom work. A bounded public-history summary in a feed-forward observation is a first experiment to evaluate.

## Architecture follow-up

- [YGO Agent's model](https://github.com/sbl1996/ygo-agent/blob/main/ygoai/rl/jax/agent.py) combines state and candidate-action representations, masks invalid/padded actions, and supports recurrent history. Its [embedding script](https://github.com/sbl1996/ygo-agent/blob/main/scripts/card/embedding.py) calls Voyage API, which should not be inherited by a fully local Aegis design.
- Cardsformer combines text and numeric card/entity features in its [policy](https://github.com/WannianXia/Cardsformer/blob/main/Model/PolicyModel.py), while its [encoder](https://github.com/WannianXia/Cardsformer/blob/main/Algo/encoder.py) caches frozen text embeddings. Treat these as conceptual references while its reuse license remains unidentified.
- [gym-locm's battle trainer](https://github.com/ronaldosvieira/gym-locm/blob/master/gym_locm/toolbox/trainer_battle.py) uses MaskablePPO, fixed opponents, self-play, and hybrid training, with separate evaluation seeds. These are useful workflow patterns rather than directly compatible model components.

## Limits and recommendation

- No external model benchmark or training was performed in this research.
- Competitive strength, training hours, and cost cannot be estimated responsibly before measuring Aegis simulation throughput on the target hardware.
- Reuse architectural ideas from YGO Agent and environment patterns from gym-locm, retain the Aegis engine, and train a Digimon-specific policy. Test Cardsformer-inspired text features as an optional comparison.
- A local LLM may help explain moves, but textual rules knowledge does not substitute for measured playing strength.

The implementation proposal and desktop preflight are recorded in [the local bot training plan](plans/2026-09-26-local-bot-training-design.md).
