import { CardKind, type CardDefinition, type CardInstance, type GameState, type Permanent } from "@aegis/shared";
import { definitionOf } from "../cards/cardData.js";
import { matchNameOrTrait } from "../effects/interpreter.js";

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
 * §17-1-3-2-6/§17-1-3-2-7's category gate, parsed from the printed
 * `CardDefinition.linkRequirement` header ("[Link] [Appmon] trait: Cost 1"). The
 * STRUCTURED `LinkRequirement[]` array on `CompiledCard` (packages/shared/src/effects/ir/requirements.ts)
 * exists but is populated only on the 2 hand-authored cards that reference it in an
 * effect body (BT25-045, EX10-029) — every AUTO-GENERATED card (BT21-009 among them,
 * the fixture this rule check is proven against) carries the requirement ONLY as this
 * flat string, so that array cannot be the source of truth for a check meant to cover
 * all ~70 real link cards. Every observed printed form (`node tools/kb/query.mjs rules
 * "link"` + a full scan of `cards.json.linkRequirement`) is one of four shapes:
 *   "[Link] [<Trait>] trait: Cost N"   -> trait
 *   "[Link] [<Name>] in text: Cost N"  -> name/trait/text union ("has X in its text")
 *   "[Link] [<Name>]: Cost N"          -> name
 *   "[Link] Lv.N or higher: Cost N"    -> level floor
 * The printed cost is enforced at declaration time (existing `canLinkToTargetPermanent`
 * / `linkCostOf` seams), not re-checked here — this gate only re-evaluates the CATEGORY
 * against the live host, which is what §17-1-3-2-6/§17-1-3-2-7 asks a rule-check sweep
 * to keep honest as the host's own traits/name/level can never change after linking.
 */
export function parseLinkCategory(
  req: string,
): { tokens: string[]; match: "trait" | "name" | "text" } | { minLevel: number } | undefined {
  const trait = /^\[Link\]\s*\[(.+?)\]\s*trait\s*:/i.exec(req);
  if (trait?.[1] !== undefined) return { tokens: [trait[1]], match: "trait" };
  const inText = /^\[Link\]\s*\[(.+?)\]\s*in text\s*:/i.exec(req);
  if (inText?.[1] !== undefined) return { tokens: [inText[1]], match: "text" };
  const name = /^\[Link\]\s*\[(.+?)\]\s*:/i.exec(req);
  if (name?.[1] !== undefined) return { tokens: [name[1]], match: "name" };
  const level = /^\[Link\]\s*Lv\.(\d+)\s*or higher\s*:/i.exec(req);
  if (level?.[1] !== undefined) return { minLevel: Number(level[1]) };
  return undefined;
}

/**
 * §17-1-3-2-6/§17-1-3-2-7 — whether a linked card's own printed `<Link>` category
 * requirement is satisfied by its live host's CURRENT definition. A card with no
 * `linkRequirement` at all, or one whose printed header this engine can't parse into a
 * category, carries nothing to violate (conservative: never invents a gate from an
 * unrecognized shape).
 */
export function linkRequirementSatisfied(hostDef: CardDefinition, linkedCard: CardInstance): boolean {
  const req = definitionOf(linkedCard).linkRequirement;
  if (typeof req !== "string" || req.length === 0 || req === "-") return true;
  const parsed = parseLinkCategory(req);
  if (parsed === undefined) return true;
  if ("minLevel" in parsed) return hostDef.level !== undefined && hostDef.level >= parsed.minLevel;
  return matchNameOrTrait(hostDef, parsed);
}
