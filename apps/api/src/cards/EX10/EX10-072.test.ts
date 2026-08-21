import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX10-072.js";

const card = () => runtimeCompiledCard("EX10-072")!;

describe("EX10-072 — Spiral Mountain", () => {
  it("has complete coverage and models each printed effect", () => {
    const effects = card().effects;
    expect(card().coverage).toBe("full");
    expect(card().residual).toEqual([]);

    expect(effects[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement" }],
    });
    expect(effects[1]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "Draw", amount: 2 }, { kind: "PlaceInBattleAreaSelf" }],
    });
    expect(effects[2]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["security"],
          optional: true,
          target: { filter: { faceUp: true } },
        },
        { kind: "DelayedDelete" },
      ],
    });
    expect(effects[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", from: ["hand", "trash"], bindResultAs: "playedByThisEffect" },
        { kind: "AddToHandSelf" },
        {
          kind: "SubTrigger",
          event: "endOfTurn",
          on: { filter: { boundRef: "playedByThisEffect" }, count: 1 },
        },
      ],
    });
  });

  it("does not waive color when Spiral Mountain is already in the battle area", () => {
    const condition = card().effects[0]!.actions[0]!.condition;
    expect(condition).toMatchObject({ kind: "youHaveNone", filter: { zone: "battleArea" } });
  });
});
