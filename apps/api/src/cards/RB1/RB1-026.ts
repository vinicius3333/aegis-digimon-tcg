import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
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
            amount: 2000,
          },
          while: {
            kind: "anyOf",
            conditions: [
              { kind: "zoneCount", seat: "mine", zone: "battleArea", filter: { kind: ["Tamer"] }, op: "gte", value: 1 },
              {
                kind: "zoneCount",
                seat: "opponent",
                zone: "battleArea",
                filter: { kind: ["Tamer"] },
                op: "gte",
                value: 1,
              },
            ],
            raw: "there's a Tamer",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("RB1-026", compiled);
