import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// "[Avian] or [Bird] in ANY OF ITS TRAITS" is the printed partial-trait wording (KB Q839,
// Q6517): [Bird Dragon] — Pteromon's own trait — qualifies. `match: "trait"` is exact equality,
// so it matched nothing here; `traitContains` is the substring matcher the peer cards with the
// identical clause use (BT24-044, EX12-031/036). "[Vortex Warriors] trait" stays exact.
//
// "If this effect suspended YOUR Digimon" is controller-scoped: `ifThisEffectActed` is true for
// any suspension, including the opponent Digimon this same effect may suspend (Q5816 allows
// either). `lastSuspendedIsMine` reads the suspension receipt and checks the controller.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenMoving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Avian", "Bird"],
                  match: "traitContains",
                },
                {
                  tokens: ["Vortex Warriors"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "lastSuspendedIsMine",
            raw: "this effect suspended your Digimon",
          },
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
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Avian", "Bird"],
                  match: "traitContains",
                },
                {
                  tokens: ["Vortex Warriors"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "lastSuspendedIsMine",
            raw: "this effect suspended your Digimon",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenBattleWon",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
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

registerIrCard("EX11-026", compiled);
