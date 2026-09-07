BT21 implementations and historical audit scores contained incorrect costs, missing runtime paths, and tests that could pass with impossible stacks or before effects finished. This draft independently revalidates all 102 catalog cards and corrects production behavior through compiled IR and reusable engine mechanisms.

The latest checkpoint fixes Save capturing an identical live card or relocating a Tamer after the deleted source already moved. Shoutmon King and Arresterdramon now offer Save independently of their preceding placement. Examon X requires a source named X Antibody; the trait alone does not qualify. Public tests now exercise Counter/Blast evolution, blocking, Reboot, Overflow, Evade, distinct trait alternatives, refusal, and completed combat.

Validation at b29ab04e8:

- 2534/2534 assertions across 150 files, including every BT21 card and affected mechanism/cross-set suites; one worker, 2048 MB worker heap.
- Shared/API/web typecheck passes; Oxfmt/Oxlint exit successfully on 184 changed code/data paths (nonblocking lint warnings remain logged); `git diff --check` passes.
- BT21-only synchronization checks all 102 records: 22 semantic changes against the audit baseline, zero semantic or byte changes outside the set.
- Atomic implementation and per-card proof commits; reproducible red/green logs and exact suite manifest under `docs/audits/BT21-revalidation`.

**Incomplete: 695/1020 accepted points; 0/102 final 10/10.** Fifty-nine cards have accepted fidelity evidence; delivery points remain withheld. Forty-three cards still require strict clause review or outstanding proof. Historical passing reports are not accepted as final proof. The ledger records each card's remaining gaps; this PR stays draft until every collection gate is satisfied.
