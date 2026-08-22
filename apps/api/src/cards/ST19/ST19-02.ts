// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          sourceFilter: { isSelfRef: true },
          leaveCause: "byOpponentEffect",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], excludeSelf: true, nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }] },
            count: 1,
          },
          mode: "prevent",
          cost: { kind: "deleteOwn", target: { filter: { isSelfRef: true }, count: 1 }, raw: "delete this Digimon" },
          optional: true,
          raw: "＜Decoy ([Puppet] trait)＞",
        },
      ],
    },
    { trigger: "Static", actions: [], isInherited: true, keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST19-02", compiled);
