import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { registerCard } from "../../engine/effects/registry.js";
const module: EffectModule = {
  cardId: "BT11-053",
  effectsForTiming: (_timing: EffectTiming, _source: CardSource): Effect[] => [],
};
registerCard(module);
export default module;
