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
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -4000,
          duration: "forTheTurn",
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              colors: ["Purple"],
            },
            raw: "you have a purple Digimon in play",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              amount: 3000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT2-036", compiled);
