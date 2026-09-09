import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Twilight", "Composite"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "trash",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      // The printed "Then, ＜Save＞" is the keyword, not a bare placement: the keyword tag is
      // what `withSavePlacementDefaults` (interpreter/registration/normalize.ts) reads to
      // default the PlaceUnder to `position: "bottom"` (CR 4-3-2 / 16-20). Without it the card
      // lands directly beneath the Tamer's top card and inverts the stack.
      keywords: [{ keyword: "Save", raw: "＜Save＞" }],
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Nene Amano"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          underFilter: {
            controller: "mine",
            kind: ["Tamer"],
            excludeToken: true,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Composite"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [
        {
          names: ["Nene Amano"],
        },
      ],
      count: 2,
      // `count` is the PER-MATERIAL discount (-2). The printed recipe names exactly one
      // [Nene Amano]; without a cap a single-slot recipe accepts any number of matching
      // materials (digiXros.ts materialsSatisfyRecipe), paying -2 for each.
      maxMaterials: 1,
    },
  ],
};

registerIrCard("BT19-068", compiled);
