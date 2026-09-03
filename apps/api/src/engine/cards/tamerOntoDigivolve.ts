/**
 * Side registry for the "digivolve this card from your hand onto one of your
 * <color> Tamers as if the Tamer is a level N Digimon" mechanic.
 *
 * The mechanic compiles to a `Static` `Digivolve` action carrying a Tamer `target.filter`
 * and `asLevel`. That action is the source of truth for executable alternate-path legality.
 * The interpreter records the level, printed Tamer colors, and any fixed cost here so the
 * imperative digivolution validation API can consume the same registered information; then
 * {@link cardData.matchingAlternateDigivolutionRequirement} derives the correctly-gated
 * requirement (Tamer base + allowed Tamer color + shared color + the printed fixed cost or
 * level-N evolution cost).
 */
import type { DigivolutionRequirement } from "@aegis/shared";

type TamerBaseColor = NonNullable<DigivolutionRequirement["baseColors"]>[number];

interface TamerOntoDigivolveSpec {
  asLevel: number;
  baseColors?: readonly TamerBaseColor[];
  costOverride?: number;
}

const tamerOntoSpecs = new Map<string, TamerOntoDigivolveSpec>();

/** Record that `cardId` may digivolve from hand onto a Tamer treated as a level-`asLevel` base. */
export function registerTamerOntoDigivolve(
  cardId: string,
  asLevel: number,
  baseColors?: readonly TamerBaseColor[],
  costOverride?: number,
): void {
  tamerOntoSpecs.set(cardId, {
    asLevel,
    ...(baseColors !== undefined && baseColors.length > 0 ? { baseColors } : {}),
    ...(costOverride !== undefined ? { costOverride } : {}),
  });
}

/** The "as if level N" level for a Tamer-onto card, or undefined when the card has no such path. */
export function tamerOntoDigivolveLevel(cardId: string): number | undefined {
  return tamerOntoSpecs.get(cardId)?.asLevel;
}

/** The printed Tamer colors allowed by a Tamer-onto card, or undefined when unrestricted. */
export function tamerOntoDigivolveColors(cardId: string): readonly TamerBaseColor[] | undefined {
  return tamerOntoSpecs.get(cardId)?.baseColors;
}

/** Fixed printed cost for the Tamer-onto path, when it differs from the level-N evo cost. */
export function tamerOntoDigivolveCostOverride(cardId: string): number | undefined {
  return tamerOntoSpecs.get(cardId)?.costOverride;
}
