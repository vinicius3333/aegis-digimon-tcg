import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-084")!);
for (const effect of compiled.effects.filter((entry) => entry.trigger === "OnPlay" || entry.trigger === "WhenDigivolving")) {
  const placeUnder = effect.actions[0];
  const modal = effect.actions[1];
  if (placeUnder?.kind === "PlaceUnder") placeUnder.underFilter = { isSelfRef: true };
  if (placeUnder !== undefined && modal?.kind === "Modal") {
    const condition = modal.condition;
    effect.actions = [
      placeUnder,
      {
        kind: "GainKeyword",
        target: { filter: { controller: "mine", kind: ["Digimon"] } },
        keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
        duration: "untilEndOfOpponentTurn",
        condition,
      },
      {
        kind: "Restrict",
        target: { filter: { controller: "mine", kind: ["Digimon"] } },
        restriction: "cannotReturnToHandOrDeck",
        duration: "untilEndOfOpponentTurn",
        condition,
      },
    ];
  }
}

compiled.coverage = "full";
compiled.residual = [];
const module = registerIrCard("BT12-084", compiled);

export default module;
