import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Greymon"], match: "name" }],
          },
          actions: [
            {
              kind: "ModifyDP",
              target: {
                sourceRef: "triggerSubject",
                filter: { controllerDefault: "mine", kind: ["Digimon"] },
                count: 1,
              },
              amount: 2000,
              duration: "untilOpponentTurnEnd",
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending this Tamer",
              },
              optional: true,
              abortOnDecline: true,
            },
            {
              kind: "Restrict",
              target: {
                sourceRef: "triggerSubject",
                filter: { controllerDefault: "mine", kind: ["Digimon"] },
                count: 1,
              },
              restriction: "beAffected",
              duration: "untilOpponentTurnEnd",
              fromSourceKind: ["Option"],
              byOpponentEffectsOnly: true,
              condition: { kind: "triggerDigivolvedSameLevel" },
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-093", compiled);
