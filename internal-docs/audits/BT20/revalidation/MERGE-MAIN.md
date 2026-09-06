# Integration with current main before PR merge

The user authorized merging PR 4721 into main. Integration starts from audit commit `1510b60ee` and main commit `9bb623a88`. The sole text conflict in `GameEngine.ts` was resolved by retaining both the audit's checked-security-card lookup and main's process-scoped continuous-effect context.

Main's structured DNA requirements exposed incorrect expectations in the prior BT20 audit. These are corrected rather than retaining the old assertions:

- BT20-011: Paildramon's printed DNA cost is zero. Public play leaves memory at zero; public evolution from a 10-memory gauge costs two, then zero for DNA, leaving eight.
- BT20-016: the leave-play replacement into Imperialdramon: Dragon Mode uses its printed zero-cost DNA requirement. The opponent-turn gauge remains four; the new ACE has not left the field, so Overflow is not paid.
- BT20-045: the previous claim that only Blast DNA is possible was wrong. The [official Bandai card](https://world.digimoncard.com/cards/?free=BT20-045&search=true) prints an ordinary zero-cost DNA route from green Lv.6 plus blue Lv.6, alongside its named Counter Blast route. The ordinary public action now proves exact source consumption, cost and highest-DP bottom-deck behavior, with invalid-material rejection separately covered.
- BT20-085: use a Vortex Warriors partner without the Vortex keyword so the real turn loop proves Shoto's suspension/DP grant and opponent-turn expiry without an unrelated partner attack. The test preserves natural timing.

Luna implemented the scoped card-test updates; Astra reviewed the sources, resolved integration and serialized verification. No card production behavior or catalog was changed for these expectation corrections. Main's existing shared DNA definitions supply the printed requirements.

The initial collection run is preserved in `merge-main-collection-before-dna-expectations.json`: 966 passed and two stale DNA expectations failed. The authoritative integration commands and final results are recorded in `merge-main-gates.json`. Accepted hashes and collection scores are renewed only after the integration and evidence commits are pushed.
