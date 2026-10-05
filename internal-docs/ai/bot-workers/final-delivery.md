# Final delivery lane handoff

Worktree: `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/bot-final-delivery`.
Child branch: `bot-final-delivery`; base/source:
`7c8d7c7e0a38226bdd8d607e1531bb937db4d199`.
Coordinator owns integration, checkpoint qualification, admission and final acceptance.

## Delivered seam

`tools/bot-training/delivery.mjs` implements candidate-only `pack`, `validate`,
`probe` and `launch`; `delivery.md` documents the interface. It uses the existing
API/checkpoint configuration, pins exact bytes/schema/recipes/runtime/interpreters
and provenance receipts, and guards the actual scorer's loaded checkpoint hash.
The shared policy and normal **1000 ms** room deadline remain unchanged. It preserves
unrelated API configuration and earlier checkpoints/packages; it has no mutable
promotion pointer. Candidate use requires explicit opt-in, and production launch
is refused. It does not certify strength, mastery or release readiness.

No fingerprinted API/shared/Python file, canonical plan, card module, audit ledger,
sealed operator, existing remote process, production configuration or final seed is
changed. This external seam can wrap V48 without changing its engine fingerprint.
The coordinator's review identified the actual `2.7.1+cu128` Torch build; the tool
accepts supported 2.7.1 local-build syntax and pins the **complete** installed version
and interpreter identity for subsequent exact equality checks.

## Executable candidate request and evidence

Worker-owned ignored artifacts are under this worktree's
`artifacts/bot-training/final-delivery/`. `candidate-request.json` and
`provenance-request.json` contain real known source/origin paths and hashes.
The selected/migrated checkpoint path/hash are deliberately null. This exact command
was executed locally and correctly exited 1 before loading/copying any checkpoint:

```sh
PATH=/tmp/aegis-supported-node26/node-v26.10.0-darwin-arm64/bin:$PATH \
  node tools/bot-training/delivery.mjs pack \
  --request artifacts/bot-training/final-delivery/candidate-request.json
```

Known immutable origin:
`/home/vinicius/aegis-bot-lab/runs/2026-10-05-bt26-ex13-v40-fixed-corrective-ppo/ppo/checkpoint.pt`,
SHA `e55bcc120fde22352ad6e65aa5538a32b0130414df7f11cf120fb622630bbd4b`.
Its closed receipt SHA is
`47d2b2cc2961395a7a3491a17c4f7149deb1c87ee3ba00621b1830dbde70ab55`.
That model belongs to the older `bd73` engine; **do not pass the original e55 bytes
to V48 or relabel the older runs as latest-runtime evidence**.

Requested latest runtime:
`/home/vinicius/aegis-bot-lab/checkouts/bt26-ex13-2026-10-05-7c8d7c7e0-v48`;
source archive SHA
`7af23a5a6733c34bb7db31cddef43749043b618c362f2c1ec6d81967134345df`.
No future runtime/model digest is invented. Local `local-7c-metadata.json`,
`local-7c-curriculum.json` and `local-scope-proof.json` confirm schema 4, 479 unique
identities, all 104 BT26 + 77 EX13 identities, and 26 + 18 = 44 recipes. This local
descriptor is scope evidence only, not the future desktop build or learned acceptance.

After qualification, the coordinator supplies the real migrated checkpoint path/hash
and reviewed preparation/migration/acceptance receipts in a new provenance/request
file, then runs `pack --request` in a fresh lane-specific directory on the authorized
host. Preserve its returned external manifest hash. `validate`, `probe` and `launch`
commands are in `tools/bot-training/delivery.md`; use the copied package `scorer.mjs`
with Node 26 to validate an earlier version independently. No remote transfer or job
was started by this lane. Host-specific absolute checkout/venv/receipt paths must
remain available; this envelope does not install or relocate dependencies.

## Verification and remaining gates

- Supported Node **26.10.0** offline dependency install used
  `pnpm install --offline --frozen-lockfile --ignore-scripts`; shared/API builds pass.
- `node --test tools/bot-training/delivery.test.mjs`: **18 passed**. Explicit synthetic
  checkpoints/scorers exercise the actual Node `InferenceClient`, package validation,
  candidate launch configuration, loaded-hash mismatch, schema/scope failures and
  authorized CUDA-build identity. No trained model is loaded by these fixtures.
- One-fork/no-file-parallelism focused API check: **46 passed** across
  `src/bot/training/inferenceClient.test.ts` and `src/rooms/AegisRoom.inference.test.ts`.
  The room suite uses a mock scorer and logs expected fixture lock failures because
  it does not instantiate a Colyseus listing; it is not actual managed-room acceptance.
- Supported full workspace `pnpm typecheck` passes; changed-file lint/format and
  `git diff --check` pass. Logs stay in the ignored artifact directory.

Actual e55/migrated-model queries, V48 completion/fingerprint, unchanged-tensor
migration, all-44 per-list gains, both-seat mechanisms, normal-deadline managed rooms,
current material custody and the untouched final blind remain coordinator gates.
No actual weight copy/query or narrow-fixture acceptance is claimed. The final
`worker_done` records the child commit, tests and actual push result; the delivery
lane may complete independently of these explicitly pending model gates.
