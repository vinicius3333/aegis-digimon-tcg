# Versioned candidate delivery

The existing API already uses `AEGIS_BOT_CHECKPOINT` and `AEGIS_BOT_PYTHON` to load one
shared CPU policy before admitting rooms. Both players' decks must match the 26
catalog recipes. The 18 support recipes remain learning/evaluation contexts, as in
the existing application. Human controls, bot seating and the normal **1000 ms**
policy deadline are unchanged.

`delivery.mjs` adds an external candidate package, validator, query probe and launcher.
It does not modify the fingerprinted API, engine, shared package or Python scorer.
It has no promotion or production deployment command. All packages remain
`candidate`; launching or probing requires `--allow-candidate`, and production
launches are refused. Final qualification/admission belongs to the coordinator.

## Assemble after model/runtime qualification

Use supported Node 26 and Python 3.12+ with the existing pinned Python dependencies.
Provide absolute paths in a JSON request:

```json
{
  "runtime": "/absolute/path/to/qualified-built-checkout",
  "checkpoint": "/absolute/path/to/qualified-migrated-checkpoint.pt",
  "checkpointSha256": "the-exact-64-character-checkpoint-digest",
  "provenance": "/absolute/path/to/coordinator-provenance.json",
  "output": "/absolute/path/to/a-new-package-directory",
  "version": "bt26-ex13-shared-candidate-1",
  "python": "/absolute/path/to/venv/bin/python"
}
```

The provenance JSON must have `sourceCommit` (40 hex characters),
`sourceArchiveSha256`, `originalCheckpointSha256`, and a nonempty `evidence` array.
Each evidence entry has `role`, an absolute `path`, and `sha256`. Use the original
checkpoint digest for ancestry and the separately verified migrated checkpoint
digest for `checkpointSha256`. Runtime binding can change serialized checkpoint
bytes while preserving every tensor. Archive/ancestry declarations and receipt
hashes are integrity pins; their semantic qualification must already have been
reviewed by the coordinator.

```sh
node tools/bot-training/delivery.mjs pack --request /absolute/path/to/request.json
```

The command hashes/copies the checkpoint without deserializing it. It interrogates
the built runtime's existing `cli.js --describe` and `--describe-curriculum`, requiring
schema 4, 479 unique vocabulary entries, every BT26-001–104 and EX13-001–077 identity,
26 catalog pins, and the unchanged prefix plus 18 support recipes. These are scope
checks, not learned mastery. It pins all compiled API/shared JS and JSON, Python
source files, the lockfile, Node executable/version and Python executable/version
and package versions. Venv executable symlinks retain their entry paths.

The fresh package contains `manifest.json`, `checkpoint.pt`, `provenance.json`, and
an executable, pinned `scorer.mjs` copy. The original files remain unchanged.
Checkpoint/provenance/manifest files are read-only, and existing package directories
are never reused. Store the returned `manifestSha256` separately as the trust pin.
Keep earlier packages, runtime checkouts, venvs and receipts to reproduce or select
an earlier version; there is no mutable `latest` pointer. The manifest intentionally
uses host-specific absolute paths: it is a delivery envelope around an existing
built checkout/venv, not a portable dependency installer.

## Validate, query and launch

```sh
node tools/bot-training/delivery.mjs validate \
  --package /absolute/path/to/package --manifest-sha256 THE_EXTERNAL_DIGEST

node tools/bot-training/delivery.mjs probe \
  --package /absolute/path/to/package --manifest-sha256 THE_EXTERNAL_DIGEST \
  --allow-candidate --queries /absolute/path/to/windows.json \
  --output /absolute/path/to/a-new-probe-directory

node tools/bot-training/delivery.mjs launch \
  --package /absolute/path/to/package --manifest-sha256 THE_EXTERNAL_DIGEST \
  --allow-candidate
```

Validation loads no model and fails closed if package, receipt, runtime, interpreter,
schema or recipe pins differ. The probe takes an explicit JSON array of existing
inference windows and uses the actual `InferenceClient`, writing `queries.json` with
model/version/runtime hashes and legal candidate indices. Run probes only after
qualification and resource agreement. It starts a CPU scorer, consumes no game seeds,
performs no learning, and proves only those submitted queries. A failed probe retains
its fresh output directory and reports an error; it cannot silently choose a heuristic.

The launcher preserves unrelated API environment settings, selects the package
checkpoint and guarded scorer through the existing two environment variables, and
starts the existing `apps/api/dist/index.js` with the API's normal working directory.
It inherits the application ports/database/control configuration; it does not create
rooms or deploy anything. Candidate identity is printed explicitly. The guard accepts
only the pinned CPU invocation and withholds the ready frame until the **actual loaded**
checkpoint SHA, complete metadata, protocol and feature version match. It then forwards
the existing JSONL stream; request IDs, queues, cancellation and legal-index checks
remain in `InferenceClient`. The API still owns one scorer and normal room policy
timeouts/fallbacks. Those fallbacks never establish learned coverage or strength.

## Verification

```sh
node --test tools/bot-training/delivery.test.mjs
```

Tests use explicitly synthetic checkpoint/scorer fixtures, exercise the actual Node
transport, reject changed bytes/loaded identity, and verify candidate admission and
configuration. They do not load the new trained checkpoint. The exact pending delivery
request, existing room regressions, source/model pins and qualification dependencies
are recorded in `internal-docs/ai/bot-workers/final-delivery.md`.
