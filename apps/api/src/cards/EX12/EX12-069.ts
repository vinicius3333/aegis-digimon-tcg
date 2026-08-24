// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX12-069 (Virus Busters option).
// [Security][Your Turn] is represented as one YourTurn effect with isSecurity:true so the
// interpreter applies both the security-zone scope and the controller-turn guard.
// Cost reduction: replaced standalone Replacement action with reduceCostBy:3 directly
//   on the PlayWithoutCost (payCost:true) per EX12-074 pattern.
// "of the same level" filter: sameLevelAsAttacker:true added to both SubTrigger play targets.
// [Main] SecurityManipulation: toTop:false is the bottom placement signal. The self form omits
// `source` because the Option is in the transient resolvingOption slot, not a permanent; the
// interpreter resolves the physical self instance through ctx.source.instanceId.
// [Security] (isSecurity) play effect: kept as-is (play free from hand/trash).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["VB"], match: "trait" }] },
            raw: "you have a card w/[VB] trait",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      isSecurity: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            levelComparison: {
              op: "gte",
              value: 4,
            },
            nameOrTrait: [
              {
                tokens: ["VB"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["VB"],
                      match: "trait",
                    },
                  ],
                  sameLevelAsAttacker: true,
                },
                count: 1,
              },
              from: ["hand"],
              payCost: true,
              reduceCostBy: 3,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
          toTop: false,
        },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          toTop: false,
          faceUp: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              playCostLte: 5,
              nameOrTrait: [
                {
                  tokens: ["VB"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };
registerIrCard("EX12-069", compiled);
