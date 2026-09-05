import {
  CardInstance,
  EffectTiming,
  Phase,
  Zone,
  assemblyRequirementFor,
  type AssemblyMaterial,
  type AssemblyRequirement,
  type CardDefinition,
  type GameState,
  type Seat,
} from "@aegis/shared";
import { cardHasTrait, definitionOf, isDigimon } from "../cards/cardData.js";
import { matchNameOrTrait } from "../effects/interpreter.js";
import { extractCardAt } from "../state/access.js";
import { normalizeCost, placePermanent } from "./digiXros.js";

/**
 * Assembly (Comprehensive Rules §7-3): a distinct alternate play mode from DigiXros. A card
 * printing "[Assembly -N] <materials>" may be played by placing the EXACT named/traited card
 * count from the player's TRASH (never hand/field, unlike DigiXros) under it, reducing the play
 * cost by a fixed N. Structurally modeled on `actions/digiXros.ts`:
 *   - source zone is trash only (§7-3-1), not hand/battle-area/under-Tamer
 *   - the reduction is a flat `reduceCost`, not per-material scaling
 *   - the exact material count must be placed — no partial Assembly (§7-3-2-4)
 *   - stacking order is dictated by the requirement's slot order for distinct-named slots, and by
 *     the player's own declaration order when the requirement is a single repeated slot (§7-3-2-6)
 *
 * IR coverage: `AssemblyMaterial` carries `names`/`namesExact`/`traits`/`nameOrTrait`/`level`/`levelMin`/
 * `levelMax`/`colors`/`differentLevels`/`differentNames`, all enforced below. `nameOrTrait` mirrors
 * `DigiXrosMaterial.nameOrTrait` for a genuine cross-kind disjunction the compiler can't flatten
 * into one AND-combined `names`+`traits` slot (e.g. EX12-016/-017's "in name or ... trait",
 * BT26-073's "in text or ... trait"). It also preserves alternatives with different trait
 * semantics, such as EX12-031's substring [Aqua]/[Sea Animal] match OR exact [TB] match. A slot
 * with no structured predicate at all (still
 * desc-only after that) is rejected as unenforceable, mirroring `digiXros.ts`'s
 * `materialMatchesSlot` refusal to accept an unconstrained desc-only slot. A level bound WITHOUT
 * a name/trait/nameOrTrait anchor is not sufficient on its own — it would silently accept any
 * card of that level — so that gate stays a hard prerequisite for enforcement.
 */

/** An Assembly play declaration (the `assembly` field of a playCard intent), narrowed for this action. */
export interface AssemblyPlanInput {
  /** Trash instance ids to place under the played card, in stacking-declaration order (left-to-right
   *  per the Assembly requirement's slot order; the player's own order for a same-slot recipe). */
  materialInstanceIds: string[];
}

export interface AssemblyIntent {
  type: "playCard";
  instanceId: string;
  targetSlot?: number;
  assembly: AssemblyPlanInput;
}

export type AssemblyRejection =
  | "not-your-turn"
  | "wrong-phase"
  | "decision-pending"
  | "game-over"
  | "no-such-player"
  | "card-not-in-zone"
  | "not-playable-kind"
  | "not-assembly" // the played card has no Assembly requirement
  | "no-materials" // an Assembly declaration must place at least one material
  | "invalid-material" // wrong zone, wrong count, or doesn't satisfy the recipe
  | "insufficient-memory";

export type AssemblyCheck =
  | { ok: false; reason: AssemblyRejection }
  | {
      ok: true;
      instance: CardInstance;
      definition: CardDefinition;
      requirement: AssemblyRequirement;
      materialInstanceIds: string[];
      cost: number;
    };

export interface AssemblyDeps {
  maxAffordable(state: GameState, seat: Seat): number;
  payMemory(state: GameState, seat: Seat, cost: number): void;
  /** Apply continuous play-cost modifiers to the printed cost (before the Assembly reduction). */
  adjustedPlayCost?(state: GameState, seat: Seat, definition: CardDefinition, base: number): number;
  nextPermanentId(): string;
  /** Fire On Play for the placed permanent through the effect stack. */
  fireTiming(state: GameState, seat: Seat, timing: EffectTiming, sourceInstanceId: string): Promise<void>;
  /** Place a loose trash card under a permanent as a bottom digivolution card. */
  placeUnder(targetPermanentId: string, instanceIds: string[]): Promise<unknown>;
  emit?: (event: { kind: string; [k: string]: unknown }) => void;
}

export interface AssemblyOutcome {
  cardId: string;
  instanceId: string;
  permanentId: string;
  cost: number;
  materialInstanceIds: string[];
}

/** Validate an Assembly play declaration. Pure: mutates nothing. */
export function validateAssembly(
  state: GameState,
  seat: Seat,
  intent: AssemblyIntent,
  deps: Pick<AssemblyDeps, "maxAffordable" | "adjustedPlayCost">,
): AssemblyCheck {
  if (state.gameOver) return { ok: false, reason: "game-over" };
  if (state.pendingDecision !== undefined) return { ok: false, reason: "decision-pending" };
  if (state.turnSeat !== seat) return { ok: false, reason: "not-your-turn" };
  if (state.phase !== Phase.Main) return { ok: false, reason: "wrong-phase" };

  const player = state.players[seat];
  if (player === undefined) return { ok: false, reason: "no-such-player" };

  const instanceIndex = player.hand.findIndex((c) => c.instanceId === intent.instanceId);
  const instance = player.hand[instanceIndex];
  if (instance === undefined) return { ok: false, reason: "card-not-in-zone" };

  const definition = definitionOf(instance.cardId);
  if (!isDigimon(definition)) return { ok: false, reason: "not-playable-kind" };
  const requirement = assemblyRequirementFor(instance.cardId)?.[0];
  if (requirement === undefined) return { ok: false, reason: "not-assembly" };

  const materialIds = intent.assembly.materialInstanceIds;
  if (materialIds.length === 0) return { ok: false, reason: "no-materials" };

  // §7-3-2-4: the EXACT total count across all slots must be placed, no partial Assembly.
  const requiredTotal = requirement.materials.reduce((sum, slot) => sum + slot.count, 0);
  if (materialIds.length !== requiredTotal) return { ok: false, reason: "invalid-material" };

  // §7-3-1: materials come from the trash ONLY (unlike DigiXros's hand/field/trash/under-Tamer).
  const materialDefs: CardDefinition[] = [];
  const seen = new Set<string>();
  for (const materialId of materialIds) {
    if (seen.has(materialId)) return { ok: false, reason: "invalid-material" };
    seen.add(materialId);
    const inTrash = player.trash.find((c) => c.instanceId === materialId);
    if (inTrash === undefined) return { ok: false, reason: "invalid-material" };
    materialDefs.push(definitionOf(inTrash.cardId));
  }

  if (!materialsSatisfyAssemblyRecipe(materialDefs, requirement.materials, definition)) {
    return { ok: false, reason: "invalid-material" };
  }

  const printed = normalizeCost(definition.playCost);
  const base = deps.adjustedPlayCost ? Math.max(0, deps.adjustedPlayCost(state, seat, definition, printed)) : printed;
  const cost = Math.max(0, base - requirement.reduceCost);
  if (deps.maxAffordable(state, seat) < cost) return { ok: false, reason: "insufficient-memory" };

  return { ok: true, instance, definition, requirement, materialInstanceIds: materialIds, cost };
}

/** Apply a validated Assembly play. */
export async function applyAssembly(
  state: GameState,
  seat: Seat,
  intent: AssemblyIntent,
  deps: AssemblyDeps,
): Promise<{ ok: false; reason: AssemblyRejection } | { ok: true; outcome: AssemblyOutcome }> {
  const check = validateAssembly(state, seat, intent, deps);
  if (!check.ok) return check;

  const { definition, materialInstanceIds, cost } = check;
  const player = state.players[seat]!;

  if (cost > 0) {
    const memoryBefore = state.memory;
    deps.payMemory(state, seat, cost);
    deps.emit?.({ kind: "memoryChanged", from: memoryBefore, to: state.memory, reason: "playCard" });
  }

  const playIndex = player.hand.findIndex((c) => c.instanceId === check.instance.instanceId);
  if (playIndex < 0) return { ok: false, reason: "card-not-in-zone" };
  const instance = extractCardAt(player, Zone.Hand, playIndex);
  if (instance === undefined) return { ok: false, reason: "card-not-in-zone" };
  instance.faceUp = true;

  const permanent = placePermanent(deps, player, instance, definition);
  permanent.enterFieldTurnCount = state.turnCount;
  deps.emit?.({ kind: "cardPlayed", seat, cardId: instance.cardId, permanentId: permanent.permanentId });

  // §7-3-2-6: cards are placed in stacking order so the card shown on the LEFT of the Assembly
  // requirements ends up ON TOP (closest to the played card). `placeUnder`'s default (non-belowTop)
  // placement inserts each call at the bottom of the pile, pushing prior placements up toward the
  // top — so processing `materialInstanceIds` in left-to-right declaration order, one call per
  // material, naturally leaves the FIRST-processed (leftmost) material on top. For a single
  // repeated slot (all materials identical/interchangeable), §7-3-2-6 explicitly leaves the
  // stacking order to the player, which is exactly the order they declared.
  const placedIds: string[] = [];
  for (const materialId of materialInstanceIds) {
    await deps.placeUnder(permanent.permanentId, [materialId]);
    placedIds.push(materialId);
  }

  await deps.fireTiming(state, seat, EffectTiming.OnPlay, instance.instanceId);

  return {
    ok: true,
    outcome: {
      cardId: instance.cardId,
      instanceId: instance.instanceId,
      permanentId: permanent.permanentId,
      cost,
      materialInstanceIds: placedIds,
    },
  };
}

// --- pure helpers ---

/** Whether a material's definition satisfies a single Assembly slot (name/trait AND level gates). */
function materialMatchesAssemblySlot(
  def: CardDefinition,
  slot: AssemblyMaterial,
  destination?: CardDefinition,
): boolean {
  // A desc-only slot (no structured `names`/`namesExact`/`traits`/`nameOrTrait`) can't be matched precisely —
  // reject rather than accept an unconstrained material. See the module doc comment (IR coverage).
  // A level bound alone is never sufficient: it must anchor a name/trait gate, or it would accept
  // any card of that level regardless of the printed identity/trait requirement.
  const hasNameOrTrait =
    (slot.names?.length ?? 0) > 0 ||
    (slot.namesExact?.length ?? 0) > 0 ||
    (slot.traits?.length ?? 0) > 0 ||
    (slot.nameOrTrait?.length ?? 0) > 0;
  if (!hasNameOrTrait) return false;

  if (slot.kinds && slot.kinds.length > 0 && !slot.kinds.some((kind) => def.kinds.includes(kind as never))) {
    return false;
  }

  if (slot.colors && slot.colors.length > 0 && !slot.colors.some((color) => def.colors.includes(color as never))) {
    return false;
  }

  if (slot.names && slot.names.length > 0) {
    if (!slot.names.some((n) => def.nameEn.toLowerCase().includes(n.toLowerCase()))) return false;
  }
  if (slot.namesExact && slot.namesExact.length > 0) {
    if (!slot.namesExact.includes(def.nameEn)) return false;
  }
  if (slot.traits && slot.traits.length > 0) {
    if (!slot.traits.some((t) => cardHasTrait(def, t))) return false;
  }
  // Name-OR-trait disjunction ("[Agumon]/[Greymon] in name OR [ME]/[VB] trait" — EX12-016/-017,
  // BT26-073): qualify on any ref (union), reusing the engine's shared name/trait/text matcher.
  if (slot.nameOrTrait && slot.nameOrTrait.length > 0) {
    if (!slot.nameOrTrait.some((ref) => matchNameOrTrait(def, ref))) return false;
  }
  // "Also treated as level 4" is an additional permission for Kimeramon only;
  // it neither changes the catalog definition nor removes SkullGreymon's printed level.
  const levels = def.cardId === "EX9-062" && destination?.nameEn === "Kimeramon" ? [def.level, 4] : [def.level];
  return levels.some(
    (level) =>
      (slot.level === undefined || level === slot.level) &&
      (slot.levelMin === undefined || (level !== undefined && level >= slot.levelMin)) &&
      (slot.levelMax === undefined || (level !== undefined && level <= slot.levelMax)),
  );
}

/**
 * Whether `materials` can be assigned to the Assembly recipe `slots`. Every current compiled
 * Assembly requirement has exactly ONE slot (the compiler emits `materials: [oneSlot]`), so the
 * common case is "every material matches the one slot, exactly `slot.count` of them" (mirrors
 * DigiXros's single-slot special case), plus the slot's cross-material `differentLevels`/
 * `differentNames` distinctness flags. A future multi-slot requirement would need each material
 * assigned to a DISTINCT slot with that slot's exact count satisfied; not exercised by any card
 * in the current corpus, so kept as a straightforward per-slot partition rather than a full
 * bipartite search.
 */
export function materialsSatisfyAssemblyRecipe(
  materials: CardDefinition[],
  slots: AssemblyMaterial[],
  destination?: CardDefinition,
): boolean {
  if (materials.length === 0 || slots.length === 0) return false;
  if (slots.length === 1) {
    const slot = slots[0]!;
    if (materials.length !== slot.count) return false;
    if (!materials.every((m) => materialMatchesAssemblySlot(m, slot, destination))) return false;
    if (slot.differentLevels === true) {
      const levels = materials.map((m) => m.level);
      if (levels.some((l) => l === undefined)) return false;
      if (new Set(levels).size !== levels.length) return false;
    }
    if (slot.differentNames === true) {
      const names = materials.map((m) => m.nameEn);
      if (new Set(names).size !== names.length) return false;
    }
    return true;
  }
  // Multi-slot: each slot claims its own exact-count partition of qualifying materials, tried
  // greedily in slot order (left-to-right) — sufficient for disjoint name/trait slots.
  const remaining = materials.slice();
  for (const slot of slots) {
    let claimed = 0;
    for (let i = remaining.length - 1; i >= 0 && claimed < slot.count; i--) {
      if (materialMatchesAssemblySlot(remaining[i]!, slot, destination)) {
        remaining.splice(i, 1);
        claimed += 1;
      }
    }
    if (claimed !== slot.count) return false;
  }
  return remaining.length === 0;
}
