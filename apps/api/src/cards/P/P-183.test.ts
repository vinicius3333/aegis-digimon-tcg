import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-183.js";

describe("P-183 Gaiomon", () => {
  it("encodes Reboot, Blocker, and the temporary opponent attack grant", () => {
    const card = runtimeCompiledCard("P-183")!;
    expect(card.effects.flatMap((effect) => effect.keywords ?? [])).toEqual([
      { keyword: "Reboot", raw: "＜Reboot＞" },
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "GrantAuraToOpponents",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          effectText: "[Start of Your Main Phase] This Digimon attacks.",
          duration: "untilOpponentTurnEnd",
        },
        { kind: "Attack", optional: true, withoutSuspending: false, target: { isSelf: true, count: 1 } },
      ],
    });
  });

  it("trashes the opponent's top security card once per turn when an attack target changes", () => {
    expect(runtimeCompiledCard("P-183")!.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "whenAttackTargetSwitched",
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
  });
});
