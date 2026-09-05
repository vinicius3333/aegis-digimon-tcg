# Timing prohibitions for borrowed stack effects

## Contract and reproduction

EX9-073 Q4841 permits placing the qualifying source while the activating
Digimon's On Play effects are disabled, but prohibits activating that source's
On Play. A real attack with Ver.5-only EX9-041 reproduces the violation:
BT20-037's timing prohibition is observable both before and after placement,
yet the borrowed suspension still resolves. The unsuppressed comparison works.

## Design

Pass the activating stack host identity to the existing borrowed-effect
availability filter. Use it as the timing-prohibition lookup fallback for
stack lenders. Retain the original lender identity for registered effects and
Once Per Turn tracking, and retain existing behavior for battle-area lenders.
The filter runs after the placement cost, so rejecting the borrowed effect
does not undo the required card movement.

Attaching the host as the lender permanent throughout collection would also
alter registered-effect and stack-conferral enumeration. A card-specific guard
would leave other stack borrowers inconsistent. A separate timing identity is
the narrower reusable correction.

## Verification

Run the EX9-073 suppressed/unsuppressed comparison, full focused card tests,
and nearby stack-borrower tests. Confirm public attack and source placement
still complete, while only the prohibited On Play result is absent. Preserve
the independent Q4842 battle-cost and refusal proofs. Run API typecheck and
scoped formatting, lint and diff checks before delivery.
