// ＜Link＞ and ＜Mind Link＞.

import type { EffectContext } from "../../EffectContext.js";
import { canLinkToTargetPermanent, digimonEligibleForMindLink, linkEligible } from "../../mindLink.js";
import { relocateByEffect } from "../costs.js";
import { unsupported } from "../errors.js";
import { permanentMatchesFilter } from "../matching/permanent.js";
import { candidateLooseInstances, pickLoose } from "../targeting/loose.js";
import { candidatePermanents } from "../targeting/permanents.js";
import { isTamer } from "@aegis/shared";
import type { Action, CardDefinition, Filter, Permanent } from "@aegis/shared";

/**
 * "Link N [X] from your hand or this Digimon's digivolution cards to this Digimon".
 * The cards to link are loose cards matching the target filter; they join the SOURCE
 * permanent's linked list.
 */
export async function runLink(ctx: EffectContext, action: Extract<Action, { kind: "Link" }>): Promise<void> {
  // The recipient is a chosen friendly Digimon ("link ... to 1 of your Digimon") or, by
  // default, the source permanent ("to this Digimon").
  let recipientId = ctx.source.permanent()?.permanentId;
  if (action.recipient !== undefined) {
    const recipientFilter: Filter = { controller: "mine", kind: ["Digimon"], ...action.recipient.filter };
    // Dynamic recipient eligibility: only a
    // non-token, non-breeding Digimon that satisfies the link card's structured target condition
    // may RECEIVE the link. Filter the candidate recipients through the predicate so an
    // ineligible recipient is never offered (server-authoritative — V4/V5).
    const matches = (p: Permanent, f: Filter): boolean => permanentMatchesFilter(ctx, p, f, ctx.source);
    const recipients = candidatePermanents(ctx, { ...action.recipient, filter: recipientFilter }).filter((p) =>
      canLinkToTargetPermanent(
        p,
        recipientFilter,
        matches,
        ctx.game.definitionOf,
        action.allowBreedingRecipient === true,
      ),
    );
    if (recipients.length === 0) return;
    const recipientTarget = action.recipient.count === "all" ? recipients.length : (action.recipient.count ?? 1);
    if (recipients.length <= recipientTarget && !action.recipient.upTo) {
      recipientId = recipients[0]?.permanentId;
    } else {
      const chosenRecipient = await ctx.ask.chooseTargets(ctx, {
        candidates: recipients.map((p) => p.permanentId),
        min: action.recipient.upTo ? 0 : 1,
        max: 1,
      });
      if (chosenRecipient.length > 0) recipientId = chosenRecipient[0];
    }
  }
  if (recipientId === undefined) {
    unsupported(ctx, action, "Link needs a recipient permanent (source not on the battle area)");
    return;
  }
  const recipient = ctx.game.permanentById(recipientId);
  if (recipient === undefined) {
    unsupported(ctx, action, "Link recipient permanent not on the battle area");
    return;
  }
  // Server-authoritative <Link> eligibility (KB Q4881): only cards carrying the Link
  // mechanic may be linked. A client link intent against a no-<Link> target is rejected
  // here by excluding it from the selectable set — never trusted.
  const candidates = candidateLooseInstances(ctx, action.target, action.from ?? ["hand", "digivolutionCards"]);
  // A resolving Option is deliberately in no zone (§9-1-4), and a Security effect can still
  // refer to "this card" before security processing moves it. Preserve that physical identity
  // for self-link effects instead of requiring the source to appear in a normal source zone.
  if (
    action.target.filter.isSelfRef === true &&
    ctx.source.permanent() === undefined &&
    !candidates.some((candidate) => candidate.instanceId === ctx.source.instanceId)
  ) {
    candidates.push({
      instanceId: ctx.source.instanceId,
      cardId: ctx.source.cardId,
      ownerSeat: ctx.source.ownerSeat,
    });
  }
  const eligibleCandidates = candidates.filter((cand) =>
    linkEligible(ctx.game.definitionOf({ cardId: cand.cardId } as never)),
  );
  if (eligibleCandidates.length === 0) return;
  // The link limit is NOT a declaration-time gate. §4-8-5: "1 card can have a maximum of 1
  // link card. When linking to a Digimon that has already reached the link limit, the same
  // number of the existing link cards are trashed at the same time as the newly linked cards" —
  // the link is ALLOWED and the pre-existing excess is trashed alongside it, not refused.
  // §17-1-3-2-5 (Rule Checks) confirms the cleanup happens as a state-based sweep AFTER the
  // fact ("Link cards for a Digimon that has exceeded the link limit — only the cards that
  // exceed link limit are trashed"), which is exactly what GameEngine's `trashExcessLinkCards`
  // rule-check pass already does on every fixpoint pass. So `runLink` must land the full
  // requested count here and let that sweep trim any excess, the same way the player-facing
  // `linkCard` verb (actions/link.ts) never gates on headroom either — both paths must agree.
  const chosen = await pickLoose(ctx, action.target, eligibleCandidates);
  if (chosen.length === 0) return;
  // Real link-cost calculation (the seam Phase 8's BT25-004/045 link-cost REDUCTION builds on).
  // Each link card carries a printed link cost ("Cost N" in linkRequirement); `costDelta` is a
  // signed adjustment ("with the cost reduced by N" => negative). Pay the floored cost per card
  // via the shared memory plumbing — the engine now HAS a link cost to reduce.
  for (const instanceId of chosen) {
    const cand = eligibleCandidates.find((c) => c.instanceId === instanceId);
    if (cand === undefined) continue;
    const def = ctx.game.definitionOf({ cardId: cand.cardId } as never);
    // The link cost combines the declaring action's own `costDelta` (BT25-045's baked self-link
    // reduction) with the RECIPIENT's continuous link-cost-reduction grant (BT25-004's cross-actor
    // rule implementation): when a [Social]/[Tool]/[Game] card would link to a granted
    // recipient, ANY actor's declaration is reduced. Per KB BT25-089 Q6423 the recipient grant does
    // not stack on one declaration (the store returns its largest single matching grant); both the
    // self delta and the recipient reduction are signed-summed and floored at 0 by linkCostOf.
    const cardTraits = [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
    const recipientReduction = ctx.game.linkCostReduction?.(recipientId, cardTraits) ?? 0;
    const cost = action.payCost === false ? 0 : linkCostOf(def, (action.costDelta ?? 0) - recipientReduction);
    if (cost > 0) ctx.fx.gainMemory(-cost);
  }
  await ctx.fx.link(recipientId, chosen);
}

/**
 * Printed link cost of a link card plus a signed `costDelta`, floored at 0. The base cost is
 * encoded in `CardDefinition.linkRequirement` as "Cost N" (e.g. "[Link] [Appmon] trait: Cost 1");
 * parseable "Cost N" is treated as cost 0.
 */
export function linkCostOf(def: CardDefinition, costDelta: number): number {
  const match = /Cost\s+(\d+)/i.exec(def.linkRequirement ?? "");
  const base = match ? Number(match[1]) : 0;
  return Math.max(0, base + costDelta);
}

/**
 * ＜Mind Link＞ — relocate this Tamer permanent under a chosen Digimon as the bottom
 * digivolution card when that Digimon has no Tamer cards in its digivolution cards.
 */
export async function runMindLink(ctx: EffectContext, action: Extract<Action, { kind: "MindLink" }>): Promise<void> {
  const tamer = ctx.source.permanent();
  if (tamer === undefined) {
    unsupported(ctx, action, "MindLink needs the source to be a battle-area Tamer");
    return;
  }
  if (!isTamer(ctx.source.definition)) {
    unsupported(ctx, action, "MindLink source must be a Tamer");
    return;
  }
  const filter: Filter = {
    controller: "mine",
    kind: ["Digimon"],
    excludeToken: true,
    ...action.target.filter,
  };
  const matches = (p: Permanent, f: Filter) => permanentMatchesFilter(ctx, p, f, ctx.source);
  const candidates = candidatePermanents(ctx, { ...action.target, filter }).filter((p) =>
    digimonEligibleForMindLink(p, filter, matches, ctx.game.definitionOf),
  );
  if (candidates.length === 0) return;
  const want = action.target.count === "all" ? candidates.length : action.target.count;
  let chosenIds: string[];
  if (candidates.length <= want) {
    chosenIds = candidates.map((p) => p.permanentId);
  } else {
    chosenIds = await ctx.ask.chooseTargets(ctx, {
      candidates: candidates.map((p) => p.permanentId),
      min: action.optional ? 0 : 1,
      max: want,
    });
  }
  if (chosenIds.length === 0) return;
  for (const digimonId of chosenIds) {
    await relocateByEffect(ctx, digimonId, tamer.permanentId, { belowTop: false });
  }
}
