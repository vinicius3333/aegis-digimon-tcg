import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-043")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
const opponentDp = whenDigivolving?.actions.find((action) => action.kind === "ModifyDP");
if (whenDigivolving !== undefined && opponentDp?.kind === "ModifyDP" && opponentDp.scaling !== undefined) {
  whenDigivolving.actions = whenDigivolving.actions.filter((action) => action.kind !== "ModifySecurityDP");
  whenDigivolving.actions.push({
    kind: "ModifySecurityDP",
    controller: "opponent",
    amount: -3000,
    duration: "forTheTurn",
    scaling: structuredClone(opponentDp.scaling),
  });
}
const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn");
const marcusDp = yourTurn?.actions.find((action) => action.kind === "ModifyDP");
if (marcusDp?.kind === "ModifyDP") marcusDp.target.filter.kind = ["Digimon"];

const module = registerIrCard("BT12-043", compiled);

export default module;
