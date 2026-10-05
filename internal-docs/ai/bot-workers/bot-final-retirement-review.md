# Obsolete waiting queue retirement: independent review

Bounded source and synthetic guard review passes with no unresolved critical,
important, or minor finding in the specified waiting-job contract. This document
does not certify actual cancellation, a supported runtime build, checkpoint
migration, CUDA parity, bot strength, rooms, or final acceptance.

## Reviewed bytes

- Final ROOT controller `/tmp/aegis-stop-obsolete-waiting-queues.py`:
  `fca41e0564e0639f7c4673496a70ec7f694e61ec8beb95a7bb23a379691cec01`.
- Immutable request `/tmp/aegis-obsolete-waiting-queues-request.json`:
  `0bc54e4b8265f3b2b510b4870cc8f8fb96971837fc7f3326d7c0d3665309d96a`.
- Rejected original controller:
  `f2824946ce6756388b9ca07d53a207333578615c1dcd307836a176f2a52e0e85`.
- Intermediate repair:
  `4fe60794854b38d181b59754ed2f5edf35077b6639bee1c632123f35e73f17ce`.

The pinned request contains these whole/operator PID and start-tick bindings:

| Queue | Whole PID / ticks | Operator PID / ticks |
| ----- | ----------------- | -------------------- |
| V46   | 120813 / 2098256  | 120819 / 2098257     |
| V47   | 134923 / 2291537  | 134929 / 2291539     |
| V48   | 178444 / 2771412  | 178450 / 2771414     |
| V49   | 193939 / 2949066  | 193945 / 2949068     |
| V50   | 221023 / 3250500  | 221029 / 3250502     |

Static request review confirmed both recorded processes asleep, exact operator
parentage, no producer subdirectories or start/completion artifacts, and no
whole exit. This is review of recorded bytes, not independent live process proof.
All five original local wrapper byte hashes match the request; their unchanged
`set -e` and EXIT traps preserve child termination status and abort before reading
successful completion. ROOT reported actual inspect-only validation with zero
signals before this review; ROOT must re-inspect the repaired executable against
actual processes before execution.

## Findings repaired by ROOT

1. **Important — receipt-write validation gap.** Creating V44 completion,
   `started.json`, a game descendant, or changing the controller/request while
   persisting the per-job request could still permit a synthetic signal. ROOT
   repeated full queue validation and both byte pins after receipt persistence,
   immediately before `pidfd_send_signal`.
2. **Important — dangling symlink absence checks.** Missing-target symlinks at
   checkout/completion/exit paths were accepted as absent. ROOT now uses
   `exists() or is_symlink()` for these forbidden paths.
3. **Important — directory and exit provenance.** Missing V44 producer directory,
   redirected V44 producer/launch or obsolete launch directories, and a foreign
   exit symlink containing `143` could be accepted. ROOT now requires existing
   nonsymlink directories and a regular nonsymlink post-exit receipt.

All reproductions used temporary virtual process files and synthetic signal
stand-ins. No actual pidfd or signal call, remote access, model import, or job
mutation occurred. Original helpers, sealed queues, checkpoint sources, current
V42–V44 jobs, and final seeds were untouched by this reviewer.

## Verification and scope

Python 3.12.12, standard library only:

```sh
/opt/homebrew/bin/python3.12 \
  artifacts/bot-training/bot-final-retirement-review/review_guards.py \
  artifacts/bot-training/bot-final-retirement-review/controller.final.py
```

Result: **43 tests passed**, exit 0, 0.717 seconds. Original expanded tests
reproduced nine failures; the intermediate repair passed those but reproduced
five additional provenance failures. Final exact bytes passed the same complete
43-test inventory.

Tests execute the actual controller parsing, hashing, process identity,
descendant enumeration, custody, validation, exclusive receipts, and orchestration
logic against toy hashes and a virtual `/proc`. Only process-handle/signal/time
boundaries are synthetic. They cover default inspect without writes/handles,
explicit execute requirement, optimized interpreter and pin rejection, PID reuse,
argv/state/parent changes, extra child/grandchild, producer changes, symlinks,
started checkout, ceased V44, revalidation after opening the handle and receipt
writing, reverse V50→V46 child-only order, exit `143` versus `0`, post-signal
producer/child checks, retained partial receipts, and no overwrite/blind retry.
Synthetic exit and handle fixtures are not actual Linux cancellation proof.

Evidence remains ignored under
`artifacts/bot-training/bot-final-retirement-review/`: source snapshots, pinned
request, `review_guards.py`, initial/intermediate/final logs, and
`static-inventory.json`. No broad engine, model, GPU, or game suite was run.
Normal supported Node 26 pre-push workspace TypeScript checks and
`git diff --check` accompany this documentation-only child commit.

ROOT owns fresh actual inspection, staging under a new immutable filename,
explicit execution, collecting each original whole exit `143` and preserved
producer map, and the separate retirement closure. Partial receipts must remain
visible after failure; retirement is never successful qualification. The fresh
current-source supported build and original four-checkpoint metadata-only
migration remain separate pending work.
