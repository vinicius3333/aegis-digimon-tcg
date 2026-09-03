import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-070.js";

describe("BT19-070", () => {
  it("runs the ordered level deletions from a public play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-070", as: "source" }], battleArea: [{ card: "BT1-009", as: "sacrifice" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT19-069", as: "level4" },
            { card: "BT19-070", as: "level5" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("preserves the level-by-level deletion sequence, Machinedramon branch, and inherited Security Attack", () => {
    const card = runtimeCompiledCard("BT19-070");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "Delete", target: { filter: { controller: "opponent", levels: [3] } }, cost: { kind: "deleteOwn" } },
          { kind: "Delete", target: { filter: { controller: "opponent", levels: [4] } } },
          { kind: "Delete", target: { filter: { controller: "opponent", levels: [5] } } },
        ],
      })),
      {
        trigger: "OnDeletion",
        actions: [
          { kind: "PlayWithoutCost", from: ["trash"], payCost: false, cost: { kind: "deleteOwn" }, optional: true },
        ],
      },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "SecurityAttack", amount: 1 }] },
    ]);
  });
});
