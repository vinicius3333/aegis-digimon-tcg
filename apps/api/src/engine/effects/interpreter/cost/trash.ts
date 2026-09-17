import type { EffectContext } from "../../EffectContext.js";
import { permanentMatchesFilter, seatsForController } from "../matching/permanent.js";
import { LooseCandidate, candidateLooseInstances, pickLoose } from "../targeting/loose.js";
import { resolvePermanentTargets, topInstanceIds } from "../targeting/permanents.js";
import { bindLooseCostSelection } from "./candidates.js";
import { payTrashStackCost } from "./trashStack.js";
import { CardKind, getCardDefinition } from "@aegis/shared";
import type { Cost, Permanent, Target } from "@aegis/shared";

/**
 * Pay a `trash` cost. Each branch below is one zone the printed cost can name;
 * the order is the detection order, ending in the permanent-target fallback.
 */
export async function payTrashCost(ctx: EffectContext, cost: Cost, out?: { paidCount: number }): Promise<boolean> {
  if (cost.target?.from?.includes("hand") && cost.target.from.includes("digivolutionCards")) {
    const filter = { ...cost.target.filter, zone: undefined };
    const candidates = candidateLooseInstances(ctx, { ...cost.target, filter }, ["hand", "digivolutionCards"]);
    const want = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
    if (want <= 0 || candidates.length < want) return false;
    const chosen = await pickLoose(ctx, { ...cost.target, filter, count: want }, candidates);
    if (chosen.length !== want) return false;
    const moved = await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
    if (out) out.paidCount = moved.length;
    return moved.length === want;
  }
  if (!cost.target) return false;
  // "By trashing (the top/bottom card of) your/their security stack" — a SECURITY-trash
  // compiler does not always tag the filter with zone:"security" (BT18-082's "by trashing
  // the bottom card of your security stack"), so the raw description is the fallback
  // detector; "bottom" in the raw selects the bottom end (fromTop:false).
  if (cost.target.filter.zone === "security" || /security stack/i.test(cost.raw ?? "")) {
    const seat =
      cost.target.filter.controller === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
    let n = cost.target.count === "all" ? ctx.game.player(seat).security.length : cost.target.count;
    if (cost.target.upTo === true) {
      const cap = Math.min(n, ctx.game.player(seat).security.length);
      n = await ctx.ask.chooseOption(
        ctx,
        Array.from({ length: cap + 1 }, (_, count) => `Trash ${count} security`),
      );
      if (n === 0) {
        if (out) out.paidCount = 0;
        return true;
      }
    }
    if (n <= 0 || ctx.game.player(seat).security.length < n) return false;
    // "the top OR bottom card" is a CONTROLLER CHOICE, not a fixed end (BT15-003, BT8-044):
    // prompt per trashed card via the shared binary-choice helper (index 0 = top, 1 = bottom),
    // mirroring the place-cost "choice" path below. Detected via filter.position or the raw
    // text; without this the `bottom`-in-raw branch silently trashed the bottom with no prompt.
    const raw = cost.raw ?? "";
    const isChoice = /\btop\s+or\s+bottom\b|\bbottom\s+or\s+top\b/i.test(raw);
    if (isChoice) {
      for (let i = 0; i < n; i++) {
        const idx = await ctx.ask.chooseOption(ctx, ["top", "bottom"]);
        await ctx.fx.trashFromSecurity(seat, 1, { fromTop: idx === 0 });
      }
      return true;
    }
    // Honor filter.position when present; fall back to raw-text detection for prose-compiled IR.
    const isBottom =
      cost.target.filter.position === "bottom" || (cost.target.filter.position === undefined && /bottom/i.test(raw));
    const moved = await ctx.fx.trashFromSecurity(seat, n, { fromTop: !isBottom });
    if (out) out.paidCount = moved.length;
    return true;
  }
  // "By trashing 1 of your Digimon's link cards" (BT25-073) — the cost trashes a ＜Link＞
  // card sitting in a HOST permanent's `linked` list. `filter.zone === "linked"` selects
  // the link cards; the remaining filter fields (kind/controller/isSelfRef) constrain the
  // HOST permanent, NOT the link card itself. Enumerate the matching hosts' link cards, let
  // the controller pick, then route through `ctx.fx.trash` — which removes each chosen card
  // from its host's `.linked` ArraySchema and moves it to the OWNER's trash (firing
  // whenLinkTrashed). An empty pool fails the cost (unmet optional-processing condition).
  if (cost.target.filter.zone === "linked" || cost.target.filter.zone === "digivolutionCardsOrLinkCards") {
    const linkTarget = cost.target;
    const { zone: _linkZone, ...hostFilter } = linkTarget.filter;
    const selfHost = linkTarget.filter.isSelfRef === true;
    const hosts: Permanent[] = [];
    if (selfHost) {
      const self = ctx.source.permanent();
      if (self !== undefined) hosts.push(self);
    } else if (linkTarget.filter.zone === "digivolutionCardsOrLinkCards") {
      for (const seat of seatsForController(ctx, linkTarget.filter)) {
        for (const permanent of ctx.game.player(seat).battleArea) {
          if (
            permanent.topCard !== undefined &&
            getCardDefinition(permanent.topCard.cardId)?.kinds.includes(CardKind.Digimon)
          ) {
            hosts.push(permanent);
          }
        }
      }
    } else {
      for (const seat of seatsForController(ctx, linkTarget.filter)) {
        for (const permanent of ctx.game.player(seat).battleArea) {
          if (permanentMatchesFilter(ctx, permanent, hostFilter, ctx.source)) hosts.push(permanent);
        }
      }
    }
    const candidates: LooseCandidate[] = [];
    const candidateZones = new Map<string, "digivolutionCards" | "linked">();
    if (cost.target.filter.zone === "digivolutionCardsOrLinkCards") {
      const stackCandidates = candidateLooseInstances(
        ctx,
        { ...cost.target, filter: { ...cost.target.filter, zone: "digivolutionCards" } },
        ["digivolutionCards"],
      );
      candidates.push(...stackCandidates);
      for (const candidate of stackCandidates) candidateZones.set(candidate.instanceId, "digivolutionCards");
    }
    for (const host of hosts) {
      for (const c of host.linked) {
        candidates.push({
          instanceId: c.instanceId,
          cardId: c.cardId,
          ownerSeat: c.ownerSeat,
          hostPermanentId: host.permanentId,
        });
        candidateZones.set(c.instanceId, "linked");
      }
    }
    const n = linkTarget.count === "all" ? candidates.length : linkTarget.count;
    if (n <= 0 || candidates.length < n) return false;
    const chosen = await pickLoose(
      ctx,
      {
        ...linkTarget,
        count: n,
        filter: { ...linkTarget.filter, zone: undefined },
      },
      candidates,
    );
    if (chosen.length < n) return false;
    // A simultaneous trigger may have selected this card from a snapshot taken before an
    // earlier trigger moved it. Never let that stale id fall through `trash`, whose global
    // lookup could otherwise find a same-id card in hand or another host. The cost is
    // atomic: every selected id must be unique and still occupy its original host zone.
    if (new Set(chosen).size !== n) return false;
    const selectedCandidates = chosen.map((instanceId) =>
      candidates.find((candidate) => candidate.instanceId === instanceId),
    );
    if (selectedCandidates.some((candidate) => candidate === undefined)) return false;
    const selectedStillLive = selectedCandidates.every((candidate) => {
      const hostId = candidate!.hostPermanentId;
      const host = hostId === undefined ? undefined : ctx.game.permanentById(hostId);
      const origin = candidateZones.get(candidate!.instanceId);
      if (host === undefined || origin === undefined) return false;
      return origin === "linked"
        ? host.linked.some((card) => card.instanceId === candidate!.instanceId)
        : host.stack.some((card) => card.instanceId === candidate!.instanceId);
    });
    if (!selectedStillLive) return false;
    const moved = await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
    const movedIds = new Set(moved.map((card) => card.instanceId));
    if (moved.length !== n || chosen.some((instanceId) => !movedIds.has(instanceId))) return false;
    if (out) out.paidCount = moved.length;
    return true;
  }
  const stackPaid = await payTrashStackCost(ctx, cost, out);
  if (stackPaid !== undefined) return stackPaid;
  // "By trashing the top N cards of your deck" (P-011): deck cards are loose
  // instances, so they cannot go through the permanent-target fallback below.
  // The top is deterministic and the cost is all-or-nothing.
  if (cost.target.filter.zone === "deck") {
    const seat =
      cost.target.filter.controller === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
    const deck = ctx.game.player(seat).deck;
    const n = cost.target.count === "all" ? deck.length : cost.target.count;
    if (n <= 0 || deck.length < n) return false;
    const topCards = Array.from(deck).slice(0, n);
    const chosen = topCards.map((card) => card.instanceId);
    const moved = await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
    const movedIds = new Set(moved.map((card) => card.instanceId));
    const milled = topCards.filter((card) => movedIds.has(card.instanceId));
    if (milled.length > 0) {
      await ctx.fx.fireOnDiscardLibrary(
        seat,
        milled.map((card) => card.instanceId),
      );
      for (const card of milled) {
        await ctx.fx.fireWhenTrashedFromDeck(card.cardId, card.instanceId, ctx.source.cardId);
      }
    }
    if (out) out.paidCount = moved.length;
    return true;
  }
  // "By trashing N card(s) from your hand" (BT24-088 OnPlay): resolve
  // loose hand cards matching the cost's filter. Hand costs are
  // detected via an explicit zone:"hand" filter or the raw description.
  const isHandCost = cost.target.filter.zone === "hand" || /(?:from|in) (?:your|their) hand/i.test(cost.raw ?? "");
  if (isHandCost) {
    const handTarget: Target = { ...cost.target, filter: { ...cost.target.filter, zone: "hand" } };
    const candidates = candidateLooseInstances(ctx, handTarget, ["hand"]);
    if (candidates.length === 0) return false;
    // "By trashing up to N cards from your hand" (EX6-060): the controller chooses
    // how many (1..N, capped at the matching hand cards); the paid count drives the
    // parent action's scaling, mirroring the upTo Digi-Burst branch above.
    if (cost.target.upTo === true) {
      const max = cost.target.count === "all" ? candidates.length : cost.target.count;
      const cap = Math.min(max, candidates.length);
      if (cap < 1) return false;
      const candidateIds = candidates.map((c) => c.instanceId);
      const allowZero = (cost.target as Target & { allowZero?: boolean }).allowZero === true;
      const chosen = await ctx.ask.selectCards(ctx, { candidates: candidateIds, min: allowZero ? 0 : 1, max: cap });
      if (chosen.length < 1) return false;
      const moved = await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
      ctx.lastTrashedCards = moved.map((card) => ({
        instanceId: card.instanceId,
        cardId: card.cardId,
        dp: ctx.game.definitionOf(card).dp ?? 0,
      }));
      if (cost.storeAs !== undefined && moved.length > 0) {
        const level = ctx.game.definitionOf(moved[0]!).level;
        if (level !== undefined && level > 0) {
          ctx.namedCounts ??= new Map();
          ctx.namedCounts.set(cost.storeAs, level);
        }
      }
      if (out) out.paidCount = moved.length;
      if (moved.length >= 1)
        bindLooseCostSelection(
          ctx,
          cost.bindResultAs,
          candidates,
          moved.map((card) => card.instanceId),
        );
      return moved.length >= 1;
    }
    const want = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
    if (candidates.length < want) return false;
    // Where this cost is the clause's only question, the selection is always asked —
    // never auto-taken from a hand with exactly one match — and it may be answered with
    // nothing, which declines the whole clause.
    const chosen = ctx.costIsTheQuestion
      ? await ctx.ask.selectCards(ctx, {
          candidates: candidates.map((candidate) => candidate.instanceId),
          min: 0,
          max: want,
        })
      : await pickLoose(ctx, { ...handTarget, count: want }, candidates);
    if (chosen.length < want) return false;
    const moved = await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
    ctx.lastTrashedCards = moved.map((card) => ({
      instanceId: card.instanceId,
      cardId: card.cardId,
      dp: ctx.game.definitionOf(card).dp ?? 0,
    }));
    if (cost.storeAs !== undefined && moved.length > 0) {
      const level = ctx.game.definitionOf(moved[0]!).level;
      if (level !== undefined && level > 0) {
        ctx.namedCounts ??= new Map();
        ctx.namedCounts.set(cost.storeAs, level);
      }
    }
    if (out) out.paidCount = moved.length;
    if (moved.length === want)
      bindLooseCostSelection(
        ctx,
        cost.bindResultAs,
        candidates,
        moved.map((card) => card.instanceId),
      );
    return moved.length === want;
  }
  // A security-/hand-/trash-resident effect can pay "by trashing this card" while its
  // source is a loose instance rather than a permanent (ST22-10's face-up security
  // replacement). Permanent target resolution cannot see that source, so route the exact
  // self instance through the zone-agnostic trash primitive and require an actual move.
  if (cost.target.filter.isSelfRef === true && ctx.source.permanent() === undefined) {
    const moved = await ctx.fx.trash([ctx.source.instanceId], { byEffectSeat: ctx.source.ownerSeat });
    if (out) out.paidCount = moved.length;
    return moved.some((card) => card.instanceId === ctx.source.instanceId);
  }
  const ids = topInstanceIds(ctx, await resolvePermanentTargets(ctx, cost.target));
  if (ids.length === 0) return false;
  await ctx.fx.trash(ids, { byEffectSeat: ctx.source.ownerSeat });
  return true;
}
