import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const playCounterpart = {
  kind: "PlayWithoutCost",
  target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Angewomon", "LadyDevimon"], match: "name" }] }, count: 1 },
  from: ["hand"],
  payCost: false,
  condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"], countMax: 1 }, raw: "you have 1 or fewer Digimon in play" },
  cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, raw: "by suspending this Tamer" },
  optional: true,
  abortOnDecline: true,
  ...( { excludeNameOfTriggerSubject: true } as Record<string, boolean> ),
};

const compiled: CompiledCard = {
  effects: [
    { trigger: "StartOfYourTurn", actions: [{ kind: "GainMemory", amount: 1 }] },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Angewomon", "LadyDevimon"], match: "name" }] },
          actions: [playCounterpart],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-094", compiled);
