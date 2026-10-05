# Independent learning and delivery review

**Assessment: ready to merge the bounded implementation; no critical, important or minor findings.** This review certifies source/tool behavior, not a qualified runtime, improved model, production admission or full BT26/EX13 acceptance.

Reviewed against base `7c8d7c7e0a38226bdd8d607e1531bb937db4d199`:

| Lane | Exact reviewed head |
| --- | --- |
| Learning | `8ceede610d050342d488c35ed18b017c6632e6f4` (implementation `8d5f8cd8b09e2b8bb06fcf188fb472b8a676fb5a`) |
| Delivery | `2263adb3bebeda5bcf0d5d6baf754d8a31b0ea08` |

Both sibling worktrees were clean, and all changed files matched their committed bytes after checks. The reviewer changed neither sibling, coordinator worktree, sealed operator/runtime nor the actual V49 queue/foreground session `32034`.

## Learning

The full diff preserves feature/model definitions and existing defaults. Opt-in mechanism sampling retains every original training sample and the original index-modulo-five validation split; only training indices are resampled. All eight declaration/material families in both seats and both folds must have nontrivial learner labels before loading the model. Classification follows actual bridge intent/request markers, includes nonempty selection completion and excludes empty material declines. Mechanism targets are free of the source KL anchor while other choices retain it. Label coverage expressly does not certify physical execution.

Opt-in streaming evaluation retains greedy choices, terminal reward/coverage, frozen weights, worker rejection handling and raw bridge output, while omitting unused trajectories/advantages. Training cannot select streaming mode. The root-reported NaN/Inf regression is fixed: nonfinite logits fail, and adversarial NaN/+Inf/-Inf tests verify unusable failure records with no choice sent. Existing opponent sampling and worker/failure budgets remain unchanged.

The conditional planner (`prepare-next-pass.py`, SHA `d9ed24bc86d198b7ad3d8d61769de5c6bd90b71c913230a7e951378c26f84ccc`) generates commands only. A byte-identical copy was reviewed and tested in reviewer-owned ignored artifacts. It requires pinned closed/exit-zero inputs and coordinator admission/resource flags, full scope and nonoverlapping fresh development inventories excluding reserved final seeds. Its admission flags supplement the coordinator's strict semantic consumers; mocked planner receipts are not runtime/model proof. Actual invoked trainers retain their source/metadata compatibility checks. Changed Python requires separate follow-on qualification; V48/V49 are immutable.

The worker's final historical CPU receipt covers **17,203 windows in 298 episodes**, both seats, with exact choices on closed V24 weights. Its final single-run scorer measurements are 14.270s versus 13.356s (6.4% less); the earlier 298-window microbenchmark is separate. I reviewed the parity script/report and their bounded claims; I did not rerun a trained-model job, certify CUDA/current-runtime parity or infer whole-game throughput.

## Delivery

The external envelope preserves API/shared/Python source and existing 26-catalog room routing. Scope checks require schema 4, 479 unique vocabulary identities, BT26-001–104, EX13-001–077, 26 catalog pins and their unchanged prefix in the 44-recipe schema-1 curriculum. Candidate packages pin checkpoint/provenance/scorer bytes, compiled runtime/Python source maps, interpreter identity and complete installed package versions; new directories and exclusive writes preserve earlier packages/sources.

The root-reported Torch suffix issue is fixed. `2.7.1+cu128` is accepted as the supported 2.7.1 local build; the complete reported version remains in the manifest and subsequent validation requires exact equality. Unsupported releases and malformed versions are tested. Guarded CPU scorer readiness checks actual checkpoint SHA, full metadata, protocol and feature V7 before forwarding choices. Synthetic fixtures exercise the real Node transport and reject loaded-hash mismatch. Explicit candidate opt-in, production refusal and pending-qualification labeling remain; the existing room policy deadline is unchanged at 1000 ms. The probe's 2000 ms query transport timeout is a separate query test and does not alter room policy deadlines.

The package is host-bound to its pinned checkout/venv/receipt paths. Provenance receipt hashes establish integrity; coordinator review establishes their meaning. Packaging/validation does not deserialize or qualify a trained model. The actual API still owns normal scorer fallback behavior, which cannot establish learned coverage.

## Independent checks and evidence

```sh
PYTHONDONTWRITEBYTECODE=1 \
PYTHONPATH=/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/bot-final-learning/tools/bot-training \
/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/bot-final-learning/artifacts/bot-training/final-learning/venv/bin/python \
  -m unittest discover -s /Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/bot-final-learning/tools/bot-training -v

/tmp/aegis-supported-node26/node-v26.10.0-darwin-arm64/bin/node \
  --test --test-concurrency=1 \
  /Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/bot-final-delivery/tools/bot-training/delivery.test.mjs
```

Results: **73 Python tests passed** on Python 3.12.12 using the existing isolated learning venv; **18 Node tests passed** on Node 26.10.0; copied planner fixtures passed one synthetic plan and twelve malformed-admission cases. No dependency installation, broad engine suite, trained-model job, GPU/game job, actual candidate probe/launch or final seed consumption occurred. The unchanged-room/transport focused suites and workspace checks from the delivery worker are supporting evidence, not independent managed-room acceptance. This review document's normal Node 26 pre-push workspace typecheck must pass before push.

Reviewer-owned logs, per-file source hashes and `review-report.json` live only under `artifacts/bot-training/bot-final-closeout-review/`. Principal source pins:

| Source | SHA-256 |
| --- | --- |
| Learning `train.py` | `40213cae178ee56b082e2b322cd4dea67a8296cee9463c000f5d896f125527a7` |
| Learning `imitate.py` | `8ccc98d14358f7d61ebc7e9ea9e1c7558d0943ce3bfb9c125dd770068e0b70d9` |
| Learning mechanisms | `ccb14e0fa6d0c4f60247a18bb762a802d071fc62e0096d1da2897807ffca2350` |
| Delivery tool | `3d5015508d4b295e24b674f558341dfd83c2b72f51e5346b455053ec593d1d64` |

The coordinator still owns actual supported runtime/migration closure, model/tensor/Adam qualification, current-policy mechanisms/material custody and rooms, all-44 per-list gains, and untouched final blind acceptance. Vocabulary presence, aggregates, synthetic transport and historical query parity cannot replace those gates.
