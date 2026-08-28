import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/**
 * BT1-104 — Golden Ripper.
 *
 * The watcher is player-scoped rather than permanent-scoped. It therefore applies
 * to every Digimon that attacks for the controller this turn, including Digimon
 * that enter the battle area after this Option resolves (Q967/Q970). Separate
 * copies install separate watchers and each resolves independently (Q971).
 */
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          playerScoped: true,
          triggerFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: -2000,
              duration: "forTheTurn",
            },
          ],
          duration: "forTheTurn",
          raw: "All of your Digimon gain '[When Attacking] 1 opponent Digimon gets -2000 DP for the turn'",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT1-104", compiled);
export default compiled;
