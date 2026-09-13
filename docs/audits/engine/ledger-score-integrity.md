# Collection ledger score integrity audit

Status: in progress. Baseline `33053bf14`. Standard numeric score selection
and arithmetic are corrected; complete narrative rubric parsing, component
identity semantics and certification evidence remain open. A parsed score is
not behavioral proof or a certification decision.

## Contract and implementation

Repository audit rules require a sole collection ledger and reproducible
card proof. Reopening a demonstrated defect must preserve its reduced score,
without earning current credit from an older ten. The existing remaining
collection verifier instead searched for `10/10` anywhere in a row and at
least five `2/2` strings, which can come from historical material. A legitimate
current 8/10 row was rejected, while ST2-01's current eight was previously
masked by historical ten-point material.

`cards/collection-audit-contract.ts::standardLedgerScore` selects the first
top-level Current score line when present, otherwise the first top-level
Score line. Presence is selected before numeric parsing: a malformed current
line cannot fall back to an old Score line. The grammar permits ordinary
Score and explicit “capped at” Current score with optional Markdown bold.

Components come from the explicit top-level Clause scores line when present,
otherwise the primary inline score rubric or the five component lines before
the primary total (AD1 layout). Complete numeric lexemes must be unsigned
integers. Exactly five values in 0..2 must sum to the declared score in 0..10.
Decimal or comma numerators/denominators, extra fraction slashes, missing
values and inconsistent totals fail. A collection still marked verified must
have every standard row at ten; an in-progress collection can retain honest
lower scores. Module/test reference checks remain required.

P-009 and ST2-01 were reduced to eight during the initial score-integrity
checkpoint. Read-only inspection of the authoritative collection ledgers now
finds `docs/audits/P.md` recording P-009 at 10/10 in the verified 249-card Promo
ledger, with five current 2/2 components, and `docs/audits/ST2.md` recording
ST2-01 at 10/10 in the verified 16-card ST2 ledger, also with five current 2/2
components. This inspection did not rerun the collection verifier or behavioral
tests; those rows are the current ledger state and its recorded source proof,
not a fresh recertification. The earlier eight-point rows and failed verifier
results remain historical evidence only; other historical scores are not freshly
recalculated.

## Behavioral proof

The first complete API run after name repairs failed only P-009's omitted
module reference (5107 passing files, one failed, 42261 passes, one failure,
three expected failures; 42265 total, 165.49 seconds). Exact module/test links
were restored. With its honest five ratings, the focused old verifier then
failed P-009's five-2/2 requirement (one failed / three passed). No green broad
claim is made from either failed result.

`remaining-collections.audit.test.ts` adds standard score cases for reduced
current eight with and without historical ten; existing inline ten; current
cap precedence; inflated total; missing component; negative/out-of-range
component; missing current total; verified collection with reduced score;
malformed current line plus old ten; same-line historical numeric material;
fractional total, numerator and denominator; decimal comma numerator and
component/total denominators. These test the actual function called by the
remaining collection verifier.

Independent review found two initial parser bypasses: malformed current
fallback and fractional numeric fragments. Both were corrected with regression
cases. A further decimal-comma denominator edge was also corrected without
rejecting ordinary comma-space inline rubrics. Scoped assertion-style findings
were fixed with explicit thrown-message expectations and plain conditional
validation calls rather than conditional assertions.

Final focused command:
`pnpm --filter @aegis/api exec vitest run src/cards/remaining-collections.audit.test.ts src/cards/audit-docs.test.ts src/cards/P/P-009.test.ts src/cards/EX13/EX13-002.test.ts --maxWorkers=1 --no-file-parallelism`.
Forty tests pass across four files: twenty-one score/remaining-collection
contract cases, four layout cases and fifteen card cases. Final full API
confirmation passes 5108 files, 42279 tests and three declared expected
failures (42282 total), in 165.79 seconds. Final workspace typecheck passes
shared, API and web; scoped Oxlint and Oxfmt pass all 22 changed files, and
`git diff --check` is clean. Independent read-only review found no remaining
blocker in the bounded numeric parser contract.

## Open obligations

- EX3/EX4 narrative score verification retains its existing weaker format and
  is not certified by this standard-row repair.
- Numeric component count/sum does not verify the semantic identity of five
  distinct rubric categories, citations, runtime behavior or complete proof.
- The verifier does not calculate every collection's current score from
  behavioral evidence. Verified status still requires the full audit workflow.
- Complete source/consumer denominators and the generic engine audit remain
  open; reduced provisional scores are not promoted by green regression.

## Current rubric identity reconciliation (2026-09-13)

The current 798-row remaining-collection contract now validates the semantic identity of five distinct rubric categories in addition to integer arithmetic. Standard rows recognize the three documented layouts: catalog/rules + IR + behavior + stack + delivery; catalog + rules + IR + behavior + delivery; catalog + rules + IR + behavior + stack. Unknown or repeated dimensions cannot replace an omitted dimension merely because their numerators sum to ten.

EX3/EX4 narrative verification now reads the actual bounded worker rubric, including tables, rating bullets in a Result section, compact prose and multiline parenthesized receipts. A later History section cannot supply a missing dimension. Worker delivery remains 0/2; current coordinator scores remain separate. EX4-040's historical sixth “reproducibility 2/2” is explicitly an unscored evidence note, rather than silently making its worker total ten. No card's current score, status, executable behavior or module registration was promoted by this repair.

New controls reproduced duplicate/unknown standard dimensions and duplicated/missing/inflated narrative ratings against the old implementation. Fractional and misleading sixth-component controls remain strict. The real 798-row verifier passes with the corrected parser, so historical narrative formatting is supported without weakening the five-dimension contract. Exact catalog IDs/names and existing module/test-link checks remain in the same verifier. Semantic rubric identity does not prove the contents of those linked behavioral tests, or the full correspondence between normative source clauses and evidence notes; those remain separate obligations. The 66-set index is a status/layout gate, not a recalculation of all card evidence.
