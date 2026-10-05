# V50 candidate delivery handoff

The new external `tools/bot-training/candidate_delivery.py` prepares an immutable
candidate package and a separate managed-room replay using the integrated delivery
tool unchanged. ROOT owns staging, resource approval, actual execution, model
admission and integration. No actual checkpoint was copied or loaded by this lane;
no job was launched or changed. This handoff completes preparation only.

## Reviewed bytes and actual dependencies

- Adapter SHA256: `1b26edc2ed25a9da4e9864b87f9da35747bbc492c72e2d4dcc133ba6e3ab4c2e`.
- External trace `tools/bot-training/candidate-transport-trace.mjs` SHA256:
  `e8f798f42692d29e026fe4f5ed1df3e83671f70af7307970337ca12431848716`.
- Frozen delivery SHA256 remains
  `3d5015508d4b295e24b674f558341dfd83c2b72f51e5346b455053ec593d1d64`.
- V50 source `7d34b4c1267e0bc266736e61b43cb28debf598ee`, archive
  `a7dada720768672287b2af577f64b383f2b71e2eba73a5bb6ebc21dbccd0f021`;
  checkout `/home/vinicius/aegis-bot-lab/checkouts/bt26-ex13-2026-10-05-7d34b4c12-v50`.
- V50 reader SHA256
  `4cfb5f462169eac06c01d70a51ae48f38987f0641006d3af23bd24c90db5c27c`,
  actual launch identity SHA256
  `8ca2810d78c165e421b0c40f41afe503d07c4951f2191dd0840b59a7cb614592`.
- V49 reader SHA256
  `bd619ac7d92c8d95458945622541713fd344c13e5d2351a7dbe3eba2888570bf`,
  actual launch identity SHA256
  `a9e62d915f08e55c998bfeca7874cdca5fdbf97238b08d1c32a655fd09c45f63`.

Readers reside under `/home/vinicius/aegis-bot-lab/transfers/` with their original
`aegis-v49-latest-engine-migration.py` and
`aegis-v50-integrated-runtime-qualification.py` names. The adapter calls their
unchanged `closed_migration(identitySha256)` and `closed(identitySha256)` full-chain
consumers and V50's approved stdlib `require_idle()` before execution. ROOT must
fill actual completion/report hashes only after both whole processes close zero;
those hashes and all migrated checkpoint hashes remain unknown here.

Primary selection is exclusively actual `V49/challenger.pt` from the successful
migration report and V50's four-checkpoint bindings. The report must preserve V40
origin `e55bcc120fde22352ad6e65aa5538a32b0130414df7f11cf120fb622630bbd4b`,
all model/Adam bytes, and zero migration learning. The SHA-pinned original V40
receipt must retain 7072 actual Adam updates for every one of 12 tensors. The
adapter never supplies guessed migrated hashes or selects another reference.

## Request and explicit phase approval

The ignored preparation artifact is
`artifacts/bot-training/final-delivery-v50/root-request.pending.json`. Its four
null V49/V50 completion/report pins deliberately fail before host inspection,
sealed imports, package copy or scorer load. ROOT must supply actual pins, review
the finalized request, stage it at its declared absolute `requestPath`, and pin
its final SHA256. It declares the external immutable output
`/home/vinicius/aegis-bot-lab/deliveries/bot-final-delivery-v50/e55-v50-candidate`.
The parent must exist; the output itself must be fresh. Failed phases retain their
logs and cannot overwrite/retry that destination.

Stage only the reviewed adapter/trace outside the sealed checkout. Prepared target
paths are `/home/vinicius/aegis-bot-lab/transfers/bot-final-delivery-v50/candidate_delivery.py`
and the adjacent `candidate-transport-trace.mjs`. The request pins the latter.
Use the existing non-overwriting sealed-upload transport and a fresh lane directory;
do not replace any resident operator. Staging and commands below are for ROOT's
later execution, not authorization to launch now.

Each approval file must contain exactly these fields, with actual SHA256 values:

```json
{
  "phase": "package-probe",
  "adapterSha256": "SHA256 of the reviewed adapter above",
  "requestSha256": "SHA256 of ROOT's finalized request",
  "v50CompletionSha256": "actual successful V50 completion SHA256",
  "v49CompletionSha256": "actual successful V49 completion SHA256",
  "checkpointSha256": "actual migrated challenger SHA256 from closed inspect",
  "approved": true
}
```

These descriptions are documentation, not accepted hashes. For `rooms`, change
`phase` and add `packageManifestSha256` and `packageProbeCompletionSha256`, both
from the actual successful package-probe output. This binds the second approval
to that exact copied scorer/package and prior successful probe. The request pins
approval file paths; ROOT passes each approval file's reviewed SHA256 explicitly
as `--resource-go`. Missing/mismatched/null approval fails before copying/loading.

## Exact remote commands after ROOT fills the gates

Run through `/tmp/aegis-desktop-wsl.py LOCAL_BASHFILE` on this PC. The remote
shell must have Node 26.10.0 on PATH and use the preserved lab Python entry. The
adapter additionally checks Python 3.12.14, Torch 2.7.1+cu128, NumPy 2.2.6 and
Click 8.1.8 via metadata without importing Torch. No automatic CPU/GPU launch or
resource scheduling exists.

```bash
set -euo pipefail
: "${ROOT_REQUEST_SHA:?ROOT must pin the finalized actual request}"
adapter=/home/vinicius/aegis-bot-lab/transfers/bot-final-delivery-v50/candidate_delivery.py
request=/home/vinicius/aegis-bot-lab/transfers/bot-final-delivery-v50/root-request.json
python=/home/vinicius/aegis-bot-lab/venv/bin/python
PYTHONDONTWRITEBYTECODE=1 "$python" "$adapter" inspect \
  --request "$request" --request-sha256 "$ROOT_REQUEST_SHA"
```

Then, in separately ROOT-approved resource windows:

```bash
: "${ROOT_PACKAGE_PROBE_GO_SHA:?ROOT must explicitly approve package and probe}"
PYTHONDONTWRITEBYTECODE=1 "$python" "$adapter" package-probe \
  --request "$request" --request-sha256 "$ROOT_REQUEST_SHA" \
  --resource-go "$ROOT_PACKAGE_PROBE_GO_SHA"

# Only after successful probe and review of its exact package/proof hashes:
: "${ROOT_ROOMS_GO_SHA:?ROOT must separately approve managed rooms}"
PYTHONDONTWRITEBYTECODE=1 "$python" "$adapter" rooms \
  --request "$request" --request-sha256 "$ROOT_REQUEST_SHA" \
  --resource-go "$ROOT_ROOMS_GO_SHA"
```

All pack/validate/probe/room subprocesses receive `PYTHONDONTWRITEBYTECODE=1`;
sealed imports also suppress bytecode before reader import. Initial adapter and
trace hashes are checked again after execution before completion is recorded.

## Proof limits and original managed rooms

Package-probe calls unchanged delivery `pack`, `validate`, and `probe --allow-candidate`.
It compares all 28 SHA-pinned original migration query windows and greedy choices
to actual transport choices. The external preload records the actual ready-loaded
checkpoint SHA, ready latency, legal query indices and query latency. The manifest
and copied scorer bytes must match the selected runtime/model and frozen delivery
SHA. No heuristic substitution, promotion pointer or accepted/production label
is created.

The room phase executes unchanged `room-smoke.mjs` and extracts the unchanged
SHA-pinned V43 `validate_rooms`, also requiring its AST to match V37. It reuses
original V25/V19b mechanism helpers with only declared V50 runtime, candidate
checkpoint and fresh output selectors. It verifies 26 native managed matches,
normal bot pacing, **1000 ms policy deadline**, scripted human seat 0 / bot seat 1
as required by that original interface, terminal results, no fallback/error,
illegal/rejected intents or apply failures, and query latency below 1000 ms.
The separate transport bound is 2000 ms. Seeds 6170000–6170025 are the original
observed room fixture; final reserved seeds are untouched.

The qualified schema must retain 479 vocabulary IDs, all 104 BT26 + 77 EX13
identities, and 26 catalog + 18 support = 44 recipes. Schema presence, 28 query
reloads and 26 room fixtures establish bounded package/routing evidence only.
Both-seat strength, all-list gains, all-card mechanisms, physical/material custody
and blind acceptance remain ROOT-owned pending gates. Every phase completion
records `acceptance: false` and `actualLearningUpdates: 0`; no package result can
admit the model or claim new strength.

## Local verification

```bash
PYTHONPATH=tools/bot-training /opt/homebrew/bin/python3.12 -m unittest discover \
  -s tools/bot-training -p test_candidate_delivery.py
PATH=/tmp/aegis-supported-node26/node-v26.10.0-darwin-arm64/bin:$PATH \
  node --test tools/bot-training/candidate-transport-trace.test.mjs
uvx --offline ruff check tools/bot-training/candidate_delivery.py \
  tools/bot-training/test_candidate_delivery.py
```

15 Python hostile-fixture tests passed locally with no skips, including real
imports of a synthetic sealed reader without bytecode, all-child environment
suppression, post-phase trace replacement rejection, null/unclosed/path/hash/
engine/origin/Adam/approval failures and original SHA-bound room validator failure
fixtures. The original room guard test explicitly skips on machines lacking those
external preserved helper sources. Three Node26 tests exercised the real existing
InferenceClient with explicit fake scorers: ready/query evidence, wrong loaded
hash before choices, and transport rejection without heuristic fallback.

Ignored evidence logs and pending-request rejection live under
`artifacts/bot-training/final-delivery-v50/`. These are fixture results, not actual
V49/V50 model admission or completed managed-room evidence.
