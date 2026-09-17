import { dnaDigivolutionRequirementsFor, nameIncludesToken } from "@aegis/shared";
import type { CardColor, CardDefinition } from "@aegis/shared";
import { matchingEvoCost } from "../../cards/cardData.js";

/**
 * What a digivolution costs: the printed requirement match, and the DNA/App
 * variants that take several materials.
 */

export function matchingDigivolveCost(evolving: CardDefinition, base: CardDefinition): number | undefined {
  return matchingEvoCost(evolving, base)?.memoryCost;
}

/**
 * The DNA-digivolve memory cost for `evolving` given a candidate `materials` set: the printed
 * DNA-digivolve requirement, or undefined when the card prints none or none of them matches.
 *
 * This fails closed on purpose. It used to fall back to the best printed single-base digivolve
 * cost for cards carrying no structured DNA requirement, which made any card an `into` filter
 * admitted a legal DNA result as soon as one material happened to satisfy its ordinary evo cost
 * (EX12-003 offering EX12-059 Machinedramon). That fallback existed only because the pre-EX9
 * card imports dropped the printed DNA header; `dnaDigivolutionCoverage.test.ts` now holds all 72
 * DNA destinations to a structured requirement, so a missing recipe means the card genuinely has
 * none. See docs/audits/engine/dna-digivolve-into-filter.md.
 */
export function dnaDigivolveCostFor(evolving: CardDefinition, materials: CardDefinition[]): number | undefined {
  return matchingDnaDigivolveCost(evolving, materials);
}

export function matchingDnaDigivolveCost(evolving: CardDefinition, materials: CardDefinition[]): number | undefined {
  const requirements = dnaDigivolutionRequirementsFor(evolving.cardId);
  let best: number | undefined;
  for (const req of requirements) {
    if (req.materials.length === 0) continue;
    if (!dnaRequirementMatches(req.materials, materials)) continue;
    if (best === undefined || req.cost < best) best = req.cost;
  }
  return best;
}

// `ir.ts` is deliberately schema-free (no enum imports), so `DnaDigivolveRequirement.materials`
// encodes color as a plain string literal union rather than the `CardColor` enum this module
// otherwise uses. The two share runtime values (CardColor is string-valued), so the comparison
// in `dnaMaterialSpecMatches` casts at the boundary rather than coupling ir.ts to the schema.
export function dnaRequirementMatches(
  specs: { color?: string; level?: number; names?: string[]; traits?: string[] }[],
  materials: CardDefinition[],
): boolean {
  const used = new Set<number>();
  const visit = (specIndex: number): boolean => {
    if (specIndex >= specs.length) return true;
    const spec = specs[specIndex]!;
    for (let i = 0; i < materials.length; i++) {
      if (used.has(i)) continue;
      if (!dnaMaterialSpecMatches(spec, materials[i]!)) continue;
      used.add(i);
      if (visit(specIndex + 1)) return true;
      used.delete(i);
    }
    return false;
  };
  return visit(0);
}

export function dnaMaterialSpecMatches(
  spec: {
    color?: string;
    level?: number;
    names?: string[];
    namesExact?: string[];
    namesInText?: string[];
    traits?: string[];
  },
  material: CardDefinition,
): boolean {
  if (spec.color !== undefined && !material.colors.includes(spec.color as CardColor)) return false;
  if (spec.level !== undefined && material.level !== spec.level) return false;
  if (spec.names && spec.names.length > 0) {
    const name = (material.nameEn ?? material.cardId).toLowerCase();
    if (!spec.names.some((token) => nameIncludesToken(name, token))) return false;
  }
  if (spec.namesExact && spec.namesExact.length > 0) {
    const name = (material.nameEn ?? material.cardId).toLowerCase();
    if (!spec.namesExact.some((token) => name === token.toLowerCase())) return false;
  }
  if (spec.namesInText && spec.namesInText.length > 0) {
    const text = `${material.effectText ?? ""}\n${material.inheritedEffectText ?? ""}`.toLowerCase();
    if (!spec.namesInText.some((token) => text.includes(token.toLowerCase()))) return false;
  }
  if (spec.traits && spec.traits.length > 0) {
    if (!spec.traits.some((trait) => (material.types ?? []).includes(trait))) return false;
  }
  return true;
}
