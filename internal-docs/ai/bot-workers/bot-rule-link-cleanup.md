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

## Remaining work

Primary checkpoints still require binding to this changed engine and actual
preservation queries before any new model evaluation.
The original frozen archive, checkpoints, diagnostic receipts, and failed
comparison remain immutable; that failed comparison is not relabeled successful.
Then diagnose and correct the per-deck regressions, obtain strict gains for all
44 recipes against all four references, and complete both-seat mechanisms,
physical custody, 26 managed rooms, current-serving compatibility, and the
reserved final blind evaluation. Final seeds `6210000..6213871` remain untouched.
