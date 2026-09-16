import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const sistermonNoirOrCiel = ["Sistermon Noir", "Sistermon Ciel"];

const decodePayload: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  hostFilter: { isSelfRef: true },
  nameOrTrait: [{ tokens: sistermonNoirOrCiel, match: "nameExact" }],
};

const deleteCheapDigimon: Action = {
  kind: "Delete",
  target: {
    filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 },
    count: 1,
  },
  raw: "Delete 1 of your opponent's Digimon with a play cost of 4 or less.",
};

const sistermonCard: Filter = {
  controller: "mine",
  playCostLte: 4,
  nameOrTrait: [{ tokens: ["Sistermon"], match: "name" }],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Decode", raw: "＜Decode ([Sistermon Noir]/[Sistermon Ciel])＞" }],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Sistermon Ciel (Awakened)"],
        },
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "trait",
          tokens: ["Data"],
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [deleteCheapDigimon],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: decodePayload, count: 1 },
              from: ["digivolutionCards"],
              payCost: false,
              playedByDecode: true,
              optional: true,
              raw: "＜Decode ([Sistermon Noir]/[Sistermon Ciel])＞",
            },
          ],
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: sistermonCard, count: 1 },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          raw: "You may play 1 play cost 4 or lower card with [Sistermon] from your hand or trash without paying the cost.",
        },
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
          scaling: { per: 1, filter: { controller: "mine", kind: ["Digimon"] }, unit: "cards" },
          raw: "Then, to 1 of your opponent's Digimon, ＜De-Digivolve 1＞ for each of your Digimon.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { namesExact: sistermonNoirOrCiel, cost: 1, isAlternate: true },
    { level: 3, texts: ["Huckmon"], cost: 3, isAlternate: true },
  ],
};

registerIrCard("EX13-066", compiled);
