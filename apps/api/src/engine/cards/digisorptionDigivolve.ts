
/**
 * Side registry for the ＜Digisorption -N＞ keyword (BT2-050, BT3-054, BT3-056, ...).
 *
 * ＜Digisorption -N＞ is an INTERACTIVE digivolve-cost effect (Comprehensive Rules §16-10,
 * KB): "when a digivolution into this card in the hand would occur, by suspending 1 of your
 * Digimon, the digivolution cost is reduced by N." It is NOT a flat continuous reduction —
 * the cost is only reduced if the controller chooses to pay the suspend. The card being
 * digivolved INTO is in the hand, so its Static effects are not active and the engine cannot
 * read the reduction from the live continuous ledger; it must read it from the card's compiled
 * IR. The interpreter records the amount here at registration time and the digivolve cost path
 * ({@link GameEngine.digivolveDeps} `payDigisorption`) consults it.
 *
 * The redirect ("[Your Turn] you may suspend your opponent's Digimon instead", BT3-056) is a
 * property of an eligible ＜Digisorption＞-redirector being on the battle area while the suspend
 * is paid — NOT of the card being digivolved into (KB Q4703: you cannot use BT3-056's own
 * redirect when digivolving into it from hand). It is tracked separately on the field, not here.
 */
const digisorptionAmounts = new Map<string, number>();

/** Record that digivolving into `cardId` from hand reduces the cost by `amount` per ＜Digisorption -amount＞. */
export function registerDigisorption(cardId: string, amount: number): void {
  digisorptionAmounts.set(cardId, amount);
}

/** The ＜Digisorption＞ cost reduction for a card, or undefined when the card has no ＜Digisorption＞. */
export function digisorptionAmountFor(cardId: string): number | undefined {
  return digisorptionAmounts.get(cardId);
}

const digisorptionRedirectors = new Set<string>();

/** Record that `cardId`, while on its controller's battle area, may redirect a ＜Digisorption＞ suspend to the opponent. */
export function registerDigisorptionRedirector(cardId: string): void {
  digisorptionRedirectors.add(cardId);
}

/** Whether `cardId` grants the "suspend opponent's Digimon for ＜Digisorption＞ instead" redirect. */
export function isDigisorptionRedirector(cardId: string): boolean {
  return digisorptionRedirectors.has(cardId);
}
