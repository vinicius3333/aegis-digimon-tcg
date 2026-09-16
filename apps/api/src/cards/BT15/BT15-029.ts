import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelLte: "placedDigimonLevel",
            },
            count: 1,
          },
          to: "deckBottom",
          cost: {
            kind: "place",
            targetIsPermanent: true,
            shedOwnCards: true,
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
                colors: ["Blue"],
              },
              count: 1,
            },
            raw: "By placing 1 of your other blue Digimon as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            storeAs: "placedDigimonLevel",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelLte: "placedDigimonLevel",
            },
            count: 1,
          },
          to: "deckBottom",
          cost: {
            kind: "place",
            targetIsPermanent: true,
            shedOwnCards: true,
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
                colors: ["Blue"],
              },
              count: 1,
            },
            raw: "By placing 1 of your other blue Digimon as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            storeAs: "placedDigimonLevel",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          cost: {
            kind: "place",
            targetIsPermanent: true,
            shedOwnCards: true,
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
                colors: ["Blue"],
              },
              count: 1,
            },
            raw: "By placing 1 of your other blue Digimon as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-029", compiled);
export { compiled };
