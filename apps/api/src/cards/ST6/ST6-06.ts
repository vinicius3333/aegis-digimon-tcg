import base from "./ST6-03.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { registerCard } from "../../engine/effects/registry.js";
const module: EffectModule = { ...base, cardId: "ST6-06" };
registerCard(module);
export default module;
