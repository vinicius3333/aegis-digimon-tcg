import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5846: "[Maquinamon] in text" covers name, traits, effects, inherited text and
// requirements, so the alternate digivolve requirement uses `texts`, not `names`.
// KB Q5847: the suspend target and the "can't unsuspend" target are chosen independently.
// KB Q5848: the inherited unsuspend does not fire when the host dies alongside its victim —
// the interpreter's `whenDeletesInBattle` watcher already requires the attacker to survive.
//
// "from your hand or THIS Digimon's link cards": `linked` is scoped to this host by
// `hostFilter: { isSelfRef: true }`.
const compiled: CompiledCard = {
  digivolutionRequirement: [{ level: 4, texts: ["Maquinamon"], cost: 3, isAlternate: true }],
  effects: [
    {
      trigger: "WhenMoving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Maquinamon"],
                  match: "nameExact",
                },
              ],
              hostFilter: { isSelfRef: true },
            },
            count: 1,
          },
          from: ["hand", "linked"],
          payCost: false,
          optional: true,
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
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Maquinamon"],
                  match: "nameExact",
                },
              ],
              hostFilter: { isSelfRef: true },
            },
            count: 1,
          },
          from: ["hand", "linked"],
          payCost: false,
          optional: true,
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
              kind: "Suspend",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
            },
            {
              kind: "Restrict",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"] },
                count: 1,
              },
              restriction: "unsuspend",
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
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
              optional: true,
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

registerIrCard("EX11-033", compiled);
