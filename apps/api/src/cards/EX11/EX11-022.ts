import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Scapegoat",
          raw: "＜Scapegoat＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 4000,
              },
              nameOrTrait: [
                {
                  tokens: ["Puppet"],
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
        {
          kind: "DelayedDelete",
          raw: "at turn end, delete the Digimon this effect played",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 4000,
              },
              nameOrTrait: [
                {
                  tokens: ["Puppet"],
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
        {
          kind: "DelayedDelete",
          raw: "at turn end, delete the Digimon this effect played",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanYourEffect",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [],
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                isToken: true,
              },
              orFilters: [
                {
                  controller: "mine",
                  excludeSelf: true,
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }],
                },
              ],
              count: 1,
            },
            raw: "by deleting 1 of your Tokens or other [Puppet] trait Digimon, it doesn't leave",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["Puppet"],
      cost: 3,
      isAlternate: true,
      baseColors: ["Yellow", "Purple"],
    },
  ],
};

registerIrCard("EX11-022", compiled);
