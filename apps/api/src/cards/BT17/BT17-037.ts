import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "modifyDP",
            amount: 3000,
          },
          while: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              suspended: true,
              kind: ["Tamer"],
            },
            raw: "you have a suspended Tamer",
          },
        },
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "Piercing",
              raw: "＜Piercing＞",
            },
          },
          while: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              suspended: true,
              kind: ["Tamer"],
            },
            raw: "you have a suspended Tamer",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
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
          amount: -3000,
          duration: "forTheTurn",
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "mine",
                kind: ["Tamer"],
                colors: ["Yellow"],
              },
              count: 1,
            },
            raw: "By suspending 1 of your yellow Tamers",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
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
          amount: -3000,
          duration: "forTheTurn",
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "mine",
                kind: ["Tamer"],
                colors: ["Yellow"],
              },
              count: 1,
            },
            raw: "By suspending 1 of your yellow Tamers",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "mine",
            kind: ["Tamer"],
            colors: ["Red", "Yellow"],
          },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "placeAsSecurity",
              controller: "mine",
              source: {
                filter: {
                  controllerDefault: "mine",
                  zone: "trash",
                  nameOrTrait: [
                    {
                      tokens: ["Marcus Damon"],
                      match: "name",
                    },
                  ],
                },
                count: 1,
              },
              from: ["trash"],
              toTop: true,
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

registerIrCard("BT17-037", compiled);
