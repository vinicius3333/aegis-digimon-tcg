import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Search",
          controller: "mine",
          filter: {
            zone: "security",
          },
          count: "all",
          to: "revealed",
        },
        {
          effectTextPart:
            "[Start of Your Main Phase] Search your security stack. This Digimon may digivolve into a yellow Digimon card with the [Vaccine] trait among them without paying the cost.",
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              colors: ["Yellow"],
              nameOrTrait: [
                {
                  tokens: ["Vaccine"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["security"],
          faceDownSecurityOk: true,
          amongPreviousSearch: true,
          payCost: false,
          optional: true,
        },
        {
          kind: "SecurityManipulation",
          op: "shuffle",
          controller: "mine",
        },
        {
          kind: "SecurityManipulation",
          effectTextPart:
            "If digivolved by this effect, you may place 1 yellow card with the [Vaccine] trait from your hand at the bottom of your security stack.",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              controllerDefault: "mine",
              colors: ["Yellow"],
              nameOrTrait: [
                {
                  tokens: ["Vaccine"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          toTop: false,
          condition: {
            kind: "ifThisEffectDigivolved",
            raw: "this effect digivolved",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAddSecurity",
          fireCondition: {
            kind: "triggerSecurityIsYours",
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-033", compiled);
