// The Digivolve action and its legality preflight.

import {
  matchingAlternateDigivolutionRequirement,
  matchingEvoCost,
  matchingEvoCostIgnoringLevel,
} from "../../../cards/cardData.js";
import type { EffectContext } from "../../EffectContext.js";
import { unsupported } from "../errors.js";
import { scaleFactor } from "../scaling.js";
import { canPayCost } from "../costs.js";
import { LooseCandidate, candidateLooseInstances, looseCardsInZone, pickLoose } from "../targeting/loose.js";
import { candidatePermanents, resolvePermanentTargets } from "../targeting/permanents.js";
import type { Action, CardColor, Filter, Target, ZoneRef } from "@aegis/shared";

/**
 * Effect-driven digivolve ("this Digimon may digivolve into [X] in the hand without
 * paying the cost"). `target` is the permanent that digivolves (self or a filtered
 * battle-area Digimon); `into` is the filter for the card to play from the controller's
 * hand/trash. Resolve the digivolving permanent and the source card, then stack it via
 * the digivolve-from-effect primitive.
 */
/**
 * Is `instanceId` a security card that is currently FACE DOWN? Scans both players' security
 * stacks; a card found face-up (or not in any security stack at all, e.g. a hand/trash source)
 * returns false. Used to exclude face-down security cards from a face-up-security digivolve
 * source.
 */
function isFaceDownSecurityCard(ctx: EffectContext, instanceId: string): boolean {
  for (const player of ctx.game.state.players) {
    const card = player.security.find((c) => c.instanceId === instanceId);
    if (card !== undefined) return card.faceUp !== true;
  }
  return false;
}

/**
 * The subset of `pool` that `basePermanentId` may legally digivolve into.
 *
 * Unless requirements are explicitly waived, the base must satisfy the into-card's digivolution
 * requirement (printed EvoCost color+level, or an alternate trait/name/level path) — this holds
 * whether or not the digivolution cost is paid: waiving the memory cost ("without paying the
 * cost") does NOT waive the requirement; only "ignoring its digivolution requirements" does.
 * Without this gate the `into` filter alone (a trait/name match like "[Titan]") would offer
 * level-illegal targets — e.g. a Lv.6 base digivolving into a Lv.4 [Titan] from the trash
 * (BT24-009's inherited path). Mirrors the authoritative gate in digivolveFromInstance; the
 * selection prompt must not present picks the primitive will reject server-side.
 */
function legalIntoCandidates(
  ctx: EffectContext,
  basePermanentId: string,
  pool: LooseCandidate[],
  enforceRequirements: boolean,
  digivolutionCostMax?: number,
  ignoreLevel = false,
  virtualBase?: { level: number; colors: CardColor[] },
): LooseCandidate[] {
  const base = ctx.game.permanentById(basePermanentId);
  const actualBaseDef = base?.topCard ? ctx.game.definitionOf(base.topCard) : undefined;
  const baseDef =
    actualBaseDef === undefined || virtualBase === undefined
      ? actualBaseDef
      : { ...actualBaseDef, level: virtualBase.level, colors: virtualBase.colors };
  if (baseDef === undefined) return [];
  return pool.filter((c) => {
    const intoDef = ctx.game.definitionOf({ cardId: c.cardId } as never);
    const ordinary = ignoreLevel ? matchingEvoCostIgnoringLevel(intoDef, baseDef) : matchingEvoCost(intoDef, baseDef);
    const sourceZone = (["hand", "trash"] as const).find((zone) =>
      looseCardsInZone(ctx, c.ownerSeat, zone).some(({ instanceId }) => instanceId === c.instanceId),
    );
    // A virtual base is the complete requirement described by the resolving effect (for
    // example, "as if this Tamer is a level 5 blue Digimon"). Its original Tamer name,
    // traits and card kind must not also unlock an alternate or base-granted path.
    const alternate =
      virtualBase === undefined
        ? matchingAlternateDigivolutionRequirement(intoDef, baseDef, {
            ...(ignoreLevel ? { ignoreLevel: true } : {}),
            ...(sourceZone === undefined ? {} : { sourceZone }),
          })
        : undefined;
    const baseGranted =
      virtualBase === undefined && base && sourceZone === "hand"
        ? ctx.game.baseGrantedDigivolve?.(base.controllerSeat, base, intoDef)
        : undefined;
    // Tamers and other level-less bases cannot satisfy an ordinary level-gated EvoCost. They
    // can still use an explicitly printed alternate route (for example Rie -> BT22-067), or a
    // base-granted route. Filter the selection pool with the same requirement matcher used by
    // the authoritative digivolve primitive so an invalid name/trait match is never offered.
    if (enforceRequirements && ordinary === undefined && alternate === undefined && baseGranted === undefined)
      return false;
    if (digivolutionCostMax === undefined) return true;
    return [ordinary?.memoryCost, alternate?.cost, baseGranted?.cost].some(
      (cost) => cost !== undefined && cost <= digivolutionCostMax,
    );
  });
}

/** Normalize both accepted IR encodings for an effect-driven digivolution destination. */
function digivolveIntoTarget(action: Extract<Action, { kind: "Digivolve" }>): Target | undefined {
  if (action.into === undefined) return undefined;
  const encoded = action.into as Filter | Target;
  return "filter" in encoded
    ? ({ ...encoded, count: encoded.count ?? 1, ...(encoded.upTo === true ? { upTo: true } : {}) } as Target)
    : {
        filter: encoded as Filter,
        count: 1,
        ...((encoded as Filter & { upTo?: boolean }).upTo === true ? { upTo: true } : {}),
      };
}

function filterToTriggeredSource(
  ctx: EffectContext,
  action: Extract<Action, { kind: "Digivolve" }>,
  candidates: LooseCandidate[],
): LooseCandidate[] {
  const instanceId =
    action.source === "triggerSource"
      ? ctx.source.instanceId
      : action.source === "triggerTrashedFromHand"
        ? ctx.trigger.trashedFromHandInstanceId
        : undefined;
  return action.source === undefined
    ? candidates
    : candidates.filter((candidate) => candidate.instanceId === instanceId);
}

/**
 * Synchronous preflight for an optional effect-driven digivolution. It mirrors the source
 * zones, destination filter and printed-requirement gate used by runDigivolve, but opens no
 * target/card decisions. The resolver remains authoritative for payment and mutation.
 */
export function canAttemptDigivolve(ctx: EffectContext, action: Extract<Action, { kind: "Digivolve" }>): boolean {
  if (!action.target) return false;
  // A movement cost binds the exact breeding Digimon after moving it. Before
  // payment, validate evolution against that same cost target in its original zone.
  const moveTarget = action.cost?.kind === "moveToBattleArea" ? action.cost.target : undefined;
  const target =
    moveTarget?.bindAs !== undefined && moveTarget.bindAs === action.target.fromSelectionRef
      ? moveTarget
      : action.target;
  const intoTarget = digivolveIntoTarget(action);
  if (intoTarget === undefined) return false;
  const allowNoTarget = action.allowNoTarget === true;
  const zones: ZoneRef[] = action.from ?? ["hand", "trash"];
  // Q4748: paying with a hidden source may create the trash evolution target.
  // Its identity cannot gate activation before payment reveals it. The resolver
  // rebuilds the candidate pool and enforces evolution requirements afterward.
  if (
    zones.includes("trash") &&
    action.cost?.kind === "trash" &&
    action.cost.target?.filter.faceDown === true &&
    action.cost.target.filter.zone === "digivolutionCards" &&
    canPayCost(ctx, action.cost) &&
    candidatePermanents(ctx, target).length > 0
  )
    return true;
  let pool = filterToTriggeredSource(ctx, action, candidateLooseInstances(ctx, intoTarget, zones));
  if (action.amongPreviousSearch) {
    const searched = new Set((ctx.lastRevealedCards ?? []).map((card) => card.instanceId));
    pool = pool.filter((candidate) => searched.has(candidate.instanceId));
  }
  if (zones.includes("security") && action.faceDownSecurityOk !== true) {
    pool = pool.filter((candidate) => !isFaceDownSecurityCard(ctx, candidate.instanceId));
  }
  if (pool.length === 0) return allowNoTarget;

  const requestedIgnoreRequirements =
    action.ignoreReqs === true || action.ignoreRequirements === true || action.ignoreDigivolutionRequirements === true;
  const ignoreBlocked = ctx.fx.isDigivolutionRequirementIgnoreBlocked?.(ctx.source.ownerSeat) === true;
  const enforceRequirements = !(requestedIgnoreRequirements && !ignoreBlocked);
  const ignoreLevel = action.ignoreLevelRequirement === true && !ignoreBlocked;
  const hasLegalDestination = (permanentId: string): boolean => {
    let candidates = pool;
    if (action.colorsMatchDigivolvingSource === true) {
      const base = ctx.game.permanentById(permanentId);
      const baseColors = base?.topCard ? ctx.game.definitionOf(base.topCard).colors : [];
      candidates = candidates.filter((candidate) => {
        const intoColors = ctx.game.definitionOf({ cardId: candidate.cardId } as never).colors;
        return baseColors.some((color) => intoColors.includes(color));
      });
    }
    return (
      legalIntoCandidates(
        ctx,
        permanentId,
        candidates,
        enforceRequirements,
        intoTarget.filter.digivolutionCostMax,
        ignoreLevel,
        action.virtualBase,
      ).length > 0
    );
  };

  if (target.targetBreeding === true) {
    const breeding = ctx.game.player(ctx.source.ownerSeat).breeding;
    return breeding !== undefined ? hasLegalDestination(breeding.permanentId) : allowNoTarget;
  }
  const targets = candidatePermanents(ctx, target);
  return targets.length > 0 ? targets.some((permanent) => hasLegalDestination(permanent.permanentId)) : allowNoTarget;
}

/** Cards the controller can see in the source zones while choosing what to digivolve into. */
function visibleDigivolveSourceIds(
  ctx: EffectContext,
  action: Extract<Action, { kind: "Digivolve" }>,
  zones: ZoneRef[],
): string[] {
  let visible = candidateLooseInstances(ctx, { filter: { controllerDefault: "mine" }, count: "all" }, zones);
  visible = filterToTriggeredSource(ctx, action, visible);
  if (action.amongPreviousSearch) {
    const searched = new Set((ctx.lastRevealedCards ?? []).map((card) => card.instanceId));
    visible = visible.filter((candidate) => searched.has(candidate.instanceId));
  }
  if (zones.includes("security") && action.faceDownSecurityOk !== true) {
    visible = visible.filter((candidate) => !isFaceDownSecurityCard(ctx, candidate.instanceId));
  }
  return visible.map(({ instanceId }) => instanceId);
}

export async function runDigivolve(ctx: EffectContext, action: Extract<Action, { kind: "Digivolve" }>): Promise<void> {
  // Legacy static metadata-only Digivolve actions that register alternate digivolution paths
  // (e.g. Frontier tamer-onto effects with `onto` + `asLevel`) carry no runtime `target`
  // and are consumed by registerTamerOntoFromEffects — never resolved.
  if (!action.target) return;

  // Bind the digivolve OUTCOME on ctx (effect-result binding): false until a digivolve actually
  // happens, read by a subsequent "then (if it digivolved)" Condition (KB BT19-084 Q3146-Q3150).
  ctx.lastDigivolveResult = false;

  // CAP-G3: targetBreeding — resolve the controller's breeding-area Digimon in place.
  // KB Q4300 says this evolution does not trigger [When Digivolving], and the card remains
  // in breeding; moving it to battle first violated both parts of that ruling.
  if (action.target.targetBreeding === true) {
    const mine = ctx.source.ownerSeat;
    const breedingPerm = ctx.game.player(mine).breeding;
    if (breedingPerm === undefined || breedingPerm.topCard === undefined) return;
    // Filter check: does the breeding permanent satisfy the target filter?
    if (action.target.filter !== undefined) {
      const filterKinds = action.target.filter.kind;
      if (filterKinds !== undefined) {
        const topDef = ctx.game.definitionOf(breedingPerm.topCard);
        const matchesKind = filterKinds.some((k) => topDef.kinds.includes(k as never));
        if (!matchesKind) return;
      }
    }
    const pid = breedingPerm.permanentId;
    const intoTarget = digivolveIntoTarget(action);
    if (intoTarget === undefined) {
      unsupported(ctx, action, "Digivolve without an `into` filter (what to digivolve into) is unresolvable");
      return;
    }
    const zones: ZoneRef[] = action.from ?? ["hand", "trash"];
    const pays = action.payCost === true;
    const numericPayCost = typeof action.payCost === "number" ? (action.payCost as number) : undefined;
    const costOverride = action.costOverride ?? numericPayCost;
    const requestedIgnoreRequirements =
      action.ignoreReqs === true ||
      action.ignoreRequirements === true ||
      action.ignoreDigivolutionRequirements === true;
    const ignoreRequirements =
      requestedIgnoreRequirements && ctx.fx.isDigivolutionRequirementIgnoreBlocked?.(ctx.source.ownerSeat) !== true;
    const ignoreLevel =
      action.ignoreLevelRequirement === true &&
      ctx.fx.isDigivolutionRequirementIgnoreBlocked?.(ctx.source.ownerSeat) !== true;
    const candidates = legalIntoCandidates(
      ctx,
      pid,
      filterToTriggeredSource(ctx, action, candidateLooseInstances(ctx, intoTarget, zones)),
      !ignoreRequirements,
      intoTarget.filter.digivolutionCostMax,
      ignoreLevel,
      action.virtualBase,
    );
    if (candidates.length === 0) return;
    const chosen = action.optional
      ? await pickLoose(
          ctx,
          { ...intoTarget, upTo: true },
          candidates,
          undefined,
          ctx.ask,
          visibleDigivolveSourceIds(ctx, action, zones),
        )
      : await pickLoose(ctx, intoTarget, candidates, undefined, ctx.ask, visibleDigivolveSourceIds(ctx, action, zones));
    if (chosen.length === 0) return;
    const result = await ctx.fx.digivolveFromInstance(pid, chosen[0]!, {
      payCost: pays || numericPayCost !== undefined,
      costOverride,
      useAlternateCost: action.useAlternateCost,
      ignoreLevel,
      ignoreRequirements,
      virtualBase: action.virtualBase,
      suppressWhenDigivolving: true,
    });
    if (result !== undefined) {
      ctx.lastDigivolveResult = true;
      if (action.bindResultAs) {
        if (!ctx.boundPlayed) (ctx as { boundPlayed: Map<string, Set<string>> }).boundPlayed = new Map();
        ctx.boundPlayed!.set(action.bindResultAs, new Set([result.permanentId]));
      }
    }
    return;
  }

  // The card to digivolve into is a loose card matching `into` in the controller's
  // hand (the common "in the hand" form) or trash. `action.costDelta` (a digivolution-cost
  // reduction folded into the verb, e.g. "... for its digivolution cost -2") is forwarded
  // so the primitive lowers the paid cost. A missing `into` is only reported as unsupported
  // AFTER the targets resolve (below) — a metadata-only Digivolve that registers an alternate
  // path (BT7-047) carries no `into` and resolves no targets, and must not raise.
  const intoTarget = digivolveIntoTarget(action);
  // The digivolve-into card's source zone(s). Defaults to hand/trash; alternate-digivolve
  // cards declare their own (digivolutionCards under a Tamer, security, trash-only). The
  // loose-card enumerator already supports all of these.
  const zones: ZoneRef[] = action.from ?? ["hand", "trash"];
  // Face-up-security digivolve SOURCE (BT19-084 "digivolve into a Digimon card in your FACE-UP
  // security cards"): the loose-card enumerator returns every security card regardless of
  // orientation, but a digivolve may only consume a FACE-UP one (documented behavior `!cardSource.IsFlipped`,
  // documented behavior). When "security" is a source zone, drop face-down security candidates
  // here; other zones (hand/trash) are unaffected. (A2 resolved: candidateLooseInstances does
  // NOT face-up-filter "security" — looseCardsInZone collects the whole stack.)
  const sourcesSecurity = zones.includes("security");
  // controller may pick any security card regardless of orientation.
  const faceDownOk = action.faceDownSecurityOk === true;
  // `payCost` is normally a boolean, but a legacy prose-compiler encoding stores the fixed cost as
  // a NUMBER ("for a digivolution cost of N" -> payCost:N). Normalize: a numeric payCost means
  // "pay exactly N" (a costOverride), so the digivolve still pays.
  const numericPayCost = typeof action.payCost === "number" ? (action.payCost as number) : undefined;
  const pays = action.payCost === true || numericPayCost !== undefined;
  const costOverride = action.costOverride ?? numericPayCost;
  const requestedIgnoreRequirements =
    action.ignoreReqs === true || action.ignoreRequirements === true || action.ignoreDigivolutionRequirements === true;
  const ignoreRequirements =
    requestedIgnoreRequirements && ctx.fx.isDigivolutionRequirementIgnoreBlocked?.(ctx.source.ownerSeat) !== true;
  const ignoreLevel =
    action.ignoreLevelRequirement === true &&
    ctx.fx.isDigivolutionRequirementIgnoreBlocked?.(ctx.source.ownerSeat) !== true;
  const enforceRequirements = !ignoreRequirements;
  /** The `into` pool as it stands right now, before any base-specific legality. */
  const intoPool = (): LooseCandidate[] => {
    if (intoTarget === undefined) return [];
    let candidates = filterToTriggeredSource(ctx, action, candidateLooseInstances(ctx, intoTarget, zones));
    if (action.amongPreviousSearch) {
      const searched = new Set((ctx.lastRevealedCards ?? []).map((card) => card.instanceId));
      candidates = candidates.filter((candidate) => searched.has(candidate.instanceId));
    }
    if (sourcesSecurity && !faceDownOk) {
      candidates = candidates.filter((c) => !isFaceDownSecurityCard(ctx, c.instanceId));
    }
    return candidates;
  };
  const legalIntoForBase = (basePermanentId: string, pool: LooseCandidate[]): LooseCandidate[] => {
    let candidates = pool;
    if (action.nameIncludesDigivolvingTarget === true || action.differentNameFromDigivolvingTarget === true) {
      const base = ctx.game.permanentById(basePermanentId);
      const baseName =
        base?.topCard === undefined ? undefined : ctx.game.definitionOf(base.topCard).nameEn.toLowerCase();
      candidates =
        baseName === undefined
          ? []
          : candidates.filter((candidate) => {
              const candidateName = ctx.game.definitionOf({ cardId: candidate.cardId } as never).nameEn.toLowerCase();
              return (
                (action.nameIncludesDigivolvingTarget !== true || candidateName.includes(baseName)) &&
                (action.differentNameFromDigivolvingTarget !== true || candidateName !== baseName)
              );
            });
    }
    if (action.colorsMatchDigivolvingSource === true) {
      const base = ctx.game.permanentById(basePermanentId);
      const baseColors = base?.topCard ? ctx.game.definitionOf(base.topCard).colors : [];
      candidates = candidates.filter((candidate) => {
        const intoColors = ctx.game.definitionOf({ cardId: candidate.cardId } as never).colors;
        return baseColors.some((color) => intoColors.includes(color));
      });
    }
    return legalIntoCandidates(
      ctx,
      basePermanentId,
      candidates,
      enforceRequirements,
      intoTarget?.filter.digivolutionCostMax,
      ignoreLevel,
      action.virtualBase,
    );
  };
  // A base with no legal card to digivolve into must not be offered as a digivolve target:
  // choosing it silently consumes the (often optional, once-per-turn) effect and nothing
  // happens. The pool is snapshotted before the prompt — the same pool every base is later
  // filtered against — so the offer and the resolution agree.
  const availableIntoPool = intoPool();
  const permanentIds = await resolvePermanentTargets(ctx, action.target, {
    eligible: (pid) => intoTarget === undefined || legalIntoForBase(pid, availableIntoPool).length > 0,
  });
  if (permanentIds.length === 0) return;
  // `bindAs` on the digivolve TARGET records which Digimon was chosen to digivolve, so a
  // later action can act on that one specifically — "If you do, unsuspend that Digimon"
  // (BT8-110, KB Q1789: "only the Digimon you chose to digivolve will unsuspend"). Same
  // handle namespace `SelectBind` writes, which is what `fromSelectionRef` reads. The
  // permanent keeps its id across the digivolution, so the handle stays valid afterwards.
  // Only a card that sets the field is affected; every other Digivolve is untouched.
  if (intoTarget === undefined) {
    unsupported(ctx, action, "Digivolve without an `into` filter (what to digivolve into) is unresolvable");
    return;
  }
  for (const pid of permanentIds) {
    // Re-read the pool per base: an earlier iteration consumed a card out of it.
    const candidates = legalIntoForBase(pid, intoPool());
    if (candidates.length === 0) continue;
    const chosen = await pickLoose(
      ctx,
      intoTarget,
      candidates,
      undefined,
      ctx.ask,
      visibleDigivolveSourceIds(ctx, action, zones),
    );
    if (chosen.length === 0) continue;
    let useAlternateCost = action.useAlternateCost;
    if (useAlternateCost === undefined) {
      const base = ctx.game.permanentById(pid);
      const chosenCandidate = candidates.find((candidate) => candidate.instanceId === chosen[0]);
      const intoDef = chosenCandidate ? ctx.game.definitionOf({ cardId: chosenCandidate.cardId } as never) : undefined;
      const actualBaseDef = base?.topCard ? ctx.game.definitionOf(base.topCard) : undefined;
      if (chosenCandidate !== undefined && intoDef !== undefined && actualBaseDef !== undefined) {
        const baseDef =
          action.virtualBase === undefined
            ? actualBaseDef
            : { ...actualBaseDef, level: action.virtualBase.level, colors: action.virtualBase.colors };
        const sourceZone = zones.find((zone) =>
          looseCardsInZone(ctx, chosenCandidate.ownerSeat, zone).some(
            (candidate) => candidate.instanceId === chosenCandidate.instanceId,
          ),
        );
        const printed = ignoreLevel
          ? matchingEvoCostIgnoringLevel(intoDef, baseDef)
          : matchingEvoCost(intoDef, baseDef);
        const alternate =
          action.virtualBase === undefined
            ? matchingAlternateDigivolutionRequirement(intoDef, baseDef, {
                ...(ignoreLevel ? { ignoreLevel: true } : {}),
                ...(sourceZone === undefined ? {} : { sourceZone }),
              })
            : undefined;
        if (printed !== undefined && alternate !== undefined && pays) {
          // Effect-driven digivolution follows the same declaration rule as the public
          // digivolve intent: when both a printed EvoCost and an alternate requirement match,
          // the controller chooses which requirement to use. Defaulting to the printed path
          // silently charged the wrong cost for cards such as BT26-001 evolving a TS stack.
          // A cost-free effect still enforces that at least one requirement matches, but the
          // two routes have no different payable outcome and must not open a dead choice.
          const choice = await ctx.ask.chooseOption(ctx, [
            `Printed digivolution requirement (cost ${printed.memoryCost})`,
            `Alternate digivolution requirement (cost ${alternate.cost})`,
          ]);
          useAlternateCost = choice === 1;
        } else if (alternate !== undefined) {
          // Effect-driven digivolution still uses a printed alternate requirement when it is
          // the only legal route (notably Hybrid-over-Tamer). Leaving this undefined makes the
          // legality pre-filter offer the Tamer, then the production verb silently reject it.
          useAlternateCost = true;
        }
      }
    }
    // Older compiled IR carries the folded reduction as positive `reduceCost` (the
    // current runtime record emits the SIGNED `costDelta`); accept both so in-tree IR
    // stays effective. reduceCost is a reduction amount, so it negates into the delta.
    const reduceCost = (action as { reduceCost?: number }).reduceCost;
    const fixedDelta = action.costDelta ?? (reduceCost !== undefined ? -reduceCost : undefined);
    // A `reduceCostScaling` reduction is counted at resolution time and folded into the same
    // verb (BT21-082 "for each of your red Tamers with different names"), stacking with any
    // fixed delta. The board is counted per base so a multi-target digivolve re-reads it.
    const scaledReduction = action.reduceCostScaling ? scaleFactor(ctx, action.reduceCostScaling) : 0;
    const costDelta = scaledReduction > 0 ? (fixedDelta ?? 0) - scaledReduction : fixedDelta;
    const result = await ctx.fx.digivolveFromInstance(pid, chosen[0]!, {
      payCost: pays,
      costDelta,
      costOverride,
      useAlternateCost,
      ignoreLevel,
      ignoreRequirements,
      virtualBase: action.virtualBase,
    });
    if (result !== undefined) {
      ctx.lastDigivolveResult = true;
      if (action.target.bindAs !== undefined) {
        ctx.selections ??= new Map();
        ctx.selections.set(action.target.bindAs, result.permanentId);
      }
      if (action.bindResultAs) {
        if (!ctx.boundPlayed) (ctx as { boundPlayed: Map<string, Set<string>> }).boundPlayed = new Map();
        ctx.boundPlayed!.set(action.bindResultAs, new Set([result.permanentId]));
      }
    }
  }
}

export async function runDigivolveViaPlacement(
  ctx: EffectContext,
  action: Extract<Action, { kind: "DigivolveViaPlacement" }>,
): Promise<void> {
  const hosts = await resolvePermanentTargets(ctx, { filter: action.placeCost.hostFilter, count: 1 });
  if (hosts.length === 0) return;
  const candidates = candidateLooseInstances(ctx, action.placeCost.target, ["trash"]);
  const placed = await pickLoose(ctx, action.placeCost.target, candidates);
  if (placed.length === 0) return;
  await ctx.fx.placeUnder(hosts[0]!, placed, {
    belowTop: action.placeCost.position !== "bottom",
    faceUp: true,
  });
  const result = await ctx.fx.digivolveFromInstance(hosts[0]!, ctx.source.instanceId, {
    payCost: true,
    costOverride: action.cost,
    ignoreRequirements: action.ignoreDigivolutionRequirements === true,
  });
  if (result !== undefined) ctx.lastDigivolveResult = true;
}
