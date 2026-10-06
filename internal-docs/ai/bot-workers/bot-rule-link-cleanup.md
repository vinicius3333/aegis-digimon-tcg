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

The first actual reference, primary-before, subsequently completed with exit
zero; its original PID 56750/start ticks 563048 is gone. The full-record closure
and per-recipe result are recorded below. The whole six-policy comparison
remains incomplete. A readonly comparison of the two completed candidate reports
finds PPO gains over imitation in 40 recipes, regressions in three and a tie
in one. The regressions are CS HiAndromon (48 versus 51 wins), the DGO Chronomon
recipe (70 versus 72) and Dynasmon (67 versus 69); Rosemon ties at 31 wins.
This is a candidate-to-candidate description, not the pending four-reference
strength gate. Its report SHA-256 is
`776f9648001c7e699c1ca0961b0c9e8aff898cd71e82bd49d9d48eb1d98595ec`.
Proposal counts do not establish reconstructed physical mechanics or mastery,
and neither completed evaluation or their aggregate totals establishes final
acceptance.

## First actual completed reference and failed candidate strength gate

The current-engine primary-before evaluation actually completed all 3,872
natural decisive games with 2,343 wins, 1,529 losses, zero failures/payment
forfeits and two recovered play rejections. Independent readonly invocation
of the unchanged original full-record guard verified all 44 recipes with
88 games each, exact commands/log receipt and zero weight changes. The actual
phase is dead; no whole-comparison completion is claimed. Its local complete
field report is `/tmp/aegis-material-teacher-active-goal-20261006/rule-link-current-primary-evaluation-completed.actual.json`,
SHA-256 `a0d87e306b6b4ab942cb22d500e6b31a46dc6672827b5757513945931ca4b40e`.

Against this first completed reference, PPO gains in 28 recipes, regresses in
13 and ties in three. Imitation gains in ten, regresses in 31 and ties in
three. Neither current candidate meets the required strict gains in all 44
recipes against all four references. The higher aggregate PPO wins do not
supersede that requirement. The descriptive comparison is
`/tmp/aegis-material-teacher-active-goal-20261006/rule-link-current-first-reference-description.actual.json`,
SHA-256 `143ad49ba67453817eba5c03623e0c205be851aacf8a252a4fe9fde55e8b70e2`.
The remaining original comparison is preserved to diagnose the next learning
change; no new model/game/GPU job or physical qualification was admitted.

PPO non-improvements against primary-before (88 games per policy):

| Recipe | PPO wins | Reference wins | Delta |
| --- | ---: | ---: | ---: |
| `bt26-dantemon-bandai@1` | 62 | 65 | -3 |
| `bt26-dgo-2026-08-28-1-toho-braves@1` | 74 | 80 | -6 |
| `bt26-dgo-2026-08-28-13-jupitermon@1` | 62 | 73 | -11 |
| `bt26-dgo-2026-08-28-4-beelstarmon@1` | 58 | 63 | -5 |
| `bt26-dgo-2026-08-28-8-plutomon@1` | 77 | 80 | -3 |
| `curriculum-appmon-charismon@1` | 53 | 64 | -11 |
| `curriculum-data-squad-ravemon@1` | 39 | 39 | +0 |
| `curriculum-data-squad-rosemon@1` | 31 | 40 | -9 |
| `curriculum-iliad-purple@1` | 41 | 45 | -4 |
| `curriculum-iliad-yellow@1` | 25 | 29 | -4 |
| `curriculum-nso-ghostmon@1` | 24 | 31 | -7 |
| `curriculum-nsp-insects@1` | 40 | 40 | +0 |
| `ex13-alphamon-royal-knights@1` | 61 | 65 | -4 |
| `ex13-examon-royal-knights@1` | 74 | 76 | -2 |
| `ex13-lordknightmon-royal-knights@1` | 49 | 50 | -1 |
| `ex13-omnimon-royal-knights@1` | 53 | 53 | +0 |

V17 started as the original next policy at PID 85160/start ticks 846164;
its actual `/proc` argv and start ticks matched the sealed command. This is
an observation of a live reference, not a successful full closure.

The readonly provenance assembly helper also passed five local field/hostile
mutation tests. It keeps original learning at source `1cec011c0fd0c6481e7297506ed4c825a4dfcdc7`
and explicitly records the byte-exact model/Adam binding onto the qualified
current source with zero additional updates. Its source review is
`/tmp/aegis-material-teacher-active-goal-20261006/rule-link-current-provenance-source-review.json`,
SHA-256 `a8f14c86f513d647b8c854ac99d4dd2a699d6eb0f21cff0c3361506cb706b23e`.
These are field assembly checks, not fresh full closure consumption, primary
model proof or a written package. Full resident consumers and actual remaining
qualification gates are still required before packing; declarations stay pending.

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

## Completed six-policy comparison and required further learning

The original attached foreground session 22215 actually ended with exit zero.
The unchanged resident full closure consumer independently passed actual whole
zero, source/runtime/checkpoint guards, all six complete natural paired all44
schedules and the sealed final output map. There were 23,232 development games
and zero learning updates; final blind seeds remain unused. The actual completion
SHA-256 is `b32675433481b354e965de11ed0e118f7c66aa7dc5c76326625f0ace22eff339`.
The local full consumer output is
`/private/tmp/aegis-material-teacher-active-goal-20261006/rule-link-current-strength-closed.actual.json`,
SHA-256 `a78e1bccdcbe841f463ae971d5be00891b222d115b7ace1eb00c5ab6528c7d07`.

All policies completed 3,872 games, without failed games or payment forfeits:

| Policy | Wins | Losses | Recovered play rejections |
| --- | ---: | ---: | ---: |
| `fitted-reference` | 2346 | 1526 | 13 |
| `imitation-candidate` | 2025 | 1847 | 6 |
| `primary-before` | 2343 | 1529 | 2 |
| `source-challenger` | 2360 | 1512 | 9 |
| `trained-candidate` | 2408 | 1464 | 5 |
| `v17-reference` | 2177 | 1695 | 7 |

The formerly broken fitted-reference game at development seed 6137617 also
terminated naturally by security, winner seat one, after 37 decisions, with
no errors, rejections, asynchronous rejections or truncation. The failed old
comparison remains preserved; the repaired current-engine game is a new actual
result, not a recount or removal of the old effect draw.

Neither candidate passes strict gains for every recipe against every reference.
Imitation has 37 non-improving recipes and a worst delta of minus 33 wins; PPO
has 24 non-improving recipes and a worst delta of minus 11 wins. No reference
reaches the 88-win ceiling, so the required strict gain remains possible in this
schedule for every recipe. Aggregate wins do not supersede the per-recipe gate.
The complete assessment is
`/private/tmp/aegis-material-teacher-active-goal-20261006/rule-link-current-all44-strength-assessment.actual.json`,
SHA-256 `f759d7f3b9420891b59da0cb8a271bcfab151593737061a8b1a85c552f5e9bc0`.

PPO failures against the strongest actual reference for each recipe:

| Recipe | PPO wins | Maximum reference wins | Further wins needed for strict gain |
| --- | ---: | ---: | ---: |
| `bt26-dgo-2026-08-28-13-jupitermon@1` | 62 | 73 | 12 |
| `curriculum-appmon-charismon@1` | 53 | 64 | 12 |
| `curriculum-data-squad-rosemon@1` | 31 | 41 | 11 |
| `curriculum-iliad-purple@1` | 41 | 51 | 11 |
| `ex13-examon-royal-knights@1` | 74 | 84 | 11 |
| `curriculum-nso-ghostmon@1` | 24 | 33 | 10 |
| `bt26-dantemon-bandai@1` | 62 | 68 | 7 |
| `bt26-dgo-2026-08-28-1-toho-braves@1` | 74 | 80 | 7 |
| `bt26-dgo-2026-08-28-4-beelstarmon@1` | 58 | 64 | 7 |
| `ex13-adventure-bandai@1` | 68 | 74 | 7 |
| `ex13-omnimon-royal-knights@1` | 53 | 59 | 7 |
| `curriculum-iliad-yellow@1` | 25 | 29 | 5 |
| `ex13-alphamon-royal-knights@1` | 61 | 65 | 5 |
| `bt26-dgo-2026-08-28-8-plutomon@1` | 77 | 80 | 4 |
| `curriculum-data-squad-ravemon@1` | 39 | 41 | 3 |
| `ex13-kentaurosmon-royal-knights@1` | 39 | 41 | 3 |
| `bt26-dgo-2026-08-28-7-chronomon@1` | 70 | 71 | 2 |
| `bt26-plutomon-bandai@1` | 85 | 86 | 2 |
| `curriculum-dm-ver3@1` | 38 | 39 | 2 |
| `ex13-gallantmon-royal-knights@1` | 70 | 71 | 2 |
| `ex13-lordknightmon-royal-knights@1` | 49 | 50 | 2 |
| `curriculum-ds-blue@1` | 43 | 43 | 1 |
| `curriculum-nsp-insects@1` | 40 | 40 | 1 |
| `ex13-mamemon-bandai@1` | 65 | 65 | 1 |

Source inspection of the unchanged qualified `train.py` (SHA-256
`40213cae178ee56b082e2b322cd4dea67a8296cee9463c000f5d896f125527a7`)
confirms that continuation restores both model and Adam state, then optionally
overrides the learning rate. Repeatable `--learner-deck` filters retain the full
schedule's ordering, all44 opponent scope and both seats; unknown versions are
rejected. These existing controls can support corrective training without a
source rebuild or metadata-copy generation. No corrective training was launched
by this inspection; its exact parameters, fresh seed inventory, request and
separate ROOT source/resource agreement remain to be sealed and verified.

## Actual current-source corrective PPO continuation

The qualified source and engine stay `aa2e56463176046ea5a01419d271a53a164efbae`
and `4536a92429c1b62041212e983b63f46206dd4f2eefe959d42b3cc1a7f13c6a2c`.
No source rebuild, source archive or metadata-copy checkpoint generation was
introduced. The existing actual trained candidate is continued with its real
model and Adam state into a fresh output namespace.

The external operator is
`/home/vinicius/aegis-bot-lab/transfers/rule-link-current-corrective-ppo.py`,
SHA-256 `0ea7565cbe7ee7514780033d3a5f2b470957f37a3602126f61e94f23c301b39c`.
Its exact request SHA-256 is
`1b974dc6e7f87ad47f3f251875109d21e87c3fa21309b49aba7960c9f191a2db`,
wrapper SHA-256
`7cf434bf1a60b2da94cebf39f77806b543b6656ecebef2bc691d73e048ba6b8e`,
and actual original complete seed inventory SHA-256
`0e619d6f0d472154932590610f4e3d6d7bf3971788ca7bc8132daaa6fcc59148`.
The full unchanged comparison consumer and actual read-only inspection both
passed before resource admission, without importing primary models or starting
training in that inspection. Fifteen bounded synthetic guards cover complete
all44 diagnosis, the exact filtered both-seat schedule, unsafe/duplicate inputs,
negative payment refusal, complete raw records, finite model/Adam state,
positive unchanged-origin optimizer continuation and rejection of copied weights.
Synthetic fixtures are not actual model, learning or game evidence. The ROOT
source review SHA-256 is
`33764313e0a33ba26359755c79889b7b7d9e83784ba663331bb7bc946ae8fc92`.

The distinct actual ROOT learning resource agreement SHA-256 is
`79cfaa21e968a45dbf08e6b28a3e0e94d3b77f2a751d7202320c86052004d2c2`.
The original foreground session is **10576**, and must remain attached.
The actual whole is PID **696**, start ticks **14967**, identity SHA-256
`20a296a83bbbe00789911641f987d36be99abd594a8857db67fb929ebdf3879a`.
The verified parent chain is whole 696 → operator 715 → actual CUDA learner
778, learner start ticks **21144**. Fresh actual GPU inventory binds the active
compute process to learner 778. Its recorded configuration is training, rather
than evaluation, with current feature V7 and preserved source checkpoint
`8490902dc7b6fa67c96ed141407e5684380e8ac761ff6b5191d13d77ce14bb34`.

This run uses 2,112 new development seeds **6141352..6143463**, the 24 actual
non-improving learner recipes, every one of the 44 opponent recipes and both
learner seats. Each 48-game batch covers all selected learner recipes at both
seats; the full filtered pass covers every opponent exactly once per seat and
selected learner. Four workers, zero tolerated failed episodes, no snapshots,
unchanged 4,000-decision cap and explicit `3e-5` learning rate are admitted.
The recorded restored optimizer rate is also `3e-5`: it is retained, not reduced
from this checkpoint. This remains an experimental corrective learning pass;
improvement must be measured, not presumed.

Its output is
`/home/vinicius/aegis-bot-lab/runs/rule-link-current-aa2e56463-corrective-ppo-r1`.
All originals and previous failures remain immutable. Actual whole zero,
complete raw trajectory checks, all12 finite changed weights, actual positive
Adam deltas, exact reload and fresh new checkpoint hash are still pending.
Only those actual closure proofs can admit the next frozen **full all44**
comparison against each of the same four references. A training pass, its
aggregate reward, targeted schedule, penalties or changed weights cannot
accept strength, payment mastery, physical mechanisms, rooms, serving or blind
qualification. Reserved final seeds remain untouched.

## Prepared full-all44 corrective candidate evaluation

A separate frozen evaluation operator is prepared outside the qualified archive:
`/home/vinicius/aegis-bot-lab/transfers/rule-link-current-corrective-strength.py`,
SHA-256 `a7acf69c568ee73f6e733223fdbac03924f91168b518ddaa4097b00358eaa47e`.
It consumes the unchanged actual corrective learning `--closed` reader before
any new primary import or game. Actual learning completion and new checkpoint
hashes are obtained only from that full original whole-zero consumer. The
pending request deliberately contains null values for both hashes and is
rejected before model imports. Actual runtime/source/old checkpoint identities
remain the existing qualified byte maps; no archive build or checkpoint metadata
migration is added.

The original all44 command and complete raw-record consumer are reused for
one newly learned frozen candidate, with all **3,872** development games,
44 recipes, all44 opponents and both seats. Evaluation seed 6135000 and the
entire original schedule remain identical to the actual completed six-policy
comparison. The four original reference results are reused only through that
unchanged actual full closure chain, preserving every per-recipe count and
reference checkpoint byte. No unchanged reference games are duplicated.
Strict gains are still required for every one of the 44 recipes against each
of the four references; neither targeted training nor aggregate wins narrow
that requirement. Frozen evaluation authorizes zero learning updates and has
its own separate actual ROOT resource agreement.

Seven synthetic operator guards and four synthetic assessment guards pass.
The real desktop Python 3.12.14 stdlib import and Bash syntax check pass; the
pending request is actually rejected before Torch imports, with no evaluation
job or output directory created. These checks are source/admission preparation,
not actual new model, game or future closure proof. The wrapper SHA-256 is
`3dd8a36d3591afa09ed5fb58b4532136c3500d3f1a56649672e0953059f8e01a`,
and ROOT source review SHA-256 is
`e3d6ef280ca319af998c649e7e51b42ca39226d6d213aed2af311feac6173c5b`.
The pure local `assess_corrective_all44.py` helper (SHA-256
`34949e8d479b3859cc93053822c82723c4e9f0feb5f76b79d0d355fb56814abc`)
also preserves explicit physical, rooms, serving, blind and delivery non-acceptance.

Final sealed request, actual new learning completion/CP pins, real admitted
read-only inspect, ROOT resource Go, actual evaluation identity and launch
remain pending. The actual corrective learner remains the original session
10576, whole 696/start14967, operator 715 and CUDA learner 778/start21144;
its partial results are preserved as training in progress.

## Completed actual corrective learning and admitted frozen evaluation

The original corrective learning foreground session 10576 actually ended with
exit zero. The unchanged full resident `rule-link-current-corrective-ppo.py
--closed` consumer also passed with actual whole zero, exact source/runtime and
all protected checkpoint byte guards, all 2,112 raw paired trajectories and
actual final output map. Completion SHA-256 is
`1792aadfadff90a164f95d1de22d06c065f13bdb13da8087e4b4f70e36c21018`.
The saved local full consumer output is
`/private/tmp/aegis-material-teacher-active-goal-20261006/rule-link-current-corrective-ppo-closed.actual.json`,
SHA-256 `bab62874e2a6551219496a971b13e2904b77c0117eb5df0fdc8fea266ce21b8d`.

The complete actual training summary has 1,267 wins and 845 losses, zero failed
or unusable games and zero payment forfeits. It took 1,679.919 elapsed seconds.
Every one of the 12 model tensors is finite and changed, and every Adam state
has the same actual positive delta of **3,596** updates. Model reload is exact,
and the current-source metadata, feature V7 and warm-start provenance remain
verified. This is genuine further learning, not a metadata-copy generation.
These training rewards are not per-recipe strength acceptance.

The actual new checkpoint is
`/home/vinicius/aegis-bot-lab/runs/rule-link-current-aa2e56463-corrective-ppo-r1/ppo/checkpoint.pt`,
SHA-256 `e4effc446ef39f04c2853fb69b81e798ed06059e3b847b7cfbf9f5daa5f4b232`.
Original checkpoint `8490902dc7b6fa67c96ed141407e5684380e8ac761ff6b5191d13d77ce14bb34`
and all other preserved policies remain unchanged. No source archive, rebuild,
engine fingerprint or additional checkpoint binding/migration was needed.

The final frozen evaluator request is now sealed from that actual full consumer,
SHA-256 `afd91d2baba7d47442bc7e1037e83d8eb27057a57ded24bd25965f5cf097a355`.
Actual admitted read-only inspection passed with no primary model import or
new game, and the exact command has 3,872 games, seed 6135000, all44 curriculum,
both seats, streaming greedy evaluation, four workers and zero updates.
The full actual inspection log SHA-256 is
`d9219cfe340eefa821af03fa0916cd3f4177ad07ea7a8992b0102a1f93968661`.
A fresh real idle inventory passed before the separate ROOT resource Go,
SHA-256 `a464f4b311a2472c9b6d62ea5521ea0853c9306da690179048b83ce1e1a27e7b`.

The new original evaluation foreground session is **97906**, and must remain
attached. The actual whole is PID **691**, start ticks **218935**, identity SHA-256
`a1e590f9e4805f9c0bdc8f4fcbd45b26b4fbeea095cc75eaa9a2ca0141eed5a1`;
its operator is PID 710/start218940 with exact pinned argv and parent 691.
The initial observer verifies the original whole and operator live during source
admission. Actual subsequent observation verifies frozen evaluator child PID
**778/start225982**, parent 710, with the exact all44 command and current new
checkpoint hash. Its configuration has `evaluate: true`, `streamEvaluation:
true`, no learner-deck restriction, CUDA and feature V7; real GPU inventory
binds to this actual child. This is a different start-tick identity from the
now-completed learner PID 778/start21144. Complete raw results, actual whole zero
and strict gains for every recipe against each of the four references remain
pending. Physical mechanisms, materials, managed rooms, serving, blind and
final delivery acceptance also remain pending. Reserved final seeds remain unused.

## Remaining work

Use the completed six-policy diagnosis for actual further learning and produce
an accepted candidate. Obtain strict gains for all 44
recipes against all four references, and complete both-seat mechanisms,
physical custody, 26 managed rooms, current-serving compatibility, and the
reserved final blind evaluation. Final seeds `6210000..6213871` remain untouched.
