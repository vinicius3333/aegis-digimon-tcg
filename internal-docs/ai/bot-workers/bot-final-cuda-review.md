# Independent V50 CUDA parity source review

Date: 2026-10-05. Dispatch: `ctx_464e24c97a41`; task: `task_9c1bf1d8674f`.
Reviewer worktree: `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/bot-final-runtime`, branch `bot-final-runtime`.

**Verdict: ready for the coordinator's conditional execution workflow, within source/mock review scope.** Three important findings were reported immediately, fixed by the coordinator, and independently verified against the stable final source. No unresolved critical, important, or minor findings remain. This review does not certify an actual closed V50 runtime, checkpoint migration, CUDA parity, game result, strength, room custody, or promotion.

## Exact reviewed bytes

| Input | SHA256 |
| --- | --- |
| Final `/tmp/aegis-v50-cuda-choice-parity.py` | `746283bd0b38ef52b09ad7b0017f7b5b14370dacee59af2df49c42aa6dfeb2f9` |
| Initial draft, before findings | `c82d4109b1cfb7c24233bd9879c18facc99838d182e65bece43458c245daa82b` |
| `/tmp/aegis-v50-cuda-choice-parity-request.unbound.json` | `51ea5e51c962ef11b62aec8b5303ee309ddc8784853e959ed4fb28f8d61c04f9` |
| Sealed `aegis-v50-integrated-runtime-qualification.py` | `4cfb5f462169eac06c01d70a51ae48f38987f0641006d3af23bd24c90db5c27c` |

The qualification source was read at `/Users/viniciusluiz/aegis-bot-chronomon/tools/bot-training/operators/`; it targets source commit `7d34b4c1267e0bc266736e61b43cb28debf598ee`. Its public `closed(identity_sha)` invokes the full preserved predecessor proof, checks the whole process exit and immutable launch identity, recomputes qualification/report/completion outputs, and imports no Torch. Its public idle gate reuses the supported predecessor helper. The parity script calls closure once before Torch and uses direct byte guards afterward.

## Findings and verified corrections

1. **Important, corrected — incomplete tensor preservation proof.** The initial final-state loop omitted removed keys and used numerical `torch.equal`, which accepts a change from positive zero to negative zero. Synthetic reproductions still emitted `weightsAndCheckpointUnchanged=true`. The final `tensor_state()` compares the complete key inventory, dtype, shape, stride, device, layout, raw-byte length and SHA256. Regressions reject removed state, signed-zero byte changes and dtype changes.
2. **Important, corrected — cached module execution.** Matching `__file__` paths allowed cached `features`, `model`, `bridge`, `inference` and `train` objects to execute without fresh snapshot imports. The final script rejects all five cached modules before admission and again before Torch, then checks all five imported module paths before checkpoint loading. A synthetic cached-module reproduction now rejects before qualification or model imports.
3. **Important, corrected — runtime receipt lost its closure binding.** Comparing the final runtime map with a fresh unpinned receipt allowed runtime and receipt changes together. The final script checks original closure pins for completion, report, runtime and Python maps before admission, binds metadata to the pinned report, captures the original runtime map, and rechecks those receipts and that captured map after queries. It also rechecks all four checkpoint files at the end. The simultaneous runtime/receipt mutation regression now rejects.

The script requires explicit resource go, exact operator/request/qualification pins, an exclusive output directory, actual Python 3.12.14 at the desktop venv path, no optimization or preloaded Torch, full closed qualification and idle admission. Torch must be 2.7.1+cu128 with one available 4070 GPU. Each loaded checkpoint must match its actual byte SHA and qualified metadata. Every window is passed to unchanged greedy `train.infer`, `train.greedy_action` and `CheckpointScorer.choose`; their choices must match exactly. All four policy roles are mandatory. Report flags explicitly keep games and learning updates at zero and strength/physical/room/final-blind acceptance false.

## Verification and evidence

Local Python: `/opt/homebrew/bin/python3.12`, version 3.12.12. Desktop 3.12.14 is represented only by an explicitly synthetic admission fixture; no actual Torch, checkpoint model, GPU or remote job was imported or launched.

- **13 independent stdlib tests passed**, including nine hostile request variants, missing resource go, preloaded Torch, optimized execution, wrong operator/request pins, duplicate/nonfinite JSON, a synthetic four-policy nominal pipeline, 17 hostile pipeline variants, and the focused preservation/import regressions above. Command: `/opt/homebrew/bin/python3.12 artifacts/bot-training/bot-final-cuda-review/review_guards.py artifacts/bot-training/bot-final-cuda-review/parity.revision1.py`.
- **9 existing qualification guard tests passed**, selected individually from `aegis-v50-qualification-guards.py` with `PYTHONDONTWRITEBYTECODE=1`: synthetic valid closure, metadata/source/runtime/checkpoint mutations, forged phase success, whole-completion mutations, full predecessor invocation, public idle delegation, pre-predecessor admission, optimization/preloaded Torch, and exact whole exit/identity. These synthetic closures and phase logs are not actual runtime proof.
- Both reviewed operators parse with Python AST. Real historical input hashes and extracted original windows verified without model imports: 56 V35 rows containing 28 ordered query/response pairs, plus five exact V23 seat-0 selectors, yield **33 windows: 28 seat-1 and five seat-0**. Candidate counts span 1–12 and 44. In-memory comparison confirms that only teacher annotations are omitted; observations, learner seats and action lists are unchanged.

Ignored evidence lives under `artifacts/bot-training/bot-final-cuda-review/`: `review_guards.py`, `review_guards.initial.py`, `parity.initial.py`, `parity.revision1.py`, `initial-guards.log`, `final-guards.log`, `qualification-guards.log`, `historical-inputs.json` and `request.unbound.json`. The initial synthetic reproductions intentionally demonstrated erroneous acceptance; the final regressions require rejection. No synthetic pass is actual CUDA proof.

The four real historical file hashes matched the supplied pins: V35 `f4f3a13f7efcd80935955d5bc7ed714fa1e1991cf7cb6f63e1da85c4ddefc0c5`; V23 episode 3 `996f33d1b6d5032d8ed761d18edba76eb236c0f9060572077ad07ec4ae9cc8cd` index 68; episode 4 `f6b9b5baddbca689e0965a20ce24089f4e01a856566d2d814a5ce4ce0dc96999` index 52; episode 5 `f1e2915741998936d5273a12d8e176562c699534a1d87beeab93deb33f5d1ea8` indices 16, 17 and 29. This is historical input-byte evidence, not autonomous latest-engine gameplay or full mechanism acceptance.

## Remaining coordinator work

The request still deliberately contains null identity/completion fields and is rejected before Torch. The coordinator must obtain actual V50 whole exit zero and full closure for identity `8ca2810d78c165e421b0c40f41afe503d07c4951f2191dd0840b59a7cb614592`, preserve all actual four checkpoint bindings, create a separate fully bound request, grant resource agreement, and run actual supported desktop CUDA parity. No upload or queue was performed by this reviewer. Existing jobs, sealed sources, checkpoints, root/sibling trees and reserved final seeds were untouched.

The acceptance scope remains all 104 BT26 and 77 EX13 identities, 479 vocabulary cards, 26 catalog plus 18 support recipes, both learner seats and one shared policy. This bounded historical parity operator does not reduce that acceptance scope or establish held-out strength.
