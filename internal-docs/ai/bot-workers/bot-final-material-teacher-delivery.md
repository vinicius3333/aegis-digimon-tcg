# Frozen teacher candidate delivery

Worktree: `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/bot-final-delivery`, child branch `bot-final-delivery`. New external operator: `tools/bot-training/operators/material-teacher-delivery.py`; guards: `test_material_teacher_delivery.py`. No frozen source, prior operator, checkpoint, job, or promotion pointer changes.

Frozen source is `1cec011c0fd0c6481e7297506ed4c825a4dfcdc7`; archive SHA `7eb27ab7c35d749c6ed6447a7db40522352df2e97ee2ae79ad765f76b6bec080` (43,769,742 bytes), manifest SHA `0c1b5546ca96ef9e225f07fe68c8beb3293c1d5b0292849e611bf882630afe68`. Source-only archive verification passed all 12,348 files and one symlink; this is not runtime or model qualification.

Operator SHA: `7904242d1456cce45a5daeeb31369266e103e94821ed2f27e1b1288ad63f53a0`. ROOT binds the actual reviewed runtime reader path/SHA; current uploaded reader is `material-teacher-runtime-reviewed.py`, SHA `f14ced506df5352fde9061835c8af6fb5dea820bbaaf303128c5883811e217c5`. Learning interface was coordinated directly with dispatch `ctx_23b28ddd5923`: `context(Path, requestSHA, operatorSHA)`, `closed_phase(ctx, "ppo", actualIdentitySHA)`, and actual `phase_path(ctx, "ppo")`. Learning worker pushed `507031a134f32891d40c0f4413e75e80d082e937`, operator SHA `451175d758572de4c37e80f9aa6fab0faec903f67f4329ff0696b9debd6ed7e9`; local read-only hashing confirms those bytes. ROOT must seal the actual reviewed reader/operator copies before binding them.

The new adapter never invokes obsolete V50 successful closure. It uses reviewed runtime `context`, `closed_prepare`, `closed_migration`, and the original `whole` mechanism with explicitly selected new run/identity/operator paths. All four original CPs must have actual unchanged preservation custody. Trained mode requires closed PPO whole0, exact prepared/migration bindings, positive actual finite changed Adam updates, and the exact ROOT-pinned nested `material-teacher-learning-*/ppo/checkpoint.pt` path/hash. Preserved mode is expressly an initial preserved candidate with zero new learning and cannot run managed rooms. Original V40 e55 hash and 7,072 actual Adam updates stay in package provenance.

Request schema and execution

`artifacts/bot-training/material-teacher-delivery/root-request.pending.json` is an intentionally non-executable request template: unknown request/closure/CP pins are null. Its proposed new output/transfer selectors are not claims of existing paths. ROOT fills actual reviewed runtime and learning requests, identity/completion/report hashes, latest engine fingerprint, actual CP path/hash, and seals the unchanged request before any phase. `runtime` requires prepare and migration report SHA in addition to their actual identity/completion SHA. Both readers and requests must be immutable direct children of desktop `LAB/transfers`. ROOT may place byte-identical original helper copies there; no copying is performed during admission.

Bound original helpers:

- `candidate_delivery.py`: SHA `1b26edc2ed25a9da4e9864b87f9da35747bbc492c72e2d4dcc133ba6e3ab4c2e`; use pure `host_check`, `trace_check`, `run_command`, `child_environment`, and unchanged `room_guard` AST. Never call its old preflight/execute/main.
- `delivery.mjs`: SHA `3d5015508d4b295e24b674f558341dfd83c2b72f51e5346b455053ec593d1d64`; from the actual qualified checkout. Pack/validate/probe/launch remain unchanged.
- `candidate-transport-trace.mjs`: SHA `e8f798f42692d29e026fe4f5ed1df3e83671f70af7307970337ca12431848716`.
- Original historical selector: `/tmp/aegis-v50-cuda-choice-parity.py` locally, SHA `746283bd0b38ef52b09ad7b0017f7b5b14370dacee59af2df49c42aa6dfeb2f9`; only unchanged `windows` AST is extracted, never its CUDA or obsolete qualification main. Request pins original 28-query file plus exact existing three episode files/five seat-zero rows. Total 33 genuine historical windows, teacher annotations stripped.

Separate ROOT-owned whole wrappers run `package-probe` and `rooms`. Identity must be live and byte bound before execution; ROOT Go must be explicitly supplied as a SHA of an immutable JSON file. Exact Go keys for either phase: `approved: true`, `phase`, `operatorSha256`, `requestSha256`, `identitySha256`, `candidateMode`, `checkpointSha256`, `prepareCompletionSha256`, `migrationCompletionSha256`, `ppoCompletionSha256` (null only for preserved mode). Rooms Go additionally binds actual successful package-probe `packageProbeIdentitySha256`, `packageProbeCompletionSha256`, and `manifestSha256`. These later pins belong in separately sealed rooms Go, keeping the initial request immutable and avoiding circular request/completion hashes.

ROOT-only commands below use actual filled shell variables; no command was launched here. `DELIVERY_OPERATOR_PATH` is the external sealed operator, `DELIVERY_REQUEST_PATH` the actual sealed desktop request, and each SHA comes from actual bytes. Supported environment: desktop `LAB/venv/bin/python` 3.12.14, Node 26.10.0, Torch 2.7.1+cu128, NumPy 2.2.6, Click 8.1.8. ROOT supplies supported Node PATH. Inspection imports stdlib readers only.

```sh
PYTHONDONTWRITEBYTECODE=1 "$LAB_PATH/venv/bin/python" "$DELIVERY_OPERATOR_PATH" inspect \
  --request "$DELIVERY_REQUEST_PATH" --request-sha256 "$DELIVERY_REQUEST_SHA" \
  --operator-sha256 "$DELIVERY_OPERATOR_SHA"

# Inside the ROOT-owned live package-probe wrapper, after separate resource agreement:
PYTHONDONTWRITEBYTECODE=1 "$LAB_PATH/venv/bin/python" "$DELIVERY_OPERATOR_PATH" run \
  --request "$DELIVERY_REQUEST_PATH" --request-sha256 "$DELIVERY_REQUEST_SHA" \
  --operator-sha256 "$DELIVERY_OPERATOR_SHA" --phase package-probe \
  --identity-sha256 "$PACKAGE_PROBE_IDENTITY_SHA" --resource-go "$PACKAGE_PROBE_GO_SHA"

# After that actual wrapper closes zero; read and pin its returned completion/manifest:
PYTHONDONTWRITEBYTECODE=1 "$LAB_PATH/venv/bin/python" "$DELIVERY_OPERATOR_PATH" closed \
  --request "$DELIVERY_REQUEST_PATH" --request-sha256 "$DELIVERY_REQUEST_SHA" \
  --operator-sha256 "$DELIVERY_OPERATOR_SHA" --phase package-probe \
  --identity-sha256 "$PACKAGE_PROBE_IDENTITY_SHA"

# Inside a different ROOT-owned live rooms wrapper, after separately sealed rooms Go:
PYTHONDONTWRITEBYTECODE=1 "$LAB_PATH/venv/bin/python" "$DELIVERY_OPERATOR_PATH" run \
  --request "$DELIVERY_REQUEST_PATH" --request-sha256 "$DELIVERY_REQUEST_SHA" \
  --operator-sha256 "$DELIVERY_OPERATOR_SHA" --phase rooms \
  --identity-sha256 "$ROOMS_IDENTITY_SHA" --resource-go "$ROOMS_GO_SHA"

# After actual rooms wrapper zero, obtain public closed evidence:
PYTHONDONTWRITEBYTECODE=1 "$LAB_PATH/venv/bin/python" "$DELIVERY_OPERATOR_PATH" closed \
  --request "$DELIVERY_REQUEST_PATH" --request-sha256 "$DELIVERY_REQUEST_SHA" \
  --operator-sha256 "$DELIVERY_OPERATOR_SHA" --phase rooms --identity-sha256 "$ROOMS_IDENTITY_SHA"
```

Package phase creates a fresh immutable external candidate directory, verifies the copied checkpoint/scorer/environment, runs a separately admitted CPU child using actual qualified `CheckpointScorer`, and requires exact greedy equality of all 33 direct/package/transport choices. Outputs record actual loaded SHA, ready/query timing, runtime/source module hashes, package inventory, whole identity and candidate status. There is no CUDA probe, automatic launch, or accepted-version pointer. Existing `node "$QUALIFIED_CHECKOUT/tools/bot-training/delivery.mjs" launch --package "$CANDIDATE_PACKAGE" --manifest-sha256 "$CANDIDATE_MANIFEST_SHA" --allow-candidate` remains available only for later explicit ROOT resource approval in a development environment.

Rooms use the actual newly trained CP package, original `room-smoke.mjs` SHA `970a4a6059ff65b648d229c1019f6ad257b30838d6266d7b959a33555f2a3117`, and SHA-bound original V43/V37 validator plus V25/V19 mechanism. Private legacy `v50`/`PREP` helper selectors receive the actual new engine/prepare paths; no historical closure is relabeled. It retains 26 native catalog recipes, scripted human seat0/bot1, normal 1000ms policy deadline, distinct 2000ms query transport, 600000ms match bound, seeds6170000..6170025, and no fallback/illegal action/apply failure/timeout. Schema4/feature7/vocab479/all181/44 recipes stay one global checkpoint through unchanged package validation. No final6210000..6213871 seeds are used.

Validation and remaining gates

19 synthetic hostile guards pass under local Python3.12; they reject null/mismatched closure pins, unsupported host, wrong/escaping/symlink CP paths, open/failed wholes, absent/mismatched Go, bad finite/Adam proof, package mutation, and preserved-candidate rooms before copy/import. 18 existing delivery tests pass on supported Node26.10. Ruff format/check and diff check pass. Synthetic fixtures are not actual models or current strength evidence. Logs/request/source-only verification live only in ignored `artifacts/bot-training/material-teacher-delivery/`.

ROOT still owns actual preparation/migration/PPO closure, final learning operator SHA, resource Go and wrapper identities, package probe, current-policy strength/physical/material evidence, managed rooms, admission and promotion decisions. These commands are prepared; no model was copied/loaded and no actual job was launched by this worker. Historical query fidelity and package integrity are not all-card acceptance, current mastery, or strength gains.
