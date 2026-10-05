# Final learning handoff

Child worktree `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/bot-final-learning`, branch `bot-final-learning`, base `7c8d7c7e0a38226bdd8d607e1531bb937db4d199`; implementation commit `8d5f8cd8b09e2b8bb06fcf188fb472b8a676fb5a`. Coordinator owns integration, runtime preparation, resources and model acceptance. No desktop job, sealed checkout, card engine, serving configuration or canonical plan changed.

Scope remains all 104 BT26 + 77 EX13 identities, vocabulary 479, 26 catalog + 18 support recipes, both learner seats and one feature-V7 policy.

## Implementation and validation

`learning_mechanisms.py` reports original-fold supervised coverage from physical decision intent/request contracts. `imitate.py --mechanism-share 0.20 --checkpoint SOURCE --policy-anchor 0.25` balances eight declaration/material families by seat, retains every original training sample, preserves original episode validation folds and rejects any missing family/seat in either fold before loading a model. Mechanism targets are unanchored; other targets retain KL. Defaults and model/feature shapes stay unchanged. Coverage is supervision availability, not accepted engine usage.

`train.py --evaluate --stream-evaluation` releases unused PPO feature buffers after exact greedy choices, preserving records, rewards, coverage and failure handling. Nonfinite logits fail; streaming training is prohibited. Existing evaluation defaults remain unchanged.

Full Python 3.12 suite: **73 passed**, including real imitation/Adam updates, unchanged source/schema/shape, missing-fold rejection and NaN/+Inf/-Inf failure propagation. Supported Node 26 workspace typecheck, Python compile and `git diff --check` passed. Dependencies installed locally with `--offline --frozen-lockfile --ignore-scripts`; no mutable graph or raw/checkpoint files copied. The pre-push hook must pass normally.

Closed V23 supervision has DNA training labels 3/2 by seat, no seat-1 validation DNA, no validation Main DigiXros and no effect-DigiXros material labels in either fold. The strict mode correctly rejects it. On its **17,203** historical windows, both-seat CPU greedy choices match exactly with closed V24 weights. Final guarded scorer time was 13.356s versus 14.270s (**6.4% less in one run**); this establishes neither CUDA/current-engine parity nor whole-game speed. Cumulative encoded allocation was 2.097GB; bounded baseline retention reached 17.68MB per 64-window block and streaming retained no features after choices. Desktop Node simulation remains the observed bottleneck; keep four workers pending a separately scheduled sizing benchmark.

Ignored artifacts live under this worktree's `artifacts/bot-training/final-learning/`. `detailed-handoff.md` contains exact observations, commands and additional hashes. Principal proof hashes:

- `v23-label-coverage.json`: `0c0689afab072b10c4973218b22106912ead2c32fb2470618e71392b136cfd87`.
- `all-window-parity-final.json`: `dd40107cfeb2ec2dca3f62de5ed0f41218d416ee706d7a0ce91a31deb4e4ed08`.
- `python-tests-final.log`: `702e14a13e2ab8b7c21d91e2b4fa26e5c2c377e18c13223b02bdc9e38e9c795f`.
- `workspace-typecheck.log`: `af9ceefee157b0986a7bc3bb5c91fa1339e83f38d62fc000a53a9dbdcea7b688`.

## Conditional executable pass and open gates

Ignored `prepare-next-pass.py` (SHA `d9ed24bc86d198b7ad3d8d61769de5c6bd90b71c913230a7e951378c26f84ccc`) generates commands only. Invoke with a coordinator-produced `--admission`, its exact `--admission-sha256`, and new `--output`. Admission requires unchanged original strict consumers, actual pinned V41/V42/V44 closure/whole exit 0, follow-on runtime/migration closure, root resource agreement, current 479/26/44 metadata and source/checkpoint pins, three inventory-backed fresh nonoverlapping development blocks excluding 6210000–6213871. It supplements existing consumers and launches nothing. One explicitly mocked positive and twelve negative fixtures pass; they establish no real custody.

The prepared sequential schedule is: fresh 3,872-game greedy-primary teacher-label collection across all 44/both seats; strict producer/source/fold and mechanism-coverage checks; three imitation epochs at LR 1e-5/KL 0.25/share 0.20 with epoch zero eligible; 3,872 PPO games at LR 3e-5/batch 88/four workers with 60% heuristic plus three frozen migrated references; sequential matched fresh development comparisons of candidate, primary and all references. Zero allowed failures and cap 4,000 remain. Missing labels require additional fresh data with preserved folds. Training forfeits remain separate and must reject acceptance. Streaming requires actual CUDA parity before adoption.

V48 is immutable and pins old Python; coordinator must bind adopted Python changes to a follow-on runtime rather than mutate/relabel V48. Closed V38 strict all-list flags are false. Closed V39 fitted lacks seat-1 full DNA, V17 lacks seat 0, and both listed physical flags are false. This lane observed V41 references closed but fitted live and primary absent; V42/V44 were queued/unstarted. No partial primary result informed learning.

Actual primary comparison/material closure, gains on every retained list, both-seat primary Link/DNA/full Charismon+Mienumon Fusion/Main+effect Assembly+DigiXros, rooms, latest-source migration/tensor/Adam/reload qualification and untouched final blind acceptance remain outstanding. Neither visible 181 IDs, aggregate wins nor this corpus parity replaces those gates. No Oracle, deploy, promotion, old PR reopening, job changes or final seeds consumed.
