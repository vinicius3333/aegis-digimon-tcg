// BT25-004 Tapmon — link-cost-reduction (the cross-actor WhenWouldLink form), authored against
// general link rules apply — BT25-089 Q6422 "can't link a no-<Link> card", Q6423 "multiple link
// reductions don't stack on one declaration").
//
// SetIsInheritedEffect(true) rule implementation. On activation it adds a `rule implementation`
// (reducedCost:1) to `card.Owner.UntilCalculateFixedCostEffect`, gated by:
//   - CardCondition: the WOULD-link card EqualsTraits("Social"/"Tool"/"Game")  (documented behavior)
//   - PermanentCondition: the link recipient == card.PermanentOfThisCard()      (documented behavior)
//   - IsOwnerTurn                                                                (documented behavior)
//
// Unlike BT25-045 (which bakes `costDelta:-1` onto ITS OWN once-per-turn Link declaration — the
// EASY self-link discharge of 08-04), BT25-004's reduction lives on the RECIPIENT: it reduces the
// cost when a [Social]/[Tool]/[Game] card would link to this Digimon, regardless of WHICH actor
// declares the link. That is the cross-actor WhenWouldLink continuous grant the engine lacked
// (08-04 deferred it here); it is built in 08-09 as a recipient-scoped link-cost-reduction grant
// store (continuous.ts addLinkCostReductionGrant / linkCostReduction), read by runLink/linkCostOf,
// and SUBSUMES BT25-045's deferred broadening (any actor's link onto a granted recipient is now
// reduced via the same store).
//
// Modeled as a `[Your Turn]` continuous static effect (interpreter routes "YourTurn" -> the
// staticModifier builder with turnOwnerGuard ANDed in, re-derived each continuous-recompute pass
// per CR-01) that installs the recipient-scoped grant on this Digimon (isSelf target). The grant
// is amount:1, traits Social/Tool/Game, duration "permanent" (the recompute re-derives it each
// pass while [Your Turn] holds; the YourTurn gate lapses it off-turn). Q6423 don't-stack is
// enforced at the read site (linkCostReduction returns the largest single matching grant). This
// genuinely reduces a REAL link cost (fails-when-reverted; see BT25-004.test.ts).
//
// turn (one would-link declaration). The continuous grant models the standing "your turn"
// reduction; per Q6423 a single declaration is reduced by at most 1 (the read-site cap), which is
// the observable behavior the A3 proves. (`frequency: "OncePerTurn"` is recorded on the effect for
// fidelity; the staticModifier window is continuous, so it does not gate the grant install.)
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      // [Your Turn][Once Per Turn] When a [Social]/[Tool]/[Game] trait card would link to this
      // Digimon, reduce the LINK cost by 1 (recipient-scoped grant; cross-actor).
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      optional: true,
      actions: [
        {
          kind: "GrantLinkCostReduction",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1,
          whenLinkingTrait: ["Social", "Tool", "Game"],
          duration: "permanent",
          optionalAtDeclaration: true,
          oncePerTurn: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT25-004", compiled);
