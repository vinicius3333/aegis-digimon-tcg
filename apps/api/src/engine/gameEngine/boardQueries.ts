import { CardKind, type CardDefinition, type CardInstance, type GameState, type Permanent } from "@aegis/shared";
import { definitionOf } from "../cards/cardData.js";
import { linkCategoryAllowsHost } from "../effects/mindLink.js";

export { parseLinkCategory } from "../effects/mindLink.js";

/** All battle-area permanents across both players (top-card present). */
export function battleAreaPermanents(state: GameState): Permanent[] {
  const out: Permanent[] = [];
  for (const player of state.players) {
    if (player === undefined) continue;
    for (const perm of player.battleArea) {
      if (perm.topCard !== undefined) out.push(perm);
    }
  }
  return out;
}

/** Each player's breeding-slot permanent with a top card present (at most one per player). */
export function breedingPermanents(state: GameState): Permanent[] {
  const out: Permanent[] = [];
  for (const player of state.players) {
    if (player?.breeding?.topCard !== undefined) out.push(player.breeding);
  }
  return out;
}

/**
 * All field permanents with a top card — battle area (both players) plus each player's
 * breeding slot (CR §3-4-4: the field is divided into the breeding area and the battle
 * area). Used by the face-down-top-card sweep (§17-1-3-2-4), which is a whole-field
 * condition, not battle-area-only.
 */
export function fieldPermanents(state: GameState): Permanent[] {
  return [...battleAreaPermanents(state), ...breedingPermanents(state)];
}

/**
 * A field permanent's top card counts as a Digimon for rule purposes: CR §4-2-1 "Digi-Egg
 * cards and Digimon cards placed on the field are treated as Digimon."
 */
export function isDigimonOrDigiEgg(permanent: Permanent): boolean {
  if (permanent.topCard === undefined) return false;
  const kinds = definitionOf(permanent.topCard).kinds;
  return kinds.includes(CardKind.Digimon) || kinds.includes(CardKind.DigiEgg);
}

/**
 * §17-1-3-2-6/§17-1-3-2-7 — whether a linked card's own printed `<Link>` category
 * requirement is satisfied by its live host's CURRENT definition. A card with no
 * `linkRequirement` at all, or one whose printed header this engine can't parse into a
 * category, carries nothing to violate (conservative: never invents a gate from an
 * unrecognized shape).
 */
export function linkRequirementSatisfied(hostDef: CardDefinition, linkedCard: CardInstance): boolean {
  return linkCategoryAllowsHost(hostDef, definitionOf(linkedCard));
}
