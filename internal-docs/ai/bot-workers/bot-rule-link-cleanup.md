# Progress and rule-based Link cleanup

The development comparison remains failed, and the trained candidate remains unaccepted.
This change corrects an engine fault reproduced against the frozen fitted reference;
it does not establish candidate strength or replace any outstanding acceptance gate.

## Actual diagnosis

The immutable source was `1cec011c0fd0c6481e7297506ed4c825a4dfcdc7`.
Development seed `6137617`, learner seat 1, reproduced the fitted reference's effect draw
without a weight or optimizer update. The diagnostic run
`/home/vinicius/aegis-bot-lab/runs/material-teacher-fitted-effect-diagnosis-20261006-r5`
closed with actual whole exit 0; completion SHA-256
`3735d3ef8f534f22dc2b64b872ba20b06fa978ef02b7220e36cca71c1c98a806`.
The raw trace SHA-256 is
`3c0931a1135b342c9aeaef8674b7daaaa76542ee2fcaf5e4a9faaf6e87848ad5`.

At turn 10, Medicmon (`BT26-028`) was the active Progress attacker with two
valid Links (`BT26-010` and `BT26-019`) and a Link limit of one. Excess Links
were the only remaining rule-check condition. The actual trash request used
`byRule: true` but moved no cards. The ordinary effect-mutation gate treated the
opponent resolution as a reason to apply Progress immunity. The rule fixpoint
therefore exhausted its pass limit and declared an effect draw.

## Correction and local evidence

Rule-based trash now reads `beTrashed` with both effect scopes explicitly false.
It bypasses Progress and effect immunity while preserving an unqualified trash
prohibition. Ordinary effect trash still uses the existing mutation gate.
Rule cleanup continues to suppress `whenLinkTrashed` effect triggers.

Before the fix, five primitive regressions failed. Both full rule-fixpoint
regressions also declared an effect draw, matching the actual diagnosis.
After the fix, 269 tests passed across six focused files with one Vitest fork
under Node 26.10.0. Tests cover both seats, the retained newly linked card,
finite convergence, effect-only restrictions, absolute restrictions, and the
ordinary opponent-effect negative control. These are local regression fixtures,
not model or game qualification evidence.

## Actual current-source runtime qualification

The correction was combined with the current CPU-serving changes in source commit
`aa2e56463176046ea5a01419d271a53a164efbae`, preserving the removal of retired
operators and documents. That source was archived once and built in the fresh desktop
checkout `/home/vinicius/aegis-bot-lab/checkouts/rule-link-current-aa2e56463`.
The external operator and launch wrapper were excluded from the source archive.

The actual run `/home/vinicius/aegis-bot-lab/runs/rule-link-current-aa2e56463-prepare`
and its full closure reader both exited 0. Evidence:

- Archive SHA-256: `41b1490c7171312e569faf005e0d1844a5f6a21d29c1cd184511770e0fd786f3` (43,539,071 bytes; 12,327 regular files and one symlink).
- Source manifest SHA-256: `8db9d03c558991b2f9fd5ffe8b3145f942204b774b388a858163523848d4cb41`.
- Reviewed delta SHA-256: `f1c6c9963bc4cffb220a9e6a72bef6367b0004f182dfe116c33cb4e00256f642`.
- Operator SHA-256: `6f45a14e9b7980974e63739d16652cfe9e074fe9816e4fbb1f712c9e55a534d0`.
- Request SHA-256: `097a350f7f49370bc4fc0aa05dfaae876ef0ddc7d6549dc5052e175ce2382c4b`.
- Whole identity SHA-256: `8a1409ddbbf4f330f91ca035c17a7646db2d24adbb3dcb5e19427609ac5c7eea` (wrapper PID 687/start ticks 342).
- Completion SHA-256: `cefcd65a1c037b8936697cdb6c21c7e71686b2b654fcdba031830cac2e7c1ebf`.
- Report SHA-256: `c0dda021ed8cc07c380e13fc85376e51e726ccbf71d6b4257e873d736c86c125`.
- Actual engine fingerprint: `4536a92429c1b62041212e983b63f46206dd4f2eefe959d42b3cc1a7f13c6a2c`.
- Runtime map SHA-256: `838414a949ba0b1dbc6dc192d23f41553f147387072852612fd1206f532175d0`.

Actual Node 26.10.0/Python 3.12.14 phases passed: frozen/offline/ignored-scripts
install, shared/API builds, API/web typechecks, image/mirror checks, 13,815 engine
and audit tests across 822 files, all 77 current Python tests, 18 delivery tests,
both named teacher suites in both seats, and real describe/curriculum commands.
Metadata and curriculum changed only their engine fingerprint; all 479 card
identities, 44 recipes, keyword/status/schema fields, and Feature 7 remained intact.
All source and compiled-runtime maps were checked before/after execution. Original
full closure consumers verified the historical source/model basis without importing
primary Torch. Four references and the rejected PPO candidate retained their original
checkpoint bytes. CPU unit fixtures are runtime tests, not primary-model evidence.

This documentation update does not change the qualified engine or Python module
bytes and does not require another build or metadata-copy generation.

## Actual checkpoint bindings

The CPU-only run `/home/vinicius/aegis-bot-lab/runs/rule-link-current-aa2e56463-bind`
and its strict closure reader both exited 0. The unchanged SHA-pinned V35 `For`
loop and V25 recursive `same` function preserved model tensors, Adam, and every
saved field except metadata and the migration receipt. Actual before/reload
choices matched on all 28 original pinned windows for each of six checkpoints.
`CheckpointScorer` loaded the qualified source's actual inference/features/model
paths and checked finite model parameters; CUDA remained uninitialized.
No optimizer update or game was performed, and no strength claim is made.

- Operator SHA-256: `4f9b11974bdd63e134a54b224d01ae72e7ae6fe866a1ae18017c108b9794158f`.
- Request SHA-256: `497b3952be5af2780d3b6553235ad7323550882a86733671b3304b480976e648`.
- Identity SHA-256: `d02ae49989d2b21a4f31839497ff15a1ec601233aea2ad639605172274c965fa` (whole PID 692/start ticks 327).
- Completion SHA-256: `2f50fa90706a8c6812839dce7d7c1bee61f28440963b5938cdb806a029bf697e`.
- Report SHA-256: `d12917bfc30235bbfc82104a2f51e375689576fe6a8e0a6efd79162749751dd9`.
- Query fixture SHA-256: `f4f3a13f7efcd80935955d5bc7ed714fa1e1991cf7cb6f63e1da85c4ddefc0c5`.

All paths below are under that new binding run; original checkpoints remain unchanged.

| Checkpoint | Actual SHA-256 |
| --- | --- |
| `primary-before.pt` | `c2bdb217911d5def38ae0fda8ed76189bfbe329a906329f2cfb0b04a4de622d4` |
| `v17-reference.pt` | `3b9d75a50354a521c784e1ddc8ae7086717d6a36c8d786704f3632ebf5bf62b9` |
| `source-challenger.pt` | `da76daf3ca1f1f781d33d4617eb83c1b8c6b3ada6c1a1953236e8c5df0d29a68` |
| `fitted-reference.pt` | `089ded9c2f478d7aed34a0da732b34e5853cbd4fde7a44400e75bd3e0bdf609d` |
| `imitation-candidate.pt` | `0e3cab723e6899b347d8615347dd79b6300f196dfd1c152eb00d67d8355c7d73` |
| `trained-candidate.pt` | `8490902dc7b6fa67c96ed141407e5684380e8ac761ff6b5191d13d77ce14bb34` |

## Actual corrected-runtime replay

The original development case, seed `6137617` with the fitted reference and its
unchanged weights, was replayed on the qualified current runtime. The new run
`/home/vinicius/aegis-bot-lab/runs/rule-link-current-aa2e56463-replay` and its
strict closure reader both exited 0. The actual game ended by security with
winner seat 1 after 37 decisions; errors, rejections, recoveries, truncation,
and additional learning updates were all absent.

The actual trace exercised the original fault: Progress attacker Medicmon
(`BT26-028`, `perm-7`) had two Links with a limit of one. Rule-based trash
requested `s0-4` and actually moved `s0-4`. No effect draw was declared. All
12 finite model tensors and checkpoint bytes stayed unchanged. This is one
development regression replay, not candidate strength or blind acceptance.

- External operator SHA-256: `f5eb1199a22c99133772d6d841ef6a67b46a2607e086cff73ac7b5ac5f7d05c1`.
- Trace module SHA-256: `a7c072de36b8b4837ae40249c2931d95614fc055a56f34dd25a588e467549dff`.
- Request SHA-256: `cc346df2685b8da9c83cee1dbebd1d0574695a63be9efb813db30e1af9c30d95`.
- Whole identity SHA-256: `88d740735631cd1afc6062a837736feab20ddcffc325cc270db722aa52758e86` (PID 685/start ticks 12499).
- Completion SHA-256: `ce6151146ae2736c0404258984fe4d284d628e1a379e80ed0a2d520ae35686cc`.
- Worker result SHA-256: `fe3304eceac15b5da2113d0a62b885a24f011d5bf6278b30f92c00594676a0a4`.
- Actual rule trace SHA-256: `c5790bf9b75f8020bf5ac96f860035fa42da6abe029e479dd0cb9106a880ff5e`.

The external replay's 22 local Python guards and 15 Node hook fixtures passed.
Those fixtures are explicitly synthetic and are separate from the actual game.
The original failed comparison, frozen diagnostic runs, checkpoints, and output
maps remain unchanged. The failed comparison is not relabeled successful.

## Actual CUDA greedy parity

The query-only run
`/home/vinicius/aegis-bot-lab/runs/rule-link-current-aa2e56463-cuda-parity-r2`
and its strict closure reader both exited 0. The six actual frozen checkpoints
produced identical choices through the qualified source's original `infer`
function and `greedy_action` on CUDA: 336 comparisons and 672 model forwards.
Each policy used the 28 original captured seat-1 windows and 28 explicitly
synthetic seat-mirrored inputs. The synthetic inputs do not establish actual
seat-0 games or mechanism mastery. Empty candidate lists, wrong observation
schema, and nonfinite input fixtures were rejected by both routines.

All 12 finite tensors per policy and all checkpoint bytes were preserved.
Actual imported training/features/model/bridge paths were the qualified source.
No game, optimizer update, final seed, or strength acceptance occurred.

- Operator SHA-256: `770bbce9b6b6757d70971dedc0b39d68cc9e44e53f2ecb3d2fedb783273db411`.
- Request SHA-256: `dfbd5584a79583ec52b9a262d1a84609fcc4827bb721ba9fde45f187445470ec`.
- Identity SHA-256: `ab224b37f9cb3c76e2b7f7865cc4eb38c499a927cb31eb4e0d74891e8e5e9886` (PID 680/start ticks 16212).
- Completion SHA-256: `19be4270d73739e503b9de5e7dd0c93d84ca5f7531c1bc5f6779baa5c2c5a666`.

The first query run exited 1 because the external checker read the wrong
`Transition` attribute (`log_prob` rather than `log_probability`). That failed
run and its absent completion remain intact. The corrected external checker
passed nine synthetic guards, including a full fake-model worker using the
actual source's `Transition` field contract; that test also reproduced the
original checker failure. No engine archive or checkpoint changed for this fix.

## Existing CPU/CUDA captured-query agreement

A read-only comparison of the actual closed checkpoint-binding report and the
actual closed CUDA-parity report found identical choices for all 28 original
captured windows on each of the six policies: 168 matching choices, no differences.
Both reports bind the same checkpoint paths/hashes and the qualified current
runtime. Their SHA-256 pins are respectively
`d12917bfc30235bbfc82104a2f51e375689576fe6a8e0a6efd79162749751dd9` and
`6ba18c7ceac429f7ce4413689d01d01363ccc3431a84ce018debd178b7d928e8`.
This assessment reuses completed actual evidence without loading models,
starting jobs, or generating checkpoints. It does not replace the selected
candidate's package/transport, actual seat-0 room, or full serving gates.

## Current-source six-policy development comparison

The reviewed external operator
`/home/vinicius/aegis-bot-lab/transfers/rule-link-current-strength.py` runs the
imitation candidate, PPO candidate, and four preserved references sequentially.
Each receives the same 3,872-game development schedule over all 44 recipes,
44 opponents and both seats, with four workers, evaluation-only mode, and the
actually qualified streaming greedy routine. The original full record checker
uses the established all-44 substitutions; every game must additionally have
an actual natural winner. Per-recipe ties and losses against any reference do
not count as strict gains. Five synthetic admission/matrix fixtures passed;
readonly actual desktop inspection validated the commands and supported helper
seam before separate ROOT resource approval and execution.

The actual launch is
`/home/vinicius/aegis-bot-lab/runs/rule-link-current-aa2e56463-strength`, whole
PID 686/start ticks 4143. The first actual model process is the imitation
candidate, PID 714/start ticks 6606. Both exact processes were observed live;
the first completed batch contained 88 natural games with 45 wins, 43 losses,
and zero failed/unusable/payment-forfeit/recovered-play records. This is partial
live evidence. No complete comparison, current-primary improvement, mechanism
mastery, or final acceptance is claimed from this launch or partial batch.

- Operator SHA-256: `ff271f73dc75e4625af0e53843f75e7b094516db3a7841e70b89542b165bff2a`.
- Request SHA-256: `3d92c247ce1a02b219cb968232ccff3ca99469963572fb61fde94a233ed89d4f`.
- Wrapper SHA-256: `b6309dcaf71956daf9d359922abde3a814e961d68737aa6308b48fd1ceb9db9b`.
- Whole identity SHA-256: `291424ee6f415f88e9e16e9468460728183d2146480a0d8fe3677fb153f865db`.
- ROOT resource Go SHA-256: `85b50e4b12a3078ef8be0dea5e6b0b1ffae6b55ae57990c9da38e80fb778d9ea`.

The model tensors and optimizer are frozen during this comparison. All six
checkpoint/source/runtime pins are guarded before/after each policy. The
reserved final seed block remains unused. Full original failed comparisons and
diagnostics remain immutable; current results use fresh output directories.

## First actual completed current evaluation

The imitation-candidate evaluation has now completed all 3,872 development
games with 2,025 wins, 1,847 losses, zero failed/unusable/payment-forfeit games
and six recovered deferred plays. Its actual child exit is zero, with receipt
SHA-256 `27c0a7c75e0b7cc115ce8c4e94475198d6243f6b8b89242b0921a3053a2a5917`.
The unchanged full record guard verifies all 44 recipes, the complete original
paired schedule and every natural terminal. Streaming verification records
zero maximum parameter change and the exact original qualified checkpoint
`0e3cab723e6899b347d8615347dd79b6300f196dfd1c152eb00d67d8355c7d73`.
Streaming evaluation does not save/reload a new checkpoint; its
`checkpointReloadExact: false` is retained as reported.

The next actual PPO candidate process was PID 28640/start ticks 282585. It
has now also completed all 3,872 games with actual child exit zero, 2,408 wins,
1,464 losses, zero failed/unusable/payment-forfeit games and five recovered
deferred plays. The unchanged full record guard passes, and streaming
verification records zero parameter change with checkpoint
`8490902dc7b6fa67c96ed141407e5684380e8ac761ff6b5191d13d77ce14bb34`
preserved. The actual receipt/result/verification SHA-256 values are
`03a6f9af885a378e186cc8d64dbcd40c872b8dd2814a61eacaa8e97632b15238`,
`1cbfa643732d87a9d28d793221ae56f8ccfc4d3d2e1c230c53ee8b5899a084a9`
and `8b8bdffbffab2c4d159f4c6c9edc4458cd1efa4e31e16a05792b725bdd54e4b7`.
The local full single-policy observation SHA-256 is
`dfac9d6f615ec021d6d93cc5087c3093b41074bec1f92c944d62afa7c120c4a9`.

The first actual reference, primary-before, is now live at PID 56750/start
ticks 563048, with exact argv verified. The whole six-policy comparison remains
incomplete. A readonly comparison of the two completed candidate reports
finds PPO gains over imitation in 40 recipes, regressions in three and a tie
in one. The regressions are CS HiAndromon (48 versus 51 wins), the DGO Chronomon
recipe (70 versus 72) and Dynasmon (67 versus 69); Rosemon ties at 31 wins.
This is a candidate-to-candidate description, not the pending four-reference
strength gate. Its report SHA-256 is
`776f9648001c7e699c1ca0961b0c9e8aff898cd71e82bd49d9d48eb1d98595ec`.
Proposal counts do not establish reconstructed physical mechanics or mastery,
and neither completed evaluation or their aggregate totals establishes final
acceptance.

## Current physical-capture preparation

External draft `/tmp/aegis-material-teacher-active-goal-20261006/rule-link-current-physical.py`
has SHA-256 `f96632d405d5bd1be1c07c7eab4f4a9efb62a2a7174b422740e064006db75645`.
It consumes the unchanged current full comparison reader, requires an actual
whole-zero completion pin and strict gains in every recipe against every
reference, binds the selected current checkpoint directly, and reuses the
original schedule/capture/raw reconstruction/full-Fusion/material-custody
validators. It requires a distinct sealed ROOT source/resource agreement,
idle compute, fresh seed inventories and an attached actual whole before
model imports. Pre/post guards preserve source, compiled runtime, checkpoint
and proof bytes; the producer freezes and checks all twelve finite tensors.

Seventeen explicitly synthetic guards pass: eleven admission/whole/parent/
pristine-row checks and six complete CPU worker-flow rehearsals using fake
modules/models/capture. They reject wrong module paths before model loading,
nonfinite initial tensors and wrong checkpoint bindings before capture, and
changed tensors/checkpoint bytes after capture while retaining partial raw
fixtures and emitting no success proof. Those fixtures are not actual CUDA
models, games, physical custody or a future successful closure. The additional
worker-fixture report SHA-256 is
`65636840a1d48b587c362d049746aa949c1c5b534e5ab570e3740b48d18af230`.
An actual readonly desktop inspection confirms all original helper pins,
imports their static consumers without Torch, and constructs the unchanged
440-cell schedule with all 44 recipes and 220 cells per seat. This is source
preparation: the new operator is now exclusively uploaded to
`/home/vinicius/aegis-bot-lab/transfers/rule-link-current-physical.py`, with exact
SHA-256 and 25,167 bytes independently rechecked and mode 0444. Its actual
Python 3.12.14 syntax/stdlib import succeeds and its request guard rejects
unknown selected-candidate/comparison pins before model imports. Upload
receipt SHA-256 is
`53931dd4d073ad9331036196ae717fa34ac4c6745a4038924b0a6e83752f8ac1`.
The complete new qualification operator has not been admitted with an actual
closed comparison or executed; no physical matches, runtime jobs or primary
models were started by this preparation.
The source-review report SHA-256 is
`ee8dba2aaeb2b59bc432f3587a8fe3b531c3c9d8dab79537e410cefcff5de798`.
The actual selected checkpoint, comparison completion, fresh request/inventory
and separate ROOT resource agreement remain pending. The draft explicitly
preserves missing witnesses and the distinction between card visibility,
selected-material custody and independent printed-recipe/payment mastery.
It changes neither the qualified source archive nor any checkpoint metadata.

## Remaining work

Close the current six-policy comparison, diagnose imitation/PPO per-deck
performance and produce an accepted candidate. Obtain strict gains for all 44
recipes against all four references, and complete both-seat mechanisms,
physical custody, 26 managed rooms, current-serving compatibility, and the
reserved final blind evaluation. Final seeds `6210000..6213871` remain untouched.
