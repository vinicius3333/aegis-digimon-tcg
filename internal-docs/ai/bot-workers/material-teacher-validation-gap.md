# Validation-gap teacher collection continuation

ROOT owns this source-only adapter from the `bot-effect-validation-gap` worktree, based on pushed ROOT `ad0bdf56c`. It adds the smallest continuation for the last real corpus gap. This note holds no remote, game, model or mastery evidence.

## Starting point

All full consumers have passed for 3,956 real natural teacher games. All 181 identities are visible in both original folds, and all eight families appear in both training seats. Only validation `effectDigiXrosMaterial:seat1` is absent. The contexts-4 actual closure is identity `39582aeff9919d9b2388dc6d7988a4050a98ca1f817e581a0c3773d5ed889e28`, completion `5711a63955057194baba281f72be93596791fdd657158763b9773553da39c4f2`, report `bd5f5116bdc851f478683664f7bf33e7d32621e9c8457da11af36ce75ae03b0d`.

## What the adapter does

`tools/bot-training/operators/material-teacher-gap-learning.py` is external to the qualified archive. It adds only two fresh blocks and takes over the not-yet-run learning phases.

| Phase | Owner | Seeds (half-open) |
| --- | --- | --- |
| diagnostic, contexts, contexts-1, contexts-2 | Original operator `c460…4613`, original request `d3ed…ee57`, through the effect adapter | unchanged |
| contexts-3, contexts-4 | Effect adapter `5b97…a861`, effect request `a862…6945` | unchanged |
| contexts-5 (required) | Gap adapter | 6003520..6004400 |
| contexts-6 (optional) | Gap adapter | 6004400..6005280 |
| imitation, ppo, comparison | Gap adapter | unchanged |

The adapter never fabricates ownership or rewrites a closed namespace:

- It executes the effect adapter from its hashed byte buffer. The effect adapter then loads the original operator the same way.
- Every prior closure goes through its actual owner and full consumer. Each one must match the identity/completion pins in the gap request. The first four pins must also equal the effect request.
- New phases reuse the complete original function definitions unchanged: whole, Go, run, collection, corpus, tensor worker and main.
- New commands copy the actual contexts-4 argv, including the external `--worker`. Only `--seed`, `--games` and `--output` change. All other commands stay byte-equal to the effect context.
- The original `blocks` check still rejects overlap, reserved final seeds 6210000+ and non-multiples of 440. Both blocks are 880 games, so the original episode `index % 5` folds hold in the corpus.
- The original Python stays loaded in memory. The adapter builds its own extended view of the request and does not write it to disk.

Extra guards on top of the original ones:

- contexts-6 Go must bind diagnostic and contexts-5 identity/completion hashes in its exact predecessors. The unchanged Go consumer verifies both full closures before idle admission. ROOT review corrected an initial unbound completion lookup; only this new phase changes the original predecessor selector. Only one block runs at a time, and nothing starts a successor automatically.
- imitation Go must list contexts-5 in its original-prefix predecessors. The corpus can use the closed prefix through contexts-5, or through contexts-6 if that block was declared and closed. The corpus rules stay unchanged: eight families, both seats, both original folds and all 181 identities in training, with no borrowing.
- Every pre/post check pins the gap adapter, gap request, effect adapter, effect request, original operator/request, entry `180c…682f` and policy `648d…5266`. The adapter rejects `AEGIS_QUALIFIED_ROOT` and symlink ancestors.

## Request schema

The request must have exactly these keys. Unknown keys, booleans and non-integer numbers fail.

```json
{
  "formatVersion": 1,
  "effectOperator": {"path": "/home/vinicius/aegis-bot-lab/transfers/material-teacher-effect-learning.py", "sha256": "5b97a1b64bc8ff34c4da5e80e552a1d6b22349f9a7e626004eb28d6b8106a861"},
  "effectRequest": {"path": "/home/vinicius/aegis-bot-lab/transfers/material-teacher-effect-request.json", "sha256": "a862ee2a90d302bb9febd973192e0182f253c7a4489e2f2395840aab17336945"},
  "oldPhases": {"diagnostic": {"identitySha256": "…", "completionSha256": "…"}, "…": "all six prior phases"},
  "gap": [{"seed": 6003520, "games": 880}, {"seed": 6004400, "games": 880}]
}
```

`gap` holds the first block alone or both blocks, in this order. Phase bindings come from the phase name and are not part of the request: `/home/vinicius/aegis-bot-lab/transfers/material-teacher-gap-learning-<phase>-identity.json` and `-go.json`. ROOT's wrapper must write identity files at those paths. Go files keep the original exact keys, with `operatorSha256` set to the gap adapter and `requestSha256` set to the gap request. The CLI is the original `main`: `inspect|coverage|run|closed|tensor-worker --request --request-sha256 --operator-sha256 [--phase --identity-sha256 --resource-go]`. Physical and delivery lanes can use the same public API as before: `context`, `closed_phase`, `scope`, `natural`, `phase_path` and `data_outputs`.

## Bounded validation

`python3.12 -B tools/bot-training/operators/test_material_teacher_gap_learning.py` runs 20 synthetic stdlib tests. The tests cover:

- prior-owner routing for all six closures, and fail-closed handling when a prior closure changes
- only-declared command deltas, fresh bindings, and block and fold periods
- refusal to launch prior or undeclared phases before any side effect
- the original closed-whole guard
- exact Go keys, owner and booleans
- the ROOT-bound contexts-5 identity/completion needed before contexts-6, rejection of changed bindings before idle admission, and the gap prefix needed for imitation
- original corpus strictness
- hostile request shapes, duplicate keys and NaN, and symlinks
- module or request changes before and after Go
- rejection of the runtime override
- the operator identity passed to the tensor child
- the public API
- that the executed source is the hashed buffer

The fixtures are local temporary files. They are not actual runtime, model or game evidence.

## Remaining for ROOT

ROOT must review the source, then seal the exact gap request, adapter pin and wrapper, and a separate Go for each phase. Before each launch, ROOT must observe actual idle state, source, runtime, checkpoints and the live whole wrapper. ROOT also runs the fresh-seed scanner, the real CPU-only collector and a full closure before the next phase. Goal acceptance still needs real imitation and PPO learning, all44 strict gains, physical and material mechanisms in both seats, all26 rooms and an untouched final 6210000..6213871 blind evaluation.
