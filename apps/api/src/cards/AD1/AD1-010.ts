import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// AD1-010 Garurumon. Q6077/Q6078: the reaction is driven by the entered card's
// name/text, and a Greymon-named digivolution does not qualify as a Garurumon trigger.
export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] },
    { trigger: "WhenDigivolving", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon", "Tamer"] },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Garurumon"], match: "name" }],
              },
              payCost: false,
              from: ["hand"],
              optional: true,
              condition: {
                kind: "anyOf",
                conditions: [
                  { kind: "triggerSubjectMatchesFilter", filter: { nameOrTrait: [{ tokens: ["Greymon"], match: "name" }] } },
                  { kind: "triggerSubjectMatchesFilter", filter: { nameOrTrait: [{ tokens: ["Matt Ishida"], match: "name" }] } },
                ],
                raw: "any of them have [Greymon] or [Matt Ishida] in their names",
              },
            },
          ],
          raw: "When your Digimon or Tamers are played",
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controller: "mine", kind: ["Digimon", "Tamer"] },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Garurumon"], match: "name" }],
              },
              payCost: false,
              from: ["hand"],
              optional: true,
              condition: {
                kind: "anyOf",
                conditions: [
                  { kind: "triggerSubjectMatchesFilter", filter: { nameOrTrait: [{ tokens: ["Greymon"], match: "name" }] } },
                  { kind: "triggerSubjectMatchesFilter", filter: { nameOrTrait: [{ tokens: ["Matt Ishida"], match: "name" }] } },
                ],
                raw: "any of them have [Greymon] or [Matt Ishida] in their names",
              },
            },
          ],
          raw: "When your Digimon or Tamers digivolve",
        },
      ],
    },
    { trigger: "Static", actions: [], isInherited: true, keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 3, texts: ["Omnimon"], cost: 2, isAlternate: true },
    { level: 3, traits: ["ADVENTURE"], cost: 2, isAlternate: true },
  ],
};

registerIrCard("AD1-010", compiled);
