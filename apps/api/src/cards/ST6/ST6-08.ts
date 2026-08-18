import base from "../ST4/ST4-08.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { registerCard } from "../../engine/effects/registry.js";
const module: EffectModule = { ...base, cardId: "ST6-08" };
registerCard(module);
export default module;
