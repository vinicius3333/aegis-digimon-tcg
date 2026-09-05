# EX9-031 bottom face-down source selection

## Contract and failure

Catalog EX9-031 and KB Q4785 require trashing the first face-down source from
the bottom, skipping a lower face-up source. The public attack regression fails
with a legal Yellow level-4 visible source below two hidden cards. Explicit
engine readiness does not change the failure.

## Design

Correct the shared loose-card selector for the conjunction `position: bottom`
and `faceDown: true`: identify the first hidden card in the host's bottom-first
stack. Other bottom filters retain absolute position semantics. The existing
host and card filters continue to apply; another host cannot supply the payment.
Both cost preflight and payment already use this selector.

A card-ID special case would duplicate rules in the engine. Applying all filters
before every positional selection would change unrelated effects without enough
evidence. Neither alternative is needed for Q4785.

## Verification

Keep the public EX9-031 attack regression and exact stack, trash, recovery and
two-security-check assertions. Add selector cases for hidden-bottom, ordinary
bottom and no hidden candidate. Run the card, selected selector regressions,
typecheck and scoped style checks. Q4786 and the remaining card review are separate
pending work; this fix alone does not close EX9-031 or EX9.
