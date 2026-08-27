import {
  Phase,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { definitionOf, isDigimon } from "../cards/cardData.js";
import { blastDnaMaterialNames, blastDnaMaterialsMatch } from "../cards/blastDnaMaterials.js";
import { findBattleAreaPermanent, findInHand, playerAt } from "./digivolveState.js";

/**
 * The player-facing `dnaDigivolve` verb (subsystem: dna-digivolve; Comprehensive Rules §8-2
 * "DNA Digivolution"): "1 Digimon card from the hand and 2 (or more) of your Digimon cards in
 * the battle area DNA digivolve into a single new Digimon."
 *
 * Before this module, DNA digivolution existed ONLY as an IR action inside effect resolution
 * (`runDnaDigivolve` in engine/effects/interpreter.ts, driven by a card's own compiled effect) —
 * there was no player-declared verb for the base §8-2 procedure a player chooses to perform on
 * their own initiative. This module adds the declaration-time legality gate (materials owned +
 * on the battle area, the printed DNA-digivolve requirement, cost) and delegates the actual
 * merge (consuming the materials, placing the result, drawing, firing WhenDigivolving) to the
 * EXISTING `dnaDigivolveInto` primitive (effects/primitives.ts) — the same primitive
 * `runDnaDigivolve` itself calls via `ctx.fx.dnaDigivolveInto`. This module never re-implements
 * the stack-merge; `dnaDigivolveCostFor` (also exported by primitives.ts) is reused so this
 * verb's synchronous affordability check can never drift from what the primitive accepts.
 *
 * ＜Blast DNA Digivolve＞ (§16-31-1): "One of your Digimon specified in this effect and a card
 * from your hand may digivolve into a card with this keyword effect in the hand without paying
 * the cost." `costWaived` (bound to `hasBlastDigivolveKeyword`, the same compiled-IR registry
 * §16-26's ＜Blast Digivolve＞ waiver reads) skips the memory payment. What it does NOT skip is
 * the keyword's own named materials ("[WarGreymon] + [MetalGarurumon]"): no
 * `dnaDigivolveRequirement` compiles for these cards, so the names are read off the printed text
 * by `blastDnaMaterialNames` and matched here. This mirrors §16-26, where the waived path still
 * enforces the printed EvoCost.
 *
 * Server-authoritative and platform-independent. `validateDnaDigivolve` mutates nothing; `applyDnaDigivolve`
 * mutates only what the injected `dnaDigivolveInto` primitive mutates.
 */

export interface DnaDigivolveIntent {
  type: "dnaDigivolve";
  /** The controller's own battle-area Digimon consumed as materials (>= 2). */
  materialPermanentIds: string[];
  /** The hand instance becoming the DNA-digivolved result. */
  instanceId: string;
  /** Explicitly activate the card's ＜Blast DNA Digivolve＞ waiver. Omitted for normal DNA. */
  useBlastDigivolve?: boolean;
}

/** Stable rejection reasons (subset of the API-CONTRACT intent-validation vocabulary). */
export type DnaDigivolveRejection =
  | "not-your-turn"
  | "wrong-phase"
  | "decision-pending"
  | "game-over"
  | "no-such-player"
  | "card-not-in-zone"
  | "no-such-permanent"
  | "not-controller"
  | "not-a-digimon"
  | "invalid-evolution"
  | "insufficient-memory";

/** Result of validating a dnaDigivolve intent without mutating anything. */
export type DnaDigivolveCheck =
  | { ok: false; reason: DnaDigivolveRejection }
  | {
      ok: true;
      /** The hand instance becoming the DNA-digivolved result. */
      instance: CardInstance;
      /** Static definition of the resulting card. */
      definition: CardDefinition;
      /** The material permanents (deduplicated, resolved). */
      materials: Permanent[];
      /** True when ＜Blast DNA Digivolve＞ waives the memory cost (§16-31-1). */
      costWaived: boolean;
      /** Memory to pay (0 when `costWaived`). */
      cost: number;
    };

/**
 * Injected side-effect dependencies. Mirrors the digivolve/link action modules: the memory
 * gauge and the merge primitive are each owned by a sibling subsystem.
 */
export interface DnaDigivolveDeps {
  /** Max memory the active seat may spend right now (the shared memory gauge). */
  maxAffordable(state: GameState, seat: Seat): number;
  /**
   * The DNA-digivolve memory cost for `definition` given the resolved `materials`' definitions,
   * or undefined when no printed DNA-digivolve requirement (nor a per-material fallback EvoCost)
   * matches. The engine binds this to `dnaDigivolveCostFor` (effects/primitives.ts) so this
   * verb's cost-matching can never drift from the primitive's own.
   */
  matchingCost(definition: CardDefinition, materials: CardDefinition[]): number | undefined;
  effectiveMaterialDefinitions?(state: GameState, materials: Permanent[], definition: CardDefinition): CardDefinition[];
  /** Apply continuous/replacement modifiers to the matched printed DNA cost. */
  adjustedCost?(state: GameState, materials: Permanent[], definition: CardDefinition, printedCost: number): number;
  /** Potential optional reduction, used only by the affordability gate before its cost is paid. */
  potentialInteractiveDnaDigivolveReduction?(
    state: GameState,
    seat: Seat,
    materials: Permanent[],
    definition: CardDefinition,
  ): number;
  /** Prompt for and pay optional reductions immediately before paying the DNA digivolution cost. */
  activateInteractiveDnaDigivolveReduction?(
    state: GameState,
    seat: Seat,
    materials: Permanent[],
    definition: CardDefinition,
    evolvingInstanceId: string,
  ): Promise<number>;
  /**
   * Whether `instance`'s printed keyword waives this DNA digivolve's memory cost entirely
   * (＜Blast DNA Digivolve＞, §16-31-1). Optional: when absent no waiver applies. The engine
   * binds this to `hasBlastDigivolveKeyword(instance.cardId)`.
   */
  costWaived?(state: GameState, instance: CardInstance): boolean;
  /** Whether any chosen material is currently prohibited from digivolving. */
  materialsRestricted?(state: GameState, materials: Permanent[], definition: CardDefinition): boolean;
  /**
   * Consume `materialPermanentIds` and play `resultInstanceId` as the DNA-digivolved result
   * (the existing `dnaDigivolveInto` primitive — effects/primitives.ts). `payCost` pays the
   * printed cost when set; the caller omits it on the ＜Blast DNA Digivolve＞ waived path.
   */
  dnaDigivolveInto(
    materialPermanentIds: string[],
    resultInstanceId: string,
    opts?: { payCost?: boolean; costOverride?: number },
  ): Promise<Permanent | undefined>;
}

/** What applyDnaDigivolve produced (for the caller / tests / event log). */
export interface DnaDigivolveOutcome {
  permanentId: string;
  newCardId: string;
  cost: number;
}

/**
 * Validate a dnaDigivolve intent against current authoritative state. Pure: mutates nothing.
 * Checks run in the API-CONTRACT order (seat/turn/phase -> open-decision -> legality),
 * rejecting with a stable reason on the first failure.
 */
export function validateDnaDigivolve(
  state: GameState,
  seat: Seat,
  intent: DnaDigivolveIntent,
  deps: Pick<
    DnaDigivolveDeps,
    | "maxAffordable"
    | "matchingCost"
    | "effectiveMaterialDefinitions"
    | "adjustedCost"
    | "potentialInteractiveDnaDigivolveReduction"
    | "costWaived"
    | "materialsRestricted"
  >,
): DnaDigivolveCheck {
  // 1. Game state gates.
  if (state.gameOver) return { ok: false, reason: "game-over" };
  if (state.pendingDecision !== undefined) return { ok: false, reason: "decision-pending" };
  if (state.turnSeat !== seat) return { ok: false, reason: "not-your-turn" };
  // §8-2 DNA digivolution is a Main phase turn-player action.
  if (state.phase !== Phase.Main) return { ok: false, reason: "wrong-phase" };

  const player = playerAt(state, seat);
  if (player === undefined) return { ok: false, reason: "no-such-player" };

  // 2. The resulting card must be in this seat's hand.
  const found = findInHand(player, intent.instanceId);
  if (found === undefined) return { ok: false, reason: "card-not-in-zone" };

  const definition = definitionOf(found.instance.cardId);
  if (!isDigimon(definition)) return { ok: false, reason: "not-a-digimon" };

  // 3. §8-2-2: at least 2 distinct battle-area materials, each owned/controlled by this seat.
  const uniqueIds = [...new Set(intent.materialPermanentIds)];
  if (uniqueIds.length < 2) return { ok: false, reason: "invalid-evolution" };
  const materials: Permanent[] = [];
  for (const id of uniqueIds) {
    const permanent = findBattleAreaPermanent(player, id);
    if (permanent === undefined) return { ok: false, reason: "no-such-permanent" };
    if (permanent.controllerSeat !== seat) return { ok: false, reason: "not-controller" };
    if (permanent.topCard === undefined) return { ok: false, reason: "no-such-permanent" };
    materials.push(permanent);
  }
  if (deps.materialsRestricted?.(state, materials, definition) === true) {
    return { ok: false, reason: "invalid-evolution" };
  }

  // 4. ＜Blast DNA Digivolve＞ (§16-31-1): "without paying the cost" waives the memory cost and
  //    the printed DNA-digivolve requirement (these cards print none), but NOT the materials the
  //    keyword itself names — "([WarGreymon] + [MetalGarurumon])" is the requirement for this
  //    path. They are read off the printed text because no structured field compiles for them.
  const costWaived = intent.useBlastDigivolve === true && deps.costWaived?.(state, found.instance) === true;
  if (intent.useBlastDigivolve === true && !costWaived) {
    return { ok: false, reason: "invalid-evolution" };
  }
  if (costWaived) {
    const required = blastDnaMaterialNames(found.instance.cardId);
    if (required !== undefined) {
      const effectiveDefinitions =
        deps.effectiveMaterialDefinitions?.(state, materials, definition) ??
        materials.map((material) => definitionOf(material.topCard!.cardId));
      const materialNames = effectiveDefinitions.map((material) => material.nameEn);
      if (!blastDnaMaterialsMatch(materialNames, required)) return { ok: false, reason: "invalid-evolution" };
    }
    return { ok: true, instance: found.instance, definition, materials, costWaived: true, cost: 0 };
  }

  // 5. §8-2-2-2: the printed DNA-digivolve requirement (or per-material fallback EvoCost) must
  //    match the resolved materials, and the resulting cost must be affordable.
  const materialDefs =
    deps.effectiveMaterialDefinitions?.(state, materials, definition) ??
    materials.map((m) => definitionOf(m.topCard!.cardId));
  const printedCost = deps.matchingCost(definition, materialDefs);
  if (printedCost === undefined) return { ok: false, reason: "invalid-evolution" };
  const cost = deps.adjustedCost?.(state, materials, definition, printedCost) ?? printedCost;
  const potentialInteractive =
    deps.potentialInteractiveDnaDigivolveReduction?.(state, seat, materials, definition) ?? 0;
  if (deps.maxAffordable(state, seat) < Math.max(0, cost - potentialInteractive)) {
    return { ok: false, reason: "insufficient-memory" };
  }

  return { ok: true, instance: found.instance, definition, materials, costWaived: false, cost };
}

/**
 * Apply a dnaDigivolve verb. Validates first (so it is safe to call directly), then delegates
 * the merge + (unless waived) cost payment to the injected `dnaDigivolveInto` primitive.
 */
export async function applyDnaDigivolve(
  state: GameState,
  seat: Seat,
  intent: DnaDigivolveIntent,
  deps: DnaDigivolveDeps,
): Promise<{ ok: false; reason: DnaDigivolveRejection } | { ok: true; outcome: DnaDigivolveOutcome }> {
  const check = validateDnaDigivolve(state, seat, intent, deps);
  if (!check.ok) return check;

  const interactiveReduction = check.costWaived
    ? 0
    : ((await deps.activateInteractiveDnaDigivolveReduction?.(
        state,
        seat,
        check.materials,
        check.definition,
        intent.instanceId,
      )) ?? 0);
  const finalCost = Math.max(0, check.cost - interactiveReduction);

  const result = await deps.dnaDigivolveInto(
    check.materials.map((m) => m.permanentId),
    intent.instanceId,
    { payCost: !check.costWaived, costOverride: finalCost },
  );
  if (result === undefined) {
    // The primitive re-validates atomically at apply time (materials/cost may have shifted
    // since the synchronous check above); a race loses this way, not by throwing.
    return { ok: false, reason: check.costWaived ? "invalid-evolution" : "insufficient-memory" };
  }

  return {
    ok: true,
    outcome: { permanentId: result.permanentId, newCardId: intent.instanceId, cost: finalCost },
  };
}
