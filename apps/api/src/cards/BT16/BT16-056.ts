import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const placeVaccineTopInSecurity: Action = {
  kind: "SecurityManipulation",
  op: "placeAsSecurity",
  controller: "opponent",
  source: {
    filter: {
      controller: "opponent",
      kind: ["Digimon"],
      nameOrTrait: [{ tokens: ["Vaccine"], match: "trait" }],
    },
    count: 1,
  },
  toTop: true,
  detachPermanentTop: true,
  optional: true,
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [placeVaccineTopInSecurity] },
    { trigger: "WhenDigivolving", actions: [placeVaccineTopInSecurity] },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAddSecurity",
          fireCondition: { kind: "triggerSecurityIsOpponents" },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              amount: 1,
              chooseTopOrBottom: true,
              condition: { kind: "zoneCount", seat: "opponent", zone: "security", op: "gte", value: 3 },
            },
          ],
          raw: "when a card is added to your opponent's security stack",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT16-056", compiled);
