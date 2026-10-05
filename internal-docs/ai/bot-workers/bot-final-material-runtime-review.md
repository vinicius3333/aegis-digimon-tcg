# Final material-teacher runtime review

2026-10-05; independent bounded source and launch-contract review in `bot-final-qualification`. **GREEN after one concrete finding was corrected.** This review authorizes no execution and establishes no actual runtime, checkpoint, strength, or bot acceptance result.

## Finding and correction

The original operator (`36a04ec527a08b2fcec6b53b5712783b1c409c2fb350c17e7890cc3a0c8742c8`) rejected any occurrence of `failed` or `skipped` in successful engine/teacher logs. An actual successful historical V34 engine log contains the expected negative-fixture diagnostic `[engine] combat resolve failed`, and the frozen attack integration test still exercises that path. This would reject a successful fresh qualification build after its expensive engine suite.

Root corrected this in commit `39ff631a9`. The revised parser requires exactly one anchored Test Files summary and one Tests summary, with all positive totals passed; it rejects missing/duplicate summaries, failed/skipped totals and partial passes. Actual phase exit zero remains mandatory, teacher files must equal two, and engine counts must meet 819 files / 13,783 tests. Expected diagnostic prose is allowed. The independent regression reproduces the actual historical diagnostic; synthetic threshold counts test admission only and are not future build evidence. No remaining findings within the requested bounded review.

## Final executable pins

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/material-teacher-runtime-reviewed.py` | `f14ced506df5352fde9061835c8af6fb5dea820bbaaf303128c5883811e217c5` |
| `/tmp/material-teacher-prepare-reviewed-launch.sh` | `33375451eec7dd5d272f784f276fea26013ddb0d0c9d0338bd45a1e8fa829cd8` |
| `/tmp/material-teacher-migrate-reviewed-launch.sh` | `9ba59653e81c6267845a5435b3ccc9bb9105da4a41629417fd3d54ef5c6e549e` |
| Revised operator guards | `3da716157fafac25ec090c1e3f688743d18a363ec1a3800b1b285e1dd5ac863b` |

The external operator matches the corrected committed root bytes. Both final wrappers pass `bash -n`; exact comparison with their initial versions finds only the revised operator hash/path and copied wrapper basename changes. Their public arguments, run/request/identity paths, CPU environment and phase gates are preserved. The initial operator and wrappers are superseded, immutable and unexecuted; the final filenames above are the reviewed launch contract.

## Frozen source and admission

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/material-teacher-1cec011c0.tar.gz` (43,769,742 bytes) | `7eb27ab7c35d749c6ed6447a7db40522352df2e97ee2ae79ad765f76b6bec080` |
| `/tmp/material-teacher-source-manifest.json` | `0c1b5546ca96ef9e225f07fe68c8beb3293c1d5b0292849e611bf882630afe68` |
| `/tmp/material-teacher-reviewed-delta.json` | `d9e632ff35d50f73a555d9789a93d2f6a164f8743d90e8c779be897d65792361` |

The independent fixture reads the actual archive using unchanged V50 archive verification, checks all 12,348 regular members / one symlink and the actual reviewed source delta against commit `1cec011c0fd0c6481e7297506ed4c825a4dfcdc7`, without extraction. Only the three declared teacher modules and two tests change API source versus the integrated baseline. The pending request with null custody completion/report is rejected before helper loading or extraction.

Admission binds the final operator and sealed request to original V44 actual whole-process exit zero and its original V45 full custody consumer. Static V50 helpers are reused; obsolete V50 successful closure is not required. Root reports five obsolete waiting V46–V50 jobs retired with receipt `4dc444ce821374751c8a3f1f62e994254a3779899dd120f20de628b6d354aa87`; this bounded review does not duplicate that retirement audit.

## Runtime and migration contract

Fresh preparation requires one actual supported build: offline frozen install with ignored scripts, shared/API builds, API/web type checks, image/mirror fixtures, explicit 73 baseline Python tests, explicit 18 delivery tests with TAP reporting, metadata/curriculum describes, the full engine/audit suite and both teacher tests. Commands preserve supported helper inventory and single-worker Vitest limits. Node 26.10.0 and Python 3.12.14 are actual-host gates; source/runtime hashes, feature V7, 479 card identities, all 181 mechanisms and 26+18 recipes remain checked. Changed teacher metadata/curriculum must yield the actual new fingerprint.

Preparation and migration have separate root resource approvals bound to exact request/operator bytes. Migration additionally binds actual preparation identity and completion, verifies whole-process exit zero and idle conditions, then imports the primary Torch runtime. It preserves the original V35 four-checkpoint loop and V25 comparison over the original 28 windows, with unchanged original checkpoint bytes, model/optimizer state and module paths; only declared metadata/provenance may change. No actual weight or optimizer updates are authorized. Source, custody and closure guards are repeated before completion.

The independent migration fixture executes the unchanged preservation loop with four locally constructed fake checkpoints, fake Torch/tensor classes and original pinned query windows. It accepts preserved opaque tensor/Adam/step state and rejects changed optimizer steps, tensor bytes, action choices and module paths. These checks exercise consumer behavior; they neither load real models nor establish actual query parity.

## Validation and limits

Four independent unittest methods and all 13 revised operator guards pass on local Python 3.12.12; Ruff format/check passes for the independent fixture. The local version is review tooling, not the required remote Python 3.12.14 qualification. No broad build was repeated and no source archive, sealed operator, root/sibling tree, remote job, actual checkpoint or production resource was modified by this lane.

Ignored evidence under `artifacts/bot-training/material-runtime-review/`:

| File | SHA-256 |
| --- | --- |
| `review_fixtures.py` | `46f2f2a69676f3b45b03e89a0882e98a74b0c3ded1ad1d6a724334db31caa20c` |
| `independent-fixtures.log` | `3a913106471ebac7309530db5aaadbb6d7178c461d3200ec6f97928f1a1c663f` |
| `operator-guards.log` | `f2c331ce6aa98688a6256cf9e0f0dda42d5443b96a051179aa30b5c50e1c8f56` |

Reproduce locally with `PYTHONDONTWRITEBYTECODE=1 /opt/homebrew/bin/python3.12 artifacts/bot-training/material-runtime-review/review_fixtures.py` and the root `tools/bot-training/operators/test_material_teacher_runtime.py` under the same interpreter. The fixtures use the pinned read-only helper files available in this workspace environment.

Actual V44 closure, final sealed request, root phase approvals, preparation/migration identities and closures, new fingerprint and migrated checkpoint hashes remain pending. No actual preparation job had started at the final wrapper review. Final reserved seeds 6210000–6213871, Oracle and production remain untouched. Current-primary strength, both-seat mechanism execution, physical/room evidence and blind acceptance remain coordinator-owned requirements; this source review does not substitute for them.
