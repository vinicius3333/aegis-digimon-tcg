// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }] },
    {
      trigger: "WhenDigivolving",
      actions: [{
        kind: "Return",
        target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"] }, count: 1 },
        to: "deckBottom",
        condition: {
          kind: "selfHasInDigivolutionCards",
          nameOrTrait: [
            { tokens: ["HerculesKabuterimon"], match: "name" },
            { tokens: ["X Antibody"], match: "name" },
          ],
          raw: "this Digimon has [HerculesKabuterimon] or [X Antibody] in its digivolution cards",
        },
      }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-058", compiled);
