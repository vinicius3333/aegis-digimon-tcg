import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-027")!);
for (const effect of compiled.effects) {
  const action = effect.actions.find((candidate) => candidate.kind === "GainMemory");
  if (action?.kind !== "GainMemory") continue;
  action.cost = {
    kind: "place",
    target: {
      filter: { controllerDefault: "mine", excludeSelf: true, kind: ["Digimon"], colors: ["Blue"] },
      count: 1,
    },
    destination: "digivolutionStack",
    position: "bottom",
    targetIsPermanent: true,
    shedOwnCards: true,
  };
}

const module = registerIrCard("BT12-027", compiled);

export default module;
