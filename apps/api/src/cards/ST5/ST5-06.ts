import base from "./ST5-04.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { registerCard } from "../../engine/effects/registry.js";
const module: EffectModule = { ...base, cardId: "ST5-06" };
registerCard(module);
export default module;
