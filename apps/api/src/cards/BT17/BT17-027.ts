import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 3,
              raw: "reduce the play cost by 3",
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Tamer"],
                  nameOrTrait: [
                    {
                      tokens: ["Matt Ishida"],
                      match: "name",
                    },
                  ],
                },
                raw: "you have a Tamer with [Matt Ishida] in its name",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "Restrict",
                target: {
                  filter: {
                    controller: "opponent",
                    kind: ["Digimon", "Tamer"],
                  },
                  count: 1,
                },
                restriction: "suspend",
                duration: "untilOpponentTurnEnd",
              },
            ],
            [
              {
                kind: "Digivolve",
                target: {
                  filter: {
                    controller: "mine",
                    nameOrTrait: [
                      {
                        tokens: ["Agumon"],
                        match: "name",
                      },
                    ],
                  },
                  count: 1,
                },
                into: {
                  controllerDefault: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["WarGreymon"],
                      match: "name",
                    },
                  ],
                },
                payCost: false,
                from: ["hand"],
                ignoreRequirements: true,
                optional: true,
                allowNoTarget: true,
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "Restrict",
                target: {
                  filter: {
                    controller: "opponent",
                    kind: ["Digimon", "Tamer"],
                  },
                  count: 1,
                },
                restriction: "suspend",
                duration: "untilOpponentTurnEnd",
              },
            ],
            [
              {
                kind: "Digivolve",
                target: {
                  filter: {
                    controller: "mine",
                    nameOrTrait: [
                      {
                        tokens: ["Agumon"],
                        match: "name",
                      },
                    ],
                  },
                  count: 1,
                },
                into: {
                  controllerDefault: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["WarGreymon"],
                      match: "name",
                    },
                  ],
                },
                payCost: false,
                from: ["hand"],
                ignoreRequirements: true,
                optional: true,
                allowNoTarget: true,
              },
            ],
          ],
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
          condition: {
            kind: "selfHasNameContaining",
            names: ["Omnimon"],
            raw: "this Digimon has [Omnimon] in its name",
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
      level: 5,
      names: ["Garurumon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-027", compiled);
export { compiled };
