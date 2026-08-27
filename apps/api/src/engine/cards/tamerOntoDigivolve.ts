/**
 * Side registry for the "digivolve this card from your hand onto one of your
 * <color> Tamers as if the Tamer is a level N Digimon" mechanic.
 *
 * The mechanic compiles to a `Static` `Digivolve` action carrying `onto` (a Tamer
 * filter) and `asLevel`. That action is the SOURCE OF TRUTH for the alternate-path
 * legality, but the legality check reads `digivolutionRequirementsFor` (effects.json),
 * whose entry for these cards is a STALE gateless `{cost, isAlternate}` that matches any
 * base of any color. Rather than depend on that stale shadow, the interpreter records the
 * `asLevel` here at registration time and {@link cardData.matchingAlternateDigivolutionRequirement}
 * derives the correctly-gated requirement (Tamer base + shared color + the level-N evo cost).
 */
const tamerOntoLevels = new Map<string, number>();

/** Record that `cardId` may digivolve from hand onto a Tamer treated as a level-`asLevel` base. */
export function registerTamerOntoDigivolve(cardId: string, asLevel: number): void {
  tamerOntoLevels.set(cardId, asLevel);
}

/** The "as if level N" level for a Tamer-onto card, or undefined when the card has no such path. */
export function tamerOntoDigivolveLevel(cardId: string): number | undefined {
  return tamerOntoLevels.get(cardId);
}
