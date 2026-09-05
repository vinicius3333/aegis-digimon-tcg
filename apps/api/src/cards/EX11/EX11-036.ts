import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5858-Q5860 (binding):
//   - "X in its text" includes name, traits, effects, inherited, digivolve reqs, etc.
//   - [On Play][When Digivolving][When Attacking]: can suspend different cards from the unsuspend-restricted one.
// [EndOfYourTurn] Digivolve action: "from:['hand']" already restricts source zone to hand;
//   the "into" filter describes card characteristics only (no zone redundancy needed).
const compiled: CompiledCard = {
  digivolutionRequirement: [{ level: 5, texts: ["Maquinamon"], cost: 3, isAlternate: true }],
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Vortex",
          raw: "＜Vortex＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 2,
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 2,
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 2,
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            colors: ["Black"],
            nameOrTrait: [
              {
                tokens: ["Maquinamon"],
                match: "text",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
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
              kind: "Attack",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              withoutSuspending: false,
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
  assemblyRequirement: [
    {
      reduceCost: 5,
      materials: [
        { kinds: ["Digimon"], colors: ["Green"], nameOrTrait: [{ tokens: ["Maquinamon"], match: "text" }], count: 5 },
      ],
    },
  ],
};

registerIrCard("EX11-036", compiled);
