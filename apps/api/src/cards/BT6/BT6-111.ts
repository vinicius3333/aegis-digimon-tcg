// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        { kind: "AddToHandSelf" },
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [{ kind: "Restrict", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 12, upTo: true }, restriction: "attackPlayers", duration: "forTheTurn", condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "any", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Royal Knight", "X-Antibody"], match: "trait" }] }, raw: "a Digimon with [Royal Knight] or [X-Antibody] in its type is in play" } }],
        },
      ],
      isSecurity: true,
    },
    {
      trigger: "WhenAttacking",
      actions: [{ kind: "ModifyDP", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, amount: 1000, duration: "forTheTurn", costOptions: [0, 1, 2, 3, 4, 5].map((memory) => ({ kind: "payMemory", memory, raw: `pay ${memory} memory` })), scaling: { per: 1, usePaidCount: true } }],
    },
    { trigger: "EndOfAttack", actions: [{ kind: "GainMemory", amount: 2 }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-111", compiled);
