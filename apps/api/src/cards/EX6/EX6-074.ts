import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Holy Beast", "Archangel", "Fallen Angel"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              effectTextPart:
                "[Your Turn] When one of your Digimon with the [Holy Beast]/[Archangel]/[Fallen Angel] trait is played, by suspending this Tamer, gain 1 memory.",
              kind: "GainMemory",
              amount: 1,
              cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
              optional: true,
              abortOnDecline: true,
            },
            {
              effectTextPart:
                "Then, 1 of your Digimon may digivolve into [Angewomon]/[LadyDevimon] in your trash with the cost reduced by 1.",
              kind: "Digivolve",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              into: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Angewomon", "LadyDevimon"], match: "nameExact" }],
              },
              from: ["trash"],
              payCost: true,
              reduceCost: 1,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          materials: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 2,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            hasDnaDigivolutionRequirement: true,
          },
          payCost: true,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-074", compiled);
