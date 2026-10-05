# Latest runtime and checkpoint migration handoff

Worker worktree: `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/bot-final-runtime`; child branch `bot-final-runtime`; base `7c8d7c7e0a38226bdd8d607e1531bb937db4d199`. Coordinator owns integration and actual model gates. No canonical plan, card module, training algorithm, serving integration, existing desktop job or checkpoint changed.

## Delivered implementation

`tools/bot-training/operators/aegis-v49-latest-engine-migration.py` is a fresh migration operator for the original four checkpoints after **actual V48 whole exit 0**. It checks all 11 literal build contracts, source archive/manifest (12,317 files and one link), all 24 unchanged Python files, runtime maps, Node 26.10.0/Python 3.12.14, at least 13,783 tests/819 files and Python 61, unchanged metadata/curriculum except fingerprint, full current custody and closed V47. Scope stays 104 BT26 + 77 EX13 identities, 479 vocabulary identities, 26 catalog + 18 support recipes, both seats and one shared policy.

Model imports follow complete runtime verification and the unchanged sealed idle helper. The complete original V35 `SOURCES.items()` loop and original V25 recursive `same` function execute from SHA-pinned AST without alteration, against all four original hashes and all 28 unchanged input queries. Only new V49 copies change metadata/migration receipt; model, Adam and all other saved fields must remain byte exact. Original sources remain `045b5023…`, `3c694bdb…`, `a66ec24c…`, `e55bcc12…`, pinned in full in the operator.

The same operator's `--closed ACTUAL_V49_IDENTITY_SHA` mode reads complete whole-process closure, V48/current-custody/V47 bindings, exact output map, four checkpoint hashes, preservation flags, query choices and queued/started/report receipts without importing Torch. This validates the recorded closure chain; it does not independently decode tensors or establish gameplay preservation/strength.

| File | SHA-256 |
| --- | --- |
| operator | `bd619ac7d92c8d95458945622541713fd344c13e5d2351a7dbe3eba2888570bf` |
| launch wrapper | `e6dd27cb05e99a02656bfab5bf81c9c68de152db235191ac7476b79266b4c253` |
| attach wrapper | `a70ac01af71ef71f646b9a88fbe49de84160969cb93e252dc43cd97924a27445` |
| guard tests | `71730d64ec27ca1297a7a1ddc5cb5a9f491d8e4b5ed27ddfcac8319676c428ae` |

Launch/attach scripts are sealed to those exact hashes and exclusive new run/identity namespaces. The CLI rejects optimized Python, which would otherwise strip assertions. Only V49 polls predecessor exit at one second; a deterministic synthetic exit-after-poll fixture measures 30 simulated seconds in V47 versus one in V49. No actual job speedup or expensive custody-hash optimization is claimed; sealed V46/V47/V48 are unchanged.

## Bounded evidence and reproduction

Ignored worker evidence lives under `artifacts/bot-training/bot-final-runtime/`: `prepared-report.json`, `future-guard-tests.log`, `v48-actual-queue.json`, the read-only observer and `sealed/manifest.json`. No checkpoint/episode archives were copied here. Local Python 3.12.12 passes 12 unittest methods, including actual original source/archive verification, 32 malformed runtime cases, five fake-storage preservation failures, 23 malformed closure cases, import ordering, optimization rejection and polling/failed-exit guards. All runtime completion, custody callbacks, serialization/scoring and closure fixtures are **synthetic future tests**, not completed migration/model evidence. Shell syntax and Ruff 0.14.2 checks pass.

```sh
AEGIS_BOT_REFERENCE_ROOT=/Users/viniciusluiz/aegis-bot-chronomon/artifacts/bot-training \
AEGIS_V48_PROOF_ROOT=/tmp \
AEGIS_V48_IDENTITY_FILE="$PWD/artifacts/bot-training/bot-final-runtime/v48-identity.json" \
/opt/homebrew/bin/python3.12 tools/bot-training/operators/test_v49_guards.py
```

These explicit external proof roots contain the SHA-pinned original V25/V35 operators, V34 baselines, V48 operator/archive/manifest/wrapper and actual identity. They are read-only inputs. The Linux-only live-wrapper rejection case adds one malformed closure case on that host.

## Actual queue and next action

At `2026-10-05T15:34:00.964764Z`, read-only desktop inspection verified V48 whole `178444/start2771412`, sole waiting operator `178450/start2771414`, predecessor V47 `134923/start2291537`, exact argv/parentage, operator `172909ba…`, wrapper `b94fedb8…`, identity `3300e29a8464bb80c55f9506538ee5b4a219b615a08ca49c17ed6f4cf1323f22`, queued receipt `5ba67a9f239b2e7d5e5a12446a5acd6f2687e099a358d6b849a82339dfc4be94`. V48 had no child build, started/completion/exit receipt or checkout. This establishes a timestamp-bounded live queue, not a qualified runtime.

V49 is prepared locally. Independent coordinator review and resource/launch decision were requested through the live Orca ask; no V49 identity or actual four-checkpoint receipt exists yet. After review/resource agreement, upload the three sealed V49 scripts using `/tmp/aegis-upload-sealed-operators.py`, attach with safe desktop transport, record actual wrapper PID/start ticks/identity SHA and independently verify the queue. Real migration waits for V48 exit 0 and idle agreement; then run the full closure reader with the actual V49 identity SHA. Latest-engine receipts, policy qualification, all-list strength, physical/room evidence and final acceptance remain pending; reserved final seeds `6210000–6213871` remain untouched. Do not relabel V46/V47 receipts as latest-source proof.
