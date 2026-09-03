import { getCompiledCard, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = structuredClone(getCompiledCard("BT12-087")!);
const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn");
if (yourTurn !== undefined) {
  yourTurn.actions = [
    {
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
      into: { controllerDefault: "mine", kind: ["Digimon"], keywords: ["Save"] },
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          mode: "reduceCost",
          amount: 1,
          raw: "by suspending this Tamer and placing 1 card from under one of your Tamers under that Digimon as one of its digivolution cards",
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "by suspending this Tamer",
          },
          additionalCosts: [
            {
              kind: "place",
              target: { filter: { zone: "underTamers", controller: "mine" }, count: 1, from: ["underTamers"] },
              destination: "digivolutionStack",
              position: "bottom",
              host: "target",
              underFilter: { isTriggerSource: true },
              raw: "placing 1 card from under one of your Tamers under that Digimon as one of its digivolution cards",
            },
          ],
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ];
}

export default registerIrCard("BT12-087", compiled);
export { compiled };
