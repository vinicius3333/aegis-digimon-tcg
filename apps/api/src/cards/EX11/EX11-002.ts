import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantCanAttackUnsuspended",
          target: {
            filter: {
              isSelfRef: true,
              nameOrTrait: [{ tokens: ["Ice-Snow"], match: "trait" }],
            },
            count: 1,
            isSelf: true,
          },
          duration: "permanent",
          condition: {
            kind: "opponentHasNone",
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            raw: "your opponent has no Digimon with digivolution cards",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-002", compiled);
