import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-042", () => {
  it("preserves Raid, Blocker, shared once-per-turn security costs, and low-security Recovery", () => {
    const card = runtimeCompiledCard("BT19-042");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Raid" }] },
      { trigger: "Static", keywords: [{ keyword: "Blocker" }] },
      ...["WhenDigivolving", "WhenAttacking"].map((trigger) => ({
        trigger,
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          { kind: "SecurityManipulation", op: "trashTop", controller: "opponent", cost: { kind: "trash" } },
          { kind: "ModifyDP", amount: 6000, duration: "untilOpponentTurnEnd" },
        ],
      })),
      {
        trigger: "EndOfYourTurn",
        actions: [
          {
            kind: "SecurityManipulation",
            op: "recover",
            controller: "mine",
            toTop: true,
            condition: { kind: "zoneCount", zone: "security", op: "lte", value: 2 },
          },
        ],
      },
    ]);
  });
});
