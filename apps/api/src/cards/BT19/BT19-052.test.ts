import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-052.js";

describe("BT19-052", () => {
  it("preserves security Blocker, dynamic deletion ceiling, Insectoid, and inherited deletion watcher", () => {
    const card = runtimeCompiledCard("BT19-052");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OpponentsTurn",
        isSecurity: true,
        actions: [{ kind: "GainKeyword", keyword: { keyword: "Blocker" } }],
      },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 2 } },
            playCostCeiling: { base: 2, raise: 2, per: 1, unit: "security" },
          },
        ],
      })),
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Insectoid"] }] },
      {
        trigger: "AllTurns",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenDeletesInBattle",
            actions: [{ kind: "SecurityManipulation", op: "trashTop" }],
          },
        ],
      },
    ]);
  });
});
