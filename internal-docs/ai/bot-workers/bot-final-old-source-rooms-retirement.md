# Old-source room retirement handoff

2026-10-05. Prepared for ROOT execution only: the worker performed read-only desktop inventory and synthetic local guards, with **no remote writes, uploads, signals, model imports or job launches**. This deliberately retires old-source read-only V43 room validation and its still-waiting V44 custody; it does not qualify any bot or remove the required new-trained-candidate validation.

## Stable handoff

| File | SHA-256 |
| --- | --- |
| `/tmp/aegis-retire-old-source-rooms-reviewed.py` | `7965028edb4632ef20fec1748664d72b554af4693a822f3f7a5304d9626225f7` |
| `/tmp/aegis-old-source-rooms-retirement-request.inventory.json` | `1201649af1d39320bd03d92447382e0dac4f7691716aa753302872dd89ee5acb` |

These local files were created exclusively without overwriting. The controller is byte-identical to `tools/bot-training/operators/retire-old-source-rooms.py`. ROOT owns sealing/uploading the actual request and controller, default CLI inspection and any actual execution. `--inventory` emits a validated read-only request to stdout, so ROOT may refresh the observation before sealing a final file and hash.

Actual controller `inventory()` ran in memory through the safe WSL transport without creating a remote source file. It verified protected source/runtime maps, metadata/curriculum, room/inference/features/model modules, all four immutable checkpoint hashes, actual V41/V42 whole exit zero and their pinned completion/report proofs, and both live target trees. The inventory captured **nine natural completed room records**, retained verbatim in the request; these are partial old-source observations, not all-26 acceptance.

| Target role | PID | Start ticks |
| --- | --- | --- |
| V44 whole wrapper (never signalled) | 42607 | 1003480 |
| V44 waiting operator | 42613 | 1003481 |
| V43 whole wrapper (never signalled) | 13781 | 690018 |
| V43 read-only room operator | 13787 | 690019 |
| V43 Node rooms | 243542 | 3761891 |
| V43 CPU inference | 243554 | 3762129 |

The original V43/V44 identity, operator and wrapper pins are hard-coded from the authorized actual identities. Node argv binds exactly the old V34 checkout, 26 rooms, seed 6170000 and the unchanged e55 challenger checkpoint; inference argv requires the exact old module path and `--device cpu`. V44 requires its exact four waiting files, no directories, no started/completion output, no analysis or Torch import, and only its original operator child. Any changed PID/start ticks/command/module path, extra descendant or provenance change rejects admission.

## ROOT CLI contract

With the reviewed controller in the actual lab transfer directory, pass its full SHA above as `CONTROLLER_SHA` and the SHA of ROOT's sealed actual request as `REQUEST_SHA`:

```sh
python CONTROLLER --request REQUEST --request-sha256 REQUEST_SHA --self-sha256 CONTROLLER_SHA
python CONTROLLER --request REQUEST --request-sha256 REQUEST_SHA --self-sha256 CONTROLLER_SHA --execute-token retire-old-source-rooms:REQUEST_SHA:CONTROLLER_SHA
```

The first command is inspect-only and creates no files or signals. Execution requires the exact token binding both external pins, normal Python execution and Linux pidfd support. Output is exclusive at `/home/vinicius/aegis-bot-lab/runs/2026-10-05-bt26-ex13-old-source-rooms-retirement`; existing output prevents blind retry.

All four child pidfds open while original ancestors still live. The controller persists its requested receipt, then revalidates the exact request/self/source/checkpoints/processes **after persistence and before any signal**. It retires V44 first, then the V43 operator, Node and CPU scorer through their already-opened individual handles. Only SIGTERM is supported; wrappers, SSH/session processes and other jobs are never targets. After an ancestor stops, only previously captured descendants can reparent; exact start ticks, argv, cwd and environment remain required. ESRCH or an already-dead handle is accepted only after the approved parent stop and actual bound-handle death.

Actual whole-wrapper traps must produce non-symlink `143` exits; zero or other codes are rejected as retirement evidence. All captured operators, descendants and wrappers must be gone or zombies. Source maps and four checkpoint hashes are rechecked, initial natural room records and the log prefix must survive, and final raw file hashes/maps must remain stable after all producers stop. Partial requested/signalled/completed receipts are retained on failure, with no automatic resume, SIGKILL, success, mastery or qualification claim.

## Bounded validation and remaining work

All **13 local synthetic guard methods** pass, covering default inspection, request/self/token binding, exclusive output, exact stop order and all-FD timing, PID reuse, CPU commands/module paths, extra children, started custody, changed identities/wrappers/checkpoints/maps, symlink directories/exit receipts, mutation after requested receipt, partial-retirement receipt retention, actual-143 admission, natural result preservation and unexpected ESRCH. Ruff check/format passes. The synthetic process/filesystem fixtures create no real termination evidence; local Python is 3.12.12 and actual read-only inventory ran under the lab's Python 3.12.14.

Reproduce guards with `PYTHONDONTWRITEBYTECODE=1 /opt/homebrew/bin/python3.12 tools/bot-training/operators/test_retire_old_source_rooms.py`. Ignored evidence lives in `artifacts/bot-training/old-source-rooms-retirement/`: `actual-inventory.json`, `actual-schema.txt`, `validated-request-inventory.json`, and `mock-guards.log`.

ROOT retains actual execution and closure verification. Frozen 1cec source/archive and all original checkpoints remain immutable; final-source full 819/13,783 engine/audit, 73 Python and 18 delivery qualification, original four-checkpoint/28-query migration, actual training, new-candidate physical/material/26-room/strength and blind acceptance remain required. Final reserved 6210000–6213871 seeds, Oracle and production remain untouched.
