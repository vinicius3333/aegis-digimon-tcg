import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT10-007 — Red Lv.? Digimon.
 *
 *
 * Alternative digivolution requirement: you may digivolve this card from your hand
 * onto a level 2 Digimon with [Xros Heart] or [XrosHeart] trait for a cost of 0.
 * This is a static definitional effect — the digivolution legality layer reads
 * the card's definition data directly.
 */
const cardId = "BT10-007";

const module: EffectModule = {
  cardId,
  effectsForTiming(_timing: EffectTiming, _source: CardSource): Effect[] {
    return [];
  },
};

registerCard(module);
export default module;
