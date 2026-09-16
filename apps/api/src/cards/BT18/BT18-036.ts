import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "security",
                position: "top",
              },
              count: 1,
            },
            raw: "By trashing the top card of your security stack",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainMemory",
          amount: 1,
          optional: false,
          condition: {
            kind: "ifThisEffectActed",
            raw: "if you trashed your top security card for this effect",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "byOpponentEffect",
          sourceFilter: {
            // "When THIS yellow Digimon ... would leave" (Q3087): only the Digimon carrying
            // this card in its digivolution cards is protected. Without the self-gate the
            // prevent reaction installs with `protectsSelf === false`
            // (interpreter/actions/replacement.ts:239-241) and guards every matching
            // permanent the owner controls, not just the host.
            isSelfRef: true,
            controllerDefault: "mine",
            kind: ["Digimon"],
            colors: ["Yellow"],
            nameOrTrait: [
              {
                tokens: ["Data", "Witchelny"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Prevent",
              mode: "leavePlay",
              cost: {
                kind: "trash",
                target: {
                  filter: {
                    controller: "mine",
                    zone: "security",
                    position: "top",
                  },
                  count: 1,
                },
                raw: "by trashing your top security card",
              },
              optional: true,
              abortOnDecline: true,
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

registerIrCard("BT18-036", compiled);
