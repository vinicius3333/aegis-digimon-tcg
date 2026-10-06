# Rotation learning operator: contexts-7 handoff

`tools/bot-training/operators/material-teacher-rotation-learning.py` adds one collection block, contexts-7, after the eight closed phases. It is source only: no job, remote read, model or actual proof was run. ROOT owns review, transfer, request sealing, Go approvals, launch and acceptance.

## Pins

| File | SHA256 |
| --- | --- |
| `material-teacher-rotation-learning.py` | see commit; review copy `7e263a56170aa5f3c06c86cdfc287fb1421cee4b6a58485decc230fca19b7840` |
| `test_material_teacher_rotation_learning.py` | review copy `ba626a1b396575c53a7199a892b4190f7843d6cc0092cf179b53bff2e7ff7e7e` |
| Prior gap owner (pinned, unchanged) | `1c8bfb932d3c3feb6092947ba4267e7a0d289219e9ed032c1db444d3904def70` |
| Prior gap request (pinned) | `3073eac66ddfd1d8ef90ee0e9a2a1f7d77c68827db83d2a683143fd15f15b9b6` |
| Expert entry / policy (checked through the gap seam) | `180cfa31…f682f` / `648d8a26…85266` |

The qualified source `1cec011c0`, fingerprint `9a8d2d5f…`, the four checkpoints and every existing operator are unchanged.

## How it reuses the prior owners

- **Gap owner.** It runs the exact gap-owner bytes, hashed and compiled from one buffer. At load it checks that the gap owner still declares `contexts-5`/`contexts-6` at (6003520, 880) and (6004400, 880), the six prior phases, the three learning phases and the entry/policy pins.
- **Original definitions.** It re-executes the original operator's function definitions (c460) from the effect adapter's sealed buffer, so `blocks`, `run`, `go`, `whole`, `corpus`, `collection` and `tensor_worker` are the original guards. It overrides only `context`, `closed_phase`, `whole`, `go` and `predecessors`.
- **Prior closures.** All eight closures, diagnostic through contexts-6, delegate to the gap owner's `closed_phase` with the gap owner's own context. That in turn delegates to the effect adapter and the original operator. `context()` consumes contexts-5 and contexts-6 this way; contexts-3/4 and the four original phases are consumed by the prior owners' own contexts.
- **contexts-7 command.** It is the contexts-6 argv (original `collect.py`, expert entry `--worker`) with only `--seed 6005280`, `--games 3960` and `--output <run>/contexts-7` changed. The original `blocks()` enforces the 440-game period, no overlap, and the reserved final seed.
- **Learning commands.** Imitation, PPO and comparison commands are unchanged. Their identity and resource-Go bindings are new: `LAB/transfers/material-teacher-rotation-learning-<phase>-{identity,go}.json`.
- **Public API.** `context`, `closed_phase`, `scope`, `natural`, `phase_path`, `data_outputs` and `main`. The original CLI modes `inspect | coverage | run | closed | tensor-worker` are reached through `main`.

## Request (exact shape, no extra keys)

```json
{
  "formatVersion": 1,
  "priorOwner": {"path": "/home/vinicius/aegis-bot-lab/transfers/material-teacher-gap-learning.py", "sha256": "1c8bfb93…def70"},
  "priorRequest": {"path": "/home/vinicius/aegis-bot-lab/transfers/material-teacher-gap-request.json", "sha256": "3073eac6…9b6"},
  "oldPhases": {
    "diagnostic": {"identitySha256": "…", "completionSha256": "…"},
    "contexts": {…}, "contexts-1": {…}, "contexts-2": {…}, "contexts-3": {…}, "contexts-4": {…},
    "contexts-5": {"identitySha256": "b0d50a38…d8d", "completionSha256": "be9d4915…285"},
    "contexts-6": {"identitySha256": "5fa116ca…994", "completionSha256": "36daa7f1…fb"}
  },
  "rotation": {"seed": 6005280, "games": 3960}
}
```

The six earlier pins must equal the gap request's `oldPhases`; contexts-5 and contexts-6 must match their actual closures through the gap owner. The request carries no future/actual booleans.

## Go rules

- **contexts-7:** `predecessors` must be exactly `{diagnostic, contexts-6}`, each with its actual identity and completion. Each is consumed through the prior owner before the host idle check.
- **imitation:** the original prefix rule (diagnostic, contexts, and a closed prefix of contexts-1…) plus `contexts-7` required, so it consumes all closed data through contexts-7. The original corpus validation (eight families, both seats, both original folds, all 181 training cards, `index % 5` preserved) runs before any primary-model import.
- **ppo / comparison:** the original predecessors (`imitation`, then `ppo`).
- **Other phases:** prior and unknown phases cannot be launched, owned or approved.

## Synthetic verification

`python3 -B -m unittest test_material_teacher_rotation_learning` from `tools/bot-training/operators` runs 16 tests. Together with ROOT's gap and effect suites, 50 tests pass, and ruff is clean. Six deliberate guard mutations were each caught: Go predecessor set, imitation contexts-7 requirement, block size, context consumption of contexts-5/6, prior-owner delegation, and expert input pins.

The tests cover:

- consumption by the prior owners, and the only-new-command check;
- the 440-period guard rejecting 3872;
- new bindings;
- prior closures routed to their owners and failing closed;
- no launch for prior or unknown phases;
- the closed whole guard;
- contexts-7 Go predecessor identity and completion;
- wrong Go owner, boolean and phase;
- imitation through contexts-7;
- hostile request shapes;
- prior pins against the gap request;
- duplicate keys, NaN and symlinks;
- inputs mutated before and after Go;
- the local runtime override;
- the tensor command;
- the public API with gap-source mutation;
- executing only the hashed bytes.

These are synthetic stand-ins. They are not proof of any actual collection, corpus, learning or strength.

## Pending for ROOT

- Independent review.
- Transfer of the operator and its request to `LAB/transfers`.
- The fresh seed scan of 6005280–6009239.
- Wrapper identity and Go for contexts-7, the launch and the full consumer, then imitation, PPO and comparison.
