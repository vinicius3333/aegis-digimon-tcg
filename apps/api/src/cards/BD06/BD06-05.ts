import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          cost: {
            kind: "suspend",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            raw: "By suspending 1 of your Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Piercing", raw: "＜Piercing＞" } },
          while: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] },
            raw: "this Digimon with the [ALYSION] trait",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD06-05", compiled);
