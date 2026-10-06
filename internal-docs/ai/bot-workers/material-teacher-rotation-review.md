# Material teacher rotation adapter: source review

**Verdict: no material defect in the final source `7e263a56…`.** The rotation adapter adds only `contexts-7` (seed 6005280, 3960 games). It hands all eight prior closures to their pinned owner, the gap adapter. The new phases run the original consumer code unchanged.

This was a read-only source review. I made no remote reads or mutations and ran no jobs or models. I did not edit the target worktree, ROOT, or any sibling.

## Reviewed bytes

| File | SHA-256 | Status |
| --- | --- | --- |
| `tools/bot-training/operators/material-teacher-rotation-learning.py` | `7e263a56170aa5f3c06c86cdfc287fb1421cee4b6a58485decc230fca19b7840` | Final. Committed as `363b495cf` in `bot-effect-digixros-teacher-fix`. First reviewed as `88745e00…`; the change to `7e263a56…` only rewraps lines. |
| `tools/bot-training/operators/test_material_teacher_rotation_learning.py` | `ba626a1b396575c53a7199a892b4190f7843d6cc0092cf179b53bff2e7ff7e7e` | Final. Same commit, 16 tests |
| Pinned gap adapter (`material-teacher-gap-learning.py`) | `1c8bfb93…def70` | Matches the operator pin |
| Gap request (`material-teacher-gap-request.json`) | `3073eac6…b9b6` | Matches the operator pin |
| Effect adapter / original operator | `5b97a1b6…a861` / `c460c665…4613` | Unchanged |
| Expert entry / policy | `180cfa31…682f` / `648d8a26…5266` | Unchanged |
| Pending rotation request | `57b65faf…5f35d60` | Shape matches `envelope()` |
| Pending rotation wrapper | `681d959c120ea9e2539556a2d4887439ff2fc4f7d6afe816d0ddbcd6562e74b5` | Binds operator `7e263a56…`. Differs from the gap wrapper `e8033bf1…` only in phases, operator SHA, file names and identity prefix. `bash -n` passes. |

ROOT confirmed `7e263a56…` and `ba626a1b…` as final. I rehashed both from commit `363b495cf` and they match.

## Seams checked

| Seam | How the source enforces it | Result |
| --- | --- | --- |
| Prior owner | `gap_module()` hashes the gap file, then compiles and runs that same buffer. It asserts the gap phases, blocks and expert pins. | Pass |
| Eight prior closures | `envelope()` requires exactly `diagnostic`, `contexts`, `contexts-1..6`. `closed_phase()` sends each one to the gap adapter's `closed_phase` with the gap context. It checks the identity before the call and the completion after it. | Pass |
| Pins equal the gap request | `context()` compares the six inherited pins with the gap envelope. It then closes `contexts-5` and `contexts-6` against the new pins. | Pass |
| New block only | `ROTATION_BLOCK` must match exactly, with `int` types. The block is appended as `contexts-7`, and the name check rejects any other position. The original `blocks()` checks the 440 period, overlap and the reserved final seeds. | Pass |
| Commands | The argv is copied from `contexts-6`, which keeps the same `--worker` entry. Only `--seed`, `--games` and `--output` change, and each must appear once. Imitation, PPO and comparison argv are copied unchanged. | Pass |
| New bindings | Identity and go paths use the `material-teacher-rotation-learning-<phase>` prefix. The original `lane()` checks them. | Pass |
| `contexts-7` predecessors | The override requires exactly `{"diagnostic", "contexts-6"}`. The original `go` then closes both through `closed_phase`, so no manual read is involved. | Pass |
| Imitation prefix | The original `predecessors()` requires a closed prefix. The `go` wrapper requires `contexts-7` in it, so `contexts-1..7` must all be present. | Pass |
| Corpus before model | The original `run()` and `tensor_worker()` call `corpus()` before importing torch. `corpus()` requires all eight families on both seats and both folds, plus all 181 training cards. 3960 is a multiple of 440, so folds keep `index % 5`. | Pass |
| Unknown phase / launch of a prior phase | `whole`, `go` and `closed_phase` reject phases outside the rotation set before any side effect. The wrapper `case` allows only `contexts-7`, `imitation`, `ppo` and `comparison`. | Pass |
| Self-hash and tensor child | `inputs()` pins this file, the request, the gap and effect files and requests, and the expert inputs. It runs before and after `closed_phase` and `go`. `tensor_command` uses this file's `__file__`, so the child runs the rotation operator. | Pass |
| Symlinks / fresh paths | `sealed_source` rejects symlinked ancestors. The original `lane`, `execute`, `run` and `corpus` reject existing outputs. | Pass |

## Block size

The diagnosis in `material-teacher-validation-schedule.md` recommended 3872 games (88 × 44). The original `blocks()` rejects that number because 3872 is not a multiple of 440. 3960 (9 × 440) is the smallest valid block that still reaches all 44 opponent offsets. The seed interval is 6005280–6009239, not 6009151 as the diagnosis states. ROOT's scanner reported zero overlap for 6005280/3960.

## Non-blocking notes

1. **Runtime preconditions.** The new imitation phase reuses the original paths `imitation-custody` and `corpus` under the same future run. If either exists on the lab from an earlier gap attempt, the run fails closed at "Preserve prior phase" or "Preserve prior corpus". ROOT should confirm they are absent before launch.
2. **Cost.** Each `go` and the end-of-run `context()` replay the original closure checks, including a raw `collection()` over every consumed block. This is the original design, but imitation now rereads about 9676 teacher games several times.
3. **Tests are synthetic.** The rotation and gap suites (36 tests) pass on the final bytes, but they use mocks. They are not actual acceptance.
4. **Path check.** ROOT reports a read-only check found `contexts-7`, `imitation-custody`, `corpus` and the PPO paths absent. ROOT rechecks before Go.
