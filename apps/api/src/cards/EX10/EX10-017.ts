import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      isLinked: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "Draw",
              amount: 1,
              controller: "mine",
              cost: {
                kind: "trash",
                target: {
                  filter: { controller: "mine", kind: ["Digimon"], zone: "linked", isSelfRef: true },
                  count: 1,
                },
                raw: "By trashing 1 of this Digimon's link cards",
              },
              optional: true,
              abortOnDecline: true,
            },
            // GainMemory always credits the resolving source's owner; the record's
            // `controller` field does not exist on GainMemoryAction and was never read.
            { kind: "GainMemory", amount: 1 },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Jamming",
          raw: "＜Jamming＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Retaliation",
          raw: "＜Retaliation＞",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Tamer"],
                  nameOrTrait: [
                    {
                      tokens: ["Leviathan"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              condition: {
                kind: "permanentCount",
                seat: "mine",
                filter: { controller: "mine", kind: ["Tamer"] },
                op: "lte",
                value: 1,
                raw: "you have 1 or fewer Tamers",
              },
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  appFusionRequirement: [
    {
      names: ["Mirrormon", "Kabemon", "Copipemon"],
      cost: 0,
    },
  ],
  linkRequirement: [{ traits: ["Appmon"], cost: 2 }],
};

export { compiled };

registerIrCard("EX10-017", compiled);
