import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT12-058 — Black Lv.? Digimon.
 *
 *
 * Alternative digivolution requirement: you may digivolve this card from your hand
 * onto a level 2 Digimon with ＜Save＞ in its text for a cost of 0.
 * This is a static definitional effect — the digivolution legality layer reads
 * the card's definition data directly.
 */
const cardId = "BT12-058";

const module: EffectModule = {
  cardId,
  effectsForTiming(_timing: EffectTiming, _source: CardSource): Effect[] {
    return [];
  },
};

registerCard(module);
export default module;
