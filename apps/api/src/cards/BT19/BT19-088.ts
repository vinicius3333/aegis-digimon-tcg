import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT19-088 Ai & Mako (Purple Tamer, cost 3).
//
//   [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
//   [Main] If you have 20 or more cards in your trash, by suspending this Tamer, 1 of your
//     [Impmon] may digivolve into [Beelzemon] in the hand or trash for a digivolution cost
//     of 4, ignoring its digivolution requirements.
//   [Security] Play this card without paying the cost.
//
// Bracketed [Impmon] / [Beelzemon] are EXACT name references, so both name refs use
// `nameExact`. With the substring form (`match: "name"`) the clause would also accept
// "Blimpmon" as the host and "Beelzemon (X Antibody)" / "Beelzemon: Blast Mode" as the
// digivolution target.
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
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has a Digimon",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Impmon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Beelzemon"],
                match: "nameExact",
              },
            ],
          },
          payCost: true,
          from: ["hand", "trash"],
          costOverride: 4,
          ignoreRequirements: true,
          optional: true,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "trash",
            op: "gte",
            value: 20,
            raw: "you have 20 or more cards in your trash",
          },
          cost: {
            kind: "suspend",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "by suspending this Tamer",
          },
          abortOnDecline: true,
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

registerIrCard("BT19-088", compiled);
