import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              zone: "battleArea",
              kind: ["Digimon", "Tamer"],
              nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
            },
          },
        },
      ],
    },
    {
      trigger: "Static",
      isLinked: true,
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "SecurityAttack", amount: 1 },
          duration: "permanent",
        },
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Reboot" },
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "Static",
      isLinked: true,
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Vulcanusmon"], match: "name" }],
            },
            count: 1,
          },
          cost: {
            kind: "trash",
            target: { filter: { zone: "linked" }, count: 1 },
            raw: "by trashing 1 of its link cards",
          },
          raw: "When this [Vulcanusmon] would leave the battle area, by trashing 1 of its link cards, it doesn't leave.",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Draw",
          amount: 2,
          controller: "mine",
          cost: {
            kind: "trash",
            target: {
              filter: { controller: "mine", zone: "hand", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
              count: 1,
            },
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Link",
          target: {
            filter: { isSelfRef: true },
            orFilters: [
              {
                controller: "mine",
                zone: "trash",
                nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
                hasLinkRequirement: true,
              },
            ],
            count: 1,
            isSelf: true,
          },
          recipient: {
            filter: { controller: "mine", kind: ["Digimon"] },
            orFilters: [{ controller: "mine", zone: "breeding", kind: ["Digimon"] }],
            count: 1,
          },
          from: ["trash"],
          allowBreedingRecipient: true,
          payCost: false,
          optional: true,
        },
      ],
    },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT25-101", compiled);
