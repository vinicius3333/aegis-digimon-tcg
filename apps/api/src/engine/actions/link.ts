import {
  Phase,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { definitionOf } from "../cards/cardData.js";
import { linkEligible } from "../effects/mindLink.js";
import { linkCostOf } from "../effects/interpreter.js";
import { findBattleAreaPermanent, findInHand, playerAt } from "./digivolveState.js";

/**
 * The player-facing `linkCard` verb (subsystem: link; Comprehensive Rules §6-5-1-4
 * "Linking a Card in the Hand or Battle Area", §10-1 "Link").
 *
 * §6-5-1-4 lists linking as one of the Main phase's ordinary turn-player actions: "1
 * card from the hand or battle area is linked with 1 of your Digimon in the battle
 * area." This module covers the HAND half only (a loose card in the actor's hand
 * being linked onto their own battle-area Digimon) — linking a battle-area
 * permanent's own top card is a separate, out-of-scope gap tracked by its own
 * divergence test (`ch10-link.test.ts`, `removeLooseInstance` never scans a
 * permanent's `topCard`).
 *
 * The link's actual mutation (moving the card into `Permanent.linked`, recomputing
 * DP, firing `whenLinked`) is the existing `link` primitive
 * (effects/primitives.ts) — already proven correct for a hand card
 * (ch10-link.test.ts "10-1-1/10-1-3-2"). This module only adds the declaration-time
 * legality gate (§10-1-3-1: "1 link requirement is chosen ... the player chooses 1
 * of their Digimon that meets the requirement") and the cost payment
 * (§10-1-3-2), then delegates the plug-in step to the primitive.
 *
 * Server-authoritative and platform-independent. `validateLinkCard` mutates nothing;
 * `applyLinkCard` mutates only the passed schema instances plus whatever the
 * injected `link` primitive mutates.
 */

export interface LinkCardIntent {
  type: "linkCard";
  /** The hand instance to link. */
  instanceId: string;
  /** The actor's own battle-area Digimon to link it to. */
  targetPermanentId: string;
}

/** Stable rejection reasons (subset of the API-CONTRACT intent-validation vocabulary). */
export type LinkCardRejection =
  | "not-your-turn"
  | "wrong-phase"
  | "decision-pending"
  | "game-over"
  | "no-such-player"
  | "card-not-in-zone"
  | "not-linkable"
  | "no-such-permanent"
  | "not-controller"
  | "link-requirement-unmet"
  | "insufficient-memory";

/** Result of validating a linkCard intent without mutating anything. */
export type LinkCardCheck =
  | { ok: false; reason: LinkCardRejection }
  | {
      ok: true;
      /** The hand card being linked. */
      instance: CardInstance;
      /** Static definition of the card being linked. */
      definition: CardDefinition;
      /** The battle-area Digimon receiving the link. */
      permanent: Permanent;
      /** The printed link cost to pay (§10-1-3-2). */
      cost: number;
    };

/**
 * Injected side-effect dependencies. Mirrors the digivolve/breeding action
 * modules: the memory gauge and the link primitive are each owned by a sibling
 * subsystem, so this module reads/pays through the passed seams instead of
 * duplicating their logic.
 */
export interface LinkCardDeps {
  /** Max memory the active seat may spend right now (the shared memory gauge). */
  maxAffordable(state: GameState, seat: Seat): number;
  /** Spend `cost` memory for `seat` (moves the shared gauge). */
  payMemory(state: GameState, seat: Seat, cost: number): void;
  /**
   * §10-1-3-1's "meets the requirement" test: whether `linkedCard`'s own printed
   * `<Link>` category requirement (trait/name/text/level) is satisfied by the
   * CURRENT definition of the Digimon it would link to. The engine binds this to
   * its own `linkRequirementSatisfied` (the same predicate the §17-1-3-2-6/7 rule
   * sweep re-checks after linking), so declaration-time legality and the ongoing
   * rule check can never drift apart.
   */
  linkRequirementSatisfied(hostDefinition: CardDefinition, linkedCard: CardInstance): boolean;
  /** Largest currently available recipient reduction, used by declaration legality. */
  linkCostReduction(targetPermanentId: string, cardTraits: readonly string[]): number;
  /** Offer and consume the matching optional once-per-turn reduction at declaration. */
  resolveLinkCostReduction(targetPermanentId: string, cardTraits: readonly string[]): Promise<number>;
  /**
   * Plug `instanceIds` into `targetPermanentId` (the existing Link primitive —
   * effects/primitives.ts's `link`). Handles the actual state move, DP
   * recomputation, and `whenLinked` SubTrigger firing.
   */
  link(targetPermanentId: string, instanceIds: string[]): Promise<CardInstance[]>;
  /**
   * Run the engine's state-based-action fixpoint (§17-1-2/§17-1-3 Rule Checks) after
   * the link lands. This verb never gates on the link limit at declaration (CR §4-8-5:
   * "When linking to a Digimon that has already reached the link limit, the same
   * number of the existing link cards are trashed AT THE SAME TIME as the newly
   * linked cards" — the link is allowed, not refused). A card-effect-driven link
   * (interpreter.ts's `runLink`) reaches the same §17-1-3-2-5 sweep for free because
   * it resolves inside a `runTiming` call, which always re-runs the fixpoint; this
   * bare declaration verb has no such timing around it, so it must invoke the sweep
   * itself or a player-declared link at the limit would never get trimmed.
   */
  ruleProcess(): Promise<void>;
}

/** What applyLinkCard produced (for the caller / tests / event log). */
export interface LinkCardOutcome {
  permanentId: string;
  linkedInstanceIds: string[];
  cost: number;
}

/**
 * Validate a linkCard intent against current authoritative state. Pure: mutates
 * nothing. Checks run in the API-CONTRACT order (seat/turn/phase -> open-decision
 * -> legality), rejecting with a stable reason on the first failure.
 */
export function validateLinkCard(
  state: GameState,
  seat: Seat,
  intent: LinkCardIntent,
  deps: Pick<LinkCardDeps, "maxAffordable" | "linkRequirementSatisfied" | "linkCostReduction">,
): LinkCardCheck {
  // 1. Game state gates.
  if (state.gameOver) return { ok: false, reason: "game-over" };
  if (state.pendingDecision !== undefined) return { ok: false, reason: "decision-pending" };
  if (state.turnSeat !== seat) return { ok: false, reason: "not-your-turn" };
  // §6-5-1-4: linking is a Main phase turn-player action.
  if (state.phase !== Phase.Main) return { ok: false, reason: "wrong-phase" };

  const player = playerAt(state, seat);
  if (player === undefined) return { ok: false, reason: "no-such-player" };

  // 2. The card to link must be in this seat's hand (the battle-area-topCard half
  //    of §6-5-1-4 is explicitly out of scope for this verb).
  const found = findInHand(player, intent.instanceId);
  if (found === undefined) return { ok: false, reason: "card-not-in-zone" };

  const definition = definitionOf(found.instance.cardId);
  // Server-authoritative <Link> eligibility (KB Q4881): only a card carrying the
  // Link mechanic (a printed linkRequirement) may be linked.
  if (!linkEligible(definition)) return { ok: false, reason: "not-linkable" };

  // 3. The target must be the actor's own battle-area Digimon (§10-1-1: "linked to
  //    a Digimon in the battle area").
  const permanent = findBattleAreaPermanent(player, intent.targetPermanentId);
  if (permanent === undefined) return { ok: false, reason: "no-such-permanent" };
  if (permanent.controllerSeat !== seat) return { ok: false, reason: "not-controller" };
  if (permanent.topCard === undefined) return { ok: false, reason: "no-such-permanent" };

  // 4. §10-1-3-1: the chosen Digimon must meet the link card's requirement.
  const hostDefinition = definitionOf(permanent.topCard.cardId);
  if (!deps.linkRequirementSatisfied(hostDefinition, found.instance)) {
    return { ok: false, reason: "link-requirement-unmet" };
  }

  // 5. §10-1-3-2: the printed link cost must be affordable.
  const cardTraits = [...(definition.types ?? []), ...(definition.forms ?? []), ...(definition.attributes ?? [])];
  const cost = linkCostOf(definition, -deps.linkCostReduction(intent.targetPermanentId, cardTraits));
  if (deps.maxAffordable(state, seat) < cost) {
    return { ok: false, reason: "insufficient-memory" };
  }

  return { ok: true, instance: found.instance, definition, permanent, cost };
}

/**
 * Apply a linkCard verb. Validates first (so it is safe to call directly), then
 * pays the link cost (§10-1-3-2) and delegates the plug-in step (§10-1-3-3) to the
 * injected `link` primitive.
 */
export async function applyLinkCard(
  state: GameState,
  seat: Seat,
  intent: LinkCardIntent,
  deps: LinkCardDeps,
): Promise<{ ok: false; reason: LinkCardRejection } | { ok: true; outcome: LinkCardOutcome }> {
  const check = validateLinkCard(state, seat, intent, deps);
  if (!check.ok) return check;

  const cardTraits = [
    ...(check.definition.types ?? []),
    ...(check.definition.forms ?? []),
    ...(check.definition.attributes ?? []),
  ];
  const reduction = await deps.resolveLinkCostReduction(intent.targetPermanentId, cardTraits);
  const cost = linkCostOf(check.definition, -reduction);
  if (cost > 0) {
    deps.payMemory(state, seat, cost);
  }

  const linked = await deps.link(intent.targetPermanentId, [intent.instanceId]);
  // §17-1-3-2-5: trim any link cards now beyond the recipient's limit (this verb never
  // gates the link itself on headroom — see the `ruleProcess` doc comment above).
  await deps.ruleProcess();

  return {
    ok: true,
    outcome: {
      permanentId: intent.targetPermanentId,
      linkedInstanceIds: linked.map((c) => c.instanceId),
      cost,
    },
  };
}
