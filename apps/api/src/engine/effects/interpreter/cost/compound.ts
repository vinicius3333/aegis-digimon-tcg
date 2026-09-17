import type { EffectContext } from "../../EffectContext.js";
import { candidateLooseInstances, pickLoose, zoneList } from "../targeting/loose.js";
import { candidatePermanents, resolvePermanentTargets } from "../targeting/permanents.js";
import { canPayCost } from "./canPay.js";
import { payCost } from "./pay.js";
import type { Cost, ZoneRef } from "@aegis/shared";

/**
 * Pay a `compound` cost: several costs that must all be paid, as one question.
 */
export async function payCompoundCost(
  ctx: EffectContext,
  cost: Cost,
  out?: { paidCount: number },
  opts?: { deferSuspendTriggers?: boolean },
): Promise<boolean> {
  if (cost.costs === undefined || cost.costs.length === 0) return false;
  if (!canPayCost(ctx, cost)) return false;
  if (cost.orderPlacedCards === true) {
    const first = cost.costs[0]!;
    if (ctx.fx.placeMixedMaterialsUnder === undefined || ctx.ask.orderCards === undefined || first.kind !== "place")
      return false;
    const allBottomPlacements = cost.costs.every(
      (nested) => nested.kind === "place" && nested.destination === "digivolutionStack" && nested.position === "bottom",
    );
    if (!allBottomPlacements || first.target === undefined || first.bindHostAs === undefined) return false;
    const paymentCtx = { ...ctx, selections: new Map(ctx.selections) };

    // A compound cost can contain several loose cards (for example BT25-096's
    // Gaogamon and MachGaogamon). They leave simultaneously, so collect all
    // selections before asking the controller for their bottom-stack order.
    if (first.targetIsPermanent !== true) {
      const hostTarget =
        first.host === "target" && first.underFilter !== undefined
          ? { filter: first.underFilter, orFilters: first.underOrFilters, count: 1 }
          : typeof first.host === "object" && first.host !== null
            ? first.host
            : undefined;
      if (hostTarget === undefined) return false;
      let hostId: string | undefined;
      const resolveHost = async () => {
        const hosts = await resolvePermanentTargets(paymentCtx, hostTarget);
        hostId = hosts.length === 1 ? hosts[0] : undefined;
        if (hostId !== undefined) paymentCtx.selections.set(first.bindHostAs!, hostId);
      };
      const chosen: string[] = [];
      const looseSelections: { cost: Cost; id: string }[] = [];
      if (first.host !== "target") {
        await resolveHost();
        if (hostId === undefined) return false;
      }
      for (const [index, nested] of cost.costs.entries()) {
        if (nested.kind !== "place" || nested.target === undefined || nested.targetIsPermanent === true) return false;
        // A printed `host: "target"` binds the destination only after the first loose
        // material is selected. This preserves the rules' payment order (material choice
        // precedes host choice) while still making later components address the bound host.
        if (first.host === "target" && index > 0 && hostId === undefined) await resolveHost();
        if (
          index > 0 &&
          (typeof nested.host !== "object" || nested.host === null || nested.host.filter.boundRef !== first.bindHostAs)
        )
          return false;
        const candidates = candidateLooseInstances(
          paymentCtx,
          nested.target,
          zoneList((nested.target.from ?? ["hand"]) as ZoneRef | ZoneRef[]),
        ).filter((candidate) => !chosen.includes(candidate.instanceId));
        const picked = await pickLoose(paymentCtx, nested.target, candidates);
        if (picked.length !== 1 || !candidates.some((candidate) => candidate.instanceId === picked[0])) return false;
        chosen.push(picked[0]!);
        looseSelections.push({ cost: nested, id: picked[0]! });
      }
      if (hostId === undefined) await resolveHost();
      if (hostId === undefined) return false;
      const ordered = await ctx.ask.orderCards(paymentCtx, {
        candidates: chosen,
        visibleCards: chosen.map((instanceId) => {
          const candidate = looseSelections
            .map(({ cost: nested }) =>
              candidateLooseInstances(
                paymentCtx,
                nested.target!,
                zoneList((nested.target!.from ?? ["hand"]) as ZoneRef | ZoneRef[]),
              ),
            )
            .flat()
            .find((entry) => entry.instanceId === instanceId);
          return { instanceId, cardId: candidate?.cardId ?? instanceId };
        }),
        destination: "stackBottom",
      });
      if (
        ordered.length !== chosen.length ||
        new Set(ordered).size !== chosen.length ||
        ordered.some((id) => !chosen.includes(id))
      )
        return false;
      if (
        !candidatePermanents(ctx, hostTarget).some((permanent) => permanent.permanentId === hostId) ||
        looseSelections.some(
          ({ cost: nested, id }) =>
            !candidateLooseInstances(
              paymentCtx,
              nested.target!,
              zoneList((nested.target!.from ?? ["hand"]) as ZoneRef | ZoneRef[]),
            ).some((candidate) => candidate.instanceId === id),
        )
      )
        return false;
      const moved = await ctx.fx.placeMixedMaterialsUnder(hostId, ordered);
      if (moved.length !== ordered.length || moved.some((card, index) => card.instanceId !== ordered[index]))
        return false;
      ctx.selections ??= new Map();
      ctx.selections.set(first.bindHostAs, hostId);
      ctx.lastPlacedUnderInstanceIds = ordered;
      ctx.lastEffectActed = true;
      if (out) out.paidCount = ordered.length;
      return true;
    }
    if (first.underFilter === undefined) return false;
    const sources = await resolvePermanentTargets(paymentCtx, first.target);
    if (sources.length !== 1) return false;
    const hosts = await resolvePermanentTargets(paymentCtx, {
      filter: first.underFilter,
      orFilters: first.underOrFilters,
      count: 1,
    });
    const hostId = hosts[0];
    if (hosts.length !== 1 || hostId === sources[0]) return false;
    paymentCtx.selections.set(first.bindHostAs, hostId!);
    const source = ctx.game.permanentById(sources[0]!);
    if (source?.topCard === undefined) return false;
    const chosen = [source.topCard.instanceId];
    const looseSelections: { cost: Cost; id: string }[] = [];
    for (const nested of cost.costs.slice(1)) {
      if (
        nested.target === undefined ||
        nested.targetIsPermanent === true ||
        typeof nested.host !== "object" ||
        nested.host === null ||
        nested.host.filter.boundRef !== first.bindHostAs
      )
        return false;
      const candidates = candidateLooseInstances(
        paymentCtx,
        nested.target,
        zoneList((nested.target.from ?? ["hand"]) as ZoneRef | ZoneRef[]),
      ).filter((candidate) => !chosen.includes(candidate.instanceId));
      const picked = await pickLoose(paymentCtx, nested.target, candidates);
      if (picked.length !== 1 || !candidates.some((candidate) => candidate.instanceId === picked[0])) return false;
      chosen.push(picked[0]!);
      looseSelections.push({ cost: nested, id: picked[0]! });
    }
    const ordered = await ctx.ask.orderCards(paymentCtx, {
      candidates: chosen,
      visibleCards: chosen.map((instanceId) => ({
        instanceId,
        cardId:
          instanceId === source.topCard.instanceId
            ? source.topCard.cardId
            : (candidateLooseInstances(paymentCtx, { filter: {}, count: "all" }, ["trash", "hand"]).find(
                (candidate) => candidate.instanceId === instanceId,
              )?.cardId ?? instanceId),
      })),
      destination: "stackBottom",
    });
    if (
      ordered.length !== chosen.length ||
      new Set(ordered).size !== chosen.length ||
      ordered.some((id) => !chosen.includes(id))
    )
      return false;
    // Choices await user input; revalidate every original source and host before payment.
    if (
      !candidatePermanents(ctx, first.target).some(
        (permanent) => permanent.permanentId === sources[0] && permanent.topCard?.instanceId === chosen[0],
      ) ||
      !candidatePermanents(ctx, { filter: first.underFilter, orFilters: first.underOrFilters, count: 1 }).some(
        (permanent) => permanent.permanentId === hostId,
      ) ||
      looseSelections.some(
        ({ cost: nested, id }) =>
          !candidateLooseInstances(
            paymentCtx,
            nested.target!,
            zoneList((nested.target!.from ?? ["hand"]) as ZoneRef | ZoneRef[]),
          ).some((candidate) => candidate.instanceId === id),
      )
    )
      return false;
    const moved = await ctx.fx.placeMixedMaterialsUnder(hostId!, ordered);
    if (moved.length !== ordered.length || moved.some((card, index) => card.instanceId !== ordered[index]))
      return false;
    ctx.selections ??= new Map();
    ctx.selections.set(first.bindHostAs, hostId!);
    ctx.lastPlacedUnderInstanceIds = ordered;
    ctx.lastEffectActed = true;
    if (out) out.paidCount = ordered.length;
    return true;
  }
  if (cost.orderReturnedCards === true && cost.costs.every((nested) => nested.kind === "return")) {
    const chosen: string[] = [];
    for (const nested of cost.costs) {
      if (nested.target === undefined) return false;
      const candidates = candidateLooseInstances(ctx, nested.target, ["trash"]);
      const min = nested.target.upTo === true ? 0 : 1;
      const decisionCtx = ctx.activeTiming === "WhenAttacking" ? { ...ctx, activeTiming: "OnAllyAttack" } : ctx;
      const picked = await decisionCtx.ask.selectCards(decisionCtx, {
        candidates: candidates.map((candidate) => candidate.instanceId),
        min,
        max: Math.min(
          nested.target.count === "all" ? candidates.length : (nested.target.count ?? 1),
          candidates.length,
        ),
        visible: candidateLooseInstances(ctx, { filter: { zone: "trash" }, count: "all" }, ["trash"]).map(
          (candidate) => candidate.instanceId,
        ),
        visibleCards: candidateLooseInstances(ctx, { filter: { zone: "trash" }, count: "all" }, ["trash"]).map(
          (candidate) => ({ instanceId: candidate.instanceId, cardId: candidate.cardId }),
        ),
      });
      if (picked.length < min) return false;
      if (nested.stopIfZero === true && picked.length === 0) return false;
      chosen.push(...picked);
    }
    if (chosen.length > 1) {
      const decisionCtx = ctx.activeTiming === "WhenAttacking" ? { ...ctx, activeTiming: "OnAllyAttack" } : ctx;
      const ordered =
        (await decisionCtx.ask.orderCards?.(decisionCtx, {
          candidates: chosen,
          visibleCards: chosen.map((instanceId) => {
            const card = candidateLooseInstances(ctx, { filter: { zone: "trash" }, count: "all" }, ["trash"]).find(
              (candidate) => candidate.instanceId === instanceId,
            );
            return { instanceId, cardId: card?.cardId ?? instanceId };
          }),
          destination: "deckBottom",
        })) ?? chosen;
      await ctx.fx.returnToDeck(ordered, { toTop: false });
    } else if (chosen.length === 1) {
      await ctx.fx.returnToDeck(chosen, { toTop: false });
    }
    return true;
  }
  for (const nested of cost.costs) {
    const nestedOut = { paidCount: 0 };
    if (!(await payCost(ctx, nested, nestedOut, opts))) return false;
    if (nested.stopIfZero === true && nestedOut.paidCount === 0) return false;
  }
  return true;
}
