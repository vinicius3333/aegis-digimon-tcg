import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-071")!);
const effect = compiled.effects[0];
if (effect !== undefined) {
  effect.actions = [{
    kind: "SubTrigger",
    event: "whenOpponentAttacks",
    actions: [{
      kind: "RevealAdd",
      revealCount: 3,
      add: [{
        count: 1,
        to: "play",
        filter: { controllerDefault: "mine", colors: ["Black"], playCostLte: 6 },
      }],
      rest: "trash",
    }],
  }];
}
const module = registerIrCard("BT12-071", compiled);

export default module;
