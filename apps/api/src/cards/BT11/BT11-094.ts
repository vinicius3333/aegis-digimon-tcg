import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

function playCounterpart({ name }: { name: "Angewomon" | "LadyDevimon" }): Action {
  const counterpartFilter = {
    controller: "mine" as const,
    kind: ["Digimon" as const],
    nameOrTrait: [{ tokens: [name], match: "name" as const }],
  };
  return {
    kind: "PlayWithoutCost",
    target: { filter: counterpartFilter, count: 1 },
    from: ["hand"],
    payCost: false,
    condition: {
      kind: "allOf",
      conditions: [
        {
          kind: "youHave",
          filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"], countMax: 1 },
          raw: "you have 1 or fewer Digimon in play",
        },
        { kind: "youHave", filter: { ...counterpartFilter, zone: "hand" }, raw: `you have [${name}] in your hand` },
      ],
    },
    cost: {
      kind: "suspend",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      raw: "by suspending this Tamer",
    },
    optional: true,
    abortOnDecline: true,
  };
}

export const compiled: CompiledCard = {
  effects: [
    { trigger: "StartOfYourTurn", actions: [{ kind: "GainMemory", amount: 1 }] },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Angewomon"], match: "name" }] },
          actions: [playCounterpart({ name: "LadyDevimon" })],
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["LadyDevimon"], match: "name" }] },
          actions: [playCounterpart({ name: "Angewomon" })],
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

registerIrCard("BT11-094", compiled);
