import type { Action, CompiledCard, SubTriggerEvent } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: { controllerDefault: "opponent", kind: ["Digimon"] },
            raw: "your opponent has a Digimon",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        ...(["whenPlayed", "whenOneOfYoursDigivolves"] as const).map((event: SubTriggerEvent): Action => ({
          kind: "SubTrigger",
          event,
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            or: [
              {
                nameOrTrait: [{ tokens: ["Avian", "Bird", "Beast", "Animal", "Sovereign"], match: "traitContains" }],
                excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
              },
              { nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
            ],
          },
          actions: [
            {
              effectTextPart:
                "[Your Turn] When your Digimon are played or digivolve, if any of them have [Avian], [Bird], [Beast], [Animal] or [Sovereign] in any of their traits (other than [Sea Animal]) or the [CS] trait, by returning this Tamer to the hand, 1 of your Digimon gets +3000 DP for the turn.",
              kind: "ModifyDP",
              target: { filter: { controller: "mine", zone: "battleArea", kind: ["Digimon"] }, count: 1 },
              amount: 3000,
              duration: "forTheTurn",
              cost: {
                kind: "return",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by returning this Tamer to the hand",
              },
              optional: true,
              abortOnDecline: true,
            },
            {
              effectTextPart: "Then, 1 of your Digimon may attack.",
              kind: "Attack",
              target: { filter: { controller: "mine", zone: "battleArea", kind: ["Digimon"] }, count: 1 },
              withoutSuspending: false,
              optional: true,
            },
          ],
        })),
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

registerIrCard("BT23-078", compiled);
export { compiled };
