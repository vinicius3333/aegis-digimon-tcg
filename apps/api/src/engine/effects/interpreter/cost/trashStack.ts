import type { EffectContext } from "../../EffectContext.js";
import { definitionMatches } from "../matching/definition.js";
import { LooseCandidate, candidateLooseInstances, pickLoose, zoneList } from "../targeting/loose.js";
import { getCardDefinition } from "@aegis/shared";
import type { Cost, Filter } from "@aegis/shared";

/**
 * "By trashing N of this Digimon's digivolution cards" — `undefined` when the
 * cost is not a stack-card trash, so the caller keeps looking.
 */
export async function payTrashStackCost(
  ctx: EffectContext,
  cost: Cost,
  out?: { paidCount: number },
): Promise<boolean | undefined> {
  // The caller has already failed a targetless cost; re-stated so this reads alone.
  if (!cost.target) return undefined;
  // "By trashing N of this Digimon's digivolution cards" (BT17-057, EX10-055) — an
  // all-or-nothing cost paid from the SOURCE permanent's digivolution stack. Take N
  // stack cards (from the top of the stack); requires at least N to be present.
  // When `isSelfRef` is set, restrict to the source's OWN stack (Digi-Burst etc.).
  // Without `isSelfRef` (e.g. BT21-054 "any of your Digimon's digivolution cards"),
  // scan all controller permanents via candidateLooseInstances instead.
  const trashStackZone = cost.target.filter.zone;
  const trashesStackCards =
    trashStackZone === "digivolutionCards" ||
    (Array.isArray(trashStackZone) && trashStackZone.includes("digivolutionCards")) ||
    (cost.target.filter.isSelfRef === true &&
      (cost.target.filter.faceDown !== undefined || cost.target.filter.position !== undefined)) ||
    cost.target.from?.includes("digivolutionCards") === true ||
    trashStackZone === "underMyTamers" ||
    trashStackZone === "underTamers" ||
    trashStackZone === "underTamer" ||
    trashStackZone === "underThisTamer" ||
    trashStackZone === "digivolutionCardsUnderTamers";
  if (trashesStackCards) {
    const boundHostRef = (cost.target.filter as Filter & { boundTo?: string }).boundTo;
    if (boundHostRef !== undefined) {
      const hostId = ctx.selections?.get(boundHostRef);
      const host = hostId === undefined ? undefined : ctx.game.permanentById(hostId);
      if (host === undefined) return false;
      const { zone: _zone, boundTo: _boundTo, ...cardFilter } = cost.target.filter as Filter & { boundTo?: string };
      const candidates = host.stack
        .filter((card) => definitionMatches(cardFilter, ctx.game.definitionOf(card)))
        .filter((card) => ctx.fx.canTrashDigivolutionCard?.(card.instanceId) !== false)
        .map((card) => ({
          instanceId: card.instanceId,
          cardId: card.cardId,
          ownerSeat: card.ownerSeat,
          hostPermanentId: host.permanentId,
          faceUp: card.faceUp,
        }));
      const n = cost.target.count === "all" ? candidates.length : cost.target.count;
      if (n <= 0 || candidates.length < n) return false;
      const chosen = await pickLoose(ctx, { ...cost.target, count: n }, candidates);
      if (chosen.length < n) return false;
      const moved = await ctx.fx.trashDigivolutionCards(host.permanentId, chosen, {
        byEffectSeat: ctx.source.ownerSeat,
        byEffectCardId: ctx.source.cardId,
      });
      if (moved.length !== n) return false;
      if (out) out.paidCount = moved.length;
      return true;
    }
    if (cost.target.filter.isSelfRef === true) {
      const self = ctx.source.permanent();
      if (self === undefined) return false;
      const isDigiBurst = /Digi-?Burst/i.test(cost.raw ?? "");
      // "<Digi-Burst up to N>" (BT7-040): the controller chooses how many (1..N, capped at
      // the stack size) to trash; at least 1 is required to activate (KB Q1569). The paid
      // count is recorded so the parent action can scale by it (-3000 per card trashed).
      if (cost.target.upTo === true) {
        const candidateIds = self.stack
          .filter((card) => ctx.fx.canTrashDigivolutionCard?.(card.instanceId) !== false)
          .map((card) => card.instanceId);
        const max = cost.target.count === "all" ? candidateIds.length : cost.target.count;
        const cap = Math.min(max, candidateIds.length);
        const minimum = Math.max(1, cost.target.minimum ?? 1);
        if (cap < minimum) return false;
        const chosen = await ctx.ask.selectCards(ctx, { candidates: candidateIds, min: minimum, max: cap });
        // Validate the entire physical payment before the first mutation.
        if (
          chosen.length < minimum ||
          chosen.length > cap ||
          new Set(chosen).size !== chosen.length ||
          chosen.some((id) => !candidateIds.includes(id))
        )
          return false;
        const moved = await ctx.fx.trashDigivolutionCards(self.permanentId, chosen, {
          byEffectSeat: ctx.source.ownerSeat,
          byEffectCardId: ctx.source.cardId,
          isDigiBurst,
        });
        if (moved.length !== chosen.length) return false;
        if (out) out.paidCount = moved.length;
        return true;
      }
      // Redirect BEFORE computing which cards to take (KB BT10-084 Q2006: "by choosing 5
      // digivolution cards of THIS Digimon" — this exact cost shape — gets redirected when
      // `self` is a DIFFERENT Digimon than the reacting one). `n`/`stackIds` are then
      // recomputed against the (possibly redirected) host, preserving the paid count.
      const redirected = await ctx.fx.redirectDigivolutionTrashHosts([self.permanentId]);
      const hostId = redirected[0] ?? self.permanentId;
      const host = hostId === self.permanentId ? self : ctx.game.permanentById(hostId);
      if (host === undefined) return false;
      const n = cost.target.count === "all" ? host.stack.length : cost.target.count;
      if (n <= 0) return false;
      const { zone: _zone, isSelfRef: _isSelfRef, controller: _controller, ...stackCardFilter } = cost.target.filter;
      let eligible: LooseCandidate[] = Array.from(host.stack)
        .filter((card) => cost.target!.filter.faceDown !== true || !card.faceUp)
        .filter((card) => definitionMatches(stackCardFilter, ctx.game.definitionOf(card)))
        .filter((card) => ctx.fx.canTrashDigivolutionCard?.(card.instanceId) !== false)
        .map((card) => ({
          instanceId: card.instanceId,
          cardId: card.cardId,
          ownerSeat: card.ownerSeat,
          hostPermanentId: host.permanentId,
        }));
      // "Trash 2 cards of the same level" (BT9-024): don't expose an isolated-level
      // stack card as a payable UI candidate. Multiple valid level groups remain visible,
      // but every offered card now belongs to at least one legal pair.
      const requiresSameLevelPair = (cost.target.filter as Filter & { sameLevelPair?: boolean }).sameLevelPair === true;
      if (requiresSameLevelPair) {
        eligible = eligible.filter((card) => card.faceUp !== false);
        const levelCounts = new Map<number, number>();
        for (const card of eligible) {
          const level = getCardDefinition(card.cardId)?.level;
          if (level !== undefined) levelCounts.set(level, (levelCounts.get(level) ?? 0) + 1);
        }
        eligible = eligible.filter((card) => {
          const level = getCardDefinition(card.cardId)?.level;
          return level !== undefined && (levelCounts.get(level) ?? 0) >= 2;
        });
      }
      if (eligible.length < n) return false;
      const stackIds =
        eligible.length === n
          ? eligible.map((card) => card.instanceId)
          : await pickLoose(ctx, { ...cost.target, count: n }, eligible);
      if (stackIds.length < n) return false;
      // Candidate filtering alone cannot prevent a hostile client from mixing cards from
      // two different valid level groups. Revalidate the submitted payment server-side.
      if (requiresSameLevelPair) {
        const selectedLevels = stackIds.map((id) => {
          const card = host.stack.find(({ instanceId }) => instanceId === id);
          return card === undefined ? undefined : ctx.game.definitionOf(card).level;
        });
        if (selectedLevels.some((level) => level === undefined) || new Set(selectedLevels).size !== 1) return false;
      }
      const moved = await ctx.fx.trashDigivolutionCards(host.permanentId, stackIds, {
        byEffectSeat: ctx.source.ownerSeat,
        byEffectCardId: ctx.source.cardId,
        isDigiBurst,
      });
      if (moved.length !== n) return false;
      if (out) out.paidCount = n;
      return true;
    }
    // "By trashing N card(s) from ANY of your Digimon's digivolution cards" (BT21-054),
    // or from under your Tamers (BT25-029): scan stacked-card zones, honoring host/zone
    // filters. Route through trashDigivolutionCards so stack-trash watchers fire.
    // "all" means "pay with every matching candidate", i.e. n = candidates.length —
    // NOT Infinity (a finite pool is never >= Infinity, which made every "all"-shaped
    // cost unpayable; engine-audit finding 6). An empty pool is unpayable outright
    // (n <= 0), matching the isSelfRef branch above.
    // `upTo` (with its optional `minimum`) makes the printed count a MAXIMUM: "by trashing
    // up to 3 ... from any of your Digimon's digivolution cards" (EX10-033) is payable with
    // 1 or 2 candidates, and with 4 the controller still chooses how many. Reading
    // `count` as a hard requirement made it an all-or-nothing 3 — the `isSelfRef` branch
    // above already reads `upTo` this way.
    const zones = trashStackZone === undefined ? ["digivolutionCards" as const] : zoneList(trashStackZone);
    let candidates = candidateLooseInstances(ctx, cost.target, zones);
    const requested = cost.target.count === "all" ? candidates.length : cost.target.count;
    if (requested <= 0) return false;
    const isUpTo = cost.target.upTo === true;
    const n = isUpTo ? Math.min(requested, candidates.length) : requested;
    const minCount = isUpTo ? (cost.target.minimum ?? 0) : requested;
    if (candidates.length < minCount || n < minCount) return false;
    if (cost.target.filter.sameHost === true) {
      const byHost = new Map<string, LooseCandidate[]>();
      for (const candidate of candidates) {
        if (candidate.hostPermanentId === undefined) continue;
        const group = byHost.get(candidate.hostPermanentId) ?? [];
        group.push(candidate);
        byHost.set(candidate.hostPermanentId, group);
      }
      const requiresSameLevelPair = cost.target.filter.sameLevelPair === true;
      const eligibleHosts = [...byHost.entries()].filter(([, group]) => {
        if (!requiresSameLevelPair) return group.length >= minCount;
        const levels = new Map<number, number>();
        for (const candidate of group) {
          if (candidate.faceUp === false) continue;
          const level = getCardDefinition(candidate.cardId)?.level;
          if (level !== undefined) levels.set(level, (levels.get(level) ?? 0) + 1);
        }
        return [...levels.values()].some((count) => count >= minCount);
      });
      if (eligibleHosts.length === 0) return false;
      const hostId =
        eligibleHosts.length === 1
          ? eligibleHosts[0]![0]
          : (
              await ctx.ask.chooseTargets(ctx, {
                candidates: eligibleHosts.map(([id]) => id),
                min: 1,
                max: 1,
              })
            )[0];
      if (hostId === undefined) return false;
      candidates = byHost.get(hostId) ?? [];
      if (requiresSameLevelPair) {
        candidates = candidates.filter((candidate) => candidate.faceUp !== false);
        const levels = new Map<number, number>();
        for (const candidate of candidates) {
          const level = getCardDefinition(candidate.cardId)?.level;
          if (level !== undefined) levels.set(level, (levels.get(level) ?? 0) + 1);
        }
        candidates = candidates.filter((candidate) => {
          const level = getCardDefinition(candidate.cardId)?.level;
          return level !== undefined && (levels.get(level) ?? 0) >= minCount;
        });
      }
      if (cost.bindHostAs !== undefined) {
        ctx.selections ??= new Map();
        ctx.selections.set(cost.bindHostAs, hostId);
      }
    }
    const chosen = await pickLoose(ctx, { ...cost.target, count: n }, candidates);
    if (chosen.length < minCount) return false;
    if (cost.target.filter.sameLevelPair === true) {
      const selectedLevels = chosen.map((id) => {
        const candidate = candidates.find((entry) => entry.instanceId === id);
        return candidate === undefined ? undefined : getCardDefinition(candidate.cardId)?.level;
      });
      if (selectedLevels.some((level) => level === undefined) || new Set(selectedLevels).size !== 1) return false;
    }
    const byHost = new Map<string, string[]>();
    const loose: string[] = [];
    for (const id of chosen) {
      const entry = candidates.find((c) => c.instanceId === id);
      if (entry?.hostPermanentId === undefined) {
        loose.push(id);
        continue;
      }
      const bucket = byHost.get(entry.hostPermanentId) ?? [];
      bucket.push(id);
      byHost.set(entry.hostPermanentId, bucket);
    }
    if (loose.length === 0) {
      const selections = [...byHost].flatMap(([hostPermanentId, instanceIds]) =>
        instanceIds.map((instanceId) => ({ hostPermanentId, instanceId })),
      );
      if (ctx.fx.trashDigivolutionCardsAtomic !== undefined) {
        const moved = await ctx.fx.trashDigivolutionCardsAtomic(selections, chosen.length, {
          byEffectSeat: ctx.source.ownerSeat,
        });
        if (moved.length !== chosen.length) return false;
      } else {
        // Lightweight/internal primitive implementations may predate the atomic seam.
        // Preserve the per-host watcher path for them; production uses the atomic
        // operation above so leave replacements cannot partially pay the cost.
        let movedCount = 0;
        for (const [hostId, ids] of byHost) {
          const moved = await ctx.fx.trashDigivolutionCards(hostId, ids, {
            byEffectSeat: ctx.source.ownerSeat,
          });
          movedCount += moved.length;
        }
        if (movedCount !== chosen.length) return false;
      }
    } else {
      if (chosen.some((instanceId) => ctx.fx.canTrashDigivolutionCard?.(instanceId) === false)) return false;
      for (const [hostId, ids] of byHost) {
        await ctx.fx.trashDigivolutionCards(hostId, ids, { byEffectSeat: ctx.source.ownerSeat });
      }
      await ctx.fx.trash(loose, { byEffectSeat: ctx.source.ownerSeat });
    }
    if (out) out.paidCount = chosen.length;
    return true;
  }
  return undefined;
}
