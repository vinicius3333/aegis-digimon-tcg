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

## Corrective checkpoint physical admission data seam

The old prepared physical operator is sealed against the old six-policy candidate
labels and comparison. It must not be invoked with relabeled new model or forged
old closure fields. A pure local `physical_corrective_admission.py` helper is
prepared at `/private/tmp/aegis-material-teacher-active-goal-20261006`, SHA-256
`6bf3a549f47db9f189430e48a39debaf61143625ff9937cbb9d206e570c77007`.
Five bounded synthetic tests pass, including high aggregate wins with a single
recipe tie, a missing fourth reference, false whole-zero fields, wrong checkpoint
or learning origin, incomplete schedule and final seed consumption. Its fixture
SHA-256 is `3603b1349a952b4ac0bc69b7a56f2a8e4014c5d9d73dbd6c66e179e465d832c9`.

This data seam requires the unchanged full actual learning, new frozen evaluation
and baseline closure consumers first; it does not substitute for them. It binds
the actual 3,596-step learning closure and checkpoint
`e4effc446ef39f04c2853fb69b81e798ed06059e3b847b7cfbf9f5daa5f4b232`, then
recomputes strict all44 gains against each preserved reference. Physical,
materials, rooms, serving, blind and delivery remain explicitly unaccepted.
Actual physical runtime adaptation/inspection, fresh capture seeds and separate
ROOT resource agreement remain pending after a passing actual full comparison.
No model load, game, GPU job, checkpoint copy or source archive is produced by
this helper; the sealed original physical operator remains unchanged.

## Prepared corrective physical runtime adapter

The source-only adapter is now sealed under desktop
`transfers/rule-link-current-corrective-physical.py`, SHA-256
`1a79a4e6813c39a5619e267e2ab0934831c2d5805926691a0633e80a80d3baee`.
Its local source is `/private/tmp/aegis-material-teacher-active-goal-20261006/rule-link-current-corrective-physical.py`.
The admission helper is also sealed as
`transfers/rule-link-current-corrective-physical-admission.py` with the unchanged
SHA-256 `6bf3a549f47db9f189430e48a39debaf61143625ff9937cbb9d206e570c77007`.
Neither changes the qualified source archive or original physical operator.

The adapter preserves the exact original physical capture, raw trace, worker,
closure, whole-wrapper and ROOT resource agreement functions. It changes the
candidate admission to the actual corrective checkpoint and learning origin,
requires unchanged full actual learning, new evaluation and baseline closure
consumers, and checks strict gains for every recipe against each reference.
It binds its own actual worker command and source pin, so the child does not
fall back to the old candidate consumer. Fresh seed inventory, current source
and runtime maps, checkpoint bytes, exact loaded module paths, finite unchanged
weights and separate ROOT resource agreement remain required.

All 28 bounded synthetic tests passed: six new namespace/admission tests, five
strict data admission tests and 17 preserved physical reader/worker guards.
The new fixture SHA-256 is
`a616bb877d92bef0e0db4ee9b72da3485899ff19dec708ffd3df7fa2f7c37717`.
These include explicit fake-model fixtures; they prove guard behavior, not
actual model execution, game results or future qualification.

Actual desktop Python 3.12.14 compilation and stdlib loading passed, exact
sealed capture functions were checked, and a request with a null future
comparison completion was rejected before any closure consumer or model import.
No job or game was started. The source-review receipt is
`/private/tmp/aegis-material-teacher-active-goal-20261006/rule-link-current-corrective-physical-source-review.actual.json`,
SHA-256 `a7c0e26d56a0046bf7eb600686f69d0bbe798e3bc35b3887fa81a36fabae3437`.
Actual physical admission, final request, fresh capture seeds and ROOT resource
Go remain pending until the full frozen evaluation passes all44 strength.
Even physical visibility and custody success will not replace independent
printed mechanism/payment/order/quota/expander correctness or later rooms,
serving, blind and delivery acceptance.

## R1 partial ceilings and prepared further real correction

The original frozen R1 evaluator remains live and must finish unchanged. An
actual partial observer at 1,672/3,872 games showed three recipes that can no
longer strictly beat the best original reference even if every remaining game
is won: Dantemon Bandai can reach at most 68 versus reference 68; DGO Plutomon
can reach at most 78 versus reference 80; Plutomon Bandai can reach at most 84
versus reference 86. This is a diagnostic ceiling, not a final qualification
consumer, and is not used to cancel the evaluation or drop any result.
The local diagnostic `rule-link-current-corrective-strength-partial-ceiling.actual.json`
under `/private/tmp/aegis-material-teacher-active-goal-20261006` has SHA-256
`4b16ffa7cb85a440d362988243336006fb507f7dbaefdfefe2595943bef8925a`;
it binds the actual observer bytes and completed baseline consumer output.
Actual full closure and all44 results remain required. Physical admission of R1
cannot use aggregate wins or replace this failed strict condition.

A source-only further-learning adapter is prepared and sealed as desktop
`transfers/rule-link-current-corrective-ppo-r2.py`, SHA-256
`131b187c367fa53b43d688cb4409ef6c911be5ec970647e69af032c17d10b8fc`.
The local source is under the same task temporary directory. It reuses the
original actual corrective operator's checkpoint inspection, tensor/Adam delta,
raw payment/trajectory verification, complete seed scanner, whole closure and
ROOT Go functions. Admission invokes the unchanged full R1 evaluation consumer;
only the final actual non-improving recipe list can admit its final request.
The known actual frozen R1 checkpoint and 3,596-step learning origin remain
explicit, rather than relabeling the original PPO checkpoint or metadata.

The proposed next genuine training phase has three complete filtered paired
passes against all44 opposing decks at both seats, fresh training seeds after
6143463 and before 6170000, four game workers, zero snapshots and a balanced
batch of twice the actual selected recipe count. Its learning rate is **1e-5**,
a real reduction from R1's restored **3e-5**. The model and Adam state are restored
before that override. All12 finite changed weights, positive equal actual Adam
deltas, exact reload, all raw games, negative attributed payment losses and
unchanged current source/runtime/original checkpoints remain required.
Subsequent frozen evaluation must still prove every one of all44 recipes against
each original reference, including recipes outside the targeted training list.

Seven bounded synthetic tests passed, including repeated complete schedule and
raw record checks, state restoration, differing original/new completion hashes,
wrong checkpoint/source, boolean exit/delta, partial closure, final seeds,
scope shrinking and changed supported helper seams. Fixture SHA-256 is
`0768437df512356a892a2fadcf21468a5de35a7684ff9fafd47eaa115241b00e`.
Actual desktop Python 3.12.14 syntax/stdlib loading, original resident operator
pins and helper seams passed. Its pending request was rejected before any
closure consumer or model import. Source-review receipt SHA-256 is `fb9dbad256c369a4a7ab8071ad7a465cb12566659ac5ee05626b3bf0b2b6c428`,
local `rule-link-current-corrective-ppo-r2-source-review.actual.json`.
No R2 job, model load, game or additional update has occurred. The actual final
R1 evaluation completion, target list, fresh seed inventory, final sealed
request/wrapper, admitted read-only inspect and separate ROOT resource Go remain
pending; reserved final seeds remain untouched.

## Completed frozen R1 evaluation and actual R2b admission

The original evaluation session 97906 actually ended with exit zero and must not
be restarted. The unchanged full resident evaluation `--closed` consumer also
passed with actual whole zero and full source/runtime/checkpoint/raw-record/output
map guards. Completion SHA-256 is
`707c62ee92fa146d2d495ee55ef6243209f7451a64e8fe108347293f3360d0aa`;
local full consumer output `rule-link-current-corrective-strength-closed.actual.json`
under `/private/tmp/aegis-material-teacher-active-goal-20261006` has SHA-256
`1700023dc93929e440f731846b31e955460634456ce78cb11fa40db42741f8c0`.
All 3,872 games are complete and natural, with 2,427 wins, 1,445 losses, zero
failed/unusable games or payment forfeits, eight recovered play rejections and
zero learning updates. Elapsed game time was 2,808.763 seconds. The recovered
rejections remain in the evidence; these are not pristine physical witnesses.

The actual strict all44 gate is **false**: 26 recipes do not strictly exceed every
one of the four references. An aggregate gain from 2,408 to 2,427 wins cannot
replace that condition. The complete diagnostic
`rule-link-current-corrective-r1-all44-assessment.actual.json` has SHA-256
`cb83743747c4e6b2f3e176253c5a0894303e8a89e5197203e8c2349b73809807`.
Each deficit below is the smallest actual delta against the four preserved references.

| Recipe | R1 wins out of 88 | Minimum delta |
| --- | ---: | ---: |
| bt26-chronomon-bandai@1 | 70 | -2 |
| bt26-dantemon-bandai@1 | 55 | -13 |
| bt26-dgo-2026-08-28-1-toho-braves@1 | 78 | -2 |
| bt26-dgo-2026-08-28-13-jupitermon@1 | 70 | -3 |
| bt26-dgo-2026-08-28-7-chronomon@1 | 65 | -6 |
| bt26-dgo-2026-08-28-8-plutomon@1 | 72 | -8 |
| bt26-dgo-2026-09-05-1-glowing-dawn@1 | 47 | -2 |
| bt26-plutomon-bandai@1 | 81 | -5 |
| curriculum-appmon-charismon@1 | 64 | 0 |
| curriculum-beatbreak-black@1 | 57 | -1 |
| curriculum-data-squad-rosemon@1 | 37 | -4 |
| curriculum-ds-blue@1 | 40 | -3 |
| curriculum-iliad-purple@1 | 50 | -1 |
| curriculum-nsp-insects@1 | 40 | 0 |
| curriculum-shambala-zanbamon@1 | 46 | -5 |
| curriculum-sukamon-etemon@1 | 35 | 0 |
| ex13-adventure-bandai@1 | 66 | -8 |
| ex13-alphamon-royal-knights@1 | 58 | -7 |
| ex13-examon-royal-knights@1 | 75 | -9 |
| ex13-gallantmon-royal-knights@1 | 67 | -4 |
| ex13-gankoomon-jesmon-royal-knights@1 | 66 | -1 |
| ex13-imperialdramon-bandai@1 | 51 | -9 |
| ex13-lordknightmon-royal-knights@1 | 50 | 0 |
| ex13-magnamon-royal-knights@1 | 68 | -6 |
| ex13-omnimon-royal-knights@1 | 51 | -8 |
| ex13-ulforceveedramon-royal-knights@1 | 68 | 0 |

The first proposed R2 training interval beginning 6143464 was rejected by the
unchanged complete scanner because it overlaps historical seeds beginning
6145000; further inventory showed no contiguous 6,864-game window in that
initial narrow range. No model or job was started by those rejected preparations.
The sealed unused R2 operator and wrapper remain unchanged. The corrected R2b
source admits an earlier training interval, still outside current evaluation,
rooms/physical and reserved final blocks, and still requires the unchanged full
scanner. Its final actual fresh interval is **6009240..6016103** for 6,864 games,
verified against 633 actual schedule files and 124,111 previously used seeds.
Original final seeds `6210000..6213871` remain untouched.

Corrected source `transfers/rule-link-current-corrective-ppo-r2b.py` is sealed,
SHA-256 `ad53af557ba9e1191fa0ca4d6880dd00cfad4f3f792239343c28ffef5f0cdc7d`.
Eight bounded synthetic tests passed, including original/new completion separation,
three complete repeated paired passes, restored Adam state, all12 positive tensor
deltas, retained negative payment losses, changed helper seams and both allowed
training windows versus reserved boundaries. Fixture SHA-256 is
`0b82d37d39af3258b63f6077dbefec3fc1c93d25c550b78b7d9e8eb44c12fafd`.
Actual desktop Python 3.12.14 syntax/stdlib source review and null-future-closure
rejection passed; review SHA-256 is
`35cda05fc4ee8c2ca669fb63df4dd319f9008a73e7058cfbbce1ad495e7ac858`.

The final actual request SHA-256 is
`c408add80219c3d13721daf604c731e12ee48659a3afb67221cb25e1758af082`;
actual fresh inventory SHA-256 is
`a2e52aeb0e2bfe1cc1921cc7099e42a1ca2c7a87aa8766c73a8e9c9f1600ecb1`.
Full read-only admission exited zero after the unchanged actual R1 closure consumer,
actual source/runtime/CP guards and a second complete fresh-seed scan. Inspection
SHA-256 is `59a8ed454e4cbbda586b69adfc7b1fe3917ea7d5c4e2afa168d098f0c9e9d74e`.
It confirms 26 selected learners, all44 opposing decks, both seats, 6,864 genuine
training games, balanced batch52, four workers, zero snapshots, no evaluation flag,
no runtime override, and a **1e-5** override after restoring the known **3e-5** Adam
state. Input remains actual R1 checkpoint `e4effc446ef39f04c2853fb69b81e798ed06059e3b847b7cfbf9f5daa5f4b232`.

A fresh actual unchanged static idle guard and GPU inventory passed before the
separate ROOT Go, SHA-256
`b948a733367523f5a80aa08f1a3764e43da8940e6321538dc964ef2f712f0b64`.
The launched original foreground session is **26324** and must remain attached;
actual whole PID **693/start573249**, operator **713/start573263**, identity SHA-256
`ed11a1570c7bf9dd6aa3414fcf6b906535b572ac24589a13df3251feee033e8b`.
Wrapper SHA-256 is
`336d5ac98db5e3fee6267d2e9e284d0beb5af4bd7241f70cfd96b19f18994af7`.
The initial actual observer verifies exact argv, source/request/Go pins and parentage
while the operator performs full predecessor admission. Actual subsequent observation
verifies CUDA learner PID **869/start588939**, parent 713, with the exact admitted
26-recipe/three-pass command. Its configuration confirms `evaluate: false`, feature
V7, CUDA, actual R1 input checkpoint, restored learning rate **3e-5** and applied
rate **1e-5**. GPU inventory binds to that actual learner. The first real batch has
52 usable games, zero failures or payment forfeits, positive gradient norm and a
new output checkpoint. These are live partial training results; final all12 tensor
and Adam deltas, full raw records, actual whole zero and checkpoint hash remain
pending until the unchanged guarded learning closure succeeds.
Qualified source archive, engine fingerprint and protected original checkpoints
remain unchanged; no metadata-copy generation or repeated engine build is needed.
Subsequent full all44 strength, physical mechanisms/materials, rooms, serving,
untouched final blind and delivery acceptance remain required.

## Prepared full evaluation for the actual R2b output

Source-only evaluator `transfers/rule-link-current-corrective-strength-r2b.py`
is now sealed, SHA-256
`53895423e9bc11314112c8b2866d9103c92f0e6dc31c6d44d27b242dec78cab1`.
Its local source remains under
`/private/tmp/aegis-material-teacher-active-goal-20261006`. It preserves exact
sealed R1 command, full raw-record, comparison report, whole, ROOT Go and closure
functions. Only admission changes to the actual R2b learner, known request/whole
identity/Go pins, 6,864-game fresh training schedule and measured R1 comparison
origin. The R2b completion, checkpoint hash and actual positive Adam delta remain
unknown until the unchanged full actual R2b closure consumer succeeds.

Future evaluation remains 3,872 greedy frozen games, all44 learners versus all44
opposing decks at both seats, identical development seed 6135000, four workers,
zero learning updates and streaming results. The original four complete reference
results are reused only with exact protected CP, runtime, source, curriculum and
schedule identity. The fixed source archive, engine fingerprint and qualified
full engine/Python/delivery proof remain unchanged. Neither a repeated unchanged
engine build nor another metadata-copy generation is involved.

Seven bounded synthetic tests passed, covering old R1 learning substitution,
wrong comparison origin/checkpoint, partial or boolean whole status, optimizer
reset/unknown positive actual step counts, scope shrinking/final seeds, null
future hash rejection before any consumer, changed helper seams and separate
new learning/parent comparison/original baseline completion pins. Fixture SHA-256
is `238cdbe93c64abc9027e4063116a7ef39a2be89ebcd80be61ebe89a040bf951f`.
These are explicit fake future closures, not actual R2b completion evidence.
Actual desktop Python 3.12.14 syntax/stdlib loading and unchanged evaluation
functions passed; the null future completion/checkpoint request was rejected
before any closure consumer or model import. Actual source-review receipt
`rule-link-current-corrective-strength-r2b-source-review.actual.json` has SHA-256
`93dade2d9744acf7cf56b627fa08453c02a84d024d271d41280ee37c95295090`. No future evaluation job or model load was started.

Actual R2b training remains the original attached session 26324, whole
693/start573249, operator 713/start573263 and CUDA learner 869/start588939.
A later actual observer confirms 676/6,864 training games, zero failures or
payment forfeits and no whole exit yet. This is partial training, not qualified
strength. The final future evaluation request, actual R2b completion/checkpoint
pins, full admitted read-only runtime inspection, fresh idle inventory and
separate ROOT evaluation resource Go remain pending. Final blind seeds remain
untouched, and all44 strict strength, mechanisms/materials, rooms, serving and
final delivery acceptance remain required.

## Actual R2b learning closure and evaluation admission

Original foreground training session 26324 has now exited zero. Its exact whole
693/start573249, operator 713/start573263 and learner 869/start588939 are gone;
the actual original nonlink whole trap is `0` and GPU inventory is empty.
All three paired passes completed: **6,864 usable training games**, seed
6009240..6016103, 4,625 wins and 2,239 losses, zero failed/unusable games.
One attributable unaffordable-payment refusal remains a negative-reward loss;
26 recovered play rejections remain in the records. Training action visibility
and stochastic wins are not strength, physical-payment or mastery acceptance.

The unchanged guarded full R2b closure consumer exited zero, with actual
completion SHA-256
`2fdceff3dc3fc2c014500f05170b10910e617a4bba5752a406981365b09c261b`.
Its local output `rule-link-current-corrective-ppo-r2b-closed.actual.json` has
SHA-256 `c0a1c00cae7b8c9dcf17e304641de20a2bb8a63429ea53cf6450ff6604089795`.
The actual new checkpoint remains at
`runs/rule-link-current-aa2e56463-corrective-ppo-r2b/ppo/checkpoint.pt`, SHA-256
`948aa03ea52208321e4d47e3ece9fd2517ee45d3b941d5b608fe94368b65df45`.
All 12 model tensors are finite and changed, exact checkpoint reload passed,
and every preserved optimizer tensor has **11,792 positive actual Adam updates**
beyond the restored R1 optimizer. Protected source/runtime and original checkpoints
passed pre/post guards; no extra model migration or engine rebuild occurred.

The prepared frozen full-all44 evaluator is now bound to that actual closure and
checkpoint through an exclusive sealed final request, SHA-256
`9358926a0a161e3b78951ed9197291878d212bae5dc48efa39d74ad38febc2aa`.
Its reviewed external wrapper is sealed at
`transfers/rule-link-current-aa2e56463-corrective-strength-r2b-launch.sh`, SHA-256
`c9ddea2531b81f6bd07bd6709d07c44ead05e0b82e07c654dee6fb14892f9b32`;
actual desktop Bash syntax validation passed without execution.
Full read-only evaluation admission exited zero in session 66852. Its receipt
SHA-256 is `e1cc5004658d3963fe0fd6edd12bdecc46198ab69b7ae51087b9731637259515`.
The admitted command is exactly the original frozen all44 evaluation command,
with only the actual new checkpoint and fresh output directory substituted.
A second actual static idle check passed with empty GPU inventory and absent
new evaluation outputs before the separate ROOT resource Go, SHA-256
`a679a82f135062c144f9d8d2ee44138940455a8ec7517cac66880f65b77c3e7a`.

Original foreground evaluation session **49750** is now attached. Actual whole
**683/start1185904** launched operator **702/start1185911**, with verified exact
argv and parentage; identity SHA-256 is
`1fdcbda16c93ccbbbc1578cc933de5f5307eb5b30a4ef936c6b933991fd0ee2a`.
The operator is performing its unchanged full predecessor admission; the first
observer shows no evaluation child, game or CUDA load yet, and no whole exit.
Keep that original foreground session attached and obtain actual later process
and terminal evidence without restarting on observation timeout.
The evaluation keeps all 44 recipes, four original complete reference rows,
both seats and 3,872 identical development games, with zero weight updates.
Actual full all44 results, whole-zero closure and strict gain acceptance remain
pending; completion of learning alone does not qualify the new bot.

## Actual full R2b evaluation closure and balanced next experiment

Original evaluation session 49750 exited zero, and the exact whole
683/start1185904, operator 702/start1185911 and frozen CUDA evaluator
905/start1202652 are gone. The original nonlink whole trap is `0`, with an
empty actual GPU inventory. All **3,872 natural development games** completed:
**2,461 wins / 1,411 losses**, zero failed/unusable games or payment forfeits,
and eight retained recovered play rejections. No weights were updated during
evaluation; checkpoint `948aa03e...` remains unchanged.

The unchanged full guarded R2b evaluation consumer also exited zero. Its actual
completion SHA-256 is
`40baeefda85cd0d8f45ffd94b1d3171a7c1c690195f10ef3cd262231c0df191c`;
local `rule-link-current-corrective-strength-r2b-closed.actual.json` has SHA-256
`120718b719f5adea53958b95ecfa7734795eba7f96e746e75c432f3a0a49ba70`.
The complete all44 assessment has SHA-256
`ab56b39c19f347a3215db0ce2e8e130b9727aaad91c654b20bc7cb67666dbe77`.
**24 recipes still fail strict gains against every one of the four references**,
compared with 26 in R1. Aggregate improvement (2,408 old PPO → 2,427 R1 →
2,461 R2b) does not pass this gate. Against R1, 25 recipes improved, 15 regressed
and four tied. The largest remaining deficits are Imperialdramon Bandai
(14 additional wins required), Adventure Bandai (10), Charismon (7), Examon (7)
and Gankoomon/Jesmon (7). Mechanisms, materials, rooms, serving, blind evaluation
and delivery remain unaccepted; no physical or room job is admitted by this result.

The next bounded experiment tests the learner selection: one balanced full
44×44×both-seats pass, 3,872 genuinely fresh training games, warm-starting the
actual R2b checkpoint and optimizer. It preserves the current `1e-5` learning
rate, heuristic opponents, supported trainer, qualified source and runtime.
The falsifiable hypothesis is that retaining all44 learner coverage reduces
regressions caused by training only the deficient subset. Learning-rate drift
and limited opponent variety remain alternatives; they are not asserted as
proven causes. The next candidate still requires the unchanged full all44
comparison against every reference before downstream acceptance.

Source-only R3 operator `rule-link-current-corrective-ppo-r3.py` has SHA-256
`87dfb8a9f49c6d348ff80cc40575d3d3c99703970643ace1f2a3614501fb8531`;
its external launch wrapper has SHA-256
`486dae7358f7db885330f24524a83a6324040c940996f08e26cca8602734ac79`.
Nine bounded synthetic guards passed, including all44 pairing, partial/wrong
closure rejection, original protected CP/source guards, real positive optimizer
steps, retained negative payment losses, and the exact supported R2b namespace
context seam. These fixtures do not prove a future actual training run.
`test_current_corrective_ppo_r3.py` has SHA-256
`c19542f77385006cb500f5ac72f8399c81d7c907895a27539877939dc63c4286`.
Actual desktop source inspection exited zero using Python 3.12.14, pinned
resident helpers and the supported namespace seam, without primary models or
jobs. Its actual source/advisory receipt has SHA-256
`2e6c9718ff2509cc90684d5e7c1d7ee7599636173f6050e93ba5ad31559deaa9`.
The advisory found candidate seed 6016104 after observing 639 schedule files
and 130,975 previously used seeds; this advisory is not final seed admission.
Final exclusive request, complete original fresh-seed scanner, full read-only
admission, fresh idle checks and separate ROOT learning Go remain required
before actual R3 execution.

## Actual balanced R3 admission and original foreground launch

The unchanged complete seed scanner exited zero: the full window
**6016104..6019975** (3,872 training games) is fresh, with no overlap in either
`runs` or `validations`. Its exclusive inventory has SHA-256
`8310d9d7632077f9fb1cf8f15d5f6f1648c8617e25990c775397148662f00afa`;
the sealed final request has SHA-256
`3ae3accf87504271dcf72902ae794b87f479f6e940c84850d70e47dec9479bae`.
Full read-only admission exited zero in session 84732, with receipt SHA-256
`040aed633121847259a88b351c36e9c6832e78dcd46a0dff3d3c9e116e97b9b6`.
The actual admitted supported command retains CUDA, four workers, snapshot zero,
max failures zero and 4,000 max decisions; it selects all44 learners against
all44 opponents at both seats, in batches of 88, with the actual R2b checkpoint
and preserved optimizer at learning rate `1e-5`. No primary model or training
was started by that inspection.

Two separate actual static idle checks passed with empty GPU inventory and
absent fresh R3 outputs. The ROOT learning Go has SHA-256
`cc463747853d89b4da4508d77c1466535d36f6856069305f9a7fbf628e5c20dd`.
Original foreground session **49940** is now attached: actual whole
**716/start53032** launched operator **736/start53040**, with exact arguments,
parentage and sealed request/operator/Go provenance verified. Actual launch
identity SHA-256 is
`36eaad915d93e2312565cf30b3c0beb24b6754d6093380a20b01d3f26f456c78`.
The first subsequent observer still shows predecessor/source admission in
progress, **no training child or games yet**, empty GPU inventory and no whole
exit. Keep the original foreground session attached, and obtain later actual
process and terminal evidence without restarting on an observation timeout.
Actual updates, a new checkpoint and full training closure remain pending.

The later frozen all44 evaluation adapter is separately prepared as source only:
`rule-link-current-corrective-strength-r3.py`, SHA-256
`9109fd058afd9b49440a528ba7f02908d9efd9fa1d263e4f31ed839119c58af0`.
It binds this actual learning launch, source/runtime, original reference rows,
full development schedule and original unchanged evaluation/records/whole/Go
functions. Actual new checkpoint and learning completion SHA fields remain
null in the rejected pending request; no future success is supplied. Seven
synthetic guards passed (`test_current_corrective_strength_r3.py`, SHA-256
`c8735999c1ed81d847b09df7c75a4ccaaee45913926e986add7ef0a87dc63ad0`).
Actual Python 3.12.14 desktop syntax and unchanged-function review exited zero;
the pending request was rejected before any consumer or primary model import.
Source-review receipt SHA-256 is
`e5651d2c4b9f3eab25a3b5f4d5e1bcbef32b9c4d5e35c5a240162fac57b27154`.
This does not admit evaluation: actual R3 whole-zero/full consumer, actual new
checkpoint pins, final exclusive request/wrapper, full read-only inspection,
fresh idle inventory and a distinct ROOT evaluation resource Go remain required.
No metadata generation, engine rebuild, physical/room games or final blind
seeds were consumed by this preparation.

## Actual balanced R3 CUDA learning started

A later actual observer now confirms the real learner **1138/start87977**,
parent 736, under the original whole 716/start53032 and foreground session
49940. Its complete argv equals the admitted supported command byte for byte.
Actual config confirms CUDA, `evaluate: false`, F7, seed 6016104, 3,872 games,
the exact protected R2b checkpoint SHA-256
`948aa03ea52208321e4d47e3ece9fd2517ee45d3b941d5b608fe94368b65df45`,
all44 learner recipes and both initial/restored and current learning rate `1e-5`.
No optimizer reset or additional metadata migration was requested.

The first actual batch completed **88 usable games** (61 wins / 27 losses),
with every learner recipe observed twice, zero failed/unusable games, payment
forfeits or recovered play rejections. These stochastic training results and
visible mechanism choices do not accept strength or mastery. The original
whole is still live; full 3,872-game completion, actual new checkpoint SHA,
positive all12 Adam deltas and unchanged guarded full closure remain pending.
Keep the same foreground session attached, allow no overlapping CUDA evaluation,
and preserve any attributable penalty losses and partial failures.

A local future full training closure reader is prepared at
`closed-current-corrective-ppo-r3.sh`, SHA-256
`83c4941ead8c763f68e0a83fe8e19432072f859d39dfd8a4ac18d2e04b8c3b84`.
Bash syntax validation passed; it has not been executed and must wait for actual
original whole zero. It binds the real request/operator/identity/ROOT-Go pins
and invokes the unchanged resident R3 full closure consumer. New checkpoint,
completion and update-count pins must come from that actual output, never from
this preparation or synthetic fixtures. Full all44 strength, both-seat
mechanisms/materials, 26 managed rooms/current serving, reserved blind seeds
and verified delivery remain required.

## Remaining work

Use the completed six-policy diagnosis for actual further learning and produce
an accepted candidate. Obtain strict gains for all 44
recipes against all four references, and complete both-seat mechanisms,
physical custody, 26 managed rooms, current-serving compatibility, and the
reserved final blind evaluation. Final seeds `6210000..6213871` remain untouched.
