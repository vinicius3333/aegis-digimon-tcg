import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-021";

const module: EffectModule = {
  cardId,
  effectsForTiming(_timing: EffectTiming, _source: CardSource): Effect[] {
    return [];
  },
};

registerCard(module);
export default module;
