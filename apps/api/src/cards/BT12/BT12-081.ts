import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-081")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
const playFromTamer = whenDigivolving?.actions.find((action) => action.kind === "PlayWithoutCost");
if (playFromTamer?.kind === "PlayWithoutCost") playFromTamer.from = ["digivolutionCardsUnderTamers"];
const missing = whenDigivolving?.actions.findIndex((action) => action.kind === "RawUnparsed") ?? -1;
if (whenDigivolving !== undefined && missing >= 0) {
  whenDigivolving.actions[missing] = {
    kind: "Digivolve",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Quartzmon"], match: "name" }] },
    from: ["hand", "digivolutionCardsUnderTamers"],
    payCost: true,
    costDelta: -3,
    optional: true,
    condition: { kind: "selfDigivolutionCountAtLeast", value: 4 },
  };
}
registerIrCard("BT12-081", compiled);
