# EX12-054 Audit Wave

## EX12-054 — Guardromon — 10/10

Catalog evidence: the committed catalog text and evolution requirement were checked clause by clause. The card is a black level-4 Machine/ME Digimon with alternate evolution from a level-3 ME Digimon for 2 memory, Blocker, an On Play/When Digivolving effect that requires trashing one Machine, Cyborg, or ME card from hand before drawing two, and inherited Blocker.

Knowledge-base evidence: `node tools/kb/query.mjs card EX12-054` returned no card-specific entries. The local rules/conformance evidence for mandatory processing was checked against `comprehensive-0179`–`comprehensive-0181` in `ch15-01-effect-basics.test.ts`; the same mandatory trash-cost encoding is present in EX12-006.

Implementation and proof: EX12-054's generated IR had incorrectly marked the printed “By trashing” cost as optional with `abortOnDecline` in both timing windows. Those flags were removed, preserving the exact Machine/Cyborg/ME hand filter and draw-two action. The colocated test checks both mandatory windows, both Blocker declarations, the inherited marker, and the alternate evolution requirement.

Verification: static catalog/IR inspection and `git diff --check` pass. Focused Vitest execution was attempted with the local Corepack pnpm fallback, but Vitest is absent from the installed workspace dependencies. Test gate is blocked by the missing dependency only; no unresolved card-specific ambiguity remains.
