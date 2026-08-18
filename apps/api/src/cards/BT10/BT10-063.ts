import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT10-063 — Black Lv.? Digimon (HiVisionMonitamon).
 *
 *
 * DigiXros -2: up to 3 [Monitamon] — when you would play this card, you may place
 * up to 3 of your [Monitamon] Digimon as digivolution cards instead of paying
 * their play costs. Handled by the card definition's digiXros requirement data.
 */
const cardId = "BT10-063";

const module: EffectModule = {
  cardId,
  effectsForTiming(_timing: EffectTiming, _source: CardSource): Effect[] {
    return [];
  },
};

registerCard(module);
export default module;
