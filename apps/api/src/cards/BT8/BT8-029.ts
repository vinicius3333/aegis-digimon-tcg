import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR for BT8-029 (Frozomon).
//
// Audit fix:
// [Your Turn] Aura 'while' condition: the attack restriction applies while the opponent has
// a Digimon WITH A DIGIVOLUTION CARD in play (in the battle area). The prior filter had
// zone: battleArea but lacked the digivolutionCards: "hasAny" check.
//
// KB Q1719: Digimon in the breeding area don't count (even if they have digivolution cards),
// so zone: battleArea is correct and must remain.
// KB Q1720: this inherited effect does activate when opponent activates <Digi-Burst>.

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
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
            kind: "restriction",
            restriction: "attack",
          },
          while: {
            kind: "opponentHas",
            filter: {
              zone: "battleArea",
              controllerDefault: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            raw: "your opponent has a Digimon with a digivolution card in play",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Return",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  levels: [3],
                },
                count: 1,
              },
              to: "hand",
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

export { compiled };

registerIrCard("BT8-029", compiled);
