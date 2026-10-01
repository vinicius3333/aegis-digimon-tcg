import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-090")!);
const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn");
const watcher = yourTurn?.actions.find((action) => action.kind === "SubTrigger");
if (watcher?.kind === "SubTrigger") {
  // "2-color blue and green" needs both colors and exactly two of them (KB Q2225/Q2226).
  watcher.sourceFilter = { controller: "mine", kind: ["Digimon"], colorsAll: ["Blue", "Green"], colorCount: 2 };
  watcher.actions[0] = {
    kind: "Digivolve",
    target: { sourceRef: "triggerSubject", filter: { kind: ["Digimon"] }, count: 1 },
    into: {
      controllerDefault: "mine",
      kind: ["Digimon"],
      nameOrTrait: [{ tokens: ["Imperialdramon"], match: "name" }],
    },
    from: ["hand"],
    payCost: true,
    optional: true,
    cost: {
      kind: "suspend",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      raw: "by suspending this Tamer",
    },
  };
}
compiled.coverage = "full";
compiled.residual = [];
registerIrCard("BT12-090", compiled);
