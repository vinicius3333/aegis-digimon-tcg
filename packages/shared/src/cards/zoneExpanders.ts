import type { CardDefinition } from "./types.js";

/**
 * A DigiXros source-zone expander: a Tamer whose optional "by suspending this Tamer" ability lets a
 * DigiXros play ALSO draw materials from the trash and/or the cards under the player's Tamers.
 *
 * expander installs into the player's `UntilCalculateFixedCostEffect` ledger during a qualifying
 * DigiXros play (BT19-079 / BT19-087 / EX4-062). The expansion only applies when the card BEING
 * PLAYED satisfies the expander's trait gate (`appliesTo`); the granted per-zone maxima are the
 * `GetMaxUnderTamerCount` / `GetMaxTrashCount` return values.
 *
 * Modeled as a static registry (keyed by the expander's cardId) rather than re-firing the card's
 * cross-permanent timing the engine's BeforePayCost seam (own-card only) cannot reach. The DigiXros
 * play subsystem reads this registry directly when the player elects to suspend the expander.
 */
export interface DigiXrosZoneExpander {
  /** Whether this expander's expansion applies to the card currently being played (its trait gate). */
  appliesTo(playedDefinition: CardDefinition): boolean;
  /** Max materials that may be drawn from under the player's Tamers. */
  underTamerMax: number;
  /** Restrict this expansion to cards beneath one selected Tamer host. */
  underTamerHostScope?: "single" | "any";
  /** Max materials that may be drawn from the trash. */
  trashMax: number;
}

function cardHasTrait(def: CardDefinition, trait: string): boolean {
  const want = trait.toLowerCase();
  return (
    (def.forms ?? []).some((t) => t.toLowerCase() === want) ||
    (def.attributes ?? []).some((t) => t.toLowerCase() === want) ||
    (def.types ?? []).some((t) => t.toLowerCase() === want)
  );
}

const hasAnyTrait = (def: CardDefinition, traits: string[]): boolean => traits.some((t) => cardHasTrait(def, t));

export const DIGIXROS_ZONE_EXPANDERS: Record<string, DigiXrosZoneExpander> = {
  // BT10-087 (Taiki Kudo): "[Your Turn] When you would play 1 Digimon card with DigiXros
  // requirements, by suspending this Tamer, you may place cards from under one of your Tamers as
  // DigiXros materials." The DigiXros subsystem has already verified the played card has a
  // DigiXros requirement before consulting expanders, so this applies to any such Digimon, but
  // the selected materials must share one Tamer host.
  "BT10-087": {
    appliesTo: () => true,
    underTamerMax: 100,
    underTamerHostScope: "single",
    trashMax: 0,
  },
  // BT10-088 (Kiriha Aonuma): "[Your Turn] When you play 1 Digimon with DigiXros requirements, by
  // suspending this Tamer, you may place cards from under one of your Tamers as digivolution cards
  // for a DigiXros." As with BT10-087, the selected materials must come from one Tamer host (KB
  // Q2016/Q2017); there is no trait gate and the under-Tamer maximum remains unlimited.
  "BT10-088": {
    appliesTo: () => true,
    underTamerMax: 100,
    underTamerHostScope: "single",
    trashMax: 0,
  },
  // BT11-095 (Taiki, Kiriha, & Nene): the same unrestricted "1 Digimon card with DigiXros
  // requirements" permission. Cards may come from under ANY of the player's Tamers (Q2125/Q2126),
  // but never from a Digimon's digivolution cards (Q2127).
  "BT11-095": {
    appliesTo: () => true,
    underTamerMax: 100,
    trashMax: 0,
  },
  // BT19-079 (Taiki Kudo): "[All Turns] When any of your [Xros Heart] Digimon with DigiXros would be
  // played, by suspending this Tamer, you may place cards from under your Tamers as DigiXros
  // materials." (documented behavior — gate [Xros Heart]; under-Tamer max 100 (unlimited), no trash.)
  "BT19-079": {
    appliesTo: (def) => hasAnyTrait(def, ["Xros Heart"]),
    underTamerMax: 100,
    trashMax: 0,
  },
  // BT19-087 (Nene Amano): gate [Composite] OR [Twilight]; under-Tamer max 1 + trash max 1
  // (documented behavior).
  "BT19-087": {
    appliesTo: (def) => hasAnyTrait(def, ["Composite", "Twilight"]),
    underTamerMax: 1,
    trashMax: 1,
  },
  // EX4-062 (Nene Amano & Kiriha Aonuma): gate [Blue Flare] OR [Twilight]; under-Tamer max 1 +
  // trash max 1 (documented behavior).
  "EX4-062": {
    appliesTo: (def) => hasAnyTrait(def, ["Blue Flare", "BlueFlare", "Twilight"]),
    underTamerMax: 1,
    trashMax: 1,
  },
  // EX10-064 (Yuu Amano & Nene Amano): "1 card under your Tamers and 1 card in your trash
  // can also be placed" for each qualifying DigiXros play. The IR keyword registry exposes
  // the capability, while this expander entry supplies the live Tamer activation cost/path.
  "EX10-064": {
    appliesTo: (def) => hasAnyTrait(def, ["Bagra Army", "Twilight"]),
    underTamerMax: 1,
    trashMax: 1,
  },
};

/** The registered DigiXros zone-expander for a Tamer card id, or undefined when it is not one. */
export function digiXrosZoneExpanderFor(cardId: string): DigiXrosZoneExpander | undefined {
  return DIGIXROS_ZONE_EXPANDERS[cardId];
}
