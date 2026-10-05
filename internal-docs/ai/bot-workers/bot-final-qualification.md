# Integrated runtime qualification handoff

Child worktree `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/bot-final-qualification`,
branch `bot-final-qualification`, base and immutable target source
`7d34b4c1267e0bc266736e61b43cb28debf598ee`. Root owns integration, GPU scheduling,
resource admission and actual model acceptance. All new qualification files live
outside the sealed target archive; adding them does not change its source pin.

## Executable boundary

`tools/bot-training/operators/aegis-v50-integrated-runtime-qualification.py`
prepares one fresh CPU runtime and implements a strict Torch-free closure reader.
Its launch and attach scripts remain in the foreground; nothing automatically
starts a CUDA query, primary-model load, new game, training pass or blind run.
The launch wrapper sets `CUDA_VISIBLE_DEVICES=-1` and disables bytecode writes.
Synthetic CPU unit fixtures are explicitly runtime checks, not trained-model proof.

It waits for exact V49 whole `193939/start2949066`, identity
`a9e62d915f08e55c998bfeca7874cdca5fdbf97238b08d1c32a655fd09c45f63`,
and actual whole exit zero. Admission invokes the unchanged SHA-pinned V49
`closed_migration`, `require_sources`, `prep_module` and `verify_runtime`,
including their complete actual V48/current-custody/V47 source closure chain.
There is no request file, boolean override or synthetic-admission switch.
All four checkpoint paths and hashes come from that actual full closed consumer;
no new metadata-copy checkpoint generation is made.

Target archive `aegis-bt26-ex13-7d34b4c12-v50.tar.gz` is 43,707,176 bytes,
SHA `a7dada720768672287b2af577f64b383f2b71e2eba73a5bb6ebc21dbccd0f021`.
Target manifest `aegis-v50-integrated-source-manifest.json` has SHA
`ba054c00047d7e2af6f55ccb09f0a32f4b8eed49eaf1c0204cc456451d538462`.
Every one of its 12,331 regular files and one symlink is verified before
extraction into new checkout
`/home/vinicius/aegis-bot-lab/checkouts/bt26-ex13-2026-10-05-7d34b4c12-v50`.
Unsafe paths, duplicate names, hardlinks, devices, unexpected members and file
entries beneath a symlink fail. Existing checkout/run destinations and receipt
writes are exclusive. Root has already transferred the archive and manifest;
this lane does not repeat that transfer.

The exact four changed and fourteen added source records are declared in the
operator and constrained by the complete sealed manifest. All 10,621 protected
API/shared/lock records remain byte exact to V48. Among the original 24 training
records, only `train.py`, `imitate.py` and `README.md` change; the other 21 remain
exact. Reviewed train/imitate/mechanisms/delivery pins are checked explicitly.
Pre/post guards rehash the original source chain, new checkout, operator and
all four preserved V49 checkpoints. Existing jobs, checkpoints, sealed checkouts,
production and canonical plan are read-only inputs.

## Actual runtime obligations

The CPU operator requires actual Node **26.10.0** and Python **3.12.14** at the lab
venv path, and uses the unchanged SHA-pinned V34 source and idle helpers where
applicable. Its thirteen real phases record exact command/cwd/start/exit/log:

1. Node and Python version checks.
2. Offline frozen dependency install with scripts ignored.
3. Shared/API builds and API/web typechecks.
4. Image and mirror/deployer fixtures, with at most one Vitest fork.
5. Full updated **73 Python tests** and **18 delivery tests**, with no skips.
6. Real `--describe` and `--describe-curriculum`.

Metadata and curriculum must equal qualified V48 completely, **including** its
actual fingerprint: schema 4, vocabulary 479, all 104 BT26 + 77 EX13 identities,
26 catalog + 18 support recipes, both learner seats and feature V7. A difference
fails qualification for root investigation. No descriptor from a local build is
treated as an actual desktop descriptor.

The unchanged V49 reader verifies the complete real V48 engine proof of at least
13,783 tests in 819 files. V50 reuses that proof only with exact protected source
and all executable/data/declaration/source-map outputs. Both complete runtime
maps are retained and sealed. The sole permitted non-runtime difference is
`packages/shared/dist/.tsbuildinfo`: all compiler version/options/input names,
input versions/flags, dependencies and diagnostic fields must remain exact;
only optional signature presence on pinned unchanged source JSON entries and
the last emitted declaration history may differ. Both cache hashes and the
exact differences are recorded; each history path must name an existing
byte-exact declaration. No API cache, source-map, executable, JSON output or
general compiler-field exclusion is permitted. This narrowly handles the
concrete local incremental-build cache difference without weakening V49's
complete runtime-map verification or rerunning unchanged broad engine tests.

## Consumer interface

The resident operator will be at
`/home/vinicius/aegis-bot-lab/transfers/aegis-v50-integrated-runtime-qualification.py`.
Its new run is
`/home/vinicius/aegis-bot-lab/runs/2026-10-05-bt26-ex13-v50-integrated-runtime-qualification`.

```sh
/home/vinicius/aegis-bot-lab/venv/bin/python \
  /home/vinicius/aegis-bot-lab/transfers/aegis-v50-integrated-runtime-qualification.py \
  --closed ACTUAL_V50_LAUNCH_IDENTITY_SHA
```

Supply the actual independently verified identity SHA; no future identity or
completion hash is invented. `closed(identity_sha)` also exposes this reader
to a SHA-pinned stdlib import. It rejects optimized Python, a live whole wrapper,
missing/nonzero whole exit, mutated launch/operator/source/runtime/test outputs,
wrong predecessor bindings, duplicate JSON keys and numeric/boolean substitutions.
It recomputes every report field and complete output map and reruns the unchanged
full V49 consumer. The CLI imports no Torch or primary model.

The returned object includes `identitySha256`, `completionSha256`,
`reportSha256`, `sourceCommit`, `engineSha256`, `runtimeMapSha256`,
`pythonMapSha256` and `checkpointBindings`. Its four exact labels are
`v17-reference`, `source-challenger`, `fitted-reference`, and `challenger`,
each with `{path, sha256}`. Paths remain under the original V49 run.
**`challenger` is the preserved V40 e55-derived current primary**; the fitted
reference remains separate. `cpuRuntimeQualified` is true only after actual
V50 closure. `actualPrimaryModelOrCudaParityQualified`,
`strengthPhysicalRoomCustodyAcceptance` and `finalBlindAccepted` remain false.

Public `require_idle()` uses the exact V49 identity/operator and unchanged
preparation loader to execute the SHA-pinned original V34 idle helper. It is
stdlib-only and must run before any primary-model imports in a consumer, or in
a separate stdlib process. It supplements actual closure and root resource
agreement; it does not itself authorize model/GPU/game work.

## Source/mock evidence and pins

Local Python **3.12.12** passes **15 unittest methods**, including actual sealed
archive/source identity and actual existing local shared-cache comparison.
Future runtime/predecessor/build/closure/checkpoint fixtures are **explicitly
synthetic**; they establish no real V50 build, model load, migration or strength.
Hostile fixtures reject unsafe/duplicate archive records, undeclared source
deltas, bad phase commands/cwd/versions/exit/logs/test counts, mutable runtime or
checkpoint paths/bytes, malformed identities, live/failed whole wrappers,
non-history compiler-cache changes, forbidden Torch admission and optimized
Python. Real tiny stdlib subprocesses verify CPU environment and failure receipts.

```sh
PYTHONDONTWRITEBYTECODE=1 /opt/homebrew/bin/python3.12 \
  tools/bot-training/operators/aegis-v50-qualification-guards.py
```

External read-only proof roots can be supplied with `AEGIS_V50_LOCAL_PROOF_ROOT`,
`AEGIS_BOT_REFERENCE_ROOT`, `AEGIS_V50_CACHE_BASE` and `AEGIS_V50_CACHE_CURRENT`.
These configure tests only; the actual operator exposes no environment admission
override. Local test log is `/tmp/aegis-v50-qualification-guards-local.log`.
Ruff, shell syntax, supported Node 26 full workspace typecheck and
`git diff --check` pass. Local dependencies were installed once with
`--offline --frozen-lockfile --ignore-scripts`; the normal pre-push hook is required.

| File | SHA-256 |
| --- | --- |
| qualification operator | `4cfb5f462169eac06c01d70a51ae48f38987f0641006d3af23bd24c90db5c27c` |
| launch wrapper | `5ac52bca9e66d432775a1bb1868131f5110ba53687a9b8c866a84b60efc49a9e` |
| attach wrapper | `c6f57ea550ab240b9ca49bb38f234cb3d153f1e33250c53f5158da544b9829bb` |
| hostile guard tests | `a3d8000a270c5da003141afec323ab73d2f07624ffca30946dc059b74c58b3bb` |

## Actual queue and acceptance status

Root independent source/mock review is **green, no findings**, for the exact four
file hashes above. Root reran all 15 guard methods, verified source SHA stability
before/after and shell syntax, and explicitly authorized the CPU-only queue.
Review receipt is
`/Users/viniciusluiz/aegis-bot-chronomon/artifacts/bot-training/2026-10-05-bt26-ex13-orca-parallel-closeout/v50-root-source-review.json`,
SHA `17ab3b4f18ed330d82495da6c182320d32c57a12a775b2f838fbaaf229cbcc08`.

Each of the three no-overwrite operator/script uploads actually exited zero and
matched its reviewed resident SHA before exactly one attach. The attached SSH
foreground session is **60408**, retained for root process ownership.
Read-only observation at **2026-10-05T16:41:29.997153Z** establishes:

- Whole wrapper **221023/start3250500**, parent attach **221020/start3250499**.
- Sole waiting operator **221029/start3250502**, exact argv/parentage and CPU-only
  environment (`CUDA_VISIBLE_DEVICES=-1`, OMP/MKL 1, bytecode writes disabled).
- Actual launch identity SHA
  `8ca2810d78c165e421b0c40f41afe503d07c4951f2191dd0840b59a7cb614592`.
- Actual queued receipt SHA
  `77be56958b49498d42721a75ce17d9a977ee934c616d56d6adda31dbc2856cd9`.
- Exact predecessor V49 whole **193939/start2949066** remains live with its
  original queued receipt; no V50 checkout, started receipt, phase, report,
  completion, model/CUDA query or game artifact exists at this observation.

Read-only observer `/tmp/aegis-v50-observe.sh` and actual output
`/tmp/aegis-v50-actual-queue.json` were sent to root. This is actual live queue
evidence only. Actual V49/V48 closure, V50 fresh phases/whole closure and all four
latest-runtime primary model/query checks remain future obligations. No optional
CUDA parity phase is auto-started; root must approve its resources separately.

Full goal acceptance still requires current-primary gains on every one of the
44 lists, both-seat Link/DNA/full Charismon and Mienumon Fusion/Main and effect
Assembly and DigiXros, actual managed rooms/current custody and the untouched
6210000–6213871 final blind. Aggregates, visible IDs, package integrity and this
CPU runtime boundary cannot replace those gates. No promotion is claimed.
