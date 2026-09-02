/**
 * Side registry for the "digivolve this card from your hand onto one of your
 * <color> Tamers as if the Tamer is a level N Digimon" mechanic.
 *
 * The mechanic compiles to a `Static` `TamerOntoDigivolve` action carrying `onto` (a Tamer
 * filter) and `asLevel`. That action is the SOURCE OF TRUTH for the alternate-path
 * legality, but the legality check reads `digivolutionRequirementsFor` (effects.json),
 * whose entry for these cards is a STALE gateless `{cost, isAlternate}` that matches any
 * base of any color. Rather than depend on that stale shadow, the interpreter records the
 * `asLevel` and the printed Tamer-color filter here at registration time, then
 * {@link cardData.matchingAlternateDigivolutionRequirement} derives the correctly-gated
 * requirement (Tamer base + allowed Tamer color + shared color + the level-N evo cost).
 */
interface TamerOntoDigivolveSpec {
  asLevel: number;
  baseColors?: readonly string[];
}

const tamerOntoSpecs = new Map<string, TamerOntoDigivolveSpec>();

/** Record that `cardId` may digivolve from hand onto a Tamer treated as a level-`asLevel` base. */
export function registerTamerOntoDigivolve(cardId: string, asLevel: number, baseColors?: readonly string[]): void {
  tamerOntoSpecs.set(cardId, {
    asLevel,
    ...(baseColors !== undefined && baseColors.length > 0 ? { baseColors } : {}),
  });
}

/** The "as if level N" level for a Tamer-onto card, or undefined when the card has no such path. */
export function tamerOntoDigivolveLevel(cardId: string): number | undefined {
  return tamerOntoSpecs.get(cardId)?.asLevel;
}

/** The printed Tamer colors allowed by a Tamer-onto card, or undefined when unrestricted. */
export function tamerOntoDigivolveColors(cardId: string): readonly string[] | undefined {
  return tamerOntoSpecs.get(cardId)?.baseColors;
}
