import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "ModifyDP",
                target: {
                  filter: {
                    controller: "opponent",
                    kind: ["Digimon"],
                  },
                  count: 1,
                },
                amount: -6000,
                duration: "forTheTurn",
              },
            ],
            [
              {
                kind: "SecurityManipulation",
                op: "placeAsSecurity",
                controller: "opponent",
                source: {
                  filter: {
                    controller: "opponent",
                    kind: ["Digimon"],
                  },
                  count: 1,
                },
                toTop: false,
                cost: {
                  kind: "deleteOwn",
                  target: {
                    filter: {
                      controller: "mine",
                      nameOrTrait: [
                        {
                          tokens: ["Angemon"],
                          match: "name",
                        },
                      ],
                    },
                    count: 1,
                  },
                  raw: "By deleting 1 of your [Angemon]",
                },
                optional: true,
                abortOnDecline: true,
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-094", compiled);
export { compiled };
