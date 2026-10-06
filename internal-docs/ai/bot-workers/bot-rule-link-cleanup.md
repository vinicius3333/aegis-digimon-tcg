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

## Remaining work

Engine bytes have changed. A fresh source/runtime qualification and declared
engine fingerprint are required before using this runtime for model evaluation.
The original frozen archive, checkpoints, diagnostic receipts, and failed
comparison remain immutable; that failed comparison is not relabeled successful.
Then diagnose and correct the per-deck regressions, obtain strict gains for all
44 recipes against all four references, and complete both-seat mechanisms,
physical custody, 26 managed rooms, current-serving compatibility, and the
reserved final blind evaluation. Final seeds `6210000..6213871` remain untouched.
