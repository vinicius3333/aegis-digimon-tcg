# Material teacher runtime preparation

Prepared `tools/bot-training/operators/material-teacher-runtime.py` and hostile
stdlib guards in this child worktree. ROOT owns source freezing, staging, resource
approval, wrappers, actual execution and integration. No remote job, extraction,
real checkpoint copy or model import was performed. The teacher repair qualifies
future demonstrations; metadata-only migration does not teach the current model.

## Single direct route

ROOT refined the task to admit directly from **actual closed V44 custody**, perform
**one full fresh supported engine/audit run**, then preserve the four original
policies. V46–V50 completion is not a dependency or evidence. The unchanged V45
`completed_custody(custody_module())` consumer is imported without executing its
blind main. Its SHA is
`37241657f59a5425e3311c375db41ac75a3416b77aca8d721791e2249552f744`; custody
identity SHA is `40f8a758b896a515106a4f4f882a53e52b69bcecbf8b20ad691f3fbef81610df`.
The original whole guard rejects a live/failed wrapper before custody admission.
The four bindings must exactly equal the frozen original source paths and hashes
declared by the sealed V49 source helper: V17 `045b…`, source `3c694…`, fitted
`a66ec…`, current V40 `e55bcc…`. No migration output hash is guessed.

V50 source SHA `4cfb5f462169eac06c01d70a51ae48f38987f0641006d3af23bd24c90db5c27c`
provides unchanged archive/source/phase/whole helper functions only. The pinned
static 7d manifest SHA is
`ba054c00047d7e2af6f55ccb09f0a32f4b8eed49eaf1c0204cc456451d538462`.
Neither is a claim that V50 qualified or that its fingerprint applies here.
Original V34 source/idle AST, V48 full engine/audit command, V49 migration loader,
V35 preservation loop and V25 tensor `same` remain byte-pinned and unchanged.

## ROOT request

The ignored `artifacts/bot-training/material-teacher-runtime/root-request.pending.json`
contains the exact interface with deliberately null future pins. The executable
rejects it before sealed imports/extraction/model loading. ROOT must fill:

- `source.commit`, `source.archive.{path,sha256,bytes}` and
  `source.manifest.{path,sha256}` from one actual frozen source/archive. The source
  manifest includes `sourceCommit`, `archiveSha256`, `archiveBytes`, every member
  SHA under `files`, and exact `symlinks`.
- `custody.completionSha256` and `custody.reportSha256` from successful actual V44
  closure and `material-custody-report.json`; consumer/identity pins above remain
  fixed.
- `review.changed` and `review.added`: exact path→SHA maps for every actual delta
  against the pinned static 7d manifest; `review.teacherPins`: exactly three
  production teacher modules plus the two named tests.
- `paths.checkout`, `paths.prepare`, `paths.migrate`, `paths.prepareIdentity` and
  `paths.migrationIdentity`: distinct absolute fresh `material-teacher-*` names
  directly under the lab's checkouts/runs/transfers directories, respectively.
- `resourceGo.prepare` and `resourceGo.migrate`: ROOT-reviewed approval file paths
  directly under lab transfers. Final request bytes are externally SHA-pinned.

Only `referencePolicy.ts`, `teacher.ts`, `policy.ts`, `materialTeacher.test.ts`
and `effectMaterialTeacher.test.ts` may change API source. Every engine/card/shared/
lock/other bot source and existing model/features/inference/train/imitate/collector/
bridge Python member stays exact. Every non-runtime change/addition needs explicit
ROOT delta pins: docs/internal docs/operators, the integrated candidate adapter
files and the exact three **added-only** follow-through tools `development_summary.py`,
`prepare_learning.py`, `test_learning_followthrough.py`. Source deletion, undeclared
delta, unsafe archive members, changed symlinks or future/null pins fail closed.

## Execution and public readers

The staged operator is external to the sealed checkout, for example
`/home/vinicius/aegis-bot-lab/transfers/material-teacher-runtime.py`. ROOT stages it
with the non-overwriting transport, reviews its actual SHA, and prepares actual
retained wrappers. Each wrapper writes the standard launch identity at its
request-pinned path: `{wholeWrapperPid,startTicks,run,operatorSha256,wrapperSha256}`.
Its actual `launch.sh` and `exit-code.txt` live in `<run>-launch`. A running operator
requires that exact wrapper to be live; a public closure requires it dead with
whole exit zero and unchanged wrapper bytes. No waiting queue or auto-launch exists.

All actual commands use the preserved lab Python entry (3.12.14), Node 26.10.0,
Torch 2.7.1+cu128, NumPy 2.2.6 and Click 8.1.8. Admission checks package metadata
without importing Torch. Bytecode is suppressed before imports and in all children.
The model child uses CPU explicitly, only after actual prepare closure, idle gates
and a separate ROOT resource approval. ROOT must provide a resource window even
for CPU preparation; this worker provides no launch authorization.

ROOT approval JSON contains exactly `approved: true`, `phase`,
`operatorSha256`, `requestSha256`. Migration additionally binds the actual
`prepareIdentitySha256` and `prepareCompletionSha256`. Each approval's reviewed
SHA is passed as `--resource-go`; boolean-as-number approval is rejected.

Remote command template, for ROOT's later use through the existing local WSL
transport after filling actual shell variables:

```bash
set -euo pipefail
: "${ROOT_REQUEST:?actual finalized request path}"
: "${ROOT_REQUEST_SHA:?actual finalized request SHA256}"
: "${ROOT_OPERATOR_SHA:?reviewed staged operator SHA256}"
python=/home/vinicius/aegis-bot-lab/venv/bin/python
operator=/home/vinicius/aegis-bot-lab/transfers/material-teacher-runtime.py
common=(--request "$ROOT_REQUEST" --request-sha256 "$ROOT_REQUEST_SHA"
        --operator-sha256 "$ROOT_OPERATOR_SHA")
PYTHONDONTWRITEBYTECODE=1 "$python" "$operator" inspect "${common[@]}"

# Run only in ROOT's actual retained prepare wrapper with explicit resource Go:
PYTHONDONTWRITEBYTECODE=1 "$python" "$operator" prepare "${common[@]}" \
  --identity-sha256 "$ROOT_PREPARE_ID_SHA" --resource-go "$ROOT_PREPARE_GO_SHA"

# Read only after that whole wrapper actually exits zero:
PYTHONDONTWRITEBYTECODE=1 "$python" "$operator" closed-prepare "${common[@]}" \
  --identity-sha256 "$ROOT_PREPARE_ID_SHA"

# Run in a separately ROOT-approved retained migration wrapper:
PYTHONDONTWRITEBYTECODE=1 "$python" "$operator" migrate "${common[@]}" \
  --identity-sha256 "$ROOT_MIGRATION_ID_SHA" \
  --prepare-identity-sha256 "$ROOT_PREPARE_ID_SHA" --resource-go "$ROOT_MIGRATE_GO_SHA"

# Read only after migration's actual whole exit zero:
PYTHONDONTWRITEBYTECODE=1 "$python" "$operator" closed-migration "${common[@]}" \
  --identity-sha256 "$ROOT_MIGRATION_ID_SHA" \
  --prepare-identity-sha256 "$ROOT_PREPARE_ID_SHA"
```

Python callers can import the external module without executing main, then use
`context(requestPath,requestSha,operatorSha)`, `closed_prepare(context,actualIdSha)`
and `closed_migration(context,actualMigrationIdSha,actualPrepareIdSha)`. Readers
rehash actual source/archive/member pins, source/runtime receipts, all phase logs,
original custody/model bindings and actual wrapper closure; they remain stdlib and
do not require idle to read an already closed result. They return actual engine/
checkpoint hashes and `acceptedStrengthOrMastery: false`, `noPromotionClaim: true`.

## Qualified scope and proof limits

Prepare installs fresh local dependencies offline/frozen/ignore-scripts; executes
original supported shared/API builds, API/web typechecks, image/mirror checks,
full original engine/audit command (at least 819 files/13783 tests), 18 delivery
tests and actual metadata/curriculum describe. The two teacher suites additionally
run verbose with one Vitest fork/no file parallelism, requiring actual success
records for both seats in each named file. The full compiled runtime inventory is
sealed; no whole-runtime mismatch waiver or old engine evidence reuse exists.

ROOT explicitly approved adapting Python discovery to the exact original static
V50 top-level test-module inventory. All those sources stay pinned unchanged;
actual execution must still report exactly 73 tests, zero skips, OK. Integrated
planner/adapter/new operator guards remain separate source/mock evidence. This
prevents extra source-only guards from silently changing the baseline count.
The delivery command explicitly selects `--test-reporter=tap`: supported Node
26.10.0 defaults to spec output even when redirected, while the unchanged strict
original phase verifier requires TAP counts. All 18 tests remain unchanged; real
local TAP output passed and the parser continues to reject missing/skipped tests.

Schema/curriculum must equal actual custody's originals except a newly computed
engine fingerprint: feature7, schema4, vocabulary479, BT26 identities104 + EX13
identities77, catalog26 + support18 recipes. Migration uses exact original
V35/V25 byte comparison to preserve every model/Adam key, dtype, shape and raw byte,
restoring metadata/receipt fields for whole saved-object comparison. It repeats
the same SHA-pinned 28 historical windows before/after each policy; optimizer
updates remain zero. The model child must close zero; its command/log receipt,
copied operator, report and all outputs are sealed by the actual parent closure.

No strength, all-card mastery, current learned material behavior, room acceptance,
promotion, production deployment or reserved blind seed consumption follows from
these results. Final source/archive/teacher pins, actual V44 closure, actual
preparation/migration wrappers, runtime fingerprint and migrated checkpoint hashes
are pending ROOT-owned gates.

## Local bounded checks

```bash
PYTHONDONTWRITEBYTECODE=1 /opt/homebrew/bin/python3.12 -m unittest discover \
  -s tools/bot-training/operators -p test_material_teacher_runtime.py
uvx --offline ruff check tools/bot-training/operators/material-teacher-runtime.py \
  tools/bot-training/operators/test_material_teacher_runtime.py
```

12 hostile stdlib guard tests passed with no skips, including original archive and
whole guards, direct custody stand-ins, exact original commands, future/mismatched
source/approval boundaries and deferred model execution. Fixtures are explicitly
synthetic and never load models. Preserved external-source fixtures explicitly skip
on hosts missing those read-only helper references. Local Python is 3.12.12 for
syntax/fixture checks; actual execution rejects it and requires 3.12.14. Ignored
logs and the pending request are under `artifacts/bot-training/material-teacher-runtime/`.


## Integrated review correction

ROOT replaces blanket engine/teacher log substring checks with complete anchored
Vitest all-passed summary counts. Actual successful negative engine fixtures print
`combat resolve failed`, so prose cannot classify a test failure. The phase must
still close zero; every test/file must appear in an all-passed total, teacher files
must equal two, and the full suite must contain at least 819 files/13783 tests.
The new regression rejects failed/skipped/mismatched/missing/duplicate summaries
and retains expected negative-fixture log text. ROOT reruns all 13 operator guard
methods successfully. This external operator correction leaves the frozen teacher
archive and production source unchanged; actual desktop qualification is pending.
