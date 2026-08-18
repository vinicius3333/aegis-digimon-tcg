import module from "./ST4-04.js";
import { registerCard } from "../../engine/effects/registry.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
const card: EffectModule = { ...module, cardId: "ST4-06" };
registerCard(card);
export default card;
